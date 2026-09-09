'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { isTelegramEnv } from '@/lib/telegram';

const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#narxlar', label: 'Narxlar' },
  { href: '#savollar', label: 'Savollar' },
];

export default function LandingNav() {
  const router = useRouter();
  const { access, authReady, hydrated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isTelegramEnv() || !hydrated) return;
    if (!useAuthStore.getState().refresh) return;
    router.replace('/dashboard');
  }, [hydrated, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = authReady && !!access;

  return (
    <header className="fixed inset-x-0 top-3 sm:top-5 z-50 px-4 pointer-events-none transition-all duration-300">
      <nav className={`pointer-events-auto mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/[0.12] bg-[#090b10]/85 px-4 py-2 sm:px-6 sm:py-2.5 backdrop-blur-2xl transition-all duration-300 ${
        scrolled ? 'shadow-[0_12px_40px_rgba(0,0,0,0.65)] bg-[#07090e]/95 border-white/[0.16]' : 'shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
      }`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-200 group-hover:scale-105">
            <BrandMark size={32} />
          </div>
          <span className="font-voice text-base sm:text-lg font-bold tracking-tight text-white">
            Ilm<span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Ildizi</span>
          </span>
        </Link>

        {/* Markaziy havolalar */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* O'ng tomon: Kirish va Boshlash tugmalari */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:brightness-110"
            >
              Kabinetga o&apos;tish <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-bold text-black shadow-[0_0_25px_rgba(16,185,129,0.25)] border border-emerald-300/40 transition-all hover:scale-[1.03] active:scale-[0.98] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
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
            className="flex size-8 items-center justify-center rounded-full border border-white/10 text-zinc-300 md:hidden hover:text-white"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {/* Mobil menyu qalqib chiquvchi darchasi */}
      {open && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#090b10]/95 p-3 backdrop-blur-2xl shadow-2xl md:hidden">
          <div className="flex flex-col space-y-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 border-t border-white/[0.08] pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
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
