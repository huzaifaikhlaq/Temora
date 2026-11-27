import hashlib
import os

import requests

from django.conf import settings
from django.db import connection

from rest_framework.exceptions import APIException


class BillingUnavailable(APIException):

    status_code = 503
    default_detail = "Billing service unavailable."


class PlanLimitExceeded(APIException):

    status_code = 403
    default_code = "plan_limit_exceeded"


def get_limit(workspace_id, resource):

    url = os.getenv("BILLING_API_URL")
    key = os.getenv("BILLING_SERVICE_KEY")

    if not url or not key:
        raise BillingUnavailable()

    try:
        response = requests.get(
            (
                f"{url.rstrip('/')}/api/internal/"
                f"workspaces/{workspace_id}/entitlements/"
            ),
            headers={
                "X-Service-Id": settings.SERVICE_ID,
                "X-Service-Key": key,
                "Accept": "application/json",
            },
            timeout=(2, 5),
            allow_redirects=False,
        )

        if response.status_code != 200:
            raise BillingUnavailable()

        data = response.json()

        if data["workspace_id"] != str(workspace_id):
            raise ValueError("Workspace mismatch")

        limit = data["limits"][resource]

        if limit is not None and (
            type(limit) is not int or limit < 0
        ):
            raise ValueError("Invalid plan limit")

        return limit

    except (
        requests.RequestException,
        ValueError,
        KeyError,
        TypeError,
    ):
        raise BillingUnavailable()


def lock_workspace_quota(workspace_id, resource):

    if not connection.in_atomic_block:
        raise RuntimeError(
            "Quota locks require an atomic transaction."
        )

    digest = hashlib.sha256(
        f"{resource}:{workspace_id}".encode()
    ).digest()

    lock_id = int.from_bytes(
        digest[:8],
        byteorder="big",
        signed=True,
    )

    with connection.cursor() as cursor:

        cursor.execute(
            "SELECT pg_advisory_xact_lock(%s)",
            [lock_id],
        )


def enforce_limit(
    workspace_id,
    resource,
    current_count,
    requested=1,
):

    limit = get_limit(workspace_id, resource)

    if limit is not None and current_count + requested > limit:

        raise PlanLimitExceeded({
            "detail": "Your subscription limit has been reached.",
            "code": "PLAN_LIMIT_EXCEEDED",
            "resource": resource,
            "current_usage": current_count,
            "limit": limit,
            "requested": requested,
        })