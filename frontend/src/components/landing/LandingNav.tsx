'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { Menu, X, ArrowRight } from 'lucide-react';
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
    <header className="fixed inset-x-0 top-3 sm:top-5 z-50 px-4 pointer-events-none transition-all duration-300">
      <nav className={`pointer-events-auto mx-auto flex max-w-5xl items-center justify-between rounded-full border border-slate-200/90 bg-white/85 px-4 py-2 sm:px-6 sm:py-2.5 backdrop-blur-2xl transition-all duration-300 ${
        scrolled ? 'shadow-[0_12px_36px_rgba(15,23,42,0.1)] bg-white/95 border-slate-300/80' : 'shadow-[0_8px_30px_rgba(15,23,42,0.06)]'
      }`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-200 group-hover:scale-105">
            <BrandMark size={32} />
          </div>
          <span className="font-voice text-base sm:text-lg font-bold tracking-tight text-slate-900">
            Ilm<span className="text-emerald-600">Ildizi</span>
          </span>
        </Link>

        {/* Markaziy navigatsiya */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* O'ng tomon: Tugmalar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
            >
              Kabinetga o&apos;tish <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:text-slate-900 hover:bg-slate-100"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Bepul boshlash <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}

          {/* Mobil menyu tugmasi */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden hover:bg-slate-100"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {/* Mobil menyu darchasi */}
      {open && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-3 backdrop-blur-2xl shadow-xl md:hidden">
          <div className="flex flex-col space-y-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                Kirish
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
