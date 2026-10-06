'use client';
import * as T from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = T.Root;
export const TabsList = ({ className, ...p }: React.ComponentProps<typeof T.List>) => (
  <T.List className={cn('flex gap-1 border-b border-neutral-200', className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: React.ComponentProps<typeof T.Trigger>) => (
  <T.Trigger className={cn('-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-neutral-600 data-[state=active]:border-brand data-[state=active]:text-brand', className)} {...p} />
);
export const TabsContent = ({ className, ...p }: React.ComponentProps<typeof T.Content>) => <T.Content className={cn('pt-4', className)} {...p} />;
