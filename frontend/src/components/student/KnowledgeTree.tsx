'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface KnowledgeTreeProps {
  level: number;
  xpProgress: number;
  streak: number;
  badges: number;
}

/**
 * Bilim Ildizi — o'quvchi darajasi bilan o'sadigan tirik daraxt.
 *
 * - `level` (1–50) + `xpProgress`: o'sish bosqichi. 1-darajada yangi nihol, 50-darajada
 *   keng tojli chinor. Shox tarmoqlanishi, tana uzunligi va qalinligi shunga qarab o'sadi.
 * - `streak`: barglar yashilligi va zichligi. Seriya 0 bo'lsa barglar sarg'ayadi.
 * - `badges`: shox uchlaridagi oltin mevalar (ochilgan nishonlar).
 *
 * Shakl deterministik (bir xil seed): sahifa yangilanganda daraxt "sakrab" o'zgarmaydi,
 * faqat daraja oshganda o'sadi. Shamol — SVG `animateTransform` (har bir shox o'z
 * asosida tebranadi, uchlari ko'proq siljiydi); "kamroq harakat" sozlamasida o'chadi.
 */

const MAX_LEVEL = 50;
const GROUND_Y = 262;
const BASE_X = 160;

type Branch = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  depth: number;
  children: Branch[];
  leaves: Leaf[];
  sway: number;
  dur: number;
  terminal: boolean;
};

