'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileCheck2, BookOpen, Swords, Bot, ShoppingBag, Crown,
  Trophy, User, Search, RotateCcw, Map, Sprout, ScrollText, CornerDownLeft,
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';
import { useFeatureFlags } from '@/lib/features';

type Item = { href: string; label: string; hint: string; icon: typeof LayoutDashboard; featureKey?: string };

const ITEMS: Item[] = [
  { href: '/dashboard', label: 'Boshqaruv', hint: 'Bosh sahifa', icon: LayoutDashboard },
  { href: '/tests', label: 'Test Markazi', hint: 'BBA & Milliy Sertifikat testlari', icon: FileCheck2, featureKey: 'tests' },
  { href: '/tests/revision', label: 'Xatolar Ustida Ishlash', hint: 'Spaced repetition', icon: RotateCcw, featureKey: 'tests' },
  { href: '/learning', label: "O'quv Markazi", hint: 'Konspekt, audio, flashcard', icon: BookOpen, featureKey: 'learning' },
  { href: '/battles', label: '1v1 Duel Arena', hint: 'Jonli intellektual jang', icon: Swords, featureKey: 'battles' },
  { href: '/games/timeline', label: 'Xronologik Ketma-ketlik', hint: "O'yin", icon: ScrollText, featureKey: 'games' },
  { href: '/games/map', label: 'Xarita Challenge', hint: "O'yin", icon: Map, featureKey: 'games' },
  { href: '/games/character', label: 'Tarixiy Shaxsni Toping', hint: "O'yin", icon: Sprout, featureKey: 'games' },
  { href: '/mentor', label: 'AI Mentor 24/7', hint: 'Savol-javob', icon: Bot, featureKey: 'ai_mentor' },
  { href: '/shop', label: "Do'kon & Sovg'a", hint: 'Artefaktlar', icon: ShoppingBag, featureKey: 'shop' },
  { href: '/premium', label: 'Premium PRO', hint: 'Tariflar', icon: Crown },
  { href: '/leaderboard', label: 'Liderlar Ligasi', hint: 'Respublika reytingi', icon: Trophy, featureKey: 'leaderboard' },
  { href: '/profile', label: 'Mening Profilim', hint: 'Sozlamalar, referral', icon: User },
];

/* Har bir sahifa — o'z rangli doirasi (pastel palitra) */
const TONES = [
  'bg-[var(--ps-blue)] text-[#080808]',
  'bg-[var(--ps-purple)] text-white',
  'bg-[var(--ps-coral)] text-white',
  'bg-[var(--ps-orange)] text-[#080808]',
  'bg-[var(--ps-green)] text-white',
  'bg-[var(--ps-lilac)] text-[#080808]',
];

export default function CommandPalette() {
  const router = useRouter();
  const { isEnabled } = useFeatureFlags();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const filtered = ITEMS.filter(
    (i) => (!i.featureKey || isEnabled(i.featureKey)) && (i.label + i.hint).toLowerCase().includes(query.toLowerCase()),
  );

  function go(item: Item) {
    soundFX.click();
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && filtered[active]) { go(filtered[active]); }
  }

  if (!open) return null;

  return (
    <div
      className="ps-shell animate-fadeIn fixed inset-0 z-[60] flex items-start justify-center bg-[#0B0814]/45 px-3 pt-20 backdrop-blur-md sm:pt-28"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sahifa qidirish"
        className="animate-scaleIn w-full max-w-xl overflow-hidden rounded-[32px] bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)]"
      >
        {/* Qidiruv maydoni */}
        <div className="p-3 pb-2">
          <div className="flex items-center gap-3 rounded-full bg-[var(--ps-neutral)] py-1.5 pl-1.5 pr-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
              <Search className="size-[18px]" />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder="Sahifa yoki bo'lim qidirish…"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--text-primary)] placeholder:font-medium placeholder:text-[var(--text-faint)] focus:outline-none"
            />
            <kbd className="shrink-0 rounded-full bg-[var(--ps-paper)] px-2.5 py-1 font-mono text-[11px] font-bold text-[var(--text-muted)]">ESC</kbd>
          </div>
        </div>

        {/* Natijalar */}
        <div className="max-h-[min(420px,60svh)] space-y-1 overflow-y-auto px-3 pb-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-[22px] bg-[var(--ps-neutral)] px-4 py-8 text-center">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[var(--text-muted)]">
                <Search className="size-5" />
              </span>
              <p className="text-[13px] font-semibold text-[var(--text-muted)]">Hech narsa topilmadi.</p>
            </div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === i;
            const tone = TONES[ITEMS.indexOf(item) % TONES.length];
            return (
              <button
                key={item.href}
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[22px] p-2 pr-3 text-left transition-colors ${
                  isActive
                    ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--ps-neutral)]'
                }`}
              >
                <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold">{item.label}</span>
                  <span className={`block truncate text-[12px] font-medium ${isActive ? 'opacity-65' : 'text-[var(--text-muted)]'}`}>{item.hint}</span>
                </span>
                <span
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-all ${
                    isActive ? 'bg-[var(--ps-orange)] text-[#080808]' : 'scale-75 opacity-0'
                  }`}
                >
                  <CornerDownLeft className="size-4" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Klaviatura ko'rsatmalari */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-card)] px-5 py-3 text-[11.5px] font-semibold text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded-md bg-[var(--ps-neutral)] px-1.5 py-0.5 font-mono">↑</kbd>
            <kbd className="rounded-md bg-[var(--ps-neutral)] px-1.5 py-0.5 font-mono">↓</kbd>
            tanlash
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded-md bg-[var(--ps-neutral)] px-1.5 py-0.5 font-mono">Enter</kbd>
            ochish
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <kbd className="rounded-md bg-[var(--ps-neutral)] px-1.5 py-0.5 font-mono">Ctrl K</kbd>
            yopish
          </span>
        </div>
      </div>
    </div>
  );
}
