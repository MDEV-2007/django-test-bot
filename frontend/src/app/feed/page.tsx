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
  Check,
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
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

import AppShell from '@/components/AppShell';
import SmartB2BSuggestionCard from '@/components/dashboard/SmartB2BSuggestionCard';
import { Panel, PanelLabel, PanelLink, Initials } from '@/components/design/kit';
import { useApiQuery } from '@/lib/api-cache';
import { TrendingUp } from 'lucide-react';
import Reveal from '@/components/motion/Reveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import PremiumIcon from '@/components/ui/premium-icon';
import { IlmIcon, ILM_STICKERS, withIlmIcons, type IlmIconName } from '@/components/brand/IlmIcons';
import VerifiedBadge from '@/components/ui/verified-badge';
import { cn } from '@/lib/utils';
import FeedStoriesBar from '@/components/feed/FeedStoriesBar';
import SosQuestionCard from '@/components/feed/SosQuestionCard';
import TargetedAdBanner, { type TargetedOfferData } from '@/components/feed/TargetedAdBanner';
import AutoShareModal from '@/components/feed/AutoShareModal';
import ImageLightbox from '@/components/feed/ImageLightbox';
import ReportPostDialog from '@/components/feed/ReportPostDialog';
import { useTransliterate } from '@/lib/transliterate';

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
  post_type: 'test_result' | 'certificate' | 'achievement' | 'sos_question' | 'edu_clip';
  poll_data?: any;
  video_url?: string;
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
  page?: number;
  has_more?: boolean;
  subjects: { slug: string; name: string }[];
  user_track?: string;
  user_attempted_slugs?: string[];
};

const REACTION_EMOJIS: Record<string, { icon: IlmIconName; label: string; activeClass: string }> = {
  fire: { icon: 'fire', label: 'Olov', activeClass: 'bg-[var(--ps-orange)] text-[#080808]' },
  clap: { icon: 'clap', label: 'Qarsak', activeClass: 'bg-[var(--ps-green)] text-white' },
  trophy: { icon: 'trophy', label: 'Kubok', activeClass: 'bg-[var(--ps-purple)] text-white' },
  heart: { icon: 'heart', label: 'Yurak', activeClass: 'bg-[var(--ps-coral)] text-white' },
};

type LbRow = { profile_id: number; username: string; first_name: string; last_name: string; avatar_url: string; xp: number };

/* Right rail of the community page: trending subjects (counted from the posts actually
   loaded), this week's top learners (leaderboard API) and the native sponsored slot. */
