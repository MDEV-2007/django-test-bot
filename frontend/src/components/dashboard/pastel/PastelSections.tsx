'use client';

/* Pastel Studio dashboard bo'limlari. Barcha raqamlar sahifadan (real API) keladi —
   bu fayl faqat kompozitsiya va uslub uchun javob beradi. Ranglar/klasslar:
   `src/app/pastel-theme.css` (`.theme-pastel` ichida ishlaydi). */

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  CalendarDays,
  Circle,
  CircleCheck,
  Clock,
  Flame,
  History,
  Snowflake,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/components/design/kit';

/* ── Umumiy yordamchilar ─────────────────────────────────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Ko'rinish maydoniga kirganda yumshoq ko'tarilib chiqadi (bir marta). */
export function InView({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('ps-eyebrow text-[var(--text-muted)]', className)}>{children}</p>;
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function CircleLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#080808] text-[#FFFCF7] transition-transform duration-300 hover:-rotate-45',
        className,
      )}
    >
      <ArrowUpRight className="size-5" />
    </Link>
  );
}

const fmt = (n: number) => n.toLocaleString('uz-UZ');

/* ── 1. HERO ─────────────────────────────────────────────────────────── */

export function PastelHero({
  greeting,
  firstName,
  level,
  rank,
  isPremium,
  heroLine,
  isNewUser,
  streak,
  solvedToday,
  elo,
}: {
  greeting: string;
  firstName: string;
  level: number;
  rank?: number;
  isPremium: boolean;
  heroLine: string;
  isNewUser: boolean;
  streak: number;
  solvedToday: number;
  elo: number;
}) {
  return (
    <section className="relative grid items-center gap-6 pt-2 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4 lg:pt-6">
      {/* Matn */}
      <div className="relative z-10 min-w-0">
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="ps-chip">
            <span className="size-2 rounded-full bg-[var(--ps-orange)]" /> {level}-daraja
          </span>
          {rank ? <span className="ps-chip">Reytingda #{fmt(rank)}</span> : null}
          {isPremium && <span className="ps-chip !bg-[#080808] !text-[#FFFCF7]">Premium</span>}
        </motion.div>

        <motion.h1
          className="ps-display mt-5 text-[52px] sm:text-[76px] xl:text-[92px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
        >
          <span className="block text-[var(--text-primary)]/80 text-[0.62em]">{greeting},</span>
          <span className="relative inline-block max-w-full break-words">
            {firstName}
            <span className="text-[var(--ps-coral)]">.</span>
            {/* Qo'lda chizilgan tagchiziq */}
            <svg
              aria-hidden
              viewBox="0 0 300 24"
              preserveAspectRatio="none"
              className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4"
            >
              <path
                className="ps-draw"
                d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength={1}
              />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          className="mt-7 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        >
          {heroLine}
        </motion.p>

        <motion.div
          className="mt-7 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.22 }}
        >
          <Link href={isNewUser ? '/onboarding?mode=blitz' : '/tests'} className="ps-btn ps-btn-ink">
            {isNewUser ? 'Ekspress testni boshlash' : 'Test yechish'}
            <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
          </Link>
          <Link href="/study" className="ps-btn ps-btn-ghost">
            O&apos;qishni davom ettirish
          </Link>
        </motion.div>
      </div>

      {/* Vizual kompozitsiya: doira ichidagi maskot + geometrik shakllar */}
      <motion.div
        className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px]"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
      >
        {/* Orqa shakllar */}
        <div aria-hidden className="absolute inset-[6%] rounded-full bg-[var(--ps-orange)]" />
        <div aria-hidden className="absolute -left-2 bottom-[4%] size-[34%] rounded-tl-full bg-[var(--ps-coral)] sm:-left-4" />
        <div aria-hidden className="ps-dots absolute right-[2%] top-[2%] size-[26%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
        <div
          aria-hidden
          className="absolute -right-1 bottom-[16%] h-[13%] w-[38%] rotate-[-18deg] rounded-full bg-[var(--ps-green)]"
        />

        {/* Maskot — doira ichida, pastdan kesilgan, tepasi doiradan chiqib turadi */}
        <div className="absolute inset-[12%] overflow-hidden rounded-full border-[6px] border-[#FFFCF7] bg-[var(--ps-sky)] shadow-[0_30px_60px_-30px_rgba(40,20,80,0.7)]">
          <Image
            src="/images/mascot-hero.jpg"
            alt="IlmIldizi maskoti — bitiruvchi qushcha"
            fill
            priority
            sizes="(max-width: 640px) 260px, 360px"
            className="object-cover object-[52%_40%] scale-[1.35]"
          />
        </div>

        {/* Aylanuvchi yulduz-muhr */}
        <div aria-hidden className="ps-spin absolute left-[2%] top-[8%] size-[22%] text-[var(--ps-ink)]">
          <svg viewBox="0 0 100 100" className="size-full">
            <path
              d="M50 0 L58 30 L88 14 L70 42 L100 50 L70 58 L88 86 L58 70 L50 100 L42 70 L12 86 L30 58 L0 50 L30 42 L12 14 L42 30 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Suzuvchi chiplar — real ko'rsatkichlar */}
        <div className="ps-float absolute -left-2 top-[46%] sm:-left-8">
          <span className="ps-chip text-[13px]">
            <Flame className="size-4 text-[var(--ps-coral)]" /> {streak} kunlik seriya
          </span>
        </div>
        <div className="ps-float-slow absolute -right-1 top-[18%] sm:-right-6">
          <span className="ps-chip !bg-[#080808] !text-[#FFFCF7] text-[13px]">
            <Zap className="size-4 text-[var(--ps-orange)]" /> {solvedToday} ta savol bugun
          </span>
        </div>
        <div className="ps-float absolute bottom-[2%] right-[14%]">
          <span className="ps-chip text-[13px]">
            <Trophy className="size-4 text-[var(--ps-purple)]" /> ELO {elo}
          </span>
        </div>
      </motion.div>
    </section>
  );
}

