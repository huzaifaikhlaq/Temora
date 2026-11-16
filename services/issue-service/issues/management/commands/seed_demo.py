import base64
import json
import hashlib
import os
import random
import sys
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from faker import Faker

from issues.models import Issue, IssueCounter
from issues.services import insert_issue


STATUSES = [Issue.Status.BACKLOG, Issue.Status.TODO, Issue.Status.PROGRESS, Issue.Status.REVIEW, Issue.Status.DONE]
PRIORITIES = [Issue.Priority.LOW, Issue.Priority.MEDIUM, Issue.Priority.MEDIUM, Issue.Priority.HIGH, Issue.Priority.URGENT]
POINTS = [1, 2, 3, 5, 8, 13]
COMPONENTS = ["web-client", "api-gateway", "identity", "checkout", "data-pipeline", "mobile-app", "observability", "billing"]
TOPICS = ["authentication", "performance", "accessibility", "reliability", "onboarding", "reporting", "integrations", "security", "search", "notifications"]
ISSUE_COUNT = {"small": 100, "medium": 1000, "large": 10000}


def require_safe_environment():
    if os.getenv("TEMORA_SEEDING_ENABLED", "").lower() != "true":
        raise CommandError("Set TEMORA_SEEDING_ENABLED=true explicitly to enable demo seeding.")
    if os.getenv("TEMORA_ENVIRONMENT", "").lower() not in {"development", "local", "test"}:
        raise CommandError("Demo seeding is only allowed in development, local, or test environments.")


def create_marked_issue(project, seed, record_key, reporter_id, members, fake, rng, *, issue_type, epic_id=None, parent_id=None):
    marker = f"tdr:{seed}:{record_key}"
    existing = Issue.objects.filter(project_id=project["id"], tags__contains=[marker]).first()
    if existing:
        return existing, False

    local_seed = int.from_bytes(hashlib.sha256(f"{seed}:{record_key}".encode()).digest()[:8], "big")
    fake.seed_instance(local_seed)
    rng = random.Random(local_seed)

    topic = rng.choice(TOPICS)
    component = rng.choice(COMPONENTS)
    subject = fake.bs().capitalize()
    object_name = fake.catch_phrase().lower()
    if issue_type == Issue.Type.EPIC:
        title = f"{topic.title()} initiative: {subject}"
        description = f"Coordinate the {object_name} workstream. Define success measures, release checkpoints, and ownership for {topic} across the product team."
    elif issue_type == Issue.Type.BUG:
        title = f"Fix {topic} regression in {component}"
        description = f"When users exercise {object_name}, the {component} flow can produce inconsistent results. Capture the failing case, add regression coverage, and verify recovery behavior."
    elif issue_type == Issue.Type.STORY:
        title = f"As a customer, manage {topic} from the {component}"
        description = f"Enable customers to {object_name} with clear feedback and accessible controls. Keep the experience consistent across supported clients and document the expected behavior."
    else:
        title = f"Improve {component} {topic} handling"
        description = f"Review the current {object_name} path in {component}. Reduce failure ambiguity, add useful telemetry, and preserve existing workspace access boundaries."
    # Keep within the model's 120 character title limit.
    title = title[:120]
    if parent_id:
        title = f"{rng.choice(['Add coverage for', 'Verify', 'Document', 'Harden'])} {topic} {rng.choice(['edge cases', 'fallback behavior', 'permissions', 'error handling'])}"
        issue_type = Issue.Type.TASK
    assignee_id = rng.choice(members)["user_id"] if members else None
    values = {
        "issue_type": issue_type,
        "title": title,
        "description": description,
        "status": rng.choice(STATUSES),
        "priority": rng.choice(PRIORITIES),
        "assignee_id": assignee_id,
        "story_points": rng.choice(POINTS),
        "components": [component],
        "tags": [f"td:{seed}", marker, topic, rng.choice(["customer-impact", "tech-debt", "quality", "release-ready"])],
        "due_date": date.today() + timedelta(days=rng.randint(3, 120)),
    }
    if epic_id:
        values["epic_id"] = epic_id
    if parent_id:
        values["parent_id"] = parent_id
    issue = insert_issue(
        project["workspace_id"], project["id"], project["key"], reporter_id, values,
    )
    return issue, True


