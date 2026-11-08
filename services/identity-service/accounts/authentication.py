import hashlib

from rest_framework.authentication import (
    BaseAuthentication,
    get_authorization_header,
)

from rest_framework.exceptions import AuthenticationFailed

from .models import Session


def digest(token):
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


class OpaqueSessionAuthentication(BaseAuthentication):

    def authenticate(self, request):

        parts = get_authorization_header(
            request
        ).split()

        if not parts or parts[0].lower() != b"bearer":
            return None

        if len(parts) != 2:
            raise AuthenticationFailed(
                "Invalid Authorization header"
            )

        try:
            token = parts[1].decode("ascii")

        except UnicodeDecodeError as exc:
            raise AuthenticationFailed(
                "Invalid token"
            ) from exc

        if not token:
            raise AuthenticationFailed(
                "Invalid token"
            )

        session = (
            Session.objects
            .select_related("user")
            .filter(token_hash=digest(token))
            .first()
        )

        if not session or not session.valid():
            raise AuthenticationFailed(
                "Invalid or expired session"
            )

        return session.user, session

    def authenticate_header(self, request):
        return "Bearer"