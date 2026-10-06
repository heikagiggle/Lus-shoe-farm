'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Slide } from '@lsf/shared-types';
import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  useEffect(() => {
    if (paused || n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [paused, n]);
  if (!n) return null;
  return (
    <section aria-roledescription="carousel" aria-label="Featured collections" className="relative h-[420px] overflow-hidden bg-neutral-100 sm:h-[520px]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => (
        <div key={s.id} aria-hidden={idx !== i} className={cn('absolute inset-0 transition-opacity duration-700', idx === i ? 'opacity-100' : 'pointer-events-none opacity-0')}>
          <ProductImage src={s.image_url} alt="" sizes="100vw" priority={idx === 0} />
          <div className="absolute inset-0 mx-auto flex max-w-7xl items-center px-4">
            <div className="max-w-sm rounded-lg bg-white/90 p-6 shadow-lg sm:max-w-md sm:p-8">
              <h2 className="font-display text-3xl italic leading-tight text-brand sm:text-5xl">{s.headline}</h2>
              {s.subtext && <p className="mt-3 text-sm text-neutral-800 sm:text-base">{s.subtext}</p>}
              <Link href={s.cta_url} tabIndex={idx === i ? 0 : -1} className="mt-5 inline-flex h-11 items-center rounded-md bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark">{s.cta_label || 'Shop Now'}</Link>
            </div>
          </div>
        </div>
      ))}
      {n > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, idx) => <button key={s.id} aria-label={`Go to slide ${idx + 1}`} aria-current={idx === i} onClick={() => setI(idx)} className={cn('h-2.5 rounded-full transition-all', idx === i ? 'w-7 bg-brand' : 'w-2.5 bg-white/80')} />)}
          </div>
        </>
      )}
    </section>
  );
}
