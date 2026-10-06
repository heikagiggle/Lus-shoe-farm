import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, store } from '@/lib/api';
import { ProductDetail } from '@/components/store/product-detail';

async function load(slug: string) {
  try { return await store.product(slug); } catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return { title: p.name, description: p.description.slice(0, 150) };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ProductDetail product={await load((await params).slug)} />;
}
