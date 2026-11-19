import uuid

from django.db import models
from django.db.models import Q


class SprintCounter(models.Model):
    project_id = models.UUIDField(primary_key=True)
    next_number = models.PositiveIntegerField(default=1)


class Sprint(models.Model):

    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        ACTIVE = "active", "Active"
        COMPLETING = "completing", "Completing"
        COMPLETED = "completed", "Completed"

    class RetrospectivePhase(models.TextChoices):
        COLLECTING = "collecting", "Collecting Feedback"
        VOTING = "voting", "Voting Open"
        CLOSED = "closed", "Voting Closed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    workspace_id = models.UUIDField(db_index=True)
    project_id = models.UUIDField(db_index=True)

    number = models.PositiveIntegerField()

    name = models.CharField(max_length=120)

    goal = models.TextField(blank=True, default="")

    start_date = models.DateField()
    end_date = models.DateField()

    capacity_points = models.PositiveIntegerField(
        default=40,
    )

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PLANNED,
        db_index=True,
    )

    retrospective_phase = models.CharField(
        max_length=12,
        choices=RetrospectivePhase.choices,
        default=RetrospectivePhase.COLLECTING,
    )

    created_by = models.UUIDField()

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    committed_points = models.PositiveIntegerField(
        default=0,
    )

    committed_issues = models.PositiveIntegerField(
        default=0,
    )

    completed_points = models.PositiveIntegerField(
        default=0,
    )

    completed_issues = models.PositiveIntegerField(
        default=0,
    )

    carryover_points = models.PositiveIntegerField(
        default=0,
    )

    carryover_issues = models.PositiveIntegerField(
        default=0,
    )

    completion_operation_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
    )

    completion_plan = models.JSONField(
        default=dict,
        blank=True,
    )

    completion_snapshot = models.JSONField(
        default=dict,
        blank=True,
    )

    ai_themes = models.JSONField(
        default=list,
        blank=True,
    )

    ai_themes_generated_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["project_id", "number"],
                name="unique_sprint_number_per_project",
            ),
            models.UniqueConstraint(
                fields=["project_id"],
                condition=Q(
                    status__in=["active", "completing"]
                ),
                name="one_running_sprint_per_project",
            ),
            models.CheckConstraint(
                condition=Q(end_date__gte=models.F("start_date")),
                name="sprint_valid_date_range",
            ),
        ]

        indexes = [
            models.Index(
                fields=["workspace_id", "project_id", "status"],
                name="sprint_scope_status_idx",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"


class RetrospectiveNote(models.Model):

    class Category(models.TextChoices):
        WELL = "went_well", "What Went Well"
        IMPROVE = "improve", "Could Improve"
        IDEAS = "ideas", "Ideas & Experiments"
        ACTION = "action", "Action Items"

    class ActionStatus(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.CASCADE,
        related_name="notes",
    )

    category = models.CharField(
        max_length=12,
        choices=Category.choices,
    )

    body = models.TextField(max_length=2000)

    author_id = models.UUIDField()

    assignee_id = models.UUIDField(
        null=True,
        blank=True,
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    action_status = models.CharField(
        max_length=12,
        choices=ActionStatus.choices,
        default=ActionStatus.ASSIGNED,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]


class RetrospectiveVote(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    note = models.ForeignKey(
        RetrospectiveNote,
        on_delete=models.CASCADE,
        related_name="votes",
    )

    user_id = models.UUIDField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["note", "user_id"],
                name="one_vote_per_note_user",
            )
        ]


class RetrospectiveComment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    note = models.ForeignKey(
        RetrospectiveNote,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    author_id = models.UUIDField()

    body = models.TextField(max_length=1000)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class SprintParticipation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.CASCADE,
        related_name="participation",
    )

    user_id = models.UUIDField()

    attended = models.BooleanField(default=True)

    sentiment = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sprint", "user_id"],
                name="unique_sprint_participant",
            ),
            models.CheckConstraint(
                condition=(
                    Q(sentiment__isnull=True)
                    | Q(sentiment__gte=1, sentiment__lte=5)
                ),
                name="valid_sprint_sentiment",
            ),
        ]


class BurndownSnapshot(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.CASCADE,
        related_name="burndown",
    )

    date = models.DateField()

    total_points = models.PositiveIntegerField(default=0)

    completed_points = models.PositiveIntegerField(
        default=0,
    )

    remaining_points = models.PositiveIntegerField(
        default=0,
    )

    total_issues = models.PositiveIntegerField(default=0)

    completed_issues = models.PositiveIntegerField(
        default=0,
    )

    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date"]

        constraints = [
            models.UniqueConstraint(
                fields=["sprint", "date"],
                name="unique_daily_sprint_snapshot",
            )
        ]
