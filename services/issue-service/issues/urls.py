
from django.urls import path
from . import views

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
]
