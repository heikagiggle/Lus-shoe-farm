'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Variant } from '@lsf/shared-types';
import { store as apiStore } from '@/lib/api';

export interface CartItem {
  variantId: number; productId: number; slug: string; name: string; image: string
  size: number; color: string; unitPrice: number; quantity: number; maxStock: number
}
interface CartState {
  items: CartItem[]; open: boolean; quickView: Product | null
  add: (p: Product, v: Variant, qty: number) => void
  setQty: (variantId: number, qty: number) => void
  remove: (variantId: number) => void
  clear: () => void
  setOpen: (o: boolean) => void
  openQuickView: (p: Product | null) => void
  sync: () => Promise<void>
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], open: false, quickView: null,
      add: (p, v, qty) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === v.id);
          const quantity = Math.min(v.stock, (existing?.quantity ?? 0) + qty);
          const item: CartItem = {
            variantId: v.id, productId: p.id, slug: p.slug, name: p.name, image: p.images[0] ?? '',
            size: v.size, color: v.color, unitPrice: v.price, quantity, maxStock: v.stock,
          };
          return { items: existing ? s.items.map((i) => (i.variantId === v.id ? item : i)) : [...s.items, item], open: true, quickView: null };
        }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.variantId === id ? { ...i, quantity: Math.max(1, Math.min(i.maxStock, qty)) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.variantId !== id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
      openQuickView: (quickView) => set({ quickView }),
      // Re-sync persisted cart with live stock/prices; drop sold-out lines, clamp quantities.
      sync: async () => {
        const items = get().items;
        if (!items.length) return;
        try {
          const live = await apiStore.syncCart(items.map((i) => i.variantId));
          const byId = new Map(live.map((l) => [l.variant_id, l]));
          set({
            items: items.flatMap((i) => {
              const l = byId.get(i.variantId);
              if (!l || !l.available) return [];
              return [{ ...i, unitPrice: l.price, maxStock: l.stock, quantity: Math.min(i.quantity, l.stock) }];
            }),
          });
        } catch {}
      },
    }),
    { name: 'lsf-cart', partialize: (s) => ({ items: s.items }) },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
