
from pathlib import Path

from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Issue, IssueAttachment
from .permissions import require_scope, validate_assignee
from .serializers import (
    AttachmentSerializer,
    IssueReadSerializer,
    IssueWriteSerializer,
)
from .services import insert_issue, modify_issue


def get_issue(request, workspace_id, project_id, issue_id):
    issue = get_object_or_404(
        Issue.objects.prefetch_related(
            "attachments",
            "subtasks",
        ),
        id=issue_id,
        workspace_id=workspace_id,
        project_id=project_id,
        archived_at__isnull=True,
    )

    if issue.is_draft and issue.reporter_id != request.user.id:
        raise NotFound("Issue not found")

    return issue


class Health(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class IssueCollection(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id, project_id):
        require_scope(request, workspace_id, project_id)

        issues = Issue.objects.filter(
            workspace_id=workspace_id,
            project_id=project_id,
            archived_at__isnull=True,
            parent__isnull=True,
        ).prefetch_related(
            "attachments",
            "subtasks",
        )

        if request.query_params.get("include_drafts") == "1":
            from django.db.models import Q

            issues = issues.filter(
                Q(is_draft=False)
                | Q(is_draft=True, reporter_id=request.user.id)
            )
        else:
            issues = issues.filter(is_draft=False)

        for name in ("status", "priority", "issue_type"):
            value = request.query_params.get(name)

            if value:
                issues = issues.filter(**{name: value})

        assignee = request.query_params.get("assignee_id")

        if assignee:
            from uuid import UUID

            try:
                assignee = UUID(assignee)
            except ValueError:
                raise ValidationError({
                    "assignee_id": "Invalid UUID"
                })

            issues = issues.filter(
                assignee_id=assignee,
            )

        return Response(
            IssueReadSerializer(
                issues.order_by("-created_at")[:200],
                many=True,
            ).data
        )

    def post(self, request, workspace_id, project_id):
        project = require_scope(
            request,
            workspace_id,
            project_id,
            write=True,
        )

        serializer = IssueWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        values = serializer.validated_data

        validate_assignee(
            request,
            workspace_id,
            values.get("assignee_id"),
        )

        issue = insert_issue(
            workspace_id,
            project_id,
            project["key"],
            request.user.id,
            values,
        )

        return Response(
            IssueReadSerializer(issue).data,
            status=status.HTTP_201_CREATED,
        )


class IssueDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id, project_id, issue_id):
        require_scope(request, workspace_id, project_id)

        issue = get_issue(
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        return Response(IssueReadSerializer(issue).data)

    def patch(self, request, workspace_id, project_id, issue_id):
        require_scope(
            request,
            workspace_id,
            project_id,
            write=True,
        )

        issue = get_issue(  
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        serializer = IssueWriteSerializer(
            instance=issue,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data

        validate_assignee(
            request,
            workspace_id,
            values.get("assignee_id"),
        )

        issue = modify_issue(issue, values)

        return Response(IssueReadSerializer(issue).data)

    def delete(self, request, workspace_id, project_id, issue_id):
        require_scope(
            request,
            workspace_id,
            project_id,
            write=True,
        )

        issue = get_issue(
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        issue.archived_at = timezone.now()
        issue.save(
            update_fields=["archived_at", "updated_at"]
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


ALLOWED_EXTENSIONS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".webm": "video/webm",
}

MAX_FILE_SIZE = 25 * 1024 * 1024


def detect_mime(name, uploaded):
    suffix = Path(name).suffix.lower()
    mime = ALLOWED_EXTENSIONS.get(suffix)

    if mime is None:
        raise ValidationError({
            "file": "Allowed formats: PNG, JPG, PDF, WebM"
        })

    signature = uploaded.read(16)
    uploaded.seek(0)

    valid = {
        "image/png": signature.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": signature.startswith(b"\xff\xd8\xff"),
        "application/pdf": signature.startswith(b"%PDF-"),
        "video/webm": signature.startswith(b"\x1a\x45\xdf\xa3"),
    }

    if not valid[mime]:
        raise ValidationError({
            "file": "File contents do not match extension"
        })

    return mime


class IssueAttachments(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, workspace_id, project_id, issue_id):
        require_scope(
            request,
            workspace_id,
            project_id,
            write=True,
        )

        issue = get_issue(
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        uploaded = request.FILES.get("file")

        if not uploaded or not 0 < uploaded.size <= MAX_FILE_SIZE:
            raise ValidationError({
                "file": "File is required and must be no larger than 25 MB"
            })

        mime = detect_mime(uploaded.name, uploaded)

        attachment = IssueAttachment.objects.create(
            issue=issue,
            file=uploaded,
            original_name=Path(uploaded.name).name[:255],
            mime_type=mime,
            size=uploaded.size,
            uploaded_by=request.user.id,
        )

        return Response(
            AttachmentSerializer(attachment).data,
            status=201,
        )


class IssueAttachmentDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
        attachment_id,
    ):
        require_scope(request, workspace_id, project_id)

        issue = get_issue(
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        attachment = get_object_or_404(
            IssueAttachment,
            id=attachment_id,
            issue=issue,
        )

        response = FileResponse(
            attachment.file.open("rb"),
            as_attachment=True,
            filename=attachment.original_name,
            content_type=attachment.mime_type,
        )

        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"

        return response

    def delete(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
        attachment_id,
    ):
        require_scope(
            request,
            workspace_id,
            project_id,
            write=True,
        )

        issue = get_issue(
            request,
            workspace_id,
            project_id,
            issue_id,
        )

        attachment = get_object_or_404(
            IssueAttachment,
            id=attachment_id,
            issue=issue,
        )

        with transaction.atomic():
            attachment.delete()

        attachment.file.delete(save=False)

        return Response(status=204)
