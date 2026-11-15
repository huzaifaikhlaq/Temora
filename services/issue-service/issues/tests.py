import uuid
from types import SimpleNamespace
from unittest.mock import patch
from django.test import TestCase
from rest_framework.exceptions import NotFound
from rest_framework.test import APIClient
from .models import Issue

class IssueAPITests(TestCase):
    def setUp(self):
        self.workspace_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        self.client = APIClient()
        self.client.force_authenticate(user=SimpleNamespace(id=self.user_id, is_authenticated=True), token="test-session")
        patcher = patch("issues.permissions.require_workspace_access", side_effect=self.check_workspace)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.list_url = f"/api/workspaces/{self.workspace_id}/issues/"
    def check_workspace(self, request, workspace_id):
        if workspace_id != self.workspace_id:
            raise NotFound("Workspace not found.")
        return "member"
    def test_member_can_create_and_read_issue(self):
        project_id = uuid.uuid4()
        response = self.client.post(self.list_url, {"project_id": str(project_id), "title": "Add issue tracking"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["key"].startswith("ISS-"))
        self.assertEqual(response.data["workspace_id"], str(self.workspace_id))
        detail = self.client.get(f"{self.list_url}{response.data['id']}/")
        self.assertEqual(detail.status_code, 200)
    def test_issue_list_can_filter_by_project(self):
        project_id = uuid.uuid4()
        own = Issue.objects.create(workspace_id=self.workspace_id, project_id=project_id, reporter_id=self.user_id, key="ISS-ONE", title="Selected")
        Issue.objects.create(workspace_id=self.workspace_id, project_id=uuid.uuid4(), reporter_id=self.user_id, key="ISS-TWO", title="Other")
        response = self.client.get(f"{self.list_url}?project_id={project_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(own.id)])
    def test_invalid_priority_is_rejected(self):
        response = self.client.post(self.list_url, {"project_id": str(uuid.uuid4()), "title": "Bad priority", "priority": "blocker"}, format="json")
        self.assertEqual(response.status_code, 400)
