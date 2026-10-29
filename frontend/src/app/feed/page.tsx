'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Award,
  Trophy,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Send,
  ExternalLink,
  BookOpen,
  X,
  Plus,
  Trash2,
  Camera,
  UploadCloud,
  CornerDownRight,
  Pin,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import PremiumIcon from '@/components/ui/premium-icon';
import VerifiedBadge from '@/components/ui/verified-badge';
import { cn } from '@/lib/utils';

type PostItem = {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    level: number;
    role?: string;
    is_superadmin?: boolean;
    is_teacher?: boolean;
  };
  post_type: 'test_result' | 'certificate' | 'achievement';
  title: string;
  subject_name: string;
  subject_slug: string;
  score: number;
  grade: string;
  correct_count: number;
  total_questions: number;
  caption: string;
  image_url: string;
  test_id: number | null;
  attempt_id: number | null;
  likes_count: number;
  comments_count: number;
  reaction_counts: {
    fire: number;
    clap: number;
    trophy: number;
    heart: number;
  };
  user_reaction: string | null;
  created_at: string;
  can_delete?: boolean;
  is_pinned?: boolean;
};

type PostComment = {
  id: number;
  user_id: number;
  user_name: string;
  username: string;
  user_avatar: string;
  text: string;
  created_at: string;
  parent_id?: number | null;
  role?: string;
  is_superadmin?: boolean;
  is_teacher?: boolean;
};

type FeedResponse = {
  posts: PostItem[];
  total: number;
  subjects: { slug: string; name: string }[];
};

const REACTION_EMOJIS: Record<string, { icon: string; label: string; activeClass: string }> = {
  fire: {
    icon: '🔥',
    label: 'Olov',
    activeClass: 'bg-[#FF9500]/15 border-[#FF9500]/45 text-[#C93400] dark:text-[#FF9F0A]',
  },
  clap: {
    icon: '👏',
    label: 'Qarsak',
    activeClass: 'bg-[#34C759]/15 border-[#34C759]/45 text-[#248A3D] dark:text-[#30D158]',
  },
  trophy: {
    icon: '🏆',
    label: 'Kubok',
    activeClass: 'bg-[#FFCC00]/20 border-[#FF9500]/45 text-[#B25000] dark:text-[#FFD60A]',
  },
  heart: {
    icon: '❤️',
    label: 'Yurak',
    activeClass: 'bg-[#FF2D55]/15 border-[#FF2D55]/45 text-[#D70015] dark:text-[#FF375F]',
  },
};

const STUDY_MEMES = [
  { label: 'Daho 🧠', text: '🧠 Daho rejim yoqildi!' },
  { label: 'Grand 🎯', text: "🎯 Grand kutmoqda, olg'a!" },
  { label: 'Kofe ☕', text: "☕ Abituriyent kofesi kuch bag'ishlasin!" },
  { label: 'Kitob 📚', text: '📚 Kitoblar titilgan, natija esa bomba!' },
  { label: 'Chempion 🏆', text: '🏆 Haqiqiy chempionlik natijasi!' },
];

