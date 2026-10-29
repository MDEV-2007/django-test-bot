'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { BrandMark } from '@/components/BrandMark';

const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '/reels', label: 'Bilim Reels' },
  { href: '/feed', label: 'Hamjamiyat' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#narxlar', label: 'Narxlar' },
  { href: '#savollar', label: 'Savollar' },
];

export default function LandingNav() {
  const { access, authReady } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = authReady && !!access;

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 transition-all duration-300">
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 sm:px-6 h-14 sm:h-16 transition-all duration-300 ios-glass ${
          scrolled
            ? 'bg-white/85 border border-black/[0.08] shadow-[0_10px_34px_-6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
            : 'bg-white/72 border border-black/[0.06] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]'
        }`}
      >
        {/* Brand Logo (iOS Squircle) */}
        <Link href={loggedIn ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-[11px] overflow-hidden border border-black/[0.08] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-transform duration-200 group-hover:scale-105">
            <BrandMark size={34} rounded="rounded-[10px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] sm:text-base font-extrabold tracking-[-0.02em] text-[#1C1C1E] leading-none">
              Ilm<span className="text-[#007AFF]">Ildizi</span>
            </span>
            <span className="text-[9px] font-semibold text-[#8E8E93] tracking-wider uppercase mt-0.5">
              Smart EdTech
            </span>
          </div>
        </Link>

        {/* Central Pill Navigation Links */}
        <nav className="hidden items-center gap-0.5 lg:gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-[#3A3A3C] transition-all hover:bg-black/[0.05] hover:text-[#1C1C1E] active:scale-95"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right Action Pill Buttons */}
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] px-4 py-2 sm:px-5 sm:py-2 text-xs sm:text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]"
            >
              <span>Kabinet</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center rounded-full px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-[#3A3A3C] hover:text-[#1C1C1E] hover:bg-black/[0.05] transition-all"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] px-4 py-2 sm:px-5 sm:py-2 text-xs sm:text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                <span>Boshlash</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="ios-spring flex size-9 items-center justify-center rounded-full bg-black/[0.05] text-[#1C1C1E] md:hidden hover:bg-black/[0.08] cursor-pointer"
          >
            {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* iOS Inset Grouped Sheet Dropdown for Mobile */}
      {open && (
        <div className="mx-auto mt-2 max-w-7xl rounded-[26px] border border-black/[0.08] bg-white/92 p-3 ios-glass shadow-[0_20px_50px_rgba(0,0,0,0.14)] md:hidden animate-scaleIn">
          <div className="divide-y divide-black/[0.06] rounded-[18px] bg-[#F2F2F7]/80 px-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-3 text-[14px] font-semibold text-[#1C1C1E] active:opacity-60"
              >
                <span>{l.label}</span>
                <ChevronRight className="size-4 text-[#8E8E93]" />
              </a>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="ios-spring rounded-full bg-[#E5E5EA] py-2.5 text-center text-[13px] font-semibold text-[#1C1C1E]"
            >
              Kirish
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="ios-spring rounded-full bg-[#007AFF] py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]"
            >
              Bepul boshlash
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
