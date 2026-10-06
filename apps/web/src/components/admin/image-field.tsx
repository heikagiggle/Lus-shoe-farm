'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { adm } from '@/lib/admin';

/** URL input + upload button (uploads go to the API's /uploads folder). */
export function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await adm<{ url: string }>('/upload', { method: 'POST', body: fd });
      onChange(r.url);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed'); } finally { setBusy(false); }
  }
  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
      <label className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
        {busy ? 'Uploading…' : 'Upload'}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
    </div>
  );
}
