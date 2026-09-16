'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Plus, Trash2, Eye, ExternalLink, RefreshCw,
  Flame, CheckCircle2, XCircle, AlertCircle, Send, Heart,
  BookOpen, Swords, Dna, Globe, Sliders, Layers, HelpCircle,
  Pin, Video, Camera, MessageCircle, X
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import PremiumIcon, { PremiumIconTone } from '@/components/ui/premium-icon';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ReelQuiz = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type PanelReelItem = {
  id: number;
  subject_name: string;
  subject_slug: string;
  category_badge: string;
  tagline: string;
  hook: string;
  fact: string;
  takeaway: string;
  gradient_theme: string;
  gradient: string;
  media_type?: 'text' | 'video';
  video_url?: string;
  quiz: ReelQuiz;
  is_published: boolean;
  likes: number;
  shares: number;
  views: number;
  created_at: string | null;
};

type PanelCommunityPost = {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    level: number;
  };
  post_type: string;
  title: string;
  subject_name: string;
  score: number;
  caption: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
};

type HardestQuestion = {
  question_id: number;
  subject_name: string;
  subject_slug: string;
  difficulty: string;
  clean_body: string;
  options: string[];
  correct_index: number;
  explanation: string;
  fail_rate: number;
  wrong_count: number;
  total_count: number;
  suggested_hook: string;
  suggested_tagline: string;
};

const THEMES = [
  { id: 'purple', name: 'Binafsharang Neon', tone: 'purple' as PremiumIconTone },
  { id: 'rose', name: 'Qizil Otash', tone: 'rose' as PremiumIconTone },
  { id: 'sky', name: 'Moviy Osmon', tone: 'sky' as PremiumIconTone },
  { id: 'emerald', name: 'Zumrad Yashil', tone: 'emerald' as PremiumIconTone },
  { id: 'amber', name: 'Oltin Quyosh', tone: 'amber' as PremiumIconTone },
];

