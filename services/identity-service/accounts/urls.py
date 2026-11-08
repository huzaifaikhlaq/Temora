from django.urls import path

from . import views


urlpatterns = [
    path(
        "health/",
        views.Health.as_view(),
        name="identity-health"
    ),

    path(
        "register/",
        views.Register.as_view(),
        name="identity-register"
    ),

    path(
        "login/",
        views.Login.as_view(),
        name="identity-login"
    ),

    path(
        "logout/",
        views.Logout.as_view(),
        name="identity-logout"
    ),

    path(
        "me/",
        views.Me.as_view(),
        name="identity-me"
    ),

    path(
        "forgot-password/",
        views.ForgotPassword.as_view(),
        name="identity-forgot"
    ),

    path(
        "verify-email/",
        views.VerifyEmail.as_view(),
        name="identity-verify"
    ),

    path(
        "reset-password/",
        views.ResetPassword.as_view(),
        name="identity-reset"
    ),

    path(
        "introspect/",
        views.Introspect.as_view(),
        name="identity-introspect"
    ),
]