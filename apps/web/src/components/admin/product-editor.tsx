'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Collection, Product } from '@lsf/shared-types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { ImageField } from './image-field';
import { adm, body } from '@/lib/admin';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Flat Slippers', 'Sandals', 'Boots', 'Flat Shoes', 'Heel Sandals', 'Stilettos'];
const SIZES = [37, 38, 39, 40, 41, 42, 43];
interface Row { size: number; color: string; price: number; stock: number }

export function ProductEditor({ product, collections, open, onClose, onSaved }: {
  product: Product | null; collections: Collection[]; open: boolean; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(''); const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState(''); const [images, setImages] = useState<string[]>(['']);
  const [isNew, setIsNew] = useState(false); const [active, setActive] = useState(true);
  const [colIds, setColIds] = useState<number[]>([]); const [rows, setRows] = useState<Row[]>([]);
  const [sizes, setSizes] = useState<number[]>([]); const [colors, setColors] = useState('');
  const [price, setPrice] = useState(0); const [stock, setStock] = useState(0); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? ''); setCategory(product?.category ?? CATEGORIES[0]); setDescription(product?.description ?? '');
    setImages(product?.images.length ? product.images : ['']); setIsNew(product?.is_new_arrival ?? false); setActive(product?.is_active ?? true);
    setColIds(product?.collection_ids ?? []); setRows(product?.variants.map(({ size, color, price, stock }) => ({ size, color, price, stock })) ?? []);
    setSizes([]); setColors(''); setPrice(product?.variants[0]?.price ?? 0); setStock(0);
  }, [open, product]);

  // Build size x colour rows without overwriting ones that already exist.
  function generate() {
    const cs = colors.split(',').map((c) => c.trim()).filter(Boolean);
    if (!sizes.length || !cs.length) return toast.error('Pick at least one size and enter at least one color.');
    const have = new Set(rows.map((r) => `${r.size}|${r.color.toLowerCase()}`));
    const add = sizes.flatMap((s) => cs.map((c) => ({ size: s, color: c, price, stock }))).filter((r) => !have.has(`${r.size}|${r.color.toLowerCase()}`));
    setRows([...rows, ...add].sort((a, b) => a.color.localeCompare(b.color) || a.size - b.size));
  }
  const setRow = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  async function save() {
    if (!name.trim()) return toast.error('Enter a product name.');
    if (!rows.length) return toast.error('Add at least one size/color variant.');
    if (rows.some((r) => r.price <= 0)) return toast.error('Every variant needs a price above 0.');
    setSaving(true);
    try {
      const payload = { name, category, description, images: images.filter(Boolean), is_new_arrival: isNew, is_active: active, collection_ids: colIds, variants: rows };
      await adm(product ? `/products/${product.id}` : '/products', { method: product ? 'PUT' : 'POST', body: body(payload) });
      toast.success('Product saved'); onSaved(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl space-y-5 p-6" aria-describedby="pe-desc">
        <DialogTitle className="text-xl font-bold">{product ? 'Edit product' : 'Add product'}</DialogTitle>
        <DialogDescription id="pe-desc" className="sr-only">Product details and inventory matrix</DialogDescription>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="space-y-2"><p className="text-sm font-medium">Images (first is the main photo)</p>
          {images.map((img, i) => <ImageField key={i} value={img} onChange={(v) => setImages((x) => x.map((y, idx) => (idx === i ? v : y)))} />)}
          <Button variant="outline" size="sm" type="button" onClick={() => setImages([...images, ''])}>Add another image</Button></div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#C71585]" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> New Arrival (auto-publishes to New Arrivals)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#C71585]" checked={active} onChange={(e) => setActive(e.target.checked)} /> Visible in shop</label>
        </div>
        <div><p className="mb-1 text-sm font-medium">Collections</p>
          <div className="flex flex-wrap gap-2">{collections.map((c) => (
            <button key={c.id} type="button" aria-pressed={colIds.includes(c.id)} onClick={() => setColIds((x) => (x.includes(c.id) ? x.filter((i) => i !== c.id) : [...x, c.id]))}
              className={cn('rounded-full border px-3 py-1 text-sm', colIds.includes(c.id) ? 'border-brand bg-brand text-white' : 'border-neutral-300')}>{c.name}</button>
          ))}{!collections.length && <span className="text-sm text-neutral-600">Create a collection first to cross-list this product.</span>}</div></div>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="font-semibold">Inventory matrix</h3>
          <div className="flex flex-wrap gap-2">{SIZES.map((s) => (
            <button key={s} type="button" aria-pressed={sizes.includes(s)} onClick={() => setSizes((x) => (x.includes(s) ? x.filter((i) => i !== s) : [...x, s]))}
              className={cn('h-9 min-w-10 rounded border text-sm font-semibold', sizes.includes(s) ? 'border-brand bg-brand text-white' : 'border-neutral-300')}>{s}</button>
          ))}</div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2"><Field label="Colors (comma separated)"><Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Red, Brown, Black" /></Field></div>
            <Field label="Price (₦)"><Input type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value)} /></Field>
            <Field label="Stock per variant"><Input type="number" min={0} value={stock} onChange={(e) => setStock(+e.target.value)} /></Field>
          </div>
          <Button type="button" variant="outline" onClick={generate}>Add to matrix</Button>
          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded border">
              <table className="w-full text-sm"><thead className="sticky top-0 bg-neutral-100 text-left"><tr><th className="p-2">Color</th><th className="p-2">Size</th><th className="p-2">Price (₦)</th><th className="p-2">Stock</th><th /></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={`${r.size}${r.color}`} className="border-t">
                    <td className="p-2">{r.color}</td><td className="p-2">{r.size}</td>
                    <td className="p-1"><Input className="h-9 w-28" type="number" min={0} value={r.price} onChange={(e) => setRow(i, { price: +e.target.value })} /></td>
                    <td className="p-1"><Input className={cn('h-9 w-20', r.stock === 0 && 'border-red-500')} type="number" min={0} value={r.stock} onChange={(e) => setRow(i, { stock: Math.max(0, +e.target.value) })} /></td>
                    <td className="p-2"><button type="button" aria-label="Remove variant" className="text-neutral-500 hover:text-red-600" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>×</button></td>
                  </tr>))}</tbody></table>
            </div>
          )}
          <p className="text-xs text-neutral-600">Variants at 0 stock disappear from customer dropdowns. When every variant hits 0, the product shows “Sold Out”.</p>
        </section>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save product'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
