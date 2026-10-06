'use client';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setShow(max > 0 && window.scrollY / max >= 0.5);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-brand p-3 text-white shadow-lg hover:bg-brand-dark"><ArrowUp size={22} /></button>
  );
}
