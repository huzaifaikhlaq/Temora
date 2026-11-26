import re
import secrets

from django.db import IntegrityError, transaction

from rest_framework.exceptions import APIException

from .models import Project

from .billing_client import (
    lock_workspace_quota,
    enforce_limit,
)


def generate_project_key(name):

    prefix = re.sub(
        r"[^A-Za-z0-9]",
        "",
        name,
    ).upper()[:6] or "PRJ"

    return f"{prefix}{secrets.token_hex(3).upper()}"


def create_project(workspace_id, user_id, data, key=None):

    for _ in range(5):

        generated_key = (
            key or generate_project_key(data["name"])
        )

        try:
            with transaction.atomic():

                lock_workspace_quota(
                    workspace_id,
                    "max_projects",
                )

                current_count = Project.objects.filter(
                    workspace_id=workspace_id,
                ).count()

                enforce_limit(
                    workspace_id=workspace_id,
                    resource="max_projects",
                    current_count=current_count,
                )

                return Project.objects.create(
                    workspace_id=workspace_id,
                    created_by=user_id,
                    key=generated_key,
                    **data,
                )

        except IntegrityError:
            continue

    raise APIException(
        "Could not generate a unique project key."
    )


def update_project(project, data):

    for field, value in data.items():
        setattr(project, field, value)

    project.save()

    return project