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
        className={`mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full pl-2 pr-2 transition-all duration-300 sm:h-16 sm:pl-3 ${
          scrolled
            ? 'bg-[#FFFCF7]/92 shadow-[0_18px_40px_-20px_rgba(60,30,110,0.55)] backdrop-blur-xl'
            : 'bg-[#FFFCF7]/70 shadow-[0_10px_30px_-22px_rgba(60,30,110,0.5)] backdrop-blur-md'
        }`}
      >
        {/* Brand Logo (iOS Squircle) */}
        <Link href={loggedIn ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105">
            <BrandMark size={40} rounded="rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-grotesk)] text-[17px] font-bold leading-none tracking-[-0.03em] text-[#080808] sm:text-[19px]">
              <span data-no-translit>Ilm<span className="text-[#7659C7]">Ildizi</span></span>
            </span>
            <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#080808]/45">
              Smart EdTech
            </span>
          </div>
        </Link>

        {/* Markaziy havolalar faqat lg (1024px+) dan: 768px planshetda ular sig'masdan sahifani gorizontal surardi. */}
        <nav className="hidden items-center gap-0.5 lg:gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-bold text-[#080808]/70 transition-all hover:bg-[#E6B5F2]/50 hover:text-[#080808] active:scale-95"
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
              className="inline-flex items-center gap-2 rounded-full bg-[#080808] py-1.5 pl-4 pr-1.5 text-[13px] font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5"
            >
              <span>Kabinet</span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#FFB82E] text-[#080808]"><ArrowRight className="size-3.5" /></span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden items-center rounded-full px-4 py-2 text-[13px] font-bold text-[#080808]/75 transition-all hover:bg-[#E6B5F2]/50 hover:text-[#080808] sm:inline-flex"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#080808] py-1.5 pl-4 pr-1.5 text-[13px] font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5"
              >
                <span>Boshlash</span>
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#FFB82E] text-[#080808]"><ArrowRight className="size-3.5" /></span>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#E6B5F2]/60 text-[#080808] transition-colors hover:bg-[#E6B5F2] lg:hidden"
          >
            {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* iOS Inset Grouped Sheet Dropdown for Mobile */}
      {open && (
        <div className="mx-auto mt-2 max-w-7xl animate-scaleIn rounded-[28px] bg-[#FFFCF7] p-3 shadow-[0_30px_60px_-24px_rgba(60,30,110,0.6)] lg:hidden">
          <div className="divide-y divide-black/[0.06] rounded-[22px] bg-[#F7F4EF] px-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-3 text-[14px] font-bold text-[#080808] active:opacity-60"
              >
                <span>{l.label}</span>
                <ChevronRight className="size-4 text-[#8A8494]" />
              </a>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#F2EADF] py-3 text-center text-[13px] font-bold text-[#080808]"
            >
              Kirish
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#080808] py-3 text-center text-[13px] font-bold text-[#FFFCF7]"
            >
              Bepul boshlash
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
