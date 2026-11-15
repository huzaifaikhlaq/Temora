from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.Health.as_view(), name="issue-health"),
    path("workspaces/<uuid:workspace_id>/issues/", views.IssueListCreate.as_view(), name="issue-list-create"),
    path("workspaces/<uuid:workspace_id>/issues/<uuid:issue_id>/", views.IssueDetail.as_view(), name="issue-detail"),
]
