'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Landmark,
  MessageCircle,
  Swords,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import { tgHaptic } from '@/lib/telegram';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useTransliterate } from '@/lib/transliterate';

type TabItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefixes?: string[];
  api?: string;
  activeBg: string;
  activeShadow: string;
  inactiveIconText: string;
  activeLabelText: string;
  badge?: string;
  featureKey?: string;
  isCentral?: boolean;
};

const STUDY_PREFIXES = ['/study', '/learning', '/library', '/mentor', '/flashcards', '/games',
                        '/tests/revision', '/tests/mistakes'];
const TESTS_PREFIXES = ['/tests', '/sprint', '/dtm-test', '/milliy-sertifikat', '/onboarding'];

interface MobileTabBarProps {
  theme?: 'dark' | 'light';
}

export default function MobileTabBar({ theme: propTheme }: MobileTabBarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isDark: systemIsDark } = useTheme();
  const isDark = propTheme !== undefined ? propTheme === 'dark' : systemIsDark;
  const { isEnabled, refresh } = useFeatureFlags();
  const { t } = useTransliterate();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  // 6 ta asosiy tab (rejadagi student navigatsiyasi): Bosh sahifa, O'rganish, Sinovlar
  // (markaziy: Standard / Blitz / Stress / Sprint), Hamjamiyat, Arena, Profil (pastda).
  // Hech bir sahifa o'chirilmagan — Sprint, Revision, Flashcards, Reels, Reyting va
  // Analitika tegishli tab ostida faol bo'ladi (matchPrefixes) va Sidebar'da ichki havola.
  const tabs: TabItem[] = [
    {
      href: '/dashboard',
      label: t('Bosh sahifa'),
      icon: LayoutDashboard,
      api: '/api/dashboard/home/',
      activeBg: 'bg-gradient-to-b from-[var(--brand-hover)] to-[var(--brand)]',
      activeShadow: 'shadow-[0_4px_12px_rgba(45,106,79,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[var(--brand-text)]',
      activeLabelText: 'text-[var(--brand-text)]',
    },
    {
      href: '/study',
      label: t("O'rganish"),
      icon: Brain,
      matchPrefixes: STUDY_PREFIXES,
      featureKey: 'learning',
      activeBg: 'bg-gradient-to-b from-[#FF9500] to-[#FF7A00]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,149,0,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF9500]',
      activeLabelText: 'text-[#C93400] dark:text-[#FF9F0A]',
    },
    {
      href: '/tests',
      label: t('Sinovlar'),
      icon: Landmark,
      matchPrefixes: TESTS_PREFIXES,
      api: '/api/tests/',
      featureKey: 'tests',
      isCentral: true,
      activeBg: 'bg-gradient-to-b from-[#7D7AFF] to-[#5856D6]',
      activeShadow: 'shadow-[0_6px_22px_rgba(88,86,214,0.65),inset_0_1px_0_rgba(255,255,255,0.45)]',
      inactiveIconText: 'text-[#7D7AFF]',
      activeLabelText: 'text-[#5856D6] dark:text-[#9D9BFF]',
    },
    {
      href: '/feed',
      label: t('Hamjamiyat'),
      icon: MessageCircle,
      matchPrefixes: ['/feed', '/reels'],
      api: '/api/learning/feed/',
      activeBg: 'bg-gradient-to-b from-[#34C759] to-[#248A3D]',
      activeShadow: 'shadow-[0_4px_12px_rgba(52,199,89,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#34C759]',
      activeLabelText: 'text-[#248A3D] dark:text-[#30D158]',
    },
    {
      href: '/battles',
      label: t('Arena'),
      icon: Swords,
      matchPrefixes: ['/battles', '/leaderboard'],
      featureKey: 'battles',
      activeBg: 'bg-gradient-to-b from-[#FF5E7E] to-[#FF2D55]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,45,85,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF2D55]',
      activeLabelText: 'text-[#D70015] dark:text-[#FF375F]',
    },
  ];

  const visibleTabs = tabs.filter((t) => !t.featureKey || isEnabled(t.featureKey));

  const isActive = (href: string, prefixes?: string[]) => {
    // Xatolar ustida ishlash /tests/* ostida bo'lsa ham O'rganish bo'limiga tegishli.
    if (href === '/tests' && STUDY_PREFIXES.some((p) => pathname.startsWith(p))) return false;
    return pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);
  };

  const isProfileActive = ['/profile', '/shop', '/premium', '/analytics'].some((p) => pathname.startsWith(p));

  return (
    <div className="ilm-mobile-tabbar fixed inset-x-0 bottom-2.5 z-40 flex justify-center px-2.5 sm:px-5 lg:hidden pointer-events-none select-none pb-[env(safe-area-inset-bottom,0px)]">
      <nav
        aria-label="Mobil navigatsiya"
        className={cn(
          'ilm-mobile-tabbar pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-1 rounded-2xl p-1.5 backdrop-blur-2xl saturate-[190%] transition-all duration-300',
          isDark
            ? 'border border-white/[0.14] bg-[#1C1C1E]/88 shadow-[0_18px_44px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'border border-black/[0.08] bg-white/86 shadow-[0_14px_38px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]'
        )}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.matchPrefixes);
          const isCentral = Boolean(tab.isCentral);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => tgHaptic('select')}
              onTouchStart={() => tab.api && prefetchApi(tab.api)}
              className={cn(
                'group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-1 px-0.5 transition-transform active:scale-92',
                isCentral && '-mt-2'
              )}
            >
              {active && (
                <motion.span
                  layoutId="ios-mobile-tab-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className={cn(
                    'inset-0 absolute rounded-xl',
                    isDark
                      ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                      : 'bg-[#007AFF]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                  )}
                />
              )}

              {/* Icon Container */}
              <div className="relative z-10 flex items-center justify-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-md transition-all duration-200',
                    isCentral ? 'size-9 shadow-md' : 'size-7.5 rounded-md',
                    active
                      ? cn(tab.activeBg, tab.activeShadow, '!text-white scale-105')
                      : cn(
                          isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]',
                          tab.inactiveIconText,
                          'group-hover:scale-105'
                        )
                  )}
                >
                  <Icon
                    className={cn(
                      'transition-transform duration-200',
                      isCentral ? 'size-5' : 'size-4',
                      active ? 'stroke-[2.4] !text-white' : 'stroke-[2.1]'
                    )}
                  />
                </div>

                {tab.badge && !active && (
                  <span className="absolute -right-1.5 -top-1 rounded-full bg-[#D70015] px-1 py-[1px] text-[10px] font-bold leading-none text-white shadow-2xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'relative z-10 mt-1 max-w-full truncate text-[12px] leading-none tracking-[-0.01em] transition-colors',
                  active
                    ? cn('font-bold', tab.activeLabelText)
                    : isDark
                    ? 'font-semibold text-[#8E8E93] group-hover:text-white/90'
                    : 'font-semibold text-[#6C6C70] group-hover:text-[#1C1C1E]'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* 6-Tab: Profil (statistika, analitika, inventar) */}
        <Link
          href="/profile"
          onClick={() => tgHaptic('select')}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-1 px-0.5 transition-transform active:scale-92"
        >
          {isProfileActive && (
            <motion.span
              layoutId="ios-mobile-tab-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className={cn(
                'inset-0 absolute rounded-xl',
                isDark
                  ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                  : 'bg-[#007AFF]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
              )}
            />
          )}

          <div className="relative z-10 flex items-center justify-center">
            <div
              className={cn(
                'flex size-7.5 items-center justify-center rounded-md p-[1.5px] transition-all duration-200',
                isProfileActive
                  ? 'bg-gradient-to-b from-[#2E96FF] to-[#007AFF] shadow-[0_4px_12px_rgba(0,122,255,0.42)] scale-105'
                  : cn(isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]', 'group-hover:scale-105')
              )}
            >
              <Avatar className="size-full rounded-sm">
                <AvatarImage src={user?.avatar_url || ''} alt={user?.username || 'User'} />
                <AvatarFallback
                  className={cn(
                    'rounded-sm text-[12px] font-bold',
                    isProfileActive
                      ? 'bg-white text-[#007AFF]'
                      : isDark
                      ? 'bg-white/10 text-white'
                      : 'bg-black/5 text-[#1C1C1E]'
                  )}
                >
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : <User className="size-3.5" />}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Eco-tree status sprout badge */}
            <span className="absolute -right-1 -top-1 rounded-full bg-[var(--brand)] px-0.5 py-[1px] text-[10px] leading-none text-white shadow-2xs">
              🌳
            </span>
          </div>

          <span
            className={cn(
              'relative z-10 mt-1 max-w-full truncate text-[12px] leading-none tracking-[-0.01em] transition-colors',
              isProfileActive
                ? 'font-bold text-[#007AFF] dark:text-[#409CFF]'
                : isDark
                ? 'font-semibold text-[#8E8E93] group-hover:text-white/90'
                : 'font-semibold text-[#6C6C70] group-hover:text-[#1C1C1E]'
            )}
          >
            {t('Profil')}
          </span>
        </Link>
      </nav>
    </div>
  );
}
