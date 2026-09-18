'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Crown, Sparkles, XCircle, RotateCcw, Compass, Lightbulb, ThumbsUp,
  AlertTriangle, ChevronLeft, ChevronRight, Share2, Award,
  CheckCircle2, HelpCircle, Trophy,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { canShareToStory, shareToStory, tgHaptic, useIsTelegram } from '@/lib/telegram';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import CertificateModal from '@/components/student/CertificateModal';
import ShareToCommunityModal from '@/components/student/ShareToCommunityModal';
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

type Mistake = {
  mavzu: string; savol_mazmuni: string; bola_javobi: string; togri_javob: string;
  nega_muhim?: string; eslab_qolish?: string;
};
type RoadmapStep = { step: number; title: string; duration: string };

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
  };
  overall_analysis?: string;
  weak_topics?: string[];
  strong_topics?: string[];
  ai_motivation?: string;
  recommendations?: string;
  predicted_score?: string;
  roadmap?: RoadmapStep[];
  detailed_mistakes?: Mistake[];
  review_items?: ReviewItem[];
};

/* Natijani Telegram Story'ga qo'yish.

   Nega alohida rasm: Story faqat RASM yoki videoni qabul qiladi, sahifa skrinshotini
   emas. Server 1080x1920 karta chizib beradi va uni imzolangan ochiq manzilda ochadi —
   rasmni foydalanuvchining telefoni emas, Telegram serverlari yuklab oladi. */
function StoryShareButton({ attemptId }: { attemptId: string }) {
  const inTelegram = useIsTelegram();
  const [busy, setBusy] = useState(false);

  // Tugma faqat Story'ni qo'llab-quvvatlaydigan Telegram mijozida ko'rinadi
  // (Bot API 7.8+); saytda yoki eski ilovada umuman chizilmaydi.
  if (!inTelegram || !canShareToStory()) return null;

  async function share() {
    setBusy(true);
    try {
      const res = await apiFetch<{ media_url: string; text: string }>(
        `/api/tests/attempts/${attemptId}/story-link/`,
      );
      const ok = shareToStory(res.media_url, {
        text: res.text,
        widget_link: { url: 'https://t.me/ilmildiziuz_bot', name: 'IlmIldizi' },
      });
      if (ok) tgHaptic('success');
      else toast.error('Telegramning bu versiyasi Story ulashishni qo`llamaydi.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={share} disabled={busy}>
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
                      <span>Prognoz Sertifikat: <b>{data.predicted_score} Daraja</b></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
                  {m.nega_muhim && <p className="pt-1 text-xs leading-relaxed text-muted-foreground"><strong>Izoh:</strong> {m.nega_muhim}</p>}
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
                  {r.explanation && (
                    <>
                      <Separator className="my-2" />
                      <p className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                        <Lightbulb className="size-3.5 shrink-0 text-amber-400" /> {r.explanation}
                      </p>
                    </>
                  )}

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
              score={a.score || 0}
              correctCount={a.correct_answers || 0}
              totalQuestions={(a.correct_answers || 0) + (a.wrong_answers || 0) + (a.skipped_answers || 0)}
              date={data?.attempt?.completed_at}
              attemptId={attemptId}
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
          </>
        )}
      </main>
    </>
  );
}
