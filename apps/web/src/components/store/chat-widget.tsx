'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMsg } from '@lsf/shared-types';
import { ApiError, WS_ORIGIN } from '@/lib/api';
import { cust, useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { cn } from '@/lib/utils';

const GUEST_KEY = 'lsf-chat-guest';
const body = (b: unknown) => JSON.stringify(b);

function guestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) { id = crypto.randomUUID().replace(/-/g, ''); localStorage.setItem(GUEST_KEY, id); }
  return id;
}

export function ChatWidget() {
  const mounted = useMounted();
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [dot, setDot] = useState(false);
  const [live, setLive] = useState(false);
  const openRef = useRef(open);
  const endRef = useRef<HTMLDivElement>(null);
  openRef.current = open;

  const merge = useCallback((incoming: ChatMsg[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      incoming.forEach((m) => byId.set(m.id, m));
      return [...byId.values()].sort((a, b) => a.id - b.id);
    });
  }, []);
  const gid = useCallback(() => (token ? '' : `?guest_id=${guestId()}`), [token]);

  const loadHistory = useCallback(async () => {
    try { merge(await cust<ChatMsg[]>(`/chat/history${gid()}`)); } catch {}
  }, [gid, merge]);

  // Real-time: WebSocket per conversation, auto-reconnect with backoff. REST polling covers gaps.
  useEffect(() => {
    if (!mounted) return;
    setMessages([]); setLive(false);
    const key = token && user ? `u${user.id}` : `g${guestId()}`;
    let ws: WebSocket | null = null, stop = false, tries = 0, timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(`${WS_ORIGIN}/ws/chat/${key}`);
      ws.onopen = () => ws?.send(JSON.stringify({ token }));
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === 'ready') { setLive(true); tries = 0; }
        if (d.type === 'message') {
          merge([d.message]);
          if (d.message.sender === 'admin' && !openRef.current) setDot(true);
        }
      };
      ws.onclose = () => { setLive(false); if (!stop) timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** tries++)); };
    };
    loadHistory();
    connect();
    return () => { stop = true; clearTimeout(timer); ws?.close(); };
  }, [mounted, token, user, loadHistory, merge]);

  useEffect(() => {
    if (!open) return;
    setDot(false); loadHistory();
    if (live) return;
    const t = setInterval(loadHistory, 8000); // fallback while the socket is down
    return () => clearInterval(t);
  }, [open, live, loadHistory]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const m = await cust<ChatMsg>('/chat/messages', { method: 'POST', body: body({ body: msg, guest_id: token ? undefined : guestId() }) });
      merge([m]); setText('');
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Message not sent. Try again.'); }
    finally { setSending(false); }
  }

  if (!mounted) return null;
  return (
    <>
      {open && (
        <section role="dialog" aria-label="Customer support chat"
          className="fixed bottom-24 left-3 right-3 z-50 flex h-[min(32rem,70vh)] flex-col overflow-hidden rounded-xl border bg-white shadow-2xl animate-fade-in sm:left-auto sm:right-5 sm:w-96">
          <header className="flex items-start justify-between gap-3 bg-brand px-4 py-3 text-white">
            <h2 className="text-sm font-semibold leading-snug">Lu&apos;s Shoe Farm - We want to help you</h2>
            <button aria-label="Close chat" onClick={() => setOpen(false)} className="rounded p-0.5 hover:bg-white/20"><X size={20} /></button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3" aria-live="polite">
            {messages.length === 0 && <p className="mt-8 text-center text-sm text-neutral-600">Ask us about sizes, delivery or an order. We reply here.</p>}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.sender === 'customer' ? 'justify-end' : 'justify-start')}>
                <p className={cn('max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm', m.sender === 'customer' ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border bg-white')}>{m.body}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t bg-white p-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Type your message…" aria-label="Message"
              className="h-11 min-w-0 flex-1 rounded-full border border-neutral-300 px-4 text-sm focus:border-brand focus:outline-none focus:ring-0 outline-none" />
            <button type="submit" disabled={!text.trim() || sending} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:bg-neutral-300"><Send size={18} /></button>
          </form>
        </section>
      )}
      <div className="group fixed bottom-5 right-4 z-50 sm:right-5">
        <span role="tooltip" className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:block">How can we help you?</span>
        <button aria-label={open ? 'Close chat' : 'Chat with us'} aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark">
          {open ? <X size={26} /> : <MessageCircle size={26} />}
          {dot && !open && <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" aria-label="New reply" />}
        </button>
      </div>
    </>
  );
}
