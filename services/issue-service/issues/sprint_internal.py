import secrets

from django.conf import settings
from django.db import transaction

from rest_framework import serializers
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Issue,
    SprintRolloverOperation,
)


def require_sprint_service(request):
    service_id = request.headers.get("X-Service-Id", "")
    supplied = request.headers.get("X-Service-Key", "")

    expected = settings.SPRINT_INTERNAL_KEY

    if (
        service_id != "sprint-service"
        or not secrets.compare_digest(supplied, expected)
    ):
        raise PermissionDenied(
            "Internal service authentication failed."
        )


def serialize_issue(issue):
    return {
        "id": str(issue.id),
        "workspace_id": str(issue.workspace_id),
        "project_id": str(issue.project_id),
        "key": issue.key,
        "title": issue.title,
        "issue_type": issue.issue_type,
        "status": issue.status,
        "story_points": issue.story_points or 0,
        "epic_id": str(issue.epic_id) if issue.epic_id else None,
        "assignee_id": (
            str(issue.assignee_id)
            if issue.assignee_id else None
        ),
        "sprint_id": (
            str(issue.sprint_id)
            if issue.sprint_id else None
        ),
    }


def serialize_epics(issues, workspace_id, project_id):
    epic_ids = {
        issue.epic_id
        for issue in issues
        if issue.epic_id
    }

    if not epic_ids:
        return []

    epics = Issue.objects.filter(
        id__in=epic_ids,
        workspace_id=workspace_id,
        project_id=project_id,
        issue_type=Issue.Type.EPIC,
        archived_at__isnull=True,
        is_draft=False,
    ).order_by("key")

    return [
        {
            "id": str(epic.id),
            "key": epic.key,
            "title": epic.title,
        }
        for epic in epics
    ]


class RolloverInput(serializers.Serializer):
    operation_id = serializers.UUIDField()

    workspace_id = serializers.UUIDField()
    project_id = serializers.UUIDField()

    target_sprint_id = serializers.UUIDField(
        allow_null=True,
    )

    selected_issue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_null=True,
        max_length=5000,
    )

    def validate_selected_issue_ids(self, values):
        if values is not None and len(values) != len(set(values)):
            raise serializers.ValidationError(
                "Duplicate issue IDs."
            )

        return values


class InternalSprintIssues(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, sprint_id):
        require_sprint_service(request)

        validator = serializers.Serializer
        # UUIDs are validated before database access.
        class Scope(serializers.Serializer):
            workspace_id = serializers.UUIDField()
            project_id = serializers.UUIDField()

        scope = Scope(data=request.query_params)
        scope.is_valid(raise_exception=True)

        values = scope.validated_data

        issues = Issue.objects.filter(
            sprint_id=sprint_id,
            workspace_id=values["workspace_id"],
            project_id=values["project_id"],
            archived_at__isnull=True,
            is_draft=False,
        ).order_by("id")[:5001]

        issue_items = list(issues)
        items = [
            serialize_issue(issue)
            for issue in issue_items
        ]

        if len(items) > 5000:
            raise ValidationError(
                "Sprint exceeds the supported issue batch size."
            )

        return Response({
            "issues": items,
            "epics": serialize_epics(
                issue_items,
                values["workspace_id"],
                values["project_id"],
            ),
        })


