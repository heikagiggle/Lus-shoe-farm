"""Server-authoritative pricing: the client only displays what this returns."""
from ..config import settings


def shipping_fee(delivery_method: str, tier: str, state: str, subtotal: int) -> int:
    if delivery_method == "pickup":
        return 0
    in_lagos = state.strip().lower() == "lagos"
    if in_lagos and subtotal >= settings.free_shipping_threshold:
        return 0  # "Free shipping on orders above 200k within Lagos"
    return settings.priority_fee if tier == "priority" else settings.flexible_fee


def compute_totals(subtotal: int, delivery_method: str, tier: str, state: str) -> dict:
    fee = shipping_fee(delivery_method, tier, state, subtotal)
    vat = round(subtotal * settings.vat_rate)
    return {"subtotal": subtotal, "shipping_fee": fee, "vat": vat, "total": subtotal + fee + vat}
