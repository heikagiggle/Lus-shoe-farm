import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/store/auth-form';

export const metadata: Metadata = { title: 'Login / Register' };
export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
