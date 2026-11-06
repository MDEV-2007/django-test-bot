'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  Heart, Send, Volume2, VolumeX,
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
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';
import { IlmIcon, ILM_STICKERS, withIlmIcons } from '@/components/brand/IlmIcons';

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
            const container = containerRef.current;
            const targetEl = reelRefs.current[targetIndex];
            if (container && targetEl) {
              container.scrollTo({ top: targetEl.offsetTop, behavior: 'smooth' });
            }
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
    const container = containerRef.current;
    const targetEl = reelRefs.current[index];
    if (container && targetEl) {
      container.scrollTo({ top: targetEl.offsetTop, behavior: 'smooth' });
    }
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

          // XP faqat server bergan miqdor (combo — faqat vizual, qo'shimcha XP bermaydi).
          const xp = res.xp_earned || 0;
          const xpText = xp ? ` +${xp} XP` : '';
          let comboMessage = `To'g'ri javob!${xpText} 🔥`;
          if (nextCombo >= 5) comboMessage = `👑 5x DAHO COMBO!${xpText} 🚀`;
          else if (nextCombo >= 3) comboMessage = `⚡ 3x MEGA COMBO!${xpText} 🔥`;
          else if (nextCombo >= 2) comboMessage = `🔥 2x COMBO!${xpText} ✨`;

          setTodayXpEarned((prev) => prev + xp);
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
      // Javob kaliti klientda yo'q (serverda tekshiriladi) — xatoda soxta natija ko'rsatilmaydi.
      toast.error("Javobni tekshirib bo'lmadi. Qayta urinib ko'ring.");
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
          quiz_question: createQuestion.trim(),
          options: createOptions.map((o) => o.trim()),
          correct_index: createCorrectIndex,
          explanation: createExplanation.trim(),
        }),
      });

      if (res && res.success) {
        if (soundEnabled) soundFX.correct();
        celebrate();
        tgHaptic('success');
        // Faqat server bergan XP ko'rsatiladi (audit FE-004): kunlik limit tugagan bo'lsa 0.
        toast.success(res.message || "Savolingiz muvaffaqiyatli qo'shildi!", { duration: 4000 });
        setTodayXpEarned((prev) => prev + (res.xp_earned ?? 0));

        if (res.reel) {
          setReels((prev) => [res.reel, ...prev]);
          setLikeCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setCommentCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setSaveCounts((prev) => ({ ...prev, [res.reel.id]: 0 }));
          setCurrentIndex(0);
          setTimeout(() => {
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div className="fixed inset-0 z-50 bg-[#F7F4EF] dark:bg-[#140F1E] flex flex-col items-center justify-center p-4">
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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell hideTopbarOnMobile />
      <main className="page-shell flex-1 w-full h-[var(--tg-viewport,100dvh)] lg:h-[calc(100dvh-3.75rem)] overflow-hidden flex items-stretch lg:items-center justify-center !p-0 sm:!p-3 !pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:!pb-4 select-none font-sans min-h-0">
        {/* Main iOS 18 Device Frame Container */}
        <div className="w-full h-full lg:h-[86vh] sm:max-w-[490px] md:max-w-[510px] relative flex flex-col overflow-hidden rounded-none border-0 bg-[#FFFCF7] text-[#080808] shadow-[0_30px_60px_-30px_rgba(60,30,110,0.55)] transition-all dark:bg-[#1C1726] dark:text-[#F6F1EA] sm:rounded-[36px] lg:my-auto">
          
          {/* ── TOP HORIZONTAL iOS NAVIGATION & CAPSULES ── */}
          <header className="shrink-0 z-20 flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-black/[0.06] bg-[#FFFCF7]/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1C1726]/90">
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
                        ? "bg-[#080808] font-bold text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]"
                        : "bg-[#F7F4EF] font-semibold text-[#6B6577] hover:text-[#080808] dark:bg-white/[0.08] dark:text-[#A79FB8] dark:hover:text-white"
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
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFB82E]/15 border border-[#FFB82E]/30 text-[#FFB82E] text-[12px] font-bold">
                  <Flame className="size-3.5 fill-[#FFB82E]" />
                  <span>{comboStreak}x</span>
                </div>
              )}
              <button
                onClick={() => { tgHaptic('medium'); setIsCreateModalOpen(true); }}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-[#7659C7] px-3 py-1.5 text-[12px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95"
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
                    ? "bg-[#7659C7]/12 text-[#7659C7]"
                    : "bg-[#F0523D]/12 text-[#F0523D]"
                )}
                title={soundEnabled ? "Ovozsiz qilish" : "Ovozni yoqish"}
              >
                {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              </button>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFB82E]/12 border border-[#FFB82E]/25 text-[#FFB82E] text-[12px] font-bold font-mono">
                <Zap className="size-3 fill-[#FFB82E]" />
                <span>+{todayXpEarned}</span>
              </div>
            </div>
          </header>

          {/* ── CARD CONTENT / REELS LIST ── */}
          {loading ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-6 space-y-4 animate-pulse text-center">
              <div className="size-14 rounded-[18px] bg-[#767680]/[0.12] mx-auto" />
              <div className="h-5 w-44 bg-[#767680]/[0.12] rounded-full mx-auto" />
              <div className="h-20 w-full bg-[#767680]/[0.08] rounded-[18px]" />
              <div className="h-36 w-full bg-[#767680]/[0.08] rounded-[18px]" />
            </div>
          ) : reels.length === 0 ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <span className="relative inline-flex size-20 items-center justify-center rounded-full bg-[#FFB82E] text-[#080808]">
                <span aria-hidden className="absolute -right-2 -top-1 size-7 rounded-full bg-[#7659C7]" />
                <BookOpen className="relative size-9" />
              </span>
              <h3 className="font-[family-name:var(--font-grotesk)] text-[26px] font-bold tracking-[-0.03em]">Reels hali yo&apos;q</h3>
              <p className="max-w-xs text-[13.5px] text-[#6B6577] dark:text-[#A79FB8]">
                Ushbu fan bo&apos;yicha tezkor savollar tez orada qo&apos;shiladi.
              </p>
              <button
                onClick={() => setSelectedSubject('all')}
                className="cursor-pointer rounded-full bg-[#080808] px-5 py-3 text-[13px] font-bold text-[#FFFCF7] transition-all hover:-translate-y-0.5 active:scale-95 dark:bg-[#FFFCF7] dark:text-[#080808]"
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
                    className="h-full w-full snap-start snap-always shrink-0 relative flex flex-col justify-between p-4 sm:p-5 overflow-y-auto no-scrollbar select-none bg-[#FFFCF7] text-[#080808] dark:bg-[#1C1726] dark:text-[#F6F1EA]"
                  >
                    {/* ── TOP SECTION: iOS Callout Card & Dynamic Island Timer ── */}
                    <div className="space-y-2.5 shrink-0">
                      {reel.author && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7659C7]/10 border border-[#7659C7]/20 text-[#7659C7] text-[12px] font-bold w-fit">
                          <PremiumIcon icon={Sparkles} tone="sky" size="2xs" />
                          <span>Muallif: @{reel.author.username || reel.author.name}</span>
                          <span className="text-[12px] bg-[#7659C7]/15 px-1.5 py-0.5 rounded-full font-bold">
                            Hamjamiyat
                          </span>
                        </div>
                      )}

                      {/* iOS Amber Callout Banner */}
                      <div className="rounded-[18px] bg-[#FFB82E]/[0.10] border border-[#FFB82E]/25 p-3 sm:p-3.5 flex items-start gap-3">
                        <PremiumIcon icon={AlertTriangle} tone="amber" size="xs" className="mt-0.5" />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#FFB82E]">
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
                          <div className="flex items-center gap-2 text-[#8A8494]">
                            <span className="size-2 rounded-full bg-[#7659C7] shrink-0" />
                            <span>{index + 1}-savol / {reels.length}</span>
                          </div>
                          <div className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[12px] font-bold",
                            hasAnswered
                              ? "bg-[#4C806B]/12 text-[#4C806B]"
                              : timeLeft <= 4
                              ? "bg-[#F0523D]/15 text-[#F0523D] animate-pulse"
                              : "bg-[#7659C7]/12 text-[#7659C7]"
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
                                ? "bg-[#4C806B]"
                                : timeLeft <= 4
                                ? "bg-[#F0523D]"
                                : "bg-[#7659C7]"
                            )}
                            style={{ width: `${hasAnswered ? 100 : Math.max(5, (timeLeft / 15) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── MIDDLE SECTION: Question & iOS Option Rows ── */}
                    <div className="flex-1 flex flex-col justify-center py-2.5 sm:py-3 min-h-0 space-y-3 overflow-hidden">
                      {reel.media_type === 'video' && reel.video_url && (
                        <div className="w-full h-36 rounded-[18px] overflow-hidden bg-black shrink-0 relative">
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
                        <div className="space-y-2 max-h-[28vh] overflow-y-auto no-scrollbar p-3.5 rounded-[18px] bg-[#F7F4EF] dark:bg-[#2A2338] border border-black/[0.05] dark:border-white/[0.07]">
                          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                            {formattedQ.prompt}
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                            <div className="space-y-1 bg-white dark:bg-[#1C1726] p-2.5 rounded-lg border border-black/[0.05] dark:border-white/[0.07]">
                              <span className="text-[12px] font-bold text-[#FFB82E] uppercase block mb-1">
                                📌 Atamalar:
                              </span>
                              {formattedQ.romanItems.map((item, idx) => (
                                <div key={idx} className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                                  {item}
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1 bg-white dark:bg-[#1C1726] p-2.5 rounded-lg border border-black/[0.05] dark:border-white/[0.07]">
                              <span className="text-[12px] font-bold text-[#7659C7] uppercase block mb-1">
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
                            "font-bold tracking-[-0.015em] text-slate-900 dark:text-white leading-snug",
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

                          let cardStyle = "border-black/[0.06] dark:border-white/[0.08] bg-[#F7F4EF]/75 dark:bg-[#2A2338] hover:border-[#7659C7]/50 text-slate-900 dark:text-white";
                          let badgeStyle = "bg-white dark:bg-[#1C1726] text-slate-800 dark:text-slate-200 shadow-xs";

                          if (hasAnswered) {
                            if (isCorrectOption) {
                              cardStyle = "border-2 border-[#4C806B] bg-[#4C806B]/12 text-[#3A6654] dark:text-[#4C806B]";
                              badgeStyle = "bg-[#4C806B] text-white";
                            } else if (isSelected && !quizAnswer.isCorrect) {
                              cardStyle = "border-2 border-[#F0523D] bg-[#F0523D]/12 text-[#C93A28] dark:text-[#FF453A]";
                              badgeStyle = "bg-[#F0523D] text-white";
                            } else {
                              cardStyle = "border-black/[0.04] dark:border-white/[0.04] bg-[#F7F4EF]/40 dark:bg-[#2A2338]/40 text-[#8A8494] opacity-60";
                              badgeStyle = "bg-white/60 dark:bg-[#1C1726]/60 text-[#8A8494]";
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
                              <div className={cn("size-8 rounded-md flex items-center justify-center font-mono font-bold text-[13px] shrink-0 transition-colors", badgeStyle)}>
                                {letter}
                              </div>
                              <span className="text-[13px] sm:text-[14px] font-semibold flex-1 leading-snug break-words">
                                {cleanOpt}
                              </span>
                              {hasAnswered && isCorrectOption && (
                                <CheckCircle2 className="size-5 text-[#4C806B] shrink-0" />
                              )}
                              {hasAnswered && isSelected && !quizAnswer.isCorrect && (
                                <XCircle className="size-5 text-[#F0523D] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Card when Answered */}
                      {quizAnswer && (
                        <div className="p-3.5 rounded-[18px] bg-[#F7F4EF] dark:bg-[#2A2338] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5 animate-in fade-in duration-300 shrink-0">
                          <div className="flex items-center justify-between text-[12px] font-bold">
                            <span className={quizAnswer.isCorrect ? "text-[#4C806B] flex items-center gap-1" : "text-[#F0523D] flex items-center gap-1"}>
                              {quizAnswer.isCorrect ? "✅ To'g'ri javob! (+5 XP)" : "❌ Noto'g'ri javob"}
                            </span>
                            <button
                              onClick={() => { tgHaptic('light'); scrollToReel(index + 1); }}
                              disabled={index === reels.length - 1}
                              className="text-[12px] text-[#7659C7] hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-30"
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
                    <div className="pt-3 pb-1 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[#8A8494] text-[12px] sm:text-[13px] font-semibold shrink-0">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Heart / Like */}
                        <button
                          onClick={(e) => handleLike(reel.id, e)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all cursor-pointer active:scale-95",
                            isLiked ? "bg-[#F0523D]/12 text-[#F0523D]" : "hover:bg-[#767680]/[0.08]"
                          )}
                          title="Yoqdi"
                        >
                          <Heart className={cn("size-4", isLiked && "fill-[#F0523D]")} />
                          <span className="font-mono font-bold text-[12px]">{likes}</span>
                        </button>

                        {/* Comment */}
                        <button
                          onClick={() => { tgHaptic('light'); handleOpenComments(reel); }}
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 hover:bg-[#767680]/[0.08] hover:text-[#7659C7] transition-all cursor-pointer active:scale-95"
                          title="Izohlar"
                        >
                          <MessageCircle className="size-4 text-[#7659C7]" />
                          <span className="font-mono font-bold text-[12px]">{commentCounts[reel.id] ?? reel.comments_count ?? 0}</span>
                        </button>

                        {/* Bookmark / Save */}
                        <button
                          onClick={() => handleSave(reel.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all cursor-pointer active:scale-95",
                            isSaved ? "bg-[#FFB82E]/12 text-[#FFB82E]" : "hover:bg-[#767680]/[0.08]"
                          )}
                          title="Xatcho'pga saqlash"
                        >
                          <Bookmark className={cn("size-4", isSaved && "fill-[#FFB82E]")} />
                          <span className="font-mono font-bold text-[12px]">{savedCount}</span>
                        </button>
                      </div>

                      {/* Action buttons: Challenge & Share */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleChallengeFriend(reel)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFB82E]/12 hover:bg-[#FFB82E]/20 text-[#FFB82E] border border-[#FFB82E]/25 transition-all cursor-pointer font-bold text-[12px] active:scale-95"
                          title="Do'stga Telegram chaqiriq yuborish"
                        >
                          <Swords className="size-3.5" />
                          <span>Chaqiriq ⚔️</span>
                        </button>

                        <button
                          onClick={() => handleShare(reel)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7659C7]/12 hover:bg-[#7659C7]/20 text-[#7659C7] transition-all cursor-pointer font-bold text-[12px] active:scale-95"
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
            className="fixed pointer-events-none z-50 animate-ping"
            style={{ left: heart.x, top: heart.y }}
          >
            <IlmIcon name="heart" className="size-10" />
          </div>
        ))}

        {/* ── COMMENTS iOS BOTTOM SHEET MODAL ── */}
        {activeCommentReel && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setActiveCommentReel(null)}
          >
            <div
              className="w-full sm:max-w-lg bg-white dark:bg-[#1C1726] border-t sm:border border-black/[0.08] dark:border-white/[0.10] rounded-t-3xl sm:rounded-[30px] p-5 sm:p-6 flex flex-col h-[75vh] sm:h-[580px] shadow-2xl relative text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-[#8A8494]/30 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[#7659C7] text-white">
                    <MessageCircle className="size-4" />
                  </div>
                  <h3 className="font-bold text-[16px] text-slate-900 dark:text-white">
                    Izohlar ({commentCounts[activeCommentReel.id] ?? comments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveCommentReel(null)}
                  className="size-8 rounded-full bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] flex items-center justify-center text-[#8A8494] transition-all active:scale-95 cursor-pointer"
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
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#8A8494]">
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
                      <div key={c.id} className={cn("flex gap-2.5 items-start group", isReply && "ml-5 pl-2 border-l-2 border-[#7659C7]/40")}>
                        {isReply && <CornerDownRight className="size-3 text-[#7659C7] mt-2 shrink-0" />}
                        <div className="size-7 rounded-full bg-gradient-to-tr from-[#7659C7] to-[#7659C7] flex items-center justify-center text-white font-bold text-[12px] shrink-0 shadow-xs overflow-hidden mt-0.5">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                          ) : (
                            c.user_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 bg-[#F7F4EF] dark:bg-[#2A2338] rounded-[18px] p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white truncate">{c.user_name}</span>
                              <VerifiedBadge role={c.role} isSuperadmin={c.is_superadmin} isTeacher={c.is_teacher} size="xs" />
                            </div>
                            <span className="text-[12px] text-[#8A8494] font-mono shrink-0">{c.created_at}</span>
                          </div>
                          <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed break-words">{withIlmIcons(c.text)}</p>
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({ id: c.id, userName: c.user_name });
                                setNewCommentText(`@${c.user_name} `);
                              }}
                              className="text-[12px] font-bold text-[#7659C7] hover:underline cursor-pointer"
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
                {ILM_STICKERS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setNewCommentText((prev) => (prev ? prev + ' ' : '') + m.text)}
                    className="group/st inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#F2EADF] pl-1.5 pr-3.5 text-[13px] font-bold text-[#080808] transition-all hover:bg-[#080808] hover:text-[#FFFCF7] active:scale-95 dark:bg-[#2A2338] dark:text-white dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]"
                  >
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#FFFCF7] transition-transform group-hover/st:-rotate-12 group-hover/st:scale-110 dark:bg-[#1C1726]">
                      <IlmIcon name={m.icon} className="size-5" />
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>

              {replyingTo && (
                <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-[#7659C7]/10 border border-[#7659C7]/20 rounded-md text-[#7659C7]">
                  <span className="truncate">💬 <b>@{replyingTo.userName}</b> ga javob berilmoqda</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-[#8A8494] hover:text-slate-900 dark:hover:text-white ml-2 cursor-pointer"
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
                  className="flex-1 bg-[#767680]/[0.10] dark:bg-[#2A2338] border border-transparent focus:border-[#7659C7] rounded-full px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-[#8A8494] focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submittingComment}
                  className="px-4 py-2.5 rounded-full bg-[#7659C7] hover:bg-[#5E45A8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
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
              className="w-full sm:max-w-xl bg-white dark:bg-[#1C1726] border-t sm:border border-black/[0.08] dark:border-white/[0.10] rounded-t-3xl sm:rounded-[30px] p-5 sm:p-6 flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-[#8A8494]/30 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[#7659C7] text-white shadow-xs">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-slate-900 dark:text-white">
                      Mening qiyin savolim (Reels)
                    </h3>
                    <p className="text-[12px] text-[#8A8494]">
                      O&apos;quvchilarni sinovdan o&apos;tkazing va +20 XP oling!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="size-8 rounded-full bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] flex items-center justify-center text-[#8A8494] transition-all active:scale-95 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateQuestionSubmit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8A8494] uppercase tracking-wider">
                    Fan:
                  </label>
                  <select
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#F7F4EF] dark:bg-[#2A2338] text-[14px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#7659C7]"
                  >
                    <option value="tarix">Tarix</option>
                    <option value="ona-tili">Ona tili va adabiyot</option>
                    <option value="biologiya">Biologiya</option>
                    <option value="matematika">Matematika</option>
                    <option value="ingliz-tili">Ingliz tili</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8A8494] uppercase tracking-wider">
                    Savol matni:
                  </label>
                  <textarea
                    rows={3}
                    value={createQuestion}
                    onChange={(e) => setCreateQuestion(e.target.value)}
                    placeholder="Masalan: Qaysi sulola davrida Mirzo Ulug'bek madrasasi qurilgan?.."
                    required
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#F7F4EF] dark:bg-[#2A2338] text-[14px] text-slate-900 dark:text-white placeholder:text-[#8A8494] focus:outline-none focus:border-[#7659C7] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#8A8494] uppercase tracking-wider flex items-center justify-between">
                    <span>Variantlar (To&apos;g&apos;ri javobni tanlang):</span>
                    <span className="text-[12px] text-[#4C806B] font-bold normal-case">
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
                            "flex items-center gap-2 p-2 rounded-lg border transition-all",
                            isCorrect
                              ? "border-[#4C806B] bg-[#4C806B]/10"
                              : "border-black/[0.06] dark:border-white/[0.08] bg-[#F7F4EF] dark:bg-[#2A2338]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => { tgHaptic('select'); setCreateCorrectIndex(idx); }}
                            className={cn(
                              "size-7 rounded-sm font-mono font-bold text-[12px] flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                              isCorrect
                                ? "bg-[#4C806B] text-white"
                                : "bg-white dark:bg-[#1C1726] text-slate-700 dark:text-slate-200"
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
                            className="flex-1 bg-transparent border-0 px-2 py-1 text-[13px] text-slate-900 dark:text-white placeholder:text-[#8A8494] focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8A8494] uppercase tracking-wider">
                    To&apos;g&apos;ri javob izohi / tushuntirish:
                  </label>
                  <textarea
                    rows={2}
                    value={createExplanation}
                    onChange={(e) => setCreateExplanation(e.target.value)}
                    placeholder="Nima uchun bu javob to'g'ri ekanligini qisqacha izohlang..."
                    required
                    maxLength={350}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#F7F4EF] dark:bg-[#2A2338] text-[14px] text-slate-900 dark:text-white placeholder:text-[#8A8494] focus:outline-none focus:border-[#7659C7] resize-none"
                  />
                </div>

                <div className="p-3.5 rounded-lg bg-[#FFB82E]/10 border border-[#FFB82E]/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#FFB82E] font-semibold">
                    <Zap className="size-4 fill-[#FFB82E]" />
                    <span>Tasdiqlanganda darhol hisobingizga mukofot:</span>
                  </div>
                  <span className="font-mono font-bold text-[#FFB82E] bg-[#FFB82E]/15 px-2.5 py-1 rounded-full text-xs">
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
                    className="px-5 py-2.5 rounded-full bg-[#7659C7] hover:bg-[#5E45A8] text-white font-bold text-[13px] flex items-center gap-2 shadow-[0_4px_14px_rgba(118,89,199,0.28)] cursor-pointer disabled:opacity-50 transition-all active:scale-95"
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
    </div>
  );
}

export default function ReelsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F4EF] dark:bg-[#140F1E] flex items-center justify-center p-4">
          <div className="size-10 rounded-full border-3 border-[#7659C7] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ReelsInner />
    </Suspense>
  );
}
