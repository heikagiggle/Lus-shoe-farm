import { cn } from '@/lib/utils';

const colors = {
  pending: 'bg-blue-600', shipped: 'bg-orange-500', received: 'bg-green-600', awaiting_payment: 'bg-neutral-500',
} as const;
export const StatusBadge = ({ status }: { status: keyof typeof colors }) => (
  <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize text-white', colors[status])}>
    {status.replace('_', ' ')}
  </span>
);
