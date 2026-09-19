'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileCheck2, Swords, Bot, User } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { prefetchApi } from '@/lib/api-cache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

type TabItem = {
  href: string;
  label: string;
  icon: any;
  tone: PremiumIconTone;
  matchPrefixes?: string[];
  api?: string;
};

const TABS: TabItem[] = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, tone: 'emerald', api: '/api/dashboard/home/' },
  { href: '/tests', label: 'Testlar', icon: FileCheck2, tone: 'sky', matchPrefixes: ['/tests'], api: '/api/tests/' },
  { href: '/battles', label: 'Arena', icon: Swords, tone: 'rose', matchPrefixes: ['/battles', '/games'] },
  { href: '/mentor', label: 'AI Mentor', icon: Bot, tone: 'purple' },
];

const TONE_ACTIVE_MAP: Record<string, { text: string; indicator: string }> = {
  emerald: { text: 'text-emerald-600', indicator: 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
  sky: { text: 'text-blue-600', indicator: 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' },
  rose: { text: 'text-rose-600', indicator: 'bg-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]' },
  purple: { text: 'text-purple-600', indicator: 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
  indigo: { text: 'text-indigo-600', indicator: 'bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]' },
};

interface MobileTabBarProps {
  theme?: 'dark' | 'light';
}

export default function MobileTabBar({ theme = 'light' }: MobileTabBarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isLight = theme === 'light';

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <nav
      className={cn(
        'ilm-mobile-tabbar z-40 flex items-stretch justify-around backdrop-blur-2xl lg:hidden select-none transition-all',
        isLight
          ? 'fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 rounded-3xl border border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]'
          : 'fixed bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/85 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] border-t border-white/10 shadow-2xl'
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href, tab.matchPrefixes);
        const toneStyle = TONE_ACTIVE_MAP[tab.tone] || TONE_ACTIVE_MAP.emerald;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onTouchStart={() => tab.api && prefetchApi(tab.api)}
            className={cn(
              'group relative flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-all duration-200 active:scale-95',
              active
                ? `${toneStyle.text} font-bold`
                : 'text-slate-600 hover:text-slate-950 font-medium'
            )}
          >
            {/* Active Pill Indicator */}
            {active && (
              <span
                className={cn(
                  'absolute top-0 h-1 w-7 rounded-full',
                  toneStyle.indicator
                )}
              />
            )}

            <PremiumIcon
              icon={Icon}
              tone={tab.tone}
              size="sm"
              glow={active}
              className={cn('transition-transform duration-200', active ? 'scale-110 shadow-xs' : 'opacity-85 group-hover:opacity-100 group-hover:scale-105')}
            />

            <span className="truncate text-[10px] leading-none tracking-tight">
              {tab.label}
            </span>
          </Link>
        );
      })}

      {/* Profil tab (Avatar) */}
      <Link
        href="/profile"
        className={cn(
          'group relative flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-all duration-200 active:scale-95',
          isProfileActive
            ? 'text-indigo-600 font-bold'
            : 'text-slate-600 hover:text-slate-950 font-medium'
        )}
      >
        {isProfileActive && (
          <span
            className={cn(
              'absolute top-0 h-1 w-7 rounded-full',
              TONE_ACTIVE_MAP.indigo.indicator
            )}
          />
        )}

        <Avatar
          className={cn(
            'size-6 transition-transform duration-200',
            isProfileActive
              ? 'border-2 border-indigo-600 ring-2 ring-indigo-500/20 scale-110'
              : 'border border-indigo-300/60 bg-indigo-50/50 group-hover:scale-105'
          )}
        >
          <AvatarImage src={user?.avatar_url || ''} />
          <AvatarFallback className="text-[9px] font-bold bg-indigo-50 text-indigo-700">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : <User className="size-3 text-indigo-600" />}
          </AvatarFallback>
        </Avatar>

        <span className="truncate text-[10px] leading-none tracking-tight">
          Profilim
        </span>
      </Link>
    </nav>
  );
}
