'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import type { Order } from '@lsf/shared-types';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { store } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { cn, naira } from '@/lib/utils';

export default function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);
  const clear = useCart((s) => s.clear);
  const authToken = useAuth((s) => s.token);
  const mounted = useMounted();
  const loggedIn = mounted && !!authToken;

  useEffect(() => {
    let stop = false, tries = 0;
    const tick = async () => {
      try {
        const o = await store.verify(reference); // confirms with Paystack if the webhook has not arrived yet
        if (stop) return;
        setOrder(o);
        if (o.payment_status === 'paid') { clear(); return; }
        if (++tries < 30) setTimeout(tick, 4000);
      } catch { if (!stop) setError(true); }
    };
    tick();
    return () => { stop = true; };
  }, [reference, clear]);

  if (error) return <p className="py-24 text-center">We couldn&apos;t find that order. Check the link in your confirmation email.</p>;
  if (!order) return <div className="mx-auto max-w-xl p-8"><Skeleton className="h-64 w-full" /></div>;
  const paid = order.payment_status === 'paid';
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display sm:text-3xl text-2xl italic text-brand">{paid ? 'Thank you for your order' : 'Waiting for your payment'}</h1>
      <p className="mt-2 text-neutral-700">Order <strong>{order.reference}</strong> {paid ? <StatusBadge status={order.status} /> : 'will update once your bank transfer is confirmed. This page checks automatically.'}</p>
      <ul className="mt-6 divide-y rounded-lg border">
        {order.items.map((i) => <li key={i.id} className="flex justify-between p-3 text-sm"><span>{i.quantity} × {i.name} ({i.color}, size {i.size})</span><span>{naira(i.unit_price * i.quantity)}</span></li>)}
      </ul>
      <p className="mt-4 text-right text-lg font-bold">Total {naira(order.total)}</p>
      {order.tracking_number && <p className="mt-2 text-sm">Tracking: {order.tracking_number}</p>}
      {paid && !loggedIn && (
        <p className="mt-8 rounded-lg bg-brand-soft p-4 text-sm">
          Want to create an account to track your orders and make future purchases faster?{' '}
          <Link href={`/auth?email=${encodeURIComponent(order.email)}`} className="cursor-pointer font-semibold text-brand underline">Create account</Link>
        </p>
      )}
      <Link href="/shop" className={cn(buttonVariants(), 'mt-6')}>{paid && !loggedIn ? 'No thanks, continue shopping' : 'Continue Shopping'}</Link>
    </div>
  );
}
