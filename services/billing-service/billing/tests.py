import hashlib
import hmac
import json
import time
import uuid

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from rest_framework.test import APIClient

from .models import (
    Plan,
    Subscription,
    CheckoutAttempt,
    Payment,
    WebhookEvent,
)

from .entitlements import (
    get_subscription,
    get_entitlements,
)

from .services import (
    start_checkout,
    sync_provider_transaction,
)


class BillingTests(TestCase):

    def setUp(self):

        self.workspace_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        self.free = Plan.objects.create(
            code="free",
            name="Free",
            monthly_price=0,
            max_members=5,
            max_projects=3,
            max_issues=500,
        )

        self.pro = Plan.objects.create(
            code="pro",
            name="Pro",
            monthly_price=900,
            provider_price_id="pri_testpro",
            max_members=15,
            max_projects=20,
        )

        self.client = APIClient()

    def test_workspace_receives_free_plan(self):

        subscription = get_subscription(
            self.workspace_id,
        )

        self.assertEqual(
            subscription.plan.code,
            "free",
        )

        self.assertEqual(
            subscription.status,
            Subscription.Status.FREE,
        )

    def test_free_subscription_is_idempotent(self):

        first = get_subscription(self.workspace_id)

        second = get_subscription(self.workspace_id)

        self.assertEqual(first.id, second.id)

        self.assertEqual(
            Subscription.objects.filter(
                workspace_id=self.workspace_id,
            ).count(),
            1,
        )

    def test_free_entitlements(self):

        data = get_entitlements(
            self.workspace_id,
        )

        self.assertEqual(data["plan"], "free")

        self.assertEqual(
            data["limits"]["max_projects"],
            3,
        )

    def test_expired_subscription_uses_free_plan(self):

        subscription = get_subscription(
            self.workspace_id,
        )

        subscription.plan = self.pro
        subscription.status = Subscription.Status.ACTIVE

        subscription.current_period_end = (
            timezone.now() - timedelta(days=1)
        )

        subscription.save()

        data = get_entitlements(self.workspace_id)

        self.assertEqual(data["plan"], "free")

    @patch("billing.services.paddle.create_checkout")
    def test_checkout_is_reused(self, create_checkout):

        create_checkout.return_value = {
            "id": "txn_test123",
        }

        first = start_checkout(
            self.workspace_id,
            self.user_id,
            "pro",
        )

        second = start_checkout(
            self.workspace_id,
            self.user_id,
            "pro",
        )

        self.assertEqual(first.id, second.id)

        create_checkout.assert_called_once()

        subscription = get_subscription(
            self.workspace_id,
        )

        # Opening checkout is not proof of payment.
        self.assertEqual(
            subscription.status,
            Subscription.Status.FREE,
        )

    @patch("billing.services.paddle.get_subscription")
    @patch("billing.services.paddle.get_transaction")
    def test_completed_payment_activates_plan_once(
        self,
        get_transaction,
        get_provider_subscription,
    ):

        subscription = get_subscription(
            self.workspace_id,
        )

        CheckoutAttempt.objects.create(
            subscription=subscription,
            plan=self.pro,
            expected_price_id="pri_testpro",
            created_by=self.user_id,
            provider_transaction_id="txn_test123",
            status=CheckoutAttempt.Status.OPEN,
        )

        now = timezone.now()

        get_transaction.return_value = {
            "id": "txn_test123",
            "status": "completed",
            "subscription_id": "sub_test123",
            "currency_code": "USD",
            "invoice_number": "INV-001",
            "billed_at": now.isoformat(),
            "items": [
                {
                    "price": {
                        "id": "pri_testpro",
                    },
                    "quantity": 1,
                }
            ],
            "details": {
                "totals": {
                    "total": "900",
                }
            },
        }

        get_provider_subscription.return_value = {
            "id": "sub_test123",
            "status": "active",
            "customer_id": "ctm_test123",
            "items": [
                {
                    "price": {
                        "id": "pri_testpro",
                    },
                    "quantity": 1,
                }
            ],
            "current_billing_period": {
                "starts_at": now.isoformat(),
                "ends_at": (
                    now + timedelta(days=30)
                ).isoformat(),
            },
            "scheduled_change": None,
            "canceled_at": None,
        }

        sync_provider_transaction("txn_test123")
        sync_provider_transaction("txn_test123")

        subscription.refresh_from_db()

        self.assertEqual(
            subscription.status,
            Subscription.Status.ACTIVE,
        )

        self.assertEqual(
            subscription.plan.code,
            "pro",
        )

        self.assertEqual(Payment.objects.count(), 1)

        self.assertEqual(
            Payment.objects.get().amount,
            900,
        )

    @patch("billing.permissions.requests.get")
    def test_member_cannot_start_checkout(
        self,
        workspace_request,
    ):

        self.client.force_authenticate(
            user=SimpleNamespace(
                id=self.user_id,
                is_authenticated=True,
            ),
            token="test-session",
        )

        workspace_request.return_value.status_code = 200

        workspace_request.return_value.json.return_value = {
            "id": str(self.workspace_id),
            "role": "member",
        }

        response = self.client.post(
            (
                f"/api/workspaces/{self.workspace_id}/"
                "checkout/"
            ),
            {"plan": "pro"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

        self.assertEqual(
            CheckoutAttempt.objects.count(),
            0,
        )

    @patch("billing.permissions.requests.get")
    def test_other_workspace_access_is_denied(
        self,
        workspace_request,
    ):

        self.client.force_authenticate(
            user=SimpleNamespace(
                id=self.user_id,
                is_authenticated=True,
            ),
            token="test-session",
        )

        workspace_request.return_value.status_code = 404

        response = self.client.get(
            (
                f"/api/workspaces/{self.workspace_id}/"
                "subscription/"
            )
        )

        self.assertEqual(response.status_code, 404)

        self.assertEqual(
            Subscription.objects.count(),
            0,
        )

    def test_internal_entitlements_require_credentials(self):

        response = self.client.get(
            (
                f"/api/internal/workspaces/"
                f"{self.workspace_id}/entitlements/"
            )
        )

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_billing_request(self):

        response = self.client.get(
            "/api/plans/",
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    def test_invalid_webhook_signature(self):

        response = self.client.post(
            "/api/webhooks/paddle/",
            {},
            format="json",
            HTTP_PADDLE_SIGNATURE="invalid",
        )

        self.assertEqual(response.status_code, 401)

    @override_settings(
        PADDLE_WEBHOOK_SECRET="test-webhook-secret"
    )
    def test_duplicate_webhooks_are_stored_once(self):

        timestamp = str(int(time.time()))

        payload = {
            "event_id": "evt_test123",
            "event_type": "subscription.updated",
            "occurred_at": timezone.now().isoformat(),
            "data": {
                "id": "sub_test123",
            },
        }

        body = json.dumps(payload).encode()

        signed_body = (
            timestamp.encode() + b":" + body
        )

        signature = hmac.new(
            b"test-webhook-secret",
            signed_body,
            hashlib.sha256,
        ).hexdigest()

        header = f"ts={timestamp};h1={signature}"

        for _ in range(2):

            response = self.client.post(
                "/api/webhooks/paddle/",
                data=body,
                content_type="application/json",
                HTTP_PADDLE_SIGNATURE=header,
            )

            self.assertEqual(response.status_code, 200)

        self.assertEqual(
            WebhookEvent.objects.filter(
                event_id="evt_test123",
            ).count(),
            1,
        )