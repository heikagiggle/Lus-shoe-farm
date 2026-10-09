import logging
import smtplib

import httpx
from email.message import EmailMessage

from ..config import settings

log = logging.getLogger("lsf.email")


def _send_resend(to: str, subject: str, body: str) -> None:
    # Ensure mail_from is clean and stripped of extra quotes/spaces
    from_address = settings.mail_from.strip().strip("'").strip('"')

    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": from_address,
                "to": [to],
                "subject": subject,
                "text": body,
            },
            timeout=15,
        )
        if r.status_code >= 400:
            log.error("Resend rejected email to %s: Status %s - %s", to, r.status_code, r.text)
            print(f"\n[RESEND ERROR {r.status_code}]: {r.text}\n", flush=True)
        else:
            log.info("Email sent successfully to %s", to)
    except Exception as e:
        log.exception("Resend request failed: %s", str(e))
        print(f"\n[RESEND EXCEPTION]: {str(e)}\n", flush=True)


def _send_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.mail_from, to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    except Exception:
        log.exception("SMTP send failed")


def send_email(to: str, subject: str, body: str) -> None:
    if settings.resend_api_key:
        return _send_resend(to, subject, body)
    if settings.smtp_host:
        return _send_smtp(to, subject, body)
    # Nothing configured: print to the API terminal so sign-in codes are visible during development.
    print(f"\n========== DEV EMAIL (no email provider configured) ==========\nTo: {to}\nSubject: {subject}\n{body}=====================================================\n", flush=True)


def order_receipt(order) -> tuple[str, str]:
    lines = "\n".join(f"- {i.quantity} x {i.name} (size {i.size}, {i.color}) NGN {i.unit_price * i.quantity:,}" for i in order.items)
    return (
        f"Order {order.reference} received - Lu's Shoe Farm",
        f"Hi {order.name or 'there'},\n\nThanks for your order. Payment confirmed.\n\n{lines}\n\n"
        f"Subtotal: NGN {order.subtotal:,}\nShipping: NGN {order.shipping_fee:,}\nVAT: NGN {order.vat:,}\n"
        f"Total: NGN {order.total:,}\n",
    )


def order_shipped(order) -> tuple[str, str]:
    t = f"\nTracking: {order.tracking_number}" if order.tracking_number else ""
    return f"Your order {order.reference} has shipped", f"Good news - your order is on its way.{t}\n"


def order_received(order) -> tuple[str, str]:
    return f"Order {order.reference} delivered", "Your order has been marked as delivered. Enjoy your new shoes!\n"
