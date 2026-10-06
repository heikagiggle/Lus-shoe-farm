'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import type { VerifyResponse } from '@lsf/shared-types';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { cn } from '@/lib/utils';

const emailSchema = z.string().trim().email('Enter a valid email address');
const EMPTY = ['', '', '', '', '', ''];

export function AuthForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/account/profile';
  const { token, setSession } = useAuth();
  const mounted = useMounted();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(sp.get('email') ?? '');
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const submitting = useRef(false);

  useEffect(() => { if (mounted && token) router.replace(next); }, [mounted, token, next, router]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true); setError('');
    try {
      await api('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email: parsed.data }) });
      setEmail(parsed.data); setDigits(EMPTY); setStep(2); setCooldown(30);
      setTimeout(() => boxes.current[0]?.focus(), 350); // after the slide finishes
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not send the code. Try again.'); }
    finally { setBusy(false); }
  }

  async function verify(code: string) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const r = await api<VerifyResponse>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) });
      setSession(r.access_token, r.user);
      toast.success(r.is_new ? 'Account created. Welcome!' : 'Signed in');
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify the code. Try again.');
      setDigits(EMPTY);
      // refocus the first box, unless the person has already started typing/pasting again
      setTimeout(() => { if (!boxes.current.some((el) => el === document.activeElement)) boxes.current[0]?.focus(); }, 50);
    } finally { submitting.current = false; setBusy(false); }
  }

  function fill(start: number, chars: string) {
    const next6 = [...digits];
    chars.split('').slice(0, 6 - start).forEach((ch, k) => { next6[start + k] = ch; });
    setDigits(next6);
    const last = Math.min(start + chars.length, 5);
    boxes.current[last]?.focus();
    if (next6.every(Boolean)) verify(next6.join('')); // auto-submit on the 6th digit
  }
  const onChange = (i: number, v: string) => { const d = v.replace(/\D/g, ''); if (d) fill(i, d); };
  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const n = [...digits];
      if (n[i]) n[i] = ''; else if (i > 0) { n[i - 1] = ''; boxes.current[i - 1]?.focus(); }
      setDigits(n);
    } else if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '');
    if (d) { e.preventDefault(); fill(0, d); }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <div className="w-full overflow-hidden">
        <div className={cn('flex w-[200%] transition-transform duration-300 ease-out', step === 2 && '-translate-x-1/2')}>
          {/* Step 1 */}
          <form onSubmit={requestCode} inert={step !== 1} className="w-1/2 shrink-0 px-1" noValidate>
            <h1 className="font-display text-4xl italic text-brand">Login / Register</h1>
            <p className="mt-2 text-sm text-neutral-700">Enter your email and we&apos;ll send you a 6-digit code.</p>
            <div className="relative mt-6">
              <input type="email" autoComplete="email" inputMode="email" aria-label="Email address" placeholder="youremail@example.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="h-12 w-full rounded-full border border-neutral-300 pl-5 pr-14 text-sm focus:border-brand focus:outline-none focus:ring-0 outline-none" />
              <button type="submit" disabled={busy} aria-label="Send code" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-70">
                {busy && step === 1 ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
            {step === 1 && error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </form>

          {/* Step 2 */}
          <div inert={step !== 2} className="w-1/2 shrink-0 px-1">
            <button type="button" onClick={() => { setStep(1); setError(''); }} className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-brand"><ArrowLeft size={16} /> Use a different email</button>
            <h1 className="font-display text-4xl italic text-brand">Enter your code</h1>
            <p className="mt-2 text-sm text-neutral-700">We sent a 6-digit code to <strong className="break-all">{email}</strong>. It expires in 10 minutes.</p>
            <div className="mt-6 flex justify-between gap-2" onPaste={onPaste} role="group" aria-label="6-digit code">
              {digits.map((d, i) => (
                <input key={i} ref={(el) => { boxes.current[i] = el; }} value={d} disabled={busy}
                  inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} aria-label={`Digit ${i + 1}`}
                  onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)} onFocus={(e) => e.target.select()}
                  className={cn('h-12 w-12 rounded-full border text-center text-lg font-semibold focus:border-brand focus:outline-none focus:ring-0 outline-none sm:h-14 sm:w-14', d ? 'border-brand' : 'border-neutral-300', error && 'border-red-500')} />
              ))}
            </div>
            <div className="mt-4 flex min-h-6 items-center gap-2 text-sm" aria-live="polite">
              {busy && step === 2 ? <span className="inline-flex items-center gap-2 text-neutral-700"><Loader2 size={16} className="animate-spin" /> Verifying…</span> : error ? <span role="alert" className="text-red-600">{error}</span> : null}
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              Didn&apos;t get it?{' '}
              {cooldown > 0 ? <span>Resend in {cooldown}s</span> : <button type="button" onClick={() => requestCode()} disabled={busy} className="font-semibold text-brand underline">Resend code</button>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
