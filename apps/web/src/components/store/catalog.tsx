import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, store } from '@/lib/api';
import { cn } from '@/lib/utils';
import { InfiniteProducts } from './infinite-products';
import { MobileFilters } from './mobile-filters';

export const deslug = (s: string) => s.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');

export function CatalogBanner({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6">
      <div className="rounded-lg bg-brand px-6 py-10 text-center text-white sm:py-14">
        <h1 className="font-display text-4xl italic sm:text-5xl">{title}</h1>
        {description && <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">{description}</p>}
      </div>
    </div>
  );
}

export function CategoryLinks({ categories, active }: { categories: string[]; active?: string }) {
  const item = 'block rounded px-3 py-2 text-sm hover:bg-brand-soft';
  return (
    <nav aria-label="Categories" className="space-y-1">
      <Link href="/shop" className={cn(item, !active && 'bg-brand-soft font-semibold text-brand')}>All shoes</Link>
      {categories.map((c) => (
        <Link key={c} href={`/shop?category=${encodeURIComponent(c)}`} className={cn(item, active === c && 'bg-brand-soft font-semibold text-brand')}>{c}</Link>
      ))}
    </nav>
  );
}

export async function ShopPage({ category }: { category?: string }) {
  const categories = await store.categories().catch(() => []);
  return (
    <>
      <CatalogBanner title={category || 'Shop'} />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <p className="mb-2 font-semibold text-brand">Categories</p>
          <CategoryLinks categories={categories} active={category} />
        </aside>
        <div className="min-w-0 flex-1">
          <MobileFilters><CategoryLinks categories={categories} active={category} /></MobileFilters>
          <InfiniteProducts params={{ category }} />
        </div>
      </div>
    </>
  );
}

/** Collection / "new arrivals/<slug>" page: banner title comes from the route parameter. */
export async function CollectionPage({ slug }: { slug: string }) {
  let title = deslug(slug), description = '';
  try {
    const c = await store.collection(slug);
    title = c.name; description = c.description;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
  }
  return (
    <>
      <CatalogBanner title={title} description={description} />
      <div className="mx-auto max-w-7xl px-4 py-8"><InfiniteProducts params={{ collection: slug }} /></div>
    </>
  );
}
