from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status

from rest_framework.exceptions import (
    PermissionDenied,
)

from rest_framework.pagination import (
    PageNumberPagination,
)

from rest_framework.parsers import JSONParser

from rest_framework.permissions import (
    IsAuthenticated,
)

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Issue, IssueComment

from .permissions import require_scope

from .comment_serializers import (
    CommentReadSerializer,
    CommentWriteSerializer,
)

from .comment_services import (
    get_workspace_users,
    resolve_mentions,
    create_comment,
    update_comment,
    delete_comment,
)


def get_comment_issue(
    workspace_id,
    project_id,
    issue_id,
    lock=False,
):

    queryset = Issue.objects.all()

    if lock:
        queryset = queryset.select_for_update()

    return get_object_or_404(
        queryset,

        id=issue_id,

        workspace_id=workspace_id,

        project_id=project_id,

        is_draft=False,

        archived_at__isnull=True,
    )


def get_comment(issue, comment_id, lock=False):

    queryset = IssueComment.objects.filter(
        issue=issue,
        deleted_at__isnull=True,
    )

    if lock:
        queryset = queryset.select_for_update()

    return get_object_or_404(
        queryset,
        id=comment_id,
    )


def serializer_context(request, project, role):

    return {
        "actor_id": request.user.id,

        "role": role,

        "writable": not bool(
            project.get("archived_at")
        ),
    }


class CommentPagination(PageNumberPagination):

    page_size = 30


class IssueComments(APIView):

    permission_classes = [IsAuthenticated]

    parser_classes = [JSONParser]

    def get(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
    ):

        project, role = require_scope(
            request,

            workspace_id,

            project_id,

            include_role=True,
        )

        issue = get_comment_issue(
            workspace_id,
            project_id,
            issue_id,
        )

        comments = IssueComment.objects.filter(
            issue=issue,
            deleted_at__isnull=True,
        ).order_by(
            "-created_at",
            "-id",
        )

        paginator = CommentPagination()

        page = paginator.paginate_queryset(
            comments,
            request,
            view=self,
        )

        context = serializer_context(
            request,
            project,
            role,
        )

        can_comment = (
            role != "viewer"
            and context["writable"]
        )

        members = (
            get_workspace_users(
                request,
                workspace_id,
            )
            if can_comment
            else []
        )

        return Response({
            "count": paginator.page.paginator.count,

            "has_next": (
                paginator.page.has_next()
            ),

            "has_previous": (
                paginator.page.has_previous()
            ),

            "can_comment": can_comment,

            "members": members,

            "results": CommentReadSerializer(
                page,
                many=True,
                context=context,
            ).data,
        })

    def post(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
    ):

        project, role = require_scope(
            request,

            workspace_id,

            project_id,

            write=True,

            include_role=True,
        )

        get_comment_issue(
            workspace_id,
            project_id,
            issue_id,
        )

        serializer = CommentWriteSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        body = serializer.validated_data["body"]

        mentioned_user_ids = resolve_mentions(
            request,
            workspace_id,
            body,
        )

        with transaction.atomic():

            issue = get_comment_issue(
                workspace_id,

                project_id,

                issue_id,

                lock=True,
            )

            comment = create_comment(
                issue=issue,

                author=request.user,

                body=body,

                mentioned_user_ids=mentioned_user_ids,
            )

        return Response(
            CommentReadSerializer(
                comment,

                context=serializer_context(
                    request,
                    project,
                    role,
                ),
            ).data,

            status=status.HTTP_201_CREATED,
        )


class IssueCommentDetail(APIView):

    permission_classes = [IsAuthenticated]

    parser_classes = [JSONParser]

    def patch(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
        comment_id,
    ):

        project, role = require_scope(
            request,

            workspace_id,

            project_id,

            write=True,

            include_role=True,
        )

        issue = get_comment_issue(
            workspace_id,
            project_id,
            issue_id,
        )

        existing = get_comment(
            issue,
            comment_id,
        )

        if existing.author_id != request.user.id:
            raise PermissionDenied(
                "You can only edit your own comments."
            )

        serializer = CommentWriteSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        body = serializer.validated_data["body"]

        mentioned_user_ids = resolve_mentions(
            request,
            workspace_id,
            body,
        )

        with transaction.atomic():

            issue = get_comment_issue(
                workspace_id,
                project_id,
                issue_id,
                lock=True,
            )

            comment = get_comment(
                issue,
                comment_id,
                lock=True,
            )

            if comment.author_id != request.user.id:
                raise PermissionDenied(
                    "You can only edit your own comments."
                )

            comment = update_comment(
                comment=comment,

                actor_id=request.user.id,

                body=body,

                mentioned_user_ids=mentioned_user_ids,
            )

        return Response(
            CommentReadSerializer(
                comment,

                context=serializer_context(
                    request,
                    project,
                    role,
                ),
            ).data,
        )

    def delete(
        self,
        request,
        workspace_id,
        project_id,
        issue_id,
        comment_id,
    ):

        _, role = require_scope(
            request,

            workspace_id,

            project_id,

            write=True,

            include_role=True,
        )

        with transaction.atomic():

            issue = get_comment_issue(
                workspace_id,

                project_id,

                issue_id,

                lock=True,
            )

            comment = get_comment(
                issue,
                comment_id,
                lock=True,
            )

            if (
                comment.author_id != request.user.id
                and role not in ("owner", "admin")
            ):
                raise PermissionDenied(
                    "You cannot delete this comment."
                )

            delete_comment(
                comment,
                request.user.id,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )