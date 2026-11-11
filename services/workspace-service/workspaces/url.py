
from django.urls import path

from . import views

urlpatterns = [
    path(
        "health/",
        views.Health.as_view(),
    ),
    path(
        "workspaces/",
        views.WorkspaceListCreate.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/",
        views.WorkspaceDetail.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/members/",
        views.WorkspaceMembers.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/members/<uuid:member_id>/",
        views.MemberDetail.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/invitations/",
        views.WorkspaceInvitations.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/invitations/<uuid:invitation_id>/",
        views.InvitationRevoke.as_view(),
    ),
    path(
        "invitations/accept/",
        views.InvitationAccept.as_view(),
    ),
    path(
        "workspaces/<uuid:workspace_id>/leave/",
        views.LeaveWorkspace.as_view(),
    ),
]