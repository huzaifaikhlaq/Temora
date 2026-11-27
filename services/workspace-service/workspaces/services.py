
import hashlib
import secrets

from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from rest_framework.exceptions import (
    ValidationError,
    PermissionDenied,
)

from .models import Workspace, Membership, Invitation

from .billing_client import enforce_limit


def token_digest(token):
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_workspace(user, name):
    # Random suffix prevents slug collisions.
    slug = (
        f"{slugify(name)[:110] or 'workspace'}-"
        f"{secrets.token_hex(6)}"
    )

    with transaction.atomic():
        workspace = Workspace.objects.create(
            name=name,
            slug=slug,
            owner_id=user.id,
        )

        Membership.objects.create(
            workspace=workspace,
            user_id=user.id,
            role=Membership.Role.OWNER,
        )

    return workspace


def send_invitation(invitation, raw_token):
    from .tasks import deliver_invitation_email

    deliver_invitation_email.delay(str(invitation.pk), raw_token)


def create_invitation(workspace, actor, email, role):
    email = email.strip().lower()

    if email == actor.email:
        raise ValidationError({
            "email": "You cannot invite yourself."
        })

    # One invitation per email and workspace.
    # Lock the workspace to serialize concurrent invitations.
    with transaction.atomic():
        workspace = (
            Workspace.objects
            .select_for_update()
            .get(pk=workspace.pk)
        )

        existing = (
            Invitation.objects
            .select_for_update()
            .filter(
                workspace=workspace,
                email=email,
                status=Invitation.Status.PENDING,
            )
            .first()
        )

        if existing:
            existing.status = Invitation.Status.REVOKED
            existing.save(update_fields=["status"])

        raw_token = secrets.token_urlsafe(32)

        invitation = Invitation.objects.create(
            workspace=workspace,
            email=email,
            role=role,
            token_hash=token_digest(raw_token),
            invited_by=actor.id,
            expires_at=(
                timezone.now()
                + timedelta(hours=settings.INVITATION_HOURS)
            ),
        )

        # Send email after transaction commits.
        transaction.on_commit(
            lambda: send_invitation(
                invitation,
                raw_token,
            )
        )

    return invitation


def accept_invitation(user, raw_token):

    digest = token_digest(raw_token)

    candidate = Invitation.objects.filter(
        token_hash=digest,
        status=Invitation.Status.PENDING,
    ).values("workspace_id").first()

    if not candidate:
        raise ValidationError({
            "token": "Invalid or expired invitation."
        })

    with transaction.atomic():

        # All membership admissions for this workspace
        # must acquire this same workspace row lock.

        workspace = (
            Workspace.objects
            .select_for_update()
            .filter(pk=candidate["workspace_id"])
            .first()
        )

        if not workspace:
            raise ValidationError({
                "token": "Workspace no longer exists."
            })

        invitation = (
            Invitation.objects
            .select_for_update()
            .filter(
                workspace=workspace,
                token_hash=digest,
                status=Invitation.Status.PENDING,
            )
            .first()
        )

        if not invitation or invitation.is_expired:
            raise ValidationError({
                "token": "Invalid or expired invitation."
            })

        if invitation.email != user.email.lower():
            raise PermissionDenied(
                "This invitation belongs to another email."
            )

        membership = Membership.objects.filter(
            workspace=workspace,
            user_id=user.id,
        ).first()

        if membership is None:

            current_count = Membership.objects.filter(
                workspace=workspace,
            ).count()

            enforce_limit(
                workspace_id=workspace.id,
                resource="max_members",
                current_count=current_count,
            )

            membership = Membership.objects.create(
                workspace=workspace,
                user_id=user.id,
                role=invitation.role,
            )

        invitation.status = Invitation.Status.ACCEPTED

        invitation.accepted_at = timezone.now()

        invitation.save(
            update_fields=[
                "status",
                "accepted_at",
            ]
        )

        return membership