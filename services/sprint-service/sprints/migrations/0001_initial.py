# Baseline schema before retrospective voting phases.

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Sprint",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("project_id", models.UUIDField(db_index=True)),
                ("number", models.PositiveIntegerField()),
                ("name", models.CharField(max_length=120)),
                ("goal", models.TextField(blank=True, default="")),
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("capacity_points", models.PositiveIntegerField(default=40)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("planned", "Planned"),
                            ("active", "Active"),
                            ("completing", "Completing"),
                            ("completed", "Completed"),
                        ],
                        db_index=True,
                        default="planned",
                        max_length=12,
                    ),
                ),
                ("created_by", models.UUIDField()),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("committed_points", models.PositiveIntegerField(default=0)),
                ("committed_issues", models.PositiveIntegerField(default=0)),
                ("completed_points", models.PositiveIntegerField(default=0)),
                ("completed_issues", models.PositiveIntegerField(default=0)),
                ("carryover_points", models.PositiveIntegerField(default=0)),
                ("carryover_issues", models.PositiveIntegerField(default=0)),
                (
                    "completion_operation_id",
                    models.UUIDField(blank=True, null=True, unique=True),
                ),
                ("completion_plan", models.JSONField(blank=True, default=dict)),
                ("completion_snapshot", models.JSONField(blank=True, default=dict)),
                ("ai_themes", models.JSONField(blank=True, default=list)),
                ("ai_themes_generated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("project_id", "number"),
                        name="unique_sprint_number_per_project",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(("status__in", ["active", "completing"])),
                        fields=("project_id",),
                        name="one_running_sprint_per_project",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("end_date__gte", models.F("start_date"))
                        ),
                        name="sprint_valid_date_range",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["workspace_id", "project_id", "status"],
                        name="sprint_scope_status_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="SprintCounter",
            fields=[
                (
                    "project_id",
                    models.UUIDField(primary_key=True, serialize=False),
                ),
                ("next_number", models.PositiveIntegerField(default=1)),
            ],
        ),
        migrations.CreateModel(
            name="RetrospectiveNote",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("went_well", "What Went Well"),
                            ("improve", "Could Improve"),
                            ("ideas", "Ideas & Experiments"),
                            ("action", "Action Items"),
                        ],
                        max_length=12,
                    ),
                ),
                ("body", models.TextField(max_length=2000)),
                ("author_id", models.UUIDField()),
                ("assignee_id", models.UUIDField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                (
                    "action_status",
                    models.CharField(
                        choices=[
                            ("assigned", "Assigned"),
                            ("in_progress", "In Progress"),
                            ("done", "Done"),
                        ],
                        default="assigned",
                        max_length=12,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "sprint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes",
                        to="sprints.sprint",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="RetrospectiveVote",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("user_id", models.UUIDField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="votes",
                        to="sprints.retrospectivenote",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("note", "user_id"),
                        name="one_vote_per_note_user",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="RetrospectiveComment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("author_id", models.UUIDField()),
                ("body", models.TextField(max_length=1000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="sprints.retrospectivenote",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="SprintParticipation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("user_id", models.UUIDField()),
                ("attended", models.BooleanField(default=True)),
                ("sentiment", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "sprint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participation",
                        to="sprints.sprint",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("sprint", "user_id"),
                        name="unique_sprint_participant",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("sentiment__isnull", True)
                        )
                        | models.Q(
                            ("sentiment__gte", 1), ("sentiment__lte", 5)
                        ),
                        name="valid_sprint_sentiment",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="BurndownSnapshot",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("date", models.DateField()),
                ("total_points", models.PositiveIntegerField(default=0)),
                ("completed_points", models.PositiveIntegerField(default=0)),
                ("remaining_points", models.PositiveIntegerField(default=0)),
                ("total_issues", models.PositiveIntegerField(default=0)),
                ("completed_issues", models.PositiveIntegerField(default=0)),
                ("recorded_at", models.DateTimeField(auto_now=True)),
                (
                    "sprint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="burndown",
                        to="sprints.sprint",
                    ),
                ),
            ],
            options={
                "ordering": ["date"],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("sprint", "date"),
                        name="unique_daily_sprint_snapshot",
                    ),
                ],
            },
        ),
    ]
