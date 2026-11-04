'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3, CreditCard, Image as ImageIcon, LayoutDashboard, LogOut, Megaphone, Menu, Settings, Users, UsersRound, X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { adsApi, type AdsUser, type Center } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

/* Advertiser kabineti qobig'i. Marshrut himoyasi faqat UX uchun: haqiqiy ruxsat
   backendda (IsApprovedAdvertiser). Kirmagan — /login; markaz yo'q — /apply;
   tasdiqlanmagan — /status. */

type AdsSession = { user: AdsUser; center: Center; reload: () => Promise<void> };
const AdsContext = createContext<AdsSession | null>(null);

export function useAds(): AdsSession {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsShell');
  return ctx;
}

const NAV = [
  { href: '/dashboard', label: 'Umumiy', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Kampaniyalar', icon: Megaphone },
  { href: '/creatives', label: 'Creative', icon: ImageIcon },
  { href: '/audiences', label: 'Auditoriya', icon: UsersRound },
  { href: '/leads', label: 'Lidlar', icon: Users },
  { href: '/analytics', label: 'Analitika', icon: BarChart3 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Sozlamalar', icon: Settings },
];

export function adsLogout(router: ReturnType<typeof useRouter>) {
  useAuthStore.getState().logout();
  try { sessionStorage.removeItem('ilm_tg_manual_logout'); } catch { /* storage */ }
  router.replace('/login');
}

export function useAdsSessionCheck() {
  const authReady = useAuthStore((s) => s.authReady);
  const access = useAuthStore((s) => s.access);
  const [state, setState] = useState<{ loading: boolean; user: AdsUser | null; center: Center | null; error: string }>(
    { loading: true, user: null, center: null, error: '' });

  const load = useCallback(async () => {
    try {
      const me = await adsApi.me();
      setState({ loading: false, user: me.user, center: me.center, error: '' });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setState({ loading: false, user: null, center: null, error: '' });
      } else {
        setState({ loading: false, user: null, center: null, error: e instanceof Error ? e.message : 'Xatolik' });
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!access && !(typeof window !== 'undefined' && localStorage.getItem('ilmildizi_refresh'))) {
      setState({ loading: false, user: null, center: null, error: '' });
      return;
    }
    load();
  }, [authReady, access, load]);

  return { ...state, reload: load };
}

export function AdsBrand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="grid size-7 place-items-center rounded-md bg-[var(--brand)] text-[13px] font-bold text-[var(--on-brand)]">I</span>
      <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
        IlmIldizi <span className="font-normal text-[var(--text-muted)]">Ads Manager</span>
      </span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--bg-page)]">
      <div className="size-6 animate-spin rounded-full border-2 border-[var(--brand-soft)] border-t-[var(--brand)]" aria-label="Yuklanmoqda" />
    </div>
  );
}

export default function AdsShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const session = useAdsSessionCheck();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (session.loading || session.error) return;
    if (!session.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!session.center) router.replace('/apply');
    else if (session.center.status !== 'approved') router.replace('/status');
  }, [session, router, pathname]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (session.error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg-page)] p-6 text-center">
        <div>
          <p className="text-[14px] text-[var(--danger-text)]">{session.error}</p>
          <button className="mt-3 text-[13px] font-medium text-[var(--brand-text)] underline" onClick={() => session.reload()}>Qayta urinish</button>
        </div>
      </div>
    );
  }
  if (session.loading || !session.user || !session.center || session.center.status !== 'approved') {
    return <FullPageLoader />;
  }

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Asosiy menyu">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition',
            active(href)
              ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]')}>
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-[var(--border-soft)] p-3">
      <div className="truncate px-2 text-[13px] font-medium text-[var(--text-primary)]">{session.center.name}</div>
      <div className="truncate px-2 text-[12px] text-[var(--text-muted)]">@{session.user.username}</div>
      <button onClick={() => adsLogout(router)}
        className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
        <LogOut className="size-4" aria-hidden /> Chiqish
      </button>
    </div>
  );

  return (
    <AdsContext.Provider value={{ user: session.user, center: session.center, reload: session.reload }}>
      <div className="min-h-dvh bg-[var(--bg-page)]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border-card)] bg-[var(--surface-card)] lg:flex">
          <div className="px-5 py-5"><AdsBrand /></div>
          <div className="flex-1 overflow-y-auto px-3">{nav}</div>
          {footer}
        </aside>

        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border-card)] bg-[var(--surface-card)]/95 px-4 backdrop-blur lg:hidden">
          <AdsBrand />
          <button aria-label="Menyu" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 hover:bg-[var(--surface-hover)]">
            <Menu className="size-5" />
          </button>
        </header>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[var(--surface-card)] shadow-xl">
              <div className="flex items-center justify-between px-5 py-4">
                <AdsBrand />
                <button aria-label="Yopish" onClick={() => setMenuOpen(false)} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-3">{nav}</div>
              {footer}
            </div>
          </div>
        )}

        <main className="lg:pl-60">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </AdsContext.Provider>
  );
}
