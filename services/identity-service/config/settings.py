import json
import os

from pathlib import Path
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def required(name):
    value = os.environ.get(name)

    if not value:
        raise ImproperlyConfigured(
            f"Missing required environment variable: {name}"
        )

    return value


# Security

SECRET_KEY = required("DJANGO_SECRET_KEY")

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1,identity"
    ).split(",")
    if host.strip()
]


# Django applications

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "accounts",
]


# Middleware

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]


ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

ASGI_APPLICATION = "config.asgi.application"


# PostgreSQL

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "identity"),
        "USER": os.getenv("POSTGRES_USER", "temora"),
        "PASSWORD": required("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}


# Custom user model

AUTH_USER_MODEL = "accounts.User"


# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
        "OPTIONS": {
            "min_length": 12
        },
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        )
    },
]


PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]


# Django REST Framework

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.OpaqueSessionAuthentication"
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated"
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer"
    ],
    "DEFAULT_THROTTLE_CLASSES": [],
}


# Redis

REDIS_URL = required("REDIS_URL")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient"
        },
        "KEY_PREFIX": "temora_identity",
    }
}


# Celery

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    REDIS_URL
)
CELERY_TASK_DEFAULT_QUEUE = "identity"

CELERY_RESULT_BACKEND = None

CELERY_TASK_IGNORE_RESULT = True

CELERY_TASK_SERIALIZER = "json"

CELERY_ACCEPT_CONTENT = ["json"]

CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True


# Date/time

USE_TZ = True
TIME_ZONE = "UTC"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
)

EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")

EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")

EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

EMAIL_USE_TLS = (
    os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "no-reply@temora.local"
)


# Next.js frontend

FRONTEND_URL = required("FRONTEND_URL").rstrip("/")


# Internal microservice authentication

try:
    INTERNAL_SERVICE_KEYS = json.loads(
        required("INTERNAL_SERVICE_KEYS_JSON")
    )

except (json.JSONDecodeError, TypeError) as exc:
    raise ImproperlyConfigured(
        "INTERNAL_SERVICE_KEYS_JSON must contain a JSON object"
    ) from exc


if (
    not isinstance(INTERNAL_SERVICE_KEYS, dict)
    or not INTERNAL_SERVICE_KEYS
    or any(
        not isinstance(key, str)
        or not key
        or not isinstance(value, str)
        or len(value) < 32
        for key, value in INTERNAL_SERVICE_KEYS.items()
    )
):
    raise ImproperlyConfigured(
        "Supply service IDs and secrets >=32 characters"
    )


# Production security

SECURE_SSL_REDIRECT = (
    os.getenv("SECURE_SSL_REDIRECT", "false").lower()
    == "true"
)

SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG

SECURE_HSTS_SECONDS = (
    31536000
    if os.getenv("ENABLE_HSTS", "false").lower() == "true"
    else 0
)

SECURE_HSTS_INCLUDE_SUBDOMAINS = (
    SECURE_HSTS_SECONDS > 0
)

SECURE_CONTENT_TYPE_NOSNIFF = True