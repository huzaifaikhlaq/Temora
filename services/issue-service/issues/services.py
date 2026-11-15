import secrets
from django.db import IntegrityError, transaction
from rest_framework.exceptions import APIException
from .models import Issue

def create_issue(workspace_id, reporter_id, data):
    for _ in range(5):
        try:
            with transaction.atomic():
                return Issue.objects.create(workspace_id=workspace_id, reporter_id=reporter_id, key=f"ISS-{secrets.token_hex(4).upper()}", **data)
        except IntegrityError:
            continue
    raise APIException("Could not generate a unique issue key.")

def update_issue(issue, data):
    for field, value in data.items():
        setattr(issue, field, value)
    issue.save()
    return issue
