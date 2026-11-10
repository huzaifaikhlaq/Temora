
from django.db import transaction
from django.db.models import Q
from django.http import Http404

from rest_framework import status
from rest_framework.exceptions import (
    PermissionDenied,
    NotFound,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, Membership, Invitation

from .permissions import (
    get_membership,
    require_role,
    can_manage_member,
    MANAGERS,
)

from .serializers import (
    WorkspaceCreateSerializer,
    WorkspaceUpdateSerializer,
    WorkspaceSerializer,
    MembershipSerializer,
    InviteSerializer,
    RoleUpdateSerializer,
    InvitationSerializer,
    AcceptInvitationSerializer,
)

from .services import (
    create_workspace,
    create_invitation,
    accept_invitation,
)


def serialize_workspace(workspace, membership):
    return WorkspaceSerializer(
        workspace,
        context={
            "roles": {
                workspace.id: membership.role
            }
        },
    ).data


class Health(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class WorkspaceListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        memberships = list(
            Membership.objects
            .filter(user_id=request.user.id)
            .select_related("workspace")
            .order_by("workspace__name")
        )

        return Response([
            serialize_workspace(
                membership.workspace,
                membership,
            )
            for membership in memberships
        ])

    def post(self, request):
        serializer = WorkspaceCreateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        workspace = create_workspace(
            request.user,
            serializer.validated_data["name"],
        )

        membership = Membership.objects.get(
            workspace=workspace,
            user_id=request.user.id,
        )

        return Response(
            serialize_workspace(workspace, membership),
            status=status.HTTP_201_CREATED,
        )


class WorkspaceDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        membership = get_membership(
            request.user,
            workspace_id,
        )

        return Response(
            serialize_workspace(
                membership.workspace,
                membership,
            )
        )

    def patch(self, request, workspace_id):
        require_role(
            request.user,
            workspace_id,
            MANAGERS,
        )

        serializer = WorkspaceUpdateSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        workspace = Workspace.objects.get(
            pk=workspace_id
        )
        workspace.name = serializer.validated_data["name"]
        workspace.save(update_fields=["name", "updated_at"])

        membership = get_membership(
            request.user,
            workspace_id,
        )

        return Response(
            serialize_workspace(workspace, membership)
        )

    def delete(self, request, workspace_id):
        with transaction.atomic():
            workspace = (
                Workspace.objects
                .select_for_update()
                .filter(pk=workspace_id)
                .first()
            )

            if not workspace:
                raise NotFound("Workspace not found.")

            require_role(
                request.user,
                workspace_id,
                [Membership.Role.OWNER],
            )

            workspace.delete()

        return Response(status=204)


class WorkspaceMembers(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        get_membership(request.user, workspace_id)

        members = Membership.objects.filter(
            workspace_id=workspace_id
        ).order_by("joined_at")

        return Response(
            MembershipSerializer(members, many=True).data
        )


class WorkspaceInvitations(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        require_role(
            request.user,
            workspace_id,
            MANAGERS,
        )

        invitations = Invitation.objects.filter(
            workspace_id=workspace_id,
            status=Invitation.Status.PENDING,
        ).order_by("-created_at")

        return Response(
            InvitationSerializer(
                invitations,
                many=True,
            ).data
        )

    def post(self, request, workspace_id):
        actor_membership = require_role(
            request.user,
            workspace_id,
            MANAGERS,
        )

        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        if (
            actor_membership.role == Membership.Role.ADMIN
            and data["role"] == Membership.Role.ADMIN
        ):
            raise PermissionDenied(
                "Only owners can invite admins."
            )

        workspace = actor_membership.workspace

        invitation = create_invitation(
            workspace,
            request.user,
            data["email"],
            data["role"],
        )

        return Response(
            InvitationSerializer(invitation).data,
            status=201,
        )


class InvitationAccept(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AcceptInvitationSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        membership = accept_invitation(
            request.user,
            serializer.validated_data["token"],
        )

        return Response(
            MembershipSerializer(membership).data,
            status=200,
        )


class InvitationRevoke(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, workspace_id, invitation_id):
        require_role(
            request.user,
            workspace_id,
            MANAGERS,
        )

        updated = Invitation.objects.filter(
            id=invitation_id,
            workspace_id=workspace_id,
            status=Invitation.Status.PENDING,
        ).update(
            status=Invitation.Status.REVOKED
        )

        if not updated:
            raise NotFound("Invitation not found.")

        return Response(status=204)


class MemberDetail(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, workspace_id, member_id):
        serializer = RoleUpdateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            actor = require_role(
                request.user,
                workspace_id,
                MANAGERS,
            )

            target = (
                Membership.objects
                .select_for_update()
                .filter(
                    pk=member_id,
                    workspace_id=workspace_id,
                )
                .first()
            )

            if not target:
                raise NotFound("Member not found.")

            if not can_manage_member(actor, target):
                raise PermissionDenied(
                    "You cannot manage this member."
                )

            new_role = serializer.validated_data["role"]

            if (
                actor.role == Membership.Role.ADMIN
                and new_role == Membership.Role.ADMIN
            ):
                raise PermissionDenied(
                    "Only owners can promote admins."
                )

            target.role = new_role
            target.save(update_fields=["role"])

        return Response(
            MembershipSerializer(target).data
        )

    def delete(self, request, workspace_id, member_id):
        with transaction.atomic():
            actor = require_role(
                request.user,
                workspace_id,
                MANAGERS,
            )

            target = (
                Membership.objects
                .select_for_update()
                .filter(
                    pk=member_id,
                    workspace_id=workspace_id,
                )
                .first()
            )

            if not target:
                raise NotFound("Member not found.")

            if not can_manage_member(actor, target):
                raise PermissionDenied(
                    "You cannot remove this member."
                )

            target.delete()

        return Response(status=204)


class LeaveWorkspace(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id):
        with transaction.atomic():
            membership = (
                Membership.objects
                .select_for_update()
                .filter(
                    workspace_id=workspace_id,
                    user_id=request.user.id,
                )
                .first()
            )

            if not membership:
                raise NotFound("Workspace not found.")

            if membership.role == Membership.Role.OWNER:
                raise PermissionDenied(
                    "Owner cannot leave the workspace."
                )

            membership.delete()

        return Response(status=204)
