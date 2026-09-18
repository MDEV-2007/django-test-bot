'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ModernTopbarProps {
  onMenuClick: () => void;
  user?: {
    username: string;
    first_name?: string;
    streak?: number;
    coins?: number;
    elo_rating?: number;
    freeze_count?: number;
  } | null;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onSearchClick?: () => void;
  onStreakClick?: () => void;
  theme?: 'dark' | 'light';
}

export default function ModernTopbar({
  onMenuClick,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onSearchClick,
  onStreakClick,
  theme = 'dark',
}: ModernTopbarProps) {
  const isLight = theme === 'light';

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6 backdrop-blur-xl transition-colors',
        isLight
          ? 'border-slate-200/90 bg-white/90 shadow-xs'
          : 'border-slate-800/70 bg-slate-950/70 border-t border-white/5'
      )}
    >
      {/* Left: Mobile Hamburger & Search Trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            'lg:hidden flex size-10 items-center justify-center rounded-2xl border active:scale-95 transition cursor-pointer',
            isLight
              ? 'border-slate-200 bg-slate-100/90 text-slate-700 hover:text-slate-950 hover:bg-slate-200/80'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
          )}
          aria-label="Menyu ochish"
        >
          <Menu className="size-5" />
        </button>

        {/* Global Search Bar (Ctrl+K trigger) */}
        <button
          type="button"
          onClick={onSearchClick}
          className={cn(
            'hidden md:flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-xs transition-all cursor-pointer',
            isLight
              ? 'border-slate-200 bg-slate-100/80 text-slate-600 hover:bg-slate-100 hover:text-slate-950 shadow-2xs'
              : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/70 shadow-inner'
          )}
        >
          <Search className={cn('size-3.5', isLight ? 'text-blue-600' : 'text-emerald-400')} />
          <span>Kurslar, testlar va mavzularni qidirish...</span>
          <kbd
            className={cn(
              'ml-4 rounded-lg border px-1.5 py-0.5 font-mono text-[10px]',
              isLight
                ? 'border-slate-300 bg-white text-slate-700 shadow-2xs'
                : 'border-slate-700/60 bg-slate-800/80 text-slate-300'
            )}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Gamification Status Pills */}
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. STREAK PILL (Energetic Orange/Coral Flame) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onStreakClick}
                className={cn(
                  'group flex min-h-[40px] items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-black hover:scale-105 active:scale-95 transition cursor-pointer',
                  isLight
                    ? 'border-orange-200 bg-orange-50/90 text-orange-600 shadow-xs hover:border-orange-300'
                    : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-500/50'
                )}
              >
                <Flame className={cn('size-4 fill-current animate-bounce', isLight ? 'text-orange-500' : 'text-amber-400')} />
                <span className="font-mono">{user.streak || 0}</span>
                <span className="hidden sm:inline text-[10px] font-semibold opacity-90">kun</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className={cn('text-xs font-semibold', isLight ? 'bg-white border-slate-200 text-slate-800 shadow-md' : 'bg-slate-900 border-slate-800')}>
              {user.streak || 0} kunlik uzluksiz olovli dars seriyasi (Streak)
            </TooltipContent>
          </Tooltip>

          {/* 2. COINS PILL (Tangalar) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/shop"
                className={cn(
                  'flex min-h-[40px] items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-black hover:scale-105 active:scale-95 transition cursor-pointer',
                  isLight
                    ? 'border-amber-200 bg-amber-50/90 text-amber-800 shadow-xs hover:border-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500/50'
                )}
              >
                <Coins className={cn('size-4 fill-current', isLight ? 'text-amber-600' : 'text-emerald-400')} />
                <span className="font-mono">{(user.coins || 0).toLocaleString()}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent className={cn('text-xs font-semibold', isLight ? 'bg-white border-slate-200 text-slate-800 shadow-md' : 'bg-slate-900 border-slate-800')}>
              Tangalar balansi — do&apos;konda yangi skin va unvonlar olish uchun
            </TooltipContent>
          </Tooltip>

          {/* 3. ARENA ELO PILL (Electric Blue in light mode) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/battles"
                className={cn(
                  'hidden sm:flex min-h-[40px] items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-black hover:scale-105 active:scale-95 transition cursor-pointer',
                  isLight
                    ? 'border-blue-200 bg-blue-50/90 text-blue-700 shadow-xs hover:border-blue-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:border-rose-500/50'
                )}
              >
                <Swords className={cn('size-4', isLight ? 'text-blue-600' : 'text-rose-400')} />
                <span className="font-mono">{user.elo_rating || 1200}</span>
                <span className="text-[10px] font-semibold opacity-80">ELO</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent className={cn('text-xs font-semibold', isLight ? 'bg-white border-slate-200 text-slate-800 shadow-md' : 'bg-slate-900 border-slate-800')}>
              Arena ELO reytingi va ligadagi o&apos;rningiz
            </TooltipContent>
          </Tooltip>

          {/* 4. NOTIFICATION BELL */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onNotificationsClick}
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-2xl border active:scale-95 transition cursor-pointer',
                  isLight
                    ? 'border-slate-200 bg-slate-100/90 text-slate-700 hover:text-slate-950 hover:bg-slate-200/80 shadow-xs'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
                )}
                aria-label="Bildirishnomalar"
              >
                <Bell className={cn('size-4', unreadCount > 0 && (isLight ? 'text-blue-600 animate-pulse' : 'text-emerald-400 animate-pulse'))} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className={cn('text-xs font-semibold', isLight ? 'bg-white border-slate-200 text-slate-800 shadow-md' : 'bg-slate-900 border-slate-800')}>
              Bildirishnomalar {unreadCount > 0 ? `(${unreadCount} ta yangi)` : ''}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </header>
  );
}
