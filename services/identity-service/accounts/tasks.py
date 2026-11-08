from celery import shared_task

from django.conf import settings
from django.core.mail import send_mail


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={
        "max_retries": 5
    }
)
def send_token_email(self, email, purpose, url):

    subject = (
        "Verify your Temora email"
        if purpose == "verify"
        else "Reset your Temora password"
    )

    send_mail(
        subject=subject,
        message=(
            f"Open this link to continue:\n"
            f"{url}\n\n"
            "If you did not request this, "
            "ignore the email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )