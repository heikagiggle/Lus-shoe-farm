'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AdminUser } from '@lsf/shared-types';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { adm } from '@/lib/admin';
import { cn } from '@/lib/utils';

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  useEffect(() => { adm<AdminUser[]>('/users').then(setUsers).catch((e) => toast.error(e.message)); }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Registered Users {users && <span className="text-base font-normal text-neutral-600">({users.length})</span>}</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-100"><tr><th className="p-3">Email</th><th className="p-3">Full name</th><th className="p-3">Created</th><th className="p-3">Default address</th><th className="p-3">Marketing</th></tr></thead>
          <tbody>
            {!users && <TableRowsSkeleton cols={5} />}
            {users?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-neutral-600">No registered customers yet. They appear here after signing in with an email code.</td></tr>}
            {users?.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3">{u.full_name || <span className="text-neutral-500">Not set</span>}</td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</td>
                <td className="p-3">{u.default_address || <span className="text-neutral-500">None saved</span>}</td>
                <td className="p-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', u.marketing_opt_in ? 'bg-brand text-white' : 'bg-neutral-200')}>{u.marketing_opt_in ? 'Subscribed' : 'Not subscribed'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
