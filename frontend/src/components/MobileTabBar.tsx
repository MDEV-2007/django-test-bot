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
  { href: '/mentor', label: 'AI Mentor', icon: Bot, tone: 'cyan' },
];

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
          ? 'fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 rounded-3xl border border-slate-200/90 bg-white/90 px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]'
          : 'fixed bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/85 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] border-t border-white/10 shadow-2xl'
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href, tab.matchPrefixes);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onTouchStart={() => tab.api && prefetchApi(tab.api)}
            className={cn(
              'relative flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-all duration-200 active:scale-95',
              active
                ? (isLight ? 'text-blue-600 font-black' : 'text-emerald-400 font-bold')
                : (isLight ? 'text-slate-500 hover:text-slate-900 font-medium' : 'text-slate-400 hover:text-slate-200')
            )}
          >
            {/* Active Pill Indicator */}
            {active && (
              <span
                className={cn(
                  'absolute top-0 h-1 w-7 rounded-full',
                  isLight
                    ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                    : 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                )}
              />
            )}

            <PremiumIcon
              icon={Icon}
              tone={active ? (isLight ? 'sky' : tab.tone) : 'zinc'}
              size="sm"
              glow={!isLight && active}
              className={cn('transition-transform duration-200', active ? 'scale-105' : 'opacity-70')}
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
          'relative flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-all duration-200 active:scale-95',
          isProfileActive
            ? (isLight ? 'text-blue-600 font-black' : 'text-emerald-400 font-bold')
            : (isLight ? 'text-slate-500 hover:text-slate-900 font-medium' : 'text-slate-400 hover:text-slate-200')
        )}
      >
        {isProfileActive && (
          <span
            className={cn(
              'absolute top-0 h-1 w-7 rounded-full',
              isLight
                ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                : 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
            )}
          />
        )}

        <Avatar
          className={cn(
            'size-6 transition-transform duration-200',
            isProfileActive
              ? (isLight ? 'border-2 border-blue-600 ring-2 ring-blue-500/20 scale-105' : 'border border-emerald-400 ring-2 ring-emerald-500/30 scale-105')
              : (isLight ? 'border border-slate-300' : 'border border-slate-700/60')
          )}
        >
          <AvatarImage src={user?.avatar_url || ''} />
          <AvatarFallback className={cn('text-[9px] font-bold', isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')}>
            {user?.username ? user.username.slice(0, 2).toUpperCase() : <User className="size-3" />}
          </AvatarFallback>
        </Avatar>

        <span className="truncate text-[10px] leading-none tracking-tight">
          Profilim
        </span>
      </Link>
    </nav>
  );
}
