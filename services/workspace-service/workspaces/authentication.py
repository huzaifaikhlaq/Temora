
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
            raise ValueError("Identity user must be an object.")

        required_fields = {
            "id",
            "email",
            "full_name",
            "email_verified",
            "is_active",
        }
        if not required_fields.issubset(data):
            raise ValueError("Identity user response is incomplete.")

        if not isinstance(data["email"], str):
            raise ValueError("Identity user email must be a string.")
        if not isinstance(data["full_name"], str):
            raise ValueError("Identity user full_name must be a string.")
        if type(data["email_verified"]) is not bool:
            raise ValueError("Identity user email_verified must be a boolean.")
        if type(data["is_active"]) is not bool:
            raise ValueError("Identity user is_active must be a boolean.")

        self.id = uuid.UUID(str(data["id"]))
        self.email = data["email"].strip().lower()
        self.full_name = data["full_name"]
        self.email_verified = data["email_verified"]
        self.is_active = data["is_active"]
        self.is_authenticated = True


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
                timeout=5,
                allow_redirects=False,
            )
        except requests.RequestException:
            raise IdentityUnavailable()

        if response.status_code != 200:
            raise IdentityUnavailable()

        try:
            payload = response.json()
        except ValueError:
            raise IdentityUnavailable()

        if not payload.get("active"):
            raise AuthenticationFailed(
                "Invalid or expired session."
            )

        try:
            user = IdentityUser(payload["user"])
        except (ValueError, KeyError, TypeError, AttributeError):
            raise IdentityUnavailable()

        if not user.is_active:
            raise AuthenticationFailed("Account inactive.")

        return user, token

    def authenticate_header(self, request):
        return "Bearer"
