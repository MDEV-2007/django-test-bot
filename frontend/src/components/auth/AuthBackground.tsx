'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/* Kirish/ro'yxatdan o'tish sahifalarining foni: yer ostida o'zaro chirmashib ketgan
   ILDIZLAR to'ri. Brend metaforasi (IlmIldizi) shu yerda birinchi marta ko'rinadi —
   foydalanuvchi hali hech narsa qilmasdan turib platformaning "ovozi"ni sezadi.

   Texnik: bitta inline SVG + ikkita radial glow. Rasm fayli yo'q, tarmoq so'rovi yo'q.
   Chiziqlar `pathLength` bilan sekin chiziladi (10–14s), shuning uchun harakat
   sezilar-sezilmas — diqqatni chalg'itmaydi. `prefers-reduced-motion` da statik. */

/* Mobil uchun ALOHIDA chizma.
   Sabab: 1440x900 kompozitsiya `slice` bilan telefonga sig'dirilganda faqat markazdagi
   ~360 birlik enidagi tasma ko'rinadi, ildizlar esa chetlarda joylashgan — natijada
   ekran shunchaki qop-qorong'i bo'lib qolardi (o'lchandi: shoxlar x = -468 va +373 da,
   ya'ni ko'rinish maydonidan tashqarida). Shuning uchun tor ekranda tik, markazlashgan
   ildiz chizmasi ishlatiladi. */
const MOBILE = {
  viewBox: '0 0 400 800',
  trunks: [
    // Chap va o'ng CHEKKADAN o'sib chiqadigan shoxlar — ekran chetlari bo'sh qolmaydi.
    'M0 790 C 60 720, 95 640, 110 560 S 130 420, 90 300',
    'M400 790 C 340 720, 305 640, 290 560 S 270 420, 310 300',
    // Markaziy tana
    'M200 800 C 206 700, 200 620, 200 540 S 194 400, 200 320',
  ],
  branches: [
    'M110 560 C 70 542, 40 546, 0 560',
    'M290 560 C 330 542, 360 546, 400 560',
    'M200 540 C 152 516, 120 520, 80 532',
    'M200 540 C 248 516, 280 520, 320 532',
    'M90 300 C 130 272, 170 262, 200 320',
    'M310 300 C 270 272, 230 262, 200 320',
    'M200 320 C 200 262, 200 216, 200 170',
    'M200 170 C 168 142, 138 132, 106 136',
    'M200 170 C 232 142, 262 132, 294 136',
    // Yuqori chetdan pastga tushadigan ikkita ingichka shox — ekranning tepasi ham
    // bo'sh qolmasligi uchun (mobil kompozitsiya balandligi bo'yicha muvozanat).
    'M0 40 C 60 70, 90 110, 96 170',
    'M400 40 C 340 70, 310 110, 304 170',
  ],
  nodes: [[110, 560], [290, 560], [200, 540], [90, 300], [310, 300], [200, 320], [200, 170]] as [number, number][],
};

/** 640px dan tor ekranmi (mobil chizmaga o'tish nuqtasi). */
function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return narrow;
}

export default function AuthBackground() {
  const reduce = useReducedMotion();
  const narrow = useNarrowScreen();

  // Ildiz shoxlari: har biri pastdan yuqoriga tarmoqlanadi (keng ekran uchun).
  const wideRoots = [
    'M0 620 C 180 600, 240 520, 300 430 S 360 250, 520 190',
    'M0 700 C 220 690, 320 610, 380 520 S 470 360, 640 300',
    'M1440 620 C 1260 600, 1200 520, 1140 430 S 1080 250, 920 190',
    'M1440 700 C 1220 690, 1120 610, 1060 520 S 970 360, 800 300',
    'M300 430 C 340 400, 420 390, 500 400',
    'M1140 430 C 1100 400, 1020 390, 940 400',
    'M380 520 C 460 500, 540 505, 610 530',
    'M1060 520 C 980 500, 900 505, 830 530',
  ];

  const roots = narrow ? [...MOBILE.trunks, ...MOBILE.branches] : wideRoots;
  const nodes: [number, number][] = narrow
    ? (MOBILE.nodes as [number, number][])
    : [[300, 430], [380, 520], [1140, 430], [1060, 520], [520, 190], [920, 190]];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Yumshoq yorug'lik dog'lari — tekis qora fonni "chuqur" qiladi */}
      <div className="absolute -left-40 top-[-10%] size-[38rem] rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="absolute -right-32 bottom-[-15%] size-[34rem] rounded-full bg-primary/[0.05] blur-3xl" />

      <svg
        viewBox={narrow ? MOBILE.viewBox : '0 0 1440 900'}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="root-fade" x1="0" y1="1" x2="0" y2="0">
            {/* Telefon ekranida kontrast pastroq bo'ladi (yorug'lik, kichik piksel
                zichligi) — tor ekranda chiziqlar biroz to'qroq. */}
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={narrow ? '0.62' : '0.30'} />
            <stop offset="60%" stopColor="var(--accent)" stopOpacity={narrow ? '0.30' : '0.12'} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {roots.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="url(#root-fade)"
            strokeWidth={i < 3 ? (narrow ? 2.8 : 2.2) : (narrow ? 1.7 : 1.3)}
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            /* Telefonda 10-14 soniyalik chizilish juda uzun: foydalanuvchi kirish
               formasini to'ldirib bo'lgunicha fon hali "o'sib" turardi. */
            transition={{ duration: narrow ? 2.4 : 10 + i, ease: 'easeOut', delay: i * (narrow ? 0.12 : 0.25) }}
          />
        ))}

        {/* Tugunlar — ildizlar kesishgan joylardagi nuqtalar */}
        {nodes.map(([cx, cy], i) => (
          <motion.circle
            key={`n-${i}`}
            cx={cx} cy={cy} r="3"
            fill="var(--accent)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.15, 0.5, 0.15], scale: 1 }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.4 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
      </svg>

      {/* Pastdan yuqoriga qorong'ulashuv — matn ustida kontrast saqlanadi */}
      {/* Matn ustida kontrast uchun yumshoq qorayish. DIQQAT: chetlari to'liq shaffofmas
          bo'lsa, ildizlarning eng to'q qismi (pastki uchlari) butunlay bekitilib qoladi —
          fon aynan shu sababli "qop-qorong'i" ko'rinardi. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/55 via-transparent to-[var(--bg-page)]/55" />
    </div>
  );
}
