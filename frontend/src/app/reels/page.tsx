'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, Send, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Flame, Award, Zap, BookOpen,
  Swords, Dna, Globe
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { useFeatureFlags } from '@/lib/features';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

type ReelQuiz = {
  question: string;
  options: string[];
  correct_index?: number;
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

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function getSubjectTone(slug: string): PremiumIconTone {
  switch (slug) {
    case 'tarix': return 'rose';
    case 'ona-tili': return 'sky';
    case 'biologiya': return 'emerald';
    case 'ingliz-tili': return 'purple';
    default: return 'gold';
  }
}

function getSubjectIcon(slug: string) {
  switch (slug) {
    case 'tarix': return Swords;
    case 'ona-tili': return BookOpen;
    case 'biologiya': return Dna;
    case 'ingliz-tili': return Globe;
    default: return Sparkles;
  }
}

export default function ReelsPage() {
  const router = useRouter();
  const { isEnabled } = useFeatureFlags();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User interactions
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [answeredQuizzes, setAnsweredQuizzes] = useState<
    Record<number, { selectedIndex: number; isCorrect: boolean; correctIndex: number; explanation: string }>
  >({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [todayXpEarned, setTodayXpEarned] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load reels
  const loadReels = useCallback(async (subject = 'all') => {
    setLoading(true);
    try {
      const query = subject && subject !== 'all' ? `?subject=${encodeURIComponent(subject)}` : '';
      const data = await apiFetch<ReelsResponse>(`/api/learning/reels/${query}`);
      if (data && data.reels && data.reels.length > 0) {
        setReels(data.reels);
        if (data.subjects) setSubjects(data.subjects);

        const initialLikes: Record<number, number> = {};
        data.reels.forEach((r) => {
          initialLikes[r.id] = r.likes;
        });
        setLikeCounts(initialLikes);
      }
    } catch {
      toast.error("Reels yuklanmadi");
    } finally {
      setLoading(false);
      setCurrentIndex(0);
    }
  }, []);

  useEffect(() => {
    loadReels(selectedSubject);
  }, [selectedSubject, loadReels]);

  // Track active reel index on scroll snap
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
      { root: container, threshold: 0.6 }
    );

    reelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels]);

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
    if (soundEnabled && !isCurrentlyLiked) soundFX.click();

    setLikedReels((prev) => ({ ...prev, [reelId]: !isCurrentlyLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [reelId]: (prev[reelId] || 0) + (isCurrentlyLiked ? -1 : 1),
    }));

    if (!isCurrentlyLiked) {
      const rect = e?.currentTarget?.getBoundingClientRect();
      const x = rect ? rect.x + 10 : window.innerWidth / 2;
      const y = rect ? rect.y : window.innerHeight / 2;
      const heartId = Date.now();
      setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 1000);
    }
  };

  // Handle Telegram Share
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
  };

  // Handle Quiz Answer
  const handleAnswerQuiz = async (reelId: number, optionIndex: number) => {
    if (answeredQuizzes[reelId]) return;

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
          toast.success(`To'g'ri javob! +${res.xp_earned} XP 🔥`, { duration: 2500 });
        } else {
          if (soundEnabled) soundFX.incorrect();
        }
      }
    } catch {
      // Offline fallback
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
        toast.success("To'g'ri javob! +5 XP 🔥", { duration: 2500 });
      } else {
        if (soundEnabled) soundFX.incorrect();
      }
    }
  };

  if (!isEnabled('reels')) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
        <ComingSoonFeature
          featureKey="reels"
          title="Bilim Reels"
          description="TikTok va Instagram formatidagi vertikal tezkor bilim kartalari tayyorlanmoqda."
          badge="Viral 2.0"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden select-none font-sans">
      {/* ── TOP FLOATING MINIMAL HEADER ── */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 pt-3 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md transition-all shrink-0 border border-white/10"
          title="Orqaga"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Minimal Subject Pills Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 max-w-[calc(100vw-130px)] sm:max-w-md">
          <button
            onClick={() => setSelectedSubject('all')}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border",
              selectedSubject === 'all'
                ? "bg-white text-black border-white shadow-md scale-105"
                : "bg-black/40 text-white/80 border-white/15 hover:bg-white/20"
            )}
          >
            Barchasi
          </button>
          {subjects.filter(s => s.slug !== 'all').map((subj) => {
            const isSel = selectedSubject === subj.slug;
            return (
              <button
                key={subj.slug}
                onClick={() => setSelectedSubject(subj.slug)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border",
                  isSel
                    ? "bg-white text-black border-white shadow-md scale-105"
                    : "bg-black/40 text-white/80 border-white/15 hover:bg-white/20"
                )}
              >
                {subj.name}
              </button>
            );
          })}
        </div>

        {/* Top Right: XP badge & Sound */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>+{todayXpEarned}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md transition-all border border-white/10"
            title={soundEnabled ? "Ovozsiz" : "Ovozni yoqish"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-white/60" />}
          </button>
        </div>
      </header>

      {/* ── MAIN FULL-SCREEN REELS FEED ── */}
      <main className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="w-full max-w-md h-full flex flex-col items-center justify-center p-6 space-y-4 animate-pulse text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 mx-auto" />
            <div className="h-6 w-48 bg-white/15 rounded-full mx-auto" />
            <div className="h-20 w-full bg-white/10 rounded-2xl" />
            <div className="h-32 w-full bg-white/10 rounded-2xl" />
          </div>
        ) : reels.length === 0 ? (
          <div className="w-full max-w-md h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-white/40 mb-2" />
            <h3 className="font-bold text-lg text-white">Reels mavjud emas</h3>
            <p className="text-xs text-white/60 max-w-xs">
              Ushbu fan bo&apos;yicha reels tez orada qo&apos;shiladi.
            </p>
            <button
              onClick={() => setSelectedSubject('all')}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold shadow-lg"
            >
              Barcha fanlarni ko&apos;rish
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-full sm:max-w-[420px] sm:h-[92vh] sm:rounded-[2.5rem] sm:border sm:border-white/20 sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto snap-y snap-mandatory relative no-scrollbar scroll-smooth bg-black"
          >
            {reels.map((reel, index) => {
              const isLiked = likedReels[reel.id] || false;
              const likes = likeCounts[reel.id] || reel.likes;
              const quizAnswer = answeredQuizzes[reel.id];
              const SubjectIcon = getSubjectIcon(reel.subject_slug);
              const subjectTone = getSubjectTone(reel.subject_slug);

              return (
                <div
                  key={reel.id}
                  ref={(el) => { reelRefs.current[index] = el; }}
                  data-index={index}
                  className="h-full w-full snap-start snap-always shrink-0 relative flex flex-col justify-between pt-14 pb-5 px-4 sm:px-5 overflow-hidden text-white select-none"
                  style={{
                    background: reel.gradient || 'linear-gradient(160deg, #090d16 0%, #171d2b 100%)',
                  }}
                >
                  {/* Subtle ambient light glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />

                  {/* ── REEL HEADER: Subject Badge & Index Counter ── */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider">
                        <SubjectIcon className="w-3.5 h-3.5 text-white" />
                        <span>{reel.subject_name}</span>
                      </div>
                      <span className="text-[11px] text-white/80 font-medium truncate max-w-[150px]">
                        {reel.category_badge}
                      </span>
                    </div>

                    <div className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-black/40 backdrop-blur-md text-white/80 border border-white/15">
                      {index + 1} / {reels.length}
                    </div>
                  </div>

                  {/* ── MIDDLE CONTENT: Hook, Fact, Takeaway & Micro-Quiz ── */}
                  <div className="relative z-10 my-auto py-2 space-y-2.5">
                    {/* Hook Sarlavha */}
                    <div className="space-y-1">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {reel.tagline || 'Bilasizmi?'}
                      </span>
                      <h2 className="text-base sm:text-lg font-black leading-snug tracking-tight text-white drop-shadow-md">
                        {reel.hook}
                      </h2>
                    </div>

                    {/* Fact Card */}
                    <div className="p-3 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/20 shadow-sm">
                      <p className="text-xs sm:text-[13px] text-white/95 leading-relaxed font-medium">
                        {reel.fact}
                      </p>
                    </div>

                    {/* Takeaway / Golden rule */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                      <Award className="w-4 h-4 shrink-0 text-emerald-300" />
                      <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                        {reel.takeaway}
                      </span>
                    </div>

                    {/* ⚡ MICRO-QUIZ: Seamless Interactive 4-options ── */}
                    <div className="p-3 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          Tezkor Savol:
                        </span>
                        <span className="text-[10px] font-mono text-white/70">
                          {quizAnswer ? (quizAnswer.isCorrect ? '✅ +5 XP' : '❌ Noto\'g\'ri') : '+5 XP'}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-white/90 leading-tight">
                        {reel.quiz.question}
                      </p>

                      {/* Options Grid (2x2) for optimal vertical fit */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {reel.quiz.options.map((opt, optIdx) => {
                          const letter = OPTION_LETTERS[optIdx] || `${optIdx + 1}`;
                          const isSelected = quizAnswer?.selectedIndex === optIdx;
                          const isCorrectOption = quizAnswer?.correctIndex === optIdx;
                          const hasAnswered = !!quizAnswer;

                          let btnClass = "bg-white/10 hover:bg-white/20 border-white/20 text-white";
                          let badgeClass = "bg-white/20 text-white";

                          if (hasAnswered) {
                            if (isCorrectOption) {
                              btnClass = "bg-emerald-600 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.5)]";
                              badgeClass = "bg-emerald-800 text-white";
                            } else if (isSelected && !quizAnswer.isCorrect) {
                              btnClass = "bg-rose-600 border-rose-400 text-white line-through opacity-90";
                              badgeClass = "bg-rose-800 text-white";
                            } else {
                              btnClass = "bg-white/5 border-white/5 text-white/30";
                              badgeClass = "bg-white/5 text-white/20";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasAnswered}
                              onClick={() => handleAnswerQuiz(reel.id, optIdx)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-left border transition-all active:scale-95",
                                btnClass
                              )}
                            >
                              <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0", badgeClass)}>
                                {letter}
                              </span>
                              <span className="truncate font-medium">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation if answered */}
                      {quizAnswer && (
                        <div className="pt-1.5 text-[11px] leading-snug text-white/90 bg-white/10 p-2 rounded-xl border border-white/15 animate-in fade-in">
                          💡 <span className="font-semibold">{quizAnswer.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BOTTOM ACTIONS: Next Hint, Like, Telegram Share ── */}
                  <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15">
                    <button
                      onClick={() => scrollToReel(index + 1)}
                      disabled={index === reels.length - 1}
                      className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-20 font-medium"
                    >
                      <span>Keyingisi</span>
                      <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Like button */}
                      <button
                        onClick={(e) => handleLike(reel.id, e)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border active:scale-90",
                          isLiked
                            ? "bg-rose-500/30 border-rose-400 text-rose-300 ring-2 ring-rose-500/30"
                            : "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-white")} />
                        <span className="text-xs font-black">{likes}</span>
                      </button>

                      {/* Telegram share */}
                      <button
                        onClick={() => handleShare(reel)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/30 hover:bg-sky-500/40 border border-sky-400/40 text-sky-200 text-xs font-bold active:scale-90 transition-all"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-300" />
                        <span>Ulashish</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Hearts effect */}
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="fixed pointer-events-none z-50 text-rose-500 text-2xl animate-ping"
            style={{ left: heart.x, top: heart.y }}
          >
            ❤️
          </div>
        ))}

        {/* Desktop Up/Down Navigation Controls */}
        <div className="hidden sm:flex flex-col gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => scrollToReel(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 shadow-lg transition-all active:scale-95 backdrop-blur-md"
            title="Oldingi (Up)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollToReel(currentIndex + 1)}
            disabled={currentIndex >= reels.length - 1}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 shadow-lg transition-all active:scale-95 backdrop-blur-md"
            title="Keyingi (Down)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