export default function CommunityFeedPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [reactions, setReactions] = useState<
    Record<number, { user_reaction: string | null; counts: Record<string, number> }>
  >({});

  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [postComments, setPostComments] = useState<Record<number, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<
    Record<number, { commentId: number; userName: string } | null>
  >({});

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Umumiy');
  const [newCaption, setNewCaption] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeModalTab, setActiveModalTab] = useState<'result' | 'custom'>('result');
  const [userAttempts, setUserAttempts] = useState<
    {
      id: number;
      test_title: string;
      score: number | null;
      correct_answers: number;
      wrong_answers: number;
      skipped_answers: number;
      completed_at: string;
    }[]
  >([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [attemptCaption, setAttemptCaption] = useState('');
  const [isSharingAttempt, setIsSharingAttempt] = useState(false);

  const fetchUserAttempts = useCallback(async () => {
    if (!user) return;
    setLoadingAttempts(true);
    try {
      const res = await apiFetch<{ results: any[] }>('/api/tests/history/');
      if (res && res.results) {
        setUserAttempts(res.results);
        if (res.results.length > 0 && !selectedAttemptId) {
          setSelectedAttemptId(res.results[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAttempts(false);
    }
  }, [user, selectedAttemptId]);

  useEffect(() => {
    if (isCreateModalOpen && user) {
      fetchUserAttempts();
    }
  }, [isCreateModalOpen, user, fetchUserAttempts]);

  async function handleShareAttempt(attemptId: number, score: number | null) {
    if (!user) {
      toast.error('Ulashish uchun tizimga kiring');
      router.push('/login');
      return;
    }
    setIsSharingAttempt(true);
    try {
      const isCert = (score || 0) >= 60;
      const res = await apiFetch<{ success: boolean; message: string; post: PostItem }>(
        '/api/learning/feed/create/',
        {
          method: 'POST',
          body: JSON.stringify({
            attempt_id: attemptId,
            caption: attemptCaption.trim(),
            post_type: isCert ? 'certificate' : 'test_result',
          }),
        }
      );

      if (res.success) {
        celebrate();
        soundFX.fanfare();
        toast.success(res.message || 'Natijangiz Hamjamiyat lentasiga joylandi! +15 XP');
        setIsCreateModalOpen(false);
        setAttemptCaption('');
        loadFeed(selectedFilter);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Natijani ulashishda xatolik yuz berdi');
    } finally {
      setIsSharingAttempt(false);
    }
  }

  const loadFeed = useCallback(async (filter = 'all') => {
    setLoading(true);
    try {
      let query = '';
      if (filter === 'certificate') {
        query = '?type=certificate';
      } else if (filter !== 'all') {
        query = `?subject=${encodeURIComponent(filter)}`;
      }

      const res = await apiFetch<FeedResponse>(`/api/learning/feed/${query}`);
      if (res && res.posts) {
        setPosts(res.posts);
        if (res.subjects) setSubjects(res.subjects);

        const initialReactions: Record<
          number,
          { user_reaction: string | null; counts: Record<string, number> }
        > = {};
        res.posts.forEach((p) => {
          initialReactions[p.id] = {
            user_reaction: p.user_reaction,
            counts: p.reaction_counts || { fire: 0, clap: 0, trophy: 0, heart: 0 },
          };
        });
        setReactions(initialReactions);
      }
    } catch {
      toast.error("Hamjamiyat lentasini yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(selectedFilter);
  }, [selectedFilter, loadFeed]);

  async function handleReact(postId: number, reactionType: 'fire' | 'clap' | 'trophy' | 'heart') {
    if (!user) {
      toast.error('Reaksiya bildirish uchun tizimga kiring');
      router.push('/login');
      return;
    }

    soundFX.click();

    setReactions((prev) => {
      const curr = prev[postId] || {
        user_reaction: null,
        counts: { fire: 0, clap: 0, trophy: 0, heart: 0 },
      };
      const wasSame = curr.user_reaction === reactionType;
      const nextReaction = wasSame ? null : reactionType;
      const nextCounts = { ...curr.counts };

      if (curr.user_reaction) {
        nextCounts[curr.user_reaction] = Math.max(0, (nextCounts[curr.user_reaction] || 1) - 1);
      }
      if (!wasSame) {
        nextCounts[reactionType] = (nextCounts[reactionType] || 0) + 1;
      }

      return {
        ...prev,
        [postId]: {
          user_reaction: nextReaction,
          counts: nextCounts,
        },
      };
    });

    try {
      const res = await apiFetch<{
        success: boolean;
        user_reaction: string | null;
        reaction_counts: Record<string, number>;
      }>(`/api/learning/feed/${postId}/react/`, {
        method: 'POST',
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      if (res && res.reaction_counts) {
        setReactions((prev) => ({
          ...prev,
          [postId]: {
            user_reaction: res.user_reaction,
            counts: res.reaction_counts,
          },
        }));
      }
    } catch {
      loadFeed(selectedFilter);
    }
  }

  async function toggleComments(postId: number) {
    const isNowOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: isNowOpen }));

    if (isNowOpen && !postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await apiFetch<{ comments: PostComment[]; count: number }>(
          `/api/learning/feed/${postId}/comments/`
        );
        if (res && res.comments) {
          setPostComments((prev) => ({ ...prev, [postId]: res.comments }));
        }
      } catch {
        toast.error('Izohlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  }

  async function handleAddComment(postId: number) {
    if (!user) {
      toast.error('Izoh qoldirish uchun tizimga kiring');
      router.push('/login');
      return;
    }

    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const reply = replyingTo[postId];
    const parentId = reply ? reply.commentId : null;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await apiFetch<{
        success: boolean;
        comment: PostComment;
        comments_count: number;
      }>(`/api/learning/feed/${postId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ text, parent_id: parentId }),
      });

      if (res.success && res.comment) {
        soundFX.click();
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.comment],
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        setReplyingTo((prev) => ({ ...prev, [postId]: null }));

        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: res.comments_count } : p))
        );
        toast.success("Izohingiz qo'shildi!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Izoh qoldirilmadi');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleDeletePost(postId: number) {
    if (!confirm("Haqiqatan ham ushbu postni o'chirmoqchimisiz?")) return;

    try {
      soundFX.click();
      const res = await apiFetch<{ success: boolean; message: string }>(
        `/api/learning/feed/${postId}/delete/`,
        { method: 'DELETE' }
      );
      if (res.success) {
        toast.success("Post muvaffaqiyatli o'chirildi");
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        toast.info("Post allaqachon o'chirilgan");
      } else {
        toast.error(err?.message || "Postni o'chirishda xatolik yuz berdi");
      }
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
        return;
      }
      setSelectedImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Post qo'shish uchun avval tizimga kiring");
      router.push('/login');
      return;
    }

    if (!newTitle.trim() && !newCaption.trim() && !selectedImageFile) {
      toast.error('Iltimos, post matni yoki rasmni kiriting');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim() || "O'quvchi Natijasi");
      formData.append('subject_name', newSubject.trim() || 'Umumiy');
      formData.append('caption', newCaption.trim());
      if (selectedImageFile) {
        formData.append('image', selectedImageFile);
      }

      const res = await apiFetch<{ success: boolean; post: PostItem; message: string }>(
        '/api/learning/feed/create/',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (res.success) {
        celebrate();
        soundFX.fanfare();
        toast.success(res.message || "Post muvaffaqiyatli e'lon qilindi! +15 XP");
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewCaption('');
        setSelectedImageFile(null);
        setImagePreviewUrl(null);
        loadFeed(selectedFilter);
      }
    } catch (err: any) {
      toast.error(err.message || 'Post yaratishda xatolik yuz berdi');
    } finally {
      setIsSubmittingPost(false);
    }
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 bg-[var(--bg-page)] w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 pb-28">
        <div className="mx-auto max-w-2xl space-y-5 w-full min-w-0">
          {/* 1. iOS 18 Top Segmented Bar & Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="ios-segmented inline-flex items-center">
              <div className="ios-segmented-thumb flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-xs sm:text-[13px] font-bold select-none">
                <Sparkles className="size-3.5 text-[#34C759]" />
                <span>Hamjamiyat</span>
              </div>
              <Link
                href="/leaderboard"
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trophy className="size-3.5 text-[#FF9500]" />
                <span>Liderlar Ligasi</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/tests/history"
                className="ios-spring hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-muted/70"
              >
                <Award className="size-3.5 text-[#FF9500]" />
                <span>Natijalarim</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveModalTab('result');
                  setIsCreateModalOpen(true);
                }}
                className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs sm:text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(0,122,255,0.34)] cursor-pointer"
              >
                <Plus className="size-4 stroke-[2.5]" />
                <span>Yangi post</span>
              </button>
            </div>
          </div>

          {/* 2. iOS 18 Quick Composer Card */}
          <div
            onClick={() => {
              setActiveModalTab('result');
              setIsCreateModalOpen(true);
            }}
            className="ios-card ios-card-interactive rounded-[26px] p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="size-10 border border-border shrink-0">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={user.first_name || user.username} />
                )}
                <AvatarFallback className="font-bold bg-primary/12 text-primary text-xs">
                  {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">
                  Natijangiz, sertifikatingiz yoki fikringizni ulashing...
                </p>
                <p className="text-[11px] font-medium text-primary mt-0.5">
                  Har bir foydali post uchun +15 XP bonus ✨
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalTab('result');
                  setIsCreateModalOpen(true);
                }}
                className="ios-spring inline-flex items-center gap-1 rounded-full bg-[#FF9500]/14 border border-[#FF9500]/25 px-3 py-1.5 text-[11px] font-bold text-[#C93400] dark:text-[#FF9F0A] cursor-pointer"
              >
                <Award className="size-3.5 text-[#FF9500]" />
                <span>Natija</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalTab('custom');
                  setIsCreateModalOpen(true);
                }}
                className="ios-spring hidden sm:inline-flex items-center gap-1 rounded-full bg-[#34C759]/14 border border-[#34C759]/25 px-3 py-1.5 text-[11px] font-bold text-[#248A3D] dark:text-[#30D158] cursor-pointer"
              >
                <Camera className="size-3.5" />
                <span>Rasm</span>
              </button>
            </div>
          </div>

          {/* 3. iOS Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { slug: 'all', label: 'Barchasi' },
              { slug: 'certificate', label: '🏆 Sertifikatlar' },
              ...subjects
                .filter((s) => s.slug !== 'all')
                .map((s) => ({
                  slug: s.slug,
                  label: s.name,
                })),
            ].map((tab) => {
              const isSel = selectedFilter === tab.slug;
              return (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setSelectedFilter(tab.slug)}
                  className={cn(
                    'ios-spring shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer border',
                    isSel
                      ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 4. Feed Stream */}
          <div className="space-y-4 w-full min-w-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ios-card rounded-[28px] p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-muted rounded-full" />
                        <div className="h-3 w-20 bg-muted/60 rounded-full" />
                      </div>
                    </div>
                    <div className="h-36 w-full bg-muted rounded-[20px]" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Reveal>
                <div className="ios-card rounded-[28px] py-14 px-5 text-center space-y-4">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-[18px] bg-[#FF9500]/14 text-[#FF9500]">
                    <Trophy className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                      Hozircha postlar mavjud emas
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                      Birinchi bo&apos;lib natijangiz yoki fikringizni ulashing va +15 XP bonus oling!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(0,122,255,0.32)] cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>Birinchi postni qoldirish</span>
                  </button>
                </div>
              </Reveal>
            ) : (
              posts.map((post, idx) => {
                const postReactions = reactions[post.id] || {
                  user_reaction: post.user_reaction,
                  counts: post.reaction_counts || { fire: 0, clap: 0, trophy: 0, heart: 0 },
                };
                const comments = postComments[post.id] || [];
                const isCommentsOpen = expandedComments[post.id] || false;
                const isCommentsLoading = loadingComments[post.id] || false;
                const isCert = post.post_type === 'certificate' || (post.score && post.score >= 60);
                const postReplying = replyingTo[post.id];
                const canDelete = Boolean(
                  post.can_delete ||
                    (user &&
                      ((user.id && post.author?.id && Number(user.id) === Number(post.author.id)) ||
                        (user.username &&
                          post.author?.username &&
                          user.username.toLowerCase() === post.author.username.toLowerCase())))
                );

                return (
                  <Reveal key={post.id} delay={idx * 0.03}>
                    <article className="ios-card overflow-hidden rounded-[28px] p-4 sm:p-5 space-y-4 min-w-0">
                      {/* 1. Author Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-10 sm:size-11 border border-border shrink-0">
                            {post.author.avatar && (
                              <AvatarImage src={post.author.avatar} alt={post.author.name} />
                            )}
                            <AvatarFallback className="font-extrabold bg-primary text-white text-xs sm:text-sm">
                              {post.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-foreground text-sm leading-tight truncate">
                                {post.author.name}
                              </span>
                              <VerifiedBadge
                                role={post.author.role}
                                isSuperadmin={post.author.is_superadmin}
                                isTeacher={post.author.is_teacher}
                                size="xs"
                              />
                              <span className="rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                Lvl {post.author.level}
                              </span>
                              {post.is_pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FF2D55]/14 px-2 py-0.5 text-[10px] font-bold text-[#D70015] dark:text-[#FF375F]">
                                  <Pin className="size-2.5" /> Qadalgan
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                              @{post.author.username} · {post.created_at}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10.5px] font-bold border',
                              post.post_type === 'achievement'
                                ? 'border-[#AF52DE]/30 bg-[#AF52DE]/12 text-[#8944AB] dark:text-[#BF5AF2]'
                                : isCert
                                ? 'border-[#FF9500]/30 bg-[#FF9500]/14 text-[#C93400] dark:text-[#FF9F0A]'
                                : 'border-[#007AFF]/30 bg-[#007AFF]/12 text-[#007AFF] dark:text-[#409CFF]'
                            )}
                          >
                            {post.post_type === 'achievement'
                              ? '✨ Post'
                              : isCert
                              ? '🏆 Sertifikat'
                              : '📝 Sinov Testi'}
                          </span>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="ios-spring flex size-7.5 items-center justify-center rounded-full text-muted-foreground hover:text-[#FF3B30] hover:bg-[#FF3B30]/12 transition-colors cursor-pointer"
                              title="Postni o'chirish"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Result / Subject Summary Block */}
                      {post.score > 0 || post.total_questions > 0 || post.grade ? (
                        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-muted/40 p-3.5 sm:p-4 min-w-0">
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="inline-block rounded-full bg-card border border-border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {post.subject_name}
                            </span>
                            <h4 className="font-extrabold text-foreground text-xs sm:text-sm leading-snug line-clamp-1">
                              {post.title}
                            </h4>
                            {post.total_questions > 0 && (
                              <p className="text-[11px] font-medium text-muted-foreground truncate">
                                To&apos;g&apos;ri javoblar:{' '}
                                <strong className="text-foreground">{post.correct_count}</strong> /{' '}
                                {post.total_questions} ta
                              </p>
                            )}
                          </div>

                          {post.score > 0 && (
                            <div className="flex flex-col items-end shrink-0 rounded-[16px] bg-[#34C759]/14 border border-[#34C759]/25 px-3.5 py-2">
                              <span className="text-lg sm:text-2xl font-black font-mono tracking-tight text-[#248A3D] dark:text-[#30D158] leading-none">
                                {post.score?.toFixed(0)}%
                              </span>
                              {post.grade && (
                                <span className="mt-0.5 text-[10px] font-extrabold uppercase text-[#C93400] dark:text-[#FF9F0A]">
                                  Daraja: {post.grade}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {post.subject_name && (
                            <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {post.subject_name}
                            </span>
                          )}
                          <h4 className="font-extrabold text-foreground text-sm sm:text-base leading-snug">
                            {post.title}
                          </h4>
                        </div>
                      )}

                      {/* 3. Caption */}
                      {post.caption && (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                          {post.caption}
                        </p>
                      )}

                      {/* 4. Image Preview */}
                      {post.image_url && (
                        <div
                          onClick={() => setPreviewImage(post.image_url)}
                          className="relative overflow-hidden rounded-[22px] border border-border bg-[#F2F2F7] dark:bg-[#1C1C1E] group cursor-pointer flex items-center justify-center max-h-[500px] w-full"
                        >
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-auto max-h-[500px] object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                            <ExternalLink className="size-4" /> Rasmni kattalashtirish
                          </div>
                        </div>
                      )}

                      {/* 5. CTA to try the same test */}
                      {post.test_id && (
                        <Link
                          href={`/tests/mock/${post.test_id}`}
                          className="ios-spring flex items-center justify-between rounded-[16px] bg-primary/10 hover:bg-primary/15 border border-primary/20 px-4 py-2.5 text-xs font-bold text-primary transition-colors"
                        >
                          <span>Shu testni siz ham yechib ko&apos;ring</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )}

                      {/* 6. Reactions & Comments Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['fire', 'clap', 'trophy', 'heart'] as const).map((rKey) => {
                            const count = postReactions.counts[rKey] || 0;
                            const isMyReaction = postReactions.user_reaction === rKey;
                            const meta = REACTION_EMOJIS[rKey];

                            return (
                              <button
                                key={rKey}
                                type="button"
                                onClick={() => handleReact(post.id, rKey)}
                                className={cn(
                                  'ios-spring flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all border cursor-pointer',
                                  isMyReaction
                                    ? meta.activeClass
                                    : 'bg-muted/70 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                                )}
                                title={meta.label}
                              >
                                <span>{meta.icon}</span>
                                {count > 0 && <span className="font-mono text-[11px]">{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleComments(post.id)}
                          className={cn(
                            'ios-spring flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer',
                            isCommentsOpen
                              ? 'bg-primary/12 text-primary'
                              : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <MessageCircle className="size-3.5" />
                          <span>{post.comments_count || 0} ta izoh</span>
                        </button>
                      </div>

                      {/* 7. Collapsible iOS Comments Sheet */}
                      {isCommentsOpen && (
                        <div className="pt-3 space-y-3 border-t border-border">
                          {isCommentsLoading ? (
                            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                              Izohlar yuklanmoqda...
                            </div>
                          ) : comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Hozircha izohlar yo&apos;q. Birinchi bo&apos;lib tabriklang! 🎉
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {comments.map((c) => {
                                const isReply = Boolean(c.parent_id);
                                return (
                                  <div
                                    key={c.id}
                                    className={cn(
                                      'flex items-start gap-2.5 text-xs p-2.5 rounded-[16px] transition-all',
                                      isReply
                                        ? 'ml-6 bg-muted/40 border-l-2 border-primary/50'
                                        : 'bg-muted/55'
                                    )}
                                  >
                                    {isReply && (
                                      <CornerDownRight className="size-3 text-muted-foreground shrink-0 mt-1" />
                                    )}
                                    <Avatar className="size-6.5 shrink-0 mt-0.5">
                                      {c.user_avatar && (
                                        <AvatarImage src={c.user_avatar} alt={c.user_name} />
                                      )}
                                      <AvatarFallback className="text-[9px] font-bold bg-primary/12 text-primary">
                                        {c.user_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span className="font-bold text-foreground truncate">
                                            {c.user_name}
                                          </span>
                                          <VerifiedBadge
                                            role={c.role}
                                            isSuperadmin={c.is_superadmin}
                                            isTeacher={c.is_teacher}
                                            size="xs"
                                          />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                          {c.created_at}
                                        </span>
                                      </div>
                                      <p className="text-foreground/90 mt-0.5 leading-snug">{c.text}</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReplyingTo((prev) => ({
                                            ...prev,
                                            [post.id]: { commentId: c.id, userName: c.user_name },
                                          }));
                                          setCommentInputs((prev) => ({
                                            ...prev,
                                            [post.id]: `@${c.user_name} `,
                                          }));
                                        }}
                                        className="mt-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                      >
                                        Javob berish
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Reaction Phrases */}
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            {STUDY_MEMES.map((m, mIdx) => (
                              <button
                                key={mIdx}
                                type="button"
                                onClick={() => {
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: (prev[post.id] ? prev[post.id] + ' ' : '') + m.text,
                                  }));
                                }}
                                className="rounded-full px-2.5 py-1 text-[10px] font-semibold bg-muted/70 border border-border text-foreground/85 hover:border-primary/40 shrink-0 transition-colors cursor-pointer"
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {postReplying && (
                            <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary">
                              <span className="truncate">
                                💬 <b>@{postReplying.userName}</b> ga javob yozilmoqda
                              </span>
                              <button
                                type="button"
                                onClick={() => setReplyingTo((prev) => ({ ...prev, [post.id]: null }))}
                                className="text-muted-foreground hover:text-foreground ml-2 cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          )}

                          {/* iOS Messages Style Input Pill */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder="Izoh yozing..."
                              className="flex-1 rounded-full border border-border bg-muted/60 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              maxLength={1000}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                              className="ios-spring flex size-8.5 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 cursor-pointer"
                            >
                              <Send className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  </Reveal>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-[28px] border border-white/15 shadow-2xl flex items-center justify-center bg-black/60">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 size-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>
            <img
              src={previewImage}
              alt="Post rasmi"
              className="w-auto h-auto max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Create New Post Dialog Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[calc(100%-1.25rem)] sm:w-full sm:max-w-lg bg-card text-card-foreground border border-border p-0 rounded-[28px] max-h-[85svh] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 pb-3.5 border-b border-border shrink-0 bg-muted/25">
            <div className="flex items-center gap-2.5 pr-8">
              <PremiumIcon icon={Plus} tone="emerald" size="sm" solid />
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Hamjamiyatga Post Qo&apos;yish
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Test natijangizni yoki fikringizni do&apos;stlaringiz bilan ulashing (+15 XP)
                </p>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-[14px] bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveModalTab('result')}
                className={cn(
                  'py-2 px-3 rounded-[10px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  activeModalTab === 'result'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Award className="size-3.5 text-[#FF9500]" />
                <span>Natijani Ulashish</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('custom')}
                className={cn(
                  'py-2 px-3 rounded-[10px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  activeModalTab === 'custom'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <UploadCloud className="size-3.5 text-[#34C759]" />
                <span>Erkin Post &amp; Rasm</span>
              </button>
            </div>
          </div>

          {activeModalTab === 'result' && (
            <>
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5">
                {loadingAttempts ? (
                  <div className="py-10 text-center space-y-2">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Test natijalaringiz yuklanmoqda...</p>
                  </div>
                ) : userAttempts.length === 0 ? (
                  <div className="py-8 text-center space-y-3 p-4 rounded-[20px] bg-muted/30 border border-dashed border-border">
                    <PremiumIcon icon={Award} tone="amber" size="lg" className="mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Hali topshirilgan testlar yo&apos;q
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                        Avval birorta test yeching, so&apos;ng natijangizni bu yerda ulashing.
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-full font-bold text-xs">
                      <Link href="/tests">Test Ishlash</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Ulashish uchun natijani tanlang:</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {userAttempts.length} ta natija
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {userAttempts.map((att) => {
                        const isSelected = selectedAttemptId === att.id;
                        const scoreVal = att.score || 0;
                        const isCert = scoreVal >= 60;
                        return (
                          <div
                            key={att.id}
                            onClick={() => setSelectedAttemptId(att.id)}
                            className={cn(
                              'p-3 rounded-[18px] border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs',
                              isSelected
                                ? 'bg-primary/10 border-primary ring-1 ring-primary/30 text-foreground'
                                : 'bg-card border-border hover:bg-muted/40 text-foreground'
                            )}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-foreground text-xs sm:text-sm truncate block">
                                  {att.test_title}
                                </span>
                                {isCert && (
                                  <Badge className="bg-[#FF9500]/15 text-[#C93400] dark:text-[#FF9F0A] text-[9px] px-1.5 py-0.5 shrink-0 border border-[#FF9500]/30 font-bold">
                                    🏆 Sertifikat
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {att.correct_answers} to&apos;g&apos;ri • {att.wrong_answers} xato •{' '}
                                {new Date(att.completed_at).toLocaleDateString('uz-UZ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  'font-mono font-black text-xs px-2.5 py-1 rounded-full border',
                                  scoreVal >= 80
                                    ? 'bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158] border-[#34C759]/30'
                                    : scoreVal >= 60
                                    ? 'bg-[#FF9500]/15 text-[#C93400] dark:text-[#FF9F0A] border-[#FF9500]/30'
                                    : 'bg-[#FF3B30]/15 text-[#D70015] dark:text-[#FF6961] border-[#FF3B30]/30'
                                )}
                              >
                                {scoreVal.toFixed(0)}%
                              </span>
                              <div
                                className={cn(
                                  'size-5 rounded-full border flex items-center justify-center transition-colors',
                                  isSelected
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-border bg-muted/40'
                                )}
                              >
                                {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">
                        Izoh yoki maslahat (ixtiyoriy)
                      </label>
                      <Textarea
                        value={attemptCaption}
                        onChange={(e) => setAttemptCaption(e.target.value)}
                        placeholder="Masalan: Mehnat o'z mevasini berdi! 88% natija oldim..."
                        className="rounded-[16px] text-xs sm:text-sm bg-background border-border min-h-[64px] resize-none"
                        maxLength={500}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/25 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full text-xs font-semibold h-10 px-4"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  disabled={!selectedAttemptId || isSharingAttempt}
                  onClick={() => {
                    const att = userAttempts.find((a) => a.id === selectedAttemptId);
                    if (att) handleShareAttempt(att.id, att.score);
                  }}
                  className="rounded-full text-xs font-bold bg-primary text-white hover:bg-primary/90 h-10 px-5"
                >
                  {isSharingAttempt ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" /> Joylanmoqda...
                    </>
                  ) : (
                    '🚀 Hamjamiyatga Joylash (+15 XP)'
                  )}
                </Button>
              </div>
            </>
          )}

          {activeModalTab === 'custom' && (
            <form onSubmit={handleCreatePost} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Mavzu yoki Sarlavha
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Masalan: Bugun 50 ta tarix testi yechdim!"
                    className="rounded-[14px] text-xs sm:text-sm bg-background border-border h-10"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Fan / Yo&apos;nalish
                  </label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Tarix, Ona tili, Matematika, Biologiya..."
                    className="rounded-[14px] text-xs sm:text-sm bg-background border-border h-10"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Fikr yoki Taassurot
                  </label>
                  <Textarea
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Do'stlaringizga foydali maslahat yoki motivatsiya yozing..."
                    className="rounded-[16px] text-xs sm:text-sm bg-background border-border min-h-[70px] resize-none"
                    maxLength={1000}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Rasm (Ixtiyoriy)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <div className="relative rounded-[18px] overflow-hidden border border-border bg-muted/40 p-2 flex items-center justify-center">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="max-h-40 rounded-[12px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setImagePreviewUrl(null);
                        }}
                        className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-[#FF3B30] transition-colors cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/50 rounded-[18px] p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 bg-muted/25"
                    >
                      <PremiumIcon icon={UploadCloud} tone="emerald" size="md" solid />
                      <span className="text-xs font-bold text-foreground">Rasm yuklash</span>
                      <span className="text-[10px] text-muted-foreground">
                        PNG, JPG, WebP (maks. 5MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-muted/25 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full text-xs font-semibold h-10 px-4"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="rounded-full text-xs font-bold bg-primary text-white hover:bg-primary/90 h-10 px-5"
                >
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" /> E&apos;lon qilinmoqda...
                    </>
                  ) : (
                    "E'lon qilish 🚀"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
