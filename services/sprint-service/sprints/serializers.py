from rest_framework import serializers

from .models import (
    Sprint,
    RetrospectiveNote,
    RetrospectiveComment,
    SprintParticipation,
    BurndownSnapshot,
)


class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = (
            "id",
            "workspace_id",
            "project_id",
            "number",
            "name",
            "goal",
            "start_date",
            "end_date",
            "capacity_points",
            "status",
            "retrospective_phase",
            "created_by",
            "started_at",
            "completed_at",
            "committed_points",
            "committed_issues",
            "completed_points",
            "completed_issues",
            "carryover_points",
            "carryover_issues",
            "completion_snapshot",
            "ai_themes",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class SprintWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    goal = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
    )
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    capacity_points = serializers.IntegerField(
        min_value=1,
        max_value=100000,
        default=40,
    )

    def validate(self, values):
        current = self.instance

        start = values.get(
            "start_date",
            current.start_date if current else None,
        )
        end = values.get(
            "end_date",
            current.end_date if current else None,
        )

        if start and end and end < start:
            raise serializers.ValidationError({
                "end_date": "End date must follow start date."
            })

        return values


class CompleteSprintSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=["next", "backlog", "new"],
    )

    target_sprint_id = serializers.UUIDField(
        required=False,
    )

    selected_issue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        max_length=5000,
    )

    new_name = serializers.CharField(
        required=False,
        max_length=120,
    )

    new_start_date = serializers.DateField(
        required=False,
    )

    new_end_date = serializers.DateField(
        required=False,
    )

    new_capacity_points = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100000,
        default=40,
    )

    def validate(self, values):
        mode = values["mode"]

        if mode == "next" and not values.get(
            "target_sprint_id"
        ):
            raise serializers.ValidationError({
                "target_sprint_id": "Select a destination sprint."
            })

        if mode == "new":
            start = values.get("new_start_date")
            end = values.get("new_end_date")

            if not start or not end:
                raise serializers.ValidationError(
                    "New sprint dates are required."
                )

            if end < start:
                raise serializers.ValidationError({
                    "new_end_date": "Invalid date range."
                })

        selected = values.get("selected_issue_ids")

        if selected is not None:
            if len(selected) != len(set(selected)):
                raise serializers.ValidationError({
                    "selected_issue_ids": "Duplicate issue IDs."
                })

        return values


class RetrospectiveCommentSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = RetrospectiveComment
        fields = (
            "id",
            "author_id",
            "body",
            "created_at",
        )
        read_only_fields = fields


class RetrospectiveNoteSerializer(
    serializers.ModelSerializer
):
    vote_count = serializers.SerializerMethodField()
    voted = serializers.SerializerMethodField()

    comments = RetrospectiveCommentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = RetrospectiveNote
        fields = (
            "id",
            "category",
            "body",
            "author_id",
            "assignee_id",
            "due_date",
            "action_status",
            "created_at",
            "updated_at",
            "vote_count",
            "voted",
            "comments",
        )
        read_only_fields = fields

    def get_vote_count(self, obj):
        return len(obj.votes.all())

    def get_voted(self, obj):
        user_id = self.context.get("user_id")

        return any(
            vote.user_id == user_id
            for vote in obj.votes.all()
        )


class RetrospectiveNoteWriteSerializer(
    serializers.Serializer
):
    category = serializers.ChoiceField(
        choices=RetrospectiveNote.Category.choices,
    )

    body = serializers.CharField(
        min_length=3,
        max_length=2000,
    )

    assignee_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    action_status = serializers.ChoiceField(
        choices=RetrospectiveNote.ActionStatus.choices,
        required=False,
    )

    def validate(self, values):
        category = values.get(
            "category",
            self.instance.category if self.instance else None,
        )

        if (
            category != RetrospectiveNote.Category.ACTION
            and any(
                key in values
                for key in (
                    "assignee_id",
                    "due_date",
                    "action_status",
                )
            )
        ):
            raise serializers.ValidationError(
                "Action fields require the action category."
            )

        return values


class CommentWriteSerializer(serializers.Serializer):
    body = serializers.CharField(
        min_length=1,
        max_length=1000,
    )


class ParticipationWriteSerializer(serializers.Serializer):
    attended = serializers.BooleanField(default=True)
    sentiment = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=5,
    )


class ParticipationSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = SprintParticipation
        fields = (
            "user_id",
            "attended",
            "sentiment",
            "updated_at",
        )
        read_only_fields = fields


class BurndownSerializer(serializers.ModelSerializer):
    class Meta:
        model = BurndownSnapshot
        fields = (
            "date",
            "total_points",
            "completed_points",
            "remaining_points",
            "total_issues",
            "completed_issues",
        )
        read_only_fields = fields
