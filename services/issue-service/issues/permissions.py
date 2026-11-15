
import requests
from django.conf import settings

from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)


class DependencyUnavailable(APIException):
    status_code = 503
    default_detail = "Required service is unavailable."


def service_get(request, base_url, path):
    token = request.auth

    if not isinstance(token, str) or not token:
        raise AuthenticationFailed("Session required")

    try:
        response = requests.get(
            f"{base_url}/api/{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=(2, 5),
            allow_redirects=False,
        )
    except requests.RequestException as exc:
        raise DependencyUnavailable() from exc

    if response.status_code == 401:
        raise AuthenticationFailed("Session expired")

    if response.status_code in (403, 404):
        raise NotFound("Resource not found")

    if response.status_code != 200:
        raise DependencyUnavailable()

    try:
        data = response.json()
    except ValueError as exc:
        raise DependencyUnavailable() from exc

    return data


def require_scope(request, workspace_id, project_id, write=False):
    workspace = service_get(
        request,
        settings.WORKSPACE_API_URL,
        f"workspaces/{workspace_id}/",
    )

    if (
        not isinstance(workspace, dict)
        or str(workspace.get("id")) != str(workspace_id)
    ):
        raise DependencyUnavailable()

    role = workspace.get("role")

    if role not in ("owner", "admin", "member", "viewer"):
        raise DependencyUnavailable()

    if write and role == "viewer":
        raise PermissionDenied(
            "Viewers cannot modify issues"
        )

    project = service_get(
        request,
        settings.PROJECT_API_URL,
        f"workspaces/{workspace_id}/projects/{project_id}/",
    )

    if (
        not isinstance(project, dict)
        or str(project.get("workspace_id")) != str(workspace_id)
        or str(project.get("id")) != str(project_id)
    ):
        raise DependencyUnavailable()

    if write and project.get("archived_at"):
        raise ValidationError(
            "Restore the project before editing issues"
        )

    return project


def validate_assignee(request, workspace_id, assignee_id):
    if assignee_id is None:
        return

    members = service_get(
        request,
        settings.WORKSPACE_API_URL,
        f"workspaces/{workspace_id}/members/",
    )

    if not isinstance(members, list):
        raise DependencyUnavailable()

    if not any(
        isinstance(m, dict)
        and str(m.get("user_id")) == str(assignee_id)
        for m in members
    ):
        raise ValidationError({
            "assignee_id": "Assignee must belong to this workspace"
        })
