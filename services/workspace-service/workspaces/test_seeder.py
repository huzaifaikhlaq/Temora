import json
import os
import sys
import uuid
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from workspaces.models import Membership, Workspace


class DemoWorkspaceSeederTests(TestCase):
    def setUp(self):
        self.users = [
            {"id": str(uuid.uuid4()), "email": f"person{index}@demo.temora.invalid", "full_name": f"Person {index}"}
            for index in range(20)
        ]
        self.payload = {"seed": 41, "size": "small", "issue_count": 100, "users": self.users}

    def seed(self):
        stdout = StringIO()
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            with patch.object(sys, "stdin", StringIO(json.dumps(self.payload))):
                call_command("seed_demo", seed=41, stdout=stdout)
        return json.loads(stdout.getvalue())

    def test_memberships_repeat_without_duplicates_and_are_workspace_scoped(self):
        first = self.seed()
        second = self.seed()
        self.assertEqual(len(first["workspaces"]), 3)
        self.assertEqual(Workspace.objects.filter(name__startswith="Temora Demo [seed:41]").count(), 3)
        self.assertEqual(Membership.objects.filter(workspace__name__startswith="Temora Demo [seed:41]").count(), 36)
        for workspace_data in second["workspaces"]:
            workspace = Workspace.objects.get(id=workspace_data["id"])
            members = list(Membership.objects.filter(workspace=workspace))
            self.assertEqual(len(members), 12)
            self.assertEqual(sum(member.role == Membership.Role.OWNER for member in members), 1)
            expected_ids = {member["user_id"] for member in workspace_data["members"]}
            self.assertEqual({str(member.user_id) for member in members}, expected_ids)
            self.assertTrue(all(member.workspace_id == workspace.id for member in members))

    def test_cleanup_deletes_only_marked_workspaces_and_their_memberships(self):
        self.seed()
        genuine = Workspace.objects.create(name="Real workspace", slug="real-workspace", owner_id=uuid.uuid4())
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            call_command(
                "seed_demo",
                seed=41,
                cleanup=True,
                generated_user_id=[user["id"] for user in self.users],
                stdout=StringIO(),
            )
        self.assertFalse(Workspace.objects.filter(name__startswith="Temora Demo [seed:41]").exists())
        self.assertTrue(Workspace.objects.filter(id=genuine.id).exists())
