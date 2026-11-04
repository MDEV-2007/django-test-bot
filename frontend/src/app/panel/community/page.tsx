'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquareHeart, Plus, Trash2, Eye, ExternalLink, RefreshCw,
  Flame, CheckCircle2, XCircle, AlertCircle, Heart, MessageCircle,
  Pin, Sparkles, Trophy, Award, Search, Clock, Film, HelpCircle, X
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type CommunityPost = {
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
  reports_count?: number;
  is_hidden?: boolean;
  created_at: string;
};

type CommunityStory = {
  id: number;
  author_name: string;
  author_username?: string;
  avatar: string;
  story_type: string;
  title: string;
  caption: string;
  badge: string;
  media_url?: string;
  cta_text?: string;
  cta_link?: string;
  views_count: number;
  expires_at?: string;
  is_expired: boolean;
  created_at: string;
};

export default function PanelCommunityPage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');

  // Posts state
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postFilter, setPostFilter] = useState('all');
  const [postSearch, setPostSearch] = useState('');
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // Stories state
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyFilter, setStoryFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [activeStoriesCount, setActiveStoriesCount] = useState(0);
  const [deletingStoryId, setDeletingStoryId] = useState<number | null>(null);

  // Story create modal
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryCaption, setNewStoryCaption] = useState('');
  const [newStoryBadge, setNewStoryBadge] = useState('🔥 Yangilik');
  const [newStoryCtaText, setNewStoryCtaText] = useState("Ko'rish 🚀");
  const [newStoryCtaLink, setNewStoryCtaLink] = useState('/feed');
  const [newStoryMediaUrl, setNewStoryMediaUrl] = useState('');
  const [newStoryDuration, setNewStoryDuration] = useState('24');

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Load Posts
  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const q = new URLSearchParams();
      if (postFilter === 'moderation') q.set('moderation', '1');
      else if (postFilter !== 'all') q.set('type', postFilter);
      if (postSearch.trim()) q.set('q', postSearch.trim());
      const res = await apiFetch<{ posts: CommunityPost[]; total: number }>(`/api/panel/community/?${q.toString()}`);
      if (res?.posts) {
        setPosts(res.posts);
      }
    } catch (e) {
      toast.error("Postlarni yuklashda xatolik");
    } finally {
      setLoadingPosts(false);
    }
  }, [postFilter, postSearch]);

  // Load Stories
  const loadStories = useCallback(async () => {
    setLoadingStories(true);
    try {
      const res = await apiFetch<{ stories: CommunityStory[]; total: number; active_count: number }>(
        `/api/panel/stories/?status=${storyFilter}`
      );
      if (res?.stories) {
        setStories(res.stories);
        setActiveStoriesCount(res.active_count || 0);
      }
    } catch (e) {
      toast.error("Hikoyalarni yuklashda xatolik");
    } finally {
      setLoadingStories(false);
    }
  }, [storyFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Post Actions
  async function handleDeletePost(id: number) {
    if (!confirm("Haqiqatan ham ushbu postni o'chirmoqchimisiz?")) return;
    setDeletingPostId(id);
    try {
      await apiFetch(`/api/panel/community/${id}/delete/`, { method: 'POST' });
      toast.success("Post o'chirildi");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error("O'chirishda xatolik yuz berdi");
    } finally {
      setDeletingPostId(null);
    }
  }

  async function handleTogglePin(id: number) {
    try {
      const res = await apiFetch<{ is_pinned: boolean }>(`/api/panel/community/${id}/pin/`, { method: 'POST' });
      toast.success(res.is_pinned ? "Post mahkamlandi (pin)" : "Post qadami olib tashlandi");
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_pinned: res.is_pinned } : p))
      );
    } catch (e) {
      toast.error("Pin qilishda xatolik");
    }
  }

  // Moderatsiya: yashirish / qayta ko'rsatish (server audit jurnaliga yozadi).
  async function handleToggleHidden(id: number, hidden: boolean) {
    try {
      const res = await apiFetch<{ is_hidden: boolean }>(`/api/panel/community/${id}/visibility/`, {
        method: 'POST', body: JSON.stringify({ hidden }),
      });
      toast.success(res.is_hidden ? 'Post lentadan yashirildi' : "Post lentada qayta ko'rsatildi");
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: res.is_hidden } : p)));
    } catch {
      toast.error("Holatni o'zgartirib bo'lmadi");
    }
  }

  // Story Actions
  async function handleDeleteStory(id: number) {
    if (!confirm("Ushbu storyni o'chirmoqchimisiz?")) return;
    setDeletingStoryId(id);
    try {
      await apiFetch(`/api/panel/stories/${id}/delete/`, { method: 'POST' });
      toast.success("Story o'chirildi");
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      toast.error("O'chirishda xatolik");
    } finally {
      setDeletingStoryId(null);
    }
  }

  async function handleCreateStory(e: React.FormEvent) {
    e.preventDefault();
    if (!newStoryTitle.trim()) {
      toast.error("Sarlavhani kiriting");
      return;
    }
    setCreatingStory(true);
    try {
      await apiFetch('/api/panel/stories/create/', {
        method: 'POST',
        body: JSON.stringify({
          title: newStoryTitle.trim(),
          caption: newStoryCaption.trim(),
          badge: newStoryBadge.trim(),
          cta_text: newStoryCtaText.trim(),
          cta_link: newStoryCtaLink.trim(),
          media_url: newStoryMediaUrl.trim(),
          duration_hours: parseInt(newStoryDuration, 10) || 24,
        }),
      });
      toast.success("Yangi Story muvaffaqiyatli chop etildi!");
      setIsStoryModalOpen(false);
      setNewStoryTitle('');
      setNewStoryCaption('');
      setNewStoryMediaUrl('');
      loadStories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Story yaratishda xatolik");
    } finally {
      setCreatingStory(false);
    }
  }

  return (
    <PanelShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquareHeart className="size-6 text-rose-500" />
              <span>Hamjamiyat &amp; Stories Boshqaruvi</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Platforma lentasi postlari va 24-soatlik hikoyalarni nazorat qilish, pin qilish va o&apos;chirish
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsStoryModalOpen(true)}
              className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black text-xs"
            >
              <Plus className="size-4 mr-1.5" />
              + Yangi Story Joylash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'posts') loadPosts();
                else loadStories();
              }}
              className="rounded-xl text-xs"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'posts'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span>Lenta Postlari</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
              {posts.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('stories')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'stories'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span>24-soatlik Stories</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
              {activeStoriesCount} faol
            </Badge>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LENTA POSTLARI */}
        {/* ========================================================================= */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'achievement', label: '🔥 Yutuqlar' },
                  { id: 'test_result', label: '🎯 Natijalar' },
                  { id: 'certificate', label: '🏆 Sertifikatlar' },
                  { id: 'sos_question', label: '🙋 SOS Savollar' },
                  { id: 'moderation', label: '🚩 Shikoyatlar' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPostFilter(f.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                      postFilter === f.id
                        ? 'bg-card text-foreground border border-border shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  placeholder="Sarlavha yoki foydalanuvchi..."
                  className="pl-9 rounded-xl text-xs h-9 bg-card"
                />
              </div>
            </div>

            {loadingPosts ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Postlar yuklanmoqda...
              </div>
            ) : posts.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Hech qanday post topilmadi.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className={cn(
                      'rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden',
                      post.is_pinned ? 'border-amber-500/50 bg-amber-500/[0.03]' : 'border-border bg-card'
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-8 rounded-full border">
                            <AvatarImage src={post.author.avatar} alt={post.author.name} />
                            <AvatarFallback className="text-xs font-bold">
                              {post.author.name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {post.author.name}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate">
                              @{post.author.username} • {post.created_at}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(post.reports_count ?? 0) > 0 && (
                            <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-[12px] px-1.5 py-0">
                              🚩 {post.reports_count}
                            </Badge>
                          )}
                          {post.is_hidden && (
                            <Badge variant="outline" className="text-[12px] px-1.5 py-0">Yashirin</Badge>
                          )}
                          {post.is_pinned && (
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[12px] px-1.5 py-0">
                              <Pin className="size-2.5 mr-0.5 fill-current" /> Pin
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[12px] px-1.5 py-0 uppercase">
                            {post.post_type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-2 flex-1">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {post.title}
                      </h4>
                      {post.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {post.caption}
                        </p>
                      )}

                      {post.image_url && (
                        <div
                          onClick={() => setLightboxImg(post.image_url)}
                          className="relative h-28 rounded-xl overflow-hidden cursor-pointer group border border-border"
                        >
                          <img
                            src={post.image_url}
                            alt="Post rasm"
                            className="size-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3 text-rose-500 fill-rose-500/20" /> {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3 text-sky-500" /> {post.comments_count}
                        </span>
                        {post.subject_name && (
                          <span className="text-[12px] font-semibold text-primary truncate">
                            • {post.subject_name}
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePin(post.id)}
                        className="h-8 text-xs font-bold"
                        title={post.is_pinned ? "Pinni olib tashlash" : "Eng tepaga mahkamlash"}
                      >
                        <Pin className={cn('size-3.5 mr-1', post.is_pinned && 'fill-current text-amber-500')} />
                        {post.is_pinned ? 'Unpin' : 'Pin'}
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleToggleHidden(post.id, !post.is_hidden)}
                        >
                          {post.is_hidden ? "Ko'rsatish" : 'Yashirish'}
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <Link href="/feed" target="_blank">
                            <ExternalLink className="size-3 mr-1" /> Lentada
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingPostId === post.id}
                          onClick={() => handleDeletePost(post.id)}
                          className="h-8 text-xs font-bold"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 24-SOATLIK STORIES */}
        {/* ========================================================================= */}
        {activeTab === 'stories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: 'Barcha Hikoyalar' },
                  { id: 'active', label: '🟢 Faollar (24s ichida)' },
                  { id: 'expired', label: '⚪ Muddati o\'tganlar' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStoryFilter(f.id as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      storyFilter === f.id
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-muted-foreground">
                Jami: <b>{stories.length}</b> ta hikoya
              </span>
            </div>

            {loadingStories ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Hikoyalar yuklanmoqda...
              </div>
            ) : stories.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Ushbu bo&apos;limda hozircha hikoya yo&apos;q.</p>
                  <Button
                    onClick={() => setIsStoryModalOpen(true)}
                    className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs"
                  >
                    <Plus className="size-4 mr-1.5" /> Yangi Story Joylash
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stories.map((story) => (
                  <Card
                    key={story.id}
                    className={cn(
                      'rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden',
                      story.is_expired ? 'opacity-60 bg-muted/20 border-border/60' : 'border-amber-500/30 bg-card ring-1 ring-amber-500/20'
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-9 rounded-full border border-amber-500/30 p-0.5">
                            <AvatarImage src={story.avatar} alt={story.author_name} />
                            <AvatarFallback className="text-xs font-bold">
                              {story.author_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {story.author_name}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {story.created_at}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            'text-[12px] px-1.5 py-0',
                            story.is_expired
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {story.badge || (story.is_expired ? 'Tugagan' : 'Faol')}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-2 flex-1">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {story.title}
                      </h4>
                      {story.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {story.caption}
                        </p>
                      )}

                      {story.cta_text && (
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[12px] font-bold text-amber-500 truncate flex items-center justify-between">
                          <span>{story.cta_text}</span>
                          <span className="text-[11px] text-muted-foreground">{story.cta_link}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3 text-primary" /> {story.views_count} ko&apos;rish
                        </span>
                        <span>
                          {story.is_expired ? 'Muddati tugagan' : 'Faol'}
                        </span>
                      </div>
                    </CardContent>

                    <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[12px] uppercase">
                        {story.story_type}
                      </Badge>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingStoryId === story.id}
                        onClick={() => handleDeleteStory(story.id)}
                        className="h-8 text-xs font-bold"
                      >
                        <Trash2 className="size-3 mr-1" /> O&apos;chirish
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer"
          >
            <div className="relative max-w-2xl max-h-[90vh]">
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute -top-3 -right-3 p-1.5 rounded-full bg-white text-black font-bold shadow-lg"
              >
                <X className="size-4" />
              </button>
              <img
                src={lightboxImg}
                alt="Post to'liq rasm"
                className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Create Story Dialog */}
        <Dialog open={isStoryModalOpen} onOpenChange={setIsStoryModalOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-card border-border p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <span>Yangi Story Chop Etish</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ushbu hikoya platformadagi barcha o&apos;quvchilar Dashboard va Lentasida 24 soat davomida ko&apos;rinadi.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateStory} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Sarlavha *</label>
                <Input
                  required
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  placeholder="Masalan: Tarix Respublika Turniri boshlandi! 🏆"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Qisqa Tavsif / Matn</label>
                <Textarea
                  rows={2}
                  value={newStoryCaption}
                  onChange={(e) => setNewStoryCaption(e.target.value)}
                  placeholder="Ishtirok eting va 1-o'rin uchun 1,000,000 so'm yutib oling..."
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Badge / Yorliq</label>
                  <Input
                    value={newStoryBadge}
                    onChange={(e) => setNewStoryBadge(e.target.value)}
                    placeholder="🔥 Yangilik"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Amal qilish muddati</label>
                  <select
                    value={newStoryDuration}
                    onChange={(e) => setNewStoryDuration(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                  >
                    <option value="12">12 soat</option>
                    <option value="24">24 soat (standart)</option>
                    <option value="48">48 soat</option>
                    <option value="72">3 kun (72 soat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Tugma matni (CTA)</label>
                  <Input
                    value={newStoryCtaText}
                    onChange={(e) => setNewStoryCtaText(e.target.value)}
                    placeholder="Ko'rish 🚀"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Havola (CTA Link)</label>
                  <Input
                    value={newStoryCtaLink}
                    onChange={(e) => setNewStoryCtaLink(e.target.value)}
                    placeholder="/battles yoki https://..."
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Rasm / Banner URL (Ixtiyoriy)</label>
                <Input
                  value={newStoryMediaUrl}
                  onChange={(e) => setNewStoryMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={creatingStory}
                  className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs"
                >
                  {creatingStory ? "Chop etilmoqda..." : "Storyni Chop Etish 🚀"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PanelShell>
  );
}
