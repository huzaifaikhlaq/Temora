import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)

from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):

    def create_user(
        self,
        email,
        password=None,
        **extra
    ):
        if not email:
            raise ValueError("Email is required")

        if not password:
            raise ValueError("Password is required")

        email = self.normalize_email(email).strip().lower()

        user = self.model(
            email=email,
            **extra
        )

        user.set_password(password)

        user.save(using=self._db)

        return user

    def create_superuser(
        self,
        email,
        password=None,
        **extra
    ):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_active", True)
        extra.setdefault("email_verified", True)

        if (
            extra.get("is_staff") is not True
            or extra.get("is_superuser") is not True
        ):
            raise ValueError(
                "Superuser requires staff and superuser flags"
            )

        return self.create_user(
            email,
            password,
            **extra
        )


class User(AbstractBaseUser, PermissionsMixin):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    email = models.EmailField(
        unique=True
    )

    full_name = models.CharField(
        max_length=150
    )

    is_active = models.BooleanField(
        default=True
    )

    is_staff = models.BooleanField(
        default=False
    )

    email_verified = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    objects = UserManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email


class Session(models.Model):

    token_hash = models.CharField(
        max_length=64,
        unique=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sessions"
    )

    expires_at = models.DateTimeField()

    revoked_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def valid(self):
        return (
            self.revoked_at is None
            and self.expires_at > timezone.now()
            and self.user.is_active
        )


class OneTimeToken(models.Model):

    PURPOSES = [
        ("verify", "Email verification"),
        ("reset", "Password reset"),
    ]

    token_hash = models.CharField(
        max_length=64,
        unique=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="one_time_tokens"
    )

    purpose = models.CharField(
        max_length=10,
        choices=PURPOSES
    )

    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(
        null=True,
        blank=True
    )