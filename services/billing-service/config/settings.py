import json
import os

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def required(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value


SECRET_KEY = required("DJANGO_SECRET_KEY")

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1,billing",
    ).split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "billing",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": required("POSTGRES_DB"),
        "USER": required("POSTGRES_USER"),
        "PASSWORD": required("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST", "postgres"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "billing.authentication.IdentityAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

SERVICE_ID = "billing-service"

INTERNAL_SERVICE_KEY = required("INTERNAL_SERVICE_KEY")

IDENTITY_API_URL = required("IDENTITY_API_URL").rstrip("/")

WORKSPACE_API_URL = required("WORKSPACE_API_URL").rstrip("/")

BILLING_CALLER_KEYS = json.loads(
    required("BILLING_CALLER_KEYS_JSON")
)

if (
    not isinstance(BILLING_CALLER_KEYS, dict)
    or not BILLING_CALLER_KEYS
    or any(
        not isinstance(value, str) or len(value) < 32
        for value in BILLING_CALLER_KEYS.values()
    )
):
    raise RuntimeError("Invalid billing caller keys")

STRIPE_API_URL = "https://api.stripe.com"

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")

STRIPE_CHECKOUT_SUCCESS_URL = os.getenv(
    "STRIPE_CHECKOUT_SUCCESS_URL",
    "",
)

STRIPE_CHECKOUT_CANCEL_URL = os.getenv(
    "STRIPE_CHECKOUT_CANCEL_URL",
    "",
)

STRIPE_WEBHOOK_SECRET = os.getenv(
    "STRIPE_WEBHOOK_SECRET",
    "",
)

STRIPE_PRO_PRICE_ID = os.getenv(
    "STRIPE_PRO_PRICE_ID",
    "",
)

STRIPE_TEAM_PRICE_ID = os.getenv(
    "STRIPE_TEAM_PRICE_ID",
    "",
)

CELERY_BROKER_URL = required("CELERY_BROKER_URL")

CELERY_TASK_DEFAULT_QUEUE = "billing"

CELERY_TASK_IGNORE_RESULT = True

CELERY_TASK_ACKS_LATE = True

CELERY_WORKER_PREFETCH_MULTIPLIER = 1

CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_TIMEZONE = "UTC"

CELERY_BEAT_SCHEDULE = {
    "recover-billing-webhooks": {
        "task": "billing.tasks.recover_webhooks",
        "schedule": 30.0,
    },
    "reconcile-subscriptions": {
        "task": "billing.tasks.reconcile_subscriptions",
        "schedule": 300.0,
    },
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024

USE_TZ = True
TIME_ZONE = "UTC"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SECURE_CONTENT_TYPE_NOSNIFF = True
