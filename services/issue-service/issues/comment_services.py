import re

from uuid import UUID

import requests

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import (
    ValidationError,
)

from .models import IssueComment

from .permissions import (
    service_get,
    DependencyUnavailable,
)

from .events import record_comment_event


MENTION_PATTERN = re.compile(
    r"(?<![\w@.+-])@([a-zA-Z0-9_-]{1,64})"
    r"(?![\w-])"
)

MAX_MENTIONS = 20


def extract_mentions(body):

    usernames = MENTION_PATTERN.findall(body)

    return sorted({
        username.lower()
        for username in usernames
    })


def get_workspace_users(request, workspace_id):

    members = service_get(
        request,
        settings.WORKSPACE_API_URL,
        f"workspaces/{workspace_id}/members/",
    )

    if not isinstance(members, list):
        raise DependencyUnavailable()

    try:
        user_ids = sorted({
            str(UUID(str(member["user_id"])))
            for member in members
        })

    except (ValueError, KeyError, TypeError) as exc:
        raise DependencyUnavailable() from exc

    if not user_ids:
        return []

    users = []

    # Identity accepts at most 200 users per request.
    for index in range(0, len(user_ids), 200):

        batch = user_ids[index:index + 200]

        try:
            response = requests.post(
                (
                    f"{settings.IDENTITY_API_URL}"
                    "/api/auth/internal/users/resolve/"
                ),

                headers={
                    "X-Service-Id": settings.SERVICE_ID,

                    "X-Service-Key": (
                        settings.INTERNAL_SERVICE_KEY
                    ),

                    "Accept": "application/json",
                },

                json={
                    "user_ids": batch,
                },

                timeout=(2, 5),

                allow_redirects=False,
            )

        except requests.RequestException as exc:
            raise DependencyUnavailable() from exc

        if response.status_code != 200:
            raise DependencyUnavailable()

        try:
            data = response.json()

            if not isinstance(data, list):
                raise ValueError("Invalid user directory")

            for user in data:

                user_id = str(UUID(str(user["id"])))

                username = user["username"]

                full_name = user["full_name"]

                if (
                    user_id not in batch
                    or not isinstance(username, str)
                    or not re.fullmatch(
                        r"[a-z0-9_-]{1,64}",
                        username,
                    )
                    or not isinstance(full_name, str)
                ):
                    raise ValueError(
                        "Invalid user directory entry"
                    )

                users.append({
                    "id": user_id,
                    "username": username,
                    "full_name": full_name,
                })

        except (
            ValueError,
            KeyError,
            TypeError,
        ) as exc:
            raise DependencyUnavailable() from exc

    return sorted(
        users,
        key=lambda user: user["username"],
    )


def resolve_mentions(
    request,
    workspace_id,
    body,
):

    usernames = extract_mentions(body)

    if not usernames:
        return []

    if len(usernames) > MAX_MENTIONS:
        raise ValidationError({
            "body": (
                f"A maximum of {MAX_MENTIONS} "
                "members can be mentioned."
            ),
        })

    users = get_workspace_users(
        request,
        workspace_id,
    )

    username_map = {
        user["username"].lower(): user["id"]
        for user in users
    }

    unknown_usernames = [
        username
        for username in usernames
        if username not in username_map
    ]

    if unknown_usernames:
        raise ValidationError({
            "body": (
                "Unknown workspace members: "
                + ", ".join(
                    f"@{name}"
                    for name in unknown_usernames
                )
            ),
        })

    return sorted({
        username_map[username]
        for username in usernames
    })


@transaction.atomic
def create_comment(
    issue,
    author,
    body,
    mentioned_user_ids,
):

    comment = IssueComment.objects.create(
        issue=issue,

        author_id=author.id,

        author_name=author.full_name,

        body=body,

        mentioned_user_ids=mentioned_user_ids,
    )

    record_comment_event(
        event_type="issue.comment.created",

        comment=comment,

        actor_id=author.id,

        new_mentions=mentioned_user_ids,
    )

    return comment


@transaction.atomic
def update_comment(
    comment,
    actor_id,
    body,
    mentioned_user_ids,
):

    previous_mentions = set(
        comment.mentioned_user_ids
    )

    current_mentions = set(
        mentioned_user_ids
    )

    if (
        comment.body == body
        and previous_mentions == current_mentions
    ):
        return comment

    new_mentions = sorted(
        current_mentions - previous_mentions
    )

    comment.body = body

    comment.mentioned_user_ids = mentioned_user_ids

    comment.edited_at = timezone.now()

    comment.save(
        update_fields=[
            "body",
            "mentioned_user_ids",
            "edited_at",
            "updated_at",
        ],
    )

    record_comment_event(
        event_type="issue.comment.updated",

        comment=comment,

        actor_id=actor_id,

        new_mentions=new_mentions,
    )

    return comment


@transaction.atomic
def delete_comment(comment, actor_id):

    comment.deleted_at = timezone.now()

    comment.deleted_by = actor_id

    comment.save(
        update_fields=[
            "deleted_at",
            "deleted_by",
            "updated_at",
        ],
    )

    record_comment_event(
        event_type="issue.comment.deleted",

        comment=comment,

        actor_id=actor_id,
    )