'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { isTelegramEnv } from '@/lib/telegram';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '#qanday', label: 'Qanday ishlaydi' },
  { href: '#narxlar', label: 'Narxlar' },
  { href: '#savollar', label: 'Savollar' },
];

/* Landing sarlavhasi.
 *
 * Ikki vazifa bajaradi:
 *   1. Telegram Mini App'da landing umuman kerak emas — u yerda foydalanuvchi "sotib
 *      olish" bosqichidan o'tib bo'lgan, darhol ilovaga kirishi kerak. Shuning uchun
 *      Mini App ichida bu komponent /dashboard yoki /login ga yo'naltiradi.
 *   2. Saytda esa kirgan foydalanuvchiga "Kabinetga o'tish", kirmaganiga "Boshlash"
 *      tugmasini ko'rsatadi. */
export default function LandingNav() {
  const router = useRouter();
  const { access, authReady, hydrated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* Telegram Mini App: seansi bor foydalanuvchini to'g'ridan-to'g'ri kabinetga olib
     o'tamiz — u "sotib olish" bosqichidan o'tib bo'lgan, unga landing kerak emas.
     Seansi yo'q bo'lsa (yoki endigina chiqqan bo'lsa) landing KO'RSATILADI: bu yerda
     platforma nima ekani tushuntiriladi va kirish tugmasi bor. Ilgari bu yerda
     shartsiz /login ga yo'naltirish bor edi — shuning uchun Mini App'da landing
     umuman ko'rinmasdi. */
  useEffect(() => {
    // `hydrated` shart: refresh token localStorage'dan AuthProvider tomonidan o'qiladi
    // va u ham mount paytida ishlaydi — kutmasak, tokeni bor foydalanuvchi ham
    // landing'da qolib ketardi.
    if (!isTelegramEnv() || !hydrated) return;
    if (!useAuthStore.getState().refresh) return;
    router.replace('/dashboard');
  }, [hydrated, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = authReady && !!access;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? 'border-b border-[var(--border-card)] bg-[var(--bg-page)]/85 backdrop-blur-lg' : ''
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={36} />
          <span className="font-voice text-lg font-bold">IlmIldizi</span>
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          {loggedIn ? (
            <Button asChild size="sm"><Link href="/dashboard">Kabinetga o&apos;tish</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Kirish</Link>
              </Button>
              <Button asChild size="sm"><Link href="/register">Bepul boshlash</Link></Button>
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-[var(--border-card)] bg-[var(--bg-page)]/95 px-4 pb-4 backdrop-blur-lg md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center text-sm text-muted-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
