
import hashlib
import secrets

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from rest_framework.exceptions import (
    ValidationError,
    PermissionDenied,
)

from .models import Workspace, Membership, Invitation


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
    url = (
        f"{settings.FRONTEND_URL}/invitations/accept"
        f"?token={raw_token}"
    )

    send_mail(
        subject=f"Join {invitation.workspace.name} on Temora",
        message=(
            f"You have been invited to join "
            f"{invitation.workspace.name}.\n\n"
            f"Accept your invitation:\n{url}\n\n"
            "If you did not expect this invitation, "
            "you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.email],
        fail_silently=False,
    )


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
    with transaction.atomic():
        invitation = (
            Invitation.objects
            .select_for_update()
            .select_related("workspace")
            .filter(
                token_hash=token_digest(raw_token),
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

        membership, created = (
            Membership.objects.get_or_create(
                workspace=invitation.workspace,
                user_id=user.id,
                defaults={"role": invitation.role},
            )
        )

        # Existing members keep their current roles.
        invitation.status = Invitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save(
            update_fields=["status", "accepted_at"]
        )

    return membership
