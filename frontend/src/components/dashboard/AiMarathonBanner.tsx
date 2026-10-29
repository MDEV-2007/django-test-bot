'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles, Flame, Trophy, Award, Gift, Lock,
  CheckCircle2, ArrowRight, Swords, RotateCcw,
  BookOpen, AlertTriangle, ChevronRight, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import DailyChestModal, { DailyChestStatus } from '@/components/student/DailyChestModal';

export interface MarathonStep {
  id: string;
  title: string;
  subtitle: string;
  rewardText: string;
  href: string;
  isCompleted: boolean;
  actionText: string;
}

interface AiMarathonBannerProps {
  userName?: string;
  userLevel?: number;
  userStreak?: number;
  dtmScore?: number;
  maxDtmScore?: number;
  predictedGrade?: string;
  unresolvedMistakesCount?: number;
  step1Done?: boolean;
  step2Done?: boolean;
  step3Done?: boolean;
  chestStatus?: DailyChestStatus | null;
  onOpenSprint?: () => void;
  onClaimSuccess?: (stats: { coins: number; xp: number; level: number; streak: number }) => void;
}

export default function AiMarathonBanner({
  userName = "O'quvchi",
  userLevel = 1,
  userStreak = 0,
  dtmScore = 178.4,
  maxDtmScore = 189.0,
  predictedGrade = "B+ (58.4 ball)",
  unresolvedMistakesCount = 0,
  step1Done = false,
  step2Done = false,
  step3Done = false,
  chestStatus,
  onOpenSprint,
  onClaimSuccess,
}: AiMarathonBannerProps) {
  const [chestModalOpen, setChestModalOpen] = useState(false);

  // 3-Bosqich holatlari
  const steps: MarathonStep[] = [
    {
      id: 'sprint',
      title: '15 daqiqa Fokus Sprint',
      subtitle: "Yangi test va neyron oqimi",
      rewardText: '+40 XP',
      href: '/study',
      isCompleted: step1Done,
      actionText: "Sprintni Boshlash",
    },
    {
      id: 'mistakes',
      title: 'Xatolarni Tozalash',
      subtitle: "Aqlli daftarchadagi xatolarni yanchish",
      rewardText: '+30 XP',
      href: '/tests/revision',
      isCompleted: step2Done,
      actionText: "Xatolarni Yopish",
    },
    {
      id: 'duel',
      title: '1v1 Arena Dueli',
      subtitle: "Jonli raqib bilan 60s jang",
      rewardText: '+50 Tanga',
      href: '/battles',
      isCompleted: step3Done,
      actionText: "Arenaga Kirish",
    },
  ];

  const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const isAllCompleted = completedCount === 3;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/5 p-5 sm:p-7 shadow-xl space-y-6">
      {/* Orqa fon nozik dekorativ nurlari */}
      <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-amber-500/10 blur-3xl" />

      {/* ─── 1. TOP HEADER: Salomlashuv & Jonli DTM Barometri ─── */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-bold text-primary">
              <Sparkles className="size-3 text-primary animate-pulse" />
              Bugungi AI Marafon
            </span>
            {userStreak > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold gap-1">
                <Flame className="size-3.5 fill-current text-amber-500" />
                {userStreak} kunlik olovli seriya
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Xayrli kun, {userName}! 🎯
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kunlik 3 bosqichli zanjirni bajaring va <b className="text-foreground">Kundalik Sirli Sandiq</b>ni oching.
          </p>
        </div>

        {/* Jonli DTM / Sertifikat Barometri */}
        <div className="flex items-center gap-3 bg-muted/40 border border-border/70 p-3 sm:p-3.5 rounded-2xl shrink-0">
          <div className="size-11 rounded-xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 border border-primary/30 flex items-center justify-center text-primary">
            <Award className="size-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Kutilayotgan DTM Ball
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
                {dtmScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ {maxDtmScore} ball</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Prognoz: {predictedGrade}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. LOSS AVERSION OGOHLANTIRISH (Agar xatolar bo'lsa) ─── */}
      {unresolvedMistakesCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-500 shrink-0" />
            <span>
              Aqlli Daftaringizda <b>{unresolvedMistakesCount} ta tozalanganmagan xato</b> bor. DTM prognoz ballingiz tushib ketmasligi uchun ularni yoping!
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-xl h-7 px-3 text-xs font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shrink-0">
            <Link href="/tests/revision">Tozalash</Link>
          </Button>
        </motion.div>
      )}

      {/* ─── 3. 3-BOSQICHLI MARAFON VIZUAL STEPPERI ─── */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-0.5">
          <span>Marafon bosqichlari ({completedCount}/3)</span>
          <span className="font-mono text-primary">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2 rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {steps.map((st, idx) => (
            <div
              key={st.id}
              className={cn(
                'relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 space-y-3',
                st.isCompleted
                  ? 'border-emerald-500/40 bg-emerald-500/[0.06] shadow-xs'
                  : 'border-border/80 bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {idx + 1}-qadam
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono font-bold text-primary">
                      {st.rewardText}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-foreground truncate">{st.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{st.subtitle}</p>
                </div>

                <div className="shrink-0 pt-0.5">
                  {st.isCompleted ? (
                    <div className="size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="size-4" />
                    </div>
                  ) : (
                    <div className="size-6 rounded-full border border-border/80 bg-muted/50 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                  )}
                </div>
              </div>

              {/* Tugma */}
              <div>
                {st.isCompleted ? (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Bajarildi
                  </div>
                ) : st.id === 'sprint' && onOpenSprint ? (
                  <Button
                    onClick={onOpenSprint}
                    size="sm"
                    className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 shadow-xs cursor-pointer"
                  >
                    <span>{st.actionText}</span>
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 shadow-xs cursor-pointer"
                  >
                    <Link href={st.href}>
                      <span>{st.actionText}</span>
                      <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. SIRLI SANDIQ QULFI VA OCHISH BLOKI ─── */}
      <div className="relative z-10 pt-2 border-t border-border/50">
        {isAllCompleted ? (
          // Barcha 3 qadam bajarilgan: Sirli Sandiq Qulfi ochildi!
          <motion.div
            initial={{ scale: 0.98 }}
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 via-primary/20 to-emerald-500/20 border-2 border-amber-500/50 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 animate-bounce">
                <Gift className="size-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>Kundalik Sirli Sandiq Qulfi Yechildi!</span>
                  <Sparkles className="size-4 text-amber-500" />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Barcha 3 qadam yakunlandi. Hoziroq maxsus tangalar va bonuslarni oling!
                </p>
              </div>
            </div>

            <Button
              onClick={() => setChestModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs px-5 h-10 shadow-lg shadow-amber-500/25 cursor-pointer shrink-0"
            >
              <Gift className="size-4 mr-1.5" />
              Sandiqni Ochish
            </Button>
          </motion.div>
        ) : (
          // Qulflangan holat
          <div className="rounded-2xl p-4 bg-muted/30 border border-dashed border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>Kundalik Sirli Sandiq (Qulflangan)</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {completedCount} / 3 qadam
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sandiqni ochish uchun yana <b className="text-foreground">{3 - completedCount} ta qadam</b>ni yakunlang.
                </p>
              </div>
            </div>

            <Button
              disabled
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold opacity-60 cursor-not-allowed shrink-0"
            >
              <Lock className="size-3.5 mr-1.5" />
              3 ta qadam talab etiladi
            </Button>
          </div>
        )}
      </div>

      {/* Sirli Sandiq Modal */}
      {chestModalOpen && (
        <DailyChestModal
          isOpen={chestModalOpen}
          onClose={() => setChestModalOpen(false)}
          initialStatus={chestStatus}
          onClaimSuccess={(newStats) => {
            if (onClaimSuccess) onClaimSuccess(newStats);
          }}
        />
      )}
    </div>
  );
}

