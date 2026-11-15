import uuid
from django.db import models

class Issue(models.Model):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        IN_REVIEW = "in_review", "In Review"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgent"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace_id = models.UUIDField(db_index=True)
    project_id = models.UUIDField(db_index=True)
    key = models.CharField(max_length=32)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BACKLOG)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assignee_id = models.UUIDField(null=True, blank=True)
    reporter_id = models.UUIDField(db_index=True)
    due_date = models.DateField(null=True, blank=True)
    story_points = models.PositiveSmallIntegerField(default=0)
    sprint_id = models.UUIDField(null=True, blank=True)
    labels = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["workspace_id", "key"], name="unique_issue_key_per_workspace")]
        indexes = [models.Index(fields=["workspace_id", "project_id", "status"], name="issue_project_status_idx")]

    def __str__(self):
        return f"{self.key} - {self.title}"
