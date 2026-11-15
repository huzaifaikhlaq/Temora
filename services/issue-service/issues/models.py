
import uuid
from pathlib import Path
from django.db import models
from django.db.models import Q


def attachment_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"issues/{instance.issue_id}/{uuid.uuid4().hex}{extension}"


class IssueCounter(models.Model):
    """Generate sequential issue numbers within a project."""

    project_id = models.UUIDField(primary_key=True)
    next_number = models.PositiveIntegerField(default=1)


class Issue(models.Model):
    class Type(models.TextChoices):
        STORY = "story", "Story"
        TASK = "task", "Task"
        BUG = "bug", "Bug"
        EPIC = "epic", "Epic"

    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        TODO = "to_do", "To Do"
        PROGRESS = "in_progress", "In Progress"
        REVIEW = "in_review", "In Review"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgent"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    workspace_id = models.UUIDField(db_index=True)
    project_id = models.UUIDField(db_index=True)

    number = models.PositiveIntegerField()
    key = models.CharField(max_length=32, db_index=True)

    issue_type = models.CharField(
        max_length=8,
        choices=Type.choices,
        default=Type.TASK,
    )

    title = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.TODO,
    )

    priority = models.CharField(
        max_length=8,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    assignee_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
    )

    reporter_id = models.UUIDField(db_index=True)

    sprint_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
    )

    story_points = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    epic = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="epic_children",
        on_delete=models.PROTECT,
    )

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="subtasks",
        on_delete=models.PROTECT,
    )

    components = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)

    due_date = models.DateField(null=True, blank=True)

    is_draft = models.BooleanField(
        default=False,
        db_index=True,
    )

    archived_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project_id", "number"],
                name="unique_issue_number_per_project",
            ),
            models.UniqueConstraint(
                fields=["project_id", "key"],
                name="unique_issue_key_per_project",
            ),
            models.CheckConstraint(
                condition=(
                    Q(story_points__isnull=True)
                    | Q(story_points__in=[1, 2, 3, 5, 8, 13])
                ),
                name="issue_allowed_story_points",
            ),
            models.CheckConstraint(
                condition=~Q(id=models.F("parent_id")),
                name="issue_not_own_parent",
            ),
        ]
        indexes = [
            models.Index(
                fields=["workspace_id", "project_id", "status"],
                name="issue_scope_status_idx",
            )
        ]

    def __str__(self):
        return f"{self.key} · {self.title}"


class IssueAttachment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    file = models.FileField(upload_to=attachment_path)

    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=80)
    size = models.PositiveIntegerField()

    uploaded_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    