'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMsg, ChatThread } from '@lsf/shared-types';
import { Skeleton } from '@/components/ui/skeleton';
import { adm, body } from '@/lib/admin';
import { onAdminEvent } from '@/lib/admin-socket';
import { cn } from '@/lib/utils';

export default function MessagesAdmin() {
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const activeRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  activeRef.current = active;

  const loadThreads = useCallback(() => adm<ChatThread[]>('/chat/threads').then(setThreads).catch(() => setThreads([])), []);
  const markRead = useCallback((key: string) => adm(`/chat/threads/${key}/read`, { method: 'POST' }).then(() => { window.dispatchEvent(new Event('lsf-chat-read')); loadThreads(); }).catch(() => {}), [loadThreads]);

  async function open(key: string) {
    setActive(key);
    try { setMsgs(await adm<ChatMsg[]>(`/chat/threads/${key}`)); markRead(key); } catch { toast.error('Could not load the conversation.'); }
  }
  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => onAdminEvent((d) => {
    if (d.type !== 'message') return;
    const key = d.thread_key as string, m = d.message as ChatMsg;
    if (key === activeRef.current) {
      setMsgs((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]));
      if (m.sender === 'customer') markRead(key);
    }
    loadThreads();
  }), [loadThreads, markRead]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim() || sending) return;
    setSending(true);
    try {
      const m = await adm<ChatMsg>(`/chat/threads/${active}/messages`, { method: 'POST', body: body({ body: text.trim() }) });
      setMsgs((p) => (p.some((x) => x.id === m.id) ? p : [...p, m])); setText('');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Reply not sent'); } finally { setSending(false); }
  }
  const current = threads?.find((t) => t.thread_key === active);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Live Support</h1>
      <div className="grid h-[calc(100vh-14rem)] min-h-[420px] overflow-hidden rounded-lg border bg-white md:grid-cols-[320px_1fr]">
        <aside className={cn('overflow-y-auto border-r', active && 'hidden md:block')}>
          {!threads && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
          {threads?.length === 0 && <p className="p-6 text-center text-sm text-neutral-600">No conversations yet. Customer messages from the chat widget appear here instantly.</p>}
          {threads?.map((t) => (
            <button key={t.thread_key} onClick={() => open(t.thread_key)} className={cn('flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-neutral-50', t.thread_key === active && 'bg-brand-soft')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="truncate text-xs text-neutral-600">{t.last_message}</p>
              </div>
              {t.unread > 0 && <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{t.unread}</span>}
            </button>
          ))}
        </aside>
        <section className={cn('flex min-h-0 flex-col', !active && 'hidden md:flex')}>
          {!active ? <p className="m-auto text-sm text-neutral-600">Select a conversation to read and reply.</p> : (
            <>
              <header className="flex items-center gap-2 border-b px-4 py-3">
                <button aria-label="Back to conversations" className="md:hidden" onClick={() => setActive(null)}><ArrowLeft size={20} /></button>
                <div><p className="font-semibold">{current?.name ?? 'Conversation'}</p>{current?.email && <p className="text-xs text-neutral-600">{current.email}</p>}</div>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
                {msgs.map((m) => (
                  <div key={m.id} className={cn('flex', m.sender === 'admin' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', m.sender === 'admin' ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border bg-white')}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={cn('mt-1 text-[10px]', m.sender === 'admin' ? 'text-white/80' : 'text-neutral-500')}>{new Date(m.created_at).toLocaleTimeString('en-NG', { timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={reply} className="flex gap-2 border-t p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Type your reply…" aria-label="Reply" className="h-11 min-w-0 flex-1 rounded-full border border-neutral-300 px-4 text-sm focus:border-brand focus:outline-none focus:ring-0 outline-none" />
                <button type="submit" disabled={!text.trim() || sending} aria-label="Send reply" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:bg-neutral-300"><Send size={18} /></button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
