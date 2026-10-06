'use client';
import type { Product } from '@lsf/shared-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCart } from '@/store/cart';
import { Gallery } from './gallery';
import { VariantPicker } from './variant-picker';

const FAQS = [
  ['How do I choose my size?', 'Our shoes run true to size (EU 37–43). If you are between sizes, go up one.'],
  ['How long does delivery take?', 'Flexible: 2–3 days. Priority: same-day on the Island, next-day on the Mainland.'],
  ['Can I pay by card?', 'Checkout uses Paystack bank transfer only.'],
];

export function ProductDetail({ product: p }: { product: Product }) {
  const add = useCart((s) => s.add);
  const soldOut = p.is_sold_out;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={p.images} name={p.name} priority />
        <div className="space-y-5">
          <p className="text-sm text-neutral-600">{p.category}</p>
          <h1 className="font-display text-4xl italic">{p.name}</h1>
          {soldOut ? <Button disabled className="w-full">Sold Out</Button> : <VariantPicker product={p} onAdd={(v, q) => add(p, v, q)} />}
        </div>
      </div>
      <Tabs defaultValue="details" className="mt-12 max-w-3xl">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>
        <TabsContent value="details"><p className="leading-relaxed">{p.description}</p></TabsContent>
        <TabsContent value="reviews"><p className="text-neutral-600">No reviews yet. Reviews will appear here once customers start rating this pair.</p></TabsContent>
        <TabsContent value="faqs">
          <dl className="space-y-4">{FAQS.map(([q, a]) => <div key={q}><dt className="font-semibold">{q}</dt><dd className="text-neutral-700">{a}</dd></div>)}</dl>
        </TabsContent>
      </Tabs>
    </div>
  );
}
