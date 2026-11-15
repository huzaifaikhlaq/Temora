
from rest_framework import serializers
from .models import Issue, IssueAttachment


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueAttachment
        fields = (
            "id", "original_name", "mime_type",
            "size", "uploaded_by", "created_at",
        )
        read_only_fields = fields


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = (
            "id", "key", "title", "status",
            "assignee_id", "story_points",
        )
        read_only_fields = fields


class IssueReadSerializer(serializers.ModelSerializer):
    epic_id = serializers.UUIDField(read_only=True, allow_null=True)
    parent_id = serializers.UUIDField(read_only=True, allow_null=True)
    subtasks = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    subtasks_completed = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = (
            "id", "workspace_id", "project_id", "number",
            "key", "issue_type", "title", "description",
            "status", "priority", "assignee_id",
            "reporter_id", "sprint_id", "story_points",
            "epic_id", "parent_id", "components", "tags",
            "due_date", "is_draft", "archived_at",
            "created_at", "updated_at", "subtasks",
            "subtasks_completed", "attachments",
        )
        read_only_fields = fields

    def get_subtasks(self, obj):
        if obj.parent_id is not None:
            return []
        return SubtaskSerializer(
            obj.subtasks.filter(archived_at__isnull=True),
            many=True,
        ).data

    def get_subtasks_completed(self, obj):
        if obj.parent_id is not None:
            return 0
        return obj.subtasks.filter(
            archived_at__isnull=True,
            status=Issue.Status.DONE,
        ).count()


class SubtaskInputSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=3, max_length=120)
    status = serializers.ChoiceField(
        choices=Issue.Status.choices,
        required=False,
        default=Issue.Status.TODO,
    )


class IssueWriteSerializer(serializers.Serializer):
    issue_type = serializers.ChoiceField(
        choices=Issue.Type.choices,
        required=False,
        default=Issue.Type.TASK,
    )
    title = serializers.CharField(
        max_length=120,
        allow_blank=True,
        required=False,
        default="",
    )
    description = serializers.CharField(
        allow_blank=True,
        required=False,
        default="",
        max_length=50000,
    )
    status = serializers.ChoiceField(
        choices=Issue.Status.choices,
        required=False,
        default=Issue.Status.TODO,
    )
    priority = serializers.ChoiceField(
        choices=Issue.Priority.choices,
        required=False,
        default=Issue.Priority.MEDIUM,
    )

    assignee_id = serializers.UUIDField(
        allow_null=True,
        required=False,
    )
    sprint_id = serializers.UUIDField(
        allow_null=True,
        required=False,
    )
    story_points = serializers.ChoiceField(
        choices=[1, 2, 3, 5, 8, 13],
        required=False,
        allow_null=True,
    )
    epic_id = serializers.UUIDField(
        allow_null=True,
        required=False,
    )
    parent_id = serializers.UUIDField(
        allow_null=True,
        required=False,
    )

    components = serializers.ListField(
        child=serializers.CharField(max_length=40),
        required=False,
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=40),
        required=False,
    )
    due_date = serializers.DateField(
        allow_null=True,
        required=False,
    )
    is_draft = serializers.BooleanField(
        required=False,
        default=False,
    )
    subtasks = SubtaskInputSerializer(
        many=True,
        required=False,
    )

    def validate(self, values):
        current = self.instance

        draft = values.get(
            "is_draft",
            current.is_draft if current else False,
        )
        title = values.get(
            "title",
            current.title if current else "",
        )

        if not draft and not title.strip():
            raise serializers.ValidationError({
                "title": "A published issue needs a summary"
            })

        if current and not current.is_draft and draft:
            raise serializers.ValidationError({
                "is_draft": "Published issues cannot become drafts"
            })

        for field in ("components", "tags"):
            items = values.get(field)
            if items is not None:
                items = list(dict.fromkeys(
                    x.strip() for x in items if x.strip()
                ))
                if len(items) > 20:
                    raise serializers.ValidationError({
                        field: "Maximum 20 values"
                    })
                values[field] = items

        if len(values.get("subtasks", [])) > 30:
            raise serializers.ValidationError({
                "subtasks": "Maximum 30 subtasks per request"
            })

        if values.get(
            "issue_type",
            current.issue_type if current else Issue.Type.TASK,
        ) == Issue.Type.EPIC:
            if values.get(
                "epic_id",
                current.epic_id if current else None,
            ):
                raise serializers.ValidationError({
                    "epic_id": "An epic cannot belong to another epic"
                })

        return values
