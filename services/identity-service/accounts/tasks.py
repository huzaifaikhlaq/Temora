from html import escape

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def send_token_email(self, email, purpose, url):
    is_verification = purpose == "verify"

    subject = (
        "Verify your Temora email"
        if is_verification
        else "Reset your Temora password"
    )

    button_text = (
        "Verify my email"
        if is_verification
        else "Reset my password"
    )

    safe_url = escape(url, quote=True)
    safe_label = escape(button_text)

    text_message = (
        f"{button_text}\n\n"
        f"Open this link:\n{url}\n\n"
        "If you did not request this, ignore this email."
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;
                 background:#f7f8fc;padding:32px;">
      <div style="max-width:500px;margin:auto;
                  background:white;padding:32px;
                  border-radius:12px;">

        <h2 style="color:#17152c;">Temora</h2>

        <h3>{safe_label}</h3>

        <p>
          Click the button below to continue
          to your Temora account.
        </p>

        <a href="{safe_url}"
           style="display:inline-block;
                  padding:14px 24px;
                  background:#7137e8;
                  color:white;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;">
          {safe_label}
        </a>

        <p style="margin-top:24px;color:#666;">
          If you did not request this email,
          you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
    """

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )

    message.attach_alternative(
        html_message,
        "text/html",
    )

    message.send(fail_silently=False)
