import json
import os
import sys
import uuid
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from projects.models import Project


class DemoProjectSeederTests(TestCase):
    def setUp(self):
        self.payload = {
            "seed": 41,
            "size": "small",
            "issue_count": 100,
            "users": [],
            "workspaces": [
                self._workspace(str(uuid.uuid4()), index)
                for index in range(3)
            ],
        }

    @staticmethod
    def _workspace(owner_id, index):
        return {
            "id": str(uuid.uuid4()),
            "name": f"Temora Demo [seed:41] — Space {index}",
            "owner_id": owner_id,
            "members": [{"user_id": owner_id, "role": "owner"}],
        }

    def seed(self):
        stdout = StringIO()
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            with patch.object(sys, "stdin", StringIO(json.dumps(self.payload))):
                call_command("seed_demo", seed=41, stdout=stdout)
        return json.loads(stdout.getvalue())

    def test_projects_are_idempotent_and_stay_in_their_workspace(self):
        first = self.seed()
        second = self.seed()
        self.assertEqual(len(first["projects"]), 12)
        self.assertEqual(Project.objects.filter(description__startswith="[temora-demo-seed:41]").count(), 12)
        for project_data in second["projects"]:
            project = Project.objects.get(id=project_data["id"])
            self.assertEqual(str(project.workspace_id), project_data["workspace_id"])
            self.assertEqual(str(project.created_by), project_data["owner_id"])
            self.assertTrue(project.description.startswith("[temora-demo-seed:41]"))
            self.assertIsNotNone(project.due_date)

    def test_cleanup_removes_only_marked_projects(self):
        self.seed()
        genuine = Project.objects.create(
            workspace_id=uuid.uuid4(),
            created_by=uuid.uuid4(),
            key="REALPROJECT",
            name="A real project",
        )
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            call_command("seed_demo", seed=41, cleanup=True, stdout=StringIO())
        self.assertFalse(Project.objects.filter(description__startswith="[temora-demo-seed:41]").exists())
        self.assertTrue(Project.objects.filter(id=genuine.id).exists())
