'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
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
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Left: Mobile Hamburger & Search Trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground active:scale-95 transition cursor-pointer"
          aria-label="Menyu ochish"
        >
          <Menu className="size-4" />
        </button>

        {/* Global Search Bar (Ctrl+K trigger) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2.5 rounded-lg border border-border bg-card/60 hover:bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer font-medium"
        >
          <Search className="size-3.5 text-muted-foreground" />
          <span>Kurslar, testlar va mavzularni qidirish...</span>
          <kbd className="ml-4 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground font-semibold">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Gamification Status Pills & Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {user && (
          <>
            {/* 1. STREAK PILL (Amber / Gold Flame) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onStreakClick}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 active:scale-95 transition cursor-pointer"
                >
                  <Flame className="size-3.5 fill-current text-amber-500" />
                  <span className="font-mono">{user.streak || 0}</span>
                  <span className="hidden sm:inline text-[10px] font-medium opacity-80">kun</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                {user.streak || 0} kunlik uzluksiz olovli dars seriyasi (Streak)
              </TooltipContent>
            </Tooltip>

            {/* 2. COINS PILL */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/shop"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted/70 px-2.5 text-xs font-semibold text-foreground active:scale-95 transition cursor-pointer"
                >
                  <Coins className="size-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-mono">{(user.coins || 0).toLocaleString()}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                Tangalar balansi — do&apos;kondan buyumlar olish uchun
              </TooltipContent>
            </Tooltip>

            {/* 3. ARENA ELO PILL */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/battles"
                  className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted/70 px-2.5 text-xs font-semibold text-foreground active:scale-95 transition cursor-pointer"
                >
                  <Swords className="size-3.5 text-primary" />
                  <span className="font-mono">{user.elo_rating || 1200}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">ELO</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                Arena ELO reytingi va 1v1 bellashuvlar
              </TooltipContent>
            </Tooltip>

            {/* 4. NOTIFICATION BELL */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onNotificationsClick}
                  className="relative flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition cursor-pointer"
                  aria-label="Bildirishnomalar"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black !text-white shadow-xs leading-none ring-2 ring-background">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                Bildirishnomalar {unreadCount > 0 ? `(${unreadCount} ta yangi)` : ''}
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* 5. THEME TOGGLE (Sun / Moon) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition cursor-pointer"
              aria-label={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="size-4 text-slate-600 transition-transform hover:-rotate-12" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs font-medium">
            {isDark ? "Yorug' rejim (Light)" : "Qorong'i rejim (Dark)"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
