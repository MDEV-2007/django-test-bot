'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { decodeJwtPayload } from '@/lib/jwt';
import { soundFX } from '@/lib/soundFX';
import { cn } from '@/lib/utils';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import StreakModal from '@/components/student/StreakModal';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';
import ModernTopbar from './layout/ModernTopbar';

let cachedUnreadCount = 0;
let lastNotifsFetch = 0;
const NOTIFS_CACHE_MS = 60_000; // 60 soniya xotira keshi

export default function AppShell({
  hideTopbarOnMobile = false,
}: {
  hideTopbarOnMobile?: boolean;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const isImmersiveMobile = hideTopbarOnMobile || Boolean(pathname?.startsWith('/reels'));
  const { user, access } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);

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
    const now = Date.now();
    if (now - lastNotifsFetch < NOTIFS_CACHE_MS) {
      setUnreadCount(cachedUnreadCount);
      return;
    }
    apiFetch<{ unread_count: number }>('/api/dashboard/notifications/')
      .then((res) => {
        if (res && typeof res.unread_count === 'number') {
          cachedUnreadCount = res.unread_count;
          lastNotifsFetch = Date.now();
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

      <ModernTopbar
        className={cn(
          'ilm-topbar lg:pl-[calc(16rem+1.5rem)]',
          isImmersiveMobile ? 'hidden lg:flex' : 'flex'
        )}
        onMenuClick={() => setMobileMenuOpen(true)}
        user={user}
        unreadCount={unreadCount}
        onStreakClick={() => {
          soundFX.click();
          setStreakModalOpen(true);
        }}
        leftSlot={
          impersonating != null ? (
            <button
              onClick={stopImpersonation}
              className="rounded-full bg-destructive/12 border border-destructive/20 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              {user?.username} sifatida ko&apos;ryapsiz — chiqish
            </button>
          ) : null
        }
      />

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
