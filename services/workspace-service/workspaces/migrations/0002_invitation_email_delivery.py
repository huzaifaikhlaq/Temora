from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="invitation",
            name="email_status",
            field=models.CharField(
                choices=[("queued", "Queued"), ("sent", "Sent"), ("failed", "Failed")],
                default="queued",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="invitation",
            name="email_attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="invitation",
            name="email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="invitation",
            name="email_last_error",
            field=models.TextField(blank=True, default=""),
        ),
    ]
