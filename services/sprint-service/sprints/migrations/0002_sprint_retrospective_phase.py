from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sprints", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sprint",
            name="retrospective_phase",
            field=models.CharField(
                choices=[
                    ("collecting", "Collecting Feedback"),
                    ("voting", "Voting Open"),
                    ("closed", "Voting Closed"),
                ],
                default="collecting",
                max_length=12,
            ),
        ),
    ]