class InternalSprintComplete(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
     
    def get(self, request, sprint_id):
        require_sprint_service(request)

        class Scope(serializers.Serializer):
            workspace_id = serializers.UUIDField()
            project_id = serializers.UUIDField()
            operation_id = serializers.UUIDField()

        scope = Scope(data=request.query_params)
        scope.is_valid(raise_exception=True)
        values = scope.validated_data

        operation = SprintRolloverOperation.objects.filter(
            operation_id=values["operation_id"],
            sprint_id=sprint_id,
            workspace_id=values["workspace_id"],
            project_id=values["project_id"],
        ).first()

        if operation and operation.result:
            issues = operation.result.get("issues", [])
            epics = operation.result.get("epics", [])
        else:
            issue_items = list(
                Issue.objects.filter(
                    sprint_id=sprint_id,
                    workspace_id=values["workspace_id"],
                    project_id=values["project_id"],
                    archived_at__isnull=True,
                    is_draft=False,
                ).order_by("id")[:5001]
            )
            if len(issue_items) > 5000:
                raise ValidationError(
                    "Sprint exceeds the supported issue batch size."
                )
            issues = [serialize_issue(issue) for issue in issue_items]
            epics = serialize_epics(
                issue_items,
                values["workspace_id"],
                values["project_id"],
            )

        return Response({"issues": issues, "epics": epics})

    def post(self, request, sprint_id):
        require_sprint_service(request)

        serializer = RolloverInput(data=request.data)
        serializer.is_valid(raise_exception=True)

        values = serializer.validated_data

        selected = values.get("selected_issue_ids")

        normalized = {
            "workspace_id": str(values["workspace_id"]),
            "project_id": str(values["project_id"]),
            "target_sprint_id": (
                str(values["target_sprint_id"])
                if values["target_sprint_id"] else None
            ),
            "selected_issue_ids": (
                sorted(str(item) for item in selected)
                if selected is not None else None
            ),
        }

        with transaction.atomic():
            record, _ = (
                SprintRolloverOperation.objects.get_or_create(
                    operation_id=values["operation_id"],
                    defaults={
                        "sprint_id": sprint_id,
                        "workspace_id": values["workspace_id"],
                        "project_id": values["project_id"],
                        "request_payload": normalized,
                    },
                )
            )

            record = (
                SprintRolloverOperation.objects
                .select_for_update()
                .get(pk=record.pk)
            )

            if (
                record.sprint_id != sprint_id
                or record.request_payload != normalized
            ):
                raise ValidationError(
                    "Operation ID cannot be reused with "
                    "different rollover parameters."
                )

            if record.result:
                return Response(record.result)

            issues = list(
                Issue.objects
                .select_for_update()
                .filter(
                    sprint_id=sprint_id,
                    workspace_id=values["workspace_id"],
                    project_id=values["project_id"],
                    archived_at__isnull=True,
                    is_draft=False,
                )
                .order_by("id")[:5001]
            )

            if len(issues) > 5000:
                raise ValidationError(
                    "Too many issues for one rollover."
                )

            snapshot = [
                serialize_issue(issue)
                for issue in issues
            ]
            epics = serialize_epics(
                issues,
                values["workspace_id"],
                values["project_id"],
            )

            incomplete = {
                issue.id: issue
                for issue in issues
                if issue.status != Issue.Status.DONE
            }

            if selected is None:
                move_ids = set(incomplete)
            else:
                move_ids = set(selected)

                if not move_ids.issubset(incomplete):
                    raise ValidationError({
                        "selected_issue_ids": (
                            "Each selected issue must be "
                            "incomplete and belong to this sprint."
                        )
                    })

            if move_ids:
                Issue.objects.filter(
                    id__in=move_ids,
                    workspace_id=values["workspace_id"],
                    project_id=values["project_id"],
                    sprint_id=sprint_id,
                ).update(
                    sprint_id=values["target_sprint_id"],
                )

            total_points = sum(
                issue.story_points or 0
                for issue in issues
            )

            completed = [
                issue
                for issue in issues
                if issue.status == Issue.Status.DONE
            ]

            completed_points = sum(
                issue.story_points or 0
                for issue in completed
            )

            result = {
                "operation_id": str(values["operation_id"]),
                "source_sprint_id": str(sprint_id),
                "target_sprint_id": normalized[
                    "target_sprint_id"
                ],
                "moved_issue_ids": [
                    str(issue_id)
                    for issue_id in sorted(move_ids)
                ],
                "issues": snapshot,
                "epics": epics,
                "metrics": {
                    "total_issues": len(issues),
                    "completed_issues": len(completed),
                    "open_issues": len(incomplete),
                    "total_points": total_points,
                    "completed_points": completed_points,
                    "remaining_points": (
                        total_points - completed_points
                    ),
                    "velocity_percent": round(
                        100 * completed_points / total_points,
                        1,
                    ) if total_points else 0,
                },
            }

            record.result = result
            record.save(update_fields=["result"])

        return Response(result)
