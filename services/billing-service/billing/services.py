from datetime import datetime, timezone as datetime_timezone

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import APIException, ValidationError

from .models import Plan, Subscription, CheckoutAttempt, Payment
from .entitlements import get_subscription
from . import stripe


class BillingConflict(APIException):
    status_code = 409
    default_detail = "A billing operation is already in progress."


OPEN_CHECKOUT_STATES = [
    CheckoutAttempt.Status.CREATING,
    CheckoutAttempt.Status.OPEN,
]


def start_checkout(workspace_id, user_id, plan_code):

    plan = Plan.objects.filter(
        code=plan_code,
        is_active=True,
    ).first()

    if (
        not plan
        or plan.code not in ["pro", "team"]
        or not plan.provider_price_id
    ):
        raise ValidationError(
            {"plan": "This plan is not available for checkout."}
        )

    subscription = get_subscription(workspace_id)

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=subscription.pk)
        )

        if (
            subscription.provider_subscription_id
            and subscription.status
                != Subscription.Status.CANCELED
        ):
            raise BillingConflict(
                "This workspace already has a paid subscription."
            )

        existing = CheckoutAttempt.objects.filter(
            subscription=subscription,
            status__in=OPEN_CHECKOUT_STATES,
        ).first()

        if existing:

            if (
                existing.plan_id == plan.id
                and existing.provider_transaction_id
                and existing.status == CheckoutAttempt.Status.OPEN
            ):
                return existing

            raise BillingConflict(
                "Resolve or cancel the existing checkout first."
            )

        attempt = CheckoutAttempt.objects.create(
            subscription=subscription,
            plan=plan,
            expected_price_id=plan.provider_price_id,
            created_by=user_id,
        )

    # The reservation is committed before contacting Stripe.
    # Do not blindly retry this POST on a timeout.

    result = stripe.create_checkout(attempt)

    transaction_id = stripe.validate_id(
        result["id"],
        "cs",
    )

    CheckoutAttempt.objects.filter(
        pk=attempt.pk,
        status=CheckoutAttempt.Status.CREATING,
    ).update(
        provider_transaction_id=transaction_id,
        status=CheckoutAttempt.Status.OPEN,
    )

    attempt.refresh_from_db()

    return attempt


def apply_provider_subscription(subscription, data):

    provider_id = stripe.validate_id(
        data["id"],
        "sub",
    )

    if subscription.provider_subscription_id != provider_id:
        raise ValueError("Subscription ID mismatch")

    items = (data.get("items") or {}).get("data", [])

    if len(items) != 1 or items[0].get("quantity") != 1:
        raise ValueError("Unsupported subscription items")

    price_id = items[0]["price"]["id"]

    plan = Plan.objects.get(
        provider_price_id=price_id,
    )

    provider_status = data["status"]

    if provider_status == "unpaid":
        provider_status = Subscription.Status.PAST_DUE

    if provider_status not in Subscription.Status.values:
        raise ValueError("Unsupported subscription status")

    if provider_status == Subscription.Status.FREE:
        raise ValueError("Invalid provider subscription status")

    period_start = data.get("current_period_start")
    period_end = data.get("current_period_end")

    subscription.plan = plan

    subscription.status = provider_status

    customer = data.get("customer")
    subscription.provider_customer_id = (
        customer.get("id") if isinstance(customer, dict) else customer
    )

    subscription.current_period_start = (
        datetime.fromtimestamp(period_start, tz=datetime_timezone.utc)
        if period_start else None
    )

    subscription.current_period_end = (
        datetime.fromtimestamp(period_end, tz=datetime_timezone.utc)
        if period_end else None
    )

    subscription.cancel_at_period_end = bool(
        data.get("cancel_at_period_end")
    )

    canceled_at = data.get("canceled_at")

    subscription.canceled_at = (
        datetime.fromtimestamp(canceled_at, tz=datetime_timezone.utc)
        if canceled_at
        else None
    )

    subscription.save()

    return subscription


def sync_provider_subscription(provider_id):

    row = Subscription.objects.filter(
        provider_subscription_id=provider_id,
    ).first()

    if row is None:
        # Initial activation is handled by transaction completion.
        return

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=row.pk)
        )

        if subscription.provider_subscription_id != provider_id:
            return

        # Read authoritative current state instead of applying
        # a potentially outdated webhook snapshot.

        data = stripe.get_subscription(provider_id)

        apply_provider_subscription(subscription, data)


