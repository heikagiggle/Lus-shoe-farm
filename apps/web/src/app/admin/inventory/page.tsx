'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Collection, Product } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { ProductEditor } from '@/components/admin/product-editor';
import { adm, body } from '@/lib/admin';
import { assetUrl } from '@/lib/api';
import { naira } from '@/lib/utils';

export default function InventoryAdmin() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    adm<Product[]>('/products').then(setProducts).catch((e) => toast.error(e.message));
    adm<Collection[]>('/collections').then(setCollections).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const remove = async (ids: number[]) => {
    if (!confirm(`Delete ${ids.length} product${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    try { await adm('/products/bulk-delete', { method: 'POST', body: body({ ids }) }); toast.success('Deleted'); setSelected([]); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  };
  const allIds = products?.map((p) => p.id) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shop Inventory</h1>
        <div className="flex gap-2">
          {selected.length > 0 && <Button variant="danger" onClick={() => remove(selected)}><Trash2 size={16} /> Delete {selected.length} selected</Button>}
          <Button onClick={() => { setEditing(null); setOpen(true); }}>Add product</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-100"><tr>
            <th className="w-10 p-3"><input type="checkbox" aria-label="Select all" className="accent-[#C71585]" checked={!!allIds.length && selected.length === allIds.length} onChange={(e) => setSelected(e.target.checked ? allIds : [])} /></th>
            <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {!products && <TableRowsSkeleton cols={7} />}
            {products?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-neutral-600">No products yet. Add your first product.</td></tr>}
            {products?.map((p) => {
              const total = p.variants.reduce((n, v) => n + v.stock, 0);
              const prices = p.variants.map((v) => v.price);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3"><input type="checkbox" aria-label={`Select ${p.name}`} className="accent-[#C71585]" checked={selected.includes(p.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((i) => i !== p.id)))} /></td>
                  <td className="p-3"><div className="flex items-center gap-3"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-neutral-100">{p.images[0] && <Image src={assetUrl(p.images[0])} alt="" fill sizes="48px" className="object-cover" />}</div><span className="font-medium">{p.name}</span></div></td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{prices.length ? naira(Math.min(...prices)) : '—'}</td>
                  <td className="p-3">{total} <span className="text-xs text-neutral-500">({p.variants.length} variants)</span></td>
                  <td className="p-3">{p.is_sold_out ? <span className="rounded bg-black px-2 py-0.5 text-xs text-white">Sold Out</span> : p.is_active ? <span className="text-green-700">Live</span> : <span className="text-neutral-500">Hidden</span>}</td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    <button aria-label={`Edit ${p.name}`} className="rounded p-2 hover:bg-neutral-100" onClick={() => { setEditing(p); setOpen(true); }}><Pencil size={16} /></button>
                    <button aria-label={`Delete ${p.name}`} className="rounded p-2 hover:bg-neutral-100 hover:text-red-600" onClick={() => remove([p.id])}><Trash2 size={16} /></button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ProductEditor product={editing} collections={collections} open={open} onClose={() => setOpen(false)} onSaved={load} />
    </div>
  );
}
