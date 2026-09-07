'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Coins, Search, Snowflake } from 'lucide-react';
import StatNumber from '@/components/motion/StatNumber';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { decodeJwtPayload } from '@/lib/jwt';
import { soundFX } from '@/lib/soundFX';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import StreakModal from '@/components/student/StreakModal';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';

export default function AppShell() {
  const router = useRouter();
  const { user, access } = useAuthStore();
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const impersonating = access ? decodeJwtPayload(access)?.impersonator_id : null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.tactile-btn')) soundFX.click();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

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
      <Sidebar />
      <header className="ilm-topbar sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border-card)] bg-[var(--bg-page)]/90 px-4 py-2.5 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          {impersonating != null && (
            <button onClick={stopImpersonation} className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--danger-text)]">
              {user?.username} sifatida ko&apos;ryapsiz — chiqish
            </button>
          )}
          <Link href="/dashboard" className="font-voice text-sm font-semibold text-[var(--accent-text)] lg:hidden">IlmIldizi</Link>
        </div>

        {user && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => { soundFX.click(); setStreakModalOpen(true); }}
              title="Ketma-ketlik (Streak) tafsilotlari"
              className="tactile-btn flex items-center gap-1.5 rounded-lg border border-[var(--tone-streak)]/25 bg-[var(--tone-streak-soft)] px-2.5 py-1 font-semibold text-[var(--tone-streak-text)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 animate-flame-pulse" />
              <span><StatNumber value={user.streak} /> kun</span>
            </button>
            {/* Tanga — oltin (`premium` ohangi). Streak esa yonida to'q sariq: ilgari
                ikkalasi ham bir xil sariq edi va bir-biridan ajralmasdi. */}
            <Link href="/shop" title="Tanga balansi" className="flex items-center gap-1.5 rounded-lg border border-[var(--tone-premium)]/25 bg-[var(--tone-premium-soft)] px-2.5 py-1 font-semibold text-[var(--tone-premium-text)]">
              <Coins className="h-3.5 w-3.5" />
              <span><StatNumber value={user.coins} /></span>
            </Link>
            {user.freeze_count > 0 && (
              <Link href="/shop/inventory" title="Streak muzlatish" className="hidden items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-600 dark:text-sky-300 sm:flex">
                <Snowflake className="h-3.5 w-3.5" />
                <span>{user.freeze_count} muzlatish</span>
              </Link>
            )}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              title="Qidiruv (Ctrl+K)"
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] px-2.5 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="font-mono text-xs">Ctrl K</kbd>
            </button>
          </div>
        )}
      </header>
      <MobileTabBar />
      {user && <CommandPalette />}
      {user && <StreakModal open={streakModalOpen} onOpenChange={setStreakModalOpen} user={user} />}
    </>
  );
}
