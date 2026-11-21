import requests

from django.conf import settings

from rest_framework.exceptions import (
    APIException,
    ValidationError,
)


class IssueServiceUnavailable(APIException):
    status_code = 503
    default_detail = "Issue service unavailable."


def issue_request(method, path, payload=None):
    headers = {
        "X-Service-Id": settings.SERVICE_ID,
        "X-Service-Key": settings.INTERNAL_SERVICE_KEY,
        "Accept": "application/json",
    }

    try:
        response = requests.request(
            method,
            f"{settings.ISSUE_API_URL}/api/{path}",
            headers=headers,
            json=payload,
            timeout=(2, 20),
            allow_redirects=False,
        )
    except requests.RequestException as exc:
        raise IssueServiceUnavailable() from exc

    if response.status_code in (400, 409):
        try:
            detail = response.json()
        except ValueError:
            detail = {"detail": "Invalid issue operation"}

        raise ValidationError(detail)

    if response.status_code != 200:
        raise IssueServiceUnavailable()

    try:
        return response.json()
    except ValueError as exc:
        raise IssueServiceUnavailable() from exc


def get_sprint_issue_data(sprint):
    return issue_request(
        "GET",
        (
            f"internal/sprints/{sprint.id}/issues/"
            f"?workspace_id={sprint.workspace_id}"
            f"&project_id={sprint.project_id}"
        ),
    )


def get_sprint_issues(sprint):
    return get_sprint_issue_data(sprint)["issues"]


def get_sprint_completion_issues(sprint):
    if not sprint.completion_operation_id:
        return get_sprint_issue_data(sprint)

    return issue_request(
        "GET",
        (
            f"internal/sprints/{sprint.id}/complete/"
            f"?workspace_id={sprint.workspace_id}"
            f"&project_id={sprint.project_id}"
            f"&operation_id={sprint.completion_operation_id}"
        ),
    )


def rollover_issues(sprint):
    plan = sprint.completion_plan

    return issue_request(
        "POST",
        (
            f"internal/sprints/{sprint.id}/complete/"
        ),
        {
            "operation_id": str(
                sprint.completion_operation_id
            ),
            "workspace_id": str(sprint.workspace_id),
            "project_id": str(sprint.project_id),
            "target_sprint_id": plan.get("target_sprint_id"),
            "selected_issue_ids": plan.get(
                "selected_issue_ids"
            ),
        },
    )
