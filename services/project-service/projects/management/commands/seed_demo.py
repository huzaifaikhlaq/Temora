import base64
import json
import hashlib
import os
import sys
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from projects.models import Project
from projects.services import create_project


PROJECTS = [
    ("E-commerce Platform", "Commerce", "Modernize checkout, catalog discovery, and order fulfillment."),
    ("Mobile Banking App", "Fintech", "Deliver secure everyday banking for iOS and Android."),
    ("CRM Dashboard", "Business Software", "Give sales and support teams a reliable customer view."),
    ("AI Resume Builder", "AI Products", "Help candidates create tailored, accessible resumes."),
    ("Cloud Infrastructure", "Platform Engineering", "Improve deployment safety, observability, and cloud cost."),
    ("Subscription Billing", "Payments", "Unify plans, invoices, proration, and payment recovery."),
    ("Inventory Forecasting", "Data Products", "Predict stock needs from sales and supplier signals."),
    ("Customer Identity", "Security", "Consolidate sign-in, account recovery, and device security."),
    ("Analytics Workspace", "Data Products", "Make product metrics discoverable and actionable."),
    ("Developer Portal", "Platform Engineering", "Improve API onboarding, keys, and integration health."),
    ("Marketplace Search", "Commerce", "Improve ranking, filters, and search relevance."),
    ("Team Collaboration", "Productivity", "Streamline project updates and cross-team workflows."),
]


def require_safe_environment():
    if os.getenv("TEMORA_SEEDING_ENABLED", "").lower() != "true":
        raise CommandError("Set TEMORA_SEEDING_ENABLED=true explicitly to enable demo seeding.")
    if os.getenv("TEMORA_ENVIRONMENT", "").lower() not in {"development", "local", "test"}:
        raise CommandError("Demo seeding is only allowed in development, local, or test environments.")


class Command(BaseCommand):
    help = "Create or clean generated Temora demo projects."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=41)
        parser.add_argument("--cleanup", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--preserve-project-id", action="append", default=[])
        parser.add_argument("--manifest-base64")

    def handle(self, *args, **options):
        require_safe_environment()
        seed = options["seed"]
        if not 0 <= seed <= 999_999_999:
            raise CommandError("Seed must be between 0 and 999999999.")
        marker = f"[temora-demo-seed:{seed}]"
        if options["cleanup"]:
            candidates = Project.objects.filter(description__startswith=marker)
            preserve_ids = {str(value) for value in options["preserve_project_id"]}
            preserved = list(candidates.filter(id__in=preserve_ids).values("id", "workspace_id"))
            preserve_workspaces = sorted({str(row["workspace_id"]) for row in preserved})
            removable = candidates.exclude(id__in=preserve_ids)
            if options["dry_run"]:
                self.stdout.write(json.dumps({"would_delete_projects": removable.count(), "preserved_workspace_ids": preserve_workspaces}))
                return
            count, _ = removable.delete()
            self.stdout.write(json.dumps({"deleted_projects": count, "preserved_workspace_ids": preserve_workspaces}))
            return
        try:
            encoded = options.get("manifest_base64")
            payload = json.loads(base64.b64decode(encoded).decode("utf-8")) if encoded else json.load(sys.stdin)
            workspaces = payload["workspaces"]
            payload_seed = int(payload["seed"])
        except (ValueError, KeyError, TypeError) as exc:
            raise CommandError("Expected workspace manifest JSON on stdin.") from exc
        if payload_seed != seed or len(workspaces) != 3:
            raise CommandError("Workspace manifest seed or workspace count does not match this run.")
        marker = f"[temora-demo-seed:{seed}]"
        projects = []
        due_date = date.today() + timedelta(days=90)
        for index, (name, category, summary) in enumerate(PROJECTS):
            workspace = workspaces[index // 4]
            if workspace["owner_id"] not in {member["user_id"] for member in workspace["members"]}:
                raise CommandError("Workspace manifest owner is missing from its membership list.")
            project_marker = f"{marker}:project-{index:02d}"
            description = f"{project_marker}\n{summary}"
            project = Project.objects.filter(
                workspace_id=workspace["id"],
                description__startswith=project_marker,
            ).first()
            if project is None:
                stable_key = "D" + hashlib.sha256(
                    f"temora-demo:{seed}:{index}".encode()
                ).hexdigest()[:10].upper()
                project = create_project(
                    workspace_id=workspace["id"],
                    user_id=workspace["owner_id"],
                    data={
                        "name": name,
                        "description": description,
                        "category": category,
                        "due_date": due_date,
                    },
                    key=stable_key,
                )
            projects.append({
                "id": str(project.id),
                "workspace_id": str(project.workspace_id),
                "key": project.key,
                "name": project.name,
                "owner_id": workspace["owner_id"],
                "members": workspace["members"],
            })
        payload["projects"] = projects
        self.stdout.write(json.dumps(payload))
