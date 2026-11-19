import requests

from django.conf import settings

from rest_framework.exceptions import (
    APIException,
    ValidationError,
)


class SprintUnavailable(APIException):
    status_code = 503
    default_detail = "Sprint service unavailable."


def validate_sprint_assignment(
    request,
    workspace_id,
    project_id,
    sprint_id,
):
    if sprint_id is None:
        return

    try:
        response = requests.get(
            (
                f"{settings.SPRINT_API_URL}"
                f"/api/sprints/{sprint_id}/"
            ),
            headers={
                "Authorization": f"Bearer {request.auth}",
                "Accept": "application/json",
            },
            timeout=(2, 5),
            allow_redirects=False,
        )

    except requests.RequestException as exc:
        raise SprintUnavailable() from exc

    if response.status_code == 404:
        raise ValidationError({
            "sprint_id": "Sprint not found."
        })

    if response.status_code != 200:
        raise SprintUnavailable()

    try:
        sprint = response.json()
    except ValueError as exc:
        raise SprintUnavailable() from exc

    if (
        str(sprint.get("workspace_id")) != str(workspace_id)
        or str(sprint.get("project_id")) != str(project_id)
    ):
        raise ValidationError({
            "sprint_id": "Sprint belongs to another project."
        })

    if sprint.get("status") not in ("planned", "active"):
        raise ValidationError({
            "sprint_id": (
                "Cannot modify issues in a closing "
                "or completed sprint."
            )
        })