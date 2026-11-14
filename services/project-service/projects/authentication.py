
import uuid
import requests

from django.conf import settings

from rest_framework.authentication import (
    BaseAuthentication,
    get_authorization_header,
)

from rest_framework.exceptions import (
    AuthenticationFailed,
    APIException,
)


class IdentityUnavailable(APIException):
    status_code = 503
    default_detail = "Identity service unavailable."


class IdentityUser:

    def __init__(self, data):
        if not isinstance(data, dict):
            raise ValueError("Invalid identity response.")

        self.id = uuid.UUID(str(data["id"]))
        self.email = str(data["email"]).strip().lower()
        self.full_name = str(data["full_name"])

        if type(data["is_active"]) is not bool:
            raise ValueError("Invalid active status.")

        if type(data["email_verified"]) is not bool:
            raise ValueError("Invalid verification status.")

        self.is_active = data["is_active"]
        self.email_verified = data["email_verified"]

    @property
    def is_authenticated(self):
        return True


class IdentityAuthentication(BaseAuthentication):

    def authenticate(self, request):

        parts = get_authorization_header(request).split()

        if not parts:
            return None

        if len(parts) != 2 or parts[0].lower() != b"bearer":
            raise AuthenticationFailed(
                "Invalid Authorization header."
            )

        try:
            token = parts[1].decode("ascii")
        except UnicodeDecodeError:
            raise AuthenticationFailed("Invalid token.")

        if not token:
            raise AuthenticationFailed("Invalid token.")

        try:
            response = requests.post(
                f"{settings.IDENTITY_API_URL}/api/auth/introspect/",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Service-Id": settings.SERVICE_ID,
                    "X-Service-Key": settings.INTERNAL_SERVICE_KEY,
                },
                json={},
                timeout=(2, 5),
                allow_redirects=False,
            )
        except requests.RequestException:
            raise IdentityUnavailable()

        if response.status_code != 200:
            raise IdentityUnavailable()

        try:
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError()
        except ValueError:
            raise IdentityUnavailable()

        if payload.get("active") is not True:
            raise AuthenticationFailed(
                "Invalid or expired session."
            )

        try:
            user = IdentityUser(payload["user"])
        except (ValueError, KeyError, TypeError, AttributeError):
            raise IdentityUnavailable()

        if not user.is_active or not user.email_verified:
            raise AuthenticationFailed(
                "Account unavailable."
            )

        return user, token

    def authenticate_header(self, request):
        return "Bearer"
