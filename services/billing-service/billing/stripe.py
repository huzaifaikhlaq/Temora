import re

import requests

from django.conf import settings
from rest_framework.exceptions import APIException


class StripeUnavailable(APIException):
    status_code = 503
    default_detail = "Payment provider is currently unavailable."


class StripeRejected(APIException):
    status_code = 409
    default_detail = "Payment provider rejected the operation."


def stripe_request(method, path, payload=None):
    if not settings.STRIPE_SECRET_KEY:
        raise StripeUnavailable("Payment provider is not configured.")

    try:
        response = requests.request(
            method=method,
            url=f"{settings.STRIPE_API_URL.rstrip('/')}/{path.lstrip('/')}",
            headers={
                "Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
                "Accept": "application/json",
            },
            data=payload,
            timeout=(5, 20),
            allow_redirects=False,
        )
    except requests.RequestException as exc:
        raise StripeUnavailable() from exc

    if response.status_code >= 500 or response.status_code in (408, 429):
        raise StripeUnavailable()

    if not response.ok:
        raise StripeRejected()

    try:
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError()
        return data
    except (ValueError, TypeError) as exc:
        raise StripeUnavailable() from exc


def validate_id(value, prefix):
    if not isinstance(value, str) or not re.fullmatch(
        rf"{prefix}_[a-zA-Z0-9_]+", value
    ):
        raise ValueError("Invalid Stripe ID")
    return value


def create_checkout(attempt):
    if not settings.STRIPE_CHECKOUT_SUCCESS_URL or not settings.STRIPE_CHECKOUT_CANCEL_URL:
        raise StripeUnavailable("Stripe Checkout URLs are not configured.")

    attempt_id = str(attempt.id)
    workspace_id = str(attempt.subscription.workspace_id)
    return stripe_request(
        "POST",
        "v1/checkout/sessions",
        {
            "mode": "subscription",
            "line_items[0][price]": attempt.expected_price_id,
            "line_items[0][quantity]": 1,
            "success_url": settings.STRIPE_CHECKOUT_SUCCESS_URL,
            "cancel_url": settings.STRIPE_CHECKOUT_CANCEL_URL,
            "client_reference_id": workspace_id,
            "metadata[checkout_attempt_id]": attempt_id,
            "metadata[workspace_id]": workspace_id,
            "subscription_data[metadata][checkout_attempt_id]": attempt_id,
            "subscription_data[metadata][workspace_id]": workspace_id,
        },
    )


def get_transaction(session_id):
    session_id = validate_id(session_id, "cs")
    return stripe_request(
        "GET",
        f"v1/checkout/sessions/{session_id}?expand%5B%5D=line_items.data.price",
    )


def get_subscription(subscription_id):
    subscription_id = validate_id(subscription_id, "sub")
    return stripe_request("GET", f"v1/subscriptions/{subscription_id}")


def get_invoice(invoice_id):
    invoice_id = validate_id(invoice_id, "in")
    return stripe_request("GET", f"v1/invoices/{invoice_id}")


def cancel_subscription(subscription_id):
    subscription_id = validate_id(subscription_id, "sub")
    return stripe_request(
        "POST",
        f"v1/subscriptions/{subscription_id}",
        {"cancel_at_period_end": "true"},
    )


def resume_subscription(subscription_id):
    subscription_id = validate_id(subscription_id, "sub")
    return stripe_request(
        "POST",
        f"v1/subscriptions/{subscription_id}",
        {"cancel_at_period_end": "false"},
    )


def cancel_checkout(session_id):
    session_id = validate_id(session_id, "cs")
    return stripe_request(
        "POST",
        f"v1/checkout/sessions/{session_id}/expire",
    )
