import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Callable

import httpx
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from ..config import settings

log = logging.getLogger("lsf.email")


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_jinja = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),  # customer-supplied text (names, product names) is HTML-escaped
    undefined=StrictUndefined,               # a missing variable is a logged error, never a silently blank email
)


class EmailBody(str):
    """Plain-text body that can also carry a rendered HTML version in `.html`.

    It behaves exactly like the plain string the callers already pass around, so the code that
    sends these emails does not change. `send_email` sends both (multipart) when `.html` is set.
    """

    html: str | None

    def __new__(cls, text: str, html: str | None = None):
        obj = super().__new__(cls, text)
        obj.html = html
        return obj


def _render(template: str, build_context: Callable[[], dict]) -> str | None:
    """Render an HTML template. On ANY failure (missing file, bad variable, template error) log it and
    return None, so the plain-text email still goes out instead of the order or status update failing."""
    try:
        return _jinja.get_template(template).render(**build_context())
    except Exception:
        log.exception("Could not render email template %s; sending the plain-text version instead", template)
        return None


def _money(n: int) -> str:
    return f"{n:,}"


# Delivery
def _send_resend(to: str, subject: str, body: str, html: str | None = None) -> None:
    # Ensure mail_from is clean and stripped of extra quotes/spaces
    from_address = settings.mail_from.strip().strip("'").strip('"')

    payload = {
        "from": from_address,
        "to": [to],
        "subject": subject,
        "text": str(body),  # plain-text fallback for clients that don't render HTML
    }
    if html:
        payload["html"] = html

    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=payload,
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


def _send_smtp(to: str, subject: str, body: str, html: str | None = None) -> None:
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.mail_from, to, subject
    msg.set_content(str(body))
    if html:
        msg.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    except Exception:
        log.exception("SMTP send failed")


def send_email(to: str, subject: str, body: str) -> None:
    html = getattr(body, "html", None)  # set by the order_* builders below; plain strings (e.g. OTP) have none
    if settings.resend_api_key:
        return _send_resend(to, subject, body, html)
    if settings.smtp_host:
        return _send_smtp(to, subject, body, html)
    # Nothing configured: print to the API terminal so sign-in codes are visible during development.
    print(f"\n========== DEV EMAIL (no email provider configured) ==========\nTo: {to}\nSubject: {subject}\n{body}=====================================================\n", flush=True)

def otp_verification(code: str) -> tuple[str, EmailBody]:
    text = (
        "Hi there,\n\n"
        "Welcome to Lu's Shoe Farm! Use the verification code below "
        "to securely sign in to your account.\n\n"
        f"Your verification code is: {code}\n\n"
        "This code expires in 10 minutes. "
        "Never share this code with anyone.\n\n"
        "If you didn't request a code, simply ignore this email.\n"
    )

    html = _render("otp_verification.html", lambda: {
        "customer_name": "there",
        "otp_code": code,
    })

    return "Your Lu's Shoe Farm verification code", EmailBody(text, html)

# Order emails: each returns (subject, body). Same signatures as before; body now also carries HTML.
def order_receipt(order) -> tuple[str, EmailBody]:
    lines = "\n".join(f"- {i.quantity} x {i.name} (size {i.size}, {i.color}) NGN {i.unit_price * i.quantity:,}" for i in order.items)
    text = (
        f"Hi {order.name or 'there'},\n\nThanks for your order. Payment confirmed.\n\n{lines}\n\n"
        f"Subtotal: NGN {order.subtotal:,}\nShipping: NGN {order.shipping_fee:,}\nVAT: NGN {order.vat:,}\n"
        f"Total: NGN {order.total:,}\n"
    )
    html = _render("order_receipt.html", lambda: {
        "customer_name": order.name or "there",
        "order_reference": order.reference,
        # item totals are formatted inside the template, so items carry raw numbers
        "items": [
            {"name": i.name, "size": i.size, "color": i.color, "quantity": i.quantity, "unit_price": i.unit_price}
            for i in order.items
        ],
        # order totals are printed as-is by the template, so they are pre-formatted here
        "subtotal": _money(order.subtotal),
        "shipping_fee": _money(order.shipping_fee),
        "vat": _money(order.vat),
        "total": _money(order.total),
    })
    return f"Order {order.reference} received - Lu's Shoe Farm", EmailBody(text, html)


def order_shipped(order) -> tuple[str, EmailBody]:
    t = f"\nTracking: {order.tracking_number}" if order.tracking_number else ""
    html = _render("order_shipped.html", lambda: {
        "customer_name": order.name or "there",
        "order_reference": order.reference,
        # the template always shows a tracking line, and tracking is optional when an admin ships an order
        "tracking_number": order.tracking_number or "Not available for this shipment",
    })
    return f"Your order {order.reference} has shipped", EmailBody(f"Good news - your order is on its way.{t}\n", html)


def order_received(order) -> tuple[str, EmailBody]:
    html = _render("order_delivered.html", lambda: {
        "customer_name": order.name or "there",
        "order_reference": order.reference,
    })
    return f"Order {order.reference} delivered", EmailBody("Your order has been marked as delivered. Enjoy your new shoes!\n", html)