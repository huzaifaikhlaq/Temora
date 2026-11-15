from rest_framework import serializers
from .models import Issue

class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ["id", "workspace_id", "project_id", "key", "title", "description", "status", "priority", "assignee_id", "reporter_id", "due_date", "story_points", "sprint_id", "labels", "created_at", "updated_at"]
        read_only_fields = fields

class IssueCreateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    title = serializers.CharField(min_length=3, max_length=255, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=Issue.Status.choices, required=False, default=Issue.Status.BACKLOG)
    priority = serializers.ChoiceField(choices=Issue.Priority.choices, required=False, default=Issue.Priority.MEDIUM)
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    story_points = serializers.IntegerField(required=False, min_value=0, max_value=100, default=0)
    sprint_id = serializers.UUIDField(required=False, allow_null=True)
    labels = serializers.ListField(child=serializers.CharField(max_length=40, trim_whitespace=True), required=False, default=list, max_length=20)

class IssueUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=3, max_length=255, required=False, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Issue.Status.choices, required=False)
    priority = serializers.ChoiceField(choices=Issue.Priority.choices, required=False)
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    story_points = serializers.IntegerField(required=False, min_value=0, max_value=100)
    sprint_id = serializers.UUIDField(required=False, allow_null=True)
    labels = serializers.ListField(child=serializers.CharField(max_length=40, trim_whitespace=True), required=False, max_length=20)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs
