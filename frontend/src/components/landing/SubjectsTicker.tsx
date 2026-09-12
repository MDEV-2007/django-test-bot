'use client';

import Link from 'next/link';

interface SubjectItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  count: string;
  color: string;
}

const TICKER_SUBJECTS: SubjectItem[] = [
  { id: 'tarix', name: 'Tarix', icon: '🏛️', href: '/mock', count: '1,500+', color: 'hover:border-amber-300' },
  { id: 'ona-tili', name: 'Ona tili', icon: '📖', href: '/mock', count: '1,200+', color: 'hover:border-emerald-300' },
  { id: 'matematika', name: 'Matematika', icon: '📐', href: '/mock', count: '1,800+', color: 'hover:border-sky-300' },
  { id: 'biologiya', name: 'Biologiya', icon: '🌿', href: '/mock', count: '1,100+', color: 'hover:border-green-300' },
  { id: 'kimyo', name: 'Kimyo', icon: '🧪', href: '/mock', count: '950+', color: 'hover:border-purple-300' },
  { id: 'geografiya', name: 'Geografiya', icon: '🌍', href: '/mock', count: '850+', color: 'hover:border-teal-300' },
  { id: 'fizika', name: 'Fizika', icon: '⚡', href: '/mock', count: '1,050+', color: 'hover:border-blue-300' },
  { id: 'ingliz-tili', name: 'Ingliz tili (CEFR)', icon: '🇬🇧', href: '/mock', count: '900+', color: 'hover:border-rose-300' },
  { id: 'adabiyot', name: 'Adabiyot', icon: '📚', href: '/mock', count: '800+', color: 'hover:border-indigo-300' },
  { id: 'informatika', name: 'Informatika', icon: '💻', href: '/mock', count: '650+', color: 'hover:border-cyan-300' },
];

export default function SubjectsTicker() {
  return (
    <div className="w-full border-y border-slate-200/90 bg-white/80 backdrop-blur-md py-4 overflow-hidden shadow-xs">
      <div className="lp-ticker-track flex items-center gap-6 px-4">
        {/* First set */}
        {TICKER_SUBJECTS.map((s) => (
          <Link
            key={`s1-${s.id}`}
            href={s.href}
            className={`inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition-all hover:scale-105 hover:shadow-md hover:text-slate-900 ${s.color}`}
          >
            <span className="text-base select-none">{s.icon}</span>
            <span>{s.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 font-medium">
              {s.count}
            </span>
          </Link>
        ))}

        {/* Second duplicated set for seamless infinite marquee */}
        {TICKER_SUBJECTS.map((s) => (
          <Link
            key={`s2-${s.id}`}
            href={s.href}
            tabIndex={-1}
            aria-hidden="true"
            className={`inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition-all hover:scale-105 hover:shadow-md hover:text-slate-900 ${s.color}`}
          >
            <span className="text-base select-none">{s.icon}</span>
            <span>{s.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 font-medium">
              {s.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
