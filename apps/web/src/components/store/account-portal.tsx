'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LogOut, Package, Pencil, User as UserIcon } from 'lucide-react';
import type { Order, Profile } from '@lsf/shared-types';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { cust, useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { cn, naira } from '@/lib/utils';

type Tab = 'orders' | 'profile';
const body = (b: unknown) => JSON.stringify(b);

function BusyOverlay({ text }: { text: string }) {
  return (
    <div role="alertdialog" aria-live="assertive" aria-label={text} className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-black/85 text-white">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="text-lg font-semibold">{text}</p>
    </div>
  );
}

export function AccountPortal() {
  const router = useRouter();
  const sp = useSearchParams();
  const mounted = useMounted();
  const { token, logout, setUser } = useAuth();
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'profile' ? 'profile' : 'orders');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);

  useEffect(() => { if (mounted && !token && !overlay) router.replace('/auth?next=/account/profile'); }, [mounted, token, overlay, router]);
  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([cust<Profile>('/user/profile'), cust<Order[]>('/user/orders')]);
      setProfile(p); setUser(p); setOrders(o);
    } catch (e) { if (!(e instanceof ApiError && e.status === 401)) toast.error('Could not load your account. Refresh to try again.'); }
  }, [setUser]);
  useEffect(() => { if (mounted && token) load(); }, [mounted, token, load]);

  async function patch(data: Partial<Profile>) {
    const p = await cust<Profile>('/user/profile', { method: 'PATCH', body: body(data) });
    setProfile(p); setUser(p);
    return p;
  }
  async function toggleMarketing() {
    if (!profile) return;
    const prev = profile;
    setProfile({ ...profile, marketing_opt_in: !profile.marketing_opt_in }); // optimistic
    try { await patch({ marketing_opt_in: !prev.marketing_opt_in }); toast.success('Preference saved'); }
    catch { setProfile(prev); toast.error('Could not save your preference.'); }
  }
  async function signOut() {
    setOverlay('Signing out');
    await new Promise((r) => setTimeout(r, 900));
    logout(); router.replace('/');
  }
  async function deleteAccount() {
    setConfirmDelete(false); setOverlay('Deleting...');
    try {
      await cust('/auth/account', { method: 'DELETE' });
      await new Promise((r) => setTimeout(r, 600));
      localStorage.removeItem('lsf-checkout-info'); localStorage.removeItem('lsf-chat-guest');
      logout(); router.replace('/');
    } catch (e) { setOverlay(null); toast.error(e instanceof ApiError ? e.message : 'Could not delete your account. Try again.'); }
  }

  if (!mounted || !token) return <div className="mx-auto max-w-5xl p-8"><Skeleton className="h-72 w-full" /></div>;
  const first = profile ? (profile.first_name || profile.display_name.split(' ')[0]) : '';
  const nav = [{ id: 'orders' as Tab, label: 'Orders', icon: Package }, { id: 'profile' as Tab, label: 'Profile', icon: UserIcon }];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[200px_1fr]">
      <nav aria-label="Account" className="flex gap-2 md:flex-col">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id}
            className={cn('flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold md:flex-none md:justify-start', tab === id ? 'bg-brand text-white' : 'hover:bg-brand-soft')}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      <section className="min-w-0">
        {!profile || !orders ? <Skeleton className="h-64 w-full" /> : tab === 'orders' ? (
          orders.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border py-16 text-center">
              <h1 className="font-display text-2xl sm:text-3xl italic">Welcome {first}, ready to shop?</h1>
              <Link href="/shop" className={buttonVariants({ size: 'lg' })}>Shop Now</Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Your orders</h1>
              {orders.map((o) => (
                <article key={o.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-semibold">{o.reference}</p><p className="text-xs text-neutral-600">{new Date(o.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}</p></div>
                    <StatusBadge status={o.status} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.name} <span className="text-neutral-600">({i.color}, size {i.size})</span></li>)}</ul>
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><span className="text-neutral-600">{o.tracking_number ? `Tracking: ${o.tracking_number}` : ' '}</span><span className="font-bold">{naira(o.total)}</span></div>
                </article>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <button aria-label="Edit name" onClick={() => setNameOpen(true)} className="rounded-full p-2 hover:bg-neutral-100"><Pencil size={18} /></button>
              </div>
              <p className="text-sm text-neutral-600">{profile.email}</p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Delivery address</h2>
                <button aria-label="Edit delivery address" onClick={() => setAddrOpen(true)} className="rounded-full p-2 hover:bg-neutral-100"><Pencil size={18} /></button></div>
              {profile.address || profile.city ? (
                <address className="mt-2 text-sm not-italic leading-relaxed">
                  {profile.address}<br />{[profile.city, profile.state, profile.postal_code].filter(Boolean).join(', ')}<br />{profile.phone}
                </address>
              ) : <p className="mt-2 text-sm text-neutral-600">No delivery address saved yet.</p>}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div><h2 className="font-semibold">Email me news and offers</h2><p className="text-sm text-neutral-600">Occasional updates on new arrivals and sales.</p></div>
              <button role="switch" aria-checked={profile.marketing_opt_in} aria-label="Email me news and offers" onClick={toggleMarketing}
                className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', profile.marketing_opt_in ? 'bg-brand' : 'bg-neutral-300')}>
                <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', profile.marketing_opt_in && 'translate-x-5')} />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 border-t pt-6">
              <Button variant="outline" onClick={signOut}><LogOut size={16} /> Sign out</Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete Account</Button>
            </div>
          </div>
        )}
      </section>

      {profile && <NameModal open={nameOpen} onClose={() => setNameOpen(false)} profile={profile} onSave={async (d) => { await patch(d); toast.success('Name updated'); }} />}
      {profile && <AddressModal open={addrOpen} onClose={() => setAddrOpen(false)} profile={profile} onSave={async (d) => { await patch(d); toast.success('Address saved'); }} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm p-6" aria-describedby="del-desc">
          <DialogTitle className="text-lg font-bold">We are sad to see you go!</DialogTitle>
          <DialogDescription id="del-desc" className="mt-2 text-sm text-neutral-700">Are you sure you want to delete your account? This removes your saved details and signs you out everywhere. Past orders are kept for our records.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my account</Button><Button variant="danger" onClick={deleteAccount}>Yes, delete it</Button></div>
        </DialogContent>
      </Dialog>
      {overlay && <BusyOverlay text={overlay} />}
    </div>
  );
}

