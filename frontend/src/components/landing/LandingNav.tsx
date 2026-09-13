'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, Sprout } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#narxlar', label: 'Narxlar' },
  { href: '#savollar', label: 'Savollar' },
];

export default function LandingNav() {
  const { access, authReady } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = authReady && !!access;

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'border-b border-slate-200/90 bg-white/90 shadow-[0_4px_25px_rgba(15,23,42,0.06)] backdrop-blur-xl'
        : 'border-b border-slate-200/50 bg-white/75 backdrop-blur-md'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-18">
        
        {/* Logo */}
        <Link href={loggedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-600/20 transition-transform duration-200 group-hover:scale-105">
            <Sprout className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
              Ilm<span className="text-emerald-600">Ildizi</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              EdTech Platform
            </span>
          </div>
        </Link>

        {/* Central Navigation Links */}
        <nav className="hidden items-center gap-1 lg:gap-2 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Kabinetga o&apos;tish</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_4px_16px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Bepul boshlash</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden hover:bg-slate-100 cursor-pointer"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {open && (
        <div className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-xl shadow-xl md:hidden">
          <div className="flex flex-col space-y-1.5">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-center text-sm font-bold shadow-md"
              >
                Bepul boshlash
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
