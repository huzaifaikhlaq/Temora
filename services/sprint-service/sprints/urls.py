from django.urls import path
from . import views


project_base = (
    "workspaces/<uuid:workspace_id>/"
    "projects/<uuid:project_id>/sprints/"
)

sprint_base = "sprints/<uuid:sprint_id>/"


urlpatterns = [
    path(
        "health/",
        views.Health.as_view(),
    ),

    path(
        project_base,
        views.SprintCollection.as_view(),
    ),

    path(
        sprint_base,
        views.SprintDetail.as_view(),
    ),

    path(
        sprint_base + "start/",
        views.SprintStart.as_view(),
    ),

    path(
        sprint_base + "metrics/",
        views.SprintMetrics.as_view(),
    ),

    path(
        sprint_base + "complete/",
        views.SprintCompletion.as_view(),
    ),

    path(
        sprint_base + "retrospective/",
        views.SprintRetrospective.as_view(),
    ),

    path(
        sprint_base + "notes/",
        views.NoteCollection.as_view(),
    ),

    path(
        sprint_base + "notes/<uuid:note_id>/",
        views.NoteDetail.as_view(),
    ),

    path(
        sprint_base + "notes/<uuid:note_id>/vote/",
        views.NoteVote.as_view(),
    ),

    path(
        sprint_base + "notes/<uuid:note_id>/comments/",
        views.NoteComments.as_view(),
    ),

    path(
        sprint_base + "check-in/",
        views.SprintCheckIn.as_view(),
    ),

    path(
        sprint_base + "burndown/",
        views.SprintBurndown.as_view(),
    ),

    path(
        sprint_base + "themes/",
        views.SprintThemes.as_view(),
    ),

    path(
        sprint_base + "report/",
        views.SprintReport.as_view(),
    ),
]