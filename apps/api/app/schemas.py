from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class VariantOut(ORM):
    id: int
    size: int
    color: str
    price: int
    stock: int


class VariantIn(BaseModel):
    size: int = Field(ge=30, le=50)
    color: str = Field(min_length=1, max_length=40)
    price: int = Field(ge=0)
    stock: int = Field(ge=0)


class ProductOut(ORM):
    id: int
    name: str
    slug: str
    description: str
    category: str
    images: list[str]
    is_new_arrival: bool
    is_active: bool
    is_sold_out: bool
    variants: list[VariantOut]
    collection_ids: list[int] = []


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str | None = None
    description: str = ""
    category: str
    images: list[str] = []
    is_new_arrival: bool = False
    is_active: bool = True
    collection_ids: list[int] = []
    variants: list[VariantIn] = []


class ProductPage(BaseModel):
    items: list[ProductOut]
    next_cursor: int | None


class CollectionOut(ORM):
    id: int
    name: str
    slug: str
    description: str
    show_on_homepage: bool


class CollectionWithProducts(CollectionOut):
    products: list[ProductOut] = []


class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = None
    description: str = ""
    show_on_homepage: bool = False


class SlideOut(ORM):
    id: int
    position: int
    image_url: str
    headline: str
    subtext: str
    cta_label: str
    cta_url: str
    is_active: bool


class SlideIn(BaseModel):
    position: int = 0
    image_url: str
    headline: str
    subtext: str = ""
    cta_label: str = "Shop Now"
    cta_url: str = "/shop"
    is_active: bool = True


class CartLine(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=20)


class CartSyncLine(BaseModel):
    variant_id: int
    available: bool
    stock: int
    price: int


class CheckoutIn(BaseModel):
    email: EmailStr
    marketing_opt_in: bool = False
    delivery_method: Literal["ship", "pickup"] = "ship"
    shipping_tier: Literal["flexible", "priority"] = "flexible"
    name: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    items: list[CartLine] = Field(min_length=1)


class QuoteIn(BaseModel):
    delivery_method: Literal["ship", "pickup"] = "ship"
    shipping_tier: Literal["flexible", "priority"] = "flexible"
    state: str = ""
    items: list[CartLine] = Field(min_length=1)


class QuoteOut(BaseModel):
    subtotal: int
    shipping_fee: int
    vat: int
    total: int


class OrderItemOut(ORM):
    id: int
    name: str
    image: str
    size: int
    color: str
    unit_price: int
    quantity: int


class OrderOut(ORM):
    id: int
    reference: str
    status: str
    payment_status: str
    email: str
    delivery_method: str
    shipping_tier: str
    name: str
    phone: str
    address: str
    city: str
    state: str
    subtotal: int
    shipping_fee: int
    vat: int
    total: int
    tracking_number: str
    notes: str
    is_read: bool
    created_at: datetime
    items: list[OrderItemOut]


class CheckoutOut(BaseModel):
    order: OrderOut
    access_code: str | None = None
    authorization_url: str | None = None
    mock: bool = False


class OrderStatusIn(BaseModel):
    status: Literal["shipped", "received"]
    tracking_number: str = ""


class BulkDeleteIn(BaseModel):
    ids: list[int] = Field(min_length=1)


class InventoryPatch(BaseModel):
    variant_id: int
    price: int | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- phase 2: customers, notifications, chat
class OtpRequestIn(BaseModel):
    email: EmailStr


class OtpVerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class ProfileOut(ORM):
    id: int
    email: str
    first_name: str
    last_name: str
    display_name: str
    address: str
    city: str
    state: str
    postal_code: str
    phone: str
    marketing_opt_in: bool
    created_at: datetime


class ProfilePatch(BaseModel):
    first_name: str | None = Field(default=None, max_length=60)
    last_name: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=40)
    marketing_opt_in: bool | None = None


class VerifyOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new: bool
    user: ProfileOut


class AdminUserOut(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime
    default_address: str
    marketing_opt_in: bool


class NotificationOut(ORM):
    id: int
    type: str
    title: str
    body: str
    is_read: bool
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class IdsIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class ChatIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
    guest_id: str | None = None


class ChatOut(ORM):
    id: int
    sender: str
    body: str
    created_at: datetime


class ChatReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class ChatThreadOut(BaseModel):
    thread_key: str
    name: str
    email: str | None
    last_message: str
    last_at: datetime
    unread: int
