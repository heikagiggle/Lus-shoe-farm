'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Quote } from '@lsf/shared-types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, assetUrl, store } from '@/lib/api';
import { openBankTransfer } from '@/lib/paystack';
import { cartSubtotal, useCart } from '@/store/cart';
import { cust, useAuth } from '@/store/auth';
import { cn, naira } from '@/lib/utils';

const base = z.object({
  email: z.string().email('Enter a valid email address'),
  marketing_opt_in: z.boolean().default(false),
  save_info: z.boolean().default(false),
  shipping_tier: z.enum(['flexible', 'priority']),
  name: z.string().default(''), phone: z.string().default(''), address: z.string().default(''),
  city: z.string().default(''), state: z.string().default(''),
});
type FormValues = z.infer<typeof base>;
const shipSchema = base.extend({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().regex(/^(\+?234|0)\d{10}$/, 'Enter a Nigerian phone number, e.g. 08012345678'),
  address: z.string().min(5, 'Enter your street address'),
  city: z.string().min(2, 'Enter your city'),
  state: z.string().min(2, 'Enter your state'),
});
const SAVED = 'lsf-checkout-info';

export default function Checkout() {
  const router = useRouter();
  const { items, clear, sync } = useCart();
  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState<'ship' | 'pickup'>('ship');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [paying, setPaying] = useState(false);
  const token = useAuth((st) => st.token);

  const form = useForm<FormValues>({
    resolver: (values, ctx, opts) => zodResolver(method === 'ship' ? shipSchema : base)(values, ctx, opts),
    defaultValues: { email: '', marketing_opt_in: false, save_info: false, shipping_tier: 'flexible', name: '', phone: '', address: '', city: '', state: 'Lagos' },
  });
  const { register, handleSubmit, watch, reset, formState: { errors } } = form;
  const tier = watch('shipping_tier'), state = watch('state');

  useEffect(() => {
    setMounted(true); sync();
    try { const s = localStorage.getItem(SAVED); if (s) reset({ ...JSON.parse(s), save_info: true }); } catch {}
    if (token) {
      // Signed-in customers get their saved profile address pre-filled (it wins over the local "save info" copy).
      cust<Profile>('/user/profile').then((p) => reset((cur) => ({
        ...cur, email: p.email, marketing_opt_in: p.marketing_opt_in,
        name: p.display_name && !p.display_name.includes('@') && (p.first_name || p.last_name) ? p.display_name : cur.name,
        phone: p.phone || cur.phone, address: p.address || cur.address, city: p.city || cur.city, state: p.state || cur.state || 'Lagos',
      }))).catch(() => {});
    }
  }, [sync, reset, token]);

  const lines = items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }));
  const linesKey = JSON.stringify(lines);
  useEffect(() => {
    if (!mounted || !items.length) return;
    const t = setTimeout(() => {
      store.quote({ delivery_method: method, shipping_tier: tier, state, items: lines }).then(setQuote)
        .catch((e) => { if (e instanceof ApiError && e.status === 409) toast.error(e.message); });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, method, tier, state, linesKey]);

  async function onSubmit(v: FormValues) {
    setPaying(true);
    try {
      if (v.save_info) localStorage.setItem(SAVED, JSON.stringify({ email: v.email, name: v.name, phone: v.phone, address: v.address, city: v.city, state: v.state, shipping_tier: v.shipping_tier }));
      else localStorage.removeItem(SAVED);
      const { order, access_code, authorization_url, mock } = await store.createOrder({
        email: v.email, marketing_opt_in: v.marketing_opt_in, delivery_method: method, shipping_tier: v.shipping_tier,
        name: v.name, phone: v.phone, address: v.address, city: v.city, state: v.state, items: lines,
      });
      const done = () => { clear(); router.push(`/order/${order.reference}`); };
      if (mock) { await store.verify(order.reference); toast.info('Mock payment confirmed (dev mode).'); done(); return; }
      if (access_code) {
        await openBankTransfer(access_code, {
          onSuccess: done,
          onCancel: () => { toast('Payment cancelled. Your cart is saved.'); setPaying(false); },
          onError: (m) => { toast.error(m); setPaying(false); },
        });
        return;
      }
      if (authorization_url) window.location.href = authorization_url;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  if (!mounted) return <div className="mx-auto max-w-6xl p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/shop" className={cn(buttonVariants(), 'mt-5')}>Continue Shopping</Link>
      </div>
    );
  }
  const subtotal = cartSubtotal(items);
  const tiers = [
    { id: 'flexible', label: 'Flexible', sub: '2–3 days', price: '₦4,750' },
    { id: 'priority', label: 'Priority', sub: 'Same-day Island / Next-day Mainland', price: '₦7,000' },
  ] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_420px]">
      {paying && (
        <div role="progressbar" aria-label="Taking you to Paystack" className="fixed inset-x-0 bottom-0 z-[60] h-1.5 overflow-hidden bg-brand-soft">
          <div className="h-full w-1/3 animate-progress bg-brand" />
        </div>
      )}
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Contact</h2>
          <Field label="Email address" error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C71585]" {...register('marketing_opt_in')} /> Email me with news and offers</label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Delivery</h2>
          <Tabs value={method} onValueChange={(v) => setMethod(v as 'ship' | 'pickup')}>
            <TabsList><TabsTrigger value="ship">Ship</TabsTrigger><TabsTrigger value="pickup">Pickup</TabsTrigger></TabsList>
            <TabsContent value="ship" className="space-y-3">
              <Field label="Country"><Input value="Nigeria" disabled readOnly /></Field>
              <Field label="Full name" error={errors.name?.message}><Input autoComplete="name" {...register('name')} /></Field>
              <Field label="Address / Apartment" error={errors.address?.message}><Input autoComplete="street-address" {...register('address')} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City" error={errors.city?.message}><Input autoComplete="address-level2" {...register('city')} /></Field>
                <Field label="State" error={errors.state?.message}><Input autoComplete="address-level1" {...register('state')} /></Field>
              </div>
              <Field label="Phone" error={errors.phone?.message}><Input type="tel" autoComplete="tel" {...register('phone')} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C71585]" {...register('save_info')} /> Save this information for next time</label>
            </TabsContent>
            <TabsContent value="pickup" className="space-y-3 rounded-md border p-4 text-sm">
              <p className="font-semibold">Lu&apos;s Shoe Farm Store, Lekki Phase 1, Lagos <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-xs text-brand">Free</span></p>
              <p className="text-neutral-700">We&apos;ll email you when your order is ready. Bring your order number and a valid ID.</p>
              <Field label="Phone (for pickup updates)" error={errors.phone?.message}><Input type="tel" {...register('phone')} /></Field>
            </TabsContent>
          </Tabs>
        </section>

        {method === 'ship' && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Shipping method</h2>
            <div className="space-y-2" role="radiogroup">
              {tiers.map((t) => (
                <label key={t.id} className={cn('flex cursor-pointer items-center justify-between rounded-md border p-4', tier === t.id && 'border-brand bg-brand-soft')}>
                  <span className="flex items-center gap-3">
                    <input type="radio" value={t.id} className="accent-[#C71585]" {...register('shipping_tier')} />
                    <span><span className="block font-semibold">{t.label}</span><span className="text-sm text-neutral-700">{t.sub}</span></span>
                  </span>
                  <span className="font-semibold">{t.price}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Payment</h2>
          <p className="rounded-md border p-4 text-sm text-neutral-700">Pay by direct bank transfer through Paystack. Card payments are not available.</p>
          <Button type="submit" size="lg" className="w-full" disabled={paying || !quote} aria-busy={paying}>
            {paying ? <><Loader2 size={18} className="animate-spin" /> Redirecting to Paystack…</> : `Pay Now${quote ? ` · ${naira(quote.total)}` : ''}`}
          </Button>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-lg bg-neutral-50 p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="space-y-3 max-h-[300px] overflow-y-auto pb-4 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-200">
                {i.image && <Image src={assetUrl(i.image)} alt={i.name} fill sizes="64px" className="object-cover" />}
                <span className="absolute -right-0 -top-0 rounded-bl bg-brand px-1.5 text-xs font-bold text-white">{i.quantity}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
                <p className="truncate font-medium">{i.name}</p>
                <p className="mt-0.5 flex gap-1 text-xs"><span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-neutral-200">Size {i.size}</span><span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-neutral-200">{i.color}</span></p>
                <p className="text-sm font-semibold">{naira(i.unitPrice * i.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{naira(quote?.subtotal ?? subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{quote ? (quote.shipping_fee === 0 ? 'Free' : naira(quote.shipping_fee)) : '—'}</dd></div>
          <div className="flex justify-between"><dt>Estimated VAT</dt><dd>{quote ? naira(quote.vat) : '—'}</dd></div>
          <div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Total</dt><dd>{quote ? naira(quote.total) : '—'}</dd></div>
        </dl>
        <p className="flex flex-wrap gap-x-4 text-xs underline">
          <Link href="/policies/refund-policy">Refund Policy</Link><Link href="/policies/privacy-policy">Privacy Policy</Link><Link href="/policies/terms-of-service">Terms of Service</Link>
        </p>
      </aside>
    </form>
  );
}
