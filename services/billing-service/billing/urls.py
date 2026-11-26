from django.urls import path

from . import views

from .webhooks import StripeWebhook


urlpatterns = [

    path(
        "health/",
        views.Health.as_view(),
    ),

    path(
        "plans/",
        views.PlanList.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/subscription/",
        views.SubscriptionDetail.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/checkout/",
        views.CheckoutCreate.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/checkout/cancel/",
        views.CheckoutCancel.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/cancel/",
        views.SubscriptionCancel.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/resume/",
        views.SubscriptionResume.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/invoices/",
        views.PaymentHistory.as_view(),
    ),

    path(
        "workspaces/<uuid:workspace_id>/entitlements/",
        views.EntitlementDetail.as_view(),
    ),

    path(
        "internal/workspaces/<uuid:workspace_id>/entitlements/",
        views.InternalEntitlementDetail.as_view(),
    ),

    path(
        "webhooks/stripe/",
        StripeWebhook.as_view(),
    ),

]
