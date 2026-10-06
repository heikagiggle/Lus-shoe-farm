'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';

export function Gallery({ images, name, priority }: { images: string[]; name: string; priority?: boolean }) {
  const [i, setI] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg"><ProductImage src={images[i]} alt={name} sizes="(min-width:1024px) 40vw, 90vw" priority={priority} /></div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, idx) => (
            <button key={src + idx} onClick={() => setI(idx)} aria-label={`Show image ${idx + 1}`} aria-pressed={idx === i}
              className={cn('relative h-16 w-16 overflow-hidden rounded border-2', idx === i ? 'border-brand' : 'border-transparent')}>
              <ProductImage src={src} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
