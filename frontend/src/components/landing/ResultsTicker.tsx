'use client';

import { Award, CheckCircle2 } from 'lucide-react';

interface ResultItem {
  id: number;
  name: string;
  result: string;
  badge: string;
  tag: string;
  color: string;
}

const RESULTS: ResultItem[] = [
  {
    id: 1,
    name: 'Shahzodbek Qodirov',
    result: 'TDYU Davlat Granti (Tarix A+)',
    badge: '186.4 ball',
    tag: 'Tarix',
    color: 'from-[#007AFF] to-[#0062CC]',
  },
  {
    id: 2,
    name: 'Madinabonu Saidova',
    result: "O'zMU Xalqaro munosabatlar",
    badge: '184.2 ball',
    tag: 'Davlat Granti',
    color: 'from-[#34C759] to-[#28A745]',
  },
  {
    id: 3,
    name: 'Javohirbek Ergashov',
    result: 'Milliy Sertifikat A+ (Oltin)',
    badge: '96.2 ball',
    tag: 'Tarix A+',
    color: 'from-[#FF9500] to-[#E08600]',
  },
  {
    id: 4,
    name: 'Dilnoza Olimova',
    result: 'TDShU Sharqshunoslik (Grant)',
    badge: '179.8 ball',
    tag: 'Ona tili A',
    color: 'from-[#5856D6] to-[#4644B5]',
  },
  {
    id: 5,
    name: 'Asadbek Yoqubov',
    result: 'Toshkent Davlat Iqtisodiyot (TDIU)',
    badge: '181.5 ball',
    tag: 'Davlat Granti',
    color: 'from-[#007AFF] to-[#0062CC]',
  },
  {
    id: 6,
    name: 'Rayhona Zokirova',
    result: "JIDU Xalqaro Huquq (1-o'rin)",
    badge: '188.0 ball',
    tag: 'Grant',
    color: 'from-[#AF52DE] to-[#8E3CBE]',
  },
  {
    id: 7,
    name: 'Shohrux Mirzayev',
    result: 'Biologiya Milliy Sertifikat A+',
    badge: '94.5 ball',
    tag: 'TTA Grant',
    color: 'from-[#34C759] to-[#28A745]',
  },
  {
    id: 8,
    name: 'Sevinch Rustamova',
    result: 'CEFR Multi-Level C1 Sertifikat',
    badge: "C1 Ilg'or",
    tag: 'Ingliz tili',
    color: 'from-[#FF2D55] to-[#D70015]',
  },
];

export default function ResultsTicker() {
  return (
    <div className="relative w-full overflow-hidden border-y border-black/[0.06] bg-white/45 py-4 sm:py-5 backdrop-blur-md">
      {/* Gradient Fades on edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-32 bg-gradient-to-r from-[#F2F2F7] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-32 bg-gradient-to-l from-[#F2F2F7] to-transparent" />

      {/* Infinite scrolling track */}
      <div className="animate-marquee-continuous items-center gap-3.5" style={{ animation: 'marquee 35s linear infinite' }}>
        {[...RESULTS, ...RESULTS].map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            aria-hidden={idx >= RESULTS.length ? 'true' : undefined}
            className="flex items-center gap-3 rounded-[20px] border border-black/[0.07] bg-white/92 px-3.5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] ios-glass transition-all hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]"
          >
            {/* iOS Squircle Badge */}
            <div className={`flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b ${item.color} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`}>
              <Award className="size-4" />
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#1C1C1E] tracking-tight">{item.name}</span>
                <CheckCircle2 className="size-3.5 text-[#007AFF] fill-[#007AFF]/10" />
              </div>
              <span className="text-[11px] font-medium text-[#6C6C70]">{item.result}</span>
            </div>

            {/* Score pill */}
            <span className="ml-2 rounded-full bg-[#34C759]/12 px-2.5 py-1 font-mono text-[11px] font-bold text-[#248A3D] whitespace-nowrap">
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
