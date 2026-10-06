'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Product } from '@lsf/shared-types';
import { store } from '@/lib/api';
import { ProductCardSkeleton } from '@/components/ui/skeleton';
import { ProductCard } from './product-card';

type Params = Record<string, string | boolean | undefined>;

/** Cursor-based infinite scroll: the API returns next_cursor; no page numbers anywhere. */
export function InfiniteProducts({ params }: { params: Params }) {
  const [items, setItems] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<number | null | undefined>(undefined); // undefined = not started
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(params);
  const gen = useRef(0);

  const load = useCallback(async (after?: number) => {
    const g = gen.current;
    setLoading(true); setError(false);
    try {
      const page = await store.products({ ...JSON.parse(key), cursor: after, limit: 12 });
      if (g !== gen.current) return;
      setItems((prev) => (after ? [...prev, ...page.items] : page.items));
      setCursor(page.next_cursor);
    } catch {
      if (g !== gen.current) return;
      setError(true); toast.error('Could not load shoes. Check your connection and retry.');
    } finally { if (g === gen.current) setLoading(false); }
  }, [key]);

  useEffect(() => { gen.current++; setItems([]); setCursor(undefined); load(); }, [load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && cursor && !loading && !error) load(cursor);
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading, error, load]);

  const empty = !loading && !error && cursor !== undefined && items.length === 0;
  return (
    <div>
      {empty && <p className="py-16 text-center text-neutral-600">No shoes here yet. Try another category.</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
        {loading && Array.from({ length: items.length ? 4 : 8 }).map((_, i) => <ProductCardSkeleton key={`s${i}`} />)}
      </div>
      {error && <div className="py-8 text-center"><button className="font-semibold text-brand underline" onClick={() => load(cursor ?? undefined)}>Retry</button></div>}
      <div ref={sentinel} className="h-8" />
    </div>
  );
}
