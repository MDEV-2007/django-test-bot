'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import {
  LayoutDashboard, FileCheck2, BookOpen, Swords, Bot, ShoppingBag, Crown,
  BarChart3, Trophy, User, LogOut, GraduationCap, ShieldCheck, Layers, Sparkles, Globe, Headphones
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  matchPrefixes?: string[];
  tone?: PremiumIconTone;
  glow?: boolean;
  featureKey?: string;
  /* Sahifa ochilishida so'raladigan asosiy endpoint. Havola ustiga kelgan (yoki unga
     barmoq tekkan) zahoti ma'lumot fonda olinadi — bosilganda sahifa allaqachon tayyor.
     Next'ning o'z prefetch'i faqat KOD uchun; ma'lumot baribir kutilardi. */
  api?: string;
};

/* Havolalar guruhlangan — Super Admin (`PanelShell`) va o'qituvchi (`TeacherShell`)
   panellaridagi bilan bir xil tuzilish. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, tone: 'indigo', api: '/api/dashboard/home/' },
      { href: '/study', label: 'Fokus Xonasi', icon: Headphones, tone: 'emerald', featureKey: 'study' },
      { href: '/learning', label: 'Darslar', icon: BookOpen, tone: 'sky', featureKey: 'learning', api: '/api/learning/' },
      { href: '/tests', label: 'Mashqlar', icon: FileCheck2, tone: 'emerald', featureKey: 'tests', matchPrefixes: ['/tests'], api: '/api/tests/' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot, tone: 'purple', featureKey: 'ai_mentor' },
    ],
  },
  {
    label: 'Mashq va bellashuv',
    items: [
      { href: '/reels', label: 'Bilim Reels', icon: Sparkles, tone: 'rose', featureKey: 'reels', api: '/api/learning/reels/' },
      { href: '/flashcards', label: 'Quick Learn', icon: Layers, tone: 'amber', featureKey: 'flashcards', api: '/api/learning/flashcards/' },
      { href: '/battles', label: 'Arena', icon: Swords, tone: 'rose', featureKey: 'battles', matchPrefixes: ['/games'] },
      { href: '/feed', label: 'Hamjamiyat & Liga', icon: Globe, tone: 'emerald', matchPrefixes: ['/feed', '/leaderboard'], api: '/api/learning/feed/' },
    ],
  },
  {
    label: 'Hisobim',
    items: [
      { href: '/profile', label: 'Profilim', icon: User, tone: 'indigo', matchPrefixes: ['/profile'] },
      { href: '/analytics', label: 'Analitika', icon: BarChart3, tone: 'cyan', api: '/api/analytics/' },
      { href: '/shop', label: "Do'kon", icon: ShoppingBag, tone: 'purple', featureKey: 'shop', matchPrefixes: ['/shop'] },
      { href: '/premium', label: 'Premium', icon: Crown, tone: 'gold', glow: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isEnabled, refresh } = useFeatureFlags();

  useEffect(() => {
    refresh();
  }, [refresh]);

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
                <PremiumIcon icon={GraduationCap} tone="emerald" size="xs" /> O&apos;qituvchi paneli
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--danger-text)] transition-colors hover:bg-rose-500/15"
              >
                <PremiumIcon icon={ShieldCheck} tone="rose" size="xs" /> Super Admin paneli
              </Link>
            )}
          </div>
        )}
      </div>

      <Separator />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((it) => !it.featureKey || isEnabled(it.featureKey));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-1">
              <p className="px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              {visibleItems.map((item) => {
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
                    <PremiumIcon
                      icon={Icon}
                      tone={item.tone || 'primary'}
                      size="sm"
                      glow={item.glow || active}
                    />
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
        );
      })}
      </nav>

      <Separator />

      <div className="p-3">
        <div
          onClick={() => router.push('/profile')}
          title="Profilim"
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
