import json
import os
import secrets

from django.core.management.base import BaseCommand, CommandError
from faker import Faker

from accounts.models import User


SIZES = {"small": 100, "medium": 1000, "large": 10000}


def require_safe_environment():
    if os.getenv("TEMORA_SEEDING_ENABLED", "").lower() != "true":
        raise CommandError("Set TEMORA_SEEDING_ENABLED=true explicitly to enable demo seeding.")
    if os.getenv("TEMORA_ENVIRONMENT", "").lower() not in {"development", "local", "test"}:
        raise CommandError("Demo seeding is only allowed in development, local, or test environments.")


class Command(BaseCommand):
    help = "Create or clean the identity portion of the Temora development dataset."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=41)
        parser.add_argument("--size", choices=SIZES, default="medium")
        parser.add_argument("--cleanup", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--preserve-user-id", action="append", default=[])

    def handle(self, *args, **options):
        require_safe_environment()
        seed = options["seed"]
        if not 0 <= seed <= 999_999_999:
            raise CommandError("Seed must be between 0 and 999999999.")
        prefix = f"temora-demo-{seed}-"
        if options["cleanup"]:
            generated = User.objects.filter(email__startswith=prefix, email__endswith="@demo.temora.invalid")
            preserve_ids = {str(value) for value in options["preserve_user_id"]}
            if options["dry_run"]:
                self.stdout.write(json.dumps({
                    "would_delete_users": generated.exclude(id__in=preserve_ids).count(),
                    "generated_user_ids": [str(value) for value in generated.values_list("id", flat=True)],
                }))
                return
            count, _ = generated.exclude(id__in=preserve_ids).delete()
            self.stdout.write(json.dumps({"deleted_users": count, "preserved_user_ids": sorted(preserve_ids)}))
            return

        issue_count = SIZES[options["size"]]
        user_count = 20
        if options["dry_run"]:
            self.stdout.write(json.dumps({"size": options["size"], "users": user_count, "workspaces": 3, "projects": 12, "issues": issue_count, "children": max(1, issue_count * 15 // 100)}))
            return

        fake = Faker()
        fake.seed_instance(seed)
        users = []
        for index in range(user_count):
            email = f"{prefix}{index + 1:02d}@demo.temora.invalid"
            defaults = {
                "full_name": fake.name(),
                "is_active": True,
                "email_verified": True,
            }
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(
                    email=email,
                    password=secrets.token_urlsafe(48),
                    **defaults,
                )
            users.append({"id": str(user.id), "email": user.email, "full_name": user.full_name})

        self.stdout.write(json.dumps({
            "seed": seed,
            "size": options["size"],
            "issue_count": issue_count,
            "users": users,
        }))
