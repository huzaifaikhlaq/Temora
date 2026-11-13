import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Invitation


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5)
def deliver_invitation_email(self, invitation_id, raw_token):
    invitation = Invitation.objects.select_related("workspace").get(
        pk=invitation_id
    )
    if invitation.status != Invitation.Status.PENDING:
        logger.info("Skipping email for non-pending invitation %s", invitation_id)
        return

    invitation.email_attempts += 1
    invitation.save(update_fields=["email_attempts"])

    url = (
        f"{settings.FRONTEND_URL}/invitations/accept"
        f"?token={raw_token}"
    )
    try:
        send_mail(
            subject=f"Join {invitation.workspace.name} on Temora",
            message=(
                f"You have been invited to join "
                f"{invitation.workspace.name}.\n\n"
                f"Accept your invitation:\n{url}\n\n"
                "If you did not expect this invitation, "
                "you can ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            fail_silently=False,
        )
    except Exception as error:
        invitation.email_last_error = str(error)[:4000]
        if self.request.retries >= self.max_retries:
            invitation.email_status = "failed"
            invitation.save(update_fields=["email_status", "email_last_error"])
            logger.exception("Invitation email delivery failed permanently: %s", invitation_id)
            raise

        invitation.save(update_fields=["email_last_error"])
        logger.warning(
            "Invitation email delivery failed; retry %s/%s: %s",
            self.request.retries + 1,
            self.max_retries,
            invitation_id,
            exc_info=True,
        )
        raise self.retry(exc=error, countdown=min(60 * (2 ** self.request.retries), 3600))

    invitation.email_status = "sent"
    invitation.email_sent_at = timezone.now()
    invitation.email_last_error = ""
    invitation.save(
        update_fields=["email_status", "email_sent_at", "email_last_error"]
    )
    logger.info("Invitation email delivered: %s", invitation_id)
