'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileCheck2, Swords, GraduationCap, User, BookOpen, Film } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { prefetchApi } from '@/lib/api-cache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

type TabItem = {
  href: string;
  label: string;
  icon: any;
  matchPrefixes?: string[];
  api?: string;
};

interface MobileTabBarProps {
  theme?: 'dark' | 'light';
}

export default function MobileTabBar({ theme: propTheme }: MobileTabBarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isLight: systemIsLight } = useTheme();
  const isLight = propTheme !== undefined ? propTheme === 'light' : systemIsLight;

  if (pathname.startsWith('/teacher') || pathname.startsWith('/panel')) return null;

  const isTeacherOrAdmin = Boolean(
    user?.is_teacher ||
    user?.is_superadmin ||
    user?.role === 'teacher' ||
    user?.role === 'superadmin'
  );

  const tabs: TabItem[] = [
    { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard, api: '/api/dashboard/home/' },
    { href: '/reels', label: 'Reels', icon: Film, matchPrefixes: ['/reels'] },
    { href: '/tests', label: 'Testlar', icon: FileCheck2, matchPrefixes: ['/tests'], api: '/api/tests/' },
    { href: '/battles', label: 'Arena', icon: Swords, matchPrefixes: ['/battles', '/games'] },
    isTeacherOrAdmin
      ? { href: '/teacher', label: 'Sinfxona', icon: GraduationCap, matchPrefixes: ['/teacher'] }
      : { href: '/library', label: 'Kutubxona', icon: BookOpen, matchPrefixes: ['/library'], api: '/api/learning/library/' },
  ];

  const isActive = (href: string, prefixes?: string[]) =>
    pathname === href || (prefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <nav
      className={cn(
        'ilm-mobile-tabbar z-40 flex items-center justify-around ios-glass-heavy lg:hidden select-none transition-all',
        isLight
          ? 'fixed bottom-2.5 left-3 right-3 sm:left-6 sm:right-6 rounded-[28px] border border-black/[0.08] bg-white/88 px-2 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]'
          : 'fixed bottom-2.5 left-3 right-3 sm:left-6 sm:right-6 rounded-[28px] border border-white/[0.12] bg-[#1C1C1E]/88 px-2 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]'
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href, tab.matchPrefixes);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onTouchStart={() => tab.api && prefetchApi(tab.api)}
            className={cn(
              'ios-spring group relative flex min-h-[46px] min-w-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-1',
              active
                ? 'text-primary font-bold bg-primary/10'
                : 'text-muted-foreground hover:text-foreground font-medium'
            )}
          >
            <Icon
              className={cn(
                'size-5 transition-transform duration-200',
                active ? 'scale-105 stroke-[2.4]' : 'stroke-[1.9]'
              )}
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
          'ios-spring group relative flex min-h-[46px] min-w-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-1',
          isProfileActive
            ? 'text-primary font-bold bg-primary/10'
            : 'text-muted-foreground hover:text-foreground font-medium'
        )}
      >
        <Avatar
          className={cn(
            'size-5.5 transition-transform duration-200',
            isProfileActive
              ? 'border-2 border-primary scale-105'
              : 'border border-border'
          )}
        >
          <AvatarImage src={user?.avatar_url || ''} />
          <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : <User className="size-3 text-primary" />}
          </AvatarFallback>
        </Avatar>

        <span className="truncate text-[10px] leading-none tracking-tight">
          Profilim
        </span>
      </Link>
    </nav>
  );
}
