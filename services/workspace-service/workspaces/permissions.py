
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
)

from .models import Membership, Workspace


def get_membership(user, workspace_id):
    membership = (
        Membership.objects
        .select_related("workspace")
        .filter(
            workspace_id=workspace_id,
            user_id=user.id,
        )
        .first()
    )

    # Hide another tenant's existence.
    if not membership:
        raise NotFound("Workspace not found.")

    return membership


def require_role(user, workspace_id, allowed_roles):
    membership = get_membership(user, workspace_id)

    if membership.role not in allowed_roles:
        raise PermissionDenied(
            "You do not have permission."
        )

    return membership


MANAGERS = (
    Membership.Role.OWNER,
    Membership.Role.ADMIN,
)


def can_manage_member(actor, target):
    if actor.role == Membership.Role.OWNER:
        return True

    return (
        actor.role == Membership.Role.ADMIN
        and target.role in (
            Membership.Role.MEMBER,
            Membership.Role.VIEWER,
        )
    )
