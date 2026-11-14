
import uuid

from django.db import models
from django.db.models import Q


class Project(models.Model):

    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        IN_PROGRESS = "in_progress", "In Progress"
        IN_REVIEW = "in_review", "In Review"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # References Workspace Service, not a Django ForeignKey.
    workspace_id = models.UUIDField(db_index=True)

    key = models.CharField(max_length=12)

    name = models.CharField(max_length=150)

    description = models.TextField(blank=True, default="")

    category = models.CharField(
        max_length=100,
        default="Product & Engineering",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNING,
    )

    progress = models.PositiveSmallIntegerField(default=0)

    due_date = models.DateField(null=True, blank=True)

    created_by = models.UUIDField(db_index=True)

    archived_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace_id", "key"],
                name="unique_project_key_per_workspace",
            ),
            models.CheckConstraint(
                condition=Q(progress__gte=0, progress__lte=100),
                name="project_progress_between_0_and_100",
            ),
        ]
        indexes = [
            models.Index(
                fields=["workspace_id", "archived_at", "created_at"],
                name="project_tenant_idx",
            ),
        ]

    def __str__(self):
        return f"{self.key} - {self.name}"