'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Collection } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { adm, body } from '@/lib/admin';

const schema = z.object({ name: z.string().min(2, 'Give the collection a name'), description: z.string().default(''), show_on_homepage: z.boolean().default(false) });
type V = z.infer<typeof schema>;

export default function CollectionsAdmin() {
  const [list, setList] = useState<Collection[] | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });
  const load = () => adm<Collection[]>('/collections').then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (v: V) => {
    try { await adm('/collections', { method: 'POST', body: body(v) }); toast.success('Collection created'); reset({ name: '', description: '', show_on_homepage: false }); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create'); }
  };
  const toggle = async (c: Collection) => { await adm(`/collections/${c.id}`, { method: 'PUT', body: body({ ...c, show_on_homepage: !c.show_on_homepage }) }); load(); };
  const del = async (c: Collection) => {
    if (!confirm(`Delete “${c.name}”? Products stay in your shop.`)) return;
    await adm(`/collections/${c.id}`, { method: 'DELETE' }); toast.success('Collection deleted'); load();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Collections</h1>
      <form onSubmit={handleSubmit(create)} className="max-w-xl space-y-3 rounded-lg border bg-white p-5">
        <Field label="Collection name" error={errors.name?.message}><Input {...register('name')} /></Field>
        <Field label="Description"><Textarea rows={3} {...register('description')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C71585]" {...register('show_on_homepage')} /> Display on homepage</label>
        <p className="text-xs text-neutral-600">The URL is created from the name (e.g. “Summer Collection” becomes /collections/summer-collection). Renaming later never changes the URL.</p>
        <Button type="submit" disabled={isSubmitting}>Create collection</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!list && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        {list?.length === 0 && <p className="text-sm text-neutral-600">No collections yet. Create your first one above.</p>}
        {list?.map((c) => (
          <article key={c.id} className="relative rounded-lg border bg-white p-4">
            <button onClick={() => del(c)} aria-label={`Delete ${c.name}`} className="absolute right-3 top-3 text-neutral-500 hover:text-red-600"><Trash2 size={18} /></button>
            <h2 className="pr-8 font-semibold">{c.name}</h2>
            <p className="text-xs text-neutral-500">/collections/{c.slug}</p>
            <p className="mt-2 line-clamp-2 text-sm text-neutral-700">{c.description}</p>
            <button onClick={() => toggle(c)} className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${c.show_on_homepage ? 'bg-brand text-white' : 'bg-neutral-200'}`}>{c.show_on_homepage ? 'On homepage' : 'Hidden from homepage'}</button>
          </article>
        ))}
      </div>
    </div>
  );
}
