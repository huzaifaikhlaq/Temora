
from django.urls import path

from . import views

urlpatterns = [
    path(
        "health/",
        views.Health.as_view(),
        name="project-health",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/",
        views.ProjectListCreate.as_view(),
        name="project-list-create",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/",
        views.ProjectDetail.as_view(),
        name="project-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/archive/",
        views.ProjectArchive.as_view(),
        name="project-archive",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/restore/",
        views.ProjectRestore.as_view(),
        name="project-restore",
    ),
]