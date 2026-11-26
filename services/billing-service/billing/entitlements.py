from django.utils import timezone

from rest_framework.exceptions import APIException

from .models import Plan, Subscription


class BillingUnavailable(APIException):
    status_code = 503
    default_detail = "Billing configuration unavailable."


def free_plan():

    try:
        return Plan.objects.get(
            code=Plan.Code.FREE,
            is_active=True,
        )

    except Plan.DoesNotExist:
        raise BillingUnavailable()


def get_subscription(workspace_id):

    subscription = Subscription.objects.filter(
        workspace_id=workspace_id,
    ).select_related("plan").first()

    if subscription is not None:
        return subscription

    subscription, _ = Subscription.objects.get_or_create(
        workspace_id=workspace_id,
        defaults={
            "plan": free_plan(),
            "status": Subscription.Status.FREE,
        },
    )

    return subscription


def effective_plan(subscription):

    if subscription is None:
        return free_plan()

    if (
        subscription.status == Subscription.Status.ACTIVE
        and subscription.current_period_end
        and subscription.current_period_end > timezone.now()
    ):
        return subscription.plan

    return free_plan()


def get_entitlements(workspace_id):

    subscription = (
        Subscription.objects
        .select_related("plan")
        .filter(workspace_id=workspace_id)
        .first()
    )

    plan = effective_plan(subscription)

    return {
        "workspace_id": str(workspace_id),
        "plan": plan.code,
        "limits": {
            "max_members": plan.max_members,
            "max_projects": plan.max_projects,
            "max_issues": plan.max_issues,
        },
    }