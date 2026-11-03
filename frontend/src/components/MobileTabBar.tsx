'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Zap,
  Landmark,
  Flame,
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

  // 5-Tugmali Super-App Bottom Navigation:
  // 1. Asosiy (/dashboard)
  // 2. Mashq (/sprint)
  // 3. Imtihon (/tests) - Markaziy Katta Tugma
  // 4. Lenta (/feed)
  // 5. Profil (/profile)
  const tabs: TabItem[] = [
    {
      href: '/dashboard',
      label: t('Asosiy'),
      icon: LayoutDashboard,
      api: '/api/dashboard/home/',
      activeBg: 'bg-gradient-to-b from-[var(--brand-hover)] to-[var(--brand)]',
      activeShadow: 'shadow-[0_4px_12px_rgba(45,106,79,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[var(--brand-text)]',
      activeLabelText: 'text-[var(--brand-text)]',
    },
    {
      href: '/sprint',
      label: t('Mashq'),
      icon: Zap,
      matchPrefixes: ['/sprint', '/battles', '/games'],
      featureKey: 'sprint',
      activeBg: 'bg-gradient-to-b from-[#FF9500] to-[#FF3B30]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,149,0,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF9500]',
      activeLabelText: 'text-[#FF9500] dark:text-[#FF9F0A]',
      badge: 'HOT',
    },
    {
      href: '/tests',
      label: t('Imtihon'),
      icon: Landmark,
      matchPrefixes: ['/tests', '/dtm-test', '/milliy-sertifikat'],
      api: '/api/tests/',
      featureKey: 'tests',
      isCentral: true,
      activeBg: 'bg-gradient-to-b from-[#7D7AFF] to-[#5856D6]',
      activeShadow: 'shadow-[0_6px_22px_rgba(88,86,214,0.65),inset_0_1px_0_rgba(255,255,255,0.45)]',
      inactiveIconText: 'text-[#7D7AFF]',
      activeLabelText: 'text-[#5856D6] dark:text-[#9D9BFF]',
      badge: 'BMB',
    },
    {
      href: '/feed',
      label: t('Lenta'),
      icon: Flame,
      matchPrefixes: ['/feed', '/reels'],
      api: '/api/learning/feed/',
      activeBg: 'bg-gradient-to-b from-[#FF5E7E] to-[#FF2D55]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,45,85,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF2D55]',
      activeLabelText: 'text-[#D70015] dark:text-[#FF375F]',
    },
  ];

  const visibleTabs = tabs.filter((t) => !t.featureKey || isEnabled(t.featureKey));

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <div className="ilm-mobile-tabbar fixed inset-x-0 bottom-2.5 z-40 flex justify-center px-2.5 sm:px-5 lg:hidden pointer-events-none select-none pb-[env(safe-area-inset-bottom,0px)]">
      <nav
        aria-label="Mobil navigatsiya"
        className={cn(
          'ilm-mobile-tabbar pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-1 rounded-[26px] p-1.5 backdrop-blur-2xl saturate-[190%] transition-all duration-300',
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
                'group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] py-1 px-0.5 transition-transform active:scale-92',
                isCentral && '-mt-2'
              )}
            >
              {active && (
                <motion.span
                  layoutId="ios-mobile-tab-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className={cn(
                    'inset-0 absolute rounded-[20px]',
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
                    'flex items-center justify-center rounded-[12px] transition-all duration-200',
                    isCentral ? 'size-9 shadow-md' : 'size-7.5 rounded-[10px]',
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
                  <span className="absolute -right-1.5 -top-1 rounded-full bg-[#FF3B30] px-1 py-[1px] text-[7px] font-black leading-none text-white shadow-2xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'relative z-10 mt-1 max-w-full truncate text-[10px] leading-none tracking-[-0.01em] transition-colors',
                  active
                    ? cn('font-extrabold', tab.activeLabelText)
                    : isDark
                    ? 'font-semibold text-[#8E8E93] group-hover:text-white/90'
                    : 'font-semibold text-[#8E8E93] group-hover:text-[#1C1C1E]'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* 5-Tugma: Profil & Eco-Daraxt */}
        <Link
          href="/profile"
          onClick={() => tgHaptic('select')}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] py-1 px-0.5 transition-transform active:scale-92"
        >
          {isProfileActive && (
            <motion.span
              layoutId="ios-mobile-tab-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className={cn(
                'inset-0 absolute rounded-[20px]',
                isDark
                  ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                  : 'bg-[#007AFF]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
              )}
            />
          )}

          <div className="relative z-10 flex items-center justify-center">
            <div
              className={cn(
                'flex size-7.5 items-center justify-center rounded-[10px] p-[1.5px] transition-all duration-200',
                isProfileActive
                  ? 'bg-gradient-to-b from-[#2E96FF] to-[#007AFF] shadow-[0_4px_12px_rgba(0,122,255,0.42)] scale-105'
                  : cn(isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]', 'group-hover:scale-105')
              )}
            >
              <Avatar className="size-full rounded-[8px]">
                <AvatarImage src={user?.avatar_url || ''} alt={user?.username || 'User'} />
                <AvatarFallback
                  className={cn(
                    'rounded-[8px] text-[10px] font-bold',
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
            <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-0.5 py-[1px] text-[8px] leading-none text-white shadow-2xs">
              🌳
            </span>
          </div>

          <span
            className={cn(
              'relative z-10 mt-1 max-w-full truncate text-[10px] leading-none tracking-[-0.01em] transition-colors',
              isProfileActive
                ? 'font-extrabold text-[#007AFF] dark:text-[#409CFF]'
                : isDark
                ? 'font-semibold text-[#8E8E93] group-hover:text-white/90'
                : 'font-semibold text-[#8E8E93] group-hover:text-[#1C1C1E]'
            )}
          >
            {t('Profil')}
          </span>
        </Link>
      </nav>
    </div>
  );
}
