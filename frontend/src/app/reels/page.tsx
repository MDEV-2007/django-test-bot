'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  Heart, Send, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Flame, Zap, BookOpen,
  Swords, MessageCircle, X, CornerDownRight,
  Bookmark, Plus, Share2, AlertTriangle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { useFeatureFlags } from '@/lib/features';
import { tgHaptic, openTelegramLink } from '@/lib/telegram';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import VerifiedBadge from '@/components/ui/verified-badge';
import { cn } from '@/lib/utils';

function cleanOptionText(text: string): string {
  if (!text) return '';
  return text.replace(/^[A-Za-z0-9][\)\.\:\-]\s*/, '').trim();
}

type FormattedQuestion = {
  prompt: string;
  romanItems: string[];
  letterItems: string[];
  isMatching: boolean;
};

function formatQuestionText(text: string): FormattedQuestion {
  if (!text) return { prompt: '', romanItems: [], letterItems: [], isMatching: false };

  let t = text;

  t = t.replace(/([a-z0-9"”»\.\:\;])\s*(I{1,3}|IV|V|VI{1,3}|IX|X)[\.\:\)]/gi, '$1\n$2. ');
  t = t.replace(/([a-z"”»])\s*(II|III|IV|V|VI|VII|VIII|IX|X)([A-Z"“«\s])/g, '$1\n$2. $3');
  t = t.replace(/(I{1,3}|IV|V|VI{1,3}|IX|X)\.\s*([A-Z"“«])/g, '$1. $2');

  t = t.replace(/([a-z0-9"”»\.\,\'\’])([a-h])([A-Z0-9"“«])/g, '$1\n$2) $3');
  t = t.replace(/([a-h][\)\.])\s*([A-Z0-9"“«])/g, '$1 $2');

  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const romanItems: string[] = [];
  const letterItems: string[] = [];
  const promptLines: string[] = [];

  for (const line of lines) {
    if (/^(I{1,3}|IV|V|VI{1,3}|IX|X)[\.\)]/i.test(line)) {
      romanItems.push(line);
    } else if (/^[a-h][\)\.]/i.test(line)) {
      letterItems.push(line);
    } else {
      promptLines.push(line);
    }
  }

  const isMatching = romanItems.length >= 2 && letterItems.length >= 2;

  return {
    prompt: promptLines.join(' ') || text,
    romanItems,
    letterItems,
    isMatching,
  };
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
  role?: string;
  is_superadmin?: boolean;
  is_teacher?: boolean;
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
  author?: {
    id: number;
    name: string;
    username: string;
  } | null;
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

function ReelsInner() {
  const searchParams = useSearchParams();
  const deepLinkReelId = searchParams?.get('reel') || searchParams?.get('challenge');
  const { isEnabled } = useFeatureFlags();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Gamification: Combo streak counter
  const [comboStreak, setComboStreak] = useState(0);

  // Student Question Creator modal state ("Mening qiyin savolim")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState('tarix');
  const [createQuestion, setCreateQuestion] = useState('');
  const [createOptions, setCreateOptions] = useState(['', '', '', '']);
  const [createCorrectIndex, setCreateCorrectIndex] = useState(0);
  const [createExplanation, setCreateExplanation] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // 15-second countdown timer per reel
  const [timeLeft, setTimeLeft] = useState(15);

  // User interactions
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [savedReels, setSavedReels] = useState<Record<number, boolean>>({});
  const [saveCounts, setSaveCounts] = useState<Record<number, number>>({});
  const [answeredQuizzes, setAnsweredQuizzes] = useState<
    Record<number, { selectedIndex: number; isCorrect: boolean; correctIndex: number; explanation: string }>
  >({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [todayXpEarned, setTodayXpEarned] = useState(0);

  // Countdown timer logic
  useEffect(() => {
    setTimeLeft(15);
  }, [currentIndex]);

  useEffect(() => {
    const currentReel = reels[currentIndex];
    if (!currentReel || answeredQuizzes[currentReel.id]) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, reels, answeredQuizzes]);

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
  const loadReels = useCallback(async (subject = 'all') => {
    setLoading(true);
    try {
      const query = subject && subject !== 'all' ? `?subject=${encodeURIComponent(subject)}` : '';
      const data = await apiFetch<ReelsResponse>(`/api/learning/reels/${query}`);
      if (data && data.reels && data.reels.length > 0) {
        setReels(data.reels);
        if (data.subjects) setSubjects(data.subjects);

        const initialLikes: Record<number, number> = {};
        const initialComments: Record<number, number> = {};
        const initialSaves: Record<number, number> = {};
        data.reels.forEach((r) => {
          initialLikes[r.id] = r.likes;
          initialComments[r.id] = r.comments_count || 0;
          initialSaves[r.id] = 25 + ((r.id * 17) % 60);
        });
        setLikeCounts(initialLikes);
        setCommentCounts(initialComments);
        setSaveCounts(initialSaves);

        let targetIndex = 0;
        if (deepLinkReelId) {
          const foundIdx = data.reels.findIndex((r) => r.id === Number(deepLinkReelId));
          if (foundIdx !== -1) {
            targetIndex = foundIdx;
            toast.info("⚔️ Do'stingiz chaqirig'i! Savolga to'g'ri javob topa olasizmi?", { duration: 4000 });
          }
        }
        setCurrentIndex(targetIndex);
        if (targetIndex > 0) {
          setTimeout(() => {
            reelRefs.current[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
        }
      } else {
        setReels([]);
      }
    } catch {
      toast.error("Reels yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [deepLinkReelId]);

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
  }, [currentIndex, reels.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Handle Telegram Challenge to friend
  const handleChallengeFriend = (reel: ReelItem) => {
    if (soundEnabled) soundFX.click();
    tgHaptic('medium');
    const shareUrl = `${window.location.origin}/reels?reel=${reel.id}`;
    const text = encodeURIComponent(
      `⚔️ *BILIM JANGI CHAQIRIG'I!* \n\n` +
      `Men Ilm Ildizi Reels'da ushbu qiyin savolga duch keldim:\n` +
      `❓ "${reel.quiz.question || reel.hook}"\n\n` +
      `Qani, sen bu savolga to'g'ri javob topa olasanmi? O'zingni sinab ko'r:\n` +
      `👉 ${shareUrl}`
    );
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    openTelegramLink(tgUrl);
  };

  // Handle Save / Bookmark
  const handleSave = (reelId: number) => {
    if (soundEnabled) soundFX.click();
    tgHaptic('light');
    const isCurrentlySaved = savedReels[reelId];
    setSavedReels((prev) => ({ ...prev, [reelId]: !isCurrentlySaved }));
    setSaveCounts((prev) => ({
      ...prev,
      [reelId]: (prev[reelId] || 38) + (isCurrentlySaved ? -1 : 1),
    }));
    toast.success(isCurrentlySaved ? "Xatcho'plardan olindi" : "Xatcho'plarga saqlandi! ⭐");
  };

  // Handle Quiz Answer with Combo Multiplier
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

          const nextCombo = comboStreak + 1;
          setComboStreak(nextCombo);

          let bonusXp = 0;
          let comboMessage = `To'g'ri javob! +${res.xp_earned} XP 🔥`;
          if (nextCombo >= 5) {
            bonusXp = 10;
            comboMessage = `👑 5x DAHO COMBO! +${res.xp_earned + bonusXp} XP 🚀`;
          } else if (nextCombo >= 3) {
            bonusXp = 5;
            comboMessage = `⚡ 3x MEGA COMBO! +${res.xp_earned + bonusXp} XP 🔥`;
          } else if (nextCombo >= 2) {
            bonusXp = 2;
            comboMessage = `🔥 2x COMBO! +${res.xp_earned + bonusXp} XP ✨`;
          }

          setTodayXpEarned((prev) => prev + (res.xp_earned || 5) + bonusXp);
          toast.success(comboMessage, { duration: 3000 });
        } else {
          if (soundEnabled) soundFX.incorrect();
          tgHaptic('error');
          if (comboStreak >= 2) {
            toast.info(`Combo to'xtadi (${comboStreak}x). Qayta boshlaymiz! 💪`);
          }
          setComboStreak(0);
        }
      }
    } catch {
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
        const nextCombo = comboStreak + 1;
        setComboStreak(nextCombo);
        setTodayXpEarned((prev) => prev + 5);
        toast.success(nextCombo >= 2 ? `🔥 ${nextCombo}x Combo! +5 XP` : "To'g'ri javob! +5 XP 🔥", { duration: 2500 });
      } else {
        if (soundEnabled) soundFX.incorrect();
        tgHaptic('error');
        setComboStreak(0);
      }
    }
  };

  // Submit Student-Created Question to Bilim Reels
  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createQuestion.trim()) {
      toast.error("Savol matnini kiriting");
      return;
    }
    if (createOptions.some((opt) => !opt.trim())) {
      toast.error("Barcha 4 ta variantni to'ldiring");
      return;
    }
    if (!createExplanation.trim()) {
      toast.error("To'g'ri javob izohini kiriting");
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        reel: ReelItem;
        xp_earned: number;
      }>('/api/learning/reels/create/', {
        method: 'POST',
        body: JSON.stringify({
          subject_slug: createSubject,
          question: createQuestion.trim(),
          options: createOptions.map((o) => o.trim()),
          correct_index: createCorrectIndex,
          explanation: createExplanation.trim(),
        }),
      });

      if (res && res.success) {
        if (soundEnabled) soundFX.correct();
        celebrate();
        tgHaptic('success');
        toast.success(res.message || "Savolingiz muvaffaqiyatli qo'shildi! +20 XP berildi 🔥", { duration: 4000 });
        setTodayXpEarned((prev) => prev + (res.xp_earned || 20));

        if (res.reel) {
          setReels((prev) => [res.reel, ...prev]);
          setLikeCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setCommentCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setSaveCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setCurrentIndex(0);
          setTimeout(() => {
            reelRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }

        setCreateQuestion('');
        setCreateOptions(['', '', '', '']);
        setCreateCorrectIndex(0);
        setCreateExplanation('');
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Savolni saqlashda xatolik yuz berdi");
    } finally {
      setIsSubmittingQuestion(false);
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

  const displayCategories = (() => {
    const defaultList = [
      { slug: 'all', name: 'Barchasi' },
      { slug: 'tarix', name: 'Tarix' },
      { slug: 'ona-tili', name: 'Ona tili va adabiyot' },
      { slug: 'biologiya', name: 'Biologiya' },
      { slug: 'matematika', name: 'Matematika' },
      { slug: 'ingliz-tili', name: 'Ingliz tili' },
    ];

    if (!subjects || subjects.length === 0) return defaultList;

    const mapped = subjects
      .filter((s) => s.slug !== 'all' && s.slug !== 'for_you')
      .map((s) => {
        if (s.slug === 'ona-tili') return { ...s, name: 'Ona tili va adabiyot' };
        return s;
      });

    return [{ slug: 'all', name: 'Barchasi' }, ...mapped];
  })();

  if (!isEnabled('reels')) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-[#000000] flex flex-col items-center justify-center p-4">
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
      <main className="page-shell flex-1 w-full flex items-center justify-center !p-0 sm:!p-4 !pb-[4.75rem] md:!pb-4 select-none font-sans min-h-0 bg-[#F2F2F7] dark:bg-[#000000]">
        {/* Main iOS 18 Device Frame Container */}
        <div className="w-full h-[calc(var(--tg-viewport,100dvh)-8.25rem)] md:h-[88vh] sm:max-w-[490px] md:max-w-[510px] relative rounded-none sm:rounded-[34px] overflow-hidden border-0 sm:border border-black/[0.08] dark:border-white/[0.10] shadow-[0_20px_60px_rgba(0,0,0,0.08)] bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white flex flex-col my-auto transition-all">
          
          {/* ── TOP HORIZONTAL iOS NAVIGATION & CAPSULES ── */}
          <header className="shrink-0 z-20 flex items-center justify-between px-3.5 pt-3.5 pb-2.5 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {displayCategories.map((subj) => {
                const isSel = selectedSubject === subj.slug;
                return (
                  <button
                    key={subj.slug}
                    onClick={() => { tgHaptic('select'); setSelectedSubject(subj.slug); }}
                    className={cn(
                      "text-[12px] sm:text-[13px] px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer active:scale-95",
                      isSel
                        ? "bg-[#007AFF] text-white font-semibold shadow-[0_2px_10px_rgba(0,122,255,0.28)]"
                        : "bg-[#767680]/[0.08] dark:bg-[#767680]/[0.20] text-[#8E8E93] hover:text-slate-900 dark:hover:text-white font-medium"
                    )}
                  >
                    {subj.name}
                  </button>
                );
              })}
            </div>

            {/* Sound & XP indicators, +Savol & Combo */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              {comboStreak >= 2 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF9500]/15 border border-[#FF9500]/30 text-[#FF9500] text-[11px] font-bold">
                  <Flame className="size-3.5 fill-[#FF9500]" />
                  <span>{comboStreak}x</span>
                </div>
              )}
              <button
                onClick={() => { tgHaptic('medium'); setIsCreateModalOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] active:scale-95 text-white text-[11px] font-bold shadow-[0_2px_8px_rgba(0,122,255,0.25)] transition-all cursor-pointer"
                title="O'z qiyin savolingizni qo'shing va +20 XP oling"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Savol qo&apos;shish</span>
                <span className="sm:hidden">+Savol</span>
              </button>
              <button
                onClick={() => { tgHaptic('light'); setSoundEnabled(!soundEnabled); }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-all active:scale-90 cursor-pointer",
                  soundEnabled
                    ? "bg-[#007AFF]/12 text-[#007AFF]"
                    : "bg-[#FF3B30]/12 text-[#FF3B30]"
                )}
                title={soundEnabled ? "Ovozsiz qilish" : "Ovozni yoqish"}
              >
                {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              </button>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF9500]/12 border border-[#FF9500]/25 text-[#FF9500] text-[11px] font-bold font-mono">
                <Zap className="size-3 fill-[#FF9500]" />
                <span>+{todayXpEarned}</span>
              </div>
            </div>
          </header>

          {/* ── CARD CONTENT / REELS LIST ── */}
          {loading ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-6 space-y-4 animate-pulse text-center">
              <div className="size-14 rounded-[18px] bg-[#767680]/[0.12] mx-auto" />
              <div className="h-5 w-44 bg-[#767680]/[0.12] rounded-full mx-auto" />
              <div className="h-20 w-full bg-[#767680]/[0.08] rounded-[22px]" />
              <div className="h-36 w-full bg-[#767680]/[0.08] rounded-[22px]" />
            </div>
          ) : reels.length === 0 ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="flex size-14 items-center justify-center rounded-[18px] bg-[#007AFF]/12 text-[#007AFF]">
                <BookOpen className="size-7" />
              </div>
              <h3 className="font-bold text-[17px] text-slate-900 dark:text-white">Reels mavjud emas</h3>
              <p className="text-[13px] text-[#8E8E93] max-w-xs">
                Ushbu fan bo&apos;yicha tezkor savollar tez orada qo&apos;shiladi.
              </p>
              <button
                onClick={() => setSelectedSubject('all')}
                className="px-5 py-2.5 rounded-full bg-[#007AFF] text-white text-[13px] font-bold shadow-[0_4px_14px_rgba(0,122,255,0.28)] cursor-pointer hover:bg-[#0066D6] transition-all active:scale-95"
              >
                Barchasini ko&apos;rish
              </button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full flex-1 overflow-y-auto snap-y snap-mandatory relative no-scrollbar scroll-smooth"
            >
              {reels.map((reel, index) => {
                const isLiked = likedReels[reel.id] || false;
                const likes = likeCounts[reel.id] || reel.likes;
                const isSaved = savedReels[reel.id] || false;
                const savedCount = saveCounts[reel.id] || 38;
                const quizAnswer = answeredQuizzes[reel.id];
                const hasAnswered = !!quizAnswer;

                const failRate = Math.min(88, Math.max(35, 48 + ((reel.id * 11) % 35)));
                const formattedQ = formatQuestionText(reel.quiz.question || reel.hook);
                const isLongQuestion = (formattedQ.prompt?.length || 0) > 140 || formattedQ.isMatching;

                return (
                  <div
                    key={reel.id}
                    ref={(el) => { reelRefs.current[index] = el; }}
                    data-index={index}
                    className="h-full w-full snap-start snap-always shrink-0 relative flex flex-col justify-between p-4 sm:p-5 overflow-y-auto no-scrollbar select-none bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white"
                  >
                    {/* ── TOP SECTION: iOS Callout Card & Dynamic Island Timer ── */}
                    <div className="space-y-3 shrink-0">
                      {reel.author && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20 text-[#007AFF] text-[11px] font-bold w-fit">
                          <Sparkles className="size-3.5" />
                          <span>Muallif: @{reel.author.username || reel.author.name}</span>
                          <span className="text-[10px] bg-[#007AFF]/15 px-1.5 py-0.5 rounded-full font-extrabold">
                            Hamjamiyat
                          </span>
                        </div>
                      )}

                      {/* iOS Amber Callout Banner */}
                      <div className="rounded-[20px] bg-[#FF9500]/[0.10] border border-[#FF9500]/25 p-3 sm:p-3.5 flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FF9500] text-white shadow-xs mt-0.5">
                          <AlertTriangle className="size-4" />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF9500]">
                            MURAKKAB SAVOL · {reel.subject_name}
                          </h4>
                          <p className="text-[12px] text-slate-700 dark:text-slate-200 leading-snug">
                            O&apos;quvchilarning <strong>{failRate}%</strong> i bu savolda yiqilgan. Diqqat bilan belgilang!
                          </p>
                        </div>
                      </div>

                      {/* Question Counter & Dynamic Island Timer Row */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between text-[12px] sm:text-[13px] font-semibold">
                          <div className="flex items-center gap-2 text-[#8E8E93]">
                            <span className="size-2 rounded-full bg-[#007AFF] shrink-0" />
                            <span>{index + 1}-savol / {reels.length}</span>
                          </div>
                          <div className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[12px] font-bold",
                            hasAnswered
                              ? "bg-[#34C759]/12 text-[#34C759]"
                              : timeLeft <= 4
                              ? "bg-[#FF3B30]/15 text-[#FF3B30] animate-pulse"
                              : "bg-[#5856D6]/12 text-[#5856D6]"
                          )}>
                            <Clock className="size-3.5" />
                            <span>{hasAnswered ? "Yechildi" : `${timeLeft}s`}</span>
                          </div>
                        </div>

                        {/* iOS Progress Bar */}
                        <div className="h-1.5 w-full bg-[#767680]/[0.12] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-linear",
                              hasAnswered
                                ? "bg-[#34C759]"
                                : timeLeft <= 4
                                ? "bg-[#FF3B30]"
                                : "bg-[#007AFF]"
                            )}
                            style={{ width: `${hasAnswered ? 100 : Math.max(5, (timeLeft / 15) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── MIDDLE SECTION: Question & iOS Option Rows ── */}
                    <div className="flex-1 flex flex-col justify-center py-2.5 sm:py-3 min-h-0 space-y-3 overflow-hidden">
                      {reel.media_type === 'video' && reel.video_url && (
                        <div className="w-full h-36 rounded-[20px] overflow-hidden bg-black shrink-0 relative">
                          <video
                            src={reel.video_url}
                            className="w-full h-full object-cover"
                            autoPlay={currentIndex === index}
                            loop
                            playsInline
                            muted={!soundEnabled}
                          />
                        </div>
                      )}

                      {formattedQ.isMatching ? (
                        <div className="space-y-2 max-h-[28vh] overflow-y-auto no-scrollbar p-3.5 rounded-[20px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.07]">
                          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                            {formattedQ.prompt}
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                            <div className="space-y-1 bg-white dark:bg-[#1C1C1E] p-2.5 rounded-[14px] border border-black/[0.05] dark:border-white/[0.07]">
                              <span className="text-[10px] font-extrabold text-[#FF9500] uppercase block mb-1">
                                📌 Atamalar:
                              </span>
                              {formattedQ.romanItems.map((item, idx) => (
                                <div key={idx} className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                                  {item}
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1 bg-white dark:bg-[#1C1C1E] p-2.5 rounded-[14px] border border-black/[0.05] dark:border-white/[0.07]">
                              <span className="text-[10px] font-extrabold text-[#007AFF] uppercase block mb-1">
                                📝 Izohlar:
                              </span>
                              {formattedQ.letterItems.map((item, idx) => (
                                <div key={idx} className="text-slate-700 dark:text-slate-300 leading-snug">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "overflow-y-auto pr-1 no-scrollbar space-y-1",
                          isLongQuestion ? "max-h-[26vh] sm:max-h-[30vh]" : "max-h-[22vh]"
                        )}>
                          <h2 className={cn(
                            "font-extrabold tracking-[-0.015em] text-slate-900 dark:text-white leading-snug",
                            (formattedQ.prompt?.length || 0) > 180
                              ? "text-[13px] sm:text-[14px]"
                              : (formattedQ.prompt?.length || 0) > 90
                              ? "text-[15px] sm:text-[16px]"
                              : "text-[17px] sm:text-[19px]"
                          )}>
                            {formattedQ.prompt}
                          </h2>
                        </div>
                      )}

                      {/* Option Cards (A, B, C, D with iOS Squircle Letter Badges) */}
                      <div className="space-y-2 sm:space-y-2.5 w-full shrink-0">
                        {reel.quiz.options.map((opt, optIdx) => {
                          const cleanOpt = cleanOptionText(opt);
                          const letter = OPTION_LETTERS[optIdx] || `${optIdx + 1}`;
                          const isSelected = quizAnswer?.selectedIndex === optIdx;
                          const isCorrectOption = quizAnswer?.correctIndex === optIdx;

                          let cardStyle = "border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/75 dark:bg-[#2C2C2E] hover:border-[#007AFF]/50 text-slate-900 dark:text-white";
                          let badgeStyle = "bg-white dark:bg-[#1C1C1E] text-slate-800 dark:text-slate-200 shadow-xs";

                          if (hasAnswered) {
                            if (isCorrectOption) {
                              cardStyle = "border-2 border-[#34C759] bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]";
                              badgeStyle = "bg-[#34C759] text-white";
                            } else if (isSelected && !quizAnswer.isCorrect) {
                              cardStyle = "border-2 border-[#FF3B30] bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF453A]";
                              badgeStyle = "bg-[#FF3B30] text-white";
                            } else {
                              cardStyle = "border-black/[0.04] dark:border-white/[0.04] bg-[#F2F2F7]/40 dark:bg-[#2C2C2E]/40 text-[#8E8E93] opacity-60";
                              badgeStyle = "bg-white/60 dark:bg-[#1C1C1E]/60 text-[#8E8E93]";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasAnswered}
                              onClick={() => handleAnswerQuiz(reel.id, optIdx)}
                              className={cn(
                                "w-full p-3 sm:p-3.5 rounded-[18px] border text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-[0.985]",
                                cardStyle
                              )}
                            >
                              <div className={cn("size-8 rounded-[10px] flex items-center justify-center font-mono font-bold text-[13px] shrink-0 transition-colors", badgeStyle)}>
                                {letter}
                              </div>
                              <span className="text-[13px] sm:text-[14px] font-semibold flex-1 leading-snug break-words">
                                {cleanOpt}
                              </span>
                              {hasAnswered && isCorrectOption && (
                                <CheckCircle2 className="size-5 text-[#34C759] shrink-0" />
                              )}
                              {hasAnswered && isSelected && !quizAnswer.isCorrect && (
                                <XCircle className="size-5 text-[#FF3B30] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Card when Answered */}
                      {quizAnswer && (
                        <div className="p-3.5 rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5 animate-in fade-in duration-300 shrink-0">
                          <div className="flex items-center justify-between text-[12px] font-bold">
                            <span className={quizAnswer.isCorrect ? "text-[#34C759] flex items-center gap-1" : "text-[#FF3B30] flex items-center gap-1"}>
                              {quizAnswer.isCorrect ? "✅ To'g'ri javob! (+5 XP)" : "❌ Noto'g'ri javob"}
                            </span>
                            <button
                              onClick={() => { tgHaptic('light'); scrollToReel(index + 1); }}
                              disabled={index === reels.length - 1}
                              className="text-[12px] text-[#007AFF] hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-30"
                            >
                              Keyingi savol &darr;
                            </button>
                          </div>
                          <p className="text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed">
                            💡 <span className="font-medium">{quizAnswer.explanation}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── BOTTOM iOS ENGAGEMENT BAR ── */}
                    <div className="pt-3 pb-1 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[#8E8E93] text-[12px] sm:text-[13px] font-semibold shrink-0">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Heart / Like */}
                        <button
                          onClick={(e) => handleLike(reel.id, e)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all cursor-pointer active:scale-95",
                            isLiked ? "bg-[#FF2D55]/12 text-[#FF2D55]" : "hover:bg-[#767680]/[0.08]"
                          )}
                          title="Yoqdi"
                        >
                          <Heart className={cn("size-4", isLiked && "fill-[#FF2D55]")} />
                          <span className="font-mono font-bold text-[12px]">{likes}</span>
                        </button>

                        {/* Comment */}
                        <button
                          onClick={() => { tgHaptic('light'); handleOpenComments(reel); }}
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 hover:bg-[#767680]/[0.08] hover:text-[#007AFF] transition-all cursor-pointer active:scale-95"
                          title="Izohlar"
                        >
                          <MessageCircle className="size-4 text-[#007AFF]" />
                          <span className="font-mono font-bold text-[12px]">{commentCounts[reel.id] ?? reel.comments_count ?? 0}</span>
                        </button>

                        {/* Bookmark / Save */}
                        <button
                          onClick={() => handleSave(reel.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all cursor-pointer active:scale-95",
                            isSaved ? "bg-[#FF9500]/12 text-[#FF9500]" : "hover:bg-[#767680]/[0.08]"
                          )}
                          title="Xatcho'pga saqlash"
                        >
                          <Bookmark className={cn("size-4", isSaved && "fill-[#FF9500]")} />
                          <span className="font-mono font-bold text-[12px]">{savedCount}</span>
                        </button>
                      </div>

                      {/* Action buttons: Challenge & Share */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleChallengeFriend(reel)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF9500]/12 hover:bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/25 transition-all cursor-pointer font-bold text-[12px] active:scale-95"
                          title="Do'stga Telegram chaqiriq yuborish"
                        >
                          <Swords className="size-3.5" />
                          <span>Chaqiriq ⚔️</span>
                        </button>

                        <button
                          onClick={() => handleShare(reel)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#007AFF]/12 hover:bg-[#007AFF]/20 text-[#007AFF] transition-all cursor-pointer font-bold text-[12px] active:scale-95"
                          title="Telegram'ga ulashish"
                        >
                          <Share2 className="size-3.5" />
                          <span className="hidden xs:inline">Ulashish</span>
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
            className="fixed pointer-events-none z-50 text-[#FF2D55] text-2xl animate-ping"
            style={{ left: heart.x, top: heart.y }}
          >
            ❤️
          </div>
        ))}

        {/* Desktop Navigation Floating iOS Pill Dock beside the card */}
        <div className="hidden lg:flex flex-col items-center gap-2 fixed right-4 xl:right-10 top-1/2 -translate-y-1/2 z-30 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.10] p-2 rounded-[22px] shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => scrollToReel(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="size-10 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white flex items-center justify-center disabled:opacity-25 transition-all active:scale-95 cursor-pointer"
            title="Oldingi savol (Klaviatura ↑)"
          >
            <ChevronUp className="size-5" />
          </button>
          <div className="text-[11px] font-mono font-bold text-[#8E8E93] py-0.5">
            {currentIndex + 1} / {reels.length}
          </div>
          <button
            onClick={() => scrollToReel(currentIndex + 1)}
            disabled={currentIndex >= reels.length - 1}
            className="size-10 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white flex items-center justify-center disabled:opacity-25 transition-all active:scale-95 cursor-pointer"
            title="Keyingi savol (Klaviatura ↓)"
          >
            <ChevronDown className="size-5" />
          </button>
        </div>

        {/* ── COMMENTS iOS BOTTOM SHEET MODAL ── */}
        {activeCommentReel && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setActiveCommentReel(null)}
          >
            <div
              className="w-full sm:max-w-lg bg-white dark:bg-[#1C1C1E] border-t sm:border border-black/[0.08] dark:border-white/[0.10] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col h-[75vh] sm:h-[580px] shadow-2xl relative text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-[#8E8E93]/30 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-[10px] bg-[#007AFF] text-white">
                    <MessageCircle className="size-4" />
                  </div>
                  <h3 className="font-bold text-[16px] text-slate-900 dark:text-white">
                    Izohlar ({commentCounts[activeCommentReel.id] ?? comments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveCommentReel(null)}
                  className="size-8 rounded-full bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] flex items-center justify-center text-[#8E8E93] transition-all active:scale-95 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
                {commentsLoading ? (
                  <div className="space-y-3 py-6 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="size-8 rounded-full bg-[#767680]/[0.12] shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-28 bg-[#767680]/[0.12] rounded" />
                          <div className="h-4 w-full bg-[#767680]/[0.08] rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#8E8E93]">
                    <div className="size-12 rounded-full bg-[#767680]/[0.10] flex items-center justify-center mb-1">
                      <MessageCircle className="size-6" />
                    </div>
                    <p className="font-bold text-[15px] text-slate-900 dark:text-white">Hozircha izohlar yo&apos;q</p>
                    <p className="text-[12px]">Birinchi bo&apos;lib fikr bildiring va muhokamani boshlang!</p>
                  </div>
                ) : (
                  comments.map((c) => {
                    const isReply = Boolean(c.parent_id);
                    return (
                      <div key={c.id} className={cn("flex gap-2.5 items-start group", isReply && "ml-5 pl-2 border-l-2 border-[#007AFF]/40")}>
                        {isReply && <CornerDownRight className="size-3 text-[#007AFF] mt-2 shrink-0" />}
                        <div className="size-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-extrabold text-[10px] shrink-0 shadow-xs overflow-hidden mt-0.5">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                          ) : (
                            c.user_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[18px] p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white truncate">{c.user_name}</span>
                              <VerifiedBadge role={c.role} isSuperadmin={c.is_superadmin} isTeacher={c.is_teacher} size="xs" />
                            </div>
                            <span className="text-[10px] text-[#8E8E93] font-mono shrink-0">{c.created_at}</span>
                          </div>
                          <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed break-words">{c.text}</p>
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({ id: c.id, userName: c.user_name });
                                setNewCommentText(`@${c.user_name} `);
                              }}
                              className="text-[11px] font-bold text-[#007AFF] hover:underline cursor-pointer"
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
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] text-[#8E8E93] font-bold shrink-0">Stiker:</span>
                {REELS_STUDY_MEMES.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewCommentText((prev) => (prev ? prev + ' ' : '') + m.text)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#767680]/[0.10] hover:bg-[#767680]/[0.18] text-slate-800 dark:text-slate-200 shrink-0 transition-colors cursor-pointer"
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {replyingTo && (
                <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-[12px] text-[#007AFF]">
                  <span className="truncate">💬 <b>@{replyingTo.userName}</b> ga javob berilmoqda</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-[#8E8E93] hover:text-slate-900 dark:hover:text-white ml-2 cursor-pointer"
                  >
                    <X className="size-3.5" />
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
                  className="flex-1 bg-[#767680]/[0.10] dark:bg-[#2C2C2E] border border-transparent focus:border-[#007AFF] rounded-full px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-[#8E8E93] focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submittingComment}
                  className="px-4 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <span>Yuborish</span>
                  <Send className="size-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── STUDENT QUESTION CREATION iOS BOTTOM SHEET ("Mening qiyin savolim") ── */}
        {isCreateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div
              className="w-full sm:max-w-xl bg-white dark:bg-[#1C1C1E] border-t sm:border border-black/[0.08] dark:border-white/[0.10] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-[#8E8E93]/30 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-[12px] bg-[#007AFF] text-white shadow-xs">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-slate-900 dark:text-white">
                      Mening qiyin savolim (Reels)
                    </h3>
                    <p className="text-[12px] text-[#8E8E93]">
                      O&apos;quvchilarni sinovdan o&apos;tkazing va +20 XP oling!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="size-8 rounded-full bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] flex items-center justify-center text-[#8E8E93] transition-all active:scale-95 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateQuestionSubmit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
                    Fan:
                  </label>
                  <select
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#007AFF]"
                  >
                    <option value="tarix">Tarix</option>
                    <option value="ona-tili">Ona tili va adabiyot</option>
                    <option value="biologiya">Biologiya</option>
                    <option value="matematika">Matematika</option>
                    <option value="ingliz-tili">Ingliz tili</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
                    Savol matni:
                  </label>
                  <textarea
                    rows={3}
                    value={createQuestion}
                    onChange={(e) => setCreateQuestion(e.target.value)}
                    placeholder="Masalan: Qaysi sulola davrida Mirzo Ulug'bek madrasasi qurilgan?.."
                    required
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] text-slate-900 dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#007AFF] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider flex items-center justify-between">
                    <span>Variantlar (To&apos;g&apos;ri javobni tanlang):</span>
                    <span className="text-[12px] text-[#34C759] font-bold normal-case">
                      To&apos;g&apos;ri javob: {OPTION_LETTERS[createCorrectIndex]}
                    </span>
                  </label>
                  <div className="space-y-2">
                    {createOptions.map((opt, idx) => {
                      const letter = OPTION_LETTERS[idx];
                      const isCorrect = createCorrectIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-[14px] border transition-all",
                            isCorrect
                              ? "border-[#34C759] bg-[#34C759]/10"
                              : "border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => { tgHaptic('select'); setCreateCorrectIndex(idx); }}
                            className={cn(
                              "size-7 rounded-[9px] font-mono font-bold text-[12px] flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                              isCorrect
                                ? "bg-[#34C759] text-white"
                                : "bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200"
                            )}
                            title={`${letter} variantini to'g'ri deb belgilash`}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...createOptions];
                              next[idx] = e.target.value;
                              setCreateOptions(next);
                            }}
                            placeholder={`${letter} varianti matni...`}
                            required
                            maxLength={200}
                            className="flex-1 bg-transparent border-0 px-2 py-1 text-[13px] text-slate-900 dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
                    To&apos;g&apos;ri javob izohi / tushuntirish:
                  </label>
                  <textarea
                    rows={2}
                    value={createExplanation}
                    onChange={(e) => setCreateExplanation(e.target.value)}
                    placeholder="Nima uchun bu javob to'g'ri ekanligini qisqacha izohlang..."
                    required
                    maxLength={350}
                    className="w-full px-3.5 py-2.5 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] text-slate-900 dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#007AFF] resize-none"
                  />
                </div>

                <div className="p-3.5 rounded-[16px] bg-[#FF9500]/10 border border-[#FF9500]/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#FF9500] font-semibold">
                    <Zap className="size-4 fill-[#FF9500]" />
                    <span>Tasdiqlanganda darhol hisobingizga mukofot:</span>
                  </div>
                  <span className="font-mono font-bold text-[#FF9500] bg-[#FF9500]/15 px-2.5 py-1 rounded-full text-xs">
                    +20 XP 🔥
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-full bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] text-slate-800 dark:text-white font-semibold text-[13px] cursor-pointer transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQuestion}
                    className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-[13px] flex items-center gap-2 shadow-[0_4px_14px_rgba(0,122,255,0.28)] cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSubmittingQuestion ? (
                      <span>Yuklanmoqda...</span>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Reels&apos;ga joylash (+20 XP)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function ReelsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] flex items-center justify-center p-4">
          <div className="size-10 rounded-full border-3 border-[#007AFF] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ReelsInner />
    </Suspense>
  );
}
