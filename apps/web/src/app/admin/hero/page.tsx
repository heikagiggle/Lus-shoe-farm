'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Slide } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageField } from '@/components/admin/image-field';
import { adm, body } from '@/lib/admin';

type Draft = Omit<Slide, 'id'> & { id?: number };
const blank = (position: number): Draft => ({ position, image_url: '', headline: '', subtext: '', cta_label: 'Shop Now', cta_url: '/new-arrivals', is_active: true });

export default function HeroAdmin() {
  const [slides, setSlides] = useState<Draft[] | null>(null);
  const load = () => adm<Slide[]>('/hero').then(setSlides).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const patch = (i: number, p: Partial<Draft>) => setSlides((s) => s!.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  async function save(i: number) {
    const s = slides![i];
    if (!s.image_url || !s.headline) return toast.error('Add a banner image and headline first.');
    try {
      const { id, ...data } = s;
      await adm(id ? `/hero/${id}` : '/hero', { method: id ? 'PUT' : 'POST', body: body(data) });
      toast.success('Slide saved'); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
  }
  async function remove(i: number) {
    const s = slides![i];
    if (s.id) { await adm(`/hero/${s.id}`, { method: 'DELETE' }); toast.success('Slide deleted'); load(); }
    else setSlides((x) => x!.filter((_, idx) => idx !== i));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Hero Slider</h1>
      <p className="text-sm text-neutral-600">Up to 3 slides on the homepage. Point “Shop Now” at any page, for example a collection: <code>/collections/summer-collection</code>.</p>
      {!slides && <Skeleton className="h-64 w-full" />}
      {slides?.map((s, i) => (
        <section key={s.id ?? `new${i}`} className="space-y-3 rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Slide {i + 1}</h2>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C71585]" checked={s.is_active} onChange={(e) => patch(i, { is_active: e.target.checked })} /> Visible</label></div>
          <Field label="Banner image"><ImageField value={s.image_url} onChange={(v) => patch(i, { image_url: v })} /></Field>
          <Field label="Overlay headline"><Input value={s.headline} onChange={(e) => patch(i, { headline: e.target.value })} /></Field>
          <Field label="Overlay subtext"><Input value={s.subtext} onChange={(e) => patch(i, { subtext: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button label"><Input value={s.cta_label} onChange={(e) => patch(i, { cta_label: e.target.value })} /></Field>
            <Field label="Button destination URL"><Input value={s.cta_url} onChange={(e) => patch(i, { cta_url: e.target.value })} /></Field>
          </div>
          <div className="flex gap-2"><Button onClick={() => save(i)}>Save slide</Button><Button variant="outline" onClick={() => remove(i)}>Delete</Button></div>
        </section>
      ))}
      {slides && slides.length < 3 && <Button variant="outline" onClick={() => setSlides([...slides, blank(slides.length)])}>Add slide</Button>}
    </div>
  );
}
