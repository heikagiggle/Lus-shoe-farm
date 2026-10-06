import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountPortal } from '@/components/store/account-portal';

export const metadata: Metadata = { title: 'My Account' };
export default function ProfilePage() {
  return <Suspense><AccountPortal /></Suspense>;
}