def sync_provider_transaction(transaction_id):

    data = stripe.get_transaction(transaction_id)

    if data["id"] != transaction_id:
        raise ValueError("Transaction ID mismatch")

    attempt = CheckoutAttempt.objects.filter(
        provider_transaction_id=transaction_id,
    ).first()

    provider_subscription_id = data.get("subscription")
    if isinstance(provider_subscription_id, dict):
        provider_subscription_id = provider_subscription_id.get("id")

    if attempt is not None:
        local_subscription_id = attempt.subscription_id

    else:
        previous_checkout = CheckoutAttempt.objects.filter(
            provider_subscription_id=provider_subscription_id,
            status=CheckoutAttempt.Status.COMPLETED,
        ).first() if provider_subscription_id else None

        if previous_checkout is None:
            raise BillingConflict(
                "Transaction is not linked to a known subscription."
            )

        local_subscription_id = previous_checkout.subscription_id

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=local_subscription_id)
        )

        # Refetch while holding the workspace billing lock.
        data = stripe.get_transaction(transaction_id)

        if data["id"] != transaction_id:
            raise ValueError("Transaction ID mismatch")

        state = data["status"]

        provider_subscription_id = data.get("subscription")
        if isinstance(provider_subscription_id, dict):
            provider_subscription_id = provider_subscription_id.get("id")

        if attempt is not None:

            attempt.refresh_from_db()

            if (
                state == "expired"
                and attempt.status == CheckoutAttempt.Status.OPEN
            ):
                attempt.status = CheckoutAttempt.Status.CANCELED
                attempt.save(update_fields=["status", "updated_at"])

            if (
                state == "complete"
                and data.get("payment_status") in ("paid", "no_payment_required")
                and attempt.status != CheckoutAttempt.Status.COMPLETED
            ):
                if attempt.status != CheckoutAttempt.Status.OPEN:
                    raise BillingConflict("Unexpected checkout state.")

                items = (data.get("line_items") or {}).get("data", [])

                if (
                    len(items) != 1
                    or items[0]["price"]["id"]
                        != attempt.expected_price_id
                    or items[0]["quantity"] != 1
                ):
                    raise ValueError("Checkout price mismatch")

                if (
                    subscription.provider_subscription_id
                    and subscription.status
                        != Subscription.Status.CANCELED
                    and subscription.provider_subscription_id
                        != provider_subscription_id
                ):
                    raise BillingConflict(
                        "A different paid subscription already exists."
                    )

                provider_subscription_id = stripe.validate_id(
                    provider_subscription_id,
                    "sub",
                )

                subscription.provider_subscription_id = (
                    provider_subscription_id
                )

                subscription_data = stripe.get_subscription(
                    provider_subscription_id,
                )

                apply_provider_subscription(
                    subscription,
                    subscription_data,
                )

                attempt.provider_subscription_id = (
                    provider_subscription_id
                )

                attempt.status = CheckoutAttempt.Status.COMPLETED

                attempt.save()

        # Renewals and late events also refresh current state,
        # but cannot replace a newer subscription.

        if (
            provider_subscription_id
            and subscription.provider_subscription_id
                == provider_subscription_id
        ):
            current_data = stripe.get_subscription(
                provider_subscription_id,
            )

            apply_provider_subscription(
                subscription,
                current_data,
            )



def sync_provider_invoice(invoice_id):

    data = stripe.get_invoice(invoice_id)
    if data.get("id") != invoice_id:
        raise ValueError("Invoice ID mismatch")

    provider_subscription_id = data.get("subscription")
    if isinstance(provider_subscription_id, dict):
        provider_subscription_id = provider_subscription_id.get("id")
    if not provider_subscription_id:
        parent = data.get("parent") or {}
        details = parent.get("subscription_details") or {}
        provider_subscription_id = details.get("subscription")

    if not provider_subscription_id:
        return

    row = Subscription.objects.filter(
        provider_subscription_id=provider_subscription_id,
    ).first()
    if row is None:
        return

    with transaction.atomic():
        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=row.pk)
        )
        if subscription.provider_subscription_id != provider_subscription_id:
            return

        paid_at = data.get("status_transitions", {}).get("paid_at")
        Payment.objects.update_or_create(
            provider_transaction_id=invoice_id,
            defaults={
                "subscription": subscription,
                "provider_subscription_id": provider_subscription_id,
                "invoice_number": data.get("number") or "",
                "amount": int(data.get("amount_paid") or 0),
                "currency": (data.get("currency") or "USD").upper(),
                "status": data.get("status") or "open",
                "billed_at": (
                    datetime.fromtimestamp(paid_at, tz=datetime_timezone.utc)
                    if paid_at else None
                ),
            },
        )


def schedule_cancellation(workspace_id):

    row = get_subscription(workspace_id)

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=row.pk)
        )

        if not subscription.provider_subscription_id:
            raise ValidationError("No paid subscription exists.")

        current = stripe.get_subscription(
            subscription.provider_subscription_id,
        )

        apply_provider_subscription(subscription, current)

        if subscription.status != Subscription.Status.ACTIVE:
            raise ValidationError(
                "Only an active subscription can be canceled here."
            )

        if subscription.cancel_at_period_end:
            return subscription

        data = stripe.cancel_subscription(
            subscription.provider_subscription_id,
        )

        return apply_provider_subscription(subscription, data)


def remove_scheduled_cancellation(workspace_id):

    row = get_subscription(workspace_id)

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=row.pk)
        )

        if not subscription.provider_subscription_id:
            raise ValidationError("No paid subscription exists.")

        current = stripe.get_subscription(
            subscription.provider_subscription_id,
        )

        apply_provider_subscription(subscription, current)

        if subscription.status != Subscription.Status.ACTIVE:
            raise ValidationError("Subscription is not active.")

        if not subscription.cancel_at_period_end:
            return subscription

        data = stripe.resume_subscription(
            subscription.provider_subscription_id,
        )

        return apply_provider_subscription(subscription, data)


def abandon_checkout(workspace_id):

    row = get_subscription(workspace_id)

    with transaction.atomic():

        subscription = (
            Subscription.objects
            .select_for_update()
            .get(pk=row.pk)
        )

        attempt = CheckoutAttempt.objects.filter(
            subscription=subscription,
            status__in=OPEN_CHECKOUT_STATES,
        ).first()

        if not attempt:
            return

        if not attempt.provider_transaction_id:
            raise BillingConflict(
                "Checkout creation is unresolved. "
                "Verify the Checkout Session in Stripe before clearing it."
            )

        data = stripe.get_transaction(
            attempt.provider_transaction_id,
        )

        if data.get("payment_status") == "paid" or data["status"] == "complete":
            raise BillingConflict(
                "Payment is being processed or already completed."
            )

        if data["status"] != "expired":
            data = stripe.cancel_checkout(
                attempt.provider_transaction_id,
            )

        if data["status"] != "expired":
            raise BillingConflict(
                "Checkout cancellation was not confirmed."
            )

        attempt.status = CheckoutAttempt.Status.CANCELED

        attempt.save(update_fields=["status", "updated_at"])
