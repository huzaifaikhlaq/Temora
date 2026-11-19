
from django.urls import path
from . import views
from .sprint_internal import (
    InternalSprintIssues,
    InternalSprintComplete,
)

base = "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/issues/"

urlpatterns = [
    path("health/", views.Health.as_view()),

    path(
        base,
        views.IssueCollection.as_view(),
    ),
    path(
        base + "<uuid:issue_id>/",
        views.IssueDetail.as_view(),
    ),
    path(
        base + "<uuid:issue_id>/attachments/",
        views.IssueAttachments.as_view(),
    ),
    path(
        base + "<uuid:issue_id>/attachments/<uuid:attachment_id>/",
        views.IssueAttachmentDetail.as_view(),
    ),
     path(
        "internal/sprints/<uuid:sprint_id>/issues/",
        InternalSprintIssues.as_view(),
    ),
    path(
        "internal/sprints/<uuid:sprint_id>/complete/",
        InternalSprintComplete.as_view(),
    ),
]
