'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Landmark,
  Flame,
  Swords,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useTransliterate } from '@/lib/transliterate';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';

type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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

/* Sidebar'dagi bilan bir xil rang tonlari */
const TAB_TONES: Record<string, PremiumIconTone> = {
  '/dashboard': 'sky',
  '/study': 'amber',
  '/tests': 'purple',
  '/feed': 'rose',
  '/battles': 'rose',
};

const TONE_HEX: Record<string, string> = { sky: '#007AFF', amber: '#FF9500', purple: '#AF52DE', rose: '#FF2D55' };

const STUDY_PREFIXES = ['/study', '/learning', '/library', '/mentor', '/flashcards', '/games',
                        '/tests/revision', '/tests/mistakes'];
const TESTS_PREFIXES = ['/tests', '/sprint', '/dtm-test', '/milliy-sertifikat', '/onboarding'];

interface MobileTabBarProps {
  theme?: 'dark' | 'light';
}

export default function MobileTabBar({ theme: propTheme }: MobileTabBarProps) {
  const pathname = usePathname();
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
      label: t('Asosiy'),  // 6 tab 360px'da sig'ishi uchun qisqa yorliq
      icon: LayoutDashboard,
      api: '/api/dashboard/home/',
      activeBg: 'bg-gradient-to-b from-[var(--brand-hover)] to-[var(--brand)]',
      activeShadow: 'shadow-[0_4px_12px_rgba(45,106,79,0.42),inset_0_1px_0_rgba(255,255,255,0.38)]',
      inactiveIconText: 'text-[var(--brand-text)]',
      activeLabelText: 'text-[var(--brand-text)]',
    },
    {
      href: '/study',
      label: t("O'qish"),
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
      label: t('Jamiyat'),
      icon: Flame,
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

  /* Faol tab: pastda ikonka rangidagi chiziq (tablar orasida sirpanadi) */
  const indicator = (hex: string) => (
    <motion.span
      layoutId="ps-mobile-tab-dot"
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      aria-hidden
      className="pointer-events-none absolute -bottom-[4px] left-1/2 z-10 -ml-[8px] h-[3px] w-[16px] rounded-full"
      style={{ backgroundColor: hex }}
    />
  );

  /* Faol ikonka atrofidagi halo — ikonka bilan bir konteynerda, shuning uchun aniq markazda turadi */
  const halo = (hex: string) => (
    <motion.span
      layoutId="ps-mobile-tab-halo"
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      aria-hidden
      className="pointer-events-none absolute -inset-[5px] rounded-[15px]"
      style={{
        backgroundColor: `${hex}${isDark ? '33' : '22'}`,
        boxShadow: `inset 0 0 0 1.5px ${hex}66, 0 8px 18px -8px ${hex}aa`,
      }}
    />
  );

  return (
    <div className="ilm-mobile-tabbar pointer-events-none fixed inset-x-0 bottom-2.5 z-40 flex select-none justify-center px-2.5 pb-[env(safe-area-inset-bottom,0px)] sm:px-5 lg:hidden">
      <nav
        aria-label="Mobil navigatsiya"
        className={cn(
          'ilm-mobile-tabbar pointer-events-auto flex w-full max-w-[400px] items-center justify-between gap-1 rounded-full p-1.5 backdrop-blur-xl',
          isDark
            ? 'border border-white/[0.08] bg-[#1C1726]/92 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.75)]'
            : 'border border-black/[0.05] bg-[#FFFCF7]/92 shadow-[0_18px_40px_-18px_rgba(60,30,110,0.55)]'
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
              aria-label={tab.label}
              title={tab.label}
              aria-current={active ? 'page' : undefined}
              className="group relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              {active && indicator(TONE_HEX[TAB_TONES[tab.href]] || '#7659C7')}
              <span
                className={cn(
                  'relative z-10 flex transition-all duration-300',
                  active ? 'scale-105' : 'opacity-75 saturate-[0.8] group-hover:opacity-100 group-hover:saturate-100'
                )}
              >
                {active && halo(TONE_HEX[TAB_TONES[tab.href]] || '#7659C7')}
                <PremiumIcon icon={Icon} tone={TAB_TONES[tab.href] || 'primary'} size="md" solid />
                {tab.badge && !active && (
                  <span className="absolute -right-1.5 -top-1 rounded-full bg-[#F0523D] px-1 py-[1px] text-[9px] font-bold leading-none text-white">
                    {tab.badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}

        {/* Profil — sidebar'dagi kabi ikonka */}
        <Link
          href="/profile"
          onClick={() => tgHaptic('select')}
          aria-label={t('Profil')}
          title={t('Profil')}
          aria-current={isProfileActive ? 'page' : undefined}
          className="group relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-full transition-transform active:scale-90"
        >
          {isProfileActive && indicator(TONE_HEX.sky)}
          <span
            className={cn(
              'relative z-10 flex transition-all duration-300',
              isProfileActive ? 'scale-105' : 'opacity-75 saturate-[0.8] group-hover:opacity-100 group-hover:saturate-100'
            )}
          >
            {isProfileActive && halo(TONE_HEX.sky)}
            <PremiumIcon icon={User} tone="sky" size="md" solid />
          </span>
        </Link>
      </nav>
    </div>
  );
}
