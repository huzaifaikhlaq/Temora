import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone

from .authentication import digest
from .models import Session, OneTimeToken
from .tasks import send_token_email


# Sessions last for 60 days.
SESSION_SECONDS = 60 * 24 * 60 * 60


def issue_session(user):
    raw_token = secrets.token_urlsafe(48)

    Session.objects.create(
        user=user,
        token_hash=digest(raw_token),
        expires_at=(
            timezone.now()
            + timedelta(seconds=SESSION_SECONDS)
        ),
    )

    return raw_token


def queue_link(user, purpose):
    if purpose not in ("verify", "reset"):
        raise ValueError("Unsupported token purpose")

    ttl = (
        timedelta(hours=24)
        if purpose == "verify"
        else timedelta(minutes=30)
    )

    raw_token = secrets.token_urlsafe(40)

    OneTimeToken.objects.create(
        user=user,
        token_hash=digest(raw_token),
        purpose=purpose,
        expires_at=timezone.now() + ttl,
    )

    query = urlencode({"token": raw_token})

    if purpose == "verify":
        # The fragment is not sent in the HTTP GET.
        url = (
            f"{settings.FRONTEND_URL}"
            f"/auth/confirm#{query}"
        )
    else:
        url = (
            f"{settings.FRONTEND_URL}"
            f"/reset-password?{query}"
        )

    send_token_email.delay_on_commit(
        user.email,
        purpose,
        url,
    )


def consume_token(raw, purpose):
    return (
        OneTimeToken.objects
        .select_for_update()
        .select_related("user")
        .filter(
            token_hash=digest(raw),
            purpose=purpose,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
            user__is_active=True,
        )
        .first()
    )