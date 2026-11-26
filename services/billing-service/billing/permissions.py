import secrets
import requests

from django.conf import settings

from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    PermissionDenied,
    NotFound,
)


class WorkspaceUnavailable(APIException):
    status_code = 503
    default_detail = "Workspace service unavailable."


READERS = {
    "owner",
    "admin",
    "member",
    "viewer",
}


def require_workspace_access(
    request,
    workspace_id,
    owner_only=False,
):

    token = request.auth

    if not isinstance(token, str) or not token:
        raise AuthenticationFailed("Session required.")

    try:
        response = requests.get(
            (
                f"{settings.WORKSPACE_API_URL}"
                f"/api/workspaces/{workspace_id}/"
            ),
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=(2, 5),
            allow_redirects=False,
        )

    except requests.RequestException:
        raise WorkspaceUnavailable()

    if response.status_code == 404:
        raise NotFound("Workspace not found.")

    if response.status_code == 401:
        raise AuthenticationFailed("Session expired.")

    if response.status_code == 403:
        raise PermissionDenied("Workspace access denied.")

    if response.status_code != 200:
        raise WorkspaceUnavailable()

    try:
        data = response.json()

        if not isinstance(data, dict):
            raise ValueError()

        if str(data.get("id")) != str(workspace_id):
            raise ValueError()

        role = data.get("role")

        if role not in READERS:
            raise ValueError()

    except (ValueError, TypeError):
        raise WorkspaceUnavailable()

    if owner_only and role != "owner":
        raise PermissionDenied(
            "Only the workspace owner can manage billing."
        )

    return role


def require_internal_service(request):

    service_id = request.headers.get(
        "X-Service-Id",
        "",
    )

    provided = request.headers.get(
        "X-Service-Key",
        "",
    )

    expected = settings.BILLING_CALLER_KEYS.get(service_id)

    if not expected or not secrets.compare_digest(
        provided,
        expected,
    ):
        raise PermissionDenied("Invalid service credentials.")

    return service_id