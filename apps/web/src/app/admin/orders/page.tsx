'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Order } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { adm, body } from '@/lib/admin';
import { naira } from '@/lib/utils';

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [view, setView] = useState<Order | null>(null);
  const [tracking, setTracking] = useState('');

  const load = useCallback(async () => {
    try { setOrders(await adm<Order[]>('/orders')); adm('/orders/mark-read', { method: 'POST' }).catch(() => {}); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not load orders'); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function advance(o: Order, status: 'shipped' | 'received') {
    try {
      const u = await adm<Order>(`/orders/${o.id}/status`, { method: 'PATCH', body: body({ status, tracking_number: status === 'shipped' ? tracking : '' }) });
      toast.success(status === 'shipped' ? 'Marked as shipped. Tracking email sent.' : 'Marked as received.');
      setView(u); setTracking(''); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-100"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Placed</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {!orders && <TableRowsSkeleton cols={6} />}
            {orders?.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-neutral-600">No paid orders yet. New orders appear here after the bank transfer is confirmed.</td></tr>}
            {orders?.map((o) => (
              <tr key={o.id} className="cursor-pointer border-t hover:bg-neutral-50" onClick={() => { setView(o); setTracking(o.tracking_number); }}>
                <td className="p-3 font-medium">{o.reference}</td><td className="p-3">{o.name || o.email}</td>
                <td className="p-3">{o.items.reduce((n, i) => n + i.quantity, 0)}</td><td className="p-3">{naira(o.total)}</td>
                <td className="p-3">{new Date(o.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg space-y-4 p-6" aria-describedby="od-desc">
          {view && (
            <>
              <DialogTitle className="text-lg font-bold">Order {view.reference} <StatusBadge status={view.status} /></DialogTitle>
              <DialogDescription id="od-desc" className="sr-only">Order details and status actions</DialogDescription>
              <div className="text-sm"><p className="font-semibold">{view.name}</p><p>{view.email} · {view.phone}</p>
                <p>{view.delivery_method === 'pickup' ? 'Pickup: ' : ''}{view.address}{view.city && `, ${view.city}`}{view.state && `, ${view.state}`}</p>
                <p className="text-neutral-600">Shipping: {view.delivery_method === 'pickup' ? 'Store pickup' : view.shipping_tier}</p></div>
              <ul className="divide-y rounded border text-sm">{view.items.map((i) => <li key={i.id} className="flex justify-between p-2"><span>{i.quantity} × {i.name} ({i.color}, {i.size})</span><span>{naira(i.unit_price * i.quantity)}</span></li>)}</ul>
              <p className="text-right font-bold">Total {naira(view.total)}</p>
              {view.notes && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{view.notes}</p>}
              {view.status === 'pending' && (<div className="space-y-2"><Input placeholder="Tracking number (optional)" value={tracking} onChange={(e) => setTracking(e.target.value)} /><Button className="w-full" onClick={() => advance(view, 'shipped')}>Mark as shipped</Button></div>)}
              {view.status === 'shipped' && <Button className="w-full" onClick={() => advance(view, 'received')}>Mark as received</Button>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
