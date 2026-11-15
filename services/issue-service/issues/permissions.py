import requests
from django.conf import settings
from rest_framework.exceptions import APIException, AuthenticationFailed, NotFound, PermissionDenied

class WorkspaceUnavailable(APIException):
    status_code = 503
    default_detail = "Workspace service unavailable."

def require_workspace_access(request, workspace_id):
    token = request.auth
    if not isinstance(token, str) or not token:
        raise AuthenticationFailed("Session required.")
    try:
        response = requests.get(f"{settings.WORKSPACE_API_URL}/api/workspaces/{workspace_id}/", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, timeout=(2, 5), allow_redirects=False)
    except requests.RequestException as exc:
        raise WorkspaceUnavailable() from exc
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
    except ValueError as exc:
        raise WorkspaceUnavailable() from exc
    if not isinstance(data, dict) or str(data.get("id")) != str(workspace_id) or data.get("role") not in {"owner", "admin", "member", "viewer"}:
        raise WorkspaceUnavailable()
    return data["role"]
