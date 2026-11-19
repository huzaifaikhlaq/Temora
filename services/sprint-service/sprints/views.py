import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Avg
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .issue_client import (
    get_sprint_issues,
    rollover_issues,
)

from .models import (
    Sprint,
    RetrospectiveNote,
    RetrospectiveVote,
    RetrospectiveComment,
    SprintParticipation,
    BurndownSnapshot,
)

from .permissions import (
    require_scope,
    validate_assignee,
)

from .serializers import (
    SprintSerializer,
    SprintWriteSerializer,
    CompleteSprintSerializer,
    RetrospectiveNoteSerializer,
    RetrospectiveNoteWriteSerializer,
    RetrospectiveCommentSerializer,
    CommentWriteSerializer,
    ParticipationWriteSerializer,
    ParticipationSerializer,
    BurndownSerializer,
)

from .services import (
    calculate_metrics,
    create_sprint,
    store_snapshot,
    build_report_markdown,
    build_report_pdf,
    extract_ai_themes,
)


def scoped_sprint(request, sprint_id, write=False, manage=False):
    sprint = get_object_or_404(
        Sprint,
        pk=sprint_id,
    )

    role = require_scope(
        request,
        sprint.workspace_id,
        sprint.project_id,
        write=write,
        manage=manage,
    )

    return sprint, role


def get_note(sprint, note_id):
    return get_object_or_404(
        RetrospectiveNote,
        pk=note_id,
        sprint=sprint,
    )


def serialized_notes(sprint, user_id):
    notes = (
        sprint.notes
        .prefetch_related("votes", "comments")
        .order_by("created_at")
    )

    return RetrospectiveNoteSerializer(
        notes,
        many=True,
        context={"user_id": user_id},
    ).data


