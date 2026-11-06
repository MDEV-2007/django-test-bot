'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useTransliterate } from '@/lib/transliterate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandMark } from '@/components/BrandMark';
import ScriptToggle from '@/components/ScriptToggle';
import NotificationsPanel from '@/components/NotificationsPanel';
import { Initials, greeting } from '@/components/design/kit';
import { cn } from '@/lib/utils';

/* Route → page title shown at the left of the topbar (longest prefix wins). */
const PAGE_TITLES: [string, string][] = [
  ['/dashboard', 'Bosh sahifa'],
  ['/tests', 'Testlar'],
  ['/study', "O'qish"],
  ['/flashcards', 'Flashcards'],
  ['/feed', 'Hamjamiyat'],
  ['/reels', 'Reels'],
  ['/battles', 'Arena'],
  ['/leaderboard', 'Reyting'],
  ['/profile', 'Profil'],
  ['/analytics', 'Analitika'],
  ['/shop', "Do'kon"],
  ['/premium', 'Premium'],
  ['/mentor', 'AI Mentor'],
  ['/sprint', 'Sprint'],
  ['/library', 'Kutubxona'],
  ['/games', "O'yinlar"],
  ['/learning', "O'quv yo'li"],
];

function titleFor(pathname: string | null) {
  if (!pathname) return '';
  let best = '';
  let title = '';
  for (const [prefix, label] of PAGE_TITLES) {
    if ((pathname === prefix || pathname.startsWith(prefix + '/')) && prefix.length > best.length) {
      best = prefix;
      title = label;
    }
  }
  return title;
}

interface ModernTopbarProps {
  /** Eski burger tugmasi uchun edi — endi ishlatilmaydi (mobilda pastki tab bar bor). */
  onMenuClick?: () => void;
  user?: {
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    streak?: number;
    coins?: number;
    elo_rating?: number;
    freeze_count?: number;
  } | null;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  notificationsHref?: string;
  onSearchClick?: () => void;
  onStreakClick?: () => void;
  className?: string;
  /** Extra controls rendered after the title (e.g. "stop impersonation"). */
  leftSlot?: React.ReactNode;
}

export default function ModernTopbar({
  user,
  unreadCount = 0,
  onNotificationsClick,
  notificationsHref,
  onSearchClick,
  onStreakClick,
  className,
  leftSlot,
}: ModernTopbarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTransliterate();
  const pathname = usePathname();
  const title = titleFor(pathname);
  const displayName = user
    ? [user.first_name, user.last_name ? `${user.last_name[0]}.` : ''].filter(Boolean).join(' ') || user.username
    : '';
  // Sahifa tepasida header shaffof; ozgina pastga aylantirilganda fon silliq paydo bo'ladi.
  const [scrolled, setScrolled] = useState(false);
  // Bildirishnomalar paneli shu sahifaning o'zida ochiladi (dashboard'ga o'tib ketmaydi).
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadLocal, setUnreadLocal] = useState<number | null>(null);
  const closeNotif = useCallback(() => setNotifOpen(false), []);
  const unread = unreadLocal ?? unreadCount;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const search = onSearchClick ?? (() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })));

  const bellInner = (
    <>
      <Bell className="size-[18px]" strokeWidth={1.9} />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface-card)]" />
      )}
    </>
  );
  const bellCls =
    'ps-tb-icon tap-44 relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--ds-subtle)] transition-colors cursor-pointer';

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className={cn(
        'ds-topbar sticky top-0 z-20 flex h-14 w-full items-center justify-between gap-3 border-b border-[var(--ds-panel-border)] bg-[var(--surface-card)]/85 px-3 sm:px-6',
        // Blur faqat aylantirilganda (CSS kompilyatori theme faylidagi backdrop-filter'ni tashlab yuboradi)
        scrolled && 'backdrop-blur-xl backdrop-saturate-150',
        className,
      )}
    >
      {/* Left: brand (mobile) + page title (desktop) */}
      <div className="flex items-center gap-2.5 min-w-0">

        <Link href="/dashboard" className="lg:hidden flex items-center gap-2 min-w-0">
          <BrandMark size={26} rounded="rounded-md" />
          <span data-no-translit className="font-bold text-sm tracking-tight text-foreground truncate">
            Ilm<span className="text-[var(--brand-text)]">Ildizi</span>
          </span>
        </Link>

        {title && (
          <h2 className="ps-tb-title hidden lg:block text-[15px] font-bold tracking-tight text-foreground truncate">{t(title)}</h2>
        )}
        {leftSlot}
      </div>

      {/* Right: search · streak · bell · avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={search}
          className="ps-tb-search tg-hidden hidden md:flex w-56 lg:w-64 items-center gap-2 rounded-lg border border-[var(--ds-panel-border)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-muted-foreground hover:border-[var(--brand-border)] transition-colors cursor-pointer"
        >
          <Search className="size-3.5" />
          <span className="truncate">Dars, test, odamlarni qidirish…</span>
          <kbd className="ps-tb-kbd ml-auto rounded border border-[var(--ds-panel-border)] px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={search}
          className="ps-tb-icon md:hidden tg-hidden tap-44 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--ds-subtle)] cursor-pointer"
          aria-label="Qidirish"
        >
          <Search className="size-4" />
        </button>

        {user && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onStreakClick}
                  className="ps-tb-streak tg-hidden tap-44 flex h-8 items-center gap-1.5 rounded-lg border border-[var(--reward-border)] bg-[var(--reward-soft)] px-2.5 text-xs font-bold text-[var(--reward-text)] cursor-pointer"
                >
                  <Flame className="ps-tb-flame size-3.5 text-[#E07A1F]" strokeWidth={2.4} />
                  <span className="tabular-nums">{user.streak || 0}</span>
                  <span className="hidden sm:inline font-medium opacity-80">kunlik seriya</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                {user.streak || 0} kunlik uzluksiz seriya
                {typeof user.freeze_count === 'number' ? ` · ${user.freeze_count} ta muzlatish` : ''}
              </TooltipContent>
            </Tooltip>

            {onNotificationsClick ? (
              <button type="button" onClick={onNotificationsClick} className={bellCls} aria-label="Bildirishnomalar">
                {bellInner}
              </button>
            ) : (
              notificationsHref ? (
                <Link href={notificationsHref} className={bellCls} aria-label="Bildirishnomalar">
                  {bellInner}
                </Link>
              ) : (
                <button type="button" onClick={() => setNotifOpen((v) => !v)} className={bellCls} aria-label="Bildirishnomalar">
                  {bellInner}
                </button>
              )
            )}
          </>
        )}

        {/* Mobilda til va tungi rejim profil sahifasida turadi */}
        <div className="hidden sm:block">
          <ScriptToggle />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="ps-tb-icon hidden sm:flex tap-44 size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--ds-subtle)] cursor-pointer"
          aria-label={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {user && (
          <Link
            href="/profile"
            className="ps-tb-user flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-[var(--ds-subtle)] transition-colors"
          >
            <Initials name={`${user.first_name || user.username} ${user.last_name || ''}`} src={user.avatar_url} size={30} />
            <span className="hidden lg:flex flex-col leading-tight min-w-0">
              <span className="text-xs font-bold text-foreground truncate max-w-[110px]">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{greeting()}</span>
            </span>
          </Link>
        )}
      </div>
      {!onNotificationsClick && !notificationsHref && (
        <NotificationsPanel open={notifOpen} onClose={closeNotif} onUnreadChange={setUnreadLocal} />
      )}
    </header>
  );
}
