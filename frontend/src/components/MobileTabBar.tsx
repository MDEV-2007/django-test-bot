'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, FileCheck2, BookOpen, Swords, Menu, X, Bot, ShoppingBag,
  Crown, BarChart3, Trophy, User, LogOut, GraduationCap, ShieldCheck, Snowflake,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { prefetchApi } from '@/lib/api-cache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import { Separator } from '@/components/ui/separator';
import { easeOut } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* Pastki tab-bar: barmoq eng oson yetadigan 4 ta yo'nalish + "Hisobim" (avatar).

   Ilgari bu yerda 5 ta havola bor edi va qolgan bo'limlar (Do'kon, Premium, Analitika,
   Liderlar ligasi, AI Mentor) MOBILDA umuman ochilmasdi — sidebar esa faqat kattaroq
   ekranda ko'rinadi. Endi 5-slot avatar bo'lib, pastdan chiqadigan varaqda profil va
   qolgan barcha bo'limlar bir joyda.

   AI Mentor — kunlik qaytishni ta'minlaydigan asosiy funksiya — shu tab-bar'da,
   Darslar esa (hozircha ko'p mavzuda bo'sh, "tayyorlanmoqda" holatida) varaqqa
   ko'chirilgan: eng qimmat 5 ta piksel joyi kontenti tayyor bo'lmagan bo'limga
   berilmasligi kerak. */
const TABS = [
  // `api` — barmoq tugmaga tekkan zahoti fonda olinadigan ma'lumot: bosish va sahifa
  // ochilishi orasidagi ~100 ms shu bilan behuda ketmaydi.
  { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, api: '/api/dashboard/home/' },
  { href: '/tests', label: 'Testlar', icon: FileCheck2, matchPrefixes: ['/tests'], api: '/api/tests/' },
  { href: '/battles', label: 'Arena', icon: Swords, matchPrefixes: ['/games'] },
  { href: '/mentor', label: 'AI Mentor', icon: Bot },
];

/* Guruh nomlari MA'NOGA qarab, joylashuvga qarab emas: "Hisobim" — o'z profiling
   haqidagi narsalar, "Do'kon" — tanga sarflaydigan HAMMA narsa bir joyda (ilgari
   Do'kon va Inventar ikkita alohida guruhda, foydalanuvchi qaysi biriga borishini
   bilmasdi), "Ko'proq" — hali tab-bar'ga sig'maganlar. */
const MENU_GROUPS: { label: string; items: { href: string; label: string; icon: typeof Bot }[] }[] = [
  {
    label: 'Hisobim',
    items: [
      { href: '/profile', label: 'Profilim', icon: User },
      { href: '/analytics', label: 'Analitika', icon: BarChart3 },
      { href: '/premium', label: 'Premium', icon: Crown },
    ],
  },
  {
    label: "Do'kon",
    items: [
      { href: '/shop', label: "Do'kon", icon: ShoppingBag },
      { href: '/shop/inventory', label: 'Inventar', icon: Snowflake },
    ],
  },
  {
    label: "Ko'proq",
    items: [
      { href: '/learning', label: 'Darslar', icon: BookOpen },
      { href: '/leaderboard', label: 'Liderlar ligasi', icon: Trophy },
    ],
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  // Sahifa almashsa varaq yopiladi, aks holda yangi sahifa ustida osilib qolardi.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Varaq ochiq turganda orqa fon sirg'anmasligi kerak.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const menuActive = MENU_GROUPS.some((g) => g.items.some((i) => pathname.startsWith(i.href)));

  return (
    <>
      <nav className="ilm-mobile-tabbar fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--border-card)] bg-[var(--surface-card-strong)]/95 px-1 pt-1.5 backdrop-blur-lg lg:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.matchPrefixes);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onTouchStart={() => tab.api && prefetchApi(tab.api)}
              /* Barmoq nishoni kamida 56×48px (tavsiya etilgan minimal 44px dan katta). */
              className={cn(
                'flex min-h-12 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors',
                active ? 'font-semibold text-[var(--accent-text)]' : 'text-muted-foreground active:bg-accent',
              )}
            >
              <Icon className={cn('size-5', active && 'text-[var(--accent)]')} />
              <span className="truncate text-xs leading-none tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* 5-slot — foydalanuvchining O'ZI: gamifikatsiyalangan ilovada eng ko'p
            ochiladigan joy profil (XP, daraja, yutuqlar), shuning uchun bu yerda quruq
            "gamburger" emas, avatar turadi. Bosilganda esa qolgan barcha bo'limlar
            (Do'kon, Premium, Analitika...) bilan birga varaq ochiladi. */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Hisobim va boshqa bo'limlar"
          className={cn(
            'flex min-h-12 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors',
            menuActive ? 'font-semibold text-[var(--accent-text)]' : 'text-muted-foreground active:bg-accent',
          )}
        >
          {user ? (
            <Avatar className={cn('size-5 border', menuActive ? 'border-[var(--accent)]' : 'border-[var(--border-strong)]')}>
              <AvatarImage src={user.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">
                {(user.first_name || user.username || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Menu className="size-5" />
          )}
          <span className="text-xs leading-none tracking-tight">Hisobim</span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-3xl border-t bg-[var(--surface-card-strong)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.26, ease: easeOut }}
            >
              {/* Tortish belgisi — pastdan chiqadigan varaq ekanini bildiradi. */}
              <div className="sticky top-0 z-10 bg-[var(--surface-card-strong)] pt-2">
                <div className="mx-auto h-1 w-10 rounded-full bg-[var(--border-strong)]" />
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    className="flex min-w-0 items-center gap-2.5 text-left"
                    onClick={() => router.push('/profile')}
                  >
                    <CosmeticAvatar
                      className="size-9"
                      src={user?.avatar_url}
                      name={user?.first_name || user?.username}
                      cosmetics={user?.cosmetics}
                      fallbackClassName="text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {user?.first_name || user?.username}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        Lvl {user?.level} · <span className="text-[var(--accent-text)]">{user?.xp} XP</span>
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Yopish"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-accent"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <Separator />
              </div>

              <div className="space-y-5 px-3 py-4">
                {(user?.is_teacher || user?.is_superadmin) && (
                  <div className="space-y-2">
                    {user.is_teacher && (
                      <Link
                        href="/teacher"
                        className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 text-sm font-semibold text-[var(--accent-text)]"
                      >
                        <GraduationCap className="size-4" /> O&apos;qituvchi paneli
                      </Link>
                    )}
                    {user.is_superadmin && (
                      <Link
                        href="/panel"
                        className="flex min-h-12 items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 text-sm font-semibold text-[var(--danger-text)]"
                      >
                        <ShieldCheck className="size-4" /> Super Admin paneli
                      </Link>
                    )}
                  </div>
                )}

                {MENU_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <p className="px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex min-h-12 items-center gap-3 rounded-xl px-2.5 text-sm transition-colors',
                            active
                              ? 'bg-primary/12 font-medium text-[var(--accent-text)]'
                              : 'text-foreground active:bg-accent',
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}

                <Separator />

                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-sm text-[var(--danger-text)] active:bg-rose-500/10"
                >
                  <LogOut className="size-4" /> Tizimdan chiqish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
