'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, Send, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Flame, Award, Zap, BookOpen,
  Swords, Dna, Globe, MessageCircle, X
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

type ReelComment = {
  id: number;
  user_id: number;
  user_name: string;
  username: string;
  user_avatar?: string;
  text: string;
  created_at: string;
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
  comments_count?: number;
  is_personalized?: boolean;
  recommendation_reason?: string;
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
  const [selectedSubject, setSelectedSubject] = useState('for_you');
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

  // Comments state
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [activeCommentReel, setActiveCommentReel] = useState<ReelItem | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load reels
  const loadReels = useCallback(async (subject = 'for_you') => {
    setLoading(true);
    try {
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
      const data = await apiFetch<ReelsResponse>(`/api/learning/reels/${query}`);
      if (data && data.reels && data.reels.length > 0) {
        setReels(data.reels);
        if (data.subjects) setSubjects(data.subjects);

        const initialLikes: Record<number, number> = {};
        const initialComments: Record<number, number> = {};
        data.reels.forEach((r) => {
          initialLikes[r.id] = r.likes;
          initialComments[r.id] = r.comments_count || 0;
        });
        setLikeCounts(initialLikes);
        setCommentCounts(initialComments);
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

  // Open Comments Drawer
  const handleOpenComments = async (reel: ReelItem) => {
    setActiveCommentReel(reel);
    setCommentsLoading(true);
    try {
      const data = await apiFetch<{ comments: ReelComment[]; count: number }>(`/api/learning/reels/${reel.id}/comments/`);
      setComments(data.comments || []);
      setCommentCounts((prev) => ({ ...prev, [reel.id]: data.count }));
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Submit Comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentReel || !newCommentText.trim() || submittingComment) return;

    const textToSend = newCommentText.trim();
    setSubmittingComment(true);

    try {
      const res = await apiFetch<{ success: boolean; comment: ReelComment; comments_count: number; message: string }>(
        `/api/learning/reels/${activeCommentReel.id}/comments/`,
        {
          method: 'POST',
          body: JSON.stringify({ text: textToSend }),
        }
      );

      if (res && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setCommentCounts((prev) => ({ ...prev, [activeCommentReel.id]: res.comments_count }));
        setNewCommentText('');
        if (soundEnabled) soundFX.click();
        toast.success(res.message || "Izohingiz qo'shildi!");
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('tizimga')) {
        toast.error("Izoh qoldirish uchun tizimga kiring!");
      } else {
        toast.error(err?.message || "Izoh yuborishda xatolik yuz berdi");
      }
    } finally {
      setSubmittingComment(false);
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
      {/* Desktop Return to Dashboard floating button */}
      <div className="hidden sm:flex items-center gap-2 absolute top-6 left-8 z-40">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Boshqaruv paneli</span>
        </button>
      </div>

      {/* ── MAIN FULL-SCREEN REELS FEED ── */}
      <main className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
        {/* Phone Frame Container */}
        <div className="w-full h-full sm:max-w-[420px] sm:h-[92vh] relative flex flex-col items-center justify-center">
          {/* ── TOP FLOATING MINIMAL HEADER (Inside Phone Frame) ── */}
          <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 pt-3 pb-2.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-[2px] sm:rounded-t-[2.5rem]">
            {/* Back button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md transition-all shrink-0 border border-white/10"
              title="Orqaga"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Minimal Subject Pills Slider */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 min-w-0">
              {(subjects.length > 0 ? subjects : [
                { slug: 'for_you', name: '✨ Siz uchun' },
                { slug: 'all', name: 'Barchasi' },
              ]).map((subj) => {
                const isSel = selectedSubject === subj.slug;
                const isForYou = subj.slug === 'for_you';
                return (
                  <button
                    key={subj.slug}
                    onClick={() => setSelectedSubject(subj.slug)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border flex items-center gap-1",
                      isSel
                        ? isForYou
                          ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105"
                          : "bg-white text-black border-white shadow-md scale-105"
                        : isForYou
                          ? "bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25"
                          : "bg-black/50 text-white/80 border-white/15 hover:bg-white/20"
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

          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 animate-pulse text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 mx-auto" />
              <div className="h-6 w-48 bg-white/15 rounded-full mx-auto" />
              <div className="h-20 w-full bg-white/10 rounded-2xl" />
              <div className="h-32 w-full bg-white/10 rounded-2xl" />
            </div>
          ) : reels.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
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
              className="w-full h-full sm:rounded-[2.5rem] sm:border sm:border-white/20 sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto snap-y snap-mandatory relative no-scrollbar scroll-smooth bg-black"
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
                    <div className="space-y-1.5">
                      {reel.is_personalized && reel.recommendation_reason && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/25 to-rose-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-bold backdrop-blur-md shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>{reel.recommendation_reason}</span>
                        </div>
                      )}
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {reel.tagline || 'Bilasizmi?'}
                        </span>
                      </div>
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

                      {/* Comments button */}
                      <button
                        onClick={() => handleOpenComments(reel)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold active:scale-90 transition-all"
                        title="Izohlar"
                      >
                        <MessageCircle className="w-4 h-4 text-white" />
                        <span className="text-xs font-black">{commentCounts[reel.id] ?? reel.comments_count ?? 0}</span>
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
        </div>

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

        {/* ── COMMENTS BOTTOM DRAWER MODAL ── */}
        {activeCommentReel && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setActiveCommentReel(null)}
          >
            <div
              className="w-full sm:max-w-lg bg-zinc-950/95 border-t sm:border border-white/20 rounded-t-[2.5rem] sm:rounded-[2rem] p-5 sm:p-6 flex flex-col h-[75vh] sm:h-[580px] shadow-2xl relative text-white animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Drag handle for mobile */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-base text-white">
                    Izohlar ({commentCounts[activeCommentReel.id] ?? comments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveCommentReel(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3.5">
                {commentsLoading ? (
                  <div className="space-y-3 py-6 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-28 bg-white/15 rounded" />
                          <div className="h-4 w-full bg-white/10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-white/60">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40 mb-1">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm text-white/90">Hozircha izohlar yo&apos;q</p>
                    <p className="text-xs text-white/50">Birinchi bo&apos;lib fikr bildiring va muhokamani boshlang!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-extrabold text-xs shrink-0 shadow-md overflow-hidden">
                        {c.user_avatar ? (
                          <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                        ) : (
                          c.user_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white/90">{c.user_name}</span>
                          <span className="text-[10px] text-white/40 font-mono">{c.created_at}</span>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed break-words">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSendComment} className="pt-3 border-t border-white/15 flex items-center gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Fikringizni yozing..."
                  maxLength={500}
                  className="flex-1 bg-white/10 border border-white/20 focus:border-emerald-400/80 rounded-full px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submittingComment}
                  className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all shrink-0"
                >
                  <span>Yuborish</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
