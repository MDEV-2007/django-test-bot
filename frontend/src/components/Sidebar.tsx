'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import {
  LayoutDashboard, FileCheck2, BookOpen, Swords, Bot, ShoppingBag, Crown,
  BarChart3, Trophy, User, LogOut, GraduationCap, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  matchPrefixes?: string[];
  /* Sahifa ochilishida so'raladigan asosiy endpoint. Havola ustiga kelgan (yoki unga
     barmoq tekkan) zahoti ma'lumot fonda olinadi — bosilganda sahifa allaqachon tayyor.
     Next'ning o'z prefetch'i faqat KOD uchun; ma'lumot baribir kutilardi. */
  api?: string;
};

/* Havolalar guruhlangan — Super Admin (`PanelShell`) va o'qituvchi (`TeacherShell`)
   panellaridagi bilan bir xil tuzilish.

   Ilgari 10 ta havola bitta tekis ro'yxatda, bir xil vaznda turardi: "o'qish", "o'yin",
   "hisob" bo'limlari aralashib ketgan va ko'z ularni ajrata olmasdi. Nomlar ham har xil
   uslubda edi ("1v1 Duel Arena", "AI Mentor 24/7", "Do'kon & Sovg'a") — endi qisqa va
   bir xil. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, api: '/api/dashboard/home/' },
      { href: '/tests', label: 'Testlar', icon: FileCheck2, matchPrefixes: ['/tests'], api: '/api/tests/' },
      { href: '/learning', label: 'Darslar', icon: BookOpen, api: '/api/learning/' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot },
    ],
  },
  {
    label: 'Mashq va bellashuv',
    items: [
      { href: '/battles', label: 'Arena', icon: Swords, matchPrefixes: ['/games'] },
      { href: '/leaderboard', label: 'Liderlar ligasi', icon: Trophy, api: '/api/leaderboard/?subject=all' },
    ],
  },
  {
    label: 'Hisobim',
    items: [
      { href: '/analytics', label: 'Analitika', icon: BarChart3, api: '/api/analytics/' },
      { href: '/shop', label: "Do'kon", icon: ShoppingBag, matchPrefixes: ['/shop'] },
      { href: '/premium', label: 'Premium', icon: Crown },
      { href: '/profile', label: 'Profilim', icon: User, api: '/api/auth/profile/' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isTeacher = pathname.startsWith('/teacher');
  const isAdmin = pathname.startsWith('/panel');

  if (isTeacher || isAdmin) return null; // teacher/panel keep their own shells

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false);

  return (
    <aside className="ilm-sidebar fixed left-0 top-0 z-30 hidden h-screen w-64 shrink-0 select-none flex-col border-r border-[var(--border-card)] bg-[var(--surface-card-strong)] lg:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="transition-transform group-hover:scale-105">
            <BrandMark size={40} />
          </div>
          <div className="min-w-0">
            <span className="font-voice block truncate text-lg font-bold leading-none">
              Ilm<span className="text-[var(--accent-text)]">Ildizi</span>
            </span>
            <p className="mt-1 truncate text-xs text-muted-foreground">Milliy Sertifikat &amp; BBA</p>
          </div>
        </Link>

        {/* Rol panellari — faqat tegishli foydalanuvchiga ko'rinadi. */}
        {(user?.is_teacher || user?.is_superadmin) && (
          <div className="mt-4 space-y-1.5">
            {user.is_teacher && (
              <Link
                href="/teacher"
                className="flex items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent)]/20"
              >
                <GraduationCap className="size-3.5" /> O&apos;qituvchi paneli
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--danger-text)] transition-colors hover:bg-rose-500/15"
              >
                <ShieldCheck className="size-3.5" /> Super Admin paneli
              </Link>
            )}
          </div>
        )}
      </div>

      <Separator />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => item.api && prefetchApi(item.api)}
                  onTouchStart={() => item.api && prefetchApi(item.api)}
                  className={cn(
                    'flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    active
                      // Yumshoq faol holat: sahifadagi asosiy (to'q zumrad) tugma bilan
                      // raqobatlashmasligi uchun to'liq to'ldirilgan pill ishlatilmaydi.
                      ? 'bg-primary/12 font-medium text-[var(--accent-text)]'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {/* PRO belgisi FAQAT hali sotib olmaganlarga ko'rsatiladi —
                      obunachiga o'z tarifini qayta sotishning ma'nosi yo'q. */}
                  {item.href === '/premium' && !user?.is_premium && (
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-1.5 py-0.5 font-mono text-xs font-bold text-black">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <div
          onClick={() => router.push('/profile')}
          className="group flex cursor-pointer items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <div className="relative shrink-0">
            <CosmeticAvatar
              className="size-9"
              src={user?.avatar_url}
              name={user?.first_name || user?.username}
              cosmetics={user?.cosmetics}
              fallbackClassName="text-xs"
            />
            {user?.is_premium && (
              <span
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-black"
                title="Premium"
              >
                <Crown className="size-2.5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium transition-colors group-hover:text-[var(--accent-text)]">
              {user?.first_name || user?.username}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              Lvl {user?.level} · <span className="text-[var(--accent-text)]">{user?.xp} XP</span>
            </p>
            {/* Do'kondan olingan unvon — taqilgan bo'lsa ko'rinadi. */}
            {user?.cosmetics?.title?.payload?.title && (
              <p className="truncate text-xs text-[var(--tone-streak-text)]">
                {user.cosmetics.title.payload.title}
              </p>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); logout(); router.push('/login'); }}
            title="Tizimdan chiqish"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-[var(--danger-text)]"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
