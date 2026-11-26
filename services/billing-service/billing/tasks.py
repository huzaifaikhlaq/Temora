
import logging

from datetime import timedelta

from celery import shared_task

from django.db import transaction
from django.utils import timezone

from .models import WebhookEvent, Subscription, CheckoutAttempt

from .services import (
    sync_provider_invoice,
    sync_provider_subscription,
    sync_provider_transaction,
)


logger = logging.getLogger(__name__)


@shared_task
def process_webhook_event(event_id):

    with transaction.atomic():

        event = (
            WebhookEvent.objects
            .select_for_update()
            .filter(pk=event_id)
            .first()
        )

        if not event:
            return

        if event.status != WebhookEvent.Status.PENDING:
            return

        if event.next_attempt_at > timezone.now():
            return

        try:
            # Nested transaction rolls back business changes
            # if processing fails.

            with transaction.atomic():

                if event.event_type.startswith("checkout.session."):
                    sync_provider_transaction(
                        event.resource_id,
                    )

                elif event.event_type.startswith("customer.subscription."):
                    sync_provider_subscription(
                        event.resource_id,
                    )

                elif event.event_type.startswith("invoice."):
                    sync_provider_invoice(event.resource_id)

        except Exception as exc:

            event.attempts += 1

            event.last_error = type(exc).__name__

            if event.attempts >= 12:
                event.status = WebhookEvent.Status.FAILED

            else:
                delay = min(
                    30 * (2 ** (event.attempts - 1)),
                    3600,
                )

                event.next_attempt_at = (
                    timezone.now()
                    + timedelta(seconds=delay)
                )

            event.save()

            logger.warning(
                "Billing event %s failed: %s",
                event.event_id,
                event.last_error,
            )

            return

        event.status = WebhookEvent.Status.PROCESSED

        event.processed_at = timezone.now()

        event.last_error = ""

        event.save()


@shared_task
def recover_webhooks():

    ids = list(
        WebhookEvent.objects.filter(
            status=WebhookEvent.Status.PENDING,
            next_attempt_at__lte=timezone.now(),
        )
        .order_by("next_attempt_at")
        .values_list("id", flat=True)[:100]
    )

    for event_id in ids:
        process_webhook_event.delay(event_id)


@shared_task
def reconcile_subscription(provider_id):

    try:
        sync_provider_subscription(provider_id)

    except Exception as exc:
        logger.warning(
            "Subscription reconciliation failed for %s: %s",
            provider_id,
            type(exc).__name__,
        )


@shared_task
def reconcile_checkout(transaction_id):

    try:
        sync_provider_transaction(transaction_id)

    except Exception as exc:
        logger.warning(
            "Checkout reconciliation failed for %s: %s",
            transaction_id,
            type(exc).__name__,
        )


@shared_task
def reconcile_subscriptions():

    subscriptions = (
        Subscription.objects
        .exclude(provider_subscription_id__isnull=True)
        .exclude(status=Subscription.Status.CANCELED)
        .values_list("provider_subscription_id", flat=True)
    )

    for provider_id in subscriptions.iterator():
        reconcile_subscription.delay(provider_id)

    attempts = (
        CheckoutAttempt.objects
        .filter(status=CheckoutAttempt.Status.OPEN)
        .exclude(provider_transaction_id__isnull=True)
        .values_list("provider_transaction_id", flat=True)
    )

    for transaction_id in attempts.iterator():
        reconcile_checkout.delay(transaction_id)
