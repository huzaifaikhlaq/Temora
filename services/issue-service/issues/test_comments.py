import uuid

from types import SimpleNamespace

from unittest.mock import Mock, patch

import redis

from django.test import TestCase

from rest_framework.exceptions import NotFound
from rest_framework.test import APIClient

from .models import (
    Issue,
    IssueComment,
    IssueEvent,
)

from .comment_services import extract_mentions

from .management.commands.publish_issue_events import (
    publish_one,
)


class IssueCommentTests(TestCase):

    def setUp(self):

        self.workspace_id = uuid.uuid4()

        self.project_id = uuid.uuid4()

        self.actor_id = uuid.uuid4()

        self.other_user_id = uuid.uuid4()

        self.role = "member"

        self.client = APIClient()

        self.client.force_authenticate(
            user=SimpleNamespace(
                id=self.actor_id,

                full_name="Test User",

                is_authenticated=True,
            ),

            token="test-session",
        )

        self.issue = Issue.objects.create(
            workspace_id=self.workspace_id,

            project_id=self.project_id,

            reporter_id=self.actor_id,

            number=1,

            key="TEM-1",

            title="Test issue",
        )

        self.url = (
            f"/api/workspaces/{self.workspace_id}"
            f"/projects/{self.project_id}"
            f"/issues/{self.issue.id}/comments/"
        )

        self.members = [
            {
                "id": str(self.actor_id),
                "username": "test-user",
                "full_name": "Test User",
            },
            {
                "id": str(self.other_user_id),
                "username": "ali",
                "full_name": "Ali",
            },
        ]

        patches = [
            patch(
                "issues.permissions.service_get",

                side_effect=self.fake_service_get,
            ),

            patch(
                "issues.comment_services.get_workspace_users",

                return_value=self.members,
            ),

            patch(
                "issues.comment_views.get_workspace_users",

                return_value=self.members,
            ),
        ]

        for patcher in patches:

            patcher.start()

            self.addCleanup(patcher.stop)

    def fake_service_get(
        self,
        request,
        base_url,
        path,
    ):

        if path == f"workspaces/{self.workspace_id}/":

            return {
                "id": str(self.workspace_id),
                "role": self.role,
            }

        expected_project = (
            f"workspaces/{self.workspace_id}"
            f"/projects/{self.project_id}/"
        )

        if path == expected_project:

            return {
                "id": str(self.project_id),

                "workspace_id": str(self.workspace_id),

                "archived_at": None,
            }

        raise NotFound("Resource not found")

    def create_test_comment(self, author_id=None):

        return IssueComment.objects.create(
            issue=self.issue,

            author_id=author_id or self.actor_id,

            author_name="Test User",

            body="Original comment",
        )

    def test_create_comment(self):

        response = self.client.post(
            self.url,

            {"body": "Test comment"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.assertEqual(
            IssueComment.objects.count(),
            1,
        )

        event = IssueEvent.objects.get()

        self.assertEqual(
            event.event_type,
            "issue.comment.created",
        )

    def test_create_comment_with_mention(self):

        response = self.client.post(
            self.url,

            {"body": "@ali review this issue"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        comment = IssueComment.objects.get()

        self.assertEqual(
            comment.mentioned_user_ids,

            [str(self.other_user_id)],
        )

        event = IssueEvent.objects.get()

        self.assertEqual(
            event.payload["new_mentioned_user_ids"],

            [str(self.other_user_id)],
        )

    def test_unknown_mention_rejected(self):

        response = self.client.post(
            self.url,

            {"body": "@outsider review this issue"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertFalse(
            IssueComment.objects.exists()
        )

    def test_empty_comment_rejected(self):

        response = self.client.post(
            self.url,

            {"body": "   "},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_viewer_cannot_create_comment(self):

        self.role = "viewer"

        response = self.client.post(
            self.url,

            {"body": "Test comment"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_viewer_can_read_comments(self):

        self.create_test_comment()

        self.role = "viewer"

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data["count"],
            1,
        )

        self.assertFalse(
            response.data["can_comment"]
        )

        self.assertFalse(
            response.data["results"][0]["can_edit"]
        )

    def test_author_can_edit_comment(self):

        comment = self.create_test_comment()

        response = self.client.patch(
            f"{self.url}{comment.id}/",

            {"body": "Updated comment"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        comment.refresh_from_db()

        self.assertEqual(
            comment.body,
            "Updated comment",
        )

        self.assertIsNotNone(
            comment.edited_at
        )

        self.assertTrue(
            IssueEvent.objects.filter(
                event_type="issue.comment.updated",
            ).exists()
        )

    def test_member_cannot_edit_other_comment(self):

        comment = self.create_test_comment(
            author_id=self.other_user_id,
        )

        response = self.client.patch(
            f"{self.url}{comment.id}/",

            {"body": "Unauthorized edit"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_admin_cannot_edit_other_comment(self):

        self.role = "admin"

        comment = self.create_test_comment(
            author_id=self.other_user_id,
        )

        response = self.client.patch(
            f"{self.url}{comment.id}/",

            {"body": "Unauthorized edit"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_member_cannot_delete_other_comment(self):

        comment = self.create_test_comment(
            author_id=self.other_user_id,
        )

        response = self.client.delete(
            f"{self.url}{comment.id}/",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_author_can_delete_comment(self):

        comment = self.create_test_comment()

        response = self.client.delete(
            f"{self.url}{comment.id}/",
        )

        self.assertEqual(
            response.status_code,
            204,
        )

        comment.refresh_from_db()

        self.assertIsNotNone(
            comment.deleted_at
        )

        self.assertEqual(
            comment.deleted_by,
            self.actor_id,
        )

        self.assertTrue(
            IssueEvent.objects.filter(
                event_type="issue.comment.deleted"
            ).exists()
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.data["count"],
            0,
        )

    def test_admin_can_delete_other_comment(self):

        self.role = "admin"

        comment = self.create_test_comment(
            author_id=self.other_user_id,
        )

        response = self.client.delete(
            f"{self.url}{comment.id}/",
        )

        self.assertEqual(
            response.status_code,
            204,
        )

    def test_cross_issue_comment_access_denied(self):

        other_issue = Issue.objects.create(
            workspace_id=self.workspace_id,

            project_id=self.project_id,

            reporter_id=self.actor_id,

            number=2,

            key="TEM-2",

            title="Another issue",
        )

        comment = IssueComment.objects.create(
            issue=other_issue,

            author_id=self.actor_id,

            author_name="Test User",

            body="Other issue comment",
        )

        response = self.client.delete(
            f"{self.url}{comment.id}/",
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_cross_workspace_access_denied(self):

        url = self.url.replace(
            str(self.workspace_id),
            str(uuid.uuid4()),
            1,
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_duplicate_mentions_resolved_once(self):

        result = extract_mentions(
            "@ali please help @ali @ALI"
        )

        self.assertEqual(
            result,
            ["ali"],
        )

    def test_email_is_not_a_mention(self):

        result = extract_mentions(
            "Contact user@example.com"
        )

        self.assertEqual(
            result,
            [],
        )

    def test_existing_mention_not_notified_again(self):

        response = self.client.post(
            self.url,

            {"body": "@ali review this"},

            format="json",
        )

        comment_id = response.data["id"]

        response = self.client.patch(
            f"{self.url}{comment_id}/",

            {"body": "@ali review this today"},

            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        event = IssueEvent.objects.get(
            event_type="issue.comment.updated",
        )

        self.assertEqual(
            event.payload["new_mentioned_user_ids"],
            [],
        )

    def test_comment_rolled_back_if_event_fails(self):

        with patch(
            "issues.comment_services.record_comment_event",

            side_effect=RuntimeError("Event write failed"),
        ):

            with self.assertRaises(RuntimeError):

                self.client.post(
                    self.url,

                    {"body": "Must be rolled back"},

                    format="json",
                )

        self.assertFalse(
            IssueComment.objects.exists()
        )

    def test_publish_pending_event(self):

        event = IssueEvent.objects.create(
            event_type="issue.comment.created",

            payload={"comment_id": str(uuid.uuid4())},
        )

        redis_client = Mock()

        self.assertTrue(
            publish_one(redis_client)
        )

        event.refresh_from_db()

        self.assertIsNotNone(
            event.published_at
        )

        redis_client.xadd.assert_called_once()

        self.assertFalse(
            publish_one(redis_client)
        )

    def test_redis_failure_keeps_event_pending(self):

        event = IssueEvent.objects.create(
            event_type="issue.comment.created",

            payload={},
        )

        redis_client = Mock()

        redis_client.xadd.side_effect = (
            redis.ConnectionError("Redis unavailable")
        )

        with self.assertRaises(redis.ConnectionError):

            publish_one(redis_client)

        event.refresh_from_db()

        self.assertIsNone(
            event.published_at
        )