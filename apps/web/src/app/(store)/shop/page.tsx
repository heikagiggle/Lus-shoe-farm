import type { Metadata } from 'next';
import { ShopPage } from '@/components/store/catalog';

export const metadata: Metadata = { title: 'Shop' };
export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <ShopPage category={category} />;
}
