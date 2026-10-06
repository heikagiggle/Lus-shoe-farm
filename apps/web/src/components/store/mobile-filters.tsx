'use client';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function MobileFilters({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 lg:hidden">
      <Button variant="outline" onClick={() => setOpen(true)}><SlidersHorizontal size={16} /> Filter by category</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="max-w-xs p-5" aria-describedby={undefined}>
          <DialogTitle className="mb-4 text-lg font-bold text-brand">Categories</DialogTitle>
          <div onClick={() => setOpen(false)}>{children}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
