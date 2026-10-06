'use client';
import Image from 'next/image';
import { useState } from 'react';
import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Lazy image with a pulsing placeholder and a graceful fallback if the URL fails. */
export function ProductImage({ src, alt, sizes, priority, className }: { src?: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('absolute inset-0 bg-neutral-100', !loaded && !failed && 'animate-pulse')}>
      {src && !failed ? (
        <Image src={assetUrl(src)} alt={alt} fill sizes={sizes} priority={priority} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
          className={cn('object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)} />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-neutral-500">No image</div>
      )}
    </div>
  );
}