class Command(BaseCommand):
    help = "Create or clean generated Temora demo issues using the issue service numbering and reference logic."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=41)
        parser.add_argument("--size", choices=ISSUE_COUNT, default="medium")
        parser.add_argument("--cleanup", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--manifest-base64")

    def handle(self, *args, **options):
        require_safe_environment()
        seed = options["seed"]
        if not 0 <= seed <= 999_999_999:
            raise CommandError("Seed must be between 0 and 999999999.")
        if options["cleanup"]:
            marker = f"td:{seed}"
            generated = Issue.objects.filter(tags__contains=[marker]).order_by("-parent_id")
            ids = list(generated.values_list("id", flat=True))
            project_ids = set(generated.values_list("project_id", flat=True))
            if options["dry_run"]:
                preserved = [str(project_id) for project_id in project_ids if Issue.objects.filter(project_id=project_id).exclude(id__in=ids).exists()]
                self.stdout.write(json.dumps({"would_delete_issues": len(ids), "preserved_project_ids": preserved}))
                return
            with transaction.atomic():
                Issue.objects.filter(id__in=ids).update(epic=None)
                # Delete children before parents; preserve any unmarked rows if protected.
                child_ids = list(Issue.objects.filter(id__in=ids, parent__isnull=False).values_list("id", flat=True))
                Issue.objects.filter(id__in=child_ids).delete()
                root_ids = set(ids) - set(child_ids)
                Issue.objects.filter(id__in=root_ids).delete()
                counters_deleted = 0
                for project_id in project_ids:
                    if not Issue.objects.filter(project_id=project_id).exists():
                        counters_deleted += IssueCounter.objects.filter(project_id=project_id).delete()[0]
            preserved = [str(project_id) for project_id in project_ids if Issue.objects.filter(project_id=project_id).exists()]
            self.stdout.write(json.dumps({"deleted_issues": len(ids), "deleted_counters": counters_deleted, "preserved_project_ids": preserved}))
            return

        try:
            encoded = options.get("manifest_base64")
            payload = json.loads(base64.b64decode(encoded).decode("utf-8")) if encoded else json.load(sys.stdin)
            projects = payload["projects"]
            users = payload["users"]
            payload_seed = int(payload["seed"])
            size = payload["size"]
        except (ValueError, KeyError, TypeError) as exc:
            raise CommandError("Expected project manifest JSON on stdin.") from exc
        if payload_seed != seed or size not in ISSUE_COUNT or len(projects) != 12:
            raise CommandError("Project manifest seed, size, or project count does not match this run.")
        for project in projects:
            member_ids = [str(member["user_id"]) for member in project["members"]]
            if not member_ids or len(member_ids) != len(set(member_ids)) or str(project["owner_id"]) not in member_ids:
                raise CommandError("Project manifest has missing or duplicate workspace members.")
        target = ISSUE_COUNT[size]
        epic_total = max(1, target * 6 // 100)
        child_total = target * 15 // 100
        if options["dry_run"]:
            self.stdout.write(json.dumps({"base_issues": target, "epics": epic_total, "child_issues": child_total}))
            return

        fake = Faker()
        fake.seed_instance(seed)
        rng = random.Random(seed)
        created = {"epics": 0, "issues": 0, "children": 0}
        for project_index, project in enumerate(projects):
            members = project["members"]
            reporter_id = project["owner_id"]
            project_epic_count = len(range(project_index, epic_total, len(projects)))
            epics = []
            for local_index in range(project_epic_count):
                ordinal = project_index + local_index * len(projects)
                issue, was_created = create_marked_issue(
                    project, seed, f"project-{project_index}-epic-{ordinal}", reporter_id, members, fake, rng,
                    issue_type=Issue.Type.EPIC,
                )
                created["epics"] += int(was_created)
                epics.append(issue)
            # Split base non-epic issues across projects. Deterministic tags make reruns no-ops.
            for ordinal in range(project_index, target - epic_total, len(projects)):
                epic = epics[ordinal % len(epics)] if epics else None
                issue_type = rng.choices([Issue.Type.STORY, Issue.Type.TASK, Issue.Type.BUG], [3, 5, 2])[0]
                issue, was_created = create_marked_issue(
                    project, seed, f"project-{project_index}-issue-{ordinal}", reporter_id, members, fake, rng,
                    issue_type=issue_type, epic_id=epic.id if epic else None,
                )
                created["issues"] += int(was_created)

        # Child issues are created only after every parent exists and are never nested.
        parent_candidates = list(Issue.objects.filter(tags__contains=[f"td:{seed}"], parent__isnull=True).exclude(issue_type=Issue.Type.EPIC).order_by("project_id", "number"))
        if not parent_candidates:
            raise CommandError("No seeded parent issues were created; cannot generate children.")
        project_by_id = {project["id"]: project for project in projects}
        for index in range(child_total):
            parent = parent_candidates[index % len(parent_candidates)]
            project = project_by_id[str(parent.project_id)]
            issue, was_created = create_marked_issue(
                project, seed, f"child-{index}", parent.reporter_id, project["members"], fake, rng,
                issue_type=Issue.Type.TASK, epic_id=parent.epic_id, parent_id=parent.id,
            )
            created["children"] += int(was_created)

        self.stdout.write(json.dumps({"created": created, "target_base_issues": target, "target_children": child_total}))
