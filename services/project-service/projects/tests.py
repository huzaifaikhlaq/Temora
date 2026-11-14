
import uuid

from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase

from rest_framework.exceptions import NotFound
from rest_framework.test import APIClient

from .models import Project

class ProjectAPITests(TestCase):

    def setUp(self):
        self.workspace_id = uuid.uuid4()
        self.other_workspace_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        self.role = "owner"

        self.client = APIClient()

        self.client.force_authenticate(
            user=SimpleNamespace(
                id=self.user_id,
                is_authenticated=True,
            ),
            token="test-session",
        )

        # Stub only the external Workspace Service request.
        patcher = patch(
            "projects.permissions.workspace_role",
            side_effect=self.role_for_request,
        )
        patcher.start()
        self.addCleanup(patcher.stop)

        self.list_url = (
            f"/api/workspaces/{self.workspace_id}/projects/"
        )

    def role_for_request(self, request, workspace_id):
        if workspace_id != self.workspace_id:
            raise NotFound("Workspace not found.")

        if self.role is None:
            raise NotFound("Workspace not found.")

        return self.role

    def make_project(self, workspace_id=None):
        return Project.objects.create(
            workspace_id=workspace_id or self.workspace_id,
            created_by=self.user_id,
            key=uuid.uuid4().hex[:10].upper(),
            name="Temora Platform",
        )

    def detail_url(self, project):
        return (
            f"/api/workspaces/{self.workspace_id}"
            f"/projects/{project.id}/"
        )

    def test_owner_can_create_project(self):
        response = self.client.post(
            self.list_url,
            {
                "name": "Mobile Application",
                "category": "Mobile Engineering",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        project = Project.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(
            project.workspace_id,
            self.workspace_id,
        )

        self.assertEqual(
            project.created_by,
            self.user_id,
        )

    def test_viewer_cannot_create_project(self):
        self.role = "viewer"

        response = self.client.post(
            self.list_url,
            {"name": "Private Project"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_member_can_read_project(self):
        self.role = "member"
        project = self.make_project()

        response = self.client.get(
            self.detail_url(project)
        )

        self.assertEqual(response.status_code, 200)

    def test_member_cannot_update_project(self):
        self.role = "member"
        project = self.make_project()

        response = self.client.patch(
            self.detail_url(project),
            {"name": "Changed Name"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_stranger_cannot_list_projects(self):
        self.role = None

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 404)

    def test_cross_workspace_project_is_hidden(self):
        project = self.make_project(
            workspace_id=self.other_workspace_id
        )

        response = self.client.get(
            self.detail_url(project)
        )

        self.assertEqual(response.status_code, 404)

    def test_project_list_is_tenant_scoped(self):
        own = self.make_project()
        other = self.make_project(
            workspace_id=self.other_workspace_id
        )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)

        ids = {item["id"] for item in response.data}

        self.assertIn(str(own.id), ids)
        self.assertNotIn(str(other.id), ids)

    def test_owner_can_update_project(self):
        project = self.make_project()

        response = self.client.patch(
            self.detail_url(project),
            {"name": "Updated Project"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        project.refresh_from_db()
        self.assertEqual(
            project.name,
            "Updated Project",
        )

    def test_invalid_progress_is_rejected(self):
        project = self.make_project()

        response = self.client.patch(
            self.detail_url(project),
            {"progress": 150},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_archive_and_restore(self):
        project = self.make_project()

        base = self.detail_url(project)

        archive = self.client.post(
            f"{base}archive/",
            {},
            format="json",
        )

        self.assertEqual(archive.status_code, 200)

        project.refresh_from_db()
        self.assertIsNotNone(project.archived_at)

        restore = self.client.post(
            f"{base}restore/",
            {},
            format="json",
        )

        self.assertEqual(restore.status_code, 200)

        project.refresh_from_db()
        self.assertIsNone(project.archived_at)

    def test_unauthenticated_user_is_rejected(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 401)