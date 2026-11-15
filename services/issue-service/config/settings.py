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
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,issue").split(",") if host.strip()]
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "rest_framework", "issues"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": required("POSTGRES_DB"), "USER": required("POSTGRES_USER"), "PASSWORD": required("POSTGRES_PASSWORD"), "HOST": os.getenv("POSTGRES_HOST", "postgres"), "PORT": os.getenv("POSTGRES_PORT", "5432"), "CONN_MAX_AGE": 60}}
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["issues.authentication.IdentityAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}
IDENTITY_API_URL = required("IDENTITY_API_URL").rstrip("/")
WORKSPACE_API_URL = required("WORKSPACE_API_URL").rstrip("/")
SERVICE_ID = "issue-service"
INTERNAL_SERVICE_KEY = required("INTERNAL_SERVICE_KEY")
USE_TZ = True
TIME_ZONE = "UTC"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
