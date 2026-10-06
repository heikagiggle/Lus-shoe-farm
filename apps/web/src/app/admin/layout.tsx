'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell, Boxes, FolderHeart, ImageIcon, Mail, MessagesSquare, Settings, ShoppingCart, Users } from 'lucide-react';
import type { AppNotification } from '@lsf/shared-types';
import { adm, clearToken, getToken } from '@/lib/admin';
import { onAdminEvent, useAdminSocket } from '@/lib/admin-socket';
import { NotificationPanel } from '@/components/admin/notification-panel';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/hero', label: 'Hero Slider', icon: ImageIcon },
  { href: '/admin/collections', label: 'Collections', icon: FolderHeart },
  { href: '/admin/inventory', label: 'Shop Inventory', icon: Boxes },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/users', label: 'Registered Users', icon: Users },
  { href: '/admin/messages', label: 'Live Support', icon: MessagesSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [live, setLive] = useState(false);
  const isLogin = path === '/admin/login';

  const loadNotifs = useCallback(() => adm<{ items: AppNotification[]; unread_count: number }>('~/notifications').then((r) => { setNotifs(r.items); setUnread(r.unread_count); }).catch(() => {}), []);
  const loadChat = useCallback(() => adm<{ unread: number }>('/chat/unread').then((r) => setChatUnread(r.unread)).catch(() => {}), []);

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    if (!getToken()) { router.replace('/admin/login'); return; }
    setReady(true);
  }, [isLogin, router]);

  useAdminSocket(ready && !isLogin, setLive);
  useEffect(() => {
    if (!ready || isLogin) return;
    loadNotifs(); loadChat();
    const t = setInterval(() => { loadNotifs(); loadChat(); }, live ? 60000 : 15000); // polling is only a safety net while the socket is up
    const off = onAdminEvent((d) => {
      if (d.type === 'notification') loadNotifs();
      if (d.type === 'message') loadChat();
    });
    const refreshChat = () => loadChat();
    window.addEventListener('lsf-chat-read', refreshChat);
    return () => { clearInterval(t); off(); window.removeEventListener('lsf-chat-read', refreshChat); };
  }, [ready, isLogin, live, loadNotifs, loadChat]);

  function openBell() {
    const next = !bell;
    setBell(next); setMenu(false);
    if (next) loadNotifs().then(() => { adm('~/notifications/mark-read', { method: 'POST' }).then(() => setUnread(0)).catch(() => {}); });
  }

  if (!ready) return null;
  if (isLogin) return <>{children}</>;
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-brand px-4 text-white">
        <Link href="/admin/orders" className="font-display text-xl italic">Lu&apos;s Shoe Farm · Admin</Link>
        <div className="relative flex items-center gap-1">
          <Link href="/admin/messages" aria-label={chatUnread > 0 ? 'Live support, unread messages' : 'Live support'} className="relative rounded-full p-2 hover:bg-white/15">
            <Mail size={20} />
            {chatUnread > 0 && <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-pink-300 ring-2 ring-white" />}
          </Link>
          <button aria-label={`Notifications, ${unread} unread`} aria-expanded={bell} onClick={openBell} className="relative rounded-full p-2 hover:bg-white/15">
            <Bell size={20} />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button aria-label="System settings" onClick={() => { setMenu((m) => !m); setBell(false); }} className="rounded-full p-2 hover:bg-white/15"><Settings size={20} /></button>
          {bell && <NotificationPanel items={notifs} onChange={loadNotifs} onClose={() => setBell(false)} />}
          {menu && (
            <div className="absolute right-0 top-11 w-40 rounded-md bg-white p-1 text-sm text-black shadow-lg">
              <button className="w-full rounded px-3 py-2 text-left hover:bg-neutral-100" onClick={() => { clearToken(); router.replace('/admin/login'); }}>Sign out</button>
              <Link href="/" className="block rounded px-3 py-2 hover:bg-neutral-100">View storefront</Link>
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-col md:flex-row">
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto border-b bg-white p-2 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:w-60 md:flex-col md:border-b-0 md:border-r md:p-3">
          {NAV.map(({ href, label, icon: Icon }, i) => (
            <Link key={href} href={href} className={cn('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-soft', path.startsWith(href) && 'bg-brand text-white hover:bg-brand')}>
              <Icon size={18} />
               {/* <span className="text-xs opacity-70">M{i + 1}</span> */}
                {label}
              {href === '/admin/messages' && chatUnread > 0 && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-pink-300 ring-2 ring-white" />}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
