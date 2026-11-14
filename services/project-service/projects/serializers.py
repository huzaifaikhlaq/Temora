
from rest_framework import serializers

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        fields = [
            "id",
            "workspace_id",
            "key",
            "name",
            "description",
            "category",
            "status",
            "progress",
            "due_date",
            "created_by",
            "archived_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProjectCreateSerializer(serializers.Serializer):

    name = serializers.CharField(
        min_length=2,
        max_length=150,
        trim_whitespace=True,
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    category = serializers.CharField(
        max_length=100,
        required=False,
        default="Product & Engineering",
    )

    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )


class ProjectUpdateSerializer(serializers.Serializer):

    name = serializers.CharField(
        min_length=2,
        max_length=150,
        required=False,
    )

    description = serializers.CharField(
        allow_blank=True,
        required=False,
    )

    category = serializers.CharField(
        max_length=100,
        required=False,
    )

    status = serializers.ChoiceField(
        choices=Project.Status.choices,
        required=False,
    )

    progress = serializers.IntegerField(
        min_value=0,
        max_value=100,
        required=False,
    )

    due_date = serializers.DateField(
        allow_null=True,
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )
        return attrs
