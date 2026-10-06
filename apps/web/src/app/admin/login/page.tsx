'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { setToken } from '@/lib/admin';

const schema = z.object({ email: z.string().email('Enter your admin email'), password: z.string().min(1, 'Enter your password') });
type V = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });
  const onSubmit = async (v: V) => {
    try {
      const t = await api<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(v) });
      setToken(t.access_token); router.replace('/admin/orders');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not sign in. Try again.'); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="font-display text-3xl italic text-brand">Admin sign in</h1>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </div>
  );
}
