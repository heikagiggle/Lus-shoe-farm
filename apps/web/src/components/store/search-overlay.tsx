'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { Product } from '@lsf/shared-types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { store } from '@/lib/api';
import { naira } from '@/lib/utils';
import { ProductImage } from './product-image';

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try { setResults((await store.products({ q: q.trim(), limit: 6 })).items); } catch { setResults([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="top" className="max-h-[80vh] p-4 sm:p-6" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 pr-8">
            <Search size={20} className="text-brand" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search heels, sandals, boots…" className="w-full bg-transparent text-lg outline-none pl-2" />
          </div>
          <div className="mt-4 space-y-2">
            {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            {!loading && results?.length === 0 && <p className="py-6 text-center text-sm text-neutral-600">No shoes match “{q}”. Try a category like sandals or boots.</p>}
            {!loading && results?.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-md p-2 hover:bg-neutral-50">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded"><ProductImage src={p.images[0]} alt={p.name} sizes="56px" /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-neutral-600">{p.category}</p></div>
                <p className="text-sm font-semibold">{naira(Math.min(...p.variants.map((v) => v.price)))}</p>
              </Link>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
