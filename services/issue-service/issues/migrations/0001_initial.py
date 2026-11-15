import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Issue",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("project_id", models.UUIDField(db_index=True)),
                ("key", models.CharField(max_length=32)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("backlog", "Backlog"), ("todo", "To Do"), ("in_progress", "In Progress"), ("in_review", "In Review"), ("done", "Done")], default="backlog", max_length=20)),
                ("priority", models.CharField(choices=[("urgent", "Urgent"), ("high", "High"), ("medium", "Medium"), ("low", "Low")], default="medium", max_length=10)),
                ("assignee_id", models.UUIDField(blank=True, null=True)),
                ("reporter_id", models.UUIDField(db_index=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("story_points", models.PositiveSmallIntegerField(default=0)),
                ("sprint_id", models.UUIDField(blank=True, null=True)),
                ("labels", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(model_name="issue", constraint=models.UniqueConstraint(fields=("workspace_id", "key"), name="unique_issue_key_per_workspace")),
        migrations.AddIndex(model_name="issue", index=models.Index(fields=["workspace_id", "project_id", "status"], name="issue_project_status_idx")),
    ]
