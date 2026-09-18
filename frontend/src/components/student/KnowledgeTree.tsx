'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface KnowledgeTreeProps {
  level: number;
  xpProgress: number;
  streak: number;
  badges: number;
}

/**
 * Bilim Ildizi — IlmIldizi brendining tirik daraxt metaforasi.
 * Har bir element o'quvchining haqiqiy mehnati asosida dinamik shakllanadi:
 * - `level`: Daraxtning asosiy shoxlari soni va baquvvatligi
 * - `xpProgress`: Tananing o'sish balandligi va novdalar cho'zilishi (0-100%)
 * - `streak`: Barglar toji zichligi, yashillik yorqinligi va to'kilmasligi
 * - `badges`: Daraxt shoxlaridagi yaraqlagan oltin mevalar (erishilgan yutuqlar)
 */
export default function KnowledgeTree({
  level = 1,
  xpProgress = 0,
  streak = 0,
  badges = 0,
}: KnowledgeTreeProps) {
  const reduce = useReducedMotion();

  // Dinamik hisob-kitoblar
  const safeLevel = Math.max(1, level);
  const branchCount = Math.min(8, Math.max(2, safeLevel));
  const trunkGrowth = Math.min(30, Math.round((xpProgress / 100) * 30)); // 0 - 30px o'sish
  const trunkTopY = 160 - trunkGrowth;

  // Streak asosida barglar jozibadorligi (0-20 kun)
  const vitality = Math.min(1, Math.max(0.2, streak / 14));
  const foliageScale = 0.85 + Math.min(0.35, (streak / 20) * 0.35); // streak qancha ko'p bo'lsa, toj shunchalik qalin
  const leafCount = Math.min(16, Math.max(6, streak + 4));

  // Shoxlar konfiguratsiyasi (tabiiy, daraxtsimon egri chiziqlar)
  const branches = [
    { id: 1, d: `M 160 ${trunkTopY + 45} Q 130 ${trunkTopY + 30} 105 ${trunkTopY + 15}`, cx: 105, cy: trunkTopY + 15, delay: 0.2 },
    { id: 2, d: `M 160 ${trunkTopY + 40} Q 190 ${trunkTopY + 25} 215 ${trunkTopY + 10}`, cx: 215, cy: trunkTopY + 10, delay: 0.25 },
    { id: 3, d: `M 160 ${trunkTopY + 20} Q 135 ${trunkTopY + 5} 120 ${trunkTopY - 15}`, cx: 120, cy: trunkTopY - 15, delay: 0.3 },
    { id: 4, d: `M 160 ${trunkTopY + 15} Q 185 ${trunkTopY} 200 ${trunkTopY - 20}`, cx: 200, cy: trunkTopY - 20, delay: 0.35 },
    { id: 5, d: `M 160 ${trunkTopY} Q 145 ${trunkTopY - 25} 135 ${trunkTopY - 45}`, cx: 135, cy: trunkTopY - 45, delay: 0.4 },
    { id: 6, d: `M 160 ${trunkTopY} Q 175 ${trunkTopY - 25} 185 ${trunkTopY - 45}`, cx: 185, cy: trunkTopY - 45, delay: 0.45 },
    { id: 7, d: `M 160 ${trunkTopY - 10} Q 150 ${trunkTopY - 35} 150 ${trunkTopY - 60}`, cx: 150, cy: trunkTopY - 60, delay: 0.5 },
    { id: 8, d: `M 160 ${trunkTopY - 10} Q 170 ${trunkTopY - 35} 170 ${trunkTopY - 60}`, cx: 170, cy: trunkTopY - 60, delay: 0.55 },
  ].slice(0, branchCount);

  // Meva joylashuvlari (shoxlar uchlarida)
  const fruitPositions = [
    { x: 105, y: trunkTopY + 15 },
    { x: 215, y: trunkTopY + 10 },
    { x: 120, y: trunkTopY - 15 },
    { x: 200, y: trunkTopY - 20 },
    { x: 135, y: trunkTopY - 45 },
    { x: 185, y: trunkTopY - 45 },
    { x: 150, y: trunkTopY - 60 },
    { x: 170, y: trunkTopY - 60 },
    { x: 150, y: trunkTopY - 20 },
    { x: 170, y: trunkTopY - 25 },
    { x: 130, y: trunkTopY },
    { x: 190, y: trunkTopY },
  ];
  const activeFruits = fruitPositions.slice(0, Math.min(12, badges));

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      <svg
        viewBox="0 0 320 300"
        className="h-64 sm:h-72 w-full max-w-[320px] overflow-visible drop-shadow-xl"
        role="img"
        aria-label="Bilim Ildizi interaktiv daraxti"
      >
        <defs>
          {/* Daraxt tanasining tirik yog'och gradienti */}
          <linearGradient id="trunkGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3E2723" />
            <stop offset="40%" stopColor="#4E342E" />
            <stop offset="80%" stopColor="#5D4037" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>

          {/* Ildizlar gradienti */}
          <linearGradient id="rootGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4E342E" />
            <stop offset="60%" stopColor="#2E7D32" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* Asosiy barglar toji uchun chuqur smaragd gradient */}
          <radialGradient id="foliageDark" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>

          {/* O'rta qatlam barglar toji */}
          <radialGradient id="foliageMid" cx="45%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </radialGradient>

          {/* Yuqori yorqin quyoshli barglar */}
          <radialGradient id="foliageLight" cx="40%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="60%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </radialGradient>

          {/* Oltin meva radial 3D gradienti */}
          <radialGradient id="fruit3D" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="30%" stopColor="#FBBF24" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>

          {/* Yer/Tepalik gradienti */}
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#059669" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </linearGradient>

          {/* Orqa fon nur aurası */}
          <radialGradient id="treeAura" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#34D399" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>

          {/* Meva nuri filtri */}
          <filter id="fruitGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. SEHRLI AURA (ORQA FONDA) */}
        <circle cx="160" cy="130" r="110" fill="url(#treeAura)" />

        {/* 2. YER VA TEPALIK (BILIM ZAMINI) */}
        <ellipse cx="160" cy="245" rx="80" ry="14" fill="url(#groundGrad)" />
        <ellipse cx="160" cy="244" rx="60" ry="8" fill="#10B981" fillOpacity="0.25" />
        <path
          d="M 80 245 Q 160 236 240 245"
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* 3. ILDIZLAR (BREND ASOSI — "ILM ILDIZI") */}
        {/* Chuqur mustahkam ildizlar tarmog'i */}
        <g id="roots">
          {/* Chap ildizlar */}
          <motion.path
            d="M 154 242 Q 135 255 110 265 Q 95 270 80 274"
            fill="none"
            stroke="url(#rootGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.path
            d="M 140 252 Q 125 268 115 285"
            fill="none"
            stroke="url(#rootGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />

          {/* Markaziy chuqur ildiz */}
          <motion.path
            d="M 160 244 Q 158 265 160 290"
            fill="none"
            stroke="url(#rootGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

          {/* O'ng ildizlar */}
          <motion.path
            d="M 166 242 Q 185 255 210 265 Q 225 270 240 274"
            fill="none"
            stroke="url(#rootGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.path
            d="M 180 252 Q 195 268 205 285"
            fill="none"
            stroke="url(#rootGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />

          {/* Ildizlardagi energiya nuqtalari (Bilim nuri) */}
          <circle cx="110" cy="265" r="2.5" fill="#34D399" className="animate-pulse" />
          <circle cx="160" cy="275" r="2.5" fill="#34D399" className="animate-pulse" />
          <circle cx="210" cy="265" r="2.5" fill="#34D399" className="animate-pulse" />
        </g>

        {/* 4. TANA (TRUNK) — EGRI-BUG'RI TABIIY DARAXT TANASI */}
        <motion.path
          d={`M 148 244 C 148 210, 152 ${trunkTopY + 50}, 154 ${trunkTopY} L 166 ${trunkTopY} C 168 ${trunkTopY + 50}, 172 210, 172 244 Z`}
          fill="url(#trunkGradient)"
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Yog'och to'qimasi chiziqlari */}
        <path
          d={`M 156 240 Q 158 200 159 ${trunkTopY + 20}`}
          fill="none"
          stroke="#3E2723"
          strokeWidth="1.5"
          opacity="0.45"
        />
        <path
          d={`M 163 240 Q 164 195 162 ${trunkTopY + 25}`}
          fill="none"
          stroke="#2E7D32"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* 5. SHOXLAR (BRANCHES) — DARAJA BILAN KO'PAYADI */}
        <g id="branches">
          {branches.map((b) => (
            <motion.path
              key={b.id}
              d={b.d}
              fill="none"
              stroke="url(#trunkGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: b.delay, ease: 'easeOut' }}
            />
          ))}
        </g>

        {/* 6. TOJ VA BARGLAR (LUSH FOLIAGE CLOUDS) — STREAK BILAN QALINLASHADI */}
        <motion.g
          id="canopy"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: foliageScale, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          style={{ transformOrigin: '160px 120px' }}
        >
          {/* Orqa quyuq qatlam */}
          <circle cx="120" cy="115" r="38" fill="url(#foliageDark)" />
          <circle cx="200" cy="110" r="38" fill="url(#foliageDark)" />
          <circle cx="160" cy="75" r="42" fill="url(#foliageDark)" />

          {/* O'rta boy qatlam */}
          <circle cx="135" cy="90" r="36" fill="url(#foliageMid)" />
          <circle cx="185" cy="85" r="36" fill="url(#foliageMid)" />
          <circle cx="110" cy="140" r="28" fill="url(#foliageMid)" />
          <circle cx="210" cy="135" r="28" fill="url(#foliageMid)" />

          {/* Yuqori yorug'lik tushgan qatlam */}
          <circle cx="160" cy="100" r="44" fill="url(#foliageLight)" />
          <circle cx="145" cy="75" r="30" fill="url(#foliageLight)" />
          <circle cx="175" cy="70" r="30" fill="url(#foliageLight)" />

          {/* Kichik barg klasterlari (Tafsilotlar) */}
          <circle cx="95" cy="125" r="16" fill="#10B981" />
          <circle cx="225" cy="120" r="16" fill="#10B981" />
          <circle cx="160" cy="50" r="18" fill="#34D399" />
        </motion.g>

        {/* 7. UCHUVCHI TIRIK BARGLAR (STREAK DYNAMICS) */}
        <g id="floating-leaves">
          {Array.from({ length: leafCount }).map((_, i) => {
            const angle = (i / leafCount) * Math.PI * 2;
            const dist = 65 + ((i * 19) % 35);
            const lx = 160 + Math.cos(angle) * dist;
            const ly = 105 + Math.sin(angle) * (dist * 0.75);
            return (
              <motion.circle
                key={i}
                cx={lx}
                cy={ly}
                r={3.5 + ((i * 2) % 3)}
                fill={i % 2 === 0 ? '#34D399' : '#10B981'}
                initial={{ scale: 0 }}
                animate={{
                  scale: [1, 1.25, 1],
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2.5 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </g>

        {/* 8. OLTIN MEVALAR (YUTUQLAR — BADGES) */}
        <g id="fruits">
          {activeFruits.map((f, i) => (
            <motion.g
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 18,
                delay: 0.6 + i * 0.08,
              }}
              style={{ transformOrigin: `${f.x}px ${f.y}px` }}
            >
              {/* Meva orqasidagi porlash */}
              <circle
                cx={f.x}
                cy={f.y}
                r="7"
                fill="#FBBF24"
                opacity="0.3"
                filter="url(#fruitGlow)"
                className="animate-pulse"
              />

              {/* Oltin olma mevasi */}
              <circle
                cx={f.x}
                cy={f.y}
                r="5.5"
                fill="url(#fruit3D)"
                stroke="#B45309"
                strokeWidth="0.8"
              />

              {/* Meva bandi va kichik bargchasi */}
              <path
                d={`M ${f.x} ${f.y - 5.5} Q ${f.x + 1} ${f.y - 8} ${f.x + 2.5} ${f.y - 9}`}
                fill="none"
                stroke="#3E2723"
                strokeWidth="1"
              />
              <circle cx={f.x + 2.5} cy={f.y - 8.5} r="1.5" fill="#10B981" />

              {/* 3D yorug'lik nuqtasi */}
              <circle cx={f.x - 1.8} cy={f.y - 1.8} r="1.5" fill="#FFFFFF" opacity="0.85" />
            </motion.g>
          ))}
        </g>

        {/* 9. SUZIB YURUVCHI SEHRLI TOZONLAR (FIREFLIES/SPORES) */}
        <motion.circle
          cx="115"
          cy="150"
          r="2"
          fill="#FEF08A"
          animate={{ y: [-4, 4, -4], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.circle
          cx="205"
          cy="140"
          r="2.5"
          fill="#6EE7B7"
          animate={{ y: [4, -4, 4], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.circle
          cx="160"
          cy="45"
          r="2"
          fill="#FDE047"
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: 1 }}
        />
      </svg>

      {/* Daraxt osti maqom tegi */}
      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>Tirik Bilim Ildizi · {safeLevel}-bosqich</span>
      </div>
    </div>
  );
}
