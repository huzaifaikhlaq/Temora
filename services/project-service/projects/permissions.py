
import requests

from django.conf import settings

from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
)


class WorkspaceUnavailable(APIException):
    status_code = 503
    default_detail = "Workspace service unavailable."


MANAGERS = {"owner", "admin"}
READERS = {"owner", "admin", "member", "viewer"}


def workspace_role(request, workspace_id):
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
    except ValueError:
        raise WorkspaceUnavailable()

    if not isinstance(data, dict):
        raise WorkspaceUnavailable()

    # Never trust a mismatched response from another service.
    if str(data.get("id")) != str(workspace_id):
        raise WorkspaceUnavailable()

    role = data.get("role")

    if role not in READERS:
        raise WorkspaceUnavailable()

    return role


def require_workspace_access(
    request,
    workspace_id,
    manage=False,
):
    role = workspace_role(request, workspace_id)

    if manage and role not in MANAGERS:
        raise PermissionDenied(
            "Only workspace owners and admins can manage projects."
        )

    return role
