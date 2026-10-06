'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { buttonVariants } from '@/components/ui/button';
import { cartCount, cartSubtotal, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { assetUrl } from '@/lib/api';
import { cn, naira } from '@/lib/utils';

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, sync } = useCart();
  useEffect(() => { if (open) sync(); }, [open, sync]);
  const count = cartCount(items);
  const authToken = useAuth((st) => st.token);
  const mounted = useMounted();
  const loggedIn = mounted && !!authToken;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent side="right" className="flex flex-col p-0" aria-describedby="cart-desc" hideClose>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <DialogTitle className="text-lg font-bold">Your Cart {count > 0 && <span className="text-brand">({count})</span>}</DialogTitle>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="rounded p-1 text-xl leading-none hover:bg-neutral-100">×</button>
        </div>
        <DialogDescription id="cart-desc" className="sr-only">Items in your shopping cart</DialogDescription>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-lg font-semibold">No items in your cart</p>
            <Link href="/shop" onClick={() => setOpen(false)} className={buttonVariants()}>Continue Shopping</Link>
            {!loggedIn && <p className="text-sm text-neutral-600">Logged in yet? <Link href="/auth" onClick={() => setOpen(false)} className="font-semibold text-brand underline">Login to check out faster</Link></p>}
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {items.map((i) => (
                <li key={i.variantId} className="flex gap-3 py-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
                    {i.image && <Image src={assetUrl(i.image)} alt={i.name} fill sizes="96px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold leading-tight">{i.name}</p>
                      <button onClick={() => remove(i.variantId)} aria-label={`Remove ${i.name}`} className="text-neutral-500 hover:text-brand"><Trash2 size={18} /></button>
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-600">{i.color} · Size {i.size}</p>
                    <p className="text-sm font-semibold">{naira(i.unitPrice)}</p>
                    <div className="mt-2 inline-flex items-center rounded border">
                      <button aria-label="Decrease quantity" className="p-2 hover:bg-neutral-100 disabled:opacity-40" disabled={i.quantity <= 1} onClick={() => setQty(i.variantId, i.quantity - 1)}><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm">{i.quantity}</span>
                      <button aria-label="Increase quantity" className="p-2 hover:bg-neutral-100 disabled:opacity-40" disabled={i.quantity >= i.maxStock} onClick={() => setQty(i.variantId, i.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    {i.quantity >= i.maxStock && <p className="mt-1 text-xs text-brand">Max available: {i.maxStock}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 space-y-3 border-t bg-white px-5 py-4">
              <div className="flex items-center justify-between text-base font-bold"><span>Subtotal</span><span>{naira(cartSubtotal(items))} NGN</span></div>
              <p className="text-xs text-neutral-600">Taxes and shipping are calculated at checkout.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>Checkout</Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