function FeedSidebar({ posts }: { posts: PostItem[] }) {
  const { data: lb } = useApiQuery<{ podium?: LbRow[]; rankings?: LbRow[]; top?: LbRow[] }>('/api/leaderboard/?timeframe=weekly');
  const leaders = [...(lb?.podium || []), ...(lb?.rankings || []), ...(lb?.top || [])].slice(0, 4);

  const trending = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const key = (p.subject_name || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  return (
    <aside className="hidden xl:block space-y-4 xl:sticky xl:top-20 self-start">
      <Panel>
        <PanelLabel icon={TrendingUp}>Trendda</PanelLabel>
        {trending.length === 0 ? (
          <p className="text-xs text-muted-foreground">Hozircha postlar kam.</p>
        ) : (
          <ul className="space-y-3">
            {trending.map(([name, n]) => (
              <li key={name}>
                <p className="text-[13px] font-bold text-foreground">#{name.replace(/\s+/g, '')}</p>
                <p className="text-[11px] text-muted-foreground">{n} ta post</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelLabel icon={Trophy} right={<PanelLink href="/leaderboard">Reyting</PanelLink>}>
          Hafta yetakchilari
        </PanelLabel>
        {leaders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Bu hafta hali natija yo&apos;q.</p>
        ) : (
          <ul className="space-y-3">
            {leaders.map((r, i) => (
              <li key={r.profile_id} className="flex items-center gap-2.5">
                <Initials name={`${r.first_name || r.username} ${r.last_name || ''}`} src={r.avatar_url} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.username}
                  </p>
                  <p className="text-[10px] text-muted-foreground">#{i + 1} · {r.xp.toLocaleString('uz-UZ')} XP</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SmartB2BSuggestionCard />
    </aside>
  );
}

export default function CommunityFeedPage() {
  const router = useRouter();
  const { t } = useTransliterate();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  // Sahifalash (server 20 tadan beradi).
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
  const closePreview = useCallback(() => setPreviewImage(null), []);
  const [reportPostId, setReportPostId] = useState<number | null>(null);

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
  const [examTrack, setExamTrack] = useState<string>('DTM_SERTIFIKAT');
  const [userAttemptedSlugs, setUserAttemptedSlugs] = useState<string[]>([]);
  const [userTrack, setUserTrack] = useState<string>('DTM_SERTIFIKAT');
  const [targetedOffer, setTargetedOffer] = useState<TargetedOfferData | null>(null);

  useEffect(() => {
    async function loadTargetedOffer() {
      try {
        const res = await apiFetch<TargetedOfferData>('/api/v1/system/ads/targeted-offer/');
        if (res && res.title) setTargetedOffer(res);
      } catch {
        // Reklama ixtiyoriy: server javob bermasa banner ko'rsatilmaydi. Ilgari bu yerda
        // mavjud bo'lmagan markazning soxta taklifi chizilardi.
        setTargetedOffer(null);
      }
    }
    loadTargetedOffer();
  }, []);

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

  const loadFeed = useCallback(async (filter = 'all', page = 1) => {
    const append = page > 1;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      let query = '';
      if (filter === 'certificate') {
        query = '?type=certificate';
      } else if (filter === 'my_subjects') {
        query = '?subject=my_subjects';
      } else if (filter !== 'all') {
        query = `?subject=${encodeURIComponent(filter)}`;
      }

      const pageParam = `${query ? '&' : '?'}page=${page}`;
      const res = await apiFetch<FeedResponse>(`/api/learning/feed/${query}${pageParam}`);
      if (res && res.posts) {
        setPosts((prev) => (append ? [...prev, ...res.posts.filter((p) => !prev.some((x) => x.id === p.id))] : res.posts));
        setFeedPage(page);
        setHasMore(Boolean(res.has_more));
        if (res.subjects) setSubjects(res.subjects);
        if (res.user_attempted_slugs) setUserAttemptedSlugs(res.user_attempted_slugs);
        if (res.user_track) setUserTrack(res.user_track);

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
        setReactions((prev) => (append ? { ...prev, ...initialReactions } : initialReactions));
      }
    } catch {
      toast.error("Hamjamiyat lentasini yuklab bo'lmadi");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(selectedFilter);
  }, [selectedFilter, loadFeed]);

  function handleReportPost(postId: number) {
    setReportPostId(postId);
  }

  async function submitReport(reason: string, details: string) {
    if (reportPostId === null) return;
    try {
      const res = await apiFetch<{ message: string; already_reported: boolean }>(
        `/api/learning/feed/${reportPostId}/report/`,
        { method: 'POST', body: JSON.stringify({ reason, details }) },
      );
      toast.success(res.already_reported ? 'Siz bu postga allaqachon shikoyat qilgansiz.' : res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shikoyat yuborilmadi");
      throw e;
    }
  }

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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 pb-28">
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="mx-auto max-w-2xl space-y-5 w-full min-w-0">
          {/* 0. Kunlik Streak & O'quv Markaz Stories */}
          <FeedStoriesBar examTrack={examTrack} />


          {/* 1. Sarlavha */}
          <section className="pt-2">
            <span className="ps-chip">
              <TrendingUp className="size-3.5 text-[var(--ps-purple)]" /> Hamjamiyat lentasi
            </span>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <h1 className="ps-display text-[48px] sm:text-[68px]">
                Nima{' '}
                <span className="relative inline-block text-[var(--ps-purple)]">
                  gap
                  <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                    <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                  </svg>
                </span>
                <span className="text-[var(--ps-coral)]">?</span>
              </h1>
              <div className="flex items-center gap-2">
                <Link href="/tests/history" className="ps-chip hidden sm:inline-flex">
                  <Award className="size-3.5 text-[var(--ps-orange)]" /> Natijalarim
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalTab('result');
                    setIsCreateModalOpen(true);
                  }}
                  className="ps-btn ps-btn-ink !min-h-11"
                >
                  <Plus className="size-4 stroke-[2.5]" /> Yangi post
                </button>
              </div>
            </div>
          </section>

          {/* 2. iOS 18 Quick Composer Card */}
          <div
            onClick={() => {
              setActiveModalTab('result');
              setIsCreateModalOpen(true);
            }}
            className="ps-card ps-lift flex cursor-pointer items-center justify-between gap-3 !rounded-full p-2.5 pl-3 sm:p-3 sm:pl-3.5"
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
                <p className="text-[12px] font-medium text-primary mt-0.5">
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
                className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-orange)]/14 border border-[var(--ps-orange)]/25 px-3 py-1.5 text-[12px] font-bold text-[#8A5A00] dark:text-[var(--ps-orange)] cursor-pointer"
              >
                <PremiumIcon icon={Award} tone="amber" size="2xs" />
                <span>Natija</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalTab('custom');
                  setIsCreateModalOpen(true);
                }}
                className="ios-spring hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)]/14 border border-[var(--ps-green)]/25 px-3 py-1.5 text-[12px] font-bold text-[var(--ps-green)] cursor-pointer"
              >
                <PremiumIcon icon={Camera} tone="emerald" size="2xs" />
                <span>Rasm</span>
              </button>
            </div>
          </div>

          {/* 3. iOS Filter Pills & Smart Hub Isolation */}
          <div className="space-y-2">
            {userAttemptedSlugs.length > 0 && (
              <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Smart Hub: <strong>{userTrack === 'IELTS_SAT' ? 'IELTS & SAT' : 'Milliy Sertifikat / DTM'}</strong> · Faol yechayotgan fanlaringiz asosida saralandi
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { slug: 'all', label: 'Barchasi' },
                ...(userAttemptedSlugs.length > 0
                  ? [{ slug: 'my_subjects', label: '🎯 Mening fanlarim' }]
                  : []),
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
                    'ios-spring shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer',
                    isSel
                      ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                      : 'bg-[var(--ps-paper)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {t(tab.label)}
                </button>
              );
            })}
            </div>
          </div>

          {/* 4. Feed Stream */}
          <div className="space-y-4 w-full min-w-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ios-card rounded-2xl p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-muted rounded-full" />
                        <div className="h-3 w-20 bg-muted/60 rounded-full" />
                      </div>
                    </div>
                    <div className="h-36 w-full bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Reveal>
                <div className="ios-card rounded-2xl py-14 px-5 text-center space-y-4">
                  <PremiumIcon icon={Trophy} tone="amber" size="xl" className="mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Hozircha postlar mavjud emas
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                      Birinchi bo&apos;lib natijangiz yoki fikringizni ulashing va +15 XP bonus oling!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(118,89,199,0.45)] cursor-pointer"
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
                const postReplying = replyingTo[post.id];

                const commentsSheet = (
                  <div className="pt-3 space-y-3 border-t border-border">
                    {isCommentsLoading ? (
                      <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                        Izohlar yuklanmoqda...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex items-center justify-center gap-2.5 rounded-[22px] bg-[var(--ps-neutral)] px-4 py-3.5 text-[13px] font-semibold text-[var(--text-secondary)]">
                        <IlmIcon name="party" className="size-7 shrink-0" />
                        Hozircha izohlar yo&apos;q. Birinchi bo&apos;lib tabriklang!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {comments.map((c) => {
                          const isReply = Boolean(c.parent_id);
                          return (
                            <div
                              key={c.id}
                              className={cn(
                                'flex items-start gap-2.5 text-xs p-2.5 rounded-lg transition-all',
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
                                <AvatarFallback className="text-[11px] font-bold bg-primary/12 text-primary">
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
                                  <span className="text-[12px] text-muted-foreground shrink-0">
                                    {c.created_at}
                                  </span>
                                </div>
                                <p className="text-foreground/90 mt-0.5 leading-snug">{withIlmIcons(c.text)}</p>
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
                                  className="mt-1 text-[12px] font-bold text-primary hover:underline cursor-pointer"
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
                      {ILM_STICKERS.map((m) => (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => {
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: (prev[post.id] ? prev[post.id] + ' ' : '') + m.text,
                            }));
                          }}
                          className="group/st inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--ps-neutral)] pl-1.5 pr-3.5 text-[13px] font-bold text-[var(--text-primary)] transition-all hover:bg-[#080808] hover:text-[#FFFCF7] active:scale-95 dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]"
                        >
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--ps-paper)] transition-transform group-hover/st:-rotate-12 group-hover/st:scale-110">
                            <IlmIcon name={m.icon} className="size-5" />
                          </span>
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
                );
                const isCert = post.post_type === 'certificate' || (post.score && post.score >= 60);
                const canDelete = Boolean(
                  post.can_delete ||
                    (user &&
                      ((user.id && post.author?.id && Number(user.id) === Number(post.author.id)) ||
                        (user.username &&
                          post.author?.username &&
                          user.username.toLowerCase() === post.author.username.toLowerCase())))
                );

                // Agar SOS interaktiv savoli bo'lsa
                if (post.post_type === 'sos_question' && post.poll_data) {
                  return (
                    <Reveal key={post.id} delay={idx * 0.03}>
                      <SosQuestionCard
                        postId={post.id}
                        author={post.author}
                        subjectName={post.subject_name}
                        title={post.title}
                        caption={post.caption}
                        pollData={post.poll_data}
                        commentsCount={post.comments_count}
                        onOpenComments={() => toggleComments(post.id)}
                        currentUserId={user?.id}
                      />
                      {isCommentsOpen && (
                        <div className="ps-card mt-2 !rounded-[28px] p-4 sm:p-5 [&>div]:border-t-0 [&>div]:pt-0">
                          {commentsSheet}
                        </div>
                      )}
                    </Reveal>
                  );
                }

                return (
                  <Reveal key={post.id} delay={idx * 0.03}>
                    {idx === 1 && targetedOffer && (
                      <div className="mb-4">
                        <TargetedAdBanner offer={targetedOffer} weakTopics="Qadimgi Rim, Ochiq savollar" />
                      </div>
                    )}
                    <article className="ios-card overflow-hidden rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
                      {/* 1. Author Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-10 sm:size-11 border border-border shrink-0">
                            {post.author.avatar && (
                              <AvatarImage src={post.author.avatar} alt={post.author.name} />
                            )}
                            <AvatarFallback className="font-bold bg-primary text-white text-xs sm:text-sm">
                              {post.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground text-sm leading-tight truncate">
                                {post.author.name}
                              </span>
                              <VerifiedBadge
                                role={post.author.role}
                                isSuperadmin={post.author.is_superadmin}
                                isTeacher={post.author.is_teacher}
                                size="xs"
                              />
                              <span className="rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[12px] font-bold text-primary">
                                Lvl {post.author.level}
                              </span>
                              {post.is_pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-coral)]/14 px-2 py-0.5 text-[12px] font-bold text-[var(--ps-coral)]">
                                  <Pin className="size-2.5" /> Qadalgan
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] font-medium text-muted-foreground mt-0.5 truncate">
                              @{post.author.username} · {post.created_at}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10.5px] font-bold border',
                              post.post_type === 'achievement'
                                ? 'border-[var(--ps-purple)]/30 bg-[var(--ps-purple)]/12 text-[var(--ps-purple)]'
                                : isCert
                                ? 'border-[var(--ps-orange)]/30 bg-[var(--ps-orange)]/14 text-[#8A5A00] dark:text-[var(--ps-orange)]'
                                : 'border-[var(--ps-purple)]/30 bg-[var(--ps-purple)]/12 text-[var(--ps-purple)]'
                            )}
                          >
                            {post.post_type === 'achievement'
                              ? '✨ Post'
                              : isCert
                              ? '🏆 Sertifikat'
                              : '📝 Sinov Testi'}
                          </span>

                          {!canDelete && user && (
                            <button
                              type="button"
                              onClick={() => handleReportPost(post.id)}
                              className="ios-spring flex size-7.5 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--ps-orange)] hover:bg-[var(--ps-orange)]/12 transition-colors cursor-pointer"
                              title="Shikoyat qilish"
                              aria-label="Postga shikoyat qilish"
                            >
                              <Flag className="size-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="ios-spring flex size-7.5 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--ps-coral)] hover:bg-[var(--ps-coral)]/12 transition-colors cursor-pointer"
                              title="Postni o'chirish"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Result / Subject Summary Block */}
                      {post.score > 0 || post.total_questions > 0 || post.grade ? (
                        <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[var(--ps-neutral)] p-4 min-w-0">
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="inline-block rounded-full bg-card border border-border px-2.5 py-0.5 text-[12px] font-bold text-muted-foreground">
                              {post.subject_name}
                            </span>
                            <h4 className="font-bold text-foreground text-xs sm:text-sm leading-snug line-clamp-1">
                              {post.title}
                            </h4>
                            {post.total_questions > 0 && (
                              <p className="text-[12px] font-medium text-muted-foreground truncate">
                                To&apos;g&apos;ri javoblar:{' '}
                                <strong className="text-foreground">{post.correct_count}</strong> /{' '}
                                {post.total_questions} ta
                              </p>
                            )}
                          </div>

                          {post.score > 0 && (
                            <div className="flex flex-col items-end shrink-0 rounded-[18px] bg-[var(--ps-green)] px-4 py-2.5 text-white">
                              <span className="ps-num text-[26px] sm:text-[32px] leading-none">
                                {post.score?.toFixed(0)}%
                              </span>
                              {post.grade && (
                                <span className="mt-1 text-[11px] font-bold uppercase text-[var(--ps-orange)]">
                                  Daraja: {post.grade}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {post.subject_name && (
                            <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-bold text-muted-foreground">
                              {post.subject_name}
                            </span>
                          )}
                          <h4 className="font-bold text-foreground text-sm sm:text-base leading-snug">
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
                          className="relative overflow-hidden rounded-xl border border-border bg-[var(--ps-neutral)] group cursor-pointer flex items-center justify-center max-h-[500px] w-full"
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
                          className="ios-spring flex items-center justify-between rounded-full bg-[#080808] px-5 py-3 text-xs font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5 dark:bg-[#FFFCF7] dark:text-[#080808]"
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
                                  'group/react ios-spring flex h-10 cursor-pointer items-center gap-1.5 rounded-full pl-1.5 text-[13px] font-bold transition-all active:scale-90',
                                  count > 0 ? 'pr-3' : 'pr-1.5',
                                  isMyReaction
                                    ? meta.activeClass
                                    : 'bg-[var(--ps-neutral)] text-[var(--text-secondary)] hover:-translate-y-0.5'
                                )}
                                title={meta.label}
                                aria-label={meta.label}
                                aria-pressed={isMyReaction}
                              >
                                <span className={cn('inline-flex size-7 items-center justify-center rounded-full transition-transform group-hover/react:scale-110', isMyReaction ? 'bg-[#FFFCF7]' : 'bg-[var(--ps-paper)]')}>
                                  <IlmIcon name={meta.icon} className="size-5" />
                                </span>
                                {count > 0 && <span className="font-[family-name:var(--font-grotesk)] tabular-nums">{count}</span>}
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

                      {/* 7. Izohlar */}
                      {isCommentsOpen && commentsSheet}
                    </article>
                  </Reveal>
                );
              })
            )}
            {hasMore && posts.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => loadFeed(selectedFilter, feedPage + 1)}
                  disabled={loadingMore}
                  className="rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60 cursor-pointer"
                >
                  {loadingMore ? 'Yuklanmoqda...' : "Ko'proq ko'rsatish"}
                </button>
              </div>
            )}
          </div>
        </div>
        <FeedSidebar posts={posts} />
        </div>
      </main>

      {/* Lightbox Modal */}
      <ImageLightbox src={previewImage} onClose={closePreview} />

      {/* Shikoyat modali */}
      <ReportPostDialog
        open={reportPostId !== null}
        onOpenChange={(o) => { if (!o) setReportPostId(null); }}
        onSubmit={submitReport}
      />

      {/* Create New Post Dialog Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="ps-shell flex max-h-[90svh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)] sm:w-full sm:max-w-lg sm:p-0 dark:bg-[var(--ps-paper)]"
        >
          {/* Sarlavha lentasi */}
          <div className="relative shrink-0 overflow-hidden bg-[var(--ps-green)] px-5 pb-5 pt-5 text-white sm:px-6">
            <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/15" />
            <span aria-hidden className="absolute -bottom-8 right-24 size-16 rounded-full bg-[var(--ps-orange)] opacity-80" />
            <span aria-hidden className="ps-dots absolute bottom-3 left-1/2 h-10 w-24 opacity-25" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7] text-[var(--ps-green)]">
                  <Plus className="size-5 stroke-[3]" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="ps-display text-[22px] text-white sm:text-[26px]">
                    Hamjamiyatga post
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[12.5px] !text-white/85">
                    Test natijangizni yoki fikringizni do&apos;stlaringiz bilan ulashing
                    <span className="ml-1.5 inline-flex rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[11px] font-black text-[#080808]">+15 XP</span>
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Yopish"
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white hover:text-[#080808]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Tablar */}
          <div className="shrink-0 px-5 pt-4 sm:px-6">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-[var(--ps-neutral)] p-1">
              {([
                ['result', Award, 'Natijani ulashish'],
                ['custom', UploadCloud, 'Erkin post & rasm'],
              ] as const).map(([key, Icon, label]) => {
                const active = activeModalTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveModalTab(key)}
                    className={cn(
                      'flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2.5 text-[12.5px] font-bold transition-all sm:text-[13px]',
                      active
                        ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active && 'text-[var(--ps-orange)]')} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeModalTab === 'result' && (
            <>
              <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6">
                {loadingAttempts ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Loader2 className="size-6 animate-spin text-[var(--ps-purple)]" />
                    <p className="text-[12.5px] font-semibold text-[var(--text-muted)]">Test natijalaringiz yuklanmoqda...</p>
                  </div>
                ) : userAttempts.length === 0 ? (
                  <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[26px] bg-[var(--ps-neutral)] px-5 py-8 text-center">
                    <span aria-hidden className="ps-dots absolute right-4 top-4 h-10 w-16 opacity-20" />
                    <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                      <Award className="size-7" />
                    </span>
                    <div>
                      <p className="ps-display text-[20px]">Hali topshirilgan testlar yo&apos;q</p>
                      <p className="mx-auto mt-1 max-w-xs text-[13px] text-[var(--text-secondary)]">
                        Avval birorta test yeching, so&apos;ng natijangizni bu yerda ulashing.
                      </p>
                    </div>
                    <Link href="/tests" className="ps-btn ps-btn-ink mt-1">
                      Test ishlash
                      <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-black uppercase tracking-wider text-[var(--text-muted)]">Natijani tanlang</span>
                      <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--text-secondary)]">
                        {userAttempts.length} ta natija
                      </span>
                    </div>

                    <div className="max-h-60 space-y-2 overflow-y-auto pr-0.5">
                      {userAttempts.map((att) => {
                        const isSelected = selectedAttemptId === att.id;
                        const scoreVal = att.score || 0;
                        const isCert = scoreVal >= 60;
                        const tone =
                          scoreVal >= 80
                            ? 'bg-[var(--ps-green)] text-white'
                            : scoreVal >= 60
                              ? 'bg-[var(--ps-orange)] text-[#080808]'
                              : 'bg-[var(--ps-coral)] text-white';
                        return (
                          <button
                            type="button"
                            key={att.id}
                            onClick={() => setSelectedAttemptId(att.id)}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-3 rounded-[22px] p-2 pr-3 text-left transition-colors',
                              isSelected
                                ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                                : 'bg-[var(--ps-neutral)] text-[var(--text-primary)] hover:bg-[var(--ps-cream)]'
                            )}
                          >
                            <span className={cn('inline-flex size-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[14px] font-bold', tone)}>
                              {scoreVal.toFixed(0)}%
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-[14px] font-bold">{att.test_title}</span>
                                {isCert && (
                                  <span className="shrink-0 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10.5px] font-black text-[#080808]">
                                    Sertifikat
                                  </span>
                                )}
                              </span>
                              <span className={cn('mt-0.5 block truncate text-[12px] font-medium', isSelected ? 'opacity-70' : 'text-[var(--text-muted)]')}>
                                {att.correct_answers} to&apos;g&apos;ri · {att.wrong_answers} xato · {new Date(att.completed_at).toLocaleDateString('uz-UZ')}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all',
                                isSelected ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-paper)]'
                              )}
                            >
                              {isSelected && <Check className="size-4 stroke-[3]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <label className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-3 pt-2.5 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Izoh yoki maslahat · ixtiyoriy</span>
                      <textarea
                        value={attemptCaption}
                        onChange={(e) => setAttemptCaption(e.target.value)}
                        placeholder="Masalan: Mehnat o'z mevasini berdi! 88% natija oldim..."
                        className="mt-1 min-h-[60px] w-full resize-none bg-transparent text-[14px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                        maxLength={500}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-[var(--border-card)] px-5 py-4 sm:px-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="ps-btn ps-btn-ghost">
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={!selectedAttemptId || isSharingAttempt}
                  onClick={() => {
                    const att = userAttempts.find((a) => a.id === selectedAttemptId);
                    if (att) handleShareAttempt(att.id, att.score);
                  }}
                  className="ps-btn ps-btn-ink"
                >
                  {isSharingAttempt ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Joylanmoqda...
                    </>
                  ) : (
                    <>
                      Joylash · +15 XP
                      <span className="ps-btn-arrow"><Send className="size-4" /></span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {activeModalTab === 'custom' && (
            <form onSubmit={handleCreatePost} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4 sm:px-6">
                <label className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-2.5 pt-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Mavzu yoki sarlavha</span>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Masalan: Bugun 50 ta tarix testi yechdim!"
                    className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                    maxLength={150}
                  />
                </label>

                <label className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-2.5 pt-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Fan / yo&apos;nalish</span>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Tarix, Ona tili, Matematika, Biologiya..."
                    className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                    maxLength={60}
                  />
                </label>

                <label className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-3 pt-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Fikr yoki taassurot</span>
                  <textarea
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Do'stlaringizga foydali maslahat yoki motivatsiya yozing..."
                    className="mt-1 min-h-[72px] w-full resize-none bg-transparent text-[14px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                    maxLength={1000}
                  />
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreviewUrl ? (
                  <div className="relative flex items-center justify-center overflow-hidden rounded-[22px] bg-[var(--ps-neutral)] p-2">
                    <img src={imagePreviewUrl} alt="Preview" className="max-h-44 rounded-[16px] object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                      aria-label="Rasmni olib tashlash"
                      className="absolute right-3 top-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#080808]/75 text-white transition-colors hover:bg-[var(--ps-coral)]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-[22px] border-2 border-dashed border-[var(--border-card)] p-3 text-left transition-colors hover:border-[var(--ps-green)]"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-green)] text-white transition-transform group-hover:scale-105">
                      <UploadCloud className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold">Rasm qo&apos;shish · ixtiyoriy</span>
                      <span className="block text-[12px] font-medium text-[var(--text-muted)]">PNG, JPG, WebP · maks. 5 MB</span>
                    </span>
                  </button>
                )}
              </div>

              <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-[var(--border-card)] px-5 py-4 sm:px-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="ps-btn ps-btn-ghost">
                  Bekor qilish
                </button>
                <button type="submit" disabled={isSubmittingPost} className="ps-btn ps-btn-ink">
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> E&apos;lon qilinmoqda...
                    </>
                  ) : (
                    <>
                      E&apos;lon qilish
                      <span className="ps-btn-arrow"><Send className="size-4" /></span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
