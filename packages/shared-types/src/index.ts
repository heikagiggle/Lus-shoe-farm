export interface Variant { id: number; size: number; color: string; price: number; stock: number }
export interface Product {
  id: number; name: string; slug: string; description: string; category: string; images: string[]
  is_new_arrival: boolean; is_active: boolean; is_sold_out: boolean; variants: Variant[]; collection_ids: number[]
}
export interface ProductPage { items: Product[]; next_cursor: number | null }
export interface Collection { id: number; name: string; slug: string; description: string; show_on_homepage: boolean }
export interface CollectionWithProducts extends Collection { products: Product[] }
export interface Slide {
  id: number; position: number; image_url: string; headline: string; subtext: string
  cta_label: string; cta_url: string; is_active: boolean
}
export interface Quote { subtotal: number; shipping_fee: number; vat: number; total: number }
export type OrderStatus = 'awaiting_payment' | 'pending' | 'shipped' | 'received'
export interface OrderItem { id: number; name: string; image: string; size: number; color: string; unit_price: number; quantity: number }
export interface Order extends Quote {
  id: number; reference: string; status: OrderStatus; payment_status: string; email: string
  delivery_method: 'ship' | 'pickup'; shipping_tier: 'flexible' | 'priority'
  name: string; phone: string; address: string; city: string; state: string
  tracking_number: string; notes: string; is_read: boolean; created_at: string; items: OrderItem[]
}
export interface CheckoutResponse { order: Order; access_code: string | null; authorization_url: string | null; mock: boolean }

// ---- phase 2
export interface Profile {
  id: number; email: string; first_name: string; last_name: string; display_name: string
  address: string; city: string; state: string; postal_code: string; phone: string
  marketing_opt_in: boolean; created_at: string
}
export interface VerifyResponse { access_token: string; is_new: boolean; user: Profile }
export interface AdminUser { id: number; email: string; full_name: string; created_at: string; default_address: string; marketing_opt_in: boolean }
export interface AppNotification { id: number; type: 'order' | 'signup' | string; title: string; body: string; is_read: boolean; created_at: string }
export interface ChatMsg { id: number; sender: 'customer' | 'admin'; body: string; created_at: string }
export interface ChatThread { thread_key: string; name: string; email: string | null; last_message: string; last_at: string; unread: number }
