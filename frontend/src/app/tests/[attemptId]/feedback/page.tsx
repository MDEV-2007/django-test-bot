'use client';

import AiEssayPaywall from '@/components/exam/AiEssayPaywall';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Crown, Sparkles, XCircle, RotateCcw, Compass, Lightbulb, ThumbsUp,
  AlertTriangle, ChevronLeft, ChevronRight, Share2, Award,
  CheckCircle2, HelpCircle, Trophy, Gift, Swords, Film, BookOpen, Send, Gamepad2, Lock,
  TrendingUp, ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { canShareToStory, shareToStory, tgHaptic, useIsTelegram } from '@/lib/telegram';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import CertificateModal from '@/components/student/CertificateModal';
import ShareToCommunityModal from '@/components/student/ShareToCommunityModal';
import DailyChestModal from '@/components/student/DailyChestModal';
import ExamSurveyCard from '@/components/student/ExamSurveyCard';
import { WritingReviewCard } from '@/components/cefr/WritingTask';
import type { WritingReview } from '@/lib/cefr-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import VoiceExplanationButton from '@/components/common/VoiceExplanationButton';

type Mistake = {
  mavzu: string; savol_mazmuni: string; bola_javobi: string; togri_javob: string;
  nega_muhim?: string; eslab_qolish?: string;
};
type RoadmapStep = { step: number; title: string; duration: string };

export type RaschData = {
  theta: number;
  scaled_score: number;
  max_scale: number;
  percentage: number;
  correct_count: number;
  total_questions: number;
  grade: string;
  grade_label: string;
  tone: string;
  difficulty_breakdown?: {
    easy_total: number;
    easy_correct: number;
    medium_total: number;
    medium_correct: number;
    hard_total: number;
    hard_correct: number;
  };
  formula_info?: {
    formula: string;
    b_formula: string;
    scale_formula: string;
    meaning: string;
  };
};

type FeedbackData = {
  status: 'pending' | 'ready';
  attempt?: {
    id: number;
    score: number;
    correct_answers: number;
    wrong_answers: number;
    skipped_answers: number;
    test_title?: string;
    completed_at?: string;
    rasch?: RaschData;
  };
  rasch?: RaschData;
  overall_analysis?: string;
  weak_topics?: string[];
  strong_topics?: string[];
  ai_motivation?: string;
  recommendations?: string;
  predicted_score?: string;
  roadmap?: RoadmapStep[];
  detailed_mistakes?: Mistake[];
  review_items?: ReviewItem[];
  daily_chest?: { can_claim: boolean; streak: number };
};

/* Natijani Telegram Story'ga qo'yish.

   Nega alohida rasm: Story faqat RASM yoki videoni qabul qiladi, sahifa skrinshotini
   emas. Server 1080x1920 karta chizib beradi va uni imzolangan ochiq manzilda ochadi —
   rasmni foydalanuvchining telefoni emas, Telegram serverlari yuklab oladi. */
function StoryShareButton({ attemptId }: { attemptId: string }) {
  const inTelegram = useIsTelegram();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const res = await apiFetch<{ media_url: string; text: string }>(
        `/api/tests/attempts/${attemptId}/story-link/`,
      );
      if (inTelegram && canShareToStory()) {
        const ok = shareToStory(res.media_url, {
          text: res.text,
          widget_link: { url: 'https://t.me/ilmildiziuz_bot', name: 'IlmIldizi' },
        });
        if (ok) {
          tgHaptic('success');
          return;
        }
      }
      // Web brauzerda yoki eski Telegramda: rasmni to'g'ridan-to'g'ri ochish / saqlash
      window.open(res.media_url, '_blank');
      toast.success("Story kartasi ochildi! Uni saqlab olib, Telegram/Instagram Story'ga qo'yishingiz mumkin.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={share}
      disabled={busy}
      className="border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-medium"
    >
      <Share2 className="size-4" /> {busy ? 'Tayyorlanmoqda...' : 'Storyga qo`yish'}
    </Button>
  );
}

type ReviewItem = {
  question_id: number; body: string; is_correct: boolean; is_skipped: boolean;
  your_answer: string; correct_answer: string; explanation: string; grading_note: string;
  exam_number: number | null;
  type: string;
  section: { skill: string; skill_label: string; part_number: number; title: string } | null;
  writing: ({ reviewed: false } | ({ reviewed: true } & WritingReview)) | null;
};

