
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Issue, IssueCounter
from .billing_client import (
    lock_workspace_quota,
    enforce_limit,
)


def resolve_references(workspace_id, project_id, values, current=None):
    for field, expected_type in (
        ("epic_id", Issue.Type.EPIC),
        ("parent_id", None),
    ):
        if field not in values:
            continue

        target_id = values.pop(field)
        target = None

        if target_id is not None:
            target = Issue.objects.filter(
                id=target_id,
                workspace_id=workspace_id,
                project_id=project_id,
                archived_at__isnull=True,
                is_draft=False,
            ).first()

            if target is None:
                raise ValidationError({
                    field: "Issue not found in this project"
                })

            if current and target.id == current.id:
                raise ValidationError({
                    field: "An issue cannot reference itself"
                })

            if expected_type and target.issue_type != expected_type:
                raise ValidationError({
                    field: "Link must point to an Epic"
                })

            if field == "parent_id" and target.parent_id:
                raise ValidationError({
                    field: "Only one level of child issues is supported"
                })

            if field == "parent_id" and target.issue_type == Issue.Type.EPIC:
                raise ValidationError({
                    field: "A child issue cannot have an Epic as its parent"
                })
            

            if field == "parent_id" and current and current.subtasks.exists():
                raise ValidationError({
                    field: "An issue containing child issues cannot become a child issue"
                })

        values[field[:-3]] = target

    if values.get("parent") and values.get("issue_type") == Issue.Type.EPIC:
        raise ValidationError({
            "issue_type": "An Epic cannot be a child issue"
        })

    if (
        current
        and current.issue_type == Issue.Type.EPIC
        and values.get("issue_type") not in (None, Issue.Type.EPIC)
    ):
        if current.epic_children.exists():
            raise ValidationError({
                "issue_type": "An Epic with linked issues cannot change type"
            })


def next_issue_number(project_id):
    IssueCounter.objects.get_or_create(project_id=project_id)

    counter = IssueCounter.objects.select_for_update().get(
        project_id=project_id
    )

    number = counter.next_number
    counter.next_number = number + 1
    counter.save(update_fields=["next_number"])

    return number


def insert_issue(workspace_id, project_id, project_key, reporter_id, values):
    with transaction.atomic():
        values = values.copy()
        titles = values.pop("subtasks", [])
        
        lock_workspace_quota(
            workspace_id,
            "max_issues",
        )

        current_count = Issue.objects.filter(
            workspace_id=workspace_id,
        ).count()

        enforce_limit(
            workspace_id=workspace_id,
            resource="max_issues",
            current_count=current_count,
            requested=1 + len(titles),
        )

        resolve_references(workspace_id, project_id, values)

        if values.get("parent") is not None and titles:
            raise ValidationError({
                "subtasks": "Nested child issues are not supported"
            })


        number = next_issue_number(project_id)

        issue = Issue.objects.create(
            workspace_id=workspace_id,
            project_id=project_id,
            number=number,
            key=f"{project_key}-{number}",
            reporter_id=reporter_id,
            **values,
        )

        for subtask in titles:
            number = next_issue_number(project_id)

            Issue.objects.create(
                workspace_id=workspace_id,
                project_id=project_id,
                number=number,
                key=f"{project_key}-{number}",
                reporter_id=reporter_id,
                assignee_id=subtask.get("assignee_id"),
                issue_type=Issue.Type.TASK,
                parent=issue,
                title=subtask["title"],
                status=subtask.get(
                    "status",
                    Issue.Status.TODO,
                ),
                is_draft=issue.is_draft,
            )

        return issue


def modify_issue(issue, values):
    with transaction.atomic():
        lock_workspace_quota(
            issue.workspace_id,
            "max_issues",
        )
        issue = Issue.objects.select_for_update().get(pk=issue.pk)

        values = values.copy()
        sync_subtasks = "subtasks" in values
        titles = values.pop("subtasks", [])

        if sync_subtasks:
            existing_children = issue.subtasks.filter(
                archived_at__isnull=True,
            ).count()
            additional_issues = max(
                0,
                len(titles) - existing_children,
            )
            if additional_issues > 0:
                current_count = Issue.objects.filter(
                    workspace_id=issue.workspace_id,
                ).count()
                enforce_limit(
                    workspace_id=issue.workspace_id,
                    resource="max_issues",
                    current_count=current_count,
                    requested=additional_issues,
                )

        resolve_references(
            issue.workspace_id,
            issue.project_id,
            values,
            issue,
        )

        if issue.parent_id is not None and titles:
            raise ValidationError({
                "subtasks": "Nested child issues are not supported"
            })

    

        if (
            values.get("issue_type") == Issue.Type.EPIC
            and (values.get("parent") or issue.parent_id)
        ):
            raise ValidationError({
                "issue_type": "An Epic cannot be a child issue"
            })

        if (
            values.get("epic")
            and values.get("issue_type", issue.issue_type) == Issue.Type.EPIC
        ):
            raise ValidationError({
                "epic_id": "An Epic cannot belong to another Epic"
            })

        for name, value in values.items():
            setattr(issue, name, value)

        issue.full_clean()
        issue.save()

        if sync_subtasks:
            children = list(
                issue.subtasks.filter(
                    archived_at__isnull=True,
                ).order_by("created_at", "id")
            )

            for index, subtask in enumerate(titles):
                if index < len(children):
                    child = children[index]
                    child.title = subtask["title"]
                    child.status = subtask.get(
                        "status",
                        Issue.Status.TODO,
                    )
                    child.save(
                        update_fields=["title", "status", "updated_at"]
                    )
                else:
                    number = next_issue_number(issue.project_id)
                    prefix = issue.key.rsplit("-", 1)[0]

                    Issue.objects.create(
                        workspace_id=issue.workspace_id,
                        project_id=issue.project_id,
                        number=number,
                        key=f"{prefix}-{number}",
                        reporter_id=issue.reporter_id,
                        issue_type=Issue.Type.TASK,
                        parent=issue,
                        title=subtask["title"],
                        status=subtask.get(
                            "status",
                            Issue.Status.TODO,
                        ),
                        is_draft=issue.is_draft,
                    )

            for child in children[len(titles):]:
                child.archived_at = timezone.now()
                child.save(
                    update_fields=["archived_at", "updated_at"]
                )

        if not issue.is_draft:
            issue.subtasks.filter(
                is_draft=True,
            ).update(is_draft=False)

        return issue
