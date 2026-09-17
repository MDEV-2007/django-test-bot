'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Zap } from 'lucide-react';
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
}

export default function ModernTopbar({
  onMenuClick,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onSearchClick,
  onStreakClick,
}: ModernTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800/70 bg-slate-950/70 px-4 sm:px-6 backdrop-blur-xl border-t border-white/5">
      {/* Left: Mobile Hamburger & Search Trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex size-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition cursor-pointer"
          aria-label="Menyu ochish"
        >
          <Menu className="size-5" />
        </button>

        {/* Global Search Bar (Ctrl+K trigger) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-3.5 py-2 text-xs text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/70 transition-all shadow-inner group cursor-pointer"
        >
          <Search className="size-3.5 group-hover:text-emerald-400 transition-colors" />
          <span>Kurslar, testlar va mavzularni qidirish...</span>
          <kbd className="ml-4 rounded-lg border border-slate-700/60 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Gamification Status Pills */}
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. STREAK PILL (Olov effekti) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onStreakClick}
                className="group flex min-h-[40px] items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Flame className="size-4 text-amber-400 fill-amber-400 animate-bounce" />
                <span className="font-mono">{user.streak || 0}</span>
                <span className="hidden sm:inline text-[10px] font-semibold text-amber-400/80">kun</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs font-semibold">
              {user.streak || 0} kunlik uzluksiz olovli dars seriyasi (Streak)
            </TooltipContent>
          </Tooltip>

          {/* 2. COINS PILL (Tangalar) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/shop"
                className="flex min-h-[40px] items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Coins className="size-4 text-emerald-400 fill-emerald-400" />
                <span className="font-mono">{(user.coins || 0).toLocaleString()}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs font-semibold">
              Tangalar balansi — do&apos;konda yangi skin va unvonlar olish uchun
            </TooltipContent>
          </Tooltip>

          {/* 3. ARENA ELO PILL (Faqat planshet va desktopda) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/battles"
                className="hidden sm:flex min-h-[40px] items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:border-rose-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Swords className="size-4 text-rose-400" />
                <span className="font-mono">{user.elo_rating || 1200}</span>
                <span className="text-[10px] font-semibold text-rose-400/80">ELO</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs font-semibold">
              Arena ELO reytingi va ligadagi o&apos;rningiz
            </TooltipContent>
          </Tooltip>

          {/* 4. NOTIFICATION BELL */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onNotificationsClick}
                className="relative flex size-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition cursor-pointer"
                aria-label="Bildirishnomalar"
              >
                <Bell className={cn('size-4', unreadCount > 0 && 'text-emerald-400 animate-pulse')} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs font-semibold">
              Bildirishnomalar {unreadCount > 0 ? `(${unreadCount} ta yangi)` : ''}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </header>
  );
}
