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

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <nav className="ilm-mobile-tabbar fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-slate-800/80 bg-slate-950/85 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl border-t border-white/10 lg:hidden shadow-2xl select-none">
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
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {/* Active Pill Glow */}
            {active && (
              <span className="absolute top-0 h-1 w-7 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            )}

            <PremiumIcon
              icon={Icon}
              tone={active ? tab.tone : 'zinc'}
              size="sm"
              glow={active}
              className={cn('transition-transform duration-200', active ? 'scale-105' : 'opacity-70')}
            />

            <span className="truncate text-[10px] leading-none tracking-tight">
              {tab.label}
            </span>
          </Link>
        );
      })}

      {/* 5-slot — Profil / Hisobim: to'g'ridan-to'g'ri /profile sahifasiga o'tadi */}
      <Link
        href="/profile"
        aria-label="Hisobim va Profil"
        className={cn(
          'relative flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-all duration-200 active:scale-95',
          isProfileActive
            ? 'text-emerald-400 font-bold'
            : 'text-slate-400 hover:text-slate-200'
        )}
      >
        {isProfileActive && (
          <span className="absolute top-0 h-1 w-7 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
        )}

        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-xl transition-all',
            isProfileActive
              ? 'ring-2 ring-emerald-400/50 scale-105'
              : 'ring-1 ring-slate-800'
          )}
        >
          {user ? (
            <Avatar className="size-6 border border-slate-700">
              <AvatarImage src={user.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[9px] bg-slate-800 text-emerald-300 font-bold">
                {(user.first_name || user.username || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="size-4 text-slate-400" />
          )}
        </div>

        <span className="truncate text-[10px] leading-none tracking-tight">
          Hisobim
        </span>
      </Link>
    </nav>
  );
}