class Health(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class SprintCollection(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id, project_id):
        require_scope(request, workspace_id, project_id)

        sprints = Sprint.objects.filter(
            workspace_id=workspace_id,
            project_id=project_id,
        ).order_by("-number")

        return Response(
            SprintSerializer(sprints[:200], many=True).data
        )

    def post(self, request, workspace_id, project_id):
        require_scope(
            request,
            workspace_id,
            project_id,
            manage=True,
        )

        serializer = SprintWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sprint = create_sprint(
            workspace_id,
            project_id,
            request.user.id,
            serializer.validated_data,
        )

        return Response(
            SprintSerializer(sprint).data,
            status=status.HTTP_201_CREATED,
        )


class SprintDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        return Response(
            SprintSerializer(sprint).data
        )

    def patch(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            manage=True,
        )

        serializer = SprintWriteSerializer(
            instance=sprint,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            sprint = (
                Sprint.objects
                .select_for_update()
                .get(pk=sprint_id)
            )

            if sprint.status not in (
                Sprint.Status.PLANNED,
                Sprint.Status.ACTIVE,
            ):
                raise ValidationError(
                    "This sprint can no longer be edited."
                )

            for field, value in serializer.validated_data.items():
                setattr(sprint, field, value)

            sprint.full_clean()
            sprint.save()

        return Response(
            SprintSerializer(sprint).data
        )


class SprintStart(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            manage=True,
        )

        # Fetch before the local database transaction.
        issues = get_sprint_issues(sprint)
        metrics = calculate_metrics(issues)

        with transaction.atomic():
            sprint = (
                Sprint.objects
                .select_for_update()
                .get(pk=sprint_id)
            )

            if sprint.status != Sprint.Status.PLANNED:
                raise ValidationError(
                    "Only planned sprints can be started."
                )

            if Sprint.objects.filter(
                project_id=sprint.project_id,
                status__in=[
                    Sprint.Status.ACTIVE,
                    Sprint.Status.COMPLETING,
                ],
            ).exclude(pk=sprint.pk).exists():
                raise ValidationError(
                    "Another sprint is already running."
                )

            sprint.status = Sprint.Status.ACTIVE
            sprint.started_at = timezone.now()
            sprint.committed_points = metrics["total_points"]
            sprint.committed_issues = metrics["total_issues"]

            sprint.save(
                update_fields=[
                    "status",
                    "started_at",
                    "committed_points",
                    "committed_issues",
                    "updated_at",
                ]
            )

            store_snapshot(sprint, issues=issues)

        return Response(
            SprintSerializer(sprint).data
        )


class SprintMetrics(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        if sprint.status == Sprint.Status.COMPLETED:
            return Response({
                "metrics": sprint.completion_snapshot.get(
                    "metrics", {}
                ),
                "committed_points": sprint.committed_points,
                "committed_issues": sprint.committed_issues,
                "completed_points": sprint.completed_points,
                "carryover_points": sprint.carryover_points,
            })

        issues = get_sprint_issues(sprint)

        return Response({
            "metrics": calculate_metrics(issues),
            "committed_points": sprint.committed_points,
            "committed_issues": sprint.committed_issues,
        })


class SprintCompletion(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        if sprint.status == Sprint.Status.COMPLETED:
            return Response({
                "sprint": SprintSerializer(sprint).data,
                "snapshot": sprint.completion_snapshot,
            })

        if sprint.status == Sprint.Status.COMPLETING:
            return Response({
                "sprint": SprintSerializer(sprint).data,
                "pending": True,
                "plan": sprint.completion_plan,
            })

        issues = get_sprint_issues(sprint)
        metrics = calculate_metrics(issues)

        open_issues = [
            issue for issue in issues
            if issue["status"] != "done"
        ]

        destinations = list(
            Sprint.objects.filter(
                workspace_id=sprint.workspace_id,
                project_id=sprint.project_id,
                status__in=[
                    Sprint.Status.PLANNED,
                    Sprint.Status.ACTIVE,
                ],
            ).exclude(
                pk=sprint.id
            ).values(
                "id", "name", "status",
                "capacity_points", "start_date",
                "end_date",
            )
        )

        return Response({
            "sprint": SprintSerializer(sprint).data,
            "issues": issues,
            "open_issues": open_issues,
            "metrics": metrics,
            "destinations": destinations,
        })

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            manage=True,
        )

        if sprint.status == Sprint.Status.COMPLETED:
            return Response({
                "sprint": SprintSerializer(sprint).data,
                "snapshot": sprint.completion_snapshot,
            })

        if sprint.status == Sprint.Status.ACTIVE:
            serializer = CompleteSprintSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)
            values = serializer.validated_data

            with transaction.atomic():
                sprint = (
                    Sprint.objects
                    .select_for_update()
                    .get(pk=sprint_id)
                )

                if sprint.status == Sprint.Status.ACTIVE:
                    mode = values["mode"]
                    target = None

                    if mode == "next":
                        target = get_object_or_404(
                            Sprint.objects.select_for_update(),
                            pk=values["target_sprint_id"],
                            workspace_id=sprint.workspace_id,
                            project_id=sprint.project_id,
                            status__in=[
                                Sprint.Status.PLANNED,
                                Sprint.Status.ACTIVE,
                            ],
                        )

                        if target.pk == sprint.pk:
                            raise ValidationError(
                                "Cannot roll over to the same sprint."
                            )

                    elif mode == "new":
                        target = create_sprint(
                            sprint.workspace_id,
                            sprint.project_id,
                            request.user.id,
                            {
                                "name": values.get(
                                    "new_name",
                                    f"Sprint {sprint.number + 1}",
                                ),
                                "goal": "",
                                "start_date": values[
                                    "new_start_date"
                                ],
                                "end_date": values[
                                    "new_end_date"
                                ],
                                "capacity_points": values[
                                    "new_capacity_points"
                                ],
                            },
                        )

                    selected = values.get("selected_issue_ids")

                    sprint.status = Sprint.Status.COMPLETING
                    sprint.completion_operation_id = uuid.uuid4()

                    sprint.completion_plan = {
                        "mode": mode,
                        "target_sprint_id": (
                            str(target.id) if target else None
                        ),
                        "selected_issue_ids": (
                            [str(item) for item in selected]
                            if selected is not None
                            else None
                        ),
                    }

                    sprint.save(
                        update_fields=[
                            "status",
                            "completion_operation_id",
                            "completion_plan",
                            "updated_at",
                        ]
                    )

        # Only persisted completion data is used from here.
        # Repeated requests reuse the same operation ID.
        sprint.refresh_from_db()

        if sprint.status == Sprint.Status.COMPLETED:
            return Response({
                "sprint": SprintSerializer(sprint).data,
                "snapshot": sprint.completion_snapshot,
            })

        if sprint.status != Sprint.Status.COMPLETING:
            raise ValidationError(
                "Sprint must be active before completion."
            )

        # Cross-service call is outside the local transaction.
        # The Issue service owns an idempotent atomic rollover.
        result = rollover_issues(sprint)
        metrics = result["metrics"]

        with transaction.atomic():
            sprint = (
                Sprint.objects
                .select_for_update()
                .get(pk=sprint_id)
            )

            if sprint.status != Sprint.Status.COMPLETED:
                sprint.status = Sprint.Status.COMPLETED
                sprint.completed_at = timezone.now()

                sprint.completed_points = metrics[
                    "completed_points"
                ]
                sprint.completed_issues = metrics[
                    "completed_issues"
                ]

                sprint.carryover_points = metrics[
                    "remaining_points"
                ]
                sprint.carryover_issues = metrics[
                    "open_issues"
                ]

                sprint.completion_snapshot = result

                sprint.save(
                    update_fields=[
                        "status",
                        "completed_at",
                        "completed_points",
                        "completed_issues",
                        "carryover_points",
                        "carryover_issues",
                        "completion_snapshot",
                        "updated_at",
                    ]
                )

                store_snapshot(
                    sprint,
                    issues=result["issues"],
                )

        return Response({
            "sprint": SprintSerializer(sprint).data,
            "snapshot": sprint.completion_snapshot,
        })


class SprintRetrospective(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        participation = SprintParticipation.objects.filter(
            sprint=sprint
        )

        attended = participation.filter(attended=True)

        sentiment = attended.filter(
            sentiment__isnull=False
        ).aggregate(
            average=Avg("sentiment")
        )["average"]

        return Response({
            "sprint": SprintSerializer(sprint).data,
            "notes": serialized_notes(
                sprint,
                request.user.id,
            ),
            "attendance": ParticipationSerializer(
                participation,
                many=True,
            ).data,
            "attendance_count": attended.count(),
            "average_sentiment": (
                round(sentiment, 1)
                if sentiment is not None
                else None
            ),
            "ai_themes": sprint.ai_themes,
            "action_items": sprint.notes.filter(
                category=RetrospectiveNote.Category.ACTION
            ).count(),
        })


class NoteCollection(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        serializer = RetrospectiveNoteWriteSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        values = serializer.validated_data

        validate_assignee(
            request,
            sprint.workspace_id,
            values.get("assignee_id"),
        )

        note = RetrospectiveNote.objects.create(
            sprint=sprint,
            author_id=request.user.id,
            **values,
        )

        return Response(
            RetrospectiveNoteSerializer(
                note,
                context={"user_id": request.user.id},
            ).data,
            status=201,
        )


class NoteDetail(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, sprint_id, note_id):
        sprint, role = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        note = get_note(sprint, note_id)

        if (
            note.author_id != request.user.id
            and role not in ("owner", "admin")
        ):
            raise PermissionDenied(
                "You cannot edit this feedback."
            )

        serializer = RetrospectiveNoteWriteSerializer(
            instance=note,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        values = serializer.validated_data

        validate_assignee(
            request,
            sprint.workspace_id,
            values.get("assignee_id"),
        )

        for field, value in values.items():
            setattr(note, field, value)

        note.save()

        return Response(
            RetrospectiveNoteSerializer(
                note,
                context={"user_id": request.user.id},
            ).data
        )

    def delete(self, request, sprint_id, note_id):
        sprint, role = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        note = get_note(sprint, note_id)

        if (
            note.author_id != request.user.id
            and role not in ("owner", "admin")
        ):
            raise PermissionDenied(
                "You cannot delete this feedback."
            )

        note.delete()

        return Response(status=204)


class NoteVote(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, note_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        note = get_note(sprint, note_id)

        RetrospectiveVote.objects.get_or_create(
            note=note,
            user_id=request.user.id,
        )

        return Response({"voted": True})

    def delete(self, request, sprint_id, note_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        note = get_note(sprint, note_id)

        RetrospectiveVote.objects.filter(
            note=note,
            user_id=request.user.id,
        ).delete()

        return Response({"voted": False})


class NoteComments(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, note_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        note = get_note(sprint, note_id)

        serializer = CommentWriteSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        comment = RetrospectiveComment.objects.create(
            note=note,
            author_id=request.user.id,
            **serializer.validated_data,
        )

        return Response(
            RetrospectiveCommentSerializer(comment).data,
            status=201,
        )


class SprintCheckIn(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            write=True,
        )

        serializer = ParticipationWriteSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        participant, _ = (
            SprintParticipation.objects.update_or_create(
                sprint=sprint,
                user_id=request.user.id,
                defaults=serializer.validated_data,
            )
        )

        return Response(
            ParticipationSerializer(participant).data
        )


class SprintBurndown(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        snapshots = sprint.burndown.order_by("date")

        return Response({
            "sprint": SprintSerializer(sprint).data,
            "snapshots": BurndownSerializer(
                snapshots,
                many=True,
            ).data,
        })

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            manage=True,
        )

        if sprint.status != Sprint.Status.ACTIVE:
            raise ValidationError(
                "Only active sprints can record live burndown."
            )

        snapshot = store_snapshot(sprint)

        return Response(
            BurndownSerializer(snapshot).data
        )


class SprintThemes(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id):
        sprint, _ = scoped_sprint(
            request,
            sprint_id,
            manage=True,
        )

        themes = extract_ai_themes(sprint)

        return Response({"themes": themes})


class SprintReport(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint, _ = scoped_sprint(request, sprint_id)

        report_format = request.query_params.get(
            "format",
            "md",
        )

        safe_name = f"sprint-{sprint.number}-retrospective"

        if report_format == "md":
            response = HttpResponse(
                build_report_markdown(sprint),
                content_type="text/markdown; charset=utf-8",
            )

            response["Content-Disposition"] = (
                f'attachment; filename="{safe_name}.md"'
            )

        elif report_format == "pdf":
            response = HttpResponse(
                build_report_pdf(sprint),
                content_type="application/pdf",
            )

            response["Content-Disposition"] = (
                f'attachment; filename="{safe_name}.pdf"'
            )

        else:
            raise ValidationError({
                "format": "Use md or pdf."
            })

        response["Cache-Control"] = "private, no-store"

        return response