function NameModal({ open, onClose, profile, onSave }: { open: boolean; onClose: () => void; profile: Profile; onSave: (d: Partial<Profile>) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { first_name: profile.first_name, last_name: profile.last_name } });
  useEffect(() => { if (open) reset({ first_name: profile.first_name, last_name: profile.last_name }); }, [open, profile, reset]);
  const submit = handleSubmit(async (v) => {
    try { await onSave(v); onClose(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not save'); }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-6" aria-describedby="name-desc">
        <DialogTitle className="text-lg font-bold">Edit name</DialogTitle>
        <DialogDescription id="name-desc" className="sr-only">Update your first and last name</DialogDescription>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="First name (optional)"><Input maxLength={60} autoComplete="given-name" {...register('first_name')} /></Field>
          <Field label="Last name (optional)"><Input maxLength={60} autoComplete="family-name" {...register('last_name')} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const addrSchema = z.object({
  address: z.string().trim().min(5, 'Enter your street address or apartment'),
  city: z.string().trim().min(2, 'Enter your city'),
  state: z.string().trim().min(2, 'Enter your state'),
  postal_code: z.string().trim().max(20).default(''),
  phone: z.string().trim().regex(/^(\+?234|0)\d{10}$/, 'Enter a Nigerian phone number, e.g. 08012345678'),
});
type AddrValues = z.infer<typeof addrSchema>;

function AddressModal({ open, onClose, profile, onSave }: { open: boolean; onClose: () => void; profile: Profile; onSave: (d: Partial<Profile>) => Promise<void> }) {
  const init = (): AddrValues => ({ address: profile.address, city: profile.city, state: profile.state || 'Lagos', postal_code: profile.postal_code, phone: profile.phone });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddrValues>({ resolver: zodResolver(addrSchema), defaultValues: init() });
  useEffect(() => { if (open) reset(init()); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile, reset]);
  const submit = handleSubmit(async (v) => {
    try { await onSave(v); onClose(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not save'); }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-6" aria-describedby="addr-desc">
        <DialogTitle className="text-lg font-bold">Delivery address</DialogTitle>
        <DialogDescription id="addr-desc" className="sr-only">Your default shipping address</DialogDescription>
        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <Field label="Country"><Input value="Nigeria" disabled readOnly /></Field>
          <Field label="Address / Apartment" error={errors.address?.message}><Input autoComplete="street-address" {...register('address')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" error={errors.city?.message}><Input autoComplete="address-level2" {...register('city')} /></Field>
            <Field label="State" error={errors.state?.message}><Input autoComplete="address-level1" {...register('state')} /></Field>
          </div>
          <Field label="Postal code (optional)" error={errors.postal_code?.message}><Input autoComplete="postal-code" {...register('postal_code')} /></Field>
          <Field label="Phone" error={errors.phone?.message}><Input type="tel" autoComplete="tel" {...register('phone')} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>Save address</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
