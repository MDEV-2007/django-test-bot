'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Heart, Share2, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, ArrowLeft, Flame, Award, Zap, BookOpen,
  HelpCircle, RefreshCw, Send, Trophy, Swords, Dna, Globe, BookmarkCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import { useFeatureFlags } from '@/lib/features';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

type ReelQuiz = {
  question: string;
  options: string[];
  explanation: string;
  correct_index?: number;
};

type ReelItem = {
  id: number;
  subject_slug: string;
  subject_name: string;
  category_badge: string;
  tagline: string;
  hook: string;
  fact: string;
  takeaway: string;
  gradient: string;
  quiz: ReelQuiz;
  likes: number;
  shares: number;
};

type ReelsResponse = {
  reels: ReelItem[];
  total: number;
  subjects: { slug: string; name: string }[];
};

type QuizResult = {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  xp_earned: number;
  total_xp: number;
  streak_days: number;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function getSubjectTone(slug: string): PremiumIconTone {
  switch (slug) {
    case 'tarix':
      return 'rose';
    case 'ona-tili':
      return 'sky';
    case 'biologiya':
      return 'emerald';
    case 'ingliz-tili':
      return 'purple';
    default:
      return 'gold';
  }
}

function getSubjectIcon(slug: string) {
  switch (slug) {
    case 'tarix':
      return Swords;
    case 'ona-tili':
      return BookOpen;
    case 'biologiya':
      return Dna;
    case 'ingliz-tili':
      return Globe;
    default:
      return Sparkles;
  }
}

export default function ReelsPage() {
  const { isEnabled } = useFeatureFlags();
  const { user } = useAuthStore();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User interactions state
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [answeredQuizzes, setAnsweredQuizzes] = useState<
    Record<number, { selectedIndex: number; isCorrect: boolean; correctIndex: number; explanation: string }>
  >({});
  const [submittingQuiz, setSubmittingQuiz] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [todayXpEarned, setTodayXpEarned] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load feed
  const loadReels = useCallback(async (subject = 'all') => {
    setLoading(true);
    try {
      const query = subject && subject !== 'all' ? `?subject=${encodeURIComponent(subject)}` : '';
      const data = await apiFetch<ReelsResponse>(`/api/learning/reels/${query}`);
      if (data && data.reels) {
        setReels(data.reels);
        if (data.subjects) setSubjects(data.subjects);

        // Initialize like counts
        const initialLikes: Record<number, number> = {};
        data.reels.forEach((r) => {
          initialLikes[r.id] = r.likes;
        });
        setLikeCounts(initialLikes);
      }
    } catch {
      toast.error("Reels ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setCurrentIndex(0);
    }
  }, []);

  useEffect(() => {
    loadReels(selectedSubject);
  }, [selectedSubject, loadReels]);

  // Observer to track which reel is currently in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setCurrentIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    reelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels]);

  // Scroll to a specific reel index
  const scrollToReel = (index: number) => {
    if (index < 0 || index >= reels.length) return;
    reelRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'j'].includes(e.key)) {
        e.preventDefault();
        scrollToReel(currentIndex + 1);
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault();
        scrollToReel(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  // Handle Like
  const handleLike = (reelId: number, e?: React.MouseEvent) => {
    const isCurrentlyLiked = likedReels[reelId];
    if (soundEnabled) {
      if (!isCurrentlyLiked) soundFX.click();
    }

    setLikedReels((prev) => ({ ...prev, [reelId]: !isCurrentlyLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [reelId]: (prev[reelId] || 0) + (isCurrentlyLiked ? -1 : 1),
    }));

    if (!isCurrentlyLiked) {
      const rect = e?.currentTarget?.getBoundingClientRect();
      const x = rect ? rect.x + 20 : window.innerWidth / 2;
      const y = rect ? rect.y : window.innerHeight / 2;
      const heartId = Date.now();
      setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 1000);
    }
  };

  // Handle Share to Telegram
  const handleShare = (reel: ReelItem) => {
    if (soundEnabled) soundFX.click();
    const text = encodeURIComponent(
      `🔥 *${reel.subject_name.toUpperCase()} REELS* — Ilm Ildizi\n\n` +
      `💡 *${reel.hook}*\n\n` +
      `📖 ${reel.fact}\n\n` +
      `✨ *Xulosa:* ${reel.takeaway}\n\n` +
      `🎯 O'zingni sinab ko'r va ball to'pla: ${window.location.origin}/reels`
    );
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/reels')}&text=${text}`;
    window.open(url, '_blank');
    toast.success("Telegram orqali ulashish oynasi ochildi!");
  };

  // Handle Quiz Answer
  const handleAnswerQuiz = async (reelId: number, optionIndex: number) => {
    if (answeredQuizzes[reelId] || submittingQuiz === reelId) return;

    setSubmittingQuiz(reelId);
    try {
      const res = await apiFetch<QuizResult>('/api/learning/reels/quiz/', {
        method: 'POST',
        body: JSON.stringify({ reel_id: reelId, answer_index: optionIndex }),
      });

      if (res) {
        setAnsweredQuizzes((prev) => ({
          ...prev,
          [reelId]: {
            selectedIndex: optionIndex,
            isCorrect: res.is_correct,
            correctIndex: res.correct_index,
            explanation: res.explanation,
          },
        }));

        if (res.is_correct) {
          if (soundEnabled) soundFX.correct();
          celebrate();
          setTodayXpEarned((prev) => prev + (res.xp_earned || 5));
          toast.success(`To'g'ri javob! +${res.xp_earned} XP hisobingizga qo'shildi! 🔥`, {
            duration: 3000,
          });
        } else {
          if (soundEnabled) soundFX.incorrect();
          toast.error("Afsuski noto'g'ri. Tushuntirish bilan tanishing!", { duration: 3000 });
        }
      }
    } catch {
      // Backend keshida yoki qayta ishga tushish jarayonida lokal tekshiruv (offline fallback)
      const targetReel = reels.find((r) => r.id === reelId);
      const correctIdx = typeof targetReel?.quiz.correct_index === 'number' ? targetReel.quiz.correct_index : 0;
      const isCorrect = optionIndex === correctIdx;
      const explanation = targetReel?.quiz.explanation || "To'g'ri javob belgilandi.";

      setAnsweredQuizzes((prev) => ({
        ...prev,
        [reelId]: {
          selectedIndex: optionIndex,
          isCorrect,
          correctIndex: correctIdx,
          explanation,
        },
      }));

      if (isCorrect) {
        if (soundEnabled) soundFX.correct();
        celebrate();
        setTodayXpEarned((prev) => prev + 5);
        toast.success("To'g'ri javob! +5 XP hisobingizga qo'shildi! 🔥", { duration: 3000 });
      } else {
        if (soundEnabled) soundFX.incorrect();
        toast.error("Afsuski noto'g'ri. Tushuntirish bilan tanishing!", { duration: 3000 });
      }
    } finally {
      setSubmittingQuiz(null);
    }
  };

  if (!isEnabled('reels')) {
    return (
      <>
        <AppShell />
        <main className="page-shell pb-16">
          <ComingSoonFeature
            featureKey="reels"
            title="Bilim Reels (Scroll-Learning)"
            description="Instagram va TikTok formatidagi vertikal tezkor bilim kartalari, mikrokvestlar va darslar tayyorlanmoqda."
            badge="Viral 2.0"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell pb-12 sm:pb-6">
        {/* Top Header bar with Glassmorphic styling & Premium Icons */}
        <div className="max-w-xl mx-auto mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-card/80 hover:bg-muted text-foreground border border-border/70 shadow-sm transition-all active:scale-95"
                title="Bosh sahifaga qaytish"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              
              <div className="flex items-center gap-2.5">
                <PremiumIcon icon={Sparkles} tone="rose" size="md" glow />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-foreground">
                      Bilim Reels
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-purple-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30 shadow-sm">
                      Scroll-Learning
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Varaqlang, o&apos;rganing va har bir fakt uchun +5 XP to&apos;plang
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats & Audio controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-9 h-9 rounded-2xl flex items-center justify-center bg-card/80 border border-border/70 text-muted-foreground hover:text-foreground shadow-sm transition-all active:scale-95"
                title={soundEnabled ? "Ovozsiz qilish" : "Ovozni yoqish"}
              >
                {soundEnabled ? (
                  <PremiumIcon icon={Volume2} tone="emerald" size="xs" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black shadow-sm">
                <PremiumIcon icon={Zap} tone="amber" size="xs" glow />
                <span>+{todayXpEarned} XP</span>
              </div>
            </div>
          </div>

          {/* Subject Pills Slider with Duotone Premium Icons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedSubject('all')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold transition-all whitespace-nowrap border shrink-0 shadow-sm",
                selectedSubject === 'all'
                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-md"
                  : "bg-card/70 backdrop-blur-md text-muted-foreground border-border/70 hover:text-foreground hover:bg-card"
              )}
            >
              <PremiumIcon icon={Sparkles} tone="gold" size="xs" />
              <span>Barchasi</span>
            </button>
            {subjects.filter(s => s.slug !== 'all').map((subj) => {
              const SubIcon = getSubjectIcon(subj.slug);
              const tone = getSubjectTone(subj.slug);
              const isSelected = selectedSubject === subj.slug;

              return (
                <button
                  key={subj.slug}
                  onClick={() => setSelectedSubject(subj.slug)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold transition-all whitespace-nowrap border shrink-0 shadow-sm",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-md"
                      : "bg-card/70 backdrop-blur-md text-muted-foreground border-border/70 hover:text-foreground hover:bg-card"
                  )}
                >
                  <PremiumIcon icon={SubIcon} tone={tone} size="xs" />
                  <span>{subj.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reels Container: Vertical Snap Scroll Feed */}
        <div className="relative max-w-md mx-auto">
          {loading ? (
            <div className="h-[78vh] rounded-[2.5rem] border border-border bg-card p-6 flex flex-col justify-between animate-pulse shadow-2xl">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-28 rounded-2xl" />
                  <Skeleton className="h-7 w-16 rounded-2xl" />
                </div>
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-3xl" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-[60vh] rounded-[2.5rem] border border-border bg-card/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center shadow-xl">
              <PremiumIcon icon={BookOpen} tone="sky" size="xl" glow className="mb-4" />
              <h3 className="font-bold text-foreground text-lg mb-1">Hozircha Reels mavjud emas</h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-5">
                Ushbu fanga oid reels mini-darslari tez orada joylanadi.
              </p>
              <Button size="sm" variant="outline" onClick={() => setSelectedSubject('all')} className="rounded-2xl">
                Barcha fanlarni ko&apos;rish
              </Button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="h-[78vh] sm:h-[82vh] overflow-y-auto snap-y snap-mandatory rounded-[2.5rem] border border-white/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] bg-slate-950 relative scroll-smooth no-scrollbar"
            >
              {reels.map((reel, index) => {
                const isLiked = likedReels[reel.id] || false;
                const likes = likeCounts[reel.id] || reel.likes;
                const quizAnswer = answeredQuizzes[reel.id];
                const subjectTone = getSubjectTone(reel.subject_slug);
                const SubjectIcon = getSubjectIcon(reel.subject_slug);

                return (
                  <div
                    key={reel.id}
                    ref={(el) => { reelRefs.current[index] = el; }}
                    data-index={index}
                    className="h-full w-full snap-start snap-always shrink-0 relative flex flex-col justify-between p-5 sm:p-6 overflow-hidden text-white select-none"
                    style={{
                      background: reel.gradient || 'linear-gradient(145deg, #090d16 0%, #151b2b 100%)',
                    }}
                  >
                    {/* Top glass glow border light line */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    {/* Ambient Neon Glow Orbs */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/50 rounded-full blur-3xl pointer-events-none" />

                    {/* Reel Top Bar: Subject Badge with PremiumIcon & Counter */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-sm text-white">
                          <PremiumIcon icon={SubjectIcon} tone={subjectTone} size="xs" glow />
                          <span className="text-xs font-black tracking-wide uppercase">
                            {reel.subject_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/70 font-medium truncate max-w-[160px]">
                          {reel.category_badge}
                        </span>
                      </div>

                      <div className="px-3 py-1 rounded-2xl text-[11px] font-mono font-bold bg-black/40 backdrop-blur-xl text-white/90 border border-white/15 shadow-inner">
                        {index + 1} / {reels.length}
                      </div>
                    </div>

                    {/* Central Content: Hook, Fact, Takeaway & Micro-Quiz */}
                    <div className="relative z-10 my-auto py-1.5 space-y-3">
                      {/* Hook & Tagline */}
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold tracking-wide shadow-sm">
                          <PremiumIcon icon={Sparkles} tone="amber" size="xs" glow />
                          <span>{reel.tagline || 'Bilasizmi?'}</span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black leading-snug tracking-tight text-white drop-shadow-md">
                          {reel.hook}
                        </h2>
                      </div>

                      {/* Fact Card (Glassmorphic) */}
                      <div className="p-4 rounded-3xl bg-white/[0.12] backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                        <p className="text-xs sm:text-[13px] text-white/95 leading-relaxed font-medium">
                          {reel.fact}
                        </p>
                      </div>

                      {/* Golden Takeaway with Emerald PremiumIcon */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/35 text-emerald-100 shadow-sm">
                        <PremiumIcon icon={Award} tone="emerald" size="xs" glow />
                        <span className="text-[11px] sm:text-xs font-bold leading-tight">
                          {reel.takeaway}
                        </span>
                      </div>

                      {/* Micro-Quiz Box with interactive stylized option pills */}
                      <div className="p-3.5 rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <PremiumIcon icon={Flame} tone="rose" size="xs" glow />
                            <span className="text-xs font-black text-amber-300">
                              Tezkor Mikrokvest:
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-white/70 font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                            {quizAnswer ? (quizAnswer.isCorrect ? '✅ +5 XP' : '❌ Noto\'g\'ri') : '+5 XP yutib oling'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white/90 leading-tight">
                          {reel.quiz.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {reel.quiz.options.map((opt, optIdx) => {
                            const letter = OPTION_LETTERS[optIdx] || `${optIdx + 1}`;
                            const isSelected = quizAnswer?.selectedIndex === optIdx;
                            const isCorrectOption = quizAnswer?.correctIndex === optIdx;
                            const hasAnswered = !!quizAnswer;

                            let btnStyle = "bg-white/[0.08] hover:bg-white/[0.16] hover:border-white/30 border-white/15 text-white active:scale-[0.98]";
                            let letterStyle = "bg-white/15 text-white/90 border-white/20";

                            if (hasAnswered) {
                              if (isCorrectOption) {
                                btnStyle = "bg-emerald-600/90 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
                                letterStyle = "bg-emerald-800 text-white border-emerald-300";
                              } else if (isSelected && !quizAnswer.isCorrect) {
                                btnStyle = "bg-rose-600/90 border-rose-400 text-white line-through opacity-90";
                                letterStyle = "bg-rose-800 text-white border-rose-300";
                              } else {
                                btnStyle = "bg-white/[0.03] border-white/5 text-white/35 opacity-50";
                                letterStyle = "bg-white/5 text-white/30 border-white/5";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={hasAnswered || submittingQuiz === reel.id}
                                onClick={() => handleAnswerQuiz(reel.id, optIdx)}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 rounded-2xl text-xs transition-all flex items-center justify-between border shadow-sm",
                                  btnStyle
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                  <span className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black border shrink-0 transition-colors",
                                    letterStyle
                                  )}>
                                    {letter}
                                  </span>
                                  <span className="truncate font-medium">{opt}</span>
                                </div>
                                {hasAnswered && isCorrectOption && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0 animate-in zoom-in" />
                                )}
                                {hasAnswered && isSelected && !quizAnswer.isCorrect && (
                                  <XCircle className="w-4 h-4 text-rose-200 shrink-0 animate-in zoom-in" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation on Answer */}
                        {quizAnswer && (
                          <div className="pt-2 text-[11px] leading-relaxed text-white/90 bg-white/[0.08] p-2.5 rounded-2xl border border-white/15 animate-in fade-in slide-in-from-top-1">
                            💡 <span className="font-semibold">{quizAnswer.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Navigation Hint & Right Action Bar */}
                    <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15">
                      {/* Swipe / Scroll Hint */}
                      <button
                        onClick={() => scrollToReel(index + 1)}
                        disabled={index === reels.length - 1}
                        className="text-xs text-white/70 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-20 font-medium"
                      >
                        <span>Keyingi fakt</span>
                        <ChevronDown className="w-4 h-4 animate-bounce" />
                      </button>

                      {/* Action Rail: Like & Share */}
                      <div className="flex items-center gap-2.5">
                        {/* Like Button */}
                        <button
                          onClick={(e) => handleLike(reel.id, e)}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl transition-all border shadow-md active:scale-90",
                            isLiked
                              ? "bg-rose-500/30 border-rose-400/50 text-rose-300 ring-2 ring-rose-500/20"
                              : "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                          )}
                          title="Yoqdi"
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isLiked ? "fill-rose-500 text-rose-500 scale-125" : "text-white"
                            )}
                          />
                          <span className="text-xs font-black">{likes}</span>
                        </button>

                        {/* Telegram Share Button */}
                        <button
                          onClick={() => handleShare(reel)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-sky-500/30 to-blue-500/30 hover:from-sky-500/40 hover:to-blue-500/40 border border-sky-400/40 text-sky-200 font-bold active:scale-90 transition-all shadow-md"
                          title="Telegramda ulashish"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-300" />
                          <span className="text-xs">Ulashish</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Hearts Animation overlay */}
          {floatingHearts.map((heart) => (
            <div
              key={heart.id}
              className="fixed pointer-events-none z-50 text-rose-500 text-2xl animate-ping"
              style={{ left: heart.x, top: heart.y }}
            >
              ❤️
            </div>
          ))}

          {/* Up & Down floating quick controls (Desktop) with glassmorphism */}
          <div className="hidden sm:flex flex-col gap-2.5 absolute -right-14 top-1/2 -translate-y-1/2 z-20">
            <button
              onClick={() => scrollToReel(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="w-11 h-11 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-20 shadow-lg transition-all active:scale-95"
              title="Oldingi fakt (Up)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToReel(currentIndex + 1)}
              disabled={currentIndex >= reels.length - 1}
              className="w-11 h-11 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-20 shadow-lg transition-all active:scale-95"
              title="Keyingi fakt (Down)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
