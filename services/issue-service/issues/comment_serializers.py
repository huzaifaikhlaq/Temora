from rest_framework import serializers

from .models import IssueComment


class CommentWriteSerializer(serializers.Serializer):

    body = serializers.CharField(
        min_length=1,
        max_length=5000,
        trim_whitespace=True,
    )


class CommentReadSerializer(
    serializers.ModelSerializer
):

    issue_id = serializers.UUIDField(
        read_only=True,
    )

    can_edit = serializers.SerializerMethodField()

    can_delete = serializers.SerializerMethodField()

    class Meta:

        model = IssueComment

        fields = [
            "id",
            "issue_id",
            "author_id",
            "author_name",
            "body",
            "mentioned_user_ids",
            "created_at",
            "updated_at",
            "edited_at",
            "can_edit",
            "can_delete",
        ]

        read_only_fields = fields

    def get_can_edit(self, obj):

        actor_id = self.context["actor_id"]
        role = self.context["role"]
        writable = self.context["writable"]

        return (
            writable
            and role != "viewer"
            and obj.author_id == actor_id
        )

    def get_can_delete(self, obj):

        actor_id = self.context["actor_id"]
        role = self.context["role"]
        writable = self.context["writable"]

        return (
            writable
            and role != "viewer"
            and (
                obj.author_id == actor_id
                or role in ("owner", "admin")
            )
        )