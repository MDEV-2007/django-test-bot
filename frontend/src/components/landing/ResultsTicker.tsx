'use client';

import { Award, CheckCircle2 } from 'lucide-react';

interface ResultItem {
  id: number;
  name: string;
  result: string;
  badge: string;
  tag: string;
  score?: string;
}

const RESULTS: ResultItem[] = [
  {
    id: 1,
    name: 'Shahzodbek Qodirov',
    result: 'TDYU Davlat Granti (Tarix A+)',
    badge: '186.4 ball',
    tag: 'Tarix',
  },
  {
    id: 2,
    name: 'Madinabonu Saidova',
    result: "O'zMU Xalqaro munosabatlar",
    badge: '184.2 ball',
    tag: 'Davlat Granti',
  },
  {
    id: 3,
    name: 'Javohirbek Ergashov',
    result: 'Milliy Sertifikat A+ (Oltin)',
    badge: '96.2 ball',
    tag: 'Tarix A+',
  },
  {
    id: 4,
    name: 'Dilnoza Olimova',
    result: 'TDShU Sharqshunoslik (Grant)',
    badge: '179.8 ball',
    tag: 'Ona tili A',
  },
  {
    id: 5,
    name: 'Asadbek Yoqubov',
    result: 'Toshkent Davlat Iqtisodiyot (TDIU)',
    badge: '181.5 ball',
    tag: 'Davlat Granti',
  },
  {
    id: 6,
    name: 'Rayhona Zokirova',
    result: 'JIDU Xalqaro Huquq (1-o\'rin)',
    badge: '188.0 ball',
    tag: 'Grant',
  },
  {
    id: 7,
    name: 'Shohrux Mirzayev',
    result: 'Biologiya Milliy Sertifikat A+',
    badge: '94.5 ball',
    tag: 'TTA Grant',
  },
  {
    id: 8,
    name: 'Sevinch Rustamova',
    result: 'CEFR Multi-Level C1 Sertifikat',
    badge: 'C1 Ilg\'or',
    tag: 'Ingliz tili',
  },
];

export default function ResultsTicker() {
  return (
    <div className="relative w-full overflow-hidden border-y border-slate-200/80 bg-slate-900/[0.02] py-4 sm:py-5">
      {/* Gradient Fades on edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-32 bg-gradient-to-r from-[#f8fafc] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-32 bg-gradient-to-l from-[#f8fafc] to-transparent" />

      {/* Infinite scrolling track */}
      <div className="flex w-max animate-[marquee_45s_linear_infinite] items-center gap-4 hover:[animation-play-state:paused]">
        {[...RESULTS, ...RESULTS].map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-xs transition-all hover:border-emerald-400 hover:shadow-md"
          >
            {/* Avatar / Icon */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-xs">
              <Award className="size-4" />
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
                <CheckCircle2 className="size-3 text-emerald-500" />
              </div>
              <span className="text-[11px] font-medium text-slate-500">{item.result}</span>
            </div>

            {/* Score pill */}
            <span className="ml-2 rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
