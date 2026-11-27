from django.db import migrations, models
from django.utils.text import slugify


def populate_usernames(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    database = schema_editor.connection.alias

    users = User.objects.using(database).all()

    for user in users.iterator():
        prefix = slugify(user.full_name)[:30].strip("-")
        prefix = prefix or "user"

        user.username = f"{prefix}-{user.id.hex}"

        user.save(
            using=database,
            update_fields=["username"],
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(
                max_length=64,
                null=True,
                editable=False,
            ),
        ),

        migrations.RunPython(
            populate_usernames,
            migrations.RunPython.noop,
        ),

        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(
                max_length=64,
                unique=True,
                editable=False,
            ),
        ),
    ]