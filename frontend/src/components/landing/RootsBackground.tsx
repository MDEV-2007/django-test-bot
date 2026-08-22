'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/* Landing sahifasining foni: pastdan yuqoriga o'sib chiqadigan ILDIZLAR to'ri.
 *
 * Brend metaforasi shu yerda eng katta ko'rinishda ishlaydi — sahifa ochilganda ildizlar
 * "chizilib" o'sadi, tugunlar sekin nafas oladi, skroll paytida esa butun to'r biroz
 * pastga suriladi (parallaks) va so'nadi, ya'ni kontent "yerdan ko'tarilgandek" bo'ladi.
 *
 * Texnik tanlovlar:
 *   - bitta inline SVG, hech qanday rasm yoki tashqi fayl yo'q (0 ta tarmoq so'rovi);
 *   - faqat `opacity`, `pathLength` va `translateY` animatsiya qilinadi — bularning
 *     hammasi kompozitor darajasida, ya'ni layout qayta hisoblanmaydi;
 *   - `prefers-reduced-motion` yoqilgan bo'lsa to'r darhol to'liq holatda, harakatsiz.
 */
/* Tor ekran uchun alohida, tik kompozitsiya. Keng chizma `slice` bilan telefonda
   deyarli butunlay kesilib ketadi (shoxlar ko'rinish maydonidan chiqib qoladi) —
   o'lchov bilan tasdiqlangan. */
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

export default function RootsBackground() {
  const reduce = useReducedMotion();
  const narrow = useNarrowScreen();
  const { scrollYProgress } = useScroll();

  // Skrollda ildizlar sekin pastga suriladi va so'nadi.
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0.25]);

  /* Asosiy shoxlar (qalin) va ularning tarmoqlari (ingichka). Koordinatalar 1440x900
     maydonida: pastki burchaklardan boshlanib markazga qarab ko'tariladi. */
  const wideTrunks = [
    'M120 900 C 180 760, 250 700, 330 640 S 470 520, 560 380',
    'M1320 900 C 1260 760, 1190 700, 1110 640 S 970 520, 880 380',
    'M480 900 C 520 780, 600 720, 660 620 S 720 470, 720 330',
    'M960 900 C 920 780, 840 720, 780 620 S 720 470, 720 330',
  ];

  const wideBranches = [
    'M330 640 C 400 620, 470 630, 540 660',
    'M1110 640 C 1040 620, 970 630, 900 660',
    'M560 380 C 620 350, 690 340, 760 350',
    'M880 380 C 820 350, 750 340, 690 350',
    'M660 620 C 590 590, 520 585, 450 600',
    'M780 620 C 850 590, 920 585, 990 600',
    'M720 330 C 700 260, 700 200, 720 140',
  ];

  const wideNodes: [number, number][] = [
    [330, 640], [1110, 640], [560, 380], [880, 380], [660, 620], [780, 620], [720, 330], [720, 140],
  ];

  const trunks = narrow ? MOBILE.trunks : wideTrunks;
  const branches = narrow ? MOBILE.branches : wideBranches;
  const nodes = narrow ? MOBILE.nodes : wideNodes;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Yumshoq yorug'lik dog'lari — tekis fonga chuqurlik beradi */}
      <div className="absolute -left-40 top-[-15%] size-[42rem] rounded-full bg-primary/[0.10] blur-3xl" />
      <div className="absolute -right-40 top-[20%] size-[38rem] rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="absolute bottom-[-20%] left-1/3 size-[40rem] rounded-full bg-primary/[0.06] blur-3xl" />

      <motion.svg
        viewBox={narrow ? MOBILE.viewBox : '0 0 1440 900'}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        style={reduce ? undefined : { y, opacity: fade }}
      >
        <defs>
          <linearGradient id="landing-root" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={narrow ? '0.62' : '0.42'} />
            <stop offset="55%" stopColor="var(--accent)" stopOpacity={narrow ? '0.30' : '0.16'} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {trunks.map((d, i) => (
          <motion.path
            key={`t-${i}`}
            d={d}
            fill="none"
            stroke="url(#landing-root)"
            strokeWidth={narrow ? 2.8 : 2.2}
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.6, ease: 'easeOut', delay: i * 0.18 }}
          />
        ))}

        {branches.map((d, i) => (
          <motion.path
            key={`b-${i}`}
            d={d}
            fill="none"
            stroke="url(#landing-root)"
            strokeWidth={narrow ? 1.7 : 1.1}
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.2, ease: 'easeOut', delay: 0.9 + i * 0.14 }}
          />
        ))}

        {/* Tugunlar — ildizlar kesishgan nuqtalar, sekin "nafas oladi" */}
        {nodes.map(([cx, cy], i) => (
          <motion.circle
            key={`n-${i}`}
            cx={cx} cy={cy} r={i === nodes.length - 1 ? 5 : 3}
            fill="var(--accent)"
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            animate={reduce ? { opacity: 0.4, scale: 1 } : { opacity: [0.18, 0.55, 0.18], scale: 1 }}
            transition={{ duration: 4 + i * 0.6, repeat: reduce ? 0 : Infinity, ease: 'easeInOut', delay: 1.4 + i * 0.2 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
      </motion.svg>

      {/* Yuqori va past tomondan qorayish — matn ustida kontrast doim saqlanadi */}
      {/* Yuqori va past tomondan yumshoq qorayish — to'liq shaffofmas emas, aks holda
          ildizlarning pastki (eng to'q) qismi bekitilib qoladi. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-page)]/55 via-transparent to-[var(--bg-page)]/55" />
    </div>
  );
}
