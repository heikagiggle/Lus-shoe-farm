'use client';
import Link from 'next/link';
import type { Product } from '@lsf/shared-types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/store/cart';
import { naira } from '@/lib/utils';
import { ProductImage } from './product-image';

export function ProductCard({ product: p }: { product: Product }) {
  const openQuickView = useCart((s) => s.openQuickView);
  const soldOut = p.is_sold_out || !p.variants.some((v) => v.stock > 0);
  const price = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;
  return (
    <article className="group flex flex-col">
      <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-lg" aria-label={p.name}>
        <ProductImage src={p.images[0]} alt={p.name} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="transition-transform duration-500 group-hover:scale-105" />
        {soldOut && <span className="absolute left-2 top-2 rounded bg-black px-2 py-0.5 text-xs font-semibold text-white uppercase">Sold Out</span>}
      </Link>
      <h3 className="mt-3 line-clamp-1 font-semibold">{p.name}</h3>
      <p className="text-sm font-medium">{naira(price)}</p>
      {soldOut ? (
        <Button disabled className="mt-3 w-full">Sold Out</Button>
      ) : (
        <Button className="mt-3 w-full uppercase whitespace-nowrap h-8 sm:h-10 text-xs sm:text-sm md:text-base" onClick={() => openQuickView(p)}>Add to Cart</Button>
      )}
    </article>
  );
}
