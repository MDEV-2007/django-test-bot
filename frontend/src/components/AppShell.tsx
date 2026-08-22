'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Coins, Sun, Moon, Volume2, VolumeX, Search, Snowflake } from 'lucide-react';
import StatNumber from '@/components/motion/StatNumber';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { decodeJwtPayload } from '@/lib/jwt';
import { isAudioEnabled, setAudioEnabled, soundFX } from '@/lib/soundFX';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ilm_theme');
    const isDark = saved !== 'light';
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('ilm_theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      title="Mavzuni almashtirish"
      className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[var(--accent-text)]" />}
    </button>
  );
}

function AudioToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => { setEnabled(isAudioEnabled()); }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setAudioEnabled(next);
    if (next) soundFX.click();
  }

  return (
    <button
      onClick={toggle}
      title="Ovozli effektlar"
      className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      {enabled ? <Volume2 className="h-4 w-4 text-[var(--accent-text)]" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}

export default function AppShell() {
  const router = useRouter();
  const { user, access } = useAuthStore();
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
            <div title="Ketma-ketlik (Streak)" className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 font-semibold text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              <span><StatNumber value={user.streak} /> kun</span>
            </div>
            <Link href="/shop" title="Tanga balansi" className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-400">
              <Coins className="h-3.5 w-3.5" />
              <span><StatNumber value={user.coins} /></span>
            </Link>
            {user.freeze_count > 0 && (
              <Link href="/shop/inventory" title="Streak muzlatish" className="hidden items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-300 sm:flex">
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
            <AudioToggle />
            <ThemeToggle />
          </div>
        )}
      </header>
      <MobileTabBar />
      {user && <CommandPalette />}
    </>
  );
}
