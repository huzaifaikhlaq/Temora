from rest_framework import serializers

from .models import (
    Plan,
    Subscription,
    Payment,
    CheckoutAttempt,
)

from .entitlements import effective_plan


class PlanSerializer(serializers.ModelSerializer):

    checkout_available = serializers.SerializerMethodField()

    def get_checkout_available(self, obj):

        return bool(
            obj.is_active
            and obj.provider_price_id
            and obj.code in ["pro", "team"]
        )

    class Meta:
        model = Plan

        fields = [
            "id",
            "code",
            "name",
            "description",
            "monthly_price",
            "currency",
            "max_members",
            "max_projects",
            "max_issues",
            "checkout_available",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):

    plan = PlanSerializer(read_only=True)

    effective_plan = serializers.SerializerMethodField()

    can_manage = serializers.SerializerMethodField()

    pending_checkout = serializers.SerializerMethodField()

    has_paid_subscription = serializers.SerializerMethodField()

    def get_effective_plan(self, obj):

        return PlanSerializer(
            effective_plan(obj)
        ).data

    def get_can_manage(self, obj):

        return self.context.get("role") == "owner"

    def get_has_paid_subscription(self, obj):

        return bool(
            obj.provider_subscription_id
            and obj.status != Subscription.Status.CANCELED
        )

    def get_pending_checkout(self, obj):

        if self.context.get("role") != "owner":
            return None

        attempt = obj.checkout_attempts.filter(
            status__in=[
                CheckoutAttempt.Status.CREATING,
                CheckoutAttempt.Status.OPEN,
            ]
        ).first()

        if not attempt:
            return None

        return {
            "plan": attempt.plan.code,
            "status": attempt.status,
        }

    class Meta:
        model = Subscription

        fields = [
            "id",
            "workspace_id",
            "plan",
            "effective_plan",
            "status",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "can_manage",
            "has_paid_subscription",
            "pending_checkout",
            "created_at",
            "updated_at",
        ]


class CheckoutSerializer(serializers.Serializer):

    plan = serializers.ChoiceField(
        choices=[
            Plan.Code.PRO,
            Plan.Code.TEAM,
        ]
    )


class PaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment

        fields = [
            "id",
            "invoice_number",
            "amount",
            "currency",
            "status",
            "billed_at",
            "created_at",
        ]