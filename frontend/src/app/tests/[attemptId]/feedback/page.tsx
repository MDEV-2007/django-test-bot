'use client';

import AiEssayPaywall from '@/components/exam/AiEssayPaywall';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Crown, Flame, Sparkles, XCircle, RotateCcw, Compass, Lightbulb, ThumbsUp,
  AlertTriangle, ChevronLeft, ChevronRight, Share2, Award,
  CheckCircle2, HelpCircle, Trophy, Gift, Swords, Film, BookOpen, Send, Gamepad2, Lock,
  TrendingUp, ArrowRight, Check, X, Minus,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { canShareToStory, shareToStory, tgHaptic, useIsTelegram } from '@/lib/telegram';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import CertificateModal from '@/components/student/CertificateModal';
import ShareToCommunityModal from '@/components/student/ShareToCommunityModal';
import CertificateCard from '@/components/student/CertificateCard';
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
import { soundFX } from '@/lib/soundFX';

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
    is_stress_mode?: boolean;
    stress_stats?: {
      is_stress_mode?: boolean;
      draft_score?: number;
      titul_score?: number;
      draft_correct?: number;
      titul_correct?: number;
      unfilled_on_titul?: number;
      misaligned_on_titul?: number;
      lost_points?: number;
      dtm_simulated_ball?: number;
      stress_level?: string;
    };
    titul_answers?: Record<string, string>;
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
    tgHaptic('medium');
    try {
      const res = await apiFetch<{ media_url: string; text: string }>(
        `/api/tests/attempts/${attemptId}/story-link/`,
      );

      // Mutlaq HTTPS manzilga aylantirish
      let fullMediaUrl = res.media_url;
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ilmildizi.uz';
      if (!fullMediaUrl.startsWith('http')) {
        fullMediaUrl = `${currentOrigin}${fullMediaUrl.startsWith('/') ? '' : '/'}${fullMediaUrl}`;
      } else if (fullMediaUrl.includes('localhost') && !currentOrigin.includes('localhost')) {
        fullMediaUrl = fullMediaUrl.replace(/https?:\/\/localhost(:\d+)?/, currentOrigin);
      }

      const wa = (window as any).Telegram?.WebApp;

      // 1. Telegram Story API orqali ulashish
      if (inTelegram && canShareToStory()) {
        try {
          const ok = shareToStory(fullMediaUrl, {
            text: res.text || "IlmIldizi'da yangi test natijam! 🎯",
            widget_link: {
              url: `https://t.me/ilmildiziuz_bot?startapp=attempt_${attemptId}`,
              name: 'Testni sinash',
            },
          });
          if (ok) {
            tgHaptic('success');
            toast.success("Telegram Story ochildi! O'z hikoyangizga joylang.");
            return;
          }
        } catch (storyErr) {
          console.warn('Telegram shareToStory failed, fallback to openLink:', storyErr);
        }
      }

      // 2. Agar Telegram Story ochilmasa yoki Telegram desktop/web bo'lsa:
      if (wa?.openLink) {
        wa.openLink(fullMediaUrl);
        toast.success('Story kartasi ochildi!');
      } else {
        window.open(fullMediaUrl, '_blank');
        toast.success("Story kartasi ochildi! Uni saqlab olib, Story'ga qo'yishingiz mumkin.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik yuz berdi');
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
      className="border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-bold gap-1.5 shadow-xs cursor-pointer"
    >
      <Share2 className="size-4" /> {busy ? 'Tayyorlanmoqda...' : "Story'ga qo'yish"}
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

function MistakeSosButton({ mistake }: { mistake: Mistake }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSendSos() {
    if (sent || loading) return;
    setLoading(true);
    try {
      await apiFetch('/api/learning/feed/create-auto/', {
        method: 'POST',
        body: JSON.stringify({
          post_type: 'sos_question',
          subject_name: mistake.mavzu,
          subject_slug: 'umumiy',
          question_text: mistake.savol_mazmuni,
          options: [mistake.bola_javobi, mistake.togri_javob, 'Boshqa variant'].filter(Boolean),
          correct_option: mistake.togri_javob,
          explanation: mistake.nega_muhim || mistake.eslab_qolish || '',
        }),
      });
      soundFX.fanfare();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stories_updated'));
      }
      setSent(true);
      toast.success("🙋‍♂️ Savol Hamjamiyat lentasi va Story'ga SOS so'rovnoma bo'lib joylandi! +10 XP");
    } catch (e: any) {
      toast.error(e.message || "Lentaga yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={sent || loading}
      onClick={handleSendSos}
      className={cn(
        "h-7 text-[11px] gap-1 rounded-xl shrink-0 font-bold",
        sent ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10" : "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
      )}
    >
      <HelpCircle className="size-3 text-amber-500" />
      <span>{sent ? "✓ Lentada" : "🙋‍♂️ Hamjamiyatdan so'rash"}</span>
    </Button>
  );
}

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
  const [activeTab, setActiveTab] = useState<'summary' | 'review'>('summary');
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
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell flex-1 p-6">
          <div className="ps-card p-6 text-sm font-semibold">{error}</div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 sm:p-6">
          <Skeleton className="h-64 w-full rounded-[32px] bg-white/40" />
          <Skeleton className="h-56 w-full rounded-[28px] bg-white/40" />
        </main>
      </div>
    );
  }

  if (data.status === 'pending') {
    return (
      <div className="theme-pastel min-h-screen w-full">
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
      </div>
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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-8 p-4 pb-12 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/tests" className="ps-chip transition-transform hover:-translate-x-0.5">
            <ChevronLeft className="size-4" /> Testlar ro&apos;yxati
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setCertOpen(true)} className="ps-chip cursor-pointer !bg-[var(--ps-orange)] !text-[#080808]">
              <Award className="size-4" /> Natija kartasi
            </button>
            <StoryShareButton attemptId={attemptId} />
            <button type="button" onClick={handleChallengeFriend} className="ps-chip cursor-pointer !bg-[var(--ps-coral)] !text-white">
              <Swords className="size-4" /> Do&apos;stni duelga chaqirish
            </button>
            <button type="button" onClick={() => setCommunityModalOpen(true)} className="ps-chip cursor-pointer !bg-[var(--ps-purple)] !text-white">
              <Sparkles className="size-4" /> Hamjamiyatga ulashish (+15 XP)
            </button>
            {a.score < 100 && (
              <button type="button" onClick={startMistakesTest} className="ps-chip cursor-pointer !bg-[#080808] !text-[#FFFCF7]">
                <RotateCcw className="size-4" /> Xatolar ustida ishlash
              </button>
            )}
          </div>
        </div>

        {mistakesError && (
          <div className="ps-card flex items-start gap-3 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
              <AlertTriangle className="size-4" />
            </span>
            <p className="pt-1.5 text-sm font-semibold">{mistakesError}</p>
          </div>
        )}

        {/* 2 ta bo'lim: Xulosa · Savollar tahlili */}
        <div role="tablist" className="ds-seg mx-auto flex w-full max-w-lg items-center">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            data-active={activeTab === 'summary' ? 'true' : undefined}
            onClick={() => {
              setActiveTab('summary');
              tgHaptic('light');
            }}
            className="ds-seg-item flex flex-1 cursor-pointer items-center justify-center gap-2 font-bold"
          >
            <Trophy className="size-4" />
            Xulosa va keyingi qadam
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'review'}
            data-active={activeTab === 'review' ? 'true' : undefined}
            onClick={() => {
              setActiveTab('review');
              tgHaptic('light');
            }}
            className="ds-seg-item flex flex-1 cursor-pointer items-center justify-center gap-2 font-bold"
          >
            <CheckCircle2 className="size-4" />
            Savollar tahlili ({data.review_items?.length || 0})
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-8">

        {/* REAL BMB STRESS SIMULYATORI NATIJA KARTASI */}
        {a.is_stress_mode && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/50 bg-gradient-to-br from-rose-950/90 via-slate-900 to-amber-950/80 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 size-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-rose-600/30 border border-rose-500/40">
                    <Flame className="size-5 text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-wider uppercase text-rose-300">
                        REAL BMB IMTIHON ZALI
                      </span>
                      <Badge className="bg-rose-600 text-white text-[10px] uppercase font-mono font-bold">
                        STRESS MODE
                      </Badge>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Imtihon Bosimi & Titul Varaqasi Tahlili
                    </h3>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    const score = Math.round(a.score || 0);
                    const lost = a.stress_stats?.lost_points || 0;
                    const dtm = a.stress_stats?.dtm_simulated_ball || (score * 1.89).toFixed(1);
                    const text = `🔥 Men IlmIldizi "Real BMB Imtihon Zali (Stress Mode)"da test yechdim!\n\n🎧 500 kishilik zal shovqini, parta shitirlashi va nazoratchining sovuq ovozi ostida:\n📊 Titul balli: ${score}% (~${dtm} DTM ball)\n${lost > 0 ? `⚠️ Titulga ko'chirishda yo'qotilgan ball: -${lost}%` : "🎯 Birorta ham Titul xatosi qilmadingiz!"}\n\nSen ham o'zingni haqiqiy DTM stressida sinab ko'r! 👇`;
                    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent('https://ilmildizi.uz/tests')}&text=${encodeURIComponent(text)}`;
                    window.open(tgUrl, '_blank');
                  }}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  <Share2 className="size-3.5 mr-1.5" />
                  Do&apos;stlarga ulashish
                </Button>
              </div>

              {/* 4 Ta Asosiy Taqqoslash Ko'rsatkichi */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">BMB Kutilayotgan Ball</p>
                  <p className="text-2xl font-black text-amber-400 font-mono">
                    ~{a.stress_stats?.dtm_simulated_ball || (a.score * 1.89).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-400">189 ballik shkalada</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Qoralamadagi Natija</p>
                  <p className="text-2xl font-black text-slate-200 font-mono">
                    {a.stress_stats?.draft_score !== undefined ? `${a.stress_stats.draft_score}%` : `${a.score}%`}
                  </p>
                  <p className="text-[10px] text-slate-400">Divanda choy ichib olingan ball</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Titul (Rasmiy) Balli</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono">
                    {a.score}%
                  </p>
                  <p className="text-[10px] text-slate-400">Javoblar varaqasi bo&apos;yicha</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Titulda Yo&apos;qotilgan Ball</p>
                  <p className={cn(
                    "text-2xl font-black font-mono",
                    (a.stress_stats?.lost_points || 0) > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {(a.stress_stats?.lost_points || 0) > 0 ? `-${a.stress_stats?.lost_points}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-slate-400">Ko&apos;chirish xatolari tufayli</p>
                </div>
              </div>

              {/* Stress Diagnostikasi Xulosasi */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 text-xs sm:text-sm text-slate-200 space-y-2">
                {(a.stress_stats?.unfilled_on_titul || 0) > 0 || (a.stress_stats?.misaligned_on_titul || 0) > 0 ? (
                  <div className="flex items-start gap-2.5 text-rose-300">
                    <AlertTriangle className="size-5 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <p className="font-bold text-white">Titul Varaqasi Tuzog&apos;i Natijasi:</p>
                      <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                        Siz qoralamada to&apos;g&apos;ri yechgan savollaringizdan{' '}
                        <strong>{a.stress_stats?.unfilled_on_titul || 0} tasini</strong> Titulga ko&apos;chirishga ulgurmadingiz va{' '}
                        <strong>{a.stress_stats?.misaligned_on_titul || 0} tasini</strong> ko&apos;chirishda qatoridan adashib boshqa katakka bo&apos;yab qo&apos;ydingiz.
                        Aynan mana shu narsa haqiqiy BMB imtihonida eng ko&apos;p abituriyentlarni yig&apos;latadi!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-emerald-300">
                    <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="font-bold text-white">Sovuqqon DTM Jangchisi! 🎯</p>
                      <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                        Qoyilmaqom! 500 kishilik zal shovqini va nazoratchi ovozi ostida ham birorta Titul xatosi qilmadingiz. Siz haqiqiy imtihon kuni ham stressga berilmaysiz!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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

          const verdict =
            scoreVal >= 80 ? { text: "A'lo natija!", tone: 'bg-[var(--ps-green)] text-white' } :
            scoreVal >= 60 ? { text: 'Yaxshi natija!', tone: 'bg-[var(--ps-blue)] text-[#080808]' } :
            scoreVal >= 40 ? { text: "O'rtacha natija", tone: 'bg-[var(--ps-orange)] text-[#080808]' } :
            { text: "Ko'proq mashq zarur", tone: 'bg-[var(--ps-coral)] text-white' };

          return (
            <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-9">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--ps-purple)] opacity-15" />
              <div aria-hidden className="ps-dots pointer-events-none absolute bottom-8 right-8 hidden size-20 text-[var(--ps-purple)] opacity-25 sm:block" />

              <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
                {/* Ball kompozitsiyasi */}
                <div className="relative mx-auto size-56 sm:size-64">
                  <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--ps-orange)]" />
                  <div aria-hidden className="absolute -bottom-2 -left-4 size-20 rounded-tr-full bg-[var(--ps-purple)]" />
                  <div className="absolute inset-[9%] flex items-center justify-center rounded-full border-[6px] border-[#FFFCF7] bg-[#080808] text-[#FFFCF7]">
                    <svg className="absolute inset-2 -rotate-90" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="7" fill="transparent" />
                      <circle
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke="var(--ps-orange)"
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="relative flex flex-col items-center">
                      <span className="ps-num text-[56px] sm:text-[64px]">
                        {scoreVal.toFixed(0)}
                        <span className="text-[0.45em] text-[var(--ps-orange)]">%</span>
                      </span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">Umumiy ball</span>
                    </div>
                  </div>
                </div>

                {/* Matn va ko'rsatkichlar */}
                <div className="min-w-0 text-center lg:text-left">
                  {data?.attempt?.test_title && (
                    <p className="ps-eyebrow text-[var(--text-muted)]">{data.attempt.test_title}</p>
                  )}
                  <h1 className="ps-display mt-3 text-[40px] sm:text-[56px]">
                    Natijangiz<span className="text-[var(--ps-coral)]">.</span>
                  </h1>
                  <span className={cn('mt-3 inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold', verdict.tone)}>
                    {verdict.text}
                  </span>

                  {/* Taqsimot chizig'i */}
                  <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-[var(--ds-track)]">
                    {correctPct > 0 && <div style={{ width: `${correctPct}%` }} className="bg-[var(--ps-green)] transition-all duration-700" title={`To'g'ri: ${a.correct_answers}`} />}
                    {wrongPct > 0 && <div style={{ width: `${wrongPct}%` }} className="bg-[var(--ps-coral)] transition-all duration-700" title={`Xato: ${a.wrong_answers}`} />}
                    {skippedPct > 0 && <div style={{ width: `${skippedPct}%` }} className="bg-[var(--text-faint)] opacity-40 transition-all duration-700" title={`Javobsiz: ${a.skipped_answers}`} />}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="rounded-[22px] bg-[var(--ps-green)] p-3.5 text-left text-white sm:p-4">
                      <CheckCircle2 className="size-4" />
                      <p className="ps-num mt-2 text-[30px] sm:text-[36px]">{a.correct_answers}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/75">To&apos;g&apos;ri</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ps-coral)] p-3.5 text-left text-white sm:p-4">
                      <XCircle className="size-4" />
                      <p className="ps-num mt-2 text-[30px] sm:text-[36px]">{a.wrong_answers}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/75">Xato</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ps-neutral)] p-3.5 text-left sm:p-4">
                      <HelpCircle className="size-4 text-[var(--text-muted)]" />
                      <p className="ps-num mt-2 text-[30px] sm:text-[36px]">{a.skipped_answers}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">Javobsiz</p>
                    </div>
                  </div>

                  {/* Sertifikat va prognoz belgilari */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    {isCefrTest && (() => {
                      const score = a.score || 0;
                      const text =
                        score >= 86 ? "🏆 C1 daraja (Ilg'or)" :
                        score >= 67 ? '🥇 B2 daraja (Mustaqil)' :
                        score >= 47 ? '🥈 B1 daraja' :
                        score >= 27 ? "🥉 A2 daraja (Boshlang'ich)" : "❌ Sinovdan o'tmadi";
                      return <span className="ps-chip">{text}</span>;
                    })()}
                    {!isCefrTest && totalQ === 45 && (() => {
                      const c = a.correct_answers;
                      const text =
                        c >= 34 ? '🏆 A+ daraja (Oltin sertifikat)' :
                        c >= 28 ? "🥇 A daraja (A'lo sertifikat)" :
                        c >= 24 ? '🥈 B+ daraja (Juda yaxshi)' :
                        c >= 21 ? '🥉 B daraja (Yaxshi)' :
                        c >= 18 ? '📜 C+ daraja (Qoniqarli)' : "❌ Sinovdan o'tmadi";
                      return <span className="ps-chip">{text}</span>;
                    })()}
                    {data.predicted_score && (
                      <span className="ps-chip !bg-[#080808] !text-[#FFFCF7]">
                        <Crown className="size-3.5 text-[var(--ps-orange)]" />
                        Prognoz: <b>{((a.correct_answers || 0) === 0 || (a.score || 0) === 0) ? '— (0.0 ball)' : data.predicted_score}</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Keyingi qadam */}
              <div className="relative mt-8 flex flex-col items-start justify-between gap-4 rounded-[26px] bg-[#080808] p-5 text-[#FFFCF7] sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0">
                  <p className="ps-eyebrow text-[var(--ps-orange)]">Keyingi qadam</p>
                  <p className="ps-display mt-2 text-[22px] sm:text-[26px]">
                    {(a.wrong_answers || 0) > 0
                      ? `${a.wrong_answers} ta xatoni hoziroq tuzating`
                      : 'Arenada kuch sinashing'}
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/65">
                    {(a.wrong_answers || 0) > 0
                      ? 'Xatolarni tozalab, +40 XP oling va marafon zanjirini davom ettiring.'
                      : "Ketma-ket g'alaba seriyasi uchun +50 tanga va 2x bonus."}
                  </p>
                </div>
                {(a.wrong_answers || 0) > 0 ? (
                  <button type="button" onClick={startMistakesTest} className="ps-btn ps-btn-light w-full shrink-0 justify-between sm:w-auto">
                    <span className="inline-flex items-center gap-2"><RotateCcw className="size-4" /> Xatolar ustida ishlash</span>
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                ) : (
                  <Link href="/battles" className="ps-btn ps-btn-light w-full shrink-0 justify-between sm:w-auto">
                    <span className="inline-flex items-center gap-2"><Swords className="size-4" /> 1v1 Arenaga kirish</span>
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </Link>
                )}
              </div>
            </section>
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
                  <Award className="size-4" /> Natija kartasini ochish
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
            <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-orange)] opacity-20" />
              {/* Sarlavha */}
              <div className="relative mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <span className="ps-chip"><Award className="size-3.5 text-[var(--ps-orange)]" /> Natija kartasi</span>
                  <h3 className="ps-display mt-4 text-[28px] sm:text-[36px]">
                    Kartangiz <span className="text-[var(--ps-orange)]">tayyor</span>
                    <span className="text-[var(--ps-coral)]">.</span>
                  </h3>
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Natijangizni rasm yoki PDF qilib saqlang va ulashing. Bu IlmIldizi mashq testi natijasi — rasmiy BMB sertifikati emas.
                  </p>
                </div>
                <button type="button" onClick={() => setCertOpen(true)} className="ps-btn ps-btn-ink shrink-0">
                  <Award className="size-4 text-[var(--ps-orange)]" />
                  Ochish va yuklab olish
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </button>
              </div>

              {/* Karta */}
              <CertificateCard
                onClick={() => setCertOpen(true)}
                className="group mx-auto max-w-[620px]"
                attemptId={cleanAttemptId}
                studentName={fullName}
                testTitle={data?.attempt?.test_title || 'Tarix Milliy Sertifikat'}
                score={scaledScore}
                correctCount={a.correct_answers || 0}
                totalQuestions={(a.correct_answers || 0) + (a.wrong_answers || 0) + (a.skipped_answers || 0)}
                percentage={isZeroCorrect ? 0 : rasch?.percentage}
                grade={certGrade}
                date={data?.attempt?.completed_at}
                qrImgUrl={qrImgUrl}
                footerHint={
                  <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#080808] group-hover:underline">
                    Bosing: to&apos;liq ochish va yuklab olish <ArrowRight className="size-3.5" />
                  </p>
                }
              />
            </section>
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
        {/* Imtihon taassuroti / Tezkor so'rovnoma - FAQAT 3-urinishda */}
        {(user as any)?.attempts_count === 3 && (
          <ExamSurveyCard attemptId={attemptId} testTitle={data?.attempt?.test_title} />
        )}

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

        {/* "3,000 so'mga tahlilni ochish" bloki olib tashlandi: tugma tangalar do'koniga
            olib borardi (bunday mahsulot yo'q), savollar yechimi esa pastda bepul ko'rinadi. */}

        {/* 36-45-TOPSHIRIQLAR: AI BMB EKSPERT & ESSE TEKSHIRUVI (FREEMIUM / VIP PAYWALL) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-3 py-0.5 text-xs font-bold text-purple-400">
                <Sparkles className="size-3.5" /> 36–45-topshiriqlar · BMB mezoni asosida
              </div>
              <h3 className="text-lg font-black text-foreground">
                AI BMB Ekspert & Esse Baholash
              </h3>
              <p className="text-xs text-muted-foreground">
                Ochiq savollar va esse matningizni 75 ballik mezon bo&apos;yicha AI orqali tekshiring.
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
                  <div className="flex flex-col gap-2 border-t border-[var(--border-card)] pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                      {m.nega_muhim ? <><strong>Izoh:</strong> {m.nega_muhim}</> : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                      <MistakeSosButton mistake={m} />
                      <VoiceExplanationButton
                        text={m.nega_muhim || `Mavzu: ${m.mavzu}. Savol: ${m.savol_mazmuni}. To'g'ri javob: ${m.togri_javob}.`}
                        size="sm"
                        label="🎙️ Ovozli"
                        variant="outline"
                        className="shrink-0 h-7 text-[11px]"
                      />
                    </div>
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

          </div>
        )}

        {activeTab === 'review' && (
          <section className="space-y-4">
            {(!data.review_items || data.review_items.length === 0) ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground">Bu test uchun savollar tahlili topilmadi.</p>
              </Card>
            ) : (
            <>
            {(() => {
              const items = data.review_items || [];
              const correctN = items.filter((x) => x.is_correct).length;
              const skippedN = items.filter((x) => !x.is_correct && x.is_skipped).length;
              const wrongN = items.length - correctN - skippedN;
              return (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="ps-display text-[26px] sm:text-[32px]">Savollar tahlili</h2>
                  <div className="flex flex-wrap gap-1.5 text-[12px] font-bold">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3 py-1.5 text-white"><Check className="size-3.5 stroke-[3]" /> {correctN} to&apos;g&apos;ri</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-3 py-1.5 text-white"><X className="size-3.5 stroke-[3]" /> {wrongN} xato</span>
                    {skippedN > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-neutral)] px-3 py-1.5 text-[var(--text-secondary)]"><Minus className="size-3.5 stroke-[3]" /> {skippedN} belgilanmagan</span>
                    )}
                  </div>
                </div>
              );
            })()}
            {data.review_items.map((r, index) => {
              // Part sarlavhasi faqat yangi partga o'tilganda chiziladi — CEFR natijasi
              // "Part 1 / Part 2 ..." bo'lib ajralib turadi, aralash ro'yxat bo'lmaydi.
              const previous = data.review_items?.[index - 1]?.section ?? null;
              const startsPart = Boolean(r.section) && (
                previous?.skill !== r.section?.skill || previous?.part_number !== r.section?.part_number
              );
              const status = r.is_correct ? 'correct' : r.is_skipped ? 'skipped' : 'wrong';
              const tone = {
                correct: { disc: 'bg-[var(--ps-green)] text-white', chip: 'bg-[var(--ps-green)]/15 text-[var(--ps-green)]', label: "To'g'ri", Icon: Check },
                wrong: { disc: 'bg-[var(--ps-coral)] text-white', chip: 'bg-[var(--ps-coral)]/15 text-[var(--ps-coral)]', label: 'Xato', Icon: X },
                skipped: { disc: 'bg-[var(--ps-neutral)] text-[var(--text-secondary)]', chip: 'bg-[var(--ps-neutral)] text-[var(--text-secondary)]', label: 'Belgilanmagan', Icon: Minus },
              }[status];
              const StatusIcon = tone.Icon;
              return (
              <div key={r.question_id}>
                {startsPart && r.section && (
                  <h3 className="ps-eyebrow mb-2 mt-6 text-[var(--text-muted)]">
                    {r.section.skill_label} — Part {r.section.part_number}
                    {r.section.title ? ` · ${r.section.title}` : ''}
                  </h3>
                )}
                <article className="ps-card relative overflow-hidden !rounded-[28px] p-4 sm:p-6">
                  <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', status === 'correct' ? 'bg-[var(--ps-green)]' : status === 'wrong' ? 'bg-[var(--ps-coral)]' : 'bg-[var(--ds-track)]')} />

                  {/* Sarlavha qatori */}
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[15px] font-bold tabular-nums', tone.disc)}>
                      {r.exam_number ?? index + 1}
                    </span>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold', tone.chip)}>
                      <StatusIcon className="size-3.5 stroke-[3]" />
                      {tone.label}
                    </span>
                  </div>

                  {/* Savol matni */}
                  <div className="ps-review-body mt-3 text-[14.5px] leading-relaxed text-[var(--text-primary)] sm:text-[15px]" dangerouslySetInnerHTML={{ __html: r.body }} />

                  {/* Javoblar */}
                  {(r.your_answer || (!r.is_correct && r.correct_answer)) && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {r.your_answer && (
                        <div className={cn('rounded-[20px] px-4 py-3', r.is_correct ? 'bg-[var(--ps-green)]/12' : 'bg-[var(--ps-coral)]/12')}>
                          <p className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Sizning javobingiz</p>
                          <p className={cn('mt-1 line-clamp-4 text-[14px] font-bold', r.is_correct ? 'text-[var(--ps-green)]' : 'text-[var(--ps-coral)]')}>{r.your_answer}</p>
                        </div>
                      )}
                      {!r.is_correct && r.correct_answer && (
                        <div className="rounded-[20px] bg-[var(--ps-green)]/12 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">To&apos;g&apos;ri javob</p>
                          <p className="mt-1 text-[14px] font-bold text-[var(--ps-green)]">{r.correct_answer}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {r.grading_note && <p className="mt-2 text-[12.5px] italic text-[var(--text-secondary)]">{r.grading_note}</p>}

                  {/* Tushuntirish va ovozli tahlil */}
                  <div className="mt-4 flex flex-col gap-3 rounded-[22px] bg-[var(--ps-neutral)] p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
                    <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                        <Lightbulb className="size-3.5" />
                      </span>
                      <span className="pt-1">
                        {r.explanation || (status === 'correct'
                          ? "Barakalla! Ovozli tushuntirish bilan mavzuni yana mustahkamlang."
                          : "Ovozli tushuntirishni tinglang — savol va to'g'ri javob o'qib beriladi.")}
                      </span>
                    </p>
                    <VoiceExplanationButton
                      text={
                        r.explanation
                          ? r.explanation
                          : `Savol: ${r.body.replace(/<[^>]*>?/gm, ' ')}. To'g'ri javob: ${r.correct_answer}. Siz tanlagan javob: ${r.your_answer || "belgilanmagan"}.`
                      }
                      label="Ovozli tushuntirish"
                      size="sm"
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-0 bg-[var(--ps-purple)] px-4 text-[12.5px] font-bold text-white hover:bg-[var(--ps-purple)]/90 dark:bg-[var(--ps-purple)] dark:hover:bg-[var(--ps-purple)]/90 hover:text-white [&_span]:!text-white [&_svg]:!text-white [&_span.rounded-full]:!bg-white"
                    />
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
                </article>
              </div>
              );
            })}
            </>
            )}
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
              score={data?.rasch?.scaled_score ?? data?.attempt?.rasch?.scaled_score ?? a.score ?? 0}
              percentage={data?.rasch?.percentage}
              grade={data?.rasch?.grade}
              studentName={`${user?.first_name || user?.username || ''} ${user?.last_name || ''}`.trim()}
              date={data?.attempt?.completed_at}
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
    </div>
  );
}
