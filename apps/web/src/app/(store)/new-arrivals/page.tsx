import type { Metadata } from 'next';
import { CatalogBanner } from '@/components/store/catalog';
import { InfiniteProducts } from '@/components/store/infinite-products';

export const metadata: Metadata = { title: 'New Arrivals' };
export default function NewArrivals() {
  return (
    <>
      <CatalogBanner title="New Arrivals" />
      <div className="mx-auto max-w-7xl px-4 py-8"><InfiniteProducts params={{ new_arrivals: true }} /></div>
    </>
  );
}
