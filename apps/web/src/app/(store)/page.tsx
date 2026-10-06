import Link from 'next/link';
import { HeroCarousel } from '@/components/store/hero-carousel';
import { ProductCard } from '@/components/store/product-card';
import { store } from '@/lib/api';

export const revalidate = 30;

export default async function Home() {
  const [slides, collections] = await Promise.all([store.hero().catch(() => []), store.homeCollections().catch(() => [])]);
  return (
    <>
      <HeroCarousel slides={slides} />
      {collections.filter((c) => c.products.length > 0).map((c) => (
        <section key={c.id} className="mx-auto max-w-7xl px-4 pt-14">
          <div className="mb-6 flex items-end justify-between gap-4 pb-2">
            <h2 className="font-display text-3xl italic text-brand">{c.name}</h2>
            <Link href={`/collections/${c.slug}`} className={' border-b-2 border-brand'}>See All</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {c.products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ))}
      <section className="mx-auto mt-16 max-w-7xl px-4">
        <div className="rounded-lg bg-brand px-6 py-14 text-center text-white">
          <h2 className="font-display text-3xl italic sm:text-4xl">New this season, sized 37 to 43</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">Same-day delivery on the Island and next-day on the Mainland with Priority shipping.</p>
          <Link href="/new-arrivals" className="mt-6 inline-flex h-12 items-center rounded-md bg-white px-8 text-sm font-semibold text-brand hover:bg-brand-soft">Shop New Arrivals</Link>
        </div>
      </section>
    </>
  );
}
