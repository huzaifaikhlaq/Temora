import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone


class Plan(models.Model):

    class Code(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        TEAM = "team", "Team"
        ENTERPRISE = "enterprise", "Enterprise"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    code = models.CharField(
        max_length=20,
        choices=Code.choices,
        unique=True,
    )

    name = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    monthly_price = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Price in minor currency units",
    )

    currency = models.CharField(
        max_length=3,
        default="USD",
    )

    provider_price_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    max_members = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    max_projects = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    max_issues = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)

    sort_order = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class Subscription(models.Model):

    class Status(models.TextChoices):
        FREE = "free", "Free"
        TRIALING = "trialing", "Trialing"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        PAUSED = "paused", "Paused"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    workspace_id = models.UUIDField(unique=True)

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.FREE,
    )

    provider_customer_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    provider_subscription_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    current_period_start = models.DateTimeField(
        null=True,
        blank=True,
    )

    current_period_end = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancel_at_period_end = models.BooleanField(default=False)

    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.workspace_id} - {self.status}"


class CheckoutAttempt(models.Model):

    class Status(models.TextChoices):
        CREATING = "creating", "Creating"
        OPEN = "open", "Open"
        COMPLETED = "completed", "Completed"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.PROTECT,
        related_name="checkout_attempts",
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
    )

    expected_price_id = models.CharField(max_length=100)

    created_by = models.UUIDField()

    provider_transaction_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    provider_subscription_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["subscription"],
                condition=Q(
                    status__in=["creating", "open"]
                ),
                name="one_open_billing_checkout",
            ),
        ]


class Payment(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    provider_transaction_id = models.CharField(
        max_length=100,
        unique=True,
    )

    provider_subscription_id = models.CharField(
        max_length=100,
        blank=True,
    )

    invoice_number = models.CharField(
        max_length=100,
        blank=True,
    )

    amount = models.PositiveBigIntegerField(default=0)

    currency = models.CharField(
        max_length=3,
        default="USD",
    )

    status = models.CharField(max_length=30)

    billed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class WebhookEvent(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    event_id = models.CharField(
        max_length=100,
        unique=True,
    )

    event_type = models.CharField(max_length=100)

    resource_id = models.CharField(max_length=100)

    occurred_at = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    attempts = models.PositiveIntegerField(default=0)

    next_attempt_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_error = models.CharField(
        max_length=200,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)