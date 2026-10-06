'use client';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/store/cart';
import { Gallery } from './gallery';
import { VariantPicker } from './variant-picker';

export function QuickAddModal() {
  const { quickView: p, openQuickView, add } = useCart();
  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && openQuickView(null)}>
      <DialogContent className="max-w-3xl p-5 sm:p-6" aria-describedby="qv-desc">
        {p && (
          <div className="grid gap-6 md:grid-cols-2">
            <Gallery images={p.images} name={p.name} />
            <div className="space-y-4">
              <DialogTitle className="pr-6 font-display text-2xl">{p.name}</DialogTitle>
              <DialogDescription id="qv-desc" className="sr-only">Choose size, color and quantity</DialogDescription>
              <VariantPicker key={p.id} product={p} onAdd={(v, qty) => add(p, v, qty)} />
              <Link href={`/product/${p.slug}`} onClick={() => openQuickView(null)} className="block text-center text-sm underline hover:text-brand">View Full Details</Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
