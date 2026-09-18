'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Globe, Sparkles, Award, Flame, Heart, Trophy, MessageCircle,
  Share2, ArrowRight, CheckCircle2, Send, ExternalLink,
  ChevronRight, Filter, BookOpen, Swords, Dna, FileCheck2, X, PlusCircle,
  Plus, Trash2, Camera, UploadCloud, CornerDownRight, Pin, Loader2, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, API_URL } from '@/lib/api-client';
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
  fire: { icon: '🔥', label: 'Olov', activeClass: 'bg-amber-500/20 border-amber-500/50 text-amber-300' },
  clap: { icon: '👏', label: 'Qarsak', activeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' },
  trophy: { icon: '🏆', label: 'Kubok', activeClass: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' },
  heart: { icon: '❤️', label: 'Yurak', activeClass: 'bg-rose-500/20 border-rose-500/50 text-rose-300' },
};

const STUDY_MEMES = [
  { label: 'Daho 🧠', text: '🧠 Daho rejim yoqildi!' },
  { label: 'Grand 🎯', text: '🎯 Grand kutmoqda, olg\'a!' },
  { label: 'Kofe ☕', text: '☕ Abituriyent kofesi kuch bag\'ishlasin!' },
  { label: 'Kitob 📚', text: '📚 Kitoblar titilgan, natija esa bomba!' },
  { label: 'Chempion 🏆', text: '🏆 Haqiqiy chempionlik natijasi!' },
  { label: 'Yiqitdi 💀', text: '💀 Savol qiyin edi, lekin yorib yuboribsiz!' },
];

export default function CommunityFeedPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Reaksiyalar holati (post_id -> { user_reaction, counts })
  const [reactions, setReactions] = useState<
    Record<number, { user_reaction: string | null; counts: Record<string, number> }>
  >({});

  // Izohlar holati
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [postComments, setPostComments] = useState<Record<number, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});
  
  // Comment reply state: postId -> { commentId, userName }
  const [replyingTo, setReplyingTo] = useState<Record<number, { commentId: number; userName: string } | null>>({});

  // Rasm preview lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Umumiy');
  const [newCaption, setNewCaption] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Natijalarni ulashish holati
  const [activeModalTab, setActiveModalTab] = useState<'result' | 'custom'>('result');
  const [userAttempts, setUserAttempts] = useState<{
    id: number;
    test_title: string;
    score: number | null;
    correct_answers: number;
    wrong_answers: number;
    skipped_answers: number;
    completed_at: string;
  }[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [attemptCaption, setAttemptCaption] = useState('');
  const [isSharingAttempt, setIsSharingAttempt] = useState(false);

  // Foydalanuvchining topshirgan testlari tarixini yuklash
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

  // Test natijasini Hamjamiyatga chiqarish
  async function handleShareAttempt(attemptId: number, score: number | null) {
    if (!user) {
      toast.error("Ulashish uchun tizimga kiring");
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
        toast.success(res.message || "Natijangiz Hamjamiyat lentasiga joylandi! +15 XP");
        setIsCreateModalOpen(false);
        setAttemptCaption('');
        loadFeed(selectedFilter);
      }
    } catch (err: any) {
      toast.error(err?.message || "Natijani ulashishda xatolik yuz berdi");
    } finally {
      setIsSharingAttempt(false);
    }
  }

  // Feedni yuklash
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

        const initialReactions: Record<number, { user_reaction: string | null; counts: Record<string, number> }> = {};
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

  // Reaksiya bildirish
  async function handleReact(postId: number, reactionType: 'fire' | 'clap' | 'trophy' | 'heart') {
    if (!user) {
      toast.error("Reaksiya bildirish uchun tizimga kiring");
      router.push('/login');
      return;
    }

    soundFX.click();

    // Optimistik yangilash
    setReactions((prev) => {
      const curr = prev[postId] || { user_reaction: null, counts: { fire: 0, clap: 0, trophy: 0, heart: 0 } };
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

  // Izohlarni ochish/yopish
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
        toast.error("Izohlarni yuklashda xatolik yuz berdi");
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  }

  // Yangi izoh qoldirish
  async function handleAddComment(postId: number) {
    if (!user) {
      toast.error("Izoh qoldirish uchun tizimga kiring");
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

        // Postlar ro'yxatidagi hisoblagichni oshirish
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: res.comments_count } : p))
        );
        toast.success("Izohingiz qo'shildi!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Izoh qoldirilmadi");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  // Postni o'chirish
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

  // Rasm tanlash handler
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
        return;
      }
      setSelectedImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  }

  // Yangi erkin post yaratish
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Post qo'shish uchun avval tizimga kiring");
      router.push('/login');
      return;
    }

    if (!newTitle.trim() && !newCaption.trim() && !selectedImageFile) {
      toast.error("Iltimos, post matni yoki rasmni kiriting");
      return;
    }

    setIsSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim() || 'O\'quvchi Natijasi');
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
      toast.error(err.message || "Post yaratishda xatolik yuz berdi");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 bg-[var(--bg-page)] w-full max-w-full min-w-0 overflow-x-hidden p-3 sm:p-6 pb-28 sm:pb-24">
        <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-5 w-full min-w-0">
          {/* 1. Header & Tab Switcher Bar */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 w-full min-w-0">
            {/* Segment switch: Hamjamiyat vs Liderlar */}
            <div className="flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-[var(--surface-card)] border border-[var(--border-card)] shadow-xs shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                <Sparkles className="size-3.5 sm:size-4" />
                <span>Yutuqlar Lentasi</span>
              </div>
              <Link
                href="/leaderboard"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:text-amber-400 transition-colors"
              >
                <Trophy className="size-3.5 sm:size-4 text-amber-500" />
                <span className="hidden sm:inline">Liderlar Ligasi</span>
                <span className="sm:hidden">Liga</span>
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl font-bold border-[var(--border-card)] text-xs h-8 sm:h-9 flex items-center px-2 sm:px-3"
                title="Natijalarim tarixi"
              >
                <Link href="/tests/history">
                  <Award className="size-3.5 text-amber-400 sm:mr-1" />
                  <span className="hidden sm:inline">Natijalarim</span>
                </Link>
              </Button>
              <Button
                onClick={() => {
                  setActiveModalTab('result');
                  setIsCreateModalOpen(true);
                }}
                size="sm"
                className="rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                <span>Post</span>
              </Button>
            </div>
          </div>

          {/* 2. Quick Post Creator Card (Twitter / Threads style) */}
          <div
            onClick={() => {
              setActiveModalTab('result');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-card)] border border-[var(--border-card)] hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs group min-w-0"
          >
            <Avatar className="size-8 sm:size-10 border border-primary/20 shrink-0">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.first_name || user.username} />}
              <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-xs sm:text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors truncate">
              Fikringiz, natijangiz yoki savolingizni ulashing...
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalTab('result');
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl border border-amber-500/25 transition-colors"
              >
                <Award className="size-3 sm:size-3.5 text-amber-400" />
                <span>Natija qo&apos;yish</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/20 transition-colors">
                <Camera className="size-3.5" />
                <span>Rasm</span>
              </div>
            </div>
          </div>

          {/* 3. Filter Chips Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3 sm:mx-0 sm:px-0">
            {[
              { slug: 'all', label: 'Barchasi', icon: Sparkles },
              { slug: 'certificate', label: '🏆 Sertifikatlar', icon: Award },
              ...subjects.filter((s) => s.slug !== 'all').map((s) => ({
                slug: s.slug,
                label: s.name,
                icon: BookOpen,
              })),
            ].map((tab) => {
              const isSel = selectedFilter === tab.slug;
              return (
                <button
                  key={tab.slug}
                  onClick={() => setSelectedFilter(tab.slug)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0 border",
                    isSel
                      ? "bg-primary text-primary-foreground border-primary shadow-xs scale-102"
                      : "bg-[var(--surface-card)] text-muted-foreground border-[var(--border-card)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 4. Main Feed Content List */}
          <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-muted rounded-full" />
                      <div className="h-3 w-20 bg-muted/60 rounded-full" />
                    </div>
                  </div>
                  <div className="h-48 w-full bg-muted rounded-2xl" />
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Reveal>
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] space-y-4">
                <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400">
                  <Trophy className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Hozircha postlar mavjud emas
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    Birinchi bo&apos;lib post qoldiring, sertifikatingizni ulashing va hamjamiyatda ko&apos;rining!
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  size="sm"
                  className="rounded-xl font-bold bg-primary text-primary-foreground"
                >
                  <Plus className="size-4 mr-1.5" /> Birinchi bo&apos;lib post qoldirish
                </Button>
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

              return (
                <Reveal key={post.id} delay={idx * 0.04}>
                  <Card className="overflow-hidden border border-[var(--border-card)] bg-[var(--surface-card)] shadow-lg hover:border-[var(--border-strong)] transition-all min-w-0">
                    <CardContent className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 min-w-0">
                      {/* 1. Author Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 sm:size-11 border-2 border-primary/20">
                            {post.author.avatar && <AvatarImage src={post.author.avatar} alt={post.author.name} />}
                            <AvatarFallback className="font-black bg-gradient-to-tr from-primary to-accent text-white text-xs sm:text-sm">
                              {post.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-foreground text-sm leading-tight">
                                {post.author.name}
                              </span>
                              <VerifiedBadge role={post.author.role} isSuperadmin={post.author.is_superadmin} isTeacher={post.author.is_teacher} size="xs" />
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                Lv. {post.author.level}
                              </span>
                              {post.is_pinned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/20">
                                  <Pin className="size-2.5" /> Qadalgan
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              @{post.author.username} · {post.created_at}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-bold px-2.5 py-1",
                              post.post_type === 'achievement'
                                ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                                : isCert
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                            )}
                          >
                            {post.post_type === 'achievement'
                              ? '✨ Hamjamiyat'
                              : isCert
                              ? '🏆 Sertifikat'
                              : '📝 Sinov Testi'}
                          </Badge>

                          {/* Delete button: faqat o'zining posti bo'lsa ko'rinadi */}
                          {(post.can_delete || (user && (
                            (user.id && post.author?.id && Number(user.id) === Number(post.author.id)) ||
                            (user.username && post.author?.username && user.username.toLowerCase() === post.author.username.toLowerCase())
                          ))) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="size-8 rounded-lg flex items-center justify-center text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/15 transition-colors"
                              title="Postimni o'chirish"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Test Title & Score Banner (Only if test/cert with score or questions) */}
                      {(post.score > 0 || post.total_questions > 0 || post.grade) ? (
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--surface-hover)] to-[var(--surface-card-soft)] border border-[var(--border-card)] flex items-center justify-between gap-2.5 min-w-0">
                          <div className="space-y-1 min-w-0 flex-1">
                            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/70">
                              {post.subject_name}
                            </Badge>
                            <h4 className="font-black text-foreground text-xs sm:text-base leading-snug line-clamp-1">
                              {post.title}
                            </h4>
                            {post.total_questions > 0 && (
                              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                                To&apos;g&apos;ri: <b className="text-foreground">{post.correct_count}</b> / {post.total_questions} ta savol
                              </p>
                            )}
                          </div>

                          {post.score > 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400 block leading-none">
                                  {post.score?.toFixed(0)}%
                                </span>
                                {post.grade && (
                                  <span className="text-[10px] font-extrabold uppercase text-amber-300">
                                    {post.grade}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/70">
                            {post.subject_name}
                          </Badge>
                          <h4 className="font-black text-foreground text-base sm:text-lg leading-snug">
                            {post.title}
                          </h4>
                        </div>
                      )}

                      {/* 3. Post Caption / Student's words */}
                      {post.caption && (
                        <div className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pl-3 border-l-2 border-primary/50 italic bg-primary/[0.03] py-2 rounded-r-xl">
                          &ldquo;{post.caption}&rdquo;
                        </div>
                      )}

                      {/* 4. Generated Story / Certificate / Custom Uploaded Image Preview (Auto-fit, never cut off) */}
                      {post.image_url && (
                        <div
                          onClick={() => setPreviewImage(post.image_url)}
                          className="relative rounded-2xl overflow-hidden border border-[var(--border-card)] bg-black/40 group cursor-pointer flex items-center justify-center transition-all hover:border-primary/50 max-h-[520px] w-full"
                        >
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-auto max-h-[520px] object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                            <ExternalLink className="size-4" /> Rasmni to&apos;liq ko&apos;rish
                          </div>
                        </div>
                      )}

                      {/* 5. Viral CTA: "Shu testni topshirib ko'rish 🚀" */}
                      {post.test_id && (
                        <div className="pt-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs py-2.5 h-auto flex items-center justify-center gap-1.5"
                          >
                            <Link href={`/tests/mock/${post.test_id}`}>
                              <span>Shu testni siz ham yechib ko&apos;ring</span>
                              <ArrowRight className="size-3.5 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      )}

                      {/* 6. Reactions Bar & Comments trigger */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-card)]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['fire', 'clap', 'trophy', 'heart'] as const).map((rKey) => {
                            const count = postReactions.counts[rKey] || 0;
                            const isMyReaction = postReactions.user_reaction === rKey;
                            const meta = REACTION_EMOJIS[rKey];

                            return (
                              <button
                                key={rKey}
                                onClick={() => handleReact(post.id, rKey)}
                                className={cn(
                                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border",
                                  isMyReaction
                                    ? meta.activeClass
                                    : "bg-[var(--surface-hover)]/60 text-muted-foreground border-transparent hover:bg-[var(--surface-hover)] hover:text-foreground"
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
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-all"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>{post.comments_count || 0} izoh</span>
                        </button>
                      </div>

                      {/* 7. Collapsible Comments Section with Replies & Memes */}
                      {isCommentsOpen && (
                        <div className="pt-3 space-y-3 border-t border-[var(--border-card)]/60">
                          {isCommentsLoading ? (
                            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                              Izohlar yuklanmoqda...
                            </div>
                          ) : comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Hozircha izohlar yo&apos;q. Birinchi bo&apos;lib fikr bildiring! 🎉
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {comments.map((c) => {
                                const isReply = Boolean(c.parent_id);
                                return (
                                  <div
                                    key={c.id}
                                    className={cn(
                                      "flex items-start gap-2 text-xs p-2 rounded-xl transition-all",
                                      isReply
                                        ? "ml-6 bg-[var(--surface-hover)]/30 border-l-2 border-primary/40"
                                        : "bg-[var(--surface-hover)]/50"
                                    )}
                                  >
                                    {isReply && <CornerDownRight className="size-3 text-muted-foreground shrink-0 mt-1" />}
                                    <Avatar className="size-6 shrink-0 mt-0.5">
                                      {c.user_avatar && <AvatarImage src={c.user_avatar} alt={c.user_name} />}
                                      <AvatarFallback className="text-[9px] font-bold">
                                        {c.user_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span className="font-bold text-foreground truncate">{c.user_name}</span>
                                          <VerifiedBadge role={c.role} isSuperadmin={c.is_superadmin} isTeacher={c.is_teacher} size="xs" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{c.created_at}</span>
                                      </div>
                                      <p className="text-foreground/90 mt-0.5 leading-snug">{c.text}</p>
                                      <div className="mt-1 flex items-center gap-2">
                                        <button
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
                                          className="text-[10px] font-semibold text-primary hover:underline"
                                        >
                                          Javob berish
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Study/Comedy Memes bar */}
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                            <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                              Tezkor:
                            </span>
                            {STUDY_MEMES.map((m, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: (prev[post.id] ? prev[post.id] + ' ' : '') + m.text,
                                  }));
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[var(--surface-hover)] border border-[var(--border-card)] text-foreground/80 hover:text-foreground hover:border-primary/40 shrink-0 transition-colors"
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {/* Active Replying indicator */}
                          {postReplying && (
                            <div className="flex items-center justify-between text-xs px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                              <span className="truncate">
                                💬 <b>@{postReplying.userName}</b> ga javob berilmoqda
                              </span>
                              <button
                                onClick={() => setReplyingTo((prev) => ({ ...prev, [post.id]: null }))}
                                className="text-muted-foreground hover:text-foreground ml-2"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          )}

                          {/* Comment Input */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder="Fikr, tabrik yoki meme yozing..."
                              className="flex-1 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/60 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              maxLength={1000}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddComment(post.id)}
                              disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                              className="rounded-xl text-xs font-bold px-3 h-8"
                            >
                              <Send className="size-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })
          )}
          </div>
        </div>
      </main>

      {/* Lightbox Modal for previewing images */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center bg-black/60">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 size-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-all"
            >
              <X className="size-4" />
            </button>
            <img src={previewImage} alt="Post rasmi" className="w-auto h-auto max-h-[85vh] max-w-full object-contain" />
          </div>
        </div>
      )}

      {/* Create New Post Dialog Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[calc(100%-1.25rem)] sm:w-full sm:max-w-lg md:max-w-xl bg-[#11141d] border border-white/10 p-0 rounded-2xl sm:rounded-3xl max-h-[85svh] flex flex-col overflow-hidden shadow-2xl">
          {/* 1. Header with Tab Switcher (Pinned Top) */}
          <div className="p-4 sm:p-5 pb-3 border-b border-white/10 shrink-0 bg-[#141824]/60">
            <div className="flex items-center gap-2 pr-8">
              <PremiumIcon icon={Plus} tone="emerald" size="sm" glow />
              <h3 className="text-base sm:text-lg font-black text-foreground">Hamjamiyatga Post Qo&apos;yish</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              O&apos;quv yutuqlaringiz, test natijalaringiz yoki fikrlaringizni ulashing (+15 XP)!
            </p>

            {/* Segment Tab Switcher: 50% - 50% split */}
            <div
              className="mt-3 p-1 rounded-xl bg-[#181d28] border border-white/10"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}
            >
              <button
                type="button"
                onClick={() => setActiveModalTab('result')}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer",
                  activeModalTab === 'result'
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
              >
                <PremiumIcon icon={Award} tone="amber" size="xs" glow={activeModalTab === 'result'} />
                <span className="truncate">Natijani Ulashish</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('custom')}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer",
                  activeModalTab === 'custom'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
              >
                <PremiumIcon icon={UploadCloud} tone="emerald" size="xs" glow={activeModalTab === 'custom'} />
                <span className="truncate">Erkin Post &amp; Rasm</span>
              </button>
            </div>
          </div>

          {/* ── TAB 1: TEST NATIJASINI / SERTIFIKATNI ULASHISH ── */}
          {activeModalTab === 'result' && (
            <>
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5">
                {loadingAttempts ? (
                  <div className="py-10 text-center space-y-2">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Test natijalaringiz yuklanmoqda...</p>
                  </div>
                ) : userAttempts.length === 0 ? (
                  <div className="py-8 text-center space-y-2.5 p-4 rounded-xl bg-[#181d28] border border-dashed border-white/15">
                    <PremiumIcon icon={Award} tone="zinc" size="lg" className="mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Hali topshirilgan testlar yo&apos;q</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                        Avval birorta test yoki sertifikat imtihonini yeching, so&apos;ng natijangizni bu yerda ulashing.
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-xl font-bold text-xs">
                      <Link href="/tests">Amaliy Test Ishlash</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className="font-bold text-foreground">Ulashish uchun natijani tanlang:</span>
                      <span className="text-muted-foreground font-mono text-[10px] sm:text-[11px]">{userAttempts.length} ta natija</span>
                    </div>

                    {/* Testlar ro'yxati */}
                    <div className="space-y-2 max-h-52 sm:max-h-60 overflow-y-auto overflow-x-hidden pr-0.5">
                      {userAttempts.map((att) => {
                        const isSelected = selectedAttemptId === att.id;
                        const scoreVal = att.score || 0;
                        const isCert = scoreVal >= 60;
                        return (
                          <div
                            key={att.id}
                            onClick={() => setSelectedAttemptId(att.id)}
                            className={cn(
                              "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs",
                              isSelected
                                ? "bg-[#142322] border-emerald-500/70 shadow-xs ring-1 ring-emerald-500/40"
                                : "bg-[#181d28] border-white/10 hover:border-emerald-500/40"
                            )}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-foreground text-xs sm:text-sm truncate block">
                                  {att.test_title}
                                </span>
                                {isCert && (
                                  <Badge className="bg-amber-500/20 text-amber-500 text-[9px] sm:text-[10px] px-1.5 py-0.5 shrink-0 border border-amber-500/30 font-semibold">
                                    🏆 Sertifikat
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                                {att.correct_answers} to&apos;g&apos;ri &bull; {att.wrong_answers} xato &bull; {new Date(att.completed_at).toLocaleDateString('uz-UZ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "font-mono font-black text-xs px-2.5 py-1 rounded-lg border",
                                scoreVal >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                scoreVal >= 60 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              )}>
                                {scoreVal.toFixed(0)}%
                              </span>
                              <div className={cn(
                                "size-5 rounded-full border flex items-center justify-center transition-colors",
                                isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20"
                              )}>
                                {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Fikr / Izoh */}
                    <div>
                      <label className="text-[11px] sm:text-xs font-bold text-foreground mb-1 block">Fikr yoki Maslahat (Ixtiyoriy)</label>
                      <Textarea
                        value={attemptCaption}
                        onChange={(e) => setAttemptCaption(e.target.value)}
                        placeholder="Masalan: Mehnat o'z mevasini berdi! 88% A+ natija bilan sertifikat oldim..."
                        className="rounded-xl text-xs sm:text-sm bg-[#181d28] border-white/10 text-foreground min-h-[55px] sm:min-h-[65px] focus-visible:ring-emerald-500 resize-none"
                        maxLength={500}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Footer */}
              <div className="p-3.5 sm:p-4 bg-[#0d1017] border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl text-xs sm:text-sm font-semibold h-10 px-4 text-muted-foreground hover:text-foreground"
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
                  className="rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 h-10 px-5"
                >
                  {isSharingAttempt ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Joylanmoqda...
                    </>
                  ) : (
                    <>
                      <span>🚀 Hamjamiyatga Joylash (+15 XP)</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ── TAB 2: ERKIN POST & RASM ── */}
          {activeModalTab === 'custom' && (
            <form onSubmit={handleCreatePost} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5">
                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-foreground mb-1 block">Mavzu yoki Sarlavha</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Masalan: Bugun 50 ta biologiya testi yechdim!"
                    className="rounded-xl text-xs sm:text-sm bg-[#181d28] border-white/10 text-foreground h-10"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-foreground mb-1 block">Fan / Yo&apos;nalish</label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Biologiya, Kimyo, Tarix, Matematika..."
                    className="rounded-xl text-xs sm:text-sm bg-[#181d28] border-white/10 text-foreground h-10"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-foreground mb-1 block">Fikr yoki Taassurot</label>
                  <Textarea
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Abituriyent do'stlaringizga foydali maslahat yoki shijoatli so'zlar yozing..."
                    className="rounded-xl text-xs sm:text-sm bg-[#181d28] border-white/10 text-foreground min-h-[65px] sm:min-h-[75px] resize-none"
                    maxLength={1000}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-foreground mb-1 block">Rasm (Ixtiyoriy)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/60 p-2 flex items-center justify-center">
                      <img src={imagePreviewUrl} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setImagePreviewUrl(null);
                        }}
                        className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 bg-[#181d28]"
                    >
                      <PremiumIcon icon={UploadCloud} tone="emerald" size="md" glow />
                      <span className="text-xs font-bold text-foreground">Rasm yuklash</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP (maks. 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="p-3.5 sm:p-4 bg-[#0d1017] border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl text-xs sm:text-sm font-semibold h-10 px-4 text-muted-foreground hover:text-foreground"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 h-10 px-5"
                >
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> E&apos;lon qilinmoqda...
                    </>
                  ) : (
                    <>E&apos;lon qilish 🚀</>
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

