'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Layers,
  Swords,
  Trophy,
  User,
  BarChart3,
  Crown,
  LogOut,
  X,
  GraduationCap,
  ShieldCheck,
  Film,
  ChevronRight,
  Zap,
  Flame,
  Landmark,
  Brain,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { tgHaptic } from '@/lib/telegram';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import VerifiedBadge from '@/components/ui/verified-badge';
import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/lib/utils';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { useTransliterate } from '@/lib/transliterate';
import ScriptToggle from '@/components/ScriptToggle';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  user?: any;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: PremiumIconTone;
  badge: string | null;
  matchPrefixes?: string[];
  featureKey?: string;
  api?: string;
  glow?: boolean;
  vip?: boolean;
  highlight?: boolean;
  teacherOrAdminOnly?: boolean;
  children?: { href: string; label: string; featureKey?: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Student navigatsiyasi: 6 ta asosiy bo'lim. Ilgari 13 ta teng darajali havola bor edi;
// endi har bir sahifa (hech biri o'chirilmagan) tegishli bo'limning ichki havolasi —
// bo'lim faol bo'lganda ostida ko'rinadi.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, badge: null, tone: 'sky', api: '/api/dashboard/home/' },
      {
        href: '/tests', label: 'Sinovlar', icon: Landmark, badge: 'BMB', tone: 'purple', featureKey: 'tests',
        matchPrefixes: ['/sprint', '/dtm-test', '/milliy-sertifikat', '/onboarding'],
        children: [
          { href: '/tests?mode=standard', label: 'Standart testlar' },
          { href: '/tests?mode=blitz', label: '7-savol Blitz' },
          { href: '/tests?mode=stress', label: 'BMB Stress zali' },
          { href: '/sprint', label: 'Fokus Sprint', featureKey: 'sprint' },
          { href: '/tests/history', label: 'Natijalar tarixi' },
        ],
      },
      {
        href: '/study', label: "O'rganish", icon: Brain, badge: null, tone: 'amber', featureKey: 'learning',
        matchPrefixes: ['/study', '/learning', '/library', '/mentor', '/flashcards', '/games', '/tests/revision', '/tests/mistakes'],
        children: [
          { href: '/study', label: 'Dars va shpargalka' },
          { href: '/study?tab=focus', label: 'Fokus xonasi' },
          { href: '/flashcards', label: 'Flashcards', featureKey: 'flashcards' },
          { href: '/tests/revision', label: 'Xatolar ustida ishlash' },
          { href: '/library', label: 'Kutubxona' },
        ],
      },
      {
        href: '/feed', label: 'Hamjamiyat', icon: Flame, badge: null, tone: 'rose', matchPrefixes: ['/feed', '/reels'],
        api: '/api/learning/feed/',
        children: [
          { href: '/feed', label: 'Lenta' },
          { href: '/reels', label: 'Bilim Reels', featureKey: 'reels' },
        ],
      },
      {
        href: '/battles', label: 'Arena', icon: Swords, badge: 'Live', tone: 'rose', featureKey: 'battles',
        matchPrefixes: ['/battles', '/leaderboard'],
        children: [
          { href: '/battles', label: '1v1 Arena' },
          { href: '/leaderboard', label: 'Liga & Reyting', featureKey: 'leaderboard' },
        ],
      },
      {
        href: '/profile', label: 'Profil', icon: User, badge: null, tone: 'sky', matchPrefixes: ['/profile', '/analytics', '/shop'],
        children: [
          { href: '/profile', label: 'Profilim' },
          { href: '/analytics', label: "O'sish analitikasi" },
          { href: '/shop', label: "Do'kon" },
        ],
      },
    ],
  },
  {
    label: 'Obuna',
    items: [
      { href: '/premium', label: 'VIP Obuna', icon: Crown, badge: 'VIP', vip: true, tone: 'gold', matchPrefixes: ['/premium'] },
    ],
  },
];

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  user: propUser,
  onLogout: propLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: storeUser, logout } = useAuthStore();
  const user = propUser || storeUser;
  const handleLogout = propLogout || logout;
  const { isEnabled, refresh } = useFeatureFlags();
  const { t } = useTransliterate();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isTeacher = pathname.startsWith('/teacher');
  const isAdmin = pathname.startsWith('/panel');

  if (isTeacher || isAdmin) return null;

  const isActive = (item: NavItem) => {
    // Xatolar daftari /tests/* ostida, lekin O'rganish bo'limiga tegishli.
    if (item.href === '/tests' && (pathname.startsWith('/tests/revision') || pathname.startsWith('/tests/mistakes'))) {
      return false;
    }
    if (pathname === item.href || (item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false)) return true;
    // "Sinov Testlari" /tests/* ostida faol, lekin Xatolar daftari o'z bandiga ega.
    return item.href === '/tests'
      && pathname.startsWith('/tests/')
      && !pathname.startsWith('/tests/revision')
      && !pathname.startsWith('/tests/mistakes');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto scrollbar-none px-3.5 py-5 select-none bg-card/85 ios-glass text-card-foreground">
      {/* 1. iPadOS BRAND HEADER */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onMobileClose} className="group flex items-center gap-2.5">
            <div className="relative flex size-9.5 shrink-0 items-center justify-center rounded-md overflow-hidden border border-border bg-background shadow-2xs transition-transform group-hover:scale-105">
              <BrandMark size={36} rounded="rounded-md" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                  {t('Ilm')}<span className="text-primary">{t('Ildizi')}</span>
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary uppercase">
                  PRO
                </span>
              </div>
              <p className="text-[12px] font-medium text-muted-foreground truncate">
                {t("Intellektual Ta'lim")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <ScriptToggle />
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="lg:hidden ios-spring flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Yopish"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rol panellari tezkor havolasi */}
        {(user?.is_teacher || user?.is_superadmin) && (
          <div className="space-y-1.5 px-1">
            {user.is_teacher && (
              <Link
                href="/teacher"
                onClick={onMobileClose}
                className="ios-spring flex items-center justify-between rounded-lg border border-primary/20 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/14"
              >
                <span className="flex items-center gap-2 truncate">
                  <PremiumIcon icon={GraduationCap} tone="sky" size="2xs" solid />
                  <span className="truncate">O&apos;qituvchi paneli</span>
                </span>
                <ChevronRight className="size-3.5 opacity-70" />
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                onClick={onMobileClose}
                className="ios-spring flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/14"
              >
                <span className="flex items-center gap-2 truncate">
                  <PremiumIcon icon={ShieldCheck} tone="rose" size="2xs" solid />
                  <span className="truncate">Super Admin paneli</span>
                </span>
                <ChevronRight className="size-3.5 opacity-70" />
              </Link>
            )}
          </div>
        )}

        {/* 2. iOS SETTINGS-STYLE NAVIGATION GROUPS */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group, gIdx) => {
            const isTeacherOrAdmin = Boolean(
              user?.is_teacher ||
              user?.is_superadmin ||
              user?.role === 'teacher' ||
              user?.role === 'superadmin'
            );
            const visibleItems = group.items.filter((it) => {
              if (it.teacherOrAdminOnly && !isTeacherOrAdmin) return false;
              return !it.featureKey || isEnabled(it.featureKey);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1.5">
                <span className="px-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t(group.label)}
                </span>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);

                    return (
                      <div key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        onMouseEnter={() => item.api && prefetchApi(item.api)}
                        onTouchStart={() => item.api && prefetchApi(item.api)}
                        className={cn(
                          'ios-spring group relative flex min-h-[42px] items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-all',
                          active
                            ? 'bg-primary text-white font-semibold shadow-[0_4px_14px_rgba(45,106,79,0.30)]'
                            : 'text-foreground/85 hover:bg-muted/70 hover:text-foreground font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PremiumIcon
                            icon={Icon as any}
                            tone={item.tone || 'primary'}
                            size="xs"
                            solid
                          />
                          <span className="truncate tracking-[-0.01em]">{t(item.label)}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-bold tracking-tight shrink-0 select-none',
                              active
                                ? 'bg-white/20 text-white'
                                : item.glow
                                ? 'bg-[#FF3B30]/12 text-[#FF3B30]'
                                : item.vip
                                ? 'bg-[#FF9500]/15 text-[#C93400] dark:text-[#FFD60A]'
                                : item.highlight
                                ? 'bg-primary/12 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                        {active && item.children && (
                          <div className="ml-[38px] mt-0.5 mb-1 space-y-0.5 border-l border-border pl-2.5">
                            {item.children.filter((c) => !c.featureKey || isEnabled(c.featureKey)).map((c) => (
                              <Link
                                key={c.href}
                                href={c.href}
                                onClick={onMobileClose}
                                className={cn(
                                  'block rounded-md px-2 py-1.5 text-[13px] transition-colors',
                                  !c.href.includes('?') && (pathname === c.href || (c.href !== item.href && pathname.startsWith(c.href + '/')))
                                    ? 'font-semibold text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {t(c.label)}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* 3. APPLE ID / ICLOUD STYLE USER PROFILE FOOTER */}
      <div className="pt-3 border-t border-border mt-4 space-y-2.5">
      {user && (
        <div>
          <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => {
                  onMobileClose?.();
                  router.push('/profile');
                }}
                className="relative shrink-0 cursor-pointer"
              >
                <CosmeticAvatar
                  className="size-9 border border-border shadow-2xs"
                  src={user.avatar_url}
                  name={user.first_name || user.username}
                  cosmetics={user.cosmetics}
                  fallbackClassName="text-xs font-bold text-primary"
                />
                {user.is_premium && (
                  <span className="absolute -top-1 -right-1 size-[18px] rounded-full bg-[#C93400] flex items-center justify-center text-[10px] text-white font-bold shadow-2xs">
                    ★
                  </span>
                )}
              </div>

              <div
                onClick={() => {
                  onMobileClose?.();
                  router.push('/profile');
                }}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold truncate text-foreground hover:text-primary transition-colors">
                    {user.first_name || user.username}
                  </p>
                  <VerifiedBadge role={user.role} isSuperadmin={user.is_superadmin} isTeacher={user.is_teacher} size="xs" />
                </div>
                <div className="flex items-center gap-1 text-[12px] text-muted-foreground font-medium">
                  <span className="font-mono font-bold text-primary">Lvl {user.level || 1}</span>
                  <span>·</span>
                  <span className="font-mono">{(user.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  router.push('/login');
                }}
                className="ios-spring flex size-7.5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/12 transition cursor-pointer"
                title="Tizimdan chiqish"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Level XP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>Keyingi daraja</span>
                <span className="font-bold text-primary">
                  {Math.min(100, Math.round(((user.xp || 0) % 1000) / 10))}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(5, Math.min(100, Math.round(((user.xp || 0) % 1000) / 10)))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed iPadOS Sidebar */}
      <aside className="ilm-sidebar fixed left-0 top-0 z-40 hidden h-screen w-64 select-none flex-col border-r border-border bg-card/85 ios-glass text-card-foreground lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Spring Physics */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-[80] w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