export default function FeedbackPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { access, authReady, user } = useAuthStore();
  const [data, setData] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mistakesError, setMistakesError] = useState<string | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [chestModalOpen, setChestModalOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authReady && !access) {
      router.replace(`/login?next=${encodeURIComponent(`/tests/${attemptId}/feedback`)}`);
      return;
    }
    if (!access) return;
    const load = () => {
      apiFetch<FeedbackData>(`/api/tests/attempts/${attemptId}/feedback/`)
        .then((d) => {
          setData(d);
          if (d.status === 'ready' && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
    };
    load();
    pollRef.current = setInterval(load, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authReady, access, attemptId, router]);

  async function startMistakesTest() {
    setMistakesError(null);
    try {
      const res = await apiFetch<{ attempt_id: number }>('/api/tests/start-mistakes/', { method: 'POST' });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      setMistakesError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  if (error) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 p-6">
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{error}</CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 sm:p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </main>
      </>
    );
  }

  if (data.status === 'pending') {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-4 p-4 sm:p-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Sparkles className="size-8 animate-pulse text-[var(--accent-text)]" />
              <p className="text-sm text-muted-foreground">AI tahlili tayyorlanmoqda... (avtomatik yangilanadi)</p>
            </CardContent>
          </Card>
          <Skeleton className="h-40 w-full" />
        </main>
      </>
    );
  }

  function handleChallengeFriend() {
    const title = data?.attempt?.test_title || 'Milliy sertifikat sinov testi';
    const score = Math.round(a?.score || 0);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ilmildizi.uz';
    const shareUrl = user?.username
      ? `${origin}/register?ref=${encodeURIComponent(user.username)}`
      : `${origin}/battles`;
    const text = `⚔️ Men "${title}" testidan ${score}% to'pladim!\n\nDo'stim, mendan ko'proq ball to'play olasanmi? Qani, 1v1 Battle Arena'da kuch sinashamiz! 👇`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank');
    tgHaptic('success');
  }

  const a = data.attempt!;
  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/tests"><ChevronLeft className="size-4" /> Testlar ro&apos;yxati</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCertOpen(true)}
              className="border-[var(--tone-premium)]/40 bg-[var(--tone-premium-soft)] font-semibold text-[var(--tone-premium-text)] hover:bg-[var(--tone-premium)]/20"
            >
              <Award className="size-4" /> Sertifikat
            </Button>
            <StoryShareButton attemptId={attemptId} />
            <Button
              size="sm"
              onClick={handleChallengeFriend}
              className="border-rose-500/50 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold hover:from-rose-500 hover:to-amber-500 gap-1.5 shadow-sm"
            >
              <Swords className="size-4" /> Do&apos;stni duelga chaqirish ⚔️
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCommunityModalOpen(true)}
              className="border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/15 font-bold text-amber-300 hover:from-amber-500/25 hover:to-orange-500/25 gap-1.5 shadow-sm"
            >
              <Sparkles className="size-4 text-amber-400" /> Hamjamiyatga ulashish (+15 XP)
            </Button>
            {a.score < 100 && (
            <Button
              size="sm"
              variant="outline"
              onClick={startMistakesTest}
              className="border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 hover:text-rose-100"
            >
              <RotateCcw className="size-4" /> Xatolar ustida ishlash
            </Button>
            )}
          </div>
        </div>

        {mistakesError && (
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{mistakesError}</CardContent>
          </Card>
        )}

        {/* Natija Hero Card */}
        {(() => {
          const totalQ = (a.correct_answers || 0) + (a.wrong_answers || 0) + (a.skipped_answers || 0);
          const safeTotal = totalQ || 1;
          const correctPct = ((a.correct_answers || 0) / safeTotal) * 100;
          const wrongPct = ((a.wrong_answers || 0) / safeTotal) * 100;
          const skippedPct = ((a.skipped_answers || 0) / safeTotal) * 100;

          const radius = 54;
          const circumference = 2 * Math.PI * radius;
          const scoreVal = Math.min(100, Math.max(0, a.score || 0));
          const strokeDashoffset = circumference - (scoreVal / 100) * circumference;

          const isCefrTest = Boolean(data?.attempt?.test_title?.toLowerCase().includes('cefr')) || totalQ >= 60;

          return (
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#11141d]/95 p-6 sm:p-8 shadow-xl backdrop-blur-md">
              {/* Dynamic Ambient Glow behind Score */}
              <div
                className={cn(
                  "pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full blur-3xl opacity-25",
                  scoreVal >= 80 ? "bg-emerald-500" :
                  scoreVal >= 60 ? "bg-sky-500" :
                  scoreVal >= 40 ? "bg-amber-500" : "bg-rose-500"
                )}
              />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Test Title / Eyebrow */}
                {data?.attempt?.test_title && (
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {data.attempt.test_title} natijalari
                  </span>
                )}

                {/* Circular Score Gauge Centerpiece */}
                <div className="relative flex size-36 sm:size-40 items-center justify-center my-2">
                  <svg className="size-full -rotate-90" viewBox="0 0 130 130">
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      className="stroke-slate-100 dark:stroke-white/10"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      className={cn(
                        "transition-all duration-1000 ease-out",
                        scoreVal >= 80 ? "stroke-emerald-500" :
                        scoreVal >= 60 ? "stroke-sky-500" :
                        scoreVal >= 40 ? "stroke-amber-500" : "stroke-rose-500"
                      )}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                      {scoreVal.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                      Umumiy ball
                    </span>
                  </div>
                </div>

                {/* Dynamic Status Pill */}
                <div className="mt-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-sans shadow-2xs",
                      scoreVal >= 80 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                      scoreVal >= 60 ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30" :
                      scoreVal >= 40 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                      "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    )}
                  >
                    {scoreVal >= 80 ? "A'lo natija! 🏆" :
                     scoreVal >= 60 ? "Yaxshi natija! 🎯" :
                     scoreVal >= 40 ? "O'rtacha natija 📈" : "Ko'proq mashq zarur 💡"}
                  </span>
                </div>

                {/* Multi-Color Segmented Progress Bar */}
                <div className="w-full max-w-md mt-6 space-y-1.5">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex shadow-inner">
                    {correctPct > 0 && (
                      <div
                        style={{ width: `${correctPct}%` }}
                        className="bg-emerald-500 transition-all duration-700"
                        title={`To'g'ri: ${a.correct_answers}`}
                      />
                    )}
                    {wrongPct > 0 && (
                      <div
                        style={{ width: `${wrongPct}%` }}
                        className="bg-rose-500 transition-all duration-700"
                        title={`Xato: ${a.wrong_answers}`}
                      />
                    )}
                    {skippedPct > 0 && (
                      <div
                        style={{ width: `${skippedPct}%` }}
                        className="bg-slate-300 dark:bg-slate-700 transition-all duration-700"
                        title={`Javobsiz: ${a.skipped_answers}`}
                      />
                    )}
                  </div>
                </div>

                {/* 3 Metric Cards: To'g'ri / Xato / Javobsiz */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-md mt-4">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 sm:p-3.5 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="size-3.5" />
                      <span>To&apos;g&apos;ri</span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {a.correct_answers}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 p-3 sm:p-3.5 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                      <XCircle className="size-3.5" />
                      <span>Xato</span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                      {a.wrong_answers}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-3 sm:p-3.5 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                      <HelpCircle className="size-3.5" />
                      <span>Javobsiz</span>
                    </div>
                    <span className="font-mono text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-300">
                      {a.skipped_answers}
                    </span>
                  </div>
                </div>

                {/* Sertifikat & Prognoz Badges */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  {/* CEFR Daraja */}
                  {isCefrTest && (() => {
                    const score = a.score || 0;
                    let badgeText = '';
                    let badgeClass = '';
                    if (score >= 86) {
                      badgeText = "🏆 C1 Daraja (Ilg'or — Oliy Sertifikat)";
                      badgeClass = 'border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-300';
                    } else if (score >= 67) {
                      badgeText = "🥇 B2 Daraja (Mustaqil — OTM Imtiyozi)";
                      badgeClass = 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300';
                    } else if (score >= 47) {
                      badgeText = "🥈 B1 Daraja (Ostonaviy Sertifikat)";
                      badgeClass = 'border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-300';
                    } else if (score >= 27) {
                      badgeText = "🥉 A2 Daraja (Boshlang'ich Sertifikat)";
                      badgeClass = 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300';
                    } else {
                      badgeText = "❌ Sinovdan o'tmadi (Sertifikat berilmaydi)";
                      badgeClass = 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400';
                    }
                    return (
                      <Badge variant="outline" className={`py-1.5 px-3.5 text-xs sm:text-sm font-bold ${badgeClass}`}>
                        {badgeText}
                      </Badge>
                    );
                  })()}

                  {/* Milliy Sertifikat 45 talik */}
                  {!isCefrTest && totalQ === 45 && (() => {
                    const c = a.correct_answers;
                    let badgeText = '';
                    let badgeClass = '';
                    if (c >= 34) { badgeText = '🏆 A+ Daraja (Oltin Sertifikat)'; badgeClass = 'border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400'; }
                    else if (c >= 28) { badgeText = '🥇 A Daraja (A\'lo Sertifikat)'; badgeClass = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'; }
                    else if (c >= 24) { badgeText = '🥈 B+ Daraja (Juda yaxshi)'; badgeClass = 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400'; }
                    else if (c >= 21) { badgeText = '🥉 B Daraja (Yaxshi)'; badgeClass = 'border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-400'; }
                    else if (c >= 18) { badgeText = '📜 C+ Daraja (Qoniqarli)'; badgeClass = 'border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400'; }
                    else { badgeText = '❌ Sinovdan o\'tmadi (Sertifikat berilmaydi)'; badgeClass = 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400'; }

                    return (
                      <Badge variant="outline" className={`py-1.5 px-3 text-xs sm:text-sm font-bold ${badgeClass}`}>
                        {badgeText}
                      </Badge>
                    );
                  })()}

                  {/* Prognoz Sertifikat */}
                  {data.predicted_score && (
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-amber-500 dark:text-amber-300 shadow-xs">
                      <Crown className="size-4 text-amber-400 shrink-0 animate-pulse" />
                      <span>Prognoz Sertifikat: <b>{((a.correct_answers || 0) === 0 || (a.score || 0) === 0) ? "— (0.0 ball)" : data.predicted_score}</b></span>
                    </div>
                  )}
                </div>

                {/* ─── ZERO DEAD-ENDS / AUTOPLAY KONVEYER BLOKI ─── */}
                <div className="w-full max-w-xl mt-6 p-4.5 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div className="space-y-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Sparkles className="size-3 text-amber-500 animate-pulse" />
                      Keyingi Qadam · Konveyer Oqimi
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                      {(a.wrong_answers || 0) > 0
                        ? `🔥 ${a.wrong_answers} ta xatoingiz aniqlandi: Hoziroq 2 daqiqada ularni yanchib tashlang!`
                        : `🏆 Ajoyib natija! 1v1 Arenada tengdoshingiz bilan kuch sinashing!`}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {(a.wrong_answers || 0) > 0
                        ? `Xatolarni tozalab, +40 XP oling va marafon zanjirini davom ettiring.`
                        : `Ketma-ket g'alaba seriyasi uchun +50 Tanga va 2x Bonus.`}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                    {(a.wrong_answers || 0) > 0 ? (
                      <Button
                        onClick={startMistakesTest}
                        className="w-full sm:w-auto rounded-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs px-5 shadow-md shadow-rose-500/25 gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Xatolarni Yanchish (+40 XP)</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white font-bold text-xs px-5 shadow-md shadow-amber-500/25 gap-1.5 cursor-pointer"
                      >
                        <Link href="/battles">
                          <Swords className="size-3.5" />
                          <span>1v1 Arenaga Kirish (+50 Tanga)</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── MILLIY SERTIFIKAT NATIJALARI (BMB / DTM STANDARTI) ─── */}
        {(() => {
          const rasch = data?.rasch || data?.attempt?.rasch;
          const isZeroCorrect = (a.correct_answers || 0) === 0 || (a.score || 0) === 0;
          const thetaVal = rasch?.theta ?? 0;
          const scaledScore = isZeroCorrect ? 0 : (rasch?.scaled_score ?? Math.min(70, Math.round(((a.score || 0) / 100) * 70 * 10) / 10));
          const isPassed = scaledScore >= 42;
          const gradeText = rasch?.grade || (scaledScore >= 65 ? 'A+' : scaledScore >= 60 ? 'A' : scaledScore >= 55 ? 'B+' : scaledScore >= 50 ? 'B' : scaledScore >= 46 ? 'C+' : scaledScore >= 42 ? 'C' : '—');
          const gradeLabel = rasch?.grade_label || (scaledScore >= 65 ? "A+ Daraja (100% OTM Imtiyozi)" : scaledScore >= 60 ? "A Daraja (A'lo Sertifikat)" : scaledScore >= 55 ? "B+ Daraja (Juda yaxshi)" : scaledScore >= 50 ? "B Daraja (Yaxshi natija)" : scaledScore >= 46 ? "C+ Daraja (Qoniqarli)" : scaledScore >= 42 ? "C Daraja (O'tish darajasi)" : "Sinovdan o'tmadi (Minimal 42 ball)");
          const breakdown = rasch?.difficulty_breakdown;
          const pctVal = `${((scaledScore / 70) * 100).toFixed(1)}%`;

          let abilityText = "Boshlang'ich";
          let abilityDesc = "Mavzularni mustahkamlash zarur 💡";
          let abilityColor = "text-rose-400";
          if (thetaVal >= 1.5 || scaledScore >= 60) {
            abilityText = "Mukammal";
            abilityDesc = "Juda yuqori bilim darajasi 🚀";
            abilityColor = "text-emerald-400";
          } else if (thetaVal >= 0.5 || scaledScore >= 50) {
            abilityText = "Yuqori";
            abilityDesc = "Yaxshi o'zlashtirilgan daraja 🎯";
            abilityColor = "text-emerald-300";
          } else if (thetaVal >= -0.5 || scaledScore >= 42) {
            abilityText = "O'rtacha";
            abilityDesc = "Yetarli o'tish darajasi ⚖️";
            abilityColor = "text-sky-300";
          } else {
            abilityText = "Kuchaytirish zarur";
            abilityDesc = "Ko'proq amaliyot talab etiladi 💡";
            abilityColor = "text-amber-400";
          }

          return (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl text-white">
              {/* Orqa fon uchun nozik nur effektlari */}
              <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-sky-500/10 blur-3xl" />

              {/* Yuqori sarlavha va Sertifikat tugmasi */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-300 shadow-xs">
                  <Sparkles className="size-3.5 text-emerald-400 animate-pulse" />
                  <span>Milliy Sertifikat Standarti (BMB / DTM)</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCertOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 gap-2 active:scale-95 transition-all text-xs border border-emerald-400/30 cursor-pointer"
                >
                  <Award className="size-4" /> Rasmiy PDF Sertifikatni ochish
                </Button>
              </div>

              {/* 3 ta Asosiy KPI Card */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. To'plangan Ball */}
                <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/60 to-slate-900/80 p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-950/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <Trophy className="size-4 text-emerald-400" />
                    To&apos;plangan Ball
                  </span>
                  <div className="flex items-baseline gap-1.5 my-0.5">
                    <span className="font-mono text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-xs">
                      {scaledScore.toFixed(1)}
                    </span>
                    <span className="text-sm font-bold text-emerald-200/60">/ 70 ball</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-300/80 mt-1">
                    {isPassed ? `✅ Natija: ${pctVal}` : `Minimal o'tish balli: 42 ball`}
                  </span>
                </div>

                {/* 2. Rasmiy Daraja */}
                <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 flex flex-col items-center justify-center text-center shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <Crown className="size-4 text-amber-400" />
                    Rasmiy Daraja
                  </span>
                  <span className={`font-mono text-4xl sm:text-5xl font-black my-0.5 ${isPassed ? 'text-amber-400' : 'text-slate-400'}`}>
                    {gradeText}
                  </span>
                  <span className={`text-xs font-bold mt-1 px-3 py-0.5 rounded-full ${isPassed ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
                    {isPassed ? gradeLabel : "Sinovdan o'tmadi"}
                  </span>
                </div>

                {/* 3. Bilim Darajasi */}
                <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 flex flex-col items-center justify-center text-center shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="size-4 text-sky-400" />
                    Bilim Darajasi
                  </span>
                  <span className={`font-sans text-2xl sm:text-3xl font-black my-1.5 ${abilityColor}`}>
                    {abilityText}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {abilityDesc}
                  </span>
                </div>
              </div>

              {/* Savollar Qiyinligi Taqsimoti (O'quvchi uchun foydali tahlil) */}
              {breakdown && (breakdown.easy_total > 0 || breakdown.medium_total > 0 || breakdown.hard_total > 0) && (
                <div className="relative z-10 mt-6 pt-5 border-t border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3 text-center sm:text-left">
                    Savollarning qiyinlik darajasi bo&apos;yicha yechilgan javoblar:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-center">
                      <span className="text-xs font-bold text-emerald-400 block mb-1">Oson savollar</span>
                      <span className="font-mono text-xl font-black text-white">
                        {breakdown.easy_correct} <span className="text-xs font-normal text-emerald-300/70">/ {breakdown.easy_total} ta to&apos;g&apos;ri</span>
                      </span>
                    </div>
                    <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 p-3 text-center">
                      <span className="text-xs font-bold text-sky-400 block mb-1">O&apos;rtacha savollar</span>
                      <span className="font-mono text-xl font-black text-white">
                        {breakdown.medium_correct} <span className="text-xs font-normal text-sky-300/70">/ {breakdown.medium_total} ta to&apos;g&apos;ri</span>
                      </span>
                    </div>
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-center">
                      <span className="text-xs font-bold text-rose-400 block mb-1">Qiyin savollar</span>
                      <span className="font-mono text-xl font-black text-white">
                        {breakdown.hard_correct} <span className="text-xs font-normal text-rose-300/70">/ {breakdown.hard_total} ta to&apos;g&apos;ri</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── RASMIY SARIQ-OQ SERTIFIKAT PREVIEW KARTASI ─── */}
        {(() => {
          const rasch = data?.rasch || data?.attempt?.rasch;
          const isZeroCorrect = (a.correct_answers || 0) === 0 || (a.score || 0) === 0;
          const scaledScore = isZeroCorrect ? 0 : (rasch?.scaled_score ?? Math.min(70, Math.round(((a.score || 0) / 100) * 70 * 10) / 10));
          const scaledScoreStr = scaledScore.toFixed(1);
          const scaledScoreComma = scaledScoreStr.replace('.', ',');
          const pctVal = isZeroCorrect ? '0.00 %' : (rasch?.percentage !== undefined ? `${rasch.percentage.toFixed(2)} %` : `${Math.round(a.score || 0)} %`);
          const certGrade = isZeroCorrect ? '—' : (rasch?.grade || (scaledScore >= 65 ? 'A+' : scaledScore >= 60 ? 'A' : scaledScore >= 55 ? 'B+' : scaledScore >= 50 ? 'B' : scaledScore >= 46 ? 'C+' : scaledScore >= 42 ? 'C' : '—'));
          const cleanAttemptId = String(attemptId || '13770');
          const personalCode = cleanAttemptId.slice(-5).padStart(5, '0');
          const certNumber = `DJ26 0607${cleanAttemptId.slice(-7).padStart(7, '0')}`;
          
          const fullName = `${user?.first_name || user?.username || "O'quvchi"} ${user?.last_name || ''}`.trim().toUpperCase();
          const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/tests/${cleanAttemptId}/feedback` : `https://ilmildizi.uz/tests/${cleanAttemptId}/feedback`;
          const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}&color=0f172a&bgcolor=fefcf6`;

          return (
            <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-amber-100/5 to-amber-500/10 p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-amber-300/30">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Award className="size-3.5" /> Rasmiy Milliy Sertifikat
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    Sizning sinov natijangiz bo&apos;yicha sertifikat tayyor! 📜
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ushbu sertifikat rasmiy BMB (DTM) standarti bo&apos;yicha sariq-oq rangda va QR-kod bilan taqdim etiladi.
                  </p>
                </div>
                <Button
                  onClick={() => setCertOpen(true)}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold shadow-lg shadow-amber-500/20 gap-2 shrink-0 h-11 px-5"
                >
                  <Award className="size-4" /> To&apos;liq ochish va yuklab olish (PNG/PDF)
                </Button>
              </div>

              {/* Sertifikatning o'zi (Sariq-oq rang, tilla hoshiya, QR kod) */}
              <div 
                onClick={() => setCertOpen(true)}
                className="cursor-pointer group relative mx-auto w-full max-w-[580px] bg-[#fefcf6] border-[3px] border-[#c59b27] p-2.5 sm:p-3.5 shadow-xl rounded-sm transition-all hover:scale-[1.01] hover:shadow-2xl"
              >
                <div className="border border-[#d4af37] p-4 sm:p-6 bg-[#fdfbf7] flex flex-col items-center text-[#0f172a]">
                  
                  {/* Top Emblem */}
                  <div className="size-16 rounded-full border-2 border-[#c59b27] bg-white flex flex-col items-center justify-center p-1 mb-1.5 shadow-xs">
                    <span className="text-[7.5px] font-bold text-rose-700 leading-none">★ ILMILDIZI ★</span>
                    <span className="text-[9.5px] font-black text-[#1c3c87] leading-tight">TARIX MILLIY</span>
                    <span className="text-[7.5px] font-bold text-[#c59b27] leading-none">CERTIFICATE</span>
                    <span className="text-[6px] text-slate-500 leading-tight mt-0.5">TEST MARKAZI</span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-[#1c3c87] uppercase tracking-wide">
                    ILMILDIZI & TARIX MILLIY SERTIFIKAT HUZURIDAGI
                  </p>
                  <p className="text-[10px] sm:text-xs font-extrabold text-[#1c3c87] uppercase tracking-wide mb-2">
                    BILIM VA MALAKALARNI BAHOLASH AGENTLIGI
                  </p>

                  {/* Title */}
                  <h4 className="font-serif text-sm sm:text-base font-black text-[#0f172a] uppercase tracking-wide text-center leading-snug">
                    UMUMTA&apos;LIM FANINI BILISH DARAJASI<br />TO&apos;G&apos;RISIDA SERTIFIKAT
                  </h4>

                  {/* Data Rows */}
                  <div className="w-full mt-3 space-y-2 text-[11px] sm:text-xs">
                    <div className="space-y-1 pb-1.5 border-b border-[#e5c158]">
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Sertifikat raqami:</span>
                        <span className="font-mono font-bold">{certNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Talabgor kodi:</span>
                        <span className="font-mono font-bold">{personalCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Talabgor:</span>
                        <span className="font-bold tracking-wide">{fullName}</span>
                      </div>
                    </div>

                    <div className="space-y-1 pb-1.5 border-b border-[#e5c158]">
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Umumta&apos;lim fani:</span>
                        <span className="font-bold">{data?.attempt?.test_title || "Tarix Milliy Sertifikat"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Umumiy to&apos;plagan bali:</span>
                        <span className="font-mono font-black text-sm">{scaledScoreStr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Umumiy ballga nisbatan foiz ko&apos;rsatkichi:</span>
                        <span className="font-mono font-bold">{pctVal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-[#1c3c87]">Sertifikat darajasi:</span>
                        <span className="font-black text-amber-700 text-sm">{certGrade}</span>
                      </div>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-[#e5c158]">
                      <span className="font-bold text-[#1c3c87]">Test sinovi natijasi:</span>
                      <span className="font-mono font-black">{scaledScoreComma}</span>
                    </div>
                  </div>

                  {/* Bottom: Direktor, QR, Imzo */}
                  <div className="w-full flex items-center justify-between gap-2 mt-4 pt-2">
                    <div className="flex-1 text-center font-serif text-[11px] font-bold">
                      Direktor<br /><span className="text-[10px] font-sans text-muted-foreground">_________</span>
                    </div>

                    <div className="shrink-0 p-1 border border-[#c59b27] bg-white rounded flex flex-col items-center shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImgUrl} alt="QR Kod" className="size-14 sm:size-16 object-contain" />
                      <span className="text-[7px] font-bold text-[#1e3a8a] mt-0.5">QR VERIFIED</span>
                    </div>

                    <div className="flex-1 text-center font-serif text-[11px] font-bold">
                      Mag&apos;rurbek Zaripov<br /><span className="text-[10px] font-sans text-muted-foreground">_________</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-amber-700 font-bold group-hover:underline flex items-center gap-1">
                    Bosing: Sertifikatni to&apos;liq ochish va yuklab olish &rarr;
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 1v1 DUELGA CHORLASH & VIRAL REFERRAL HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-orange-500/15 p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-xs font-black uppercase text-rose-500 dark:text-rose-300">
                <Swords className="size-3.5" /> 1v1 Battle Arena · Yangi Duel
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                Do&apos;stingiz bu testda sizdan ko&apos;p ball to&apos;play oladimi? ⚔️
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Siz ushbu sinovdan <strong className="text-foreground">{Math.round(a.score || 0)}%</strong> to&apos;pladingiz!
                Do&apos;stingizga xuddi shu savollar bo&apos;yicha duel taklifini yuboring. Har bir taklif qilingan do&apos;st uchun 
                <strong className="text-amber-500"> +15 Tanga</strong> va Katta Mock imtihoniga bepul chipta beriladi!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                onClick={handleChallengeFriend}
                size="lg"
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black shadow-lg shadow-rose-500/20 gap-2 active:scale-95 transition-all"
              >
                <Send className="size-5" /> Do&apos;stni Telegram orqali Duelga chorlash
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-5 rounded-2xl border-white/20 bg-background/50 hover:bg-background/80 font-bold"
              >
                <Link href="/battles">
                  <Gamepad2 className="size-4 mr-2" /> Arenaga o&apos;tish
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Kundalik Sirli Sandiq (Variable Reward) Chaqiruvi */}
        {data.daily_chest?.can_claim && (
          <div
            onClick={() => setChestModalOpen(true)}
            className="group relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/15 p-5 shadow-[0_4px_25px_rgba(245,158,11,0.15)] cursor-pointer select-none transition-all hover:scale-[1.01]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/25 flex items-center justify-center shrink-0">
                  <div className="size-full rounded-[14px] bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-400 flex items-center justify-center shadow-inner">
                    <Gift className="size-7 text-amber-950 animate-bounce" />
                  </div>
                </div>
                <div>
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-black uppercase mb-1">
                    KUNDALIK SOVRIN KUTMOQDA! 🎁
                  </Badge>
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    Bugungi Sirli Sandiqni Ochdingizmi?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sinovni muvaffaqiyatli yakunladingiz! Endi kutilmagan sirli mukofotingizni oling (500 XP gacha, tangalar, Streak Freeze).
                  </p>
                </div>
              </div>
              <Button className="h-11 px-6 font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shrink-0">
                <Sparkles className="size-4 mr-2" /> Sandiqni Ochish
              </Button>
            </div>
          </div>
        )}

        {/* Imtihon taassuroti / Tezkor so'rovnoma */}
        <ExamSurveyCard attemptId={attemptId} testTitle={data?.attempt?.test_title} />

        {data.overall_analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--accent-text)]">
                <Sparkles className="size-4 text-[var(--accent)]" /> Sun&apos;iy Intellekt Tahlili &amp; Tavsiyasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="reading-block text-sm leading-relaxed">{data.overall_analysis}</p>
              {data.ai_motivation && (
                <p className="rounded-2xl border-l-4 border-l-[var(--accent)] bg-[var(--surface-hover)] p-3 text-xs italic text-[var(--text-secondary)]">
                  {data.ai_motivation}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border-[var(--success)]/20 bg-[var(--success)]/5">
            <CardContent className="space-y-2 pt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--success-text)]">
                <ThumbsUp className="size-4" /> Kuchli mavzular
              </h3>
              <div className="space-y-1.5">
                {data.strong_topics?.length ? data.strong_topics.map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-[var(--success)]" />{t}
                  </div>
                )) : <span className="text-xs text-[var(--text-faint)]">Kiritilmagan</span>}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--danger)]/20 bg-[var(--danger)]/5">
            <CardContent className="space-y-2 pt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--danger-text)]">
                <AlertTriangle className="size-4" /> Kuchsiz mavzular
              </h3>
              <div className="space-y-1.5">
                {data.weak_topics?.length ? data.weak_topics.map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-[var(--danger)]" />{t}
                  </div>
                )) : <span className="text-xs text-[var(--text-faint)]">Yo&apos;q</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BILIM REELS & DARSLAR: Xatolar ustida ishlash bo'limi */}
        {(Boolean(data.weak_topics?.length) || (a.wrong_answers || 0) > 0) && (
          <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-0.5 text-xs font-bold text-sky-400">
                  <Film className="size-3.5" /> 1 daqiqada tushunish · Bilim Reels &amp; Darslar
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground">
                  Qiyin mavzularni oson o&apos;rganing va ballingizni tiklang!
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Testda qiynalgan mavzularingiz bo&apos;yicha maxsus 60 soniyalik qisqa videolarni ko&apos;ring yoki
                  xatolar ustida qayta test ishlab o&apos;z darajangizni oshiring.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-md">
                  <Link href="/reels">
                    <Film className="size-4 mr-1.5" /> Bilim Reels (Videolar)
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold rounded-xl">
                  <Link href="/learning">
                    <BookOpen className="size-4 mr-1.5" /> Darslar &amp; Konspekt
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startMistakesTest}
                  className="border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 font-bold rounded-xl"
                >
                  <RotateCcw className="size-4 mr-1.5" /> Xatolardan qayta test
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MICRO-PAYWALL: AI Tahlil va Chuqur Yechimlar Teaseri */}
        {!user?.is_premium && (a.wrong_answers || 0) > 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/10 p-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Lock className="size-3.5" /> Shaxsiy AI Tahlil va Har Bir Savol Yechimi
                </div>
                <h4 className="text-sm sm:text-base font-black text-foreground">
                  Xatolar formulasini chuqur tushunmoqchimisiz?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Bor-yo&apos;g&apos;i <b>3,000 so&apos;m</b> evaziga (yoki VIP obuna bilan) har bir savolning batafsil yechimi, qoidalari va AI shaxsiy mentor tavsiyalarini oching!
                </p>
              </div>
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow shrink-0">
                <Link href="/shop">
                  <Sparkles className="size-4 mr-1.5" /> Tahlilni Ochish (3,000 so&apos;m)
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* 36-45-TOPSHIRIQLAR: AI BMB EKSPERT & ESSE TEKSHIRUVI (FREEMIUM / VIP PAYWALL) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-3 py-0.5 text-xs font-bold text-purple-400">
                <Sparkles className="size-3.5" /> 36–45-topshiriqlar · BMB Rasmiy Mezon
              </div>
              <h3 className="text-lg font-black text-foreground">
                AI BMB Ekspert & Esse Baholash
              </h3>
              <p className="text-xs text-muted-foreground">
                Ochiq savollar va Esse matningizni rasmiy 75 ballik BMB rubrikasi va AI ekspert orqali tahlil qiling.
              </p>
            </div>
          </div>
          <AiEssayPaywall initialQuestionType="essay" />
        </div>

        {!!data.detailed_mistakes?.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircle className="size-4 text-[var(--danger)]" /> Aynan qayerda xato qildingiz?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.detailed_mistakes.map((m, i) => (
                <div key={i} className="space-y-3 rounded-2xl border bg-[var(--surface-input)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/15 text-[var(--accent-text)]">{m.mavzu}</Badge>
                    <span className="text-xs font-bold text-rose-400">Xato javob</span>
                  </div>
                  <p className="text-xs font-bold sm:text-sm">{m.savol_mazmuni}</p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs">
                      <span className="mb-1 block text-xs font-bold uppercase text-rose-400">Sizning javobingiz:</span>
                      <p className="font-semibold text-rose-200">{m.bola_javobi}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-2.5 text-xs">
                      <span className="mb-1 block text-xs font-bold uppercase text-[var(--success-text)]">To&apos;g&apos;ri javob:</span>
                      <p className="font-semibold text-[var(--success-text)]">{m.togri_javob}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-card)]">
                    <p className="text-xs leading-relaxed text-muted-foreground flex-1">
                      {m.nega_muhim ? <><strong>Izoh:</strong> {m.nega_muhim}</> : null}
                    </p>
                    <VoiceExplanationButton
                      text={m.nega_muhim || `Mavzu: ${m.mavzu}. Savol: ${m.savol_mazmuni}. To'g'ri javob: ${m.togri_javob}.`}
                      size="sm"
                      label="🎙️ Ovozli tushuntirish"
                      variant="outline"
                      className="shrink-0 h-7 text-[11px]"
                    />
                  </div>
                  {m.eslab_qolish && (
                    <p className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs italic text-amber-300">
                      <Lightbulb className="size-4 shrink-0 text-amber-400" /> {m.eslab_qolish}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.recommendations && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Tavsiya etilgan amallar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.recommendations.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--accent-text)]" />
                  <span>{line}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!!data.roadmap?.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Compass className="size-4 text-[var(--accent-text)]" /> Bosqichma-bosqich yo&apos;l xaritasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.roadmap.map((s) => (
                <div key={s.step} className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-hover)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-[var(--accent-text)]">{s.step}</span>
                    <span className="text-xs font-semibold">{s.title}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{s.duration}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!!data.review_items?.length && (
          <section className="space-y-2">
            <h2 className="section-title">Savollar tahlili</h2>
            {data.review_items.map((r, index) => {
              // Part sarlavhasi faqat yangi partga o'tilganda chiziladi — CEFR natijasi
              // "Part 1 / Part 2 ..." bo'lib ajralib turadi, aralash ro'yxat bo'lmaydi.
              const previous = data.review_items?.[index - 1]?.section ?? null;
              const startsPart = Boolean(r.section) && (
                previous?.skill !== r.section?.skill || previous?.part_number !== r.section?.part_number
              );
              return (
              <div key={r.question_id}>
                {startsPart && r.section && (
                  <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    {r.section.skill_label} — Part {r.section.part_number}
                    {r.section.title ? ` · ${r.section.title}` : ''}
                  </h3>
                )}
              <Card
                className={cn(
                  'gap-0 py-0',
                  r.is_correct ? 'border-[var(--success)]/25 bg-[var(--success)]/10'
                    : r.is_skipped ? '' : 'border-[var(--danger)]/25 bg-[var(--danger)]/10',
                )}
              >
                <CardContent className="p-3 text-sm">
                  <div className="flex items-start gap-2">
                    {r.exam_number !== null && (
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-black/20 text-[11px] font-bold tabular-nums">
                        {r.exam_number}
                      </span>
                    )}
                    <div className="min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: r.body }} />
                  </div>
                  {r.your_answer && (
                    <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">
                      Sizning javobingiz: {r.your_answer}
                    </p>
                  )}
                  {!r.is_correct && r.correct_answer && (
                    <p className="mt-1 text-xs text-muted-foreground">To&apos;g&apos;ri javob: {r.correct_answer}</p>
                  )}
                  {r.grading_note && <p className="mt-1 text-xs italic text-[var(--text-secondary)]">{r.grading_note}</p>}
                  {/* Savol tushuntirishi va Ovozli tahlil — har bir savolda ko'rinadi */}
                  <div className="mt-3 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3">
                    {r.explanation ? (
                      <p className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] mb-2.5 leading-relaxed">
                        <Lightbulb className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
                        <span>{r.explanation}</span>
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-card)]">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {r.is_correct ? "✅ To'g'ri javob" : "❌ Xato javob tahlili:"}
                      </span>
                      <VoiceExplanationButton
                        text={
                          r.explanation
                            ? r.explanation
                            : `Savol: ${r.body.replace(/<[^>]*>?/gm, ' ')}. To'g'ri javob: ${r.correct_answer}. Siz tanlagan javob: ${r.your_answer || "belgilanmagan"}.`
                        }
                        label="🎙️ Ovozli tushuntirish"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Writing topshirig'i to'g'ri/xato emas — mezonlar bo'yicha baholanadi.
                      Baholatilmagan bo'lsa, premium tekshiruv taklif qilinadi. */}
                  {r.writing?.reviewed && (
                    <div className="mt-3">
                      <WritingReviewCard review={r.writing} />
                    </div>
                  )}
                  {r.writing && !r.writing.reviewed && r.your_answer && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Bu matn hali baholanmagan — AI tekshiruvi (ball va CEFR darajasi) premium orqali ochiladi.
                    </p>
                  )}
                </CardContent>
              </Card>
              </div>
              );
            })}
          </section>
        )}
        {a && (
          <>
            <CertificateModal
              open={certOpen}
              onOpenChange={setCertOpen}
              studentName={`${user?.first_name || user?.username || ''} ${user?.last_name || ''}`.trim()}
              testTitle={data?.attempt?.test_title || "Rasmiy Formatdagi Sinov Testi"}
              score={data?.rasch?.scaled_score ?? data?.attempt?.rasch?.scaled_score ?? a.score ?? 0}
              correctCount={a.correct_answers || 0}
              totalQuestions={(a.correct_answers || 0) + (a.wrong_answers || 0) + (a.skipped_answers || 0)}
              date={data?.attempt?.completed_at}
              attemptId={attemptId}
              percentage={data?.rasch?.percentage}
              grade={data?.rasch?.grade}
            />
            <ShareToCommunityModal
              open={communityModalOpen}
              onOpenChange={setCommunityModalOpen}
              attemptId={attemptId}
              testTitle={data?.attempt?.test_title || "Rasmiy Formatdagi Sinov Testi"}
              score={a.score || 0}
              correctCount={a.correct_answers || 0}
              totalQuestions={(a.correct_answers || 0) + (a.wrong_answers || 0) + (a.skipped_answers || 0)}
              postType={a.score >= 60 ? 'certificate' : 'test_result'}
            />
            <DailyChestModal
              isOpen={chestModalOpen}
              onClose={() => setChestModalOpen(false)}
              onClaimSuccess={() => {
                setData((prev) => prev ? {
                  ...prev,
                  daily_chest: { can_claim: false, streak: prev.daily_chest?.streak || 0 }
                } : null);
              }}
            />
          </>
        )}
      </main>
    </>
  );
}
