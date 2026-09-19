'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Play,
  Swords,
  Flame,
  Check,
  Target,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

export interface HeroDashboardProps {
  user: {
    first_name?: string;
    username: string;
    streak?: number;
    coins?: number;
    elo_rating?: number;
  };
  recommendedSprint?: {
    title: string;
    topic: string;
    durationMinutes: number;
    progressPct: number;
    subjectName: string;
    actionUrl: string;
  };
  dailyGoals?: {
    current: number;
    target: number;
    streakDays: boolean[];
  };
  battleArena?: {
    onlinePlayers: number;
    currentRank: string;
    elo: number;
  };
  theme?: 'dark' | 'light';
}

/**
 * 1. HERO FOCUS BANNER: Single commanding primary action (15-min Sprint),
 * with AI Study Compass chip, topic overview, and clean 3D mascot.
 */
export function HeroFocusBanner({
  user,
  recommendedSprint = {
    title: "Biologiya — Genetik modellashtirish va DNK sintezi",
    topic: '15-daqiqalik Fokus Sprinti',
    durationMinutes: 15,
    progressPct: 65,
    subjectName: 'Biologiya',
    actionUrl: '/tests',
  },
  theme = 'dark',
}: {
  user: HeroDashboardProps['user'];
  recommendedSprint?: HeroDashboardProps['recommendedSprint'];
  theme?: 'dark' | 'light';
}) {
  const isLight = theme === 'light';
  const firstName = user.first_name || user.username;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300',
        isLight
          ? 'border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/25 to-slate-50 shadow-[0_4px_25px_rgba(15,23,42,0.05)]'
          : 'border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border-t border-white/15 shadow-2xl'
      )}
    >
      {/* Background ambient accents */}
      {isLight ? (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-orange-500/5 blur-3xl" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        </>
      )}

      <div className="relative z-10 flex flex-col gap-6 min-w-0 max-w-full">
        {/* Left: Personalized Guidance */}
        <div className="space-y-4 min-w-0 max-w-full">
          {/* Subject / AI Compass Chip */}
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold transition-colors',
              isLight
                ? 'border border-blue-200 bg-blue-50 text-blue-700 shadow-2xs'
                : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            )}
          >
            <span className="relative flex size-2">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  isLight ? 'bg-blue-400' : 'bg-emerald-400'
                )}
              />
              <span
                className={cn(
                  'relative inline-flex size-2 rounded-full',
                  isLight ? 'bg-blue-600' : 'bg-emerald-500'
                )}
              />
            </span>
            <span>AI Study Compass · {recommendedSprint.subjectName}</span>
            <ChevronRight className={cn('size-3.5', isLight ? 'text-blue-600' : 'text-emerald-400')} />
          </div>

          {/* Greeting & Subtitle (WCAG AAA contrast) */}
          <div className="space-y-1.5">
            <h1
              className={cn(
                'text-2xl sm:text-4xl font-black tracking-tight leading-tight',
                isLight ? 'text-slate-900' : 'text-white'
              )}
            >
              Xayrli kun, {firstName}! 👋
            </h1>
            <p
              className={cn(
                'text-xs sm:text-sm leading-relaxed max-w-xl font-medium',
                isLight ? 'text-slate-600' : 'text-slate-400'
              )}
            >
              AI tahliliga ko&apos;ra, bugungi 15-daqiqalik fokus sprinti sizning OTM kirish ehtimolingizni{' '}
              <strong className={cn('font-bold', isLight ? 'text-blue-700 font-extrabold' : 'text-emerald-400')}>
                +8.4% ga
              </strong>{' '}
              oshiradi.
            </p>
          </div>

          {/* Recommended Sprint Strip */}
          <div
            className={cn(
              'w-full max-w-xl min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4 backdrop-blur-md space-y-2.5',
              isLight
                ? 'border border-slate-200/90 bg-white/90 shadow-2xs'
                : 'border border-slate-800 bg-slate-950/60'
            )}
          >
            <div className="flex items-center justify-between gap-2 text-xs min-w-0">
              <span className={cn('font-bold truncate min-w-0 flex-1', isLight ? 'text-slate-800' : 'text-slate-300')}>
                📌 {recommendedSprint.title}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold whitespace-nowrap border',
                  isLight
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                )}
              >
                {Math.round(recommendedSprint.progressPct)}%
              </span>
            </div>
            <div
              className={cn(
                'relative h-2 w-full rounded-full overflow-hidden',
                isLight ? 'bg-slate-100' : 'bg-slate-800/90'
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isLight
                    ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                )}
                style={{ width: `${Math.min(100, Math.max(0, recommendedSprint.progressPct))}%` }}
              />
            </div>
          </div>

          {/* Single Dominant Primary CTA Button (Electric Blue #2563EB in Light Mode) */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <Link
              href={recommendedSprint.actionUrl}
              className={cn(
                'relative group overflow-hidden inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl px-6 sm:px-8 py-3 text-sm sm:text-base font-black hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none',
                isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_18px_rgba(37,99,235,0.35)]'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
              )}
            >
              {/* Continuous Shimmer Light Ray */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

              <Play className={cn('size-4', isLight ? 'fill-white text-white' : 'fill-slate-950 text-slate-950')} />
              <span>Sprintni Boshlash (15 daq)</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/study"
              className={cn(
                'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition active:scale-95 border',
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 shadow-2xs'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
              )}
            >
              Fokus Xonasi (Pomodoro)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. DAILY GOAL & 7-DAY STREAK CARD:
 * Compact & informative, perfectly proportioned for the companion sidebar.
 */
export function DailyGoalCard({
  user,
  dailyGoals = {
    current: 3,
    target: 3,
    streakDays: [true, true, true, true, true, false, false],
  },
  theme = 'dark',
}: {
  user: { streak?: number };
  dailyGoals?: HeroDashboardProps['dailyGoals'];
  theme?: 'dark' | 'light';
}) {
  const isLight = theme === 'light';
  const goalPct = Math.min(100, Math.round((dailyGoals.current / dailyGoals.target) * 100));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;
  const dayLabels = ['D', 'S', 'CH', 'P', 'J', 'SH', 'Y'];

  return (
    <Card
      className={cn(
        'rounded-3xl p-5 backdrop-blur-xl transition-all duration-300 space-y-4',
        isLight
          ? 'border border-slate-200/90 bg-white shadow-[0_4px_25px_rgba(15,23,42,0.05)]'
          : 'border border-slate-800/80 bg-slate-900/50 border-t border-white/10 shadow-xl'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-7 items-center justify-center rounded-xl border',
              isLight
                ? 'border-orange-200 bg-orange-50 text-orange-600'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            )}
          >
            <Flame className="size-4 fill-current animate-bounce" />
          </div>
          <div>
            <h3 className={cn('text-xs font-black uppercase tracking-wider', isLight ? 'text-slate-900' : 'text-white')}>
              Kunlik Marra &amp; Streak
            </h3>
            <p className={cn('text-[11px] font-medium', isLight ? 'text-slate-500' : 'text-slate-400')}>
              Minimal 3 ta topshiriq
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] font-black px-2 py-0.5 rounded-full border',
            isLight
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          )}
        >
          {goalPct}%
        </Badge>
      </div>

      {/* Circular Progress & Streak Message */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex size-20 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className={cn(isLight ? 'stroke-slate-100' : 'stroke-slate-800')}
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className={cn(
                'transition-all duration-1000 ease-out',
                isLight ? 'stroke-blue-600' : 'stroke-emerald-400'
              )}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                filter: isLight
                  ? 'drop-shadow(0 2px 6px rgba(37,99,235,0.3))'
                  : 'drop-shadow(0 0 6px rgba(16,185,129,0.5))',
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center select-none">
            <span className="text-xs">🔥</span>
            <span
              className={cn(
                'text-xs font-black font-mono leading-none',
                isLight ? 'text-slate-900' : 'text-white'
              )}
            >
              {dailyGoals.current}/{dailyGoals.target}
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <p
            className={cn(
              'text-xs sm:text-sm font-extrabold leading-snug',
              isLight ? 'text-slate-900' : 'text-white'
            )}
          >
            {goalPct >= 100 ? "Bugungi marra yopildi! 🎉" : "Sur'atni saqlang!"}
          </p>
          <p className={cn('text-[11px] leading-relaxed', isLight ? 'text-slate-600' : 'text-slate-400')}>
            Ketma-ket{' '}
            <strong className={cn('font-bold', isLight ? 'text-orange-600' : 'text-amber-400')}>
              {user.streak || 0} kundan
            </strong>{' '}
            beri faolsiz.
          </p>
        </div>
      </div>

      {/* 7-Days Streak Matrix */}
      <div className={cn('pt-3 border-t', isLight ? 'border-slate-100' : 'border-slate-800/80')}>
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayLabels.map((day, idx) => {
            const active = dailyGoals.streakDays[idx] || false;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    'flex size-6 sm:size-7 items-center justify-center rounded-xl text-[10px] font-black transition-all',
                    active
                      ? isLight
                        ? 'bg-orange-500 text-white shadow-xs font-black'
                        : 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : isLight
                      ? 'border border-slate-200 bg-slate-50 text-slate-500'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-500'
                  )}
                >
                  {active ? <Check className="size-3 stroke-[3]" /> : day}
                </div>
                <span className={cn('text-[8px] font-bold', isLight ? 'text-slate-400' : 'text-slate-500')}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * 3. 1V1 ESPORTS BATTLE ARENA CARD:
 * Vibrant, gaming aesthetic with Energetic Orange/Coral and Electric Blue accents.
 */
export function BattleArenaCard({
  battleArena = {
    onlinePlayers: 42,
    currentRank: 'Navkar II',
    elo: 1420,
  },
  theme = 'dark',
}: {
  battleArena?: HeroDashboardProps['battleArena'];
  theme?: 'dark' | 'light';
}) {
  const isLight = theme === 'light';

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 backdrop-blur-xl transition-all duration-300 space-y-5',
        isLight
          ? 'border border-orange-200/80 bg-gradient-to-br from-white via-orange-50/25 to-white shadow-[0_4px_25px_rgba(249,115,22,0.06)]'
          : 'border border-rose-500/30 bg-gradient-to-br from-rose-950/25 via-slate-900/60 to-purple-950/25 border-t border-white/10 shadow-[0_0_30px_rgba(244,63,94,0.12)]'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-xl border',
              isLight
                ? 'border-orange-200 bg-orange-50 text-orange-600'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            )}
          >
            <Swords className="size-4" />
          </div>
          <div>
            <h3 className={cn('text-sm font-black uppercase tracking-wider', isLight ? 'text-slate-900' : 'text-white')}>
              1v1 Jonli Bellashuv
            </h3>
            <p className={cn('text-[11px] font-medium', isLight ? 'text-slate-500' : 'text-slate-400')}>
              Esports formatidagi tezkor duel
            </p>
          </div>
        </div>

        {/* Pulsing Live Badge in Energetic Orange/Coral */}
        <Badge
          className={cn(
            'text-[10px] font-black gap-1.5 px-2.5 py-0.5 animate-pulse border',
            isLight
              ? 'border-orange-300 bg-orange-50 text-orange-700'
              : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              isLight ? 'bg-orange-500' : 'bg-rose-500'
            )}
          />
          {battleArena.onlinePlayers} onlayn
        </Badge>
      </div>

      {/* Rank / ELO Display */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            'rounded-2xl border p-3.5 backdrop-blur-md',
            isLight ? 'border-slate-200 bg-white/90 shadow-2xs' : 'border-slate-800 bg-slate-950/70'
          )}
        >
          <span className={cn('text-[10px] uppercase font-bold tracking-wider block', isLight ? 'text-slate-500' : 'text-slate-400')}>
            Unvon
          </span>
          <p
            className={cn(
              'text-sm font-black flex items-center gap-1.5 mt-0.5',
              isLight ? 'text-slate-900' : 'text-white'
            )}
          >
            <span>🛡️</span>
            <span>{battleArena.currentRank}</span>
          </p>
        </div>
        <div
          className={cn(
            'rounded-2xl border p-3.5 backdrop-blur-md',
            isLight ? 'border-slate-200 bg-white/90 shadow-2xs' : 'border-slate-800 bg-slate-950/70'
          )}
        >
          <span className={cn('text-[10px] uppercase font-bold tracking-wider block', isLight ? 'text-slate-500' : 'text-slate-400')}>
            Joriy ELO
          </span>
          <p
            className={cn(
              'text-base font-mono font-black mt-0.5',
              isLight ? 'text-orange-600' : 'text-rose-400'
            )}
          >
            {battleArena.elo}
          </p>
        </div>
      </div>

      {/* Quick Find Match Button */}
      <Link
        href="/battles"
        className={cn(
          'w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl font-black text-sm active:scale-98 transition-all cursor-pointer select-none shadow-md',
          isLight
            ? 'bg-gradient-to-r from-orange-500 via-rose-500 to-orange-600 hover:from-orange-600 hover:to-rose-600 text-white shadow-[0_4px_18px_rgba(249,115,22,0.3)]'
            : 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]'
        )}
      >
        <Swords className="size-4" />
        <span>Raqib Qidirish (Find Match)</span>
        <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}

/**
 * Default combined ModernHeroDashboard for backwards compatibility
 */
export default function ModernHeroDashboard(props: HeroDashboardProps) {
  return (
    <div className="space-y-6">
      <HeroFocusBanner
        user={props.user}
        recommendedSprint={props.recommendedSprint}
        theme={props.theme}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DailyGoalCard
          user={props.user}
          dailyGoals={props.dailyGoals}
          theme={props.theme}
        />
        <BattleArenaCard
          battleArena={props.battleArena}
          theme={props.theme}
        />
      </div>
    </div>
  );
}
