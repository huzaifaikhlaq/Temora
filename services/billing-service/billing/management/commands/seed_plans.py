from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from billing.models import Plan


class Command(BaseCommand):

    help = "Create or update Temora billing plans"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-if-empty",
            action="store_true",
            help="Create the catalog only when no plans exist yet.",
        )

    @transaction.atomic
    def handle(self, *args, **options):

        if options["only_if_empty"] and Plan.objects.exists():
            self.stdout.write("Plans already exist; leaving them unchanged.")
            return

        plans = [
            {
                "code": "free",
                "name": "Free",
                "description": "For small teams getting started.",
                "monthly_price": 0,
                "provider_price_id": None,
                "max_members": 5,
                "max_projects": 3,
                "max_issues": 500,
                "sort_order": 1,
            },
            {
                "code": "pro",
                "name": "Pro",
                "description": "For professional teams.",
                "monthly_price": 900,
                "provider_price_id": (
                    settings.STRIPE_PRO_PRICE_ID or None
                ),
                "max_members": 15,
                "max_projects": 20,
                "max_issues": None,
                "sort_order": 2,
            },
            {
                "code": "team",
                "name": "Team",
                "description": "For growing organizations.",
                "monthly_price": 2900,
                "provider_price_id": (
                    settings.STRIPE_TEAM_PRICE_ID or None
                ),
                "max_members": 50,
                "max_projects": None,
                "max_issues": None,
                "sort_order": 3,
            },
            {
                "code": "enterprise",
                "name": "Enterprise",
                "description": "Custom enterprise arrangements.",
                "monthly_price": None,
                "provider_price_id": None,
                "max_members": None,
                "max_projects": None,
                "max_issues": None,
                "sort_order": 4,
            },
        ]

        for data in plans:
            code = data.pop("code")

            existing = Plan.objects.filter(code=code).first()

            if (
                existing
                and existing.provider_price_id
                and not existing.provider_price_id.startswith("prod_")
                and existing.provider_price_id
                    != data["provider_price_id"]
            ):
                raise CommandError(
                    f"Do not replace the existing {code} "
                    "Stripe Price without a price migration."
                )

            plan, created = Plan.objects.update_or_create(
                code=code,
                defaults=data,
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"{plan.name}: "
                    f"{'created' if created else 'updated'}"
                )
            )
