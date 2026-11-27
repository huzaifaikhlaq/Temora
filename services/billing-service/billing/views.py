from rest_framework.permissions import AllowAny

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Plan, Payment
from . import stripe

from .permissions import (
    require_workspace_access,
    require_internal_service,
)

from .serializers import (
    PlanSerializer,
    SubscriptionSerializer,
    CheckoutSerializer,
    PaymentSerializer,
)

from .entitlements import (
    get_subscription,
    get_entitlements,
)

from .services import (
    start_checkout,
    schedule_cancellation,
    remove_scheduled_cancellation,
    abandon_checkout,
)


class Health(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):

        return Response(
            {
                "status": "ok",
                "service": "billing",
            }
        )


class PlanList(APIView):

    def get(self, request):

        plans = Plan.objects.filter(
            is_active=True,
        )

        return Response(
            PlanSerializer(plans, many=True).data
        )


class SubscriptionDetail(APIView):

    def get(self, request, workspace_id):

        role = require_workspace_access(
            request,
            workspace_id,
        )

        subscription = get_subscription(workspace_id)

        return Response(
            SubscriptionSerializer(
                subscription,
                context={"role": role},
            ).data
        )


class CheckoutCreate(APIView):

    def post(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
            owner_only=True,
        )

        serializer = CheckoutSerializer(
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)

        attempt = start_checkout(
            workspace_id=workspace_id,
            user_id=request.user.id,
            plan_code=serializer.validated_data["plan"],
        )

        session = stripe.get_transaction(
            attempt.provider_transaction_id,
        )

        checkout_url = session.get("url")

        if session.get("status") != "open" or not checkout_url:
            return Response(
                {"detail": "The Stripe checkout session is no longer open."},
                status=409,
            )

        return Response({
            "checkout_id": str(attempt.id),
            "transaction_id": attempt.provider_transaction_id,
            "checkout_url": checkout_url,
        })


class CheckoutCancel(APIView):

    def post(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
            owner_only=True,
        )

        abandon_checkout(workspace_id)

        return Response({
            "message": "Checkout canceled.",
        })


class SubscriptionCancel(APIView):

    def post(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
            owner_only=True,
        )

        subscription = schedule_cancellation(
            workspace_id,
        )

        return Response(
            SubscriptionSerializer(
                subscription,
                context={"role": "owner"},
            ).data
        )


class SubscriptionResume(APIView):

    def post(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
            owner_only=True,
        )

        subscription = remove_scheduled_cancellation(
            workspace_id,
        )

        return Response(
            SubscriptionSerializer(
                subscription,
                context={"role": "owner"},
            ).data
        )


class PaymentHistory(APIView):

    def get(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
            owner_only=True,
        )

        payments = Payment.objects.filter(
            subscription__workspace_id=workspace_id,
        ).order_by("-created_at")[:100]

        return Response(
            PaymentSerializer(
                payments,
                many=True,
            ).data
        )


class EntitlementDetail(APIView):

    def get(self, request, workspace_id):

        require_workspace_access(
            request,
            workspace_id,
        )

        return Response(
            get_entitlements(workspace_id)
        )


class InternalEntitlementDetail(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, workspace_id):

        require_internal_service(request)

        return Response(
            get_entitlements(workspace_id)
        )