/* ── 2. Ko'rsatkichlar "bento" ───────────────────────────────────────── */

export function StatBento({
  streak,
  freezeCount,
  xp,
  coins,
  accuracy,
  totalTests,
  avgScore,
  rank,
}: {
  streak: number;
  freezeCount: number;
  xp: number;
  coins: number;
  accuracy?: number;
  totalTests?: number;
  avgScore?: number;
  rank?: number;
}) {
  return (
    <section aria-label="Asosiy ko'rsatkichlar" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
      {/* Seriya — eng katta, apelsin */}
      <InView className="col-span-2 lg:col-span-4">
        <div className="ps-card ps-orange ps-lift relative h-full min-h-[190px] overflow-hidden !border-0 p-6">
          <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[#FFFCF7]/35" />
          <div aria-hidden className="absolute -bottom-14 right-16 size-28 rounded-full border-[14px] border-[#080808]/10" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-center justify-between">
              <p className="ps-eyebrow">Kunlik seriya</p>
              <Flame className="size-6" strokeWidth={2.4} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="ps-num text-[88px] sm:text-[104px]">{streak}</p>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#080808] px-3 py-1.5 text-xs font-bold text-[#FFFCF7]">
                <Snowflake className="size-3.5" /> {freezeCount} muzlatish
              </span>
            </div>
          </div>
        </div>
      </InView>

      {/* XP — qora */}
      <InView className="col-span-1 lg:col-span-3" delay={0.06}>
        <div className="ps-card ps-ink ps-lift relative h-full min-h-[190px] overflow-hidden !border-0 p-5 sm:p-6">
          <div aria-hidden className="ps-stripes absolute -right-6 -top-6 size-28 rounded-full text-[var(--ps-purple)]/60" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <p className="ps-eyebrow text-[#FFFCF7]/60">Jami XP</p>
            <div>
              <p className="ps-num text-[38px] sm:text-[52px] break-all">{fmt(xp)}</p>
              <p className="mt-2 text-xs text-[#FFFCF7]/60">{fmt(coins)} tanga hamyonda</p>
            </div>
          </div>
        </div>
      </InView>

      {/* Aniqlik — qog'oz + halqa */}
      <InView className="col-span-1 lg:col-span-3" delay={0.12}>
        <div className="ps-card ps-lift h-full min-h-[190px] p-5 sm:p-6">
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <p className="ps-eyebrow text-[var(--text-muted)]">Aniqlik</p>
              <Target className="size-5 text-[var(--ps-green)]" />
            </div>
            <div className="flex items-end justify-between gap-2">
              <p className="ps-num text-[38px] sm:text-[52px]">
                {accuracy != null ? accuracy : '—'}
                <span className="text-[0.5em] text-[var(--text-muted)]">%</span>
              </p>
              <Donut value={accuracy ?? 0} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {totalTests != null ? `${totalTests} ta test · o'rtacha ${avgScore ?? 0}%` : 'Yuklanmoqda…'}
            </p>
          </div>
        </div>
      </InView>

      {/* Reyting — binafsha */}
      <InView className="col-span-2 lg:col-span-2" delay={0.18}>
        <Link
          href="/leaderboard"
          className="ps-card ps-purple ps-lift ps-arrow-host relative flex h-full min-h-[120px] flex-row items-center justify-between overflow-hidden !border-0 p-5 sm:p-6 lg:min-h-[190px] lg:flex-col lg:items-start"
        >
          <div aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-lilac)]/40" />
          <p className="ps-eyebrow relative text-white/70">Reyting</p>
          <p className="ps-num relative text-[44px] sm:text-[52px]">{rank ? `#${fmt(rank)}` : '—'}</p>
          <span className="ps-btn-arrow relative !m-0 !bg-white"><ArrowUpRight className="size-4" /></span>
        </Link>
      </InView>
    </section>
  );
}

