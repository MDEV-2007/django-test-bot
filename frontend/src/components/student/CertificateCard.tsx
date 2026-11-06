'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────
   Mashq testi natija kartasi — Pastel Studio.
   Bitta komponent: natija sahifasidagi preview, CertificateModal,
   hamjamiyatga ulashish oynasi va feed posti bir xil kartani ko'rsatadi
   (bir xil raqamlar: Rasch balli, foiz, daraja).
   ───────────────────────────────────────────────────────────── */

export interface CertificateData {
  attemptId: string | number;
  studentName: string;
  testTitle: string;
  /** 70 ballik Rasch balli (yoki >70 bo'lsa foiz — 70 ga o'giriladi) */
  score: number;
  correctCount?: number;
  totalQuestions?: number;
  percentage?: number | null;
  grade?: string | null;
  date?: string | null;
}

export function computeCertificate(d: CertificateData) {
  const isZero = (d.correctCount ?? 1) === 0 && (d.totalQuestions ?? 0) > 0;
  const raw = Number.isFinite(d.score) ? d.score : 0;
  const scaled = isZero ? 0 : raw <= 70 ? raw : (raw / 100) * 70;
  const pct = isZero
    ? 0
    : d.percentage != null
      ? d.percentage
      : d.totalQuestions
        ? ((d.correctCount || 0) / d.totalQuestions) * 100
        : (scaled / 70) * 100;
  const grade = isZero
    ? '—'
    : d.grade ||
      (scaled >= 65 ? 'A+' : scaled >= 60 ? 'A' : scaled >= 55 ? 'B+' : scaled >= 50 ? 'B' : scaled >= 46 ? 'C+' : scaled >= 42 ? 'C' : '—');
  const id = String(d.attemptId || '0');
  const dt = d.date ? new Date(d.date) : new Date();
  const valid = isNaN(dt.getTime()) ? new Date() : dt;
  return {
    scaledStr: scaled.toFixed(1),
    scaledComma: scaled.toFixed(1).replace('.', ','),
    pctStr: `${pct.toFixed(2)} %`,
    grade,
    personalCode: id.slice(-5).padStart(5, '0'),
    certNumber: `DJ26 0607${id.slice(-7).padStart(7, '0')}`,
    givenDate: `${String(valid.getDate()).padStart(2, '0')}.${String(valid.getMonth() + 1).padStart(2, '0')}.${valid.getFullYear()}`,
  };
}

