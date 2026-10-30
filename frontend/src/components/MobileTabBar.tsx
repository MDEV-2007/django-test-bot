'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileCheck2,
  Swords,
  GraduationCap,
  User,
  BookOpen,
  Film,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import { tgHaptic } from '@/lib/telegram';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  const isTeacherOrAdmin = Boolean(
    user?.is_teacher ||
      user?.is_superadmin ||
      user?.role === 'teacher' ||
      user?.role === 'superadmin'
  );

  const tabs: TabItem[] = [
    {
      href: '/dashboard',
      label: 'Asosiy',
      icon: LayoutDashboard,
      api: '/api/dashboard/home/',
      activeBg: 'bg-gradient-to-b from-[#2E96FF] to-[#007AFF]',
      activeShadow: 'shadow-[0_4px_12px_rgba(0,122,255,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#007AFF]',
      activeLabelText: 'text-[#007AFF] dark:text-[#409CFF]',
    },
    {
      href: '/sprint',
      label: 'Sprint',
      icon: Zap,
      matchPrefixes: ['/sprint'],
      featureKey: 'sprint',
      activeBg: 'bg-gradient-to-b from-[#FF9500] to-[#FF3B30]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,149,0,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF9500]',
      activeLabelText: 'text-[#FF9500] dark:text-[#FF9F0A]',
      badge: 'HOT',
    },
    {
      href: '/tests',
      label: 'Testlar',
      icon: FileCheck2,
      matchPrefixes: ['/tests'],
      api: '/api/tests/',
      featureKey: 'tests',
      activeBg: 'bg-gradient-to-b from-[#4CD964] to-[#34C759]',
      activeShadow: 'shadow-[0_4px_12px_rgba(52,199,89,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#34C759]',
      activeLabelText: 'text-[#248A3D] dark:text-[#30D158]',
    },
    {
      href: '/reels',
      label: 'Reels',
      icon: Film,
      matchPrefixes: ['/reels'],
      api: '/api/learning/reels/',
      featureKey: 'reels',
      activeBg: 'bg-gradient-to-b from-[#FF5E7E] to-[#FF2D55]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,45,85,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF2D55]',
      activeLabelText: 'text-[#D70015] dark:text-[#FF375F]',
    },
    {
      href: '/battles',
      label: 'Arena',
      icon: Swords,
      matchPrefixes: ['/battles', '/games'],
      featureKey: 'battles',
      activeBg: 'bg-gradient-to-b from-[#FFB340] to-[#FF9500]',
      activeShadow: 'shadow-[0_4px_12px_rgba(255,149,0,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[#FF9500]',
      activeLabelText: 'text-[#C93400] dark:text-[#FF9F0A]',
      badge: 'LIVE',
    },
    ...(isTeacherOrAdmin
      ? [
          {
            href: '/teacher',
            label: 'Sinfxona',
            icon: GraduationCap,
            matchPrefixes: ['/teacher'],
            activeBg: 'bg-gradient-to-b from-[#7D7AFF] to-[#5856D6]',
            activeShadow: 'shadow-[0_4px_12px_rgba(88,86,214,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
            inactiveIconText: 'text-[#5856D6]',
            activeLabelText: 'text-[#5856D6] dark:text-[#7D7AFF]',
          },
        ]
      : [
          {
            href: '/library',
            label: 'Kutubxona',
            icon: BookOpen,
            matchPrefixes: ['/library'],
            api: '/api/learning/library/',
            featureKey: 'library',
            activeBg: 'bg-gradient-to-b from-[#7D7AFF] to-[#5856D6]',
            activeShadow: 'shadow-[0_4px_12px_rgba(88,86,214,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
            inactiveIconText: 'text-[#5856D6]',
            activeLabelText: 'text-[#5856D6] dark:text-[#7D7AFF]',
          },
        ]),
  ];

  const visibleTabs = tabs.filter((t) => !t.featureKey || isEnabled(t.featureKey));

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <div className="ilm-mobile-tabbar fixed inset-x-0 z-40 flex justify-center px-2.5 sm:px-5 lg:hidden pointer-events-none select-none">
      <nav
        aria-label="Mobil navigatsiya"
        className={cn(
          'pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-1 rounded-[26px] p-1.5 backdrop-blur-2xl saturate-[190%] transition-all duration-300',
          isDark
            ? 'border border-white/[0.14] bg-[#1C1C1E]/88 shadow-[0_18px_44px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'border border-black/[0.08] bg-white/86 shadow-[0_14px_38px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]'
        )}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.matchPrefixes);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => tgHaptic('select')}
              onTouchStart={() => tab.api && prefetchApi(tab.api)}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] py-1.5 px-0.5 transition-transform active:scale-92"
            >
              {active && (
                <motion.span
                  layoutId="ios-mobile-tab-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className={cn(
                    ' inset-0 absolute rounded-[20px]',
                    isDark
                      ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                      : 'bg-[#007AFF]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                  )}
                />
              )}

              {/* iOS 18 Squircle Icon Container */}
              <div className="relative z-10 flex items-center justify-center">
                <div
                  className={cn(
                    'flex size-7.5 items-center justify-center rounded-[10px] transition-all duration-200',
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
                      'size-4 transition-transform duration-200',
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

        {/* Apple ID / Profile Tab */}
        <Link
          href="/profile"
          onClick={() => tgHaptic('select')}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] py-1.5 px-0.5 transition-transform active:scale-92"
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
                  : isDark
                  ? 'bg-white/[0.10]'
                  : 'bg-black/[0.06]'
              )}
            >
              <Avatar className="size-full rounded-[8.5px]">
                <AvatarImage src={user?.avatar_url || ''} className="rounded-[8.5px] object-cover" />
                <AvatarFallback className="rounded-[8.5px] bg-gradient-to-b from-[#2E96FF] to-[#007AFF] text-[9px] font-extrabold !text-white">
                  {user?.username ? (
                    user.username.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="size-3.5 !text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>

            {user?.is_premium && (
              <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-[#FF9500] text-[7px] font-black text-white shadow-2xs">
                ★
              </span>
            )}
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
            Profilim
          </span>
        </Link>
      </nav>
    </div>
  );
}
