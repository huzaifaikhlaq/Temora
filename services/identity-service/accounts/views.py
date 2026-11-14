import secrets

from django.conf import settings
from django.contrib.auth import (
    authenticate,
    password_validation,
)
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, Session, OneTimeToken

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    EmailSerializer,
    TokenSerializer,
    ResetSerializer,
    UserSerializer,
)

from .services import (
    issue_session,
    queue_link,
    consume_token,
    SESSION_SECONDS,
)

from .throttles import (
    RegisterThrottle,
    LoginThrottle,
    RecoverThrottle,
    VerifyThrottle,
)


# Public API base class

class PublicEndpoint(APIView):

    authentication_classes = []

    permission_classes = [AllowAny]


# Health check

class Health(PublicEndpoint):

    def get(self, request):
        return Response({
            "status": "ok"
        })


# Register

class Register(PublicEndpoint):

    throttle_classes = [RegisterThrottle]

    def post(self, request):

        serializer = RegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        message = {
            "message": (
                "If eligible, check your email "
                "for further instructions."
            )
        }

        if User.objects.filter(
            email=data["email"]
        ).exists():
            return Response(
                {"detail": "A user with this email address already exists."},
                status=409
            )

        try:
            with transaction.atomic():

                user = User.objects.create_user(
                    **data
                )

                queue_link(
                    user,
                    "verify"
                )

        except IntegrityError:
            return Response(
                {"detail": "A user with this email address already exists."},
                status=409
            )

        return Response(
            message,
            status=202
        )


# Login

class Login(PublicEndpoint):

    throttle_classes = [LoginThrottle]

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        user = authenticate(
            request,
            username=data["email"],
            password=data["password"]
        )

        if not user or not user.email_verified:
            return Response(
                {
                    "detail": (
                        "Invalid credentials "
                        "or account unavailable."
                    )
                },
                status=401
            )

        token = issue_session(user)

        return Response({
            "token": token,
            "user": UserSerializer(user).data,
            "expires_in": SESSION_SECONDS,
        })


# Logout

class Logout(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        Session.objects.filter(
            pk=request.auth.pk,
            revoked_at__isnull=True
        ).update(
            revoked_at=timezone.now()
        )

        return Response(status=204)


# Current user

class Me(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response({
            "user": UserSerializer(
                request.user
            ).data
        })


# Forgot password

class ForgotPassword(PublicEndpoint):

    throttle_classes = [RecoverThrottle]

    def post(self, request):

        serializer = EmailSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data["email"]

        user = User.objects.filter(
            email=email,
            is_active=True
        ).first()

        if user:
            with transaction.atomic():
                queue_link(
                    user,
                    "reset"
                )

        return Response({
            "message": (
                "If the account exists, "
                "a reset link will be sent."
            )
        })


# Email verification

class VerifyEmail(PublicEndpoint):
    throttle_classes = [VerifyThrottle]

    def post(self, request):
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_token = serializer.validated_data["token"]

        with transaction.atomic():
            record = consume_token(raw_token, "verify")

            if not record:
                return Response(
                    {"detail": "Invalid or expired link."},
                    status=400,
                )

            user = record.user

            if user.email_verified:
                return Response(
                    {"detail": "Email already verified."},
                    status=400,
                )

            user.email_verified = True
            user.save(update_fields=["email_verified"])

            now = timezone.now()

            # Invalidate every verification token
            # for this user, including the current one.
            OneTimeToken.objects.filter(
                user=user,
                purpose="verify",
                used_at__isnull=True,
            ).update(used_at=now)

            # Automatically sign in the verified user.
            session_token = issue_session(user)

        return Response({
            "token": session_token,
            "user": UserSerializer(user).data,
            "expires_in": SESSION_SECONDS,
        })

# Reset password

class ResetPassword(PublicEndpoint):

    throttle_classes = [RecoverThrottle]

    def post(self, request):

        serializer = ResetSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        token = serializer.validated_data["token"]

        password = serializer.validated_data["password"]

        with transaction.atomic():

            record = consume_token(
                token,
                "reset"
            )

            if not record:
                return Response(
                    {
                        "detail": (
                            "Invalid or expired link."
                        )
                    },
                    status=400
                )

            try:
                password_validation.validate_password(
                    password,
                    record.user
                )

            except ValidationError as error:
                return Response(
                    {
                        "password": error.messages
                    },
                    status=400
                )

            record.user.set_password(password)

            record.user.save(
                update_fields=[
                    "password"
                ]
            )

            now = timezone.now()

            record.used_at = now

            record.save(
                update_fields=[
                    "used_at"
                ]
            )

            # Invalidate other reset tokens.

            OneTimeToken.objects.filter(
                user=record.user,
                purpose="reset",
                used_at__isnull=True
            ).update(
                used_at=now
            )

            # Revoke all existing sessions.

            Session.objects.filter(
                user=record.user,
                revoked_at__isnull=True
            ).update(
                revoked_at=now
            )

        return Response({
            "message": (
                "Password changed. Sign in again."
            )
        })


# Internal microservice token introspection

class Introspect(APIView):

    authentication_classes = []

    permission_classes = [AllowAny]

    def post(self, request):

        service_id = request.headers.get(
            "X-Service-Id",
            ""
        )

        provided = request.headers.get(
            "X-Service-Key",
            ""
        )

        expected = settings.INTERNAL_SERVICE_KEYS.get(
            service_id
        )

        if not expected or not secrets.compare_digest(
            provided,
            expected
        ):
            return Response(status=403)

        from .authentication import (
            OpaqueSessionAuthentication
        )

        from rest_framework.exceptions import (
            AuthenticationFailed
        )

        try:
            authenticated = (
                OpaqueSessionAuthentication()
                .authenticate(request)
            )

        except AuthenticationFailed:
            authenticated = None

        user = (
            authenticated[0]
            if authenticated
            else None
        )

        return Response({
            "active": bool(user),
            "user": (
                UserSerializer(user).data
                if user
                else None
            )
        })