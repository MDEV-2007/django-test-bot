'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Heart, Share2, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, ArrowLeft, Flame, Award, Zap, BookOpen,
  HelpCircle, RefreshCw, Send, Trophy
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import { useFeatureFlags } from '@/lib/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

type ReelQuiz = {
  question: string;
  options: string[];
  explanation: string;
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

export default function ReelsPage() {
  const { isEnabled } = useFeatureFlags();
  const { user, refreshUser } = useAuthStore();

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
      // Spawn floating hearts animation
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
          if (refreshUser) refreshUser();
        } else {
          if (soundEnabled) soundFX.wrong();
          toast.error("Afsuski noto'g'ri. Tushuntirish bilan tanishing!", { duration: 3000 });
        }
      }
    } catch {
      toast.error("Javobni tekshirishda xatolik yuz berdi");
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
            badgeText="Viral 2.0"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell pb-12 sm:pb-6">
        {/* Top Header bar with Subject Pills */}
        <div className="max-w-xl mx-auto mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-card hover:bg-muted text-foreground border border-border transition-colors"
                title="Bosh sahifaga qaytish"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-1.5">
                    📱 Bilim Reels
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-amber-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                    Scroll-Learning
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Varaqlang, o&apos;rganing va har bir fakt uchun +5 XP to&apos;plang
                </p>
              </div>
            </div>

            {/* Quick stats pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                title={soundEnabled ? "Ovozsiz qilish" : "Ovozni yoqish"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>+{todayXpEarned} XP</span>
              </div>
            </div>
          </div>

          {/* Subject Pills Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedSubject('all')}
              className={cn(
                "px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap border shrink-0",
                selectedSubject === 'all'
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              🌟 Barchasi
            </button>
            {subjects.filter(s => s.slug !== 'all').map((subj) => (
              <button
                key={subj.slug}
                onClick={() => setSelectedSubject(subj.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap border shrink-0",
                  selectedSubject === subj.slug
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {subj.name}
              </button>
            ))}
          </div>
        </div>

        {/* Reels Container: Vertical Snap Scroll Feed */}
        <div className="relative max-w-md mx-auto">
          {loading ? (
            <div className="h-[76vh] rounded-3xl border border-border bg-card p-6 flex flex-col justify-between animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-[60vh] rounded-3xl border border-border bg-card flex flex-col items-center justify-center p-6 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-bold text-foreground text-lg mb-1">Hozircha Reels mavjud emas</h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Ushbu fanga oid reels mini-darslari tez orada joylanadi.
              </p>
              <Button size="sm" variant="outline" onClick={() => setSelectedSubject('all')}>
                Barcha fanlarni ko&apos;rish
              </Button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="h-[78vh] sm:h-[80vh] overflow-y-auto snap-y snap-mandatory rounded-3xl border border-border/80 shadow-2xl bg-black relative scroll-smooth no-scrollbar"
            >
              {reels.map((reel, index) => {
                const isLiked = likedReels[reel.id] || false;
                const likes = likeCounts[reel.id] || reel.likes;
                const quizAnswer = answeredQuizzes[reel.id];

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
                    {/* Ambient Glow Orbs */}
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-black/40 rounded-full blur-2xl pointer-events-none" />

                    {/* Reel Top Bar */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/25">
                          {reel.subject_name}
                        </span>
                        <span className="text-xs text-white/70 font-medium">
                          {reel.category_badge}
                        </span>
                      </div>

                      <div className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-black/30 backdrop-blur-md text-white/80 border border-white/10">
                        {index + 1} / {reels.length}
                      </div>
                    </div>

                    {/* Central Content: Hook, Fact & Takeaway */}
                    <div className="relative z-10 my-auto py-2 space-y-3.5">
                      {/* Hook */}
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[11px] font-bold tracking-wide">
                          <Sparkles className="w-3 h-3" />
                          {reel.tagline || 'Bilasizmi?'}
                        </div>
                        <h2 className="text-lg sm:text-xl font-extrabold leading-snug tracking-tight text-white drop-shadow-md">
                          {reel.hook}
                        </h2>
                      </div>

                      {/* Fact Body */}
                      <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
                        <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                          {reel.fact}
                        </p>
                      </div>

                      {/* Golden Takeaway / Formula */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                        <Award className="w-4 h-4 shrink-0 text-emerald-300" />
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight">
                          {reel.takeaway}
                        </span>
                      </div>

                      {/* Micro-Quiz Box */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-black/40 backdrop-blur-lg border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Tezkor Mikrokvest:
                          </span>
                          <span className="text-[10px] text-white/60 font-mono">
                            {quizAnswer ? (quizAnswer.isCorrect ? '✅ +5 XP' : '❌ Xato') : '+5 XP yutib oling'}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-white/90">
                          {reel.quiz.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {reel.quiz.options.map((opt, optIdx) => {
                            const isSelected = quizAnswer?.selectedIndex === optIdx;
                            const isCorrectOption = quizAnswer?.correctIndex === optIdx;
                            const hasAnswered = !!quizAnswer;

                            let btnStyle = "bg-white/10 hover:bg-white/20 border-white/15 text-white";
                            if (hasAnswered) {
                              if (isCorrectOption) {
                                btnStyle = "bg-emerald-600/90 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/50";
                              } else if (isSelected && !quizAnswer.isCorrect) {
                                btnStyle = "bg-rose-600/90 border-rose-400 text-white line-through";
                              } else {
                                btnStyle = "bg-white/5 border-white/5 text-white/40";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={hasAnswered || submittingQuiz === reel.id}
                                onClick={() => handleAnswerQuiz(reel.id, optIdx)}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between border",
                                  btnStyle
                                )}
                              >
                                <span className="line-clamp-1 pr-1">{opt}</span>
                                {hasAnswered && isCorrectOption && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                                )}
                                {hasAnswered && isSelected && !quizAnswer.isCorrect && (
                                  <XCircle className="w-3.5 h-3.5 text-rose-200 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation on Answer */}
                        {quizAnswer && (
                          <div className="pt-1 text-[11px] leading-snug text-white/80 bg-white/5 p-2 rounded-lg border border-white/10 animate-fade-in">
                            💡 <span className="font-semibold">{quizAnswer.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Navigation Hint & Right Action Bar */}
                    <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
                      {/* Swipe / Scroll Hint */}
                      <button
                        onClick={() => scrollToReel(index + 1)}
                        disabled={index === reels.length - 1}
                        className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-30"
                      >
                        <span>Keyingi fakt</span>
                        <ChevronDown className="w-4 h-4 animate-bounce" />
                      </button>

                      {/* Action Rail: Like & Share */}
                      <div className="flex items-center gap-3">
                        {/* Like Button */}
                        <button
                          onClick={(e) => handleLike(reel.id, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white border border-white/20"
                          title="Yoqdi"
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-white"
                            )}
                          />
                          <span className="text-xs font-bold">{likes}</span>
                        </button>

                        {/* Telegram Share Button */}
                        <button
                          onClick={() => handleShare(reel)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/30 hover:bg-sky-500/50 active:scale-95 transition-all text-sky-200 border border-sky-400/30"
                          title="Telegramda ulashish"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-300" />
                          <span className="text-xs font-bold">Ulashish</span>
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
              className="fixed pointer-events-none z-50 text-rose-500 animate-ping"
              style={{ left: heart.x, top: heart.y }}
            >
              ❤️
            </div>
          ))}

          {/* Up & Down floating quick controls (Desktop) */}
          <div className="hidden sm:flex flex-col gap-2 absolute -right-14 top-1/2 -translate-y-1/2 z-20">
            <button
              onClick={() => scrollToReel(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-card border border-border text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-20 shadow-md transition-all"
              title="Oldingi fakt (Up)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToReel(currentIndex + 1)}
              disabled={currentIndex >= reels.length - 1}
              className="w-10 h-10 rounded-full bg-card border border-border text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-20 shadow-md transition-all"
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
