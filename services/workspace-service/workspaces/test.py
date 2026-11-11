
import uuid
from unittest.mock import patch

from django.test import TestCase
from django.db import IntegrityError

from rest_framework.test import APIClient

from .models import Workspace, Membership
from .authentication import IdentityUser


def user(email):
    return IdentityUser({
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": email,
        "is_active": True,
    })


class WorkspaceAPITests(TestCase):
    def setUp(self):
        self.owner = user("owner@example.com")
        self.member = user("member@example.com")
        self.stranger = user("stranger@example.com")

        self.workspace = Workspace.objects.create(
            name="Company A",
            slug="company-a",
            owner_id=self.owner.id,
        )

        self.owner_membership = Membership.objects.create(
            workspace=self.workspace,
            user_id=self.owner.id,
            role="owner",
        )

        self.member_membership = Membership.objects.create(
            workspace=self.workspace,
            user_id=self.member.id,
            role="member",
        )

        self.client = APIClient()

    def login(self, account):
        # Bypass token introspection only in unit tests.
        self.client.force_authenticate(user=account)

    def test_owner_can_create_workspace(self):
        self.login(self.owner)

        response = self.client.post(
            "/api/workspaces/",
            {"name": "Company B"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Membership.objects.filter(
                workspace_id=response.data["id"],
                user_id=self.owner.id,
                role="owner",
            ).exists()
        )

    def test_stranger_cannot_access_workspace(self):
        self.login(self.stranger)

        response = self.client.get(
            f"/api/workspaces/{self.workspace.id}/members/"
        )

        self.assertEqual(response.status_code, 404)

    def test_member_cannot_invite(self):
        self.login(self.member)

        response = self.client.post(
            f"/api/workspaces/{self.workspace.id}/invitations/",
            {
                "email": "new@example.com",
                "role": "member",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_owner_can_update_member_role(self):
        self.login(self.owner)

        response = self.client.patch(
            f"/api/workspaces/{self.workspace.id}/members/"
            f"{self.member_membership.id}/",
            {"role": "viewer"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.member_membership.refresh_from_db()

        self.assertEqual(
            self.member_membership.role,
            "viewer",
        )

    def test_member_cannot_remove_owner(self):
        self.login(self.member)

        response = self.client.delete(
            f"/api/workspaces/{self.workspace.id}/members/"
            f"{self.owner_membership.id}/"
        )

        self.assertEqual(response.status_code, 403)

    def test_owner_cannot_leave(self):
        self.login(self.owner)

        response = self.client.post(
            f"/api/workspaces/{self.workspace.id}/leave/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_workspace_list_only_shows_memberships(self):
        other = Workspace.objects.create(
            name="Private Company",
            slug="private-company",
            owner_id=self.stranger.id,
        )

        Membership.objects.create(
            workspace=other,
            user_id=self.stranger.id,
            role="owner",
        )

        self.login(self.owner)

        response = self.client.get("/api/workspaces/")

        self.assertEqual(response.status_code, 200)

        ids = {item["id"] for item in response.data}

        self.assertIn(str(self.workspace.id), ids)
        self.assertNotIn(str(other.id), ids)

  
@patch("workspaces.services.send_invitation")
def test_invitation_email_cannot_be_changed(
    self,
    mocked_send,
):
    self.login(self.owner)

    # Execute transaction.on_commit callbacks
    # when the test transaction is completed.
    with self.captureOnCommitCallbacks(execute=True):
        invite_response = self.client.post(
            f"/api/workspaces/{self.workspace.id}/invitations/",
            {
                "email": "invited@example.com",
                "role": "member",
            },
            format="json",
        )

    self.assertEqual(invite_response.status_code, 201)

    # Verify the email callback was executed.
    self.assertEqual(mocked_send.call_count, 1)

    # Extract the invitation token from the mock.
    raw_token = mocked_send.call_args.args[1]

    # A different user tries to accept the invitation.
    self.login(self.stranger)

    response = self.client.post(
        "/api/invitations/accept/",
        {"token": raw_token},
        format="json",
    )

    # Only the invited email address can accept.
    self.assertEqual(response.status_code, 403)


    def test_duplicate_membership_is_rejected(self):
        with self.assertRaises(IntegrityError):
            Membership.objects.create(
                workspace=self.workspace,
                user_id=self.member.id,
                role="viewer",
            )
