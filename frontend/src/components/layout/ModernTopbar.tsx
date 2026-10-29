'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandMark } from '@/components/BrandMark';
import PremiumIcon from '@/components/ui/premium-icon';

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
    <header className="sticky top-0 z-20 flex h-14 sm:h-15 w-full items-center justify-between border-b border-border bg-background/78 px-3 sm:px-6 ios-glass transition-colors">
      {/* Left: Mobile Hamburger + Brand + iOS Spotlight Search Pill */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden ios-spring flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground cursor-pointer shadow-2xs"
          aria-label="Menyu ochish"
        >
          <Menu className="size-4" />
        </button>

        <Link href="/dashboard" className="lg:hidden flex items-center gap-1.5 min-w-0">
          <BrandMark size={26} rounded="rounded-[8px]" />
          <span className="hidden xs:inline font-extrabold text-sm tracking-tight text-foreground truncate">
            Ilm<span className="text-primary">Ildizi</span>
          </span>
        </Link>

        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={onSearchClick}
          className="md:hidden ios-spring flex size-8.5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
          aria-label="Qidirish"
        >
          <Search className="size-3.5" />
        </button>

        {/* iOS Spotlight Search Trigger (⌘K / Ctrl+K) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="ios-spring hidden md:flex items-center gap-2.5 rounded-full bg-muted/80 hover:bg-muted px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer font-medium"
        >
          <Search className="size-3.5 text-muted-foreground" />
          <span>Kurslar, testlar va mavzularni qidirish...</span>
          <kbd className="ml-3 rounded-full bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-semibold shadow-2xs border border-border">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: iOS Dynamic Island Style Status Pills & Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {user && (
          <>
            {/* 1. STREAK PILL */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onStreakClick}
                  className="ios-spring flex h-8.5 items-center gap-1.5 rounded-full border border-[#FF9500]/25 bg-[#FF9500]/12 pl-1.5 pr-2.5 sm:pr-3 text-xs font-bold text-[#C93400] dark:text-[#FF9F0A] hover:bg-[#FF9500]/18 cursor-pointer"
                >
                  <PremiumIcon icon={Flame} tone="amber" size="2xs" solid />
                  <span className="font-mono text-[11px] sm:text-xs">{user.streak || 0}</span>
                  <span className="hidden sm:inline text-[10px] font-semibold opacity-80">kun</span>
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
                  className="ios-spring flex h-8.5 items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/70 pl-1.5 pr-2.5 sm:pr-3 text-xs font-bold text-foreground shadow-2xs cursor-pointer"
                >
                  <PremiumIcon icon={Coins} tone="gold" size="2xs" solid />
                  <span className="font-mono text-[11px] sm:text-xs">{(user.coins || 0).toLocaleString()}</span>
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
                  className="ios-spring hidden sm:flex h-8.5 items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/70 pl-1.5 pr-3 text-xs font-bold text-foreground shadow-2xs cursor-pointer"
                >
                  <PremiumIcon icon={Swords} tone="sky" size="2xs" solid />
                  <span className="font-mono">{user.elo_rating || 1200}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">ELO</span>
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
                  className="ios-spring relative flex size-8.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
                  aria-label="Bildirishnomalar"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-black !text-white shadow-2xs leading-none ring-2 ring-background">
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
              className="ios-spring flex size-8.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
              aria-label={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
            >
              {isDark ? (
                <Sun className="size-4 text-[#FFD60A] transition-transform hover:rotate-45" />
              ) : (
                <Moon className="size-4 text-[#5856D6] transition-transform hover:-rotate-12" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs font-medium">
            {isDark ? "Yorug' rejim (iOS Light)" : "Qorong'i rejim (iOS Dark)"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