export default function PanelReelsPage() {
  const [activeTab, setActiveTab] = useState<'reels' | 'community'>('reels');

  // Reels state
  const [reels, setReels] = useState<PanelReelItem[]>([]);
  const [hardestQuestions, setHardestQuestions] = useState<HardestQuestion[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Hamjamiyat state
  const [communityPosts, setCommunityPosts] = useState<PanelCommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewReel, setPreviewReel] = useState<PanelReelItem | null>(null);

  // Form inputs
  const [mediaType, setMediaType] = useState<'text' | 'video'>('text');
  const [videoUrl, setVideoUrl] = useState('');
  const [subjectName, setSubjectName] = useState('Tarix');
  const [subjectSlug, setSubjectSlug] = useState('tarix');
  const [categoryBadge, setCategoryBadge] = useState('');
  const [tagline, setTagline] = useState('Bilasizmi?');
  const [hook, setHook] = useState('');
  const [fact, setFact] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [gradientTheme, setGradientTheme] = useState('purple');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Load reels
  const loadReels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reels: PanelReelItem[]; stats: { total: number; published: number; drafts: number } }>('/api/panel/reels/');
      if (data && data.reels) {
        setReels(data.reels);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error("Reels ro'yxatini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load community posts
  const loadCommunityPosts = useCallback(async (filter = 'all') => {
    setCommunityLoading(true);
    try {
      const q = filter !== 'all' ? `?type=${encodeURIComponent(filter)}` : '';
      let data: { posts: PanelCommunityPost[]; total: number } | null = null;
      try {
        data = await apiFetch<{ posts: PanelCommunityPost[]; total: number }>(`/api/panel/community/${q}`);
      } catch (err: any) {
        if (err?.status === 404) {
          data = await apiFetch<{ posts: PanelCommunityPost[]; total: number }>(`/api/learning/feed/${q}`);
        } else {
          throw err;
        }
      }
      if (data && data.posts) {
        setCommunityPosts(data.posts);
      }
    } catch {
      toast.error("Hamjamiyat postlarini yuklashda xatolik");
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  // Load hardest questions
  const loadHardestQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const data = await apiFetch<{ questions: HardestQuestion[]; count: number }>('/api/panel/reels/hardest-questions/');
      if (data && data.questions) {
        setHardestQuestions(data.questions);
      }
    } catch {
      // ignore
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReels();
    loadHardestQuestions();
    loadCommunityPosts();
  }, [loadReels, loadHardestQuestions, loadCommunityPosts]);

  // Toggle publish status
  const handleTogglePublish = async (reel: PanelReelItem) => {
    const newStatus = !reel.is_published;
    try {
      await apiFetch(`/api/panel/reels/${reel.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: newStatus }),
      });
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, is_published: newStatus } : r))
      );
      setStats((prev) => ({
        ...prev,
        published: prev.published + (newStatus ? 1 : -1),
        drafts: prev.drafts + (newStatus ? -1 : 1),
      }));
      toast.success(newStatus ? "Reel chop etildi! O'quvchilar ko'ra oladi 🚀" : "Reel qoralamaga olindi 🟡");
    } catch {
      toast.error("Holatni o'zgartirishda xatolik");
    }
  };

  // Delete Reel
  const handleDeleteReel = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu Reelni o'chirmoqchimisiz?")) return;
    try {
      const targetReel = reels.find((r) => r.id === id);
      await apiFetch(`/api/panel/reels/${id}/`, { method: 'DELETE' });
      setReels((prev) => prev.filter((r) => r.id !== id));
      if (targetReel) {
        setStats((prev) => ({
          total: Math.max(0, prev.total - 1),
          published: targetReel.is_published ? Math.max(0, prev.published - 1) : prev.published,
          drafts: !targetReel.is_published ? Math.max(0, prev.drafts - 1) : prev.drafts,
        }));
      }
      toast.success("Reel muvaffaqiyatli o'chirildi!");
    } catch (err: any) {
      toast.error(err?.message || "O'chirishda xatolik");
    }
  };

  // Toggle Pin for community post
  const handleTogglePin = async (postId: number) => {
    try {
      let res: { success: boolean; is_pinned: boolean } | null = null;
      try {
        res = await apiFetch<{ success: boolean; is_pinned: boolean }>(
          `/api/panel/community/${postId}/pin/`,
          { method: 'POST' }
        );
      } catch (err: any) {
        if (err?.status === 404) {
          res = await apiFetch<{ success: boolean; is_pinned: boolean }>(
            `/api/learning/feed/${postId}/pin/`,
            { method: 'POST' }
          );
        } else {
          throw err;
        }
      }
      if (res) {
        setCommunityPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_pinned: res.is_pinned } : p))
        );
        toast.success(res.is_pinned ? "Post yuqoriga qadaldi 📌" : "Post qadoqdan olindi");
      }
    } catch {
      toast.error("Pin holatini o'zgartirib bo'lmadi");
    }
  };

  // Delete Community Post
  const handleDeleteCommunityPost = async (postId: number) => {
    if (!window.confirm("Haqiqatan ham ushbu postni o'chirmoqchimisiz?")) return;
    try {
      try {
        await apiFetch(`/api/panel/community/${postId}/delete/`, { method: 'DELETE' });
      } catch (err: any) {
        if (err?.status === 404) {
          await apiFetch(`/api/learning/feed/${postId}/delete/`, { method: 'DELETE' });
        } else {
          throw err;
        }
      }
      setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post hamjamiyatdan o'chirildi");
    } catch {
      toast.error("Postni o'chirishda xatolik");
    }
  };

  // Auto-fill from hardest question
  const handleUseHardestQuestion = (q: HardestQuestion) => {
    setMediaType('text');
    setVideoUrl('');
    setSubjectName(q.subject_name);
    setSubjectSlug(q.subject_slug);
    setCategoryBadge(`Eng Qiyin Savol (${q.difficulty})`);
    setTagline(q.suggested_tagline);
    setHook(q.suggested_hook);
    setFact(q.clean_body);
    setTakeaway(q.explanation || "Rasmiy dastur va testlar bo'yicha muhim qoida!");
    setQuizQuestion(q.clean_body);

    setOptionA(q.options[0] || 'Variant A');
    setOptionB(q.options[1] || 'Variant B');
    setOptionC(q.options[2] || 'Variant C');
    setOptionD(q.options[3] || 'Variant D');
    setCorrectIndex(q.correct_index || 0);
    setQuizExplanation(q.explanation || '');
    setGradientTheme('rose');
    setIsPublished(true);

    setIsModalOpen(true);
    toast.info("Savol ma'lumotlari avtomatik yuklandi! O'zgartirib darhol chop etishingiz mumkin.");
  };

  // Submit new Reel
  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hook.trim() || !fact.trim()) {
      toast.error("Iltimos, sarlavha va tushuntirishni kiriting!");
      return;
    }

    const options = [optionA, optionB, optionC, optionD].filter((o) => o.trim().length > 0);
    if (options.length < 2) {
      toast.error("Kamida 2 ta test varianti kiriting!");
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/panel/reels/', {
        method: 'POST',
        body: JSON.stringify({
          subject_name: subjectName,
          subject_slug: subjectSlug,
          category_badge: categoryBadge || `${subjectName} Fani`,
          tagline: tagline || 'Bilasizmi?',
          hook: hook.trim(),
          fact: fact.trim(),
          takeaway: takeaway.trim(),
          gradient_theme: gradientTheme,
          media_type: mediaType,
          video_url: mediaType === 'video' ? videoUrl.trim() : '',
          quiz_question: quizQuestion.trim() || hook.trim(),
          quiz_options: options,
          quiz_correct_index: correctIndex,
          quiz_explanation: quizExplanation.trim(),
          is_published: isPublished,
        }),
      });

      toast.success(isPublished ? "Reel yaratildi va chop etildi! 🚀" : "Reel qoralama sifatida saqlandi 🟡");
      setIsModalOpen(false);
      loadReels();

      // Reset form
      setHook('');
      setFact('');
      setTakeaway('');
      setVideoUrl('');
      setMediaType('text');
      setQuizQuestion('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setQuizExplanation('');
    } catch {
      toast.error("Reelni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PremiumIcon icon={Sparkles} tone="rose" size="md" glow />
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Bilim Reels & Hamjamiyat Boshqaruvi
              </h1>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                Viral 2.0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              TikTok/Instagram formatidagi mini-darslar, video reelslar hamda o&apos;quvchilarning hamjamiyat postlari moderatsiyasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reels"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Reelsni ko&apos;rish</span>
            </Link>
            <Link
              href="/feed"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Hamjamiyatni ochish</span>
            </Link>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-2xl gap-1.5 shadow-md font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Reel Yaratish</span>
            </Button>
          </div>
        </div>

        {/* Tab Switcher: Bilim Reels vs Hamjamiyat Moderatsiyasi */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('reels')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border",
              activeTab === 'reels'
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-sm"
                : "text-muted-foreground hover:bg-muted border-transparent"
            )}
          >
            <Sparkles className="size-4" />
            <span>🎬 Bilim Reels ({stats.total})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('community');
              loadCommunityPosts(communityFilter);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border",
              activeTab === 'community'
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm"
                : "text-muted-foreground hover:bg-muted border-transparent"
            )}
          >
            <Globe className="size-4" />
            <span>🌟 Hamjamiyat Moderatsiyasi ({communityPosts.length})</span>
          </button>
        </div>

        {/* TAB 1: BILIM REELS */}
        {activeTab === 'reels' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="rounded-3xl border-border/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Jami Reelslar</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{stats.total}</p>
                  </div>
                  <PremiumIcon icon={Layers} tone="indigo" size="md" />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">O&apos;quvchilarga Ochiq (Chop etilgan)</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.published}</p>
                  </div>
                  <PremiumIcon icon={CheckCircle2} tone="emerald" size="md" />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Qoralamalar (Yashirin)</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.drafts}</p>
                  </div>
                  <PremiumIcon icon={Sliders} tone="amber" size="md" />
                </CardContent>
              </Card>
            </div>

            {/* AI Generator Recommendation: Hardest questions */}
            {hardestQuestions.length > 0 && (
              <Card className="rounded-3xl border-rose-500/20 bg-rose-500/5 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                    <CardTitle className="text-base font-bold text-foreground">
                      Eng Ko&apos;p Xato Qilingan Savollar (AI Reel Tavsiyalari)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    O&apos;quvchilar eng ko&apos;p yiqilgan savollardan bir bosishda qiziqarli Reel yarating:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {hardestQuestions.slice(0, 3).map((q) => (
                      <div
                        key={q.question_id}
                        className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                              {q.subject_name} · Xatolik: {q.fail_rate}%
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {q.wrong_count > 0 ? `${q.wrong_count} ta xato` : 'BBA testi'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                            {q.clean_body}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseHardestQuestion(q)}
                          className="w-full text-xs font-bold rounded-xl gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Reelga Aylantirish</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reels Table List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-foreground">
                  Mavjud Bilim Reelslar ({reels.length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadReels}
                  className="rounded-xl gap-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yangilash</span>
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Reelslar yuklanmoqda...
                </div>
              ) : reels.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-3xl p-6 bg-card">
                  Hozircha hech qanday Reel yaratilmagan. Yuqoridagi tugma orqali birinchi Reelni qo&apos;shing!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reels.map((reel) => (
                    <Card
                      key={reel.id}
                      className="rounded-3xl border-border/80 bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {reel.subject_name}
                              </Badge>
                              {reel.media_type === 'video' ? (
                                <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-[10px] gap-1">
                                  <Video className="size-2.5" /> Video
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Matn
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {reel.created_at || '—'}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-foreground leading-snug line-clamp-2">
                            {reel.hook}
                          </h4>

                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {reel.fact}
                          </p>

                          {reel.media_type === 'video' && reel.video_url && (
                            <div className="text-[11px] text-primary truncate bg-primary/5 p-1.5 rounded-lg border border-primary/20">
                              🔗 {reel.video_url}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePublish(reel)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border",
                                reel.is_published
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              )}
                            >
                              {reel.is_published ? "🟢 Chop etilgan" : "🟡 Qoralama"}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteReel(reel.id)}
                              className="size-8 p-0 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HAMJAMIYAT MODERATSIYASI */}
        {activeTab === 'community' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'certificate', label: '🏆 Sertifikatlar' },
                  { id: 'test_result', label: '📝 Test Natijalari' },
                  { id: 'achievement', label: '✨ Erkin Postlar' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setCommunityFilter(f.id);
                      loadCommunityPosts(f.id);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors",
                      communityFilter === f.id
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => loadCommunityPosts(communityFilter)}
                className="rounded-xl gap-1 text-xs"
              >
                <RefreshCw className="size-3.5" /> Yangilash
              </Button>
            </div>

            {communityLoading ? (
              <div className="text-center py-16 text-muted-foreground text-xs animate-pulse">
                Hamjamiyat postlari yuklanmoqda...
              </div>
            ) : communityPosts.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-3xl bg-card text-muted-foreground text-xs space-y-2">
                <Globe className="size-8 mx-auto text-muted-foreground/40" />
                <p>Hozircha hech qanday post topilmadi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communityPosts.map((post) => (
                  <Card key={post.id} className="rounded-3xl border-border/80 bg-card overflow-hidden shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-9 border border-primary/20">
                            {post.author.avatar && <AvatarImage src={post.author.avatar} alt={post.author.name} />}
                            <AvatarFallback className="font-bold text-xs bg-primary/20 text-primary">
                              {post.author.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-xs">{post.author.name}</span>
                              <span className="text-[10px] text-muted-foreground">@{post.author.username}</span>
                              {post.is_pinned && (
                                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 rounded flex items-center gap-0.5">
                                  <Pin className="size-2.5" /> Qadalgan
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{post.created_at}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Pin/Unpin */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePin(post.id)}
                            className={cn(
                              "size-8 p-0 rounded-xl transition-colors",
                              post.is_pinned
                                ? "text-rose-500 hover:bg-rose-500/10"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            title={post.is_pinned ? "Qadoqdan olish" : "Yuqoriga qadash"}
                          >
                            <Pin className="size-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCommunityPost(post.id)}
                            className="size-8 p-0 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                            title="Postni o'chirish"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {post.subject_name || 'Umumiy'}
                          </Badge>
                          {post.score > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px]">
                              {post.score.toFixed(0)}% natija
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-foreground text-sm leading-snug">{post.title}</h4>
                        {post.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">
                            &ldquo;{post.caption}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Image Thumbnail */}
                      {post.image_url && (
                        <div
                          onClick={() => setLightboxImage(post.image_url)}
                          className="relative rounded-xl overflow-hidden border border-border bg-black/40 h-36 flex items-center justify-center cursor-pointer group"
                        >
                          <img
                            src={post.image_url}
                            alt="Post rasmi"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <ExternalLink className="size-3.5" /> Kattalashtirish
                          </div>
                        </div>
                      )}

                      {/* Footer Stats */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3 text-rose-500" /> {post.likes_count} ta reaksiya
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3 text-sky-500" /> {post.comments_count} ta izoh
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox for post images */}
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-2xl w-full max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center bg-black/60">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 z-10 size-8 rounded-full bg-black/80 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
              <img src={lightboxImage} alt="Post" className="max-h-[80vh] w-auto object-contain" />
            </div>
          </div>
        )}

        {/* Create / Edit Reel Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 no-scrollbar">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={Sparkles} tone="rose" size="sm" glow />
                  <h3 className="text-lg font-black text-foreground">
                    Yangi Bilim Reel Yaratish
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveReel} className="space-y-4 pt-4 text-xs">
                {/* Media Type Switch: Matn vs Video */}
                <div className="space-y-2 p-3 bg-muted/40 rounded-2xl border border-border">
                  <label className="font-bold text-foreground block">Reel Formati</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('text')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors",
                        mediaType === 'text'
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground"
                      )}
                    >
                      📝 Matn & Kvest
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('video')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5",
                        mediaType === 'video'
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-card border-border text-muted-foreground"
                      )}
                    >
                      <Video className="size-3.5" />
                      <span>🎬 Video Reel</span>
                    </button>
                  </div>

                  {mediaType === 'video' && (
                    <div className="pt-2 space-y-1">
                      <label className="text-[11px] font-bold text-foreground block">
                        Video Havolasi (URL - MP4 yoki WebM video fayl)
                      </label>
                      <Input
                        placeholder="https://example.com/videos/temur_jangi.mp4"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="h-9 rounded-xl font-mono text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Vertikal (9:16) formatdagi to&apos;g&apos;ridan-to&apos;g&apos;ri video havolasini kiriting.
                      </span>
                    </div>
                  )}
                </div>

                {/* Subject & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Fan</label>
                    <select
                      value={subjectSlug}
                      onChange={(e) => {
                        setSubjectSlug(e.target.value);
                        const names: Record<string, string> = {
                          'tarix': 'Tarix',
                          'ona-tili': 'Ona tili',
                          'biologiya': 'Biologiya',
                          'ingliz-tili': 'Ingliz tili',
                        };
                        setSubjectName(names[e.target.value] || 'Tarix');
                      }}
                      className="w-full h-9 rounded-xl px-3 bg-muted/60 border border-border text-foreground font-medium"
                    >
                      <option value="tarix">Tarix</option>
                      <option value="ona-tili">Ona tili</option>
                      <option value="biologiya">Biologiya</option>
                      <option value="ingliz-tili">Ingliz tili</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Mavzu / Voqea nishoni</label>
                    <Input
                      placeholder="Masalan: Amir Temur & Anqara jangi"
                      value={categoryBadge}
                      onChange={(e) => setCategoryBadge(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>
                </div>

                {/* Tagline & Hook */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Qisqa tag (Tagline)</label>
                    <Input
                      placeholder="Bilasizmi?, Oltin Qoida, Eng ko'p xato qilingan!"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Ta&apos;sirchan Sarlavha (Hook) *
                    </label>
                    <Input
                      placeholder="Masalan: O'quvchilarning 85% i bu savolda adashgan! Sababi nima?"
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      required
                      className="h-9 rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* Fact body & Takeaway */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Fakt va Jonli Tushuntirish (2-3 qisqa gap) *
                    </label>
                    <Textarea
                      placeholder="1402-yil Anqara jangidan oldin Temur daryo o'zanini burib yuborgan..."
                      value={fact}
                      onChange={(e) => setFact(e.target.value)}
                      required
                      rows={3}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Oltin Xulosa / Imtihon Qoidasi (Takeaway)
                    </label>
                    <Input
                      placeholder="Strategik resurslarni boshqarish — quroldan ham muhimroq bo'lgan."
                      value={takeaway}
                      onChange={(e) => setTakeaway(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>
                </div>

                {/* Micro Quiz */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                  <span className="font-extrabold text-foreground flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    Tezkor Mikrokvest Savoli va Variantlari
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Savol matni</label>
                    <Input
                      placeholder="Savolni kiriting..."
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant A</label>
                      <Input
                        placeholder="Variant A"
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant B</label>
                      <Input
                        placeholder="Variant B"
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant C</label>
                      <Input
                        placeholder="Variant C"
                        value={optionC}
                        onChange={(e) => setOptionC(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant D</label>
                      <Input
                        placeholder="Variant D"
                        value={optionD}
                        onChange={(e) => setOptionD(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-foreground block mb-1">To&apos;g&apos;ri variant</label>
                      <select
                        value={correctIndex}
                        onChange={(e) => setCorrectIndex(Number(e.target.value))}
                        className="w-full h-8 rounded-lg px-2 bg-card border border-border text-foreground text-xs font-bold"
                      >
                        <option value={0}>Variant A</option>
                        <option value={1}>Variant B</option>
                        <option value={2}>Variant C</option>
                        <option value={3}>Variant D</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-foreground block mb-1">Tushuntirish (Explanation)</label>
                      <Input
                        placeholder="Nega aynan shu javob to'g'ri?"
                        value={quizExplanation}
                        onChange={(e) => setQuizExplanation(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme & Publish Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-bold text-foreground">Neon mavzusi:</span>
                    <div className="flex items-center gap-1.5">
                      {THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setGradientTheme(th.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                            gradientTheme === th.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {th.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="font-bold text-foreground">Darhol chop etish:</span>
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl font-bold gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{saving ? "Saqlanmoqda..." : isPublished ? "🚀 Chop Etish (Publish)" : "Qoralama sifatida saqlash"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
