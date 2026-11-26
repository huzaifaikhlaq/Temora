import hashlib
import hmac
import json
import time
from datetime import datetime, timezone

from django.conf import settings

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WebhookEvent


SUPPORTED_EVENTS = {
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "customer.subscription.trial_will_end",
    "invoice.paid",
    "invoice.payment_failed",
}


def verify_signature(raw_body, signature):
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret or not signature or len(signature) > 4096:
        return False

    try:
        fields = {}
        for part in signature.split(","):
            key, value = part.split("=", 1)
            fields.setdefault(key, []).append(value)

        timestamps = fields["t"]
        if len(timestamps) != 1:
            return False
        timestamp = int(timestamps[0])
        if abs(time.time() - timestamp) > 300:
            return False

        signed_payload = timestamps[0].encode("ascii") + b"." + raw_body
        expected = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()
        return any(
            hmac.compare_digest(expected, supplied)
            for supplied in fields.get("v1", [])
        )
    except (KeyError, ValueError, TypeError):
        return False


class StripeWebhook(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        raw_body = request.body
        if len(raw_body) > 1024 * 1024:
            return Response({"detail": "Request too large."}, status=413)

        signature = request.headers.get("Stripe-Signature", "")
        if not verify_signature(raw_body, signature):
            return Response(
                {"detail": "Invalid webhook signature."},
                status=401,
            )

        try:
            payload = json.loads(raw_body)
            event_id = payload["id"]
            event_type = payload["type"]
            resource_id = payload["data"]["object"]["id"]
            created = payload["created"]
            occurred_at = datetime.fromtimestamp(created, tz=timezone.utc)

            if not all(
                isinstance(value, str) and 0 < len(value) <= 100
                for value in (event_id, event_type, resource_id)
            ):
                raise ValueError()
        except (ValueError, TypeError, KeyError, OverflowError, OSError):
            return Response(
                {"detail": "Invalid webhook payload."},
                status=400,
            )

        if event_type not in SUPPORTED_EVENTS:
            return Response({"received": True})

        WebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={
                "event_type": event_type,
                "resource_id": resource_id,
                "occurred_at": occurred_at,
            },
        )

        # Acknowledge only after the event is saved. Celery Beat dispatches it.
        return Response({"received": True}, status=200)
