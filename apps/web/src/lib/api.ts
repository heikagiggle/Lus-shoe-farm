import type { CheckoutResponse, Collection, CollectionWithProducts, Order, Product, ProductPage, Quote, Slide } from '@lsf/shared-types';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const ORIGIN = API.replace(/\/api\/v1$/, '');
export const WS_ORIGIN = ORIGIN.replace(/^http/, 'ws');
export const assetUrl = (u: string) => (u.startsWith('/uploads') ? ORIGIN + u : u);

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const headers: Record<string, string> = { ...(rest.headers as Record<string, string>) };
  if (rest.body && !(rest.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { ...rest, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === 'string' ? j.detail : Array.isArray(j.detail) ? j.detail.map((d: { msg: string }) => d.msg).join(', ') : msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (b: unknown) => JSON.stringify(b);
export const store = {
  hero: () => api<Slide[]>('/hero', { next: { revalidate: 30 } } as RequestInit),
  homeCollections: () => api<CollectionWithProducts[]>('/collections?homepage=true&limit=4', { next: { revalidate: 30 } } as RequestInit),
  collection: (slug: string) => api<Collection>(`/collections/${slug}`, { cache: 'no-store' }),
  categories: () => api<string[]>('/categories'),
  products: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && qs.set(k, String(v)));
    return api<ProductPage>(`/products?${qs}`, { cache: 'no-store' });
  },
  product: (slug: string) => api<Product>(`/products/${slug}`, { cache: 'no-store' }),
  syncCart: (ids: number[]) => api<{ variant_id: number; available: boolean; stock: number; price: number }[]>('/cart/sync', { method: 'POST', body: json(ids) }),
  quote: (b: unknown) => api<Quote>('/orders/quote', { method: 'POST', body: json(b) }),
  createOrder: (b: unknown) => api<CheckoutResponse>('/orders', { method: 'POST', body: json(b) }),
  order: (ref: string) => api<Order>(`/orders/${ref}`, { cache: 'no-store' }),
  verify: (ref: string) => api<Order>(`/payments/paystack/verify/${ref}`),
};
