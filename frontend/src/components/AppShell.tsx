'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Flame, Coins, Swords, Bell, Search, Snowflake } from 'lucide-react';
import StatNumber from '@/components/motion/StatNumber';
import { useAuthStore } from '@/lib/auth-store';
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
        theme="light"
      />

      {/* Modern Unicorn Topbar */}
      <header className="ilm-topbar sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] lg:pl-64">
        {/* Left: Hamburger on Mobile + Brand Logo + Impersonation Alert + Search */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition cursor-pointer shadow-sm"
            aria-label="Menyu ochish"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <BrandMark size={28} rounded="rounded-xl" />
            <span className="font-bold text-sm text-slate-800">Ilm<span className="text-emerald-600">Ildizi</span></span>
          </Link>

          {impersonating != null && (
            <button
              onClick={stopImpersonation}
              className="rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition"
            >
              {user?.username} sifatida ko&apos;ryapsiz — chiqish
            </button>
          )}

          {/* Quick Search Bar (Ctrl+K) */}
          <button
            type="button"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden md:flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-white transition-all shadow-inner group cursor-pointer"
          >
            <Search className="size-3.5 group-hover:text-blue-600 transition-colors" />
            <span>Kurslar, testlar va mavzularni qidirish...</span>
            <kbd className="ml-3 rounded-lg border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Gamification Status Pills */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1. STREAK PILL (Olov animatsiyasi) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.click();
                    setStreakModalOpen(true);
                  }}
                  className="group flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 shadow-sm hover:border-orange-300 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Flame className="size-4 text-amber-400 fill-amber-400 animate-bounce" />
                  <span className="font-mono"><StatNumber value={user.streak || 0} /></span>
                  <span className="hidden sm:inline text-[10px] font-semibold text-amber-400/80">kun</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-slate-200 text-slate-800 shadow-md text-xs font-semibold">
                {user.streak || 0} kunlik uzluksiz olovli dars seriyasi (Streak)
              </TooltipContent>
            </Tooltip>

            {/* 2. COINS PILL (Tangalar) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/shop"
                  className="group flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm hover:border-emerald-300 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Coins className="size-4 text-emerald-600 fill-emerald-600" />
                  <span className="font-mono"><StatNumber value={user.coins || 0} /></span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-slate-200 text-slate-800 shadow-md text-xs font-semibold">
                Tangalar balansi — do&apos;kondan buyumlar olish uchun
              </TooltipContent>
            </Tooltip>

            {/* 3. ARENA ELO PILL (Planshet va desktopda) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/battles"
                  className="hidden sm:flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm hover:border-rose-300 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Swords className="size-4 text-rose-600" />
                  <span className="font-mono">{user.elo_rating || 1200}</span>
                  <span className="text-[10px] font-semibold text-rose-500">ELO</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-slate-200 text-slate-800 shadow-md text-xs font-semibold">
                Arena ELO reytingi va 1v1 bellashuvlar
              </TooltipContent>
            </Tooltip>

            {/* 4. NOTIFICATION BELL */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className="relative flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition cursor-pointer shadow-sm"
                  aria-label="Bildirishnomalar"
                >
                  <Bell className={cn('size-4', unreadCount > 0 && 'text-blue-600 animate-pulse')} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-bounce">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-slate-200 text-slate-800 shadow-md text-xs font-semibold">
                Bildirishnomalar {unreadCount > 0 ? `(${unreadCount} ta yangi)` : ''}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </header>

      {/* Mobile Tab Bar */}
      <MobileTabBar theme="light" />

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