interface CertificateCardProps extends CertificateData {
  /** Ixcham ko'rinish: QR va pastki matnsiz (ulashish oynasi, feed) */
  compact?: boolean;
  qrImgUrl?: string;
  footerHint?: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export default function CertificateCard({ compact, qrImgUrl, footerHint, className, id, onClick, ...d }: CertificateCardProps) {
  const c = computeCertificate(d);
  const name = (d.studentName || "O'quvchi").trim().toUpperCase();

  const rows = compact
    ? [
        { label: 'Fan / test', value: d.testTitle, wide: true },
        { label: 'Foiz ko‘rsatkichi', value: c.pctStr },
        { label: 'Daraja', value: c.grade },
      ]
    : [
        { label: 'Fan / test', value: d.testTitle, wide: true },
        { label: 'Foiz ko‘rsatkichi', value: c.pctStr },
        { label: 'Test sinovi natijasi', value: c.scaledComma },
        { label: 'Talabgor kodi', value: c.personalCode },
        { label: 'Berilgan sana', value: c.givenDate },
      ];

  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        'relative w-full overflow-hidden rounded-[28px] bg-[#FFFCF7] text-[#080808] shadow-[0_30px_60px_-30px_rgba(60,30,110,0.6)] sm:rounded-[32px]',
        onClick && 'cursor-pointer transition-transform duration-300 hover:-translate-y-1',
        className,
      )}
    >
      {/* Binafsha lenta */}
      <div className={cn('relative overflow-hidden bg-[#7659C7] px-5 text-white sm:px-8', compact ? 'pb-12 pt-5' : 'pb-14 pt-6')}>
        <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/15 sm:size-44" />
        <span aria-hidden className="absolute -bottom-7 right-6 size-14 rounded-full bg-[#FFB82E] opacity-80 sm:right-10 sm:size-16" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 sm:size-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="IlmIldizi" className="size-full rounded-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-grotesk)] text-[16px] font-bold leading-none sm:text-[18px]">
                <span data-no-translit>IlmIldizi</span>
              </p>
              <p className="mt-1 truncate text-[9.5px] font-bold uppercase tracking-wider text-white/75 sm:text-[10.5px]">Onlayn mashq platformasi</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 font-mono text-[9.5px] font-bold sm:px-3 sm:text-[11px]">{c.certNumber}</span>
        </div>
        <p className={cn('relative font-[family-name:var(--font-grotesk)] font-bold leading-[0.95] tracking-[-0.03em]', compact ? 'mt-4 text-[24px] sm:text-[30px]' : 'mt-5 text-[28px] sm:text-[38px]')}>
          Mashq testi<br />natija kartasi
        </p>
      </div>

      {/* Ball doirasi — lentadan chiqib turadi */}
      <div className="relative -mt-8 flex items-end justify-between gap-2 px-5 sm:gap-4 sm:px-8">
        <div className="flex min-w-0 items-end gap-2.5 sm:gap-3">
          <span className="grid size-20 shrink-0 place-items-center rounded-full border-[5px] border-[#FFFCF7] bg-[#FFB82E] text-[#080808] shadow-lg sm:size-24 sm:border-[6px]">
            <span className="text-center leading-none">
              <span className="block font-[family-name:var(--font-grotesk)] text-[24px] font-bold sm:text-[30px]">{c.scaledStr}</span>
              <span className="mt-0.5 block text-[9px] font-black uppercase sm:text-[10px]">ball</span>
            </span>
          </span>
          <div className="min-w-0 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8494] sm:text-[11px]">Talabgor</p>
            <p className="truncate font-[family-name:var(--font-grotesk)] text-[16px] font-bold tracking-[-0.02em] sm:text-[20px]">{name}</p>
          </div>
        </div>
        <span className="mb-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#080808] font-[family-name:var(--font-grotesk)] text-[16px] font-bold text-[#FFB82E] sm:mb-2 sm:size-14 sm:text-[20px]">
          {c.grade}
        </span>
      </div>

      {/* Ma'lumotlar */}
      <div className={cn('grid grid-cols-2 gap-2 px-5 sm:gap-2.5 sm:px-8', compact ? 'pb-5 pt-4' : 'pt-5')}>
        {rows.map((row) => (
          <div key={row.label} className={cn('min-w-0 rounded-[16px] bg-[#F7F4EF] px-3.5 py-2.5 sm:rounded-[18px] sm:px-4 sm:py-3', row.wide && 'col-span-2')}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8494] sm:text-[10.5px]">{row.label}</p>
            <p className={cn('mt-0.5 font-bold', row.wide ? 'line-clamp-2 text-[13px] leading-snug sm:text-[14px]' : 'truncate font-mono text-[14px] sm:text-[16px]')}>{row.value}</p>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-[#E6DED2] px-5 py-4 sm:gap-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7659C7]">Rasmiy hujjat emas</p>
            <p className="mt-1 text-[12px] leading-snug text-[#6B6577]">BMB formatidagi mashq testi natijasi. QR orqali natija sahifasini oching.</p>
            {footerHint}
          </div>
          {qrImgUrl && (
            <div className="shrink-0 rounded-[16px] bg-white p-1.5 shadow-[0_10px_24px_-14px_rgba(60,30,110,0.6)] sm:rounded-[18px] sm:p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImgUrl} alt="Natija sahifasiga QR havola" className="size-16 object-contain sm:size-20" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
