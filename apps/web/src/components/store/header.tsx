'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { cartCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useMounted } from '@/lib/use-mounted';
import { MobileMenu } from './mobile-menu';
import { SearchOverlay } from './search-overlay';

export function AnnouncementBar() {
   const token = useAuth((s) => s.token);
  const authed = useMounted() && !!token;

  return (
    <div className="bg-brand text-white py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-sm sm:text-xs">
        <p>Free shipping on orders above 200k within Lagos</p>
         <Link href={authed ? '/account/profile' : '/auth'} className="shrink-0 underline-offset-2 hover:underline">{authed ? 'My Account' : 'Login / Register'}</Link>
      </div>
    </div>
  );
}

export function Navbar() {
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const sync = useCart((s) => s.sync);
    const refreshAuth = useAuth((s) => s.refresh);
  const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
 const mounted = useMounted();
  useEffect(() => { sync(); refreshAuth(); }, [sync, refreshAuth]);
  const count = mounted ? cartCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4" aria-label="Main">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="sm:block hidden font-display text-xl italic text-brand sm:text-2xl">Lu&apos;s Shoe Farm</Link>
          <Link href="/" className="sm:hidden block font-display text-xl italic text-brand sm:text-2xl">LSF</Link>
       
        </div>
        <div className="flex items-center gap-6">
         <div className="flex gap-6 sm:gap-8">
          <Link href="/shop" className="hidden md:block text-sm font-semibold hover:text-brand">Shop</Link>
          <Link href="/new-arrivals" className="hidden md:block text-sm font-semibold hover:text-brand">New Arrivals</Link>
        </div>
        <div className="flex items-center gap-1">
            <button aria-label="Search products" onClick={() => setSearchOpen(true)} className="rounded-full p-2 hover:bg-neutral-100"><Search size={22} /></button>

          <button aria-label={`Open cart, ${count} items`} onClick={() => setOpen(true)} className="relative rounded-full p-2 hover:bg-neutral-100">
            <ShoppingBag size={22} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{count}</span>}
          </button>
           <button aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="rounded-full p-2 hover:bg-neutral-100 md:hidden"><Menu size={24} /></button>
        </div>
        
        </div>
      </nav>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
