from django.contrib.auth import password_validation

from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.Serializer):

    email = serializers.EmailField(
        max_length=254
    )

    full_name = serializers.CharField(
        min_length=2,
        max_length=150,
        trim_whitespace=True
    )

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"}
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value


class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()

    password = serializers.CharField(
        trim_whitespace=False
    )

    def validate_email(self, value):
        return value.strip().lower()


class EmailSerializer(serializers.Serializer):

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class TokenSerializer(serializers.Serializer):

    token = serializers.CharField(
        min_length=20,
        max_length=512,
        trim_whitespace=False
    )


class ResetSerializer(TokenSerializer):

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User

        fields = (
            "id",
            "email",
            "full_name",
            "email_verified",
            "is_active",
        )

        read_only_fields = fields