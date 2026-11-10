
from rest_framework import serializers

from .models import Workspace, Membership, Invitation


class WorkspaceCreateSerializer(serializers.Serializer):
    name = serializers.CharField(
        min_length=2,
        max_length=120,
        trim_whitespace=True,
    )


class WorkspaceUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(
        min_length=2,
        max_length=120,
        trim_whitespace=True,
    )


class WorkspaceSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "slug",
            "owner_id",
            "role",
            "created_at",
            "updated_at",
        ]

    def get_role(self, obj):
        roles = self.context.get("roles", {})
        return roles.get(obj.id)


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = [
            "id",
            "workspace",
            "user_id",
            "role",
            "joined_at",
        ]


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            "admin",
            "member",
            "viewer",
        ],
        default="member",
    )

    def validate_email(self, value):
        return value.strip().lower()


class RoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            "admin",
            "member",
            "viewer",
        ],
    )


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = [
            "id",
            "workspace",
            "email",
            "role",
            "status",
            "expires_at",
            "created_at",
            "accepted_at",
        ]


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(
        min_length=20,
        max_length=256,
    )
