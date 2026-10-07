'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Sun, Moon } from 'lucide-react';
import StatNumber from '@/components/motion/StatNumber';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { decodeJwtPayload } from '@/lib/jwt';
import { soundFX } from '@/lib/soundFX';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import StreakModal from '@/components/student/StreakModal';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';
import { BrandMark } from './BrandMark';
import { cn } from '@/lib/utils';

export default function AppShell() {
  const router = useRouter();
  const { user, access } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const impersonating = access ? decodeJwtPayload(access)?.impersonator_id : null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.tactile-btn')) soundFX.click();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ unread_count: number }>('/api/dashboard/notifications/')
      .then((res) => {
        if (res && typeof res.unread_count === 'number') {
          setUnreadCount(res.unread_count);
        }
      })
      .catch(() => {});
  }, [access]);

  async function stopImpersonation() {
    const res = await apiFetch<{ access: string; refresh: string }>('/api/panel/stop-impersonation/', { method: 'POST' });
    useAuthStore.getState().setAccess(res.access);
    const me = await fetchMe();
    useAuthStore.getState().setSession(res.access, res.refresh, me);
    router.push('/panel/users');
  }

  return (
    <>
      {/* Do'kondan olingan mavzu rangi butun interfeysga shu yerdan tarqaladi. */}
      <CosmeticTheme />

      {/* Modern Unicorn Sidebar (Desktop fixed + Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Clean Minimalist Topbar */}
      <header className="ilm-topbar sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 text-foreground backdrop-blur-md px-4 sm:px-6 lg:pl-[calc(16rem+1.5rem)] lg:pr-6 transition-colors">
        {/* Left: Mobile Menu + Impersonation + Search */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground active:scale-95 transition cursor-pointer"
            aria-label="Menyu ochish"
          >
            <Menu className="size-4" />
          </button>

          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <BrandMark size={28} rounded="rounded-xl" />
            <span className="font-bold text-sm text-foreground">Ilm<span className="text-primary">Ildizi</span></span>
          </Link>

          {impersonating != null && (
            <button
              onClick={stopImpersonation}
              className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              {user?.username} sifatida ko&apos;ryapsiz — chiqish
            </button>
          )}

          {/* Quick Search Bar (Ctrl+K) */}
          <button
            type="button"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
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
              {/* 1. STREAK PILL */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setStreakModalOpen(true);
                    }}
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
                  <Link
                    href="/dashboard"
                    className="relative flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition cursor-pointer"
                    aria-label="Bildirishnomalar"
                  >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
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

      {/* Mobile Tab Bar (hidden when mobile drawer is open) */}
      {!mobileMenuOpen && <MobileTabBar />}

      {/* Command Palette */}
      {user && <CommandPalette />}

      {/* Streak Details Modal */}
      {user && (
        <StreakModal
          open={streakModalOpen}
          onOpenChange={setStreakModalOpen}
          user={user}
        />
      )}
    </>
  );
}