function Donut({ value, size = 54 }: { value: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ds-track)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ps-green)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c - (c * pct) / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </svg>
  );
}

/* ── 3. O'sish daraxti (daraja) + Kunlik vazifalar ───────────────────── */

const TREE_STAGES = [
  { max: 2, art: 'tree-1-urug.svg', name: "Urug'" },
  { max: 5, art: 'tree-2-nihol.svg', name: 'Nihol' },
  { max: 9, art: 'tree-3-kochat.svg', name: "Ko'chat" },
  { max: 14, art: 'tree-4-daraxt.svg', name: 'Daraxt' },
  { max: Infinity, art: 'tree-5-chinor.svg', name: 'Chinor' },
];

export function GrowthCard({ level, xpProgress, xpRemaining }: { level: number; xpProgress: number; xpRemaining: number }) {
  const stage = TREE_STAGES.find((s) => level <= s.max) ?? TREE_STAGES[TREE_STAGES.length - 1];
  const pct = Math.max(0, Math.min(100, xpProgress));
  return (
    <div className="ps-card ps-blue ps-lift ps-zoom-host relative h-full overflow-hidden !border-0 p-6 sm:p-7">
      <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-[#FFFCF7]/30" />
      <div aria-hidden className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[#080808]/10 to-transparent" />

      <div className="relative grid h-full grid-cols-[1fr_auto] gap-2">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div>
            <p className="ps-eyebrow text-[#080808]/60">O&apos;sish bosqichi</p>
            <p className="ps-display mt-2 text-[44px] sm:text-[56px]">{stage.name}</p>
            <p className="mt-1 text-sm font-semibold text-[#080808]/70">{level}-daraja</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs font-bold">
              <span>{level + 1}-darajagacha</span>
              <span className="ps-num text-lg">{pct}%</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#080808]/12">
              <motion.div
                className="h-full rounded-full bg-[#080808]"
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: EASE }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#080808]/70">{fmt(xpRemaining)} XP qoldi</p>
          </div>
        </div>
        {/* Daraxt — kartadan chiqib turadi */}
        <div className="relative -mb-7 -mr-7 w-[150px] self-end sm:w-[190px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/brand/gamification/${stage.art}`}
            alt={`${stage.name} bosqichi`}
            className="ps-zoom w-full origin-bottom drop-shadow-[0_18px_20px_rgba(8,8,8,0.25)]"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

type Mission = {
  title: string;
  xp_reward: number;
  current_count: number;
  target_count: number;
  is_completed: boolean;
};

export function MissionsCard({ missions }: { missions: Mission[] }) {
  const done = missions.filter((m) => m.is_completed).length;
  const total = missions.length;
  return (
    <div className="ps-card ps-ink relative h-full overflow-hidden !border-0 p-6 sm:p-7">
      <div aria-hidden className="absolute -right-12 -bottom-16 size-52 rounded-full bg-[var(--ps-purple)]/35 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ps-eyebrow text-[#FFFCF7]/55">Bugungi reja</p>
            <h2 className="ps-display mt-2 text-[32px] sm:text-[40px]">Kunlik vazifalar</h2>
          </div>
          <p className="ps-num shrink-0 text-[44px] sm:text-[56px]">
            {done}
            <span className="text-[#FFFCF7]/35">/{total}</span>
          </p>
        </div>

        {/* Segmentli progress */}
        <div className="mt-5 flex gap-1.5" aria-hidden>
          {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
            <span
              key={i}
              className={cn('h-2 flex-1 rounded-full', i < done ? 'bg-[var(--ps-orange)]' : 'bg-[#FFFCF7]/15')}
            />
          ))}
        </div>

        {total === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[#FFFCF7]/20 p-5 text-center text-sm text-[#FFFCF7]/60">
            Bugungi vazifalar hali tayyorlanmagan.
          </p>
        ) : (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {missions.slice(0, 4).map((m) => (
              <li
                key={m.title}
                className={cn(
                  'flex items-center gap-3 rounded-2xl p-3.5 transition-colors',
                  m.is_completed ? 'bg-[#FFFCF7]/6' : 'bg-[#FFFCF7]/10 hover:bg-[#FFFCF7]/15',
                )}
              >
                {m.is_completed ? (
                  <CircleCheck className="size-5 shrink-0 text-[var(--ps-orange)]" />
                ) : (
                  <Circle className="size-5 shrink-0 text-[#FFFCF7]/35" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[13px] font-semibold', m.is_completed && 'text-[#FFFCF7]/45 line-through')}>
                    {m.title}
                  </p>
                  {!m.is_completed && m.target_count > 1 && (
                    <p className="text-[11px] tabular-nums text-[#FFFCF7]/50">
                      {m.current_count}/{m.target_count}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                    m.is_completed ? 'bg-[#FFFCF7]/10 text-[#FFFCF7]/60' : 'bg-[var(--ps-orange)] text-[#080808]',
                  )}
                >
                  +{m.xp_reward} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── 4. Haftalik fokus + kelayotgan testlar ──────────────────────────── */

export function WeeklyFocus({
  days,
  total,
  delta,
  peak,
}: {
  days: { label: string; minutes: number; tests: number; isPeak: boolean }[];
  total: number;
  delta: number;
  peak: number;
}) {
  return (
    <div className="ps-card h-full p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>O&apos;quv faolligi</Eyebrow>
          <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">Haftalik fokus</h2>
        </div>
        <div className="text-right">
          <p className="ps-num text-[40px] text-[var(--ps-purple)] sm:text-[48px]">{formatMinutes(total)}</p>
          <p
            className={cn(
              'mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold',
              delta >= 0 ? 'bg-[var(--ps-green)]/15 text-[var(--ps-green)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]',
            )}
          >
            {delta >= 0 ? '↑' : '↓'} {formatMinutes(Math.abs(delta))} o&apos;tgan haftaga nisbatan
          </p>
        </div>
      </div>

      <div className="relative mt-6 flex h-44 items-end gap-2 sm:gap-4">
        {total === 0 && (
          <p className="absolute inset-x-0 top-6 z-10 text-center text-xs font-medium text-[var(--text-muted)]">
            Bu hafta hali test yechilmadi — birinchi sessiyangizni boshlang.
          </p>
        )}
        {days.map((d, i) => {
          const h = peak > 0 ? Math.max(8, (d.minutes / peak) * 100) : 8;
          return (
            <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full max-w-[56px] flex-1 items-end">
                {d.isPeak && (
                  <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#080808] px-2 py-0.5 text-[10px] font-bold text-[#FFFCF7]">
                    {formatMinutes(d.minutes)}
                  </span>
                )}
                <motion.div
                  className={cn(
                    'ps-bar w-full',
                    d.minutes === 0
                      ? 'bg-[var(--ds-track)]'
                      : d.isPeak
                        ? 'bg-[var(--ps-orange)]'
                        : 'bg-[var(--ps-purple)] group-hover:bg-[var(--ps-coral)]',
                  )}
                  initial={{ height: '8%' }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE, delay: i * 0.05 }}
                  title={`${formatMinutes(d.minutes)} · ${d.tests} ta test`}
                />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const DATE_TONES = ['ps-coral', 'ps-orange', 'ps-purple', 'ps-green'];

export function UpcomingCard({
  mocks,
}: {
  mocks: { id: number; title: string; subject: string; scheduled_at: string; is_live: boolean }[];
}) {
  return (
    <div className="ps-card ps-card-cream h-full p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Kalendar</Eyebrow>
          <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">Kelayotgan testlar</h2>
        </div>
        <CircleLink href="/tests" label="Barcha testlar" />
      </div>

      {mocks.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed border-[var(--border-strong)] px-5 py-8 text-center">
          <CalendarDays className="size-8 text-[var(--ps-purple)]" />
          <p className="mt-3 text-sm font-semibold">Yaqin kunlarda imtihon yo&apos;q</p>
          <Link href="/tests" className="mt-1 text-xs font-bold text-[var(--brand-text)] underline-offset-4 hover:underline">
            Mock test tanlash →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {mocks.map((m, i) => {
            const d = new Date(m.scheduled_at);
            return (
              <li key={m.id}>
                <Link
                  href={`/tests/mock/${m.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--ps-paper)] p-2.5 pr-4 transition-transform duration-300 hover:translate-x-1"
                >
                  <span
                    className={cn(
                      'flex size-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none',
                      DATE_TONES[i % DATE_TONES.length],
                    )}
                  >
                    <span className="ps-num text-xl">{d.getDate()}</span>
                    <span className="mt-0.5 text-[10px] font-bold uppercase">{MONTHS_SHORT[d.getMonth()]}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{m.title}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {[m.subject, d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {m.is_live && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-2.5 py-1 text-[10px] font-bold text-white">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" /> Jonli
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── 5. Fanlar bo'yicha natija — editorial ro'yxat ───────────────────── */

const SUBJECT_COLORS = ['var(--ps-purple)', 'var(--ps-orange)', 'var(--ps-green)', 'var(--ps-coral)', 'var(--ps-blue)'];

export function SubjectsSection({
  subjects,
}: {
  subjects: { id: number; name: string; mastery: number; answered: number }[];
}) {
  const empty = subjects.length === 0 || subjects.every((s) => s.answered === 0);
  return (
    <div className="ps-card overflow-hidden p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="relative flex flex-col justify-between gap-6">
          <div>
            <Eyebrow>O&apos;zlashtirish</Eyebrow>
            <h2 className="ps-display mt-3 text-[40px] sm:text-[56px]">
              Fanlar
              <br />
              <span className="text-[var(--ps-purple)]">bo&apos;yicha</span> natija
            </h2>
            <p className="mt-4 max-w-xs text-sm text-[var(--text-muted)]">
              Har bir fan bo&apos;yicha to&apos;g&apos;ri javoblar ulushi. 50% dan pasti — takrorlash vaqti.
            </p>
          </div>
          <Link href="/analytics" className="ps-btn ps-btn-ink self-start">
            Batafsil tahlil
            <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
          </Link>
        </div>

        {empty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-[var(--ps-neutral)] p-8 text-center">
            <Sparkles className="size-8 text-[var(--ps-orange)]" />
            <p className="mt-3 max-w-xs text-sm text-[var(--text-muted)]">
              Test yechganingizdan keyin har bir fan bo&apos;yicha o&apos;zlashtirish shu yerda ko&apos;rinadi.
            </p>
            <Link href="/tests" className="mt-3 text-sm font-bold text-[var(--brand-text)]">Test yechish →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-card)]">
            {subjects.map((s, i) => (
              <InView key={s.id} delay={i * 0.05} y={14}>
                <li className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[auto_minmax(0,180px)_1fr_auto] sm:gap-x-5">
                  <span className="ps-num w-8 text-sm text-[var(--text-faint)]">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.answered} ta javob</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 sm:col-span-1">
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--ds-track)]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: s.mastery < 50 ? 'var(--ps-coral)' : SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.max(2, s.mastery)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.05 }}
                      />
                    </div>
                    <span className="ps-num w-16 text-right text-[28px] sm:hidden">{s.mastery}%</span>
                  </div>
                  <span className="ps-num hidden w-20 text-right text-[34px] sm:block">{s.mastery}%</span>
                </li>
              </InView>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── 6. Keyingi qadam + so'nggi faollik ──────────────────────────────── */

export type Recommendation = {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  meta: string;
  tag: string;
};

const REC_TONES = ['ps-coral', 'ps-card-cream', 'ps-purple'];

export function NextSteps({
  items,
  busy,
  lastAttempt,
}: {
  items: Recommendation[];
  busy: boolean;
  lastAttempt: { id: number; test_title: string; score: number | null } | null;
}) {
  const [featured, ...rest] = items;
  return (
    <div>
      <SectionTitle eyebrow="Siz uchun tanlangan" title="Keyingi qadam" />
      <div className="grid gap-3 sm:gap-4 md:grid-cols-[1.15fr_1fr]">
        {featured && <RecCard rec={featured} busy={busy} className={cn(REC_TONES[0], 'min-h-[260px]')} big />}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3 sm:gap-4">
            {rest.map((r, i) => (
              <RecCard key={r.title} rec={r} busy={busy} className={cn(REC_TONES[(i + 1) % REC_TONES.length], 'flex-1')} />
            ))}
          </div>
        )}
      </div>
      {lastAttempt && (
        <Link
          href={`/tests/${lastAttempt.id}/feedback`}
          className="ps-arrow-host mt-3 flex items-center gap-3 rounded-full bg-[var(--ps-paper)]/70 py-2 pl-4 pr-2 text-sm backdrop-blur transition-colors hover:bg-[var(--ps-paper)]"
        >
          <History className="size-4 shrink-0 text-[var(--text-muted)]" />
          <span className="min-w-0 flex-1 truncate">
            Oxirgi test: <b>{lastAttempt.test_title}</b>
            {lastAttempt.score != null && ` · ${Math.round(lastAttempt.score)}%`}
          </span>
          <span className="hidden text-xs font-bold sm:inline">Tahlil</span>
          <span className="ps-btn-arrow !m-0"><ArrowUpRight className="size-4" /></span>
        </Link>
      )}
    </div>
  );
}

function RecCard({ rec, busy, className, big }: { rec: Recommendation; busy: boolean; className?: string; big?: boolean }) {
  const Icon = rec.icon;
  const dark = className?.includes('ps-card-cream') ? false : true;
  const inner = (
    <>
      <div aria-hidden className={cn('absolute rounded-full', big ? '-right-12 -bottom-12 size-52 bg-white/15' : '-right-6 -top-6 size-24 bg-white/15')} />
      {big && <div aria-hidden className="ps-dots absolute right-6 top-6 size-20 text-white/40" />}
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-2xl',
              big ? 'size-14' : 'size-11',
              dark ? 'bg-white/20' : 'bg-[#080808] text-[#FFFCF7]',
            )}
          >
            <Icon className={big ? 'size-7' : 'size-5'} />
          </span>
          <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', dark ? 'bg-[#080808]/20' : 'bg-[var(--ps-paper)]')}>
            {rec.tag}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 text-left">
            <p className={cn('ps-display', big ? 'text-[30px] sm:text-[40px]' : 'text-[22px]', 'line-clamp-2')}>{rec.title}</p>
            <p className={cn('mt-2 truncate text-xs font-medium', dark ? 'opacity-75' : 'text-[var(--text-muted)]')}>{rec.meta}</p>
          </div>
          <span className="ps-btn-arrow !m-0 shrink-0 !bg-[#080808] !text-[#FFFCF7]">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </>
  );
  const cls = cn('ps-card ps-lift ps-arrow-host relative block overflow-hidden !border-0 p-6', className);
  return rec.href ? (
    <Link href={rec.href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={rec.onClick} disabled={busy} className={cn(cls, 'w-full cursor-pointer disabled:opacity-60')}>
      {inner}
    </button>
  );
}

export function ActivityCard({
  items,
  loading,
  onOpenAll,
  renderIcon,
  timeLabel,
}: {
  items: { id: number; title: string; message: string; type: string; is_read: boolean; created_at: string }[];
  loading: boolean;
  onOpenAll: () => void;
  renderIcon: (type: string, title: string) => React.ReactNode;
  timeLabel: (raw: string) => string;
}) {
  return (
    <div className="ps-card h-full p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Lenta</Eyebrow>
          <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">So&apos;nggi faollik</h2>
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className="shrink-0 rounded-full border-[1.5px] border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          Hammasi
        </button>
      </div>
      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl bg-[var(--ps-neutral)] px-5 py-8 text-center">
          <Clock className="size-7 text-[var(--text-faint)]" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">{loading ? 'Yuklanmoqda…' : "Hozircha faollik yo'q."}</p>
        </div>
      ) : (
        <ol className="relative mt-6 space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-[var(--border-card)]">
          {items.map((n) => (
            <li key={n.id} className="relative flex items-start gap-3.5">
              <span className="relative z-10 shrink-0 rounded-full ring-4 ring-[var(--ps-paper)]">{renderIcon(n.type, n.title)}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] leading-snug">
                  <span className="font-bold">{n.title}</span>
                  {n.message ? <span className="text-[var(--text-muted)]"> — {n.message}</span> : null}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[var(--text-faint)]">{timeLabel(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[var(--ps-coral)]" />}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── 7. Yakuniy CTA — kunlik sandiq ──────────────────────────────────── */

export function ChestFinale({
  canClaim,
  claimedToday,
  onOpenChest,
}: {
  canClaim: boolean;
  claimedToday?: boolean;
  onOpenChest: () => void;
}) {
  const words = ['Har kuni bir qadam', 'Ilm ildizi chuqur', 'Seriyani saqlang', 'Sandiq sizni kutmoqda'];
  return (
    <section className="ps-card ps-purple relative overflow-hidden !border-0 !rounded-[32px]">
      {/* Marquee */}
      <div className="overflow-hidden border-b border-white/15 py-3" aria-hidden>
        <div className="ps-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {[...words, ...words].map((w, i) => (
                <span key={i} className="ps-display flex items-center gap-6 pr-6 text-lg text-white/85 sm:text-xl">
                  {w} <span className="text-[var(--ps-orange)]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="relative grid items-center gap-4 p-6 sm:p-10 md:grid-cols-[1.2fr_0.8fr]">
        <div aria-hidden className="absolute -left-16 -bottom-24 size-72 rounded-full bg-[var(--ps-lilac)]/30" />
        <div className="relative">
          <p className="ps-eyebrow text-white/70">Kunlik sovg&apos;a</p>
          <h2 className="ps-display mt-3 text-[40px] sm:text-[64px]">
            {canClaim ? (
              <>Sandiq <span className="text-[var(--ps-orange)]">tayyor!</span></>
            ) : (
              <>Zanjirni yoping —<br />sandiqni <span className="text-[var(--ps-orange)]">oching</span></>
            )}
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/75">
            {canClaim
              ? 'Bugungi zanjir yopildi. Sandiqni ochib, tanga va XP mukofotingizni oling.'
              : claimedToday
                ? 'Bugungi sandiq allaqachon ochilgan. Ertaga yangi sovg‘a kutadi.'
                : 'Sprint → Xatolar ustida ishlash → Arena. Uchala bosqichdan keyin sandiq ochiladi.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {canClaim ? (
              <button type="button" onClick={onOpenChest} className="ps-btn ps-btn-light">
                Sandiqni ochish <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
              </button>
            ) : (
              <>
                <Link href="/sprint" className="ps-btn ps-btn-light">
                  Sprintni boshlash <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                </Link>
                <button type="button" onClick={onOpenChest} className="ps-btn border-[1.5px] border-white/40 text-white hover:bg-white/10">
                  Sandiq holati
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-[220px] sm:w-[280px]">
          <div aria-hidden className="absolute inset-[8%] rounded-full bg-[var(--ps-orange)]" />
          <div aria-hidden className="ps-spin absolute -right-2 -top-2 size-16">
            <svg viewBox="0 0 100 100" className="size-full">
              <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="#FFFCF7" />
            </svg>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/brand/gamification/${canClaim ? 'chest-closed.svg' : claimedToday ? 'chest-open.svg' : 'chest-closed.svg'}`}
            alt="Kunlik sandiq"
            className="ps-float relative w-full drop-shadow-[0_24px_24px_rgba(8,8,8,0.35)]"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