type Leaf = { x: number; y: number; angle: number; size: number; color: string; dur: number };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stageOf(level: number) {
  if (level <= 3) return 'Nihol';
  if (level <= 9) return "Ko'chat";
  if (level <= 19) return 'Yosh daraxt';
  if (level <= 34) return 'Daraxt';
  return 'Chinor';
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** Shox atrofida (o'z asosida) tebranish. */
function Sway({ x, y, deg, dur, enabled }: { x: number; y: number; deg: number; dur: number; enabled: boolean }) {
  if (!enabled || deg === 0) return null;
  return (
    <animateTransform
      attributeName="transform"
      type="rotate"
      values={`${-deg} ${x} ${y}; ${deg} ${x} ${y}; ${-deg} ${x} ${y}`}
      keyTimes="0; 0.5; 1"
      calcMode="spline"
      keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
      dur={`${dur}s`}
      repeatCount="indefinite"
    />
  );
}

export default function KnowledgeTree({ level = 1, xpProgress = 0, streak = 0, badges = 0 }: KnowledgeTreeProps) {
  const reduce = useReducedMotion();
  const animate = !reduce;

  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  const xp = Math.max(0, Math.min(100, xpProgress));
  // 0 (yangi nihol) .. 1 (50-daraja chinor)
  const g = Math.max(0, Math.min(1, (safeLevel - 1 + xp / 100) / (MAX_LEVEL - 1)));
  const stage = stageOf(safeLevel);

  const wilted = streak <= 0;
  const vitality = Math.max(0.25, Math.min(1, streak / 10));

  const tree = useMemo(() => {
    const rnd = mulberry32(1337);
    const greens = wilted
      ? ['#8C9A4A', '#A4A956', '#B7A65A', '#7E8E45']
      : vitality > 0.7
        ? ['#2E7D4F', '#3C9A5E', '#56B26E', '#79C67C', '#3A8C57']
        : ['#3F8A57', '#55A266', '#76B874', '#94C482'];

    // Erta darajalarda o'sish tezroq ko'rinsin (sqrt egri chizig'i), keyin sekinlashadi
    const s = Math.sqrt(g);
    const maxDepth = Math.min(7, 1 + Math.floor(s * 6.2));
    const trunkLen = 34 + s * 50;
    const trunkW = 2.4 + g * 12 + s * 2;
    const leafSize = 10 - s * 2.5;
    const leavesPerTip = Math.round(3 + s * 3 + vitality * 2);

    let counter = 0;
    const tips: { x: number; y: number }[] = [];

    function grow(x: number, y: number, angle: number, len: number, width: number, depth: number): Branch {
      const id = `b${counter++}`;
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      // Egri, tabiiy shox: o'rtadagi nuqta perpendikulyar bo'ylab biroz siljiydi
      const bend = (rnd() - 0.5) * len * 0.28;
      const mx = (x + x2) / 2 + Math.cos(angle + Math.PI / 2) * bend;
      const my = (y + y2) / 2 + Math.sin(angle + Math.PI / 2) * bend;

      const children: Branch[] = [];
      const leaves: Leaf[] = [];
      const terminal = depth >= maxDepth;

      if (!terminal) {
        const count = depth === 1 && maxDepth > 3 ? 2 : depth > 1 && g > 0.45 && rnd() < 0.4 ? 3 : 2;
        const spread = (0.34 + rnd() * 0.16) * (depth <= 2 ? 1 : 0.82);
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1) - 0.5;
          const a = angle + t * spread * 2 + (rnd() - 0.5) * 0.22;
          const l = len * (0.68 + rnd() * 0.12);
          children.push(grow(x2, y2, a, l, Math.max(0.8, width * (0.62 + rnd() * 0.06)), depth + 1));
        }
        // Tabiiyroq ko'rinish: ichki shoxlarda ham bir oz barg
        if (depth >= maxDepth - 1 && maxDepth > 2) {
          for (let k = 0; k < Math.max(1, leavesPerTip - 2); k++) {
            leaves.push({
              x: mx + (rnd() - 0.5) * 6,
              y: my + (rnd() - 0.5) * 6,
              angle: (angle * 180) / Math.PI + 90 + (rnd() - 0.5) * 120,
              size: leafSize * (0.75 + rnd() * 0.35),
              color: greens[Math.floor(rnd() * greens.length)],
              dur: 2.2 + rnd() * 1.6,
            });
          }
        }
      } else {
        tips.push({ x: x2, y: y2 });
        for (let k = 0; k < leavesPerTip; k++) {
          const r = rnd() * (4 + g * 7);
          const th = rnd() * Math.PI * 2;
          leaves.push({
            x: x2 + Math.cos(th) * r,
            y: y2 + Math.sin(th) * r,
            angle: (angle * 180) / Math.PI + 90 + (rnd() - 0.5) * 150,
            size: leafSize * (0.8 + rnd() * 0.45),
            color: greens[Math.floor(rnd() * greens.length)],
            dur: 2 + rnd() * 1.8,
          });
        }
      }

      return {
        id,
        x1: x,
        y1: y,
        x2,
        y2,
        cx: mx,
        cy: my,
        width,
        depth,
        children,
        leaves,
        terminal,
        // Tana deyarli qimirlamaydi, ingichka shoxlar ko'proq tebranadi
        sway: depth === 1 ? 0.6 + g * 0.3 : 1 + depth * 0.55 + rnd() * 0.6,
        dur: 3.4 + rnd() * 1.8,
      };
    }

    const root = grow(BASE_X, GROUND_Y, -Math.PI / 2 + (rnd() - 0.5) * 0.06, trunkLen, trunkW, 1);

    // Daraxtni ko'rinish oynasiga sig'dirish (yuqori chegarasi va kengligi bo'yicha)
    let minX = BASE_X, maxX = BASE_X, minY = GROUND_Y;
    const walk = (b: Branch) => {
      minX = Math.min(minX, b.x2, b.x1);
      maxX = Math.max(maxX, b.x2, b.x1);
      minY = Math.min(minY, b.y2);
      b.leaves.forEach((l) => { minY = Math.min(minY, l.y - l.size); minX = Math.min(minX, l.x - l.size); maxX = Math.max(maxX, l.x + l.size); });
      b.children.forEach(walk);
    };
    walk(root);
    const availH = 218;
    const availW = 292;
    const scale = Math.min(1, availH / Math.max(1, GROUND_Y - minY), availW / Math.max(1, (Math.max(maxX - BASE_X, BASE_X - minX)) * 2));

    // Mevalar: nishonlar soni bo'yicha, yetarli o'sgan daraxtda
    const fruitCount = maxDepth >= 3 ? Math.min(badges, 10, tips.length) : 0;
    const fruits: { x: number; y: number }[] = [];
    for (let i = 0; i < fruitCount; i++) {
      const tip = tips[Math.floor((i * tips.length) / Math.max(1, fruitCount) + tips.length / (2 * fruitCount)) % tips.length];
      fruits.push({ x: tip.x + (rnd() - 0.5) * 4, y: tip.y + 5 + rnd() * 3 });
    }

    // Uchib yuruvchi barglar (shamol) — faqat barg ko'p bo'lsa
    const drifting = g > 0.18 && !wilted ? 3 : wilted && g > 0.18 ? 4 : 0;

    return { root, scale, fruits, maxDepth, drifting, greens };
  }, [g, wilted, vitality, badges]);

  const { root, scale, fruits, drifting, greens } = tree;
  const rootSpread = 14 + g * 46;

  const renderBranch = (b: Branch): React.ReactNode => (
    <g key={b.id}>
      <Sway x={b.x1} y={b.y1} deg={b.sway} dur={b.dur} enabled={animate} />
      <path
        d={`M ${b.x1} ${b.y1} Q ${b.cx} ${b.cy} ${b.x2} ${b.y2}`}
        stroke={b.depth <= 2 ? 'url(#kt-bark)' : '#7A5236'}
        strokeWidth={b.width}
        strokeLinecap="round"
        fill="none"
      />
      {b.children.map(renderBranch)}
      {/* Barg massasi: toj to'liq va yumaloq ko'rinsin */}
      {b.terminal && g > 0.15 && (
        <>
          <circle cx={b.x2} cy={b.y2} r={7 + g * 11} fill={greens[0]} opacity={0.92} />
          <circle cx={b.x2 + 4} cy={b.y2 - 4} r={5 + g * 8} fill={greens[2 % greens.length]} opacity={0.9} />
        </>
      )}
      {b.leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}>
          <g>
            {/* Barglar alohida animatsiyasiz — o'z shoxi bilan birga tebranadi (yengil ishlashi uchun) */}
            {/* Barg: uchli ellips + markaziy tomir */}
            <path
              d={`M 0 0 C ${l.size * 0.55} ${-l.size * 0.35}, ${l.size * 0.55} ${-l.size * 1.05}, 0 ${-l.size * 1.4} C ${-l.size * 0.55} ${-l.size * 1.05}, ${-l.size * 0.55} ${-l.size * 0.35}, 0 0 Z`}
              fill={l.color}
            />
            <path d={`M 0 0 L 0 ${-l.size * 1.25}`} stroke="#000" strokeOpacity="0.12" strokeWidth="0.6" />
          </g>
        </g>
      ))}
    </g>
  );

  return (
    <div className="relative flex select-none flex-col items-center justify-center py-2">
      <svg
        viewBox="0 0 320 300"
        className="h-64 w-full max-w-[320px] overflow-visible sm:h-72"
        role="img"
        aria-label={`Bilim daraxti: ${stage}, ${safeLevel}-daraja`}
      >
        <defs>
          <linearGradient id="kt-bark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5B3A24" />
            <stop offset="55%" stopColor="#8A5A3B" />
            <stop offset="100%" stopColor="#6B4429" />
          </linearGradient>
          <radialGradient id="kt-glow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={wilted ? '#B7A65A' : '#56B26E'} stopOpacity="0.22" />
            <stop offset="100%" stopColor={wilted ? '#B7A65A' : '#56B26E'} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="kt-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A5236" />
            <stop offset="100%" stopColor="#4E321F" />
          </linearGradient>
        </defs>

        {/* Orqa nur */}
        <ellipse cx={BASE_X} cy={GROUND_Y - 90 * Math.max(0.4, g)} rx={60 + g * 90} ry={60 + g * 80} fill="url(#kt-glow)" />

        {/* Ildizlar (yer ostida, daraxt bilan birga kattalashadi) */}
        <g opacity={0.55 + g * 0.3}>
          {[-1, -0.45, 0.4, 1].map((s, i) => (
            <path
              key={i}
              d={`M ${BASE_X + s * 2} ${GROUND_Y + 2} Q ${BASE_X + s * rootSpread * 0.5} ${GROUND_Y + 10 + g * 6} ${BASE_X + s * rootSpread} ${GROUND_Y + 16 + g * 10}`}
              stroke="#6B4429"
              strokeWidth={1 + g * 3.2}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </g>

        {/* Tuproq tepaligi */}
        <ellipse cx={BASE_X} cy={GROUND_Y + 4} rx={34 + g * 70} ry={7 + g * 4} fill="#000" opacity="0.18" />
        <path
          d={`M ${BASE_X - 30 - g * 62} ${GROUND_Y + 4} Q ${BASE_X} ${GROUND_Y - 10 - g * 4} ${BASE_X + 30 + g * 62} ${GROUND_Y + 4} Z`}
          fill="url(#kt-soil)"
        />

        {/* Daraxt (oynaga sig'dirilgan) */}
        <g transform={`translate(${BASE_X} ${GROUND_Y}) scale(${scale}) translate(${-BASE_X} ${-GROUND_Y})`}>
          {renderBranch(root)}
          {fruits.map((f, i) => (
            <g key={`f${i}`}>
              <line x1={f.x} y1={f.y - 5} x2={f.x} y2={f.y - 1} stroke="#5B3A24" strokeWidth="1" />
              <circle cx={f.x} cy={f.y + 2.5} r="4.6" fill="#FFB82E" stroke="#C47F00" strokeWidth="0.8" />
              <circle cx={f.x - 1.4} cy={f.y + 1.2} r="1.3" fill="#FFF3C4" />
            </g>
          ))}
        </g>

        {/* O't-o'lan (shamolda egiladi) */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = BASE_X - 28 - g * 58 + i * ((56 + g * 116) / 8);
          const h = 6 + ((i * 37) % 5);
          return (
            <g key={`grass${i}`}>
              <Sway x={x} y={GROUND_Y + 2} deg={9} dur={2.2 + (i % 3) * 0.4} enabled={animate} />
              <path d={`M ${x} ${GROUND_Y + 2} q 1 ${-h / 2} ${i % 2 ? 2.5 : -2.5} ${-h}`} stroke={greens[i % greens.length]} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </g>
          );
        })}

        {/* Shamolda uchayotgan barglar */}
        {animate &&
          Array.from({ length: drifting }).map((_, i) => (
            <g key={`drift${i}`} opacity="0">
              <path d="M 0 0 C 3 -2, 3 -6, 0 -8 C -3 -6, -3 -2, 0 0 Z" fill={greens[(i + 1) % greens.length]} />
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`${BASE_X - 30 + i * 22} ${GROUND_Y - 150 * Math.max(0.5, g)}; ${BASE_X + 70 + i * 18} ${GROUND_Y - 60}; ${BASE_X + 140 + i * 10} ${GROUND_Y - 4}`}
                dur={`${7 + i * 1.7}s`}
                begin={`${i * 2.3}s`}
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.15;0.8;1" dur={`${7 + i * 1.7}s`} begin={`${i * 2.3}s`} repeatCount="indefinite" />
            </g>
          ))}
      </svg>

      <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--ps-green,#4C806B)] px-3.5 py-1.5 text-[12px] font-bold text-white">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        {stage} · {safeLevel}-daraja
        <span className="opacity-70">/ {MAX_LEVEL}</span>
      </div>
    </div>
  );
}
