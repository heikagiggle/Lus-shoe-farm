'use client';
import { useEffect, useRef } from 'react';
import { WS_ORIGIN } from './api';
import { getToken } from './admin';

export const ADMIN_EVENT = 'lsf-admin';

/** One admin WebSocket (opened by the admin layout). Events are re-dispatched on `window`
 *  so any admin page can listen without opening its own socket. Reconnects with backoff. */
export function useAdminSocket(enabled: boolean, onStatus?: (live: boolean) => void) {
  const status = useRef(onStatus);
  status.current = onStatus;
  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null, stop = false, tries = 0, timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(`${WS_ORIGIN}/ws/admin`);
      ws.onopen = () => ws?.send(JSON.stringify({ token: getToken() }));
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === 'ready') { tries = 0; status.current?.(true); }
        else window.dispatchEvent(new CustomEvent(ADMIN_EVENT, { detail: d }));
      };
      ws.onclose = () => { status.current?.(false); if (!stop) timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** tries++)); };
    };
    connect();
    return () => { stop = true; clearTimeout(timer); ws?.close(); };
  }, [enabled]);
}

export function onAdminEvent(handler: (d: { type: string; [k: string]: unknown }) => void) {
  const fn = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(ADMIN_EVENT, fn);
  return () => window.removeEventListener(ADMIN_EVENT, fn);
}
