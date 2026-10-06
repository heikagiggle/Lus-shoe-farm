'use client';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';

const PRIMARY = [
  ['Shop', '/shop'], ['New Arrivals', '/new-arrivals'], ['Best Sellers', '/collections/best-sellers'], ['Mature Woman', '/collections/mature-woman'],
];
const CATEGORIES = ['Flats', 'Sandals', 'Heels', 'Boots', 'Slippers'];

export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const authed = useMounted() && !!token;
  const close = () => onOpenChange(false);
  const row = 'block rounded-md px-3 py-3 text-base font-semibold hover:bg-brand-soft';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side='left' className="flex flex-col p-0" aria-describedby="menu-desc">
        <div className="border-b px-5 py-4">
          <DialogTitle className="font-display text-xl sm:text-2xl italic text-brand">Lu&apos;s Shoe Farm</DialogTitle>
          <DialogDescription id="menu-desc" className="sr-only">Site navigation</DialogDescription>
        </div>
        <nav aria-label="Menu" className="flex-1 space-y-6 overflow-y-auto p-3">
          <ul>{PRIMARY.map(([label, href]) => <li key={href}><Link href={href} onClick={close} className={row}>{label}</Link></li>)}</ul>
          <div>
            <p className="px-3 pb-1 text-sm font-semibold text-brand">Categories</p>
            <ul>{CATEGORIES.map((c) => <li key={c}><Link href={`/shop?category=${encodeURIComponent(c)}`} onClick={close} className="block rounded-md px-3 py-2 text-sm hover:bg-brand-soft">{c}</Link></li>)}</ul>
          </div>
        </nav>
        <div className="space-y-1 border-t p-3">
          {authed ? (
            <>
              <p className="truncate px-3 pb-1 text-xs text-neutral-600">{user?.email}</p>
              <Link href="/account/profile" onClick={close} className={row}>My Account</Link>
              <Link href="/account/profile?tab=orders" onClick={close} className={row}>My Orders</Link>
            </>
          ) : (
            <Link href="/auth" onClick={close} className={row}>Login / Register</Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
