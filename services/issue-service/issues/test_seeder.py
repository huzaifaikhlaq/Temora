import json
import os
import random
import sys
import uuid
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from faker import Faker

from issues.management.commands.seed_demo import create_marked_issue
from issues.models import Issue
from issues.services import insert_issue


class DemoIssueSeederTests(TestCase):
    def setUp(self):
        self.workspace_id = uuid.uuid4()
        self.project_id = uuid.uuid4()
        self.other_project_id = uuid.uuid4()
        self.owner_id = uuid.uuid4()
        self.member_id = uuid.uuid4()
        self.project = {
            "id": str(self.project_id),
            "workspace_id": str(self.workspace_id),
            "key": "DEMO42",
            "owner_id": str(self.owner_id),
            "members": [{"user_id": str(self.owner_id)}, {"user_id": str(self.member_id)}],
        }
        self.fake = Faker()
        self.rng = random.Random(7)

    def make_issue(self, record_key, **kwargs):
        return create_marked_issue(
            self.project,
            41,
            record_key,
            self.owner_id,
            self.project["members"],
            self.fake,
            self.rng,
            **kwargs,
        )

    def test_repeat_is_idempotent_and_issue_numbers_are_sequential(self):
        epic, created = self.make_issue("epic-1", issue_type=Issue.Type.EPIC)
        self.assertTrue(created)
        repeated, created = self.make_issue("epic-1", issue_type=Issue.Type.EPIC)
        self.assertFalse(created)
        self.assertEqual(epic.id, repeated.id)
        regular, created = self.make_issue("issue-1", issue_type=Issue.Type.STORY, epic_id=epic.id)
        self.assertTrue(created)
        child, created = self.make_issue("child-1", issue_type=Issue.Type.TASK, epic_id=epic.id, parent_id=regular.id)
        self.assertTrue(created)
        self.assertEqual(child.parent_id, regular.id)
        self.assertEqual(child.epic_id, epic.id)
        self.assertEqual([epic.number, regular.number, child.number], [1, 2, 3])
        self.assertIn("td:41", child.tags)

    def test_issue_service_rejects_epic_reference_from_another_project(self):
        epic, _ = self.make_issue("epic-cross", issue_type=Issue.Type.EPIC)
        with self.assertRaises(ValidationError):
            insert_issue(
                self.workspace_id,
                self.other_project_id,
                "OTHER",
                self.owner_id,
                {"issue_type": Issue.Type.TASK, "title": "Cross tenant attempt", "epic_id": epic.id},
            )

    def test_cleanup_removes_seed_rows_and_preserves_unmarked_rows(self):
        generated, _ = self.make_issue("cleanup-parent", issue_type=Issue.Type.STORY)
        child, _ = self.make_issue("cleanup-child", issue_type=Issue.Type.TASK, parent_id=generated.id)
        genuine = insert_issue(
            self.workspace_id,
            self.project_id,
            "DEMO42",
            self.owner_id,
            {"issue_type": Issue.Type.TASK, "title": "A real issue"},
        )
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            call_command("seed_demo", seed=41, cleanup=True, stdout=StringIO())
        self.assertFalse(Issue.objects.filter(id__in=[generated.id, child.id]).exists())
        self.assertTrue(Issue.objects.filter(id=genuine.id).exists())

    def test_command_refuses_to_run_without_explicit_environment_gate(self):
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "false", "TEMORA_ENVIRONMENT": "test"}):
            with self.assertRaises(Exception):
                call_command("seed_demo", seed=41, dry_run=True, stdout=StringIO())

    def test_generated_issue_is_retrievable_through_issue_api(self):
        issue, _ = self.make_issue("api-read", issue_type=Issue.Type.STORY)
        client = APIClient()
        client.force_authenticate(
            user=SimpleNamespace(id=self.owner_id, is_authenticated=True),
            token="test-session",
        )
        project_data = {"id": str(self.project_id), "workspace_id": str(self.workspace_id), "key": "DEMO42", "archived_at": None}
        with patch("issues.views.require_scope", return_value=project_data):
            response = client.get(
                f"/api/workspaces/{self.workspace_id}/projects/{self.project_id}/issues/"
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn(str(issue.id), {row["id"] for row in response.data})

    def test_small_dataset_counts_isolation_and_repeat_execution(self):
        projects = []
        for index in range(12):
            workspace_id = uuid.uuid4()
            owner_id = uuid.uuid4()
            member_id = uuid.uuid4()
            projects.append({
                "id": str(uuid.uuid4()),
                "workspace_id": str(workspace_id),
                "key": f"DEMO{index:02d}",
                "owner_id": str(owner_id),
                "members": [{"user_id": str(owner_id), "role": "owner"}, {"user_id": str(member_id), "role": "member"}],
            })
        payload = {"seed": 52, "size": "small", "users": [], "projects": projects}

        def run():
            with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
                with patch.object(sys, "stdin", StringIO(json.dumps(payload))):
                    call_command("seed_demo", seed=52, size="small", stdout=StringIO())

        run()
        self.assertEqual(Issue.objects.filter(tags__contains=["td:52"]).count(), 115)
        run()
        generated = Issue.objects.filter(tags__contains=["td:52"])
        self.assertEqual(generated.count(), 115)
        generated_keys = list(generated.values_list("key", flat=True))
        self.assertEqual(len(generated_keys), len(set(generated_keys)))
        project_scopes = {project["id"]: project for project in projects}
        for issue in generated:
            project = project_scopes[str(issue.project_id)]
            allowed = {member["user_id"] for member in project["members"]}
            self.assertEqual(str(issue.workspace_id), project["workspace_id"])
            self.assertIn(str(issue.assignee_id), allowed)
        for project_id in project_scopes:
            numbers = list(generated.filter(project_id=project_id).order_by("number").values_list("number", flat=True))
            self.assertEqual(numbers, list(range(1, len(numbers) + 1)))
