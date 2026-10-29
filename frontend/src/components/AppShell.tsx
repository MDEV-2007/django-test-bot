'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { decodeJwtPayload } from '@/lib/jwt';
import { soundFX } from '@/lib/soundFX';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import StreakModal from '@/components/student/StreakModal';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';
import { BrandMark } from './BrandMark';

export default function AppShell({
  hideTopbarOnMobile = false,
}: {
  hideTopbarOnMobile?: boolean;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const isImmersiveMobile = hideTopbarOnMobile || Boolean(pathname?.startsWith('/reels'));
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
      <CosmeticTheme />

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* iOS Translucent Topbar */}
      <header
        className={cn(
          'ilm-topbar sticky top-0 z-20 h-15 w-full items-center justify-between border-b border-border bg-background/78 text-foreground ios-glass px-4 sm:px-6 lg:pl-[calc(16rem+1.5rem)] lg:pr-6 transition-colors',
          isImmersiveMobile ? 'hidden lg:flex' : 'flex'
        )}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden ios-spring flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground cursor-pointer shadow-2xs"
            aria-label="Menyu ochish"
          >
            <Menu className="size-4" />
          </button>

          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <BrandMark size={28} rounded="rounded-[9px]" />
            <span className="font-extrabold text-sm text-foreground">
              Ilm<span className="text-primary">Ildizi</span>
            </span>
          </Link>

          {impersonating != null && (
            <button
              onClick={stopImpersonation}
              className="rounded-full bg-destructive/12 border border-destructive/20 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              {user?.username} sifatida ko&apos;ryapsiz — chiqish
            </button>
          )}

          {/* iOS Spotlight Search Bar */}
          <button
            type="button"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="ios-spring hidden md:flex items-center gap-2.5 rounded-full bg-muted/80 hover:bg-muted px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer font-medium"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span>Kurslar, testlar va mavzularni qidirish...</span>
            <kbd className="ml-3 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-semibold shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: iOS Status Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setStreakModalOpen(true);
                    }}
                    className="ios-spring flex h-8.5 items-center gap-1.5 rounded-full border border-[#FF9500]/25 bg-[#FF9500]/12 px-3 text-xs font-bold text-[#C93400] dark:text-[#FF9F0A] hover:bg-[#FF9500]/18 cursor-pointer"
                  >
                    <Flame className="size-3.5 fill-[#FF9500] text-[#FF9500]" />
                    <span className="font-mono">{user.streak || 0}</span>
                    <span className="hidden sm:inline text-[10px] font-semibold opacity-80">kun</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-medium">
                  {user.streak || 0} kunlik uzluksiz olovli dars seriyasi (Streak)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/shop"
                    className="ios-spring flex h-8.5 items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/70 px-3 text-xs font-bold text-foreground shadow-2xs cursor-pointer"
                  >
                    <Coins className="size-3.5 text-[#FF9500] fill-[#FFCC00]" />
                    <span className="font-mono">{(user.coins || 0).toLocaleString()}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-medium">
                  Tangalar balansi — do&apos;kondan buyumlar olish uchun
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/battles"
                    className="ios-spring hidden sm:flex h-8.5 items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/70 px-3 text-xs font-bold text-foreground shadow-2xs cursor-pointer"
                  >
                    <Swords className="size-3.5 text-primary" />
                    <span className="font-mono">{user.elo_rating || 1200}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">ELO</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-medium">
                  Arena ELO reytingi va 1v1 bellashuvlar
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard"
                    className="ios-spring relative flex size-8.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
                    aria-label="Bildirishnomalar"
                  >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-black !text-white shadow-2xs leading-none ring-2 ring-background">
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

      {!mobileMenuOpen && <MobileTabBar />}
      {user && <CommandPalette />}
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
