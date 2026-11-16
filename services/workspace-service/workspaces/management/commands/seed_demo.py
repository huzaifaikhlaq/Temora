import base64
import json
import os
import sys
import uuid
from types import SimpleNamespace

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils.text import slugify

from workspaces.models import Membership, Workspace
from workspaces.services import create_workspace


def require_safe_environment():
    if os.getenv("TEMORA_SEEDING_ENABLED", "").lower() != "true":
        raise CommandError("Set TEMORA_SEEDING_ENABLED=true explicitly to enable demo seeding.")
    if os.getenv("TEMORA_ENVIRONMENT", "").lower() not in {"development", "local", "test"}:
        raise CommandError("Demo seeding is only allowed in development, local, or test environments.")


class Command(BaseCommand):
    help = "Create or clean generated Temora demo workspaces and memberships."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=41)
        parser.add_argument("--cleanup", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--preserve-workspace-id", action="append", default=[])
        parser.add_argument("--generated-user-id", action="append", default=[])
        parser.add_argument("--additional-member-id", type=uuid.UUID, action="append", default=[])
        parser.add_argument("--manifest-base64")

    def handle(self, *args, **options):
        require_safe_environment()
        seed = options["seed"]
        if not 0 <= seed <= 999_999_999:
            raise CommandError("Seed must be between 0 and 999999999.")
        prefix = f"Temora Demo [seed:{seed}]"
        if options["cleanup"]:
            slug_prefix = f"temora-demo-seed{seed}-"
            candidates = Workspace.objects.filter(Q(name__startswith=prefix) | Q(slug__startswith=slug_prefix))
            keep_ids = {str(value) for value in options["preserve_workspace_id"]}
            generated_user_ids = {str(value) for value in options["generated_user_id"]}
            additional_user_ids = {str(value) for value in options["additional_member_id"]}
            # Without a trusted user manifest, retain workspaces rather than risk deleting real memberships.
            if not generated_user_ids:
                keep_ids.update(str(value) for value in candidates.values_list("id", flat=True))
            for workspace in candidates.exclude(id__in=keep_ids):
                member_ids = set(str(value) for value in Membership.objects.filter(workspace=workspace).values_list("user_id", flat=True))
                allowed_user_ids = generated_user_ids | additional_user_ids
                expected_member_count = 12 + len(additional_user_ids - generated_user_ids)
                if (
                    len(member_ids) != expected_member_count
                    or not member_ids.issubset(allowed_user_ids)
                    or str(workspace.owner_id) not in allowed_user_ids
                ):
                    keep_ids.add(str(workspace.id))
            removable = candidates.exclude(id__in=keep_ids)
            if options["dry_run"]:
                removable_ids = list(removable.values_list("id", flat=True))
                remaining = Workspace.objects.exclude(id__in=removable_ids)
                preserved_user_ids = set(str(value) for value in remaining.values_list("owner_id", flat=True))
                preserved_user_ids.update(str(value) for value in Membership.objects.filter(workspace_id__in=remaining.values_list("id", flat=True)).values_list("user_id", flat=True))
                self.stdout.write(json.dumps({
                    "would_delete_workspaces": removable.count(),
                    "preserved_workspace_ids": sorted(keep_ids),
                    "preserved_user_ids": sorted(preserved_user_ids),
                }))
                return
            count, _ = removable.delete()
            remaining = Workspace.objects.all()
            preserved_user_ids = set(str(value) for value in remaining.values_list("owner_id", flat=True))
            preserved_user_ids.update(str(value) for value in Membership.objects.values_list("user_id", flat=True))
            self.stdout.write(json.dumps({
                "deleted_workspaces": count,
                "preserved_workspace_ids": sorted(keep_ids),
                "preserved_user_ids": sorted(preserved_user_ids),
            }))
            return

        try:
            encoded = options.get("manifest_base64")
            payload = json.loads(base64.b64decode(encoded).decode("utf-8")) if encoded else json.load(sys.stdin)
            users = payload["users"]
            payload_seed = int(payload["seed"])
        except (ValueError, KeyError, TypeError) as exc:
            raise CommandError("Expected identity manifest JSON on stdin.") from exc
        if payload_seed != seed or len(users) != 20:
            raise CommandError("Identity manifest seed or user count does not match this run.")
        workspaces = []
        names = ["Product Engineering", "Customer Operations", "Platform & Data"]
        roles = [Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER, Membership.Role.VIEWER]
        for index, label in enumerate(names):
            owner = users[index]
            name = f"Temora Demo [seed:{seed}] - {label}"
            workspace_slug_prefix = f"temora-demo-seed{seed}-{slugify(label)}-"
            workspace = Workspace.objects.filter(slug__startswith=workspace_slug_prefix).first()
            if workspace and str(workspace.owner_id) != str(owner["id"]):
                raise CommandError("A seeded workspace slug exists with a different owner; refusing to duplicate or alter it.")
            if workspace is None:
                workspace = create_workspace(
                    SimpleNamespace(id=owner["id"], email=owner["email"]),
                    name,
                )
            selected = [users[(index * 4 + offset) % len(users)] for offset in range(12)]
            # The owner must be the single owner membership. The remaining 11 roles are balanced.
            selected[0] = owner
            selected_ids = {str(user["id"]) for user in selected}
            for member_id in options["additional_member_id"]:
                if str(member_id) not in selected_ids:
                    selected.append({"id": str(member_id)})
                    selected_ids.add(str(member_id))
            memberships = []
            for member_index, user in enumerate(selected):
                role = Membership.Role.OWNER if str(user["id"]) == str(owner["id"]) else roles[1 + ((member_index + index) % 3)]
                membership, _ = Membership.objects.get_or_create(
                    workspace=workspace,
                    user_id=user["id"],
                    defaults={"role": role},
                )
                if membership.role != role:
                    membership.role = role
                    membership.save(update_fields=["role"])
                memberships.append({"user_id": str(user["id"]), "role": role})
            workspaces.append({
                "id": str(workspace.id),
                "name": workspace.name,
                "owner_id": str(workspace.owner_id),
                "members": memberships,
            })

        payload["workspaces"] = workspaces
        self.stdout.write(json.dumps(payload))
