'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CheckSquare, Trash2, UserPlus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import type { AppNotification } from '@lsf/shared-types';
import { adm, body } from '@/lib/admin';
import { cn } from '@/lib/utils';

interface Props { items: AppNotification[]; onChange: () => void; onClose: () => void }

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(iso).toLocaleDateString('en-NG', { dateStyle: 'medium' });
};

/** Dropdown list with per-item delete, long-press (touch) to start selecting, and multi-select bulk delete. */
export function NotificationPanel({ items, onChange, onClose }: Props) {
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  // keep "new" markers for what was unread when the panel opened
  const [fresh] = useState(() => new Set(items.filter((n) => !n.is_read).map((n) => n.id)));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const toggle = (id: number) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const startPress = (id: number) => {
    longPressed.current = false;
    press.current = setTimeout(() => { longPressed.current = true; setSelecting(true); setPicked(new Set([id])); navigator.vibrate?.(15); }, 500);
  };
  const cancelPress = () => { if (press.current) clearTimeout(press.current); };
  // Lifting the finger after a long-press makes the browser fire a click on the item; swallow that one click.
  const endPress = () => { cancelPress(); if (longPressed.current) setTimeout(() => { longPressed.current = false; }, 400); };

  async function del(ids: number[]) {
    try {
      if (ids.length === 1) await adm(`~/notifications/${ids[0]}`, { method: 'DELETE' });
      else await adm('~/notifications/batch', { method: 'DELETE', body: body({ ids }) });
      setPicked(new Set()); setSelecting(false); onChange();
      toast.success(ids.length === 1 ? 'Notification deleted' : `${ids.length} notifications deleted`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete'); }
  }
  const allSelected = items.length > 0 && picked.size === items.length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Notifications" className="fixed inset-x-2 top-16 z-50 flex max-h-[75vh] flex-col rounded-lg border bg-white text-black shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-semibold">{selecting ? `${picked.size} selected` : 'Notifications'}</h2>
          <div className="flex items-center gap-2 text-sm">
            {selecting ? (
              <>
                <button className="font-semibold text-brand" onClick={() => setPicked(allSelected ? new Set() : new Set(items.map((n) => n.id)))}>{allSelected ? 'Clear' : 'Select all'}</button>
                <button disabled={!picked.size} onClick={() => del([...picked])} className="rounded bg-red-600 px-2 py-1 font-semibold text-white disabled:opacity-40">Delete</button>
                <button className="text-neutral-600" onClick={() => { setSelecting(false); setPicked(new Set()); }}>Cancel</button>
              </>
            ) : items.length > 0 && (
              <button className="inline-flex items-center gap-1 font-semibold text-brand" onClick={() => setSelecting(true)}><CheckSquare size={16} /> Select</button>
            )}
          </div>
        </div>
        <ul className="flex-1 divide-y overflow-y-auto">
          {items.length === 0 && <li className="p-8 text-center text-sm text-neutral-600">No notifications. New paid orders and signups show up here.</li>}
          {items.map((n) => {
            const Icon = n.type === 'order' ? ShoppingBag : UserPlus;
            const href = n.type === 'order' ? '/admin/orders' : '/admin/users';
            const on = picked.has(n.id);
            return (
              <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3 select-none', on && 'bg-brand-soft')}
                onTouchStart={() => !selecting && startPress(n.id)} onTouchEnd={endPress} onTouchMove={cancelPress} onContextMenu={(e) => longPressed.current && e.preventDefault()}>
                {selecting && <input type="checkbox" aria-label={`Select ${n.title}`} checked={on} onChange={() => toggle(n.id)} className="mt-1 h-5 w-5 accent-[#C71585]" />}
                <Icon size={18} className="mt-0.5 shrink-0 text-brand" />
                <Link href={href} onClick={(e) => { if (longPressed.current) { e.preventDefault(); return; } if (selecting) { e.preventDefault(); toggle(n.id); } else onClose(); }} className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">{n.title}{fresh.has(n.id) && <span className="h-2 w-2 rounded-full bg-brand" aria-label="New" />}</p>
                  {n.body && <p className="truncate text-xs text-neutral-700">{n.body}</p>}
                  <p className="text-xs text-neutral-500">{ago(n.created_at)}</p>
                </Link>
                {!selecting && <button aria-label={`Delete ${n.title}`} onClick={() => del([n.id])} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-red-600"><Trash2 size={16} /></button>}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
