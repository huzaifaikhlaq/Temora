
import uuid

from django.db import migrations, models
from django.db.models import Q

class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Project",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                (
                    "workspace_id",
                    models.UUIDField(db_index=True),
                ),
                (
                    "key",
                    models.CharField(max_length=12),
                ),
                (
                    "name",
                    models.CharField(max_length=150),
                ),
                (
                    "description",
                    models.TextField(blank=True, default=""),
                ),
                (
                    "category",
                    models.CharField(
                        max_length=100,
                        default="Product & Engineering",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        max_length=20,
                        choices=[
                            ("planning", "Planning"),
                            ("in_progress", "In Progress"),
                            ("in_review", "In Review"),
                            ("completed", "Completed"),
                        ],
                        default="planning",
                    ),
                ),
                (
                    "progress",
                    models.PositiveSmallIntegerField(default=0),
                ),
                (
                    "due_date",
                    models.DateField(blank=True, null=True),
                ),
                (
                    "created_by",
                    models.UUIDField(db_index=True),
                ),
                (
                    "archived_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.UniqueConstraint(
                fields=("workspace_id", "key"),
                name="unique_project_key_per_workspace",
            ),
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.CheckConstraint(
                condition=Q(progress__gte=0, progress__lte=100),
                name="project_progress_between_0_and_100",
            ),
        ),
        migrations.AddIndex(
            model_name="project",
            index=models.Index(
                fields=[
                    "workspace_id",
                    "archived_at",
                    "created_at",
                ],
                name="project_tenant_idx",
            ),
        ),
    ]