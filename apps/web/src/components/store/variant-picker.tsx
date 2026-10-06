'use client';
import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product, Variant } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { cn, naira } from '@/lib/utils';

/** Size / colour / quantity with live pricing; options with zero stock are not offered. */
export function VariantPicker({ product, onAdd }: { product: Product; onAdd: (v: Variant, qty: number) => void }) {
  const inStock = useMemo(() => product.variants.filter((v) => v.stock > 0), [product]);
  const sizes = useMemo(() => [...new Set(inStock.map((v) => v.size))].sort((a, b) => a - b), [inStock]);
  const [size, setSize] = useState<number | undefined>(sizes[0]);
  const [color, setColor] = useState<string | undefined>();
  const [qty, setQty] = useState(1);

  const colors = useMemo(() => [...new Set(inStock.filter((v) => v.size === size).map((v) => v.color))], [inStock, size]);
  const activeColor = color && colors.includes(color) ? color : colors[0];
  const variant = inStock.find((v) => v.size === size && v.color === activeColor);
  const q = Math.max(1, Math.min(qty, variant?.stock ?? 1));

  if (!variant) return <Button disabled className="w-full">Sold Out</Button>;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-bold">{naira(variant.price)}</p>
        <p className="text-xs text-neutral-600">Price per pair</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button key={s} type="button" aria-pressed={s === size} onClick={() => setSize(s)}
              className={cn('h-10 min-w-11 rounded border px-3 text-sm font-semibold', s === size ? 'border-brand bg-brand text-white' : 'border-neutral-300 hover:border-brand')}>{s}</button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Color</span>
        <Select value={activeColor} onChange={(e) => setColor(e.target.value)}>{colors.map((c) => <option key={c}>{c}</option>)}</Select>
      </label>
      <div>
        <span className="mb-2 block text-sm font-semibold">Quantity</span>
        <div className="inline-flex items-center rounded border">
          <button type="button" aria-label="Decrease quantity" className="p-3 hover:bg-neutral-100 disabled:opacity-40" disabled={q <= 1} onClick={() => setQty(q - 1)}><Minus size={16} /></button>
          <span className="w-10 text-center font-semibold">{q}</span>
          <button type="button" aria-label="Increase quantity" className="p-3 hover:bg-neutral-100 disabled:opacity-40" disabled={q >= variant.stock} onClick={() => setQty(q + 1)}><Plus size={16} /></button>
        </div>
        {variant.stock <= 5 && <p className="mt-1 text-xs font-medium text-brand">Only {variant.stock} left in this size and color</p>}
      </div>
      <Button size="lg" className="w-full" onClick={() => onAdd(variant, q)}>Add to Cart · {naira(variant.price * q)}</Button>
    </div>
  );
}
