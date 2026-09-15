'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Globe, Sparkles, Award, Flame, Heart, Trophy, MessageCircle,
  Share2, ArrowRight, CheckCircle2, Send, ExternalLink,
  ChevronRight, Filter, BookOpen, Swords, Dna, FileCheck2, X, PlusCircle
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
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

type PostItem = {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    level: number;
  };
  post_type: 'test_result' | 'certificate';
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
};

type PostComment = {
  id: number;
  user_id: number;
  user_name: string;
  username: string;
  user_avatar: string;
  text: string;
  created_at: string;
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

  // Izohlar ochilishi va ma'lumotlari
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [postComments, setPostComments] = useState<Record<number, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});

  // Rasm preview lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      // Revert if error
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

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await apiFetch<{
        success: boolean;
        comment: PostComment;
        comments_count: number;
      }>(`/api/learning/feed/${postId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      if (res.success && res.comment) {
        soundFX.click();
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.comment],
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

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

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 sm:space-y-8 bg-[var(--bg-page)] p-4 pb-20 sm:p-6">
        {/* Page Hero */}
        <PageHero
          tone="emerald"
          eyebrow="Abituriyentlar Yutuqlari"
          eyebrowIcon={Globe}
          title="Hamjamiyat Lentasi"
          description="O'quvchilarning real test natijalari, sertifikatlari va yutuqlari. Bir-biringizni qo'llab-quvvatlang va bilimingizni sinang!"
          actions={
            <Button
              asChild
              size="sm"
              className="rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
            >
              <Link href="/tests/history">
                <PlusCircle className="size-4 mr-1.5" /> Natijamni ulashish
              </Link>
            </Button>
          }
        />

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0 border",
                  isSel
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                    : "bg-[var(--surface-card)] text-muted-foreground border-[var(--border-card)] hover:bg-[var(--surface-hover)]"
                )}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Feed Content List */}
        <div className="max-w-2xl mx-auto space-y-6">
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
                    Birinchi bo&apos;lib test topshiring yoki sertifikatingizni ulashing va lentada paydo bo&apos;ling!
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground">
                  <Link href="/tests">Test topshirish 🚀</Link>
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

              return (
                <Reveal key={post.id} delay={idx * 0.05}>
                  <Card className="overflow-hidden border border-[var(--border-card)] bg-[var(--surface-card)] shadow-lg hover:border-[var(--border-strong)] transition-all">
                    <CardContent className="p-4 sm:p-6 space-y-4">
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
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-foreground text-sm leading-tight">
                                {post.author.name}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                Lv. {post.author.level}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              @{post.author.username} · {post.created_at}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-bold px-2.5 py-1",
                            isCert
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                              : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                          )}
                        >
                          {isCert ? '🏆 Sertifikat' : '📝 Sinov Testi'}
                        </Badge>
                      </div>

                      {/* 2. Test Title & Score Banner */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[var(--surface-hover)] to-[var(--surface-card-soft)] border border-[var(--border-card)] flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/70">
                            {post.subject_name}
                          </Badge>
                          <h4 className="font-black text-foreground text-sm sm:text-base leading-snug line-clamp-1">
                            {post.title}
                          </h4>
                          {post.total_questions > 0 && (
                            <p className="text-xs text-muted-foreground">
                              To&apos;g&apos;ri: <b className="text-foreground">{post.correct_count}</b> / {post.total_questions} ta savol
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400 block leading-none">
                              {post.score?.toFixed(0)}%
                            </span>
                            {post.grade && (
                              <span className="text-[10px] font-extrabold uppercase text-amber-300">
                                {post.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Post Caption / Student's words */}
                      {post.caption && (
                        <div className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pl-3 border-l-2 border-primary/50 italic bg-primary/[0.03] py-1.5 rounded-r-xl">
                          &ldquo;{post.caption}&rdquo;
                        </div>
                      )}

                      {/* 4. Generated Story / Certificate Card Preview */}
                      {post.image_url && (
                        <div
                          onClick={() => setPreviewImage(post.image_url)}
                          className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group cursor-pointer aspect-[16/9] sm:aspect-[2/1] flex items-center justify-center transition-all hover:border-amber-400/40"
                        >
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                            <ExternalLink className="size-4" /> Rasmni kattalashtirish
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

                      {/* 7. Collapsible Comments Section */}
                      {isCommentsOpen && (
                        <div className="pt-3 space-y-3 border-t border-[var(--border-card)]/60">
                          {isCommentsLoading ? (
                            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                              Izohlar yuklanmoqda...
                            </div>
                          ) : comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Hozircha izohlar yo&apos;q. Birinchi bo&apos;lib tabriklang! 🎉
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {comments.map((c) => (
                                <div key={c.id} className="flex items-start gap-2 text-xs bg-[var(--surface-hover)]/40 p-2 rounded-xl">
                                  <Avatar className="size-6 shrink-0 mt-0.5">
                                    {c.user_avatar && <AvatarImage src={c.user_avatar} alt={c.user_name} />}
                                    <AvatarFallback className="text-[9px] font-bold">
                                      {c.user_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="font-bold text-foreground truncate">{c.user_name}</span>
                                      <span className="text-[10px] text-muted-foreground">{c.created_at}</span>
                                    </div>
                                    <p className="text-foreground/90 mt-0.5 leading-snug">{c.text}</p>
                                  </div>
                                </div>
                              ))}
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
                              placeholder="Tabrik yoki fikringizni yozing..."
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
      </main>

      {/* Lightbox Modal for previewing images */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
            <img src={previewImage} alt="Natija kartasi" className="w-full h-auto object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
