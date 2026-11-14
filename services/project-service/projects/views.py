
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project
from .permissions import require_workspace_access
from .serializers import (
    ProjectSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
)
from .services import create_project, update_project


class Health(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class ProjectListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        require_workspace_access(request, workspace_id)

        projects = Project.objects.filter(
            workspace_id=workspace_id
        ).order_by("-created_at")

        return Response(
            ProjectSerializer(projects, many=True).data
        )

    def post(self, request, workspace_id):
        require_workspace_access(
            request,
            workspace_id,
            manage=True,
        )

        serializer = ProjectCreateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        project = create_project(
            workspace_id=workspace_id,
            user_id=request.user.id,
            data=serializer.validated_data,
        )

        return Response(
            ProjectSerializer(project).data,
            status=status.HTTP_201_CREATED,
        )


class ProjectDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id, project_id):
        require_workspace_access(request, workspace_id)

        project = get_object_or_404(
            Project,
            id=project_id,
            workspace_id=workspace_id,
        )

        return Response(
            ProjectSerializer(project).data
        )

    def patch(self, request, workspace_id, project_id):
        require_workspace_access(
            request,
            workspace_id,
            manage=True,
        )

        project = get_object_or_404(
            Project,
            id=project_id,
            workspace_id=workspace_id,
        )

        if project.archived_at:
            raise ValidationError(
                "Restore the project before editing it."
            )

        serializer = ProjectUpdateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        project = update_project(
            project,
            serializer.validated_data,
        )

        return Response(
            ProjectSerializer(project).data
        )


class ProjectArchive(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id, project_id):
        require_workspace_access(
            request,
            workspace_id,
            manage=True,
        )

        with transaction.atomic():
            project = get_object_or_404(
                Project.objects.select_for_update(),
                id=project_id,
                workspace_id=workspace_id,
            )

            if project.archived_at is None:
                project.archived_at = timezone.now()
                project.save(
                    update_fields=["archived_at", "updated_at"]
                )

        return Response(
            ProjectSerializer(project).data
        )


class ProjectRestore(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id, project_id):
        require_workspace_access(
            request,
            workspace_id,
            manage=True,
        )

        with transaction.atomic():
            project = get_object_or_404(
                Project.objects.select_for_update(),
                id=project_id,
                workspace_id=workspace_id,
            )

            if project.archived_at is not None:
                project.archived_at = None
                project.save(
                    update_fields=["archived_at", "updated_at"]
                )

        return Response(
            ProjectSerializer(project).data
        )
