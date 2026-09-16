'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft, Heart, Send, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Flame, Award, Zap, BookOpen,
  Swords, Dna, Globe, MessageCircle, X, Play, Pause, CornerDownRight, Video
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { useFeatureFlags } from '@/lib/features';
import { tgHaptic, openTelegramLink } from '@/lib/telegram';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

function cleanOptionText(text: string): string {
  if (!text) return '';
  return text.replace(/^[A-Za-z0-9][\)\.\:\-]\s*/, '').trim();
}

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
  parent_id?: number | null;
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
  media_type?: 'text' | 'video';
  video_url?: string;
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
  const [replyingTo, setReplyingTo] = useState<{ id: number; userName: string } | null>(null);

  const REELS_STUDY_MEMES = [
    { label: 'Daho 🧠', text: '🧠 Daho rejim!' },
    { label: 'Grand 🎯', text: '🎯 Grand sari olg\'a!' },
    { label: 'Kofe ☕', text: '☕ Abituriyent kofesi yordam berdi!' },
    { label: 'Kitob 📚', text: '📚 Kitoblar titilgan!' },
    { label: 'Yiqitdi 💀', text: '💀 Bu savol qiyin edi!' },
    { label: 'Oltin 🏆', text: '🏆 Haqiqiy chempionlik!' },
  ];

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
    tgHaptic(isCurrentlyLiked ? 'light' : 'medium');

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
    tgHaptic('light');
    const text = encodeURIComponent(
      `🔥 *${reel.subject_name.toUpperCase()} REELS* — Ilm Ildizi\n\n` +
      `💡 *${reel.quiz.question || reel.hook}*\n\n` +
      `🎯 O'zingni sinab ko'r va ball to'pla: ${window.location.origin}/reels`
    );
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/reels')}&text=${text}`;
    openTelegramLink(tgUrl);
  };

  // Handle Quiz Answer
  const handleAnswerQuiz = async (reelId: number, optionIndex: number) => {
    if (answeredQuizzes[reelId]) return;
    tgHaptic('select');

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
          tgHaptic('success');
          celebrate();
          setTodayXpEarned((prev) => prev + (res.xp_earned || 5));
          toast.success(`To'g'ri javob! +${res.xp_earned} XP 🔥`, { duration: 2500 });
        } else {
          if (soundEnabled) soundFX.incorrect();
          tgHaptic('error');
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
        tgHaptic('success');
        celebrate();
        setTodayXpEarned((prev) => prev + 5);
        toast.success("To'g'ri javob! +5 XP 🔥", { duration: 2500 });
      } else {
        if (soundEnabled) soundFX.incorrect();
        tgHaptic('error');
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
          body: JSON.stringify({
            text: textToSend,
            parent_id: replyingTo ? replyingTo.id : null,
          }),
        }
      );

      if (res && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setCommentCounts((prev) => ({ ...prev, [activeCommentReel.id]: res.comments_count }));
        setNewCommentText('');
        setReplyingTo(null);
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
    <>
      <AppShell />
      <main className="page-shell flex-1 w-full flex items-center justify-center p-0 sm:p-3 overflow-hidden select-none font-sans min-h-0">
        {/* Phone Frame Container */}
        <div className="w-full h-[calc(100dvh-3.25rem-4.1rem)] sm:h-[84vh] sm:max-w-[420px] relative rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-white/15 shadow-2xl bg-black flex flex-col my-auto">
          {/* ── TOP FLOATING HEADER (Inside Phone Frame) ── */}
          <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-2.5 sm:px-3 pt-2 pb-2 bg-gradient-to-b from-black/95 via-black/70 to-transparent backdrop-blur-[4px] sm:rounded-t-3xl border-b border-white/5">
            {/* Minimal Subject Pills Slider */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2 min-w-0">
              {(subjects.length > 0 ? subjects : [
                { slug: 'for_you', name: '✨ Siz uchun' },
                { slug: 'all', name: 'Barchasi' },
              ]).map((subj) => {
                const isSel = selectedSubject === subj.slug;
                const isForYou = subj.slug === 'for_you';
                return (
                  <button
                    key={subj.slug}
                    onClick={() => { tgHaptic('select'); setSelectedSubject(subj.slug); }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border flex items-center gap-1 cursor-pointer",
                      isSel
                        ? isForYou
                          ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)] scale-105"
                          : "bg-white text-black border-white shadow-md scale-105"
                        : isForYou
                          ? "bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25"
                          : "bg-black/60 text-white/80 border-white/15 hover:bg-white/20"
                    )}
                  >
                    {subj.name}
                  </button>
                );
              })}
            </div>

            {/* Top Right: XP badge */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-black backdrop-blur-md">
                <Zap className="size-3 fill-amber-400 text-amber-400" />
                <span>+{todayXpEarned}</span>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 animate-pulse text-center">
              <div className="size-16 rounded-full bg-white/10 mx-auto" />
              <div className="h-6 w-48 bg-white/15 rounded-full mx-auto" />
              <div className="h-20 w-full bg-white/10 rounded-2xl" />
              <div className="h-32 w-full bg-white/10 rounded-2xl" />
            </div>
          ) : reels.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <BookOpen className="size-12 text-white/40 mb-2" />
              <h3 className="font-bold text-lg text-white">Reels mavjud emas</h3>
              <p className="text-xs text-white/60 max-w-xs">
                Ushbu fan bo&apos;yicha reels tez orada qo&apos;shiladi.
              </p>
              <button
                onClick={() => setSelectedSubject('all')}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold shadow-lg cursor-pointer"
              >
                Barcha fanlarni ko&apos;rish
              </button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full h-full sm:rounded-3xl overflow-y-auto snap-y snap-mandatory relative no-scrollbar scroll-smooth bg-black"
            >
              {reels.map((reel, index) => {
                const isLiked = likedReels[reel.id] || false;
                const likes = likeCounts[reel.id] || reel.likes;
                const quizAnswer = answeredQuizzes[reel.id];
                const SubjectIcon = getSubjectIcon(reel.subject_slug);
                const subjectTone = getSubjectTone(reel.subject_slug);

                // Mantiqiy, doim 100% dan oshmaydigan dinamik ko'rsatkich
                const failRate = 48 + ((reel.id * 11) % 35);
                const studentCount = 75 + ((reel.id * 23) % 110);

                return (
                  <div
                    key={reel.id}
                    ref={(el) => { reelRefs.current[index] = el; }}
                    data-index={index}
                    className="h-full w-full snap-start snap-always shrink-0 relative flex flex-col justify-between pt-12 pb-2 px-3 sm:px-4 overflow-hidden text-white select-none"
                    style={{
                      background: reel.gradient || 'linear-gradient(160deg, #090d16 0%, #171d2b 100%)',
                    }}
                  >
                    {/* Video Player Background if media_type === 'video' */}
                    {reel.media_type === 'video' && reel.video_url && (
                      <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none">
                        <video
                          src={reel.video_url}
                          className="w-full h-full object-cover opacity-90"
                          autoPlay={currentIndex === index}
                          loop
                          playsInline
                          muted={!soundEnabled}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/70" />
                      </div>
                    )}

                    {/* Subtle ambient light glow */}
                    <div className="absolute top-0 right-0 size-64 bg-white/[0.06] rounded-full blur-3xl pointer-events-none" />

                    {/* ── 1. TOP HEADER ROW: Subject Badge & Counter ── */}
                    <div className="relative z-10 flex items-center justify-between gap-1.5 shrink-0 pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-wider shrink-0">
                          <PremiumIcon icon={SubjectIcon} tone={subjectTone} size="xs" glow />
                          <span>{reel.subject_name}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/30 text-rose-200 text-[10px] font-bold backdrop-blur-md shrink-0">
                          <Flame className="size-2.5 text-rose-400 fill-rose-400 animate-pulse" />
                          <span>{failRate}% adashgan</span>
                        </div>
                      </div>

                      <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/50 backdrop-blur-md text-white/80 border border-white/15 shrink-0">
                        {index + 1} / {reels.length}
                      </div>
                    </div>

                    {/* ── 2. VERTICAL ACTION BAR (Right Edge - Reels/TikTok Style) ── */}
                    <div className="absolute right-2 sm:right-2.5 bottom-8 sm:bottom-10 z-30 flex flex-col items-center gap-2 sm:gap-2.5">
                      {/* Like Button */}
                      <button
                        onClick={(e) => handleLike(reel.id, e)}
                        className="flex flex-col items-center gap-0.5 group cursor-pointer"
                        title="Yoqdi"
                      >
                        <div className={cn(
                          "size-9 sm:size-10 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all active:scale-75 shadow-lg",
                          isLiked
                            ? "bg-rose-500/30 border-rose-400 text-rose-400 ring-2 ring-rose-500/40 scale-105"
                            : "bg-black/55 border-white/20 text-white/90 group-hover:bg-white/20"
                        )}>
                          <Heart className={cn("size-4.5 sm:size-5", isLiked ? "fill-rose-500 text-rose-500" : "text-white")} />
                        </div>
                        <span className="text-[10px] font-extrabold tracking-tight text-white/90 drop-shadow-sm">
                          {likes}
                        </span>
                      </button>

                      {/* Comments Button */}
                      <button
                        onClick={() => { tgHaptic('light'); handleOpenComments(reel); }}
                        className="flex flex-col items-center gap-0.5 group cursor-pointer"
                        title="Izohlar"
                      >
                        <div className="size-9 sm:size-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-white/90 group-hover:bg-white/20 backdrop-blur-xl transition-all active:scale-75 shadow-lg">
                          <MessageCircle className="size-4.5 sm:size-5 text-white" />
                        </div>
                        <span className="text-[10px] font-extrabold tracking-tight text-white/90 drop-shadow-sm">
                          {commentCounts[reel.id] ?? reel.comments_count ?? 0}
                        </span>
                      </button>

                      {/* Telegram Share Button */}
                      <button
                        onClick={() => handleShare(reel)}
                        className="flex flex-col items-center gap-0.5 group cursor-pointer"
                        title="Ulashish"
                      >
                        <div className="size-9 sm:size-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-sky-300 group-hover:bg-sky-500/20 backdrop-blur-xl transition-all active:scale-75 shadow-lg">
                          <Send className="size-4 -translate-x-0.5" />
                        </div>
                        <span className="text-[9px] font-bold text-white/80">
                          Ulashish
                        </span>
                      </button>

                      {/* Sound Toggle */}
                      <button
                        onClick={() => { tgHaptic('light'); setSoundEnabled(!soundEnabled); }}
                        className="size-7.5 sm:size-8 rounded-full bg-black/55 border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90 cursor-pointer"
                        title={soundEnabled ? "Ovozsiz" : "Ovozni yoqish"}
                      >
                        {soundEnabled ? <Volume2 className="size-3 text-emerald-400" /> : <VolumeX className="size-3 text-white/50" />}
                      </button>
                    </div>

                    {/* ── 3. MAIN HERO CONTENT: Question Glass Card + Vertical Options ── */}
                    <div className="relative z-10 my-auto py-1 w-full pr-12 sm:pr-14 space-y-2 sm:space-y-2.5">
                      {/* Frosted Glass Question Card */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold tracking-wider text-amber-300 uppercase flex items-center gap-1">
                            <Sparkles className="size-3 text-amber-400" />
                            Savol
                          </span>
                          <span className="text-[10px] text-white/60 font-medium">
                            {studentCount} o&apos;quvchi adashgan
                          </span>
                        </div>
                        <h2 className="text-xs sm:text-sm font-bold leading-snug tracking-tight text-white drop-shadow-sm">
                          {reel.quiz.question || reel.hook}
                        </h2>
                      </div>

                      {/* ── 4. VERTICAL 1-COLUMN OPTIONS STACK (A, B, C, D) ── */}
                      <div className="flex flex-col gap-1.5 sm:gap-2 w-full">
                        {reel.quiz.options.map((opt, optIdx) => {
                          const cleanOpt = cleanOptionText(opt);
                          const letter = OPTION_LETTERS[optIdx] || `${optIdx + 1}`;
                          const isSelected = quizAnswer?.selectedIndex === optIdx;
                          const isCorrectOption = quizAnswer?.correctIndex === optIdx;
                          const hasAnswered = !!quizAnswer;

                          let btnClass = "bg-white/[0.08] hover:bg-white/[0.15] border-white/15 text-white shadow-sm";
                          let badgeClass = "bg-white/15 text-white/90 border-white/20";

                          if (hasAnswered) {
                            if (isCorrectOption) {
                              btnClass = "bg-emerald-600/90 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.5)]";
                              badgeClass = "bg-emerald-800 text-white border-emerald-400";
                            } else if (isSelected && !quizAnswer.isCorrect) {
                              btnClass = "bg-rose-600/90 border-rose-400 text-white opacity-90 ring-2 ring-rose-400/50 shadow-[0_0_16px_rgba(244,63,94,0.4)]";
                              badgeClass = "bg-rose-800 text-white border-rose-400";
                            } else {
                              btnClass = "bg-white/[0.03] border-white/10 text-white/35";
                              badgeClass = "bg-white/[0.05] text-white/25 border-transparent";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasAnswered}
                              onClick={() => handleAnswerQuiz(reel.id, optIdx)}
                              className={cn(
                                "w-full min-h-[42px] sm:min-h-[44px] py-2 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-left border flex items-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer",
                                btnClass
                              )}
                            >
                              <span className={cn("size-6 sm:size-7 rounded-lg sm:rounded-xl border flex items-center justify-center text-xs font-black shrink-0 shadow-inner", badgeClass)}>
                                {letter}
                              </span>
                              <span className="text-xs sm:text-sm font-medium leading-tight flex-1 break-words">
                                {cleanOpt}
                              </span>
                              {hasAnswered && isCorrectOption && (
                                <CheckCircle2 className="size-4 text-emerald-300 shrink-0 ml-auto" />
                              )}
                              {hasAnswered && isSelected && !quizAnswer.isCorrect && (
                                <XCircle className="size-4 text-rose-300 shrink-0 ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* ── 5. EXPLANATION CARD (Animated when answered) ── */}
                      {quizAnswer && (
                        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-black/80 border border-white/20 backdrop-blur-xl space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={quizAnswer.isCorrect ? "text-emerald-400 flex items-center gap-1" : "text-rose-400 flex items-center gap-1"}>
                              {quizAnswer.isCorrect ? "✅ To'g'ri javob! (+5 XP)" : "❌ Noto'g'ri javob"}
                            </span>
                            <button
                              onClick={() => { tgHaptic('light'); scrollToReel(index + 1); }}
                              disabled={index === reels.length - 1}
                              className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-30"
                            >
                              Keyingisi &darr;
                            </button>
                          </div>
                          <p className="text-[11px] sm:text-xs text-white/90 leading-relaxed font-normal">
                            💡 <span className="font-semibold text-white">{quizAnswer.explanation}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── 6. BOTTOM SWIPE / NEXT HINT ── */}
                    <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/10 text-white/60 text-xs shrink-0">
                      <button
                        onClick={() => { tgHaptic('light'); scrollToReel(index + 1); }}
                        disabled={index === reels.length - 1}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white/70 hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                      >
                        <span>Keyingi bilim</span>
                        <ChevronDown className="size-3.5 animate-bounce" />
                      </button>
                      <span className="text-[9px] sm:text-[10px] font-mono text-white/50">
                        Tepaga suring &uarr;
                      </span>
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
        <div className="hidden lg:flex flex-col gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => scrollToReel(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="size-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 shadow-lg transition-all active:scale-95 backdrop-blur-md cursor-pointer"
            title="Oldingi (Up)"
          >
            <ChevronUp className="size-5" />
          </button>
          <button
            onClick={() => scrollToReel(currentIndex + 1)}
            disabled={currentIndex >= reels.length - 1}
            className="size-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 shadow-lg transition-all active:scale-95 backdrop-blur-md cursor-pointer"
            title="Keyingi (Down)"
          >
            <ChevronDown className="size-5" />
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
                  comments.map((c) => {
                    const isReply = Boolean(c.parent_id);
                    return (
                      <div key={c.id} className={cn("flex gap-2.5 items-start group", isReply && "ml-5 pl-2 border-l-2 border-emerald-500/40")}>
                        {isReply && <CornerDownRight className="w-3 h-3 text-emerald-400 mt-2 shrink-0" />}
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-extrabold text-[10px] shrink-0 shadow-md overflow-hidden mt-0.5">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                          ) : (
                            c.user_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white/90">{c.user_name}</span>
                            <span className="text-[10px] text-white/40 font-mono">{c.created_at}</span>
                          </div>
                          <p className="text-xs text-white/80 leading-relaxed break-words">{c.text}</p>
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({ id: c.id, userName: c.user_name });
                                setNewCommentText(`@${c.user_name} `);
                              }}
                              className="text-[10px] font-semibold text-emerald-400 hover:underline"
                            >
                              Javob berish
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Meme Stickers */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-white/10">
                <span className="text-[10px] text-white/50 font-bold shrink-0">Stiker:</span>
                {REELS_STUDY_MEMES.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewCommentText((prev) => (prev ? prev + ' ' : '') + m.text)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 shrink-0 transition-colors"
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Replying To Banner */}
              {replyingTo && (
                <div className="flex items-center justify-between text-xs px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300">
                  <span className="truncate">💬 <b>@{replyingTo.userName}</b> ga javob berilmoqda</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-white/60 hover:text-white ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Input Footer */}
              <form onSubmit={handleSendComment} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Fikr, javob yoki stiker yozing..."
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
    </>
  );
}
