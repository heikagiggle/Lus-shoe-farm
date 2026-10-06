import { cn } from '@/lib/utils';

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-md bg-neutral-200', className)} />;
export const ProductCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-square w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-10 w-full" />
  </div>
);
export const TableRowsSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <>{Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>{Array.from({ length: cols }).map((_, c) => <td key={c} className="p-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
  ))}</>
);
