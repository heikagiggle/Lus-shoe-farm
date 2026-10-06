import { CollectionPage } from '@/components/store/catalog';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <CollectionPage slug={(await params).slug} />;
}
