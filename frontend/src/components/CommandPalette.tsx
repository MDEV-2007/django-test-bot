'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileCheck2, BookOpen, Swords, Bot, ShoppingBag, Crown,
  BarChart3, Trophy, User, Search, RotateCcw, Map, Sprout, ScrollText,
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';

type Item = { href: string; label: string; hint: string; icon: typeof LayoutDashboard };

const ITEMS: Item[] = [
  { href: '/dashboard', label: 'Boshqaruv', hint: 'Bosh sahifa', icon: LayoutDashboard },
  { href: '/tests', label: 'Test Markazi', hint: 'BBA & Milliy Sertifikat testlari', icon: FileCheck2 },
  { href: '/tests/revision', label: 'Xatolar Ustida Ishlash', hint: 'Spaced repetition', icon: RotateCcw },
  { href: '/learning', label: "O'quv Markazi", hint: 'Konspekt, audio, flashcard', icon: BookOpen },
  { href: '/battles', label: '1v1 Duel Arena', hint: 'Jonli intellektual jang', icon: Swords },
  { href: '/games/timeline', label: 'Xronologik Ketma-ketlik', hint: "O'yin", icon: ScrollText },
  { href: '/games/map', label: 'Xarita Challenge', hint: "O'yin", icon: Map },
  { href: '/games/character', label: 'Tarixiy Shaxsni Toping', hint: "O'yin", icon: Sprout },
  { href: '/mentor', label: 'AI Mentor 24/7', hint: 'Savol-javob', icon: Bot },
  { href: '/shop', label: "Do'kon & Sovg'a", hint: 'Artefaktlar', icon: ShoppingBag },
  { href: '/premium', label: 'Premium PRO', hint: 'Tariflar', icon: Crown },
  { href: '/analytics', label: 'Analitika', hint: "O'sish va natijalar", icon: BarChart3 },
  { href: '/leaderboard', label: 'Liderlar Ligasi', hint: 'Respublika reytingi', icon: Trophy },
  { href: '/profile', label: 'Mening Profilim', hint: 'Sozlamalar, referral', icon: User },
];

export default function CommandPalette() {
  const router = useRouter();
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

  const filtered = ITEMS.filter((i) => (i.label + i.hint).toLowerCase().includes(query.toLowerCase()));

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
    <div className="animate-fadeIn fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scaleIn w-full max-w-lg overflow-hidden border border-[var(--border-card)] bg-[var(--surface-card-strong)] shadow-2xl bento-card"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Sahifa qidirish..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <kbd className="rounded-md border border-[var(--border-card)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-faint)]">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-4 text-center text-xs text-[var(--text-faint)]">Hech narsa topilmadi.</p>}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  active === i ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active === i ? 'text-[var(--on-accent)]' : 'text-[var(--text-muted)]'}`} />
                <span className="font-medium">{item.label}</span>
                <span className={`ml-auto truncate text-xs ${active === i ? 'text-[var(--on-accent)]/70' : 'text-[var(--text-faint)]'}`}>{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
