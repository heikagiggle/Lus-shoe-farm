'use client';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

export function DialogContent({ className, children, side, hideClose, ...p }: React.ComponentProps<typeof D.Content> & { side?: 'right' | 'left' | 'top'; hideClose?: boolean }) {
  const pos =
    side === 'right' ? 'right-0 top-0 h-full w-full max-w-md animate-slide-in-right'
    : side === 'left' ? 'left-0 top-0 h-full w-full max-w-xs animate-slide-in-left'
    : side === 'top' ? 'left-0 top-0 w-full animate-fade-in'
    : 'left-1/2 top-1/2 w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg max-h-[92vh] animate-fade-in';
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
      <D.Content className={cn('fixed z-50 overflow-y-auto bg-white text-black shadow-xl', pos, className)} {...p}>
        {children}
        {!hideClose && (
          <D.Close aria-label="Close" className="absolute right-3 top-3 rounded p-1 hover:bg-neutral-100"><X size={20} /></D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}
