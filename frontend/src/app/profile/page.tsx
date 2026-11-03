'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Copy, Check, Award, Crown, Swords, FileCheck2,
  Medal, Flame, ScrollText, Zap, Coins, Lock, Send, Sprout,
  Pencil, Camera, Trash2, Loader2, ChevronRight, ShoppingBag, Palette, Shield, Sparkles, CheckCircle2,
  BarChart3, Newspaper, History, PlusCircle, MessageCircle, Heart, Share2, ExternalLink,
  TrendingUp, AlertTriangle, Target, ThumbsUp, Clock, Percent, BookOpen, ArrowRight, GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { getRankInfo } from '@/lib/rank';
import { toast } from 'sonner';
import { apiUpload, apiFetch, fetchMe } from '@/lib/api-client';
import { useApiQuery, invalidateApi } from '@/lib/api-cache';
import { useAuthStore, type Profile, type Cosmetics } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
import KnowledgeTree from '@/components/student/KnowledgeTree';
import StudentSpiderRadar, { type RadarStats } from '@/components/student/StudentSpiderRadar';
import { AudioToggle, ThemeToggle } from '@/components/SettingsToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import VerifiedBadge from '@/components/ui/verified-badge';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { useLanguageStore } from '@/lib/transliterate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ProfileData = {
  profile: {
    username: string; first_name: string; last_name: string; xp: number; level: number;
    coins: number; streak: number; avatar_url: string | null; is_premium: boolean;
    next_level_xp: number; cosmetics?: Cosmetics; base_avatar_url?: string | null;
    role?: 'superadmin' | 'teacher' | 'student';
    is_superadmin?: boolean;
    is_teacher?: boolean;
    elo_rating?: number;
  };
  solved_today?: number;
  referral_code: string; telegram_deep_link: string;
  referral_stats: { referral_count: number; coins_earned: number };
  recent_attempts: { id: number; test_title: string; score: number | null; started_at: string }[];
  recent_battles: { id: number; opponent: string; won: boolean; created_at: string }[];
  badges: { name: string; description: string; rarity: string }[];
  locked_badges: { name: string; description: string; rarity: string }[];
  total_badges: number;
};

type AnalyticsDashboard = {
  accuracy: number;
  accuracy_breakdown: { correct: number; wrong: number; skipped: number };
  total_tests: number;
  avg_score: number;
  readiness_estimate: number;
  time_minutes: number;
  xp: number;
  coins: number;
  streak: number;
  level: number;
  daily: { date: string; count: number; avg: number }[];
  monthly: { label: string; tests: number; avg: number; cum_xp: number }[];
  subject_dist: { name: string; value: number; color: string }[];
  cefr?: {
    skills: { skill: string; label: string; mastery: number; answered: number }[];
    writing: { reviewed_count: number; avg_score: number | null; level: string };
    has_data: boolean;
  };
  mastery: {
    subjects: { id?: number; name: string; mastery: number; color: string; answered?: number }[];
    topics: { id: number; title: string; mastery: number; answered: number }[];
    radar: { labels: string[]; values: number[] };
    weak: string[];
    strong: string[];
  };
  recent: { id: number; test__title: string | null; score: number | null; correct_answers: number; wrong_answers: number; skipped_answers: number; completed_at: string }[];
};

function getGradeLetter(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  return 'C';
}

type InventoryItemData = {
  id: number;
  slug: string;
  name: string;
  category: string;
  category_display: string;
  quantity: number;
  equipped: boolean;
  is_equippable: boolean;
  rarity: string;
  payload: Record<string, any>;
  description?: string;
  icon_name?: string;
};

type InventoryResponse = {
  coins: number;
  freeze_count: number;
  items: InventoryItemData[];
};

type UserPostItem = {
  id: number;
  post_type: string;
  title: string;
  subject_name: string;
  subject_slug: string;
  score: number;
  grade?: string;
  correct_count: number;
  total_questions: number;
  caption: string;
  image_url: string;
  reactions_count: number;
  comments_count: number;
  created_at: string;
};

const RARITY_ICON: Record<string, LucideIcon> = { legendary: Crown, epic: Medal, rare: Flame, common: ScrollText };
const RARITY_TONE_KEY: Record<string, PremiumIconTone> = {
  legendary: 'amber',
  epic: 'purple',
  rare: 'sky',
  common: 'emerald',
};

const SHARE_TEXT = "IlmIldizi'da bilim sinovidan o'ting va men bilan bonus tanga yutib oling!";

export default function ProfilePage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'posts' | 'inventory' | 'activity'>('stats');

  const { script, setScript } = useLanguageStore();

  const { data, error, refresh } = useApiQuery<ProfileData>(access ? '/api/auth/profile/' : null);
  const { data: invData, refresh: refreshInventory } = useApiQuery<InventoryResponse>(access ? '/api/shop/inventory/' : null);
  const { data: postsData, refresh: refreshPosts } = useApiQuery<{ posts: UserPostItem[]; total: number }>(
    access ? '/api/learning/feed/?mine=1' : null
  );
  const { data: analyticsData } = useApiQuery<AnalyticsDashboard>(access ? '/api/analytics/' : null);

  const [equipBusy, setEquipBusy] = useState<string | null>(null);
  const [inventoryTab, setInventoryTab] = useState<string>('all');
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (authReady && !access) {
      router.push('/login');
    }
  }, [authReady, access, router]);

  useEffect(() => {
    if (data?.profile) {
      useAuthStore.getState().setUser(data.profile as any);
    }
  }, [data]);

  const streak = typeof data?.profile?.streak === 'number' ? data.profile.streak : 0;
  const radarStats: RadarStats = useMemo(() => {
    if (!analyticsData || typeof analyticsData !== 'object') {
      return {
        subject_mastery: 78,
        logic: 72,
        speed: 85,
        accuracy: 80,
        writing: 65,
        consistency: Math.min(100, Math.max(30, streak * 10)),
        overall_power: 78,
      };
    }

    const subjects = Array.isArray(analyticsData.mastery?.subjects) ? analyticsData.mastery.subjects : [];
    const avgSubMastery = subjects.length
      ? Math.round(subjects.reduce((sum, s) => sum + (Number(s?.mastery) || 0), 0) / subjects.length)
      : Number(analyticsData.accuracy) || 75;

    const consistency = Math.min(100, Math.max(35, streak * 12));
    const accuracy = Number(analyticsData.accuracy) || 70;
    const logic = Number(analyticsData.avg_score) || 72;
    const speed = Number(analyticsData.time_minutes) > 0 ? 85 : 75;
    const writingScore = Number(analyticsData.cefr?.writing?.avg_score);
    const writing = writingScore > 0 ? Math.round((writingScore / 5) * 100) : 65;

    const ovr = Math.round((avgSubMastery + consistency + accuracy + logic + speed + writing) / 6);

    return {
      subject_mastery: avgSubMastery,
      logic,
      speed,
      accuracy,
      writing,
      consistency,
      overall_power: ovr,
    };
  }, [analyticsData, streak]);

  async function handleToggleEquip(slug: string, currentlyEquipped: boolean, name: string) {
    setEquipBusy(slug);
    tgHaptic('medium');
    try {
      const action = currentlyEquipped ? 'unequip' : 'equip';
      const res = await apiFetch<{ ok: boolean; profile?: Profile; error?: string }>(`/api/shop/${action}/${slug}/`, { method: 'POST' });
      if (res?.ok === false) {
        toast.error(res.error || 'Xatolik yuz berdi');
        return;
      }
      if (res?.profile) {
        useAuthStore.getState().setUser(res.profile);
      } else {
        const me = await fetchMe();
        useAuthStore.getState().setUser(me);
      }
      soundFX.success();
      toast.success(currentlyEquipped ? `${name} yechildi` : `${name} taqildi!`);
      invalidateApi();
      await refresh();
      await refreshInventory();
    } catch (e: any) {
      toast.error(e?.message || 'Xatolik yuz berdi');
    } finally {
      setEquipBusy(null);
    }
  }

  async function handleDeletePost(postId: number) {
    if (!confirm("Haqiqatan ham bu postni o'chirmoqchimisiz?")) return;
    setDeletingPostId(postId);
    tgHaptic('medium');
    try {
      await apiFetch<{ success: boolean; message: string }>(`/api/learning/feed/${postId}/delete/`, {
        method: 'POST',
      });
      
      toast.success("Post muvaffaqiyatli o'chirildi");
      refreshPosts();
    } catch (e: any) {
      toast.error(e?.message || "Postni o'chirishda xatolik");
    } finally {
      setDeletingPostId(null);
    }
  }

  function handleOpenEdit() {
    if (!data) return;
    setFirstName(data.profile.first_name || '');
    setLastName(data.profile.last_name || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setEditOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari (JPG, PNG, WebP) qabul qilinadi.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10 MB dan oshmasligi kerak.");
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (removeAvatar) {
        formData.append('remove_avatar', 'true');
      }

      const res = await apiUpload<{ ok: boolean; profile: Profile }>('/api/auth/profile/', formData);
      if (res?.profile) {
        useAuthStore.setState({ user: res.profile });
      }
      await refresh();
      soundFX.success();
      toast.success("Profil muvaffaqiyatli yangilandi!");
      setEditOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Profilni saqlashda xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const referralUrl = origin && data?.referral_code ? `${origin}/register?ref=${data.referral_code}` : '';

  function handleCopy() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    tgHaptic('light');
    toast.success("Taklif havolasi nusxalandi!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (authReady && !access) {
    return (
      <>
        <AppShell />
        <div className="flex min-h-[60vh] w-full items-center justify-center bg-[var(--bg-page)]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-12 sm:p-6 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-red-400 font-medium">{error}</p>
            <Button onClick={() => refresh()} variant="outline">
              Qayta urinish
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
          <Skeleton className="h-44 w-full rounded-[28px]" />
          <Skeleton className="h-24 w-full rounded-[24px]" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-[28px]" />
        </main>
      </>
    );
  }

  const p = data.profile;
  const rankInfo = getRankInfo(p.elo_rating || 0);
  const xpProgress = p.next_level_xp > 0
    ? Math.min(100, Math.max(0, Math.round((p.xp / p.next_level_xp) * 100)))
    : 0;
  const fullName = `${p.first_name || p.username} ${p.last_name || ''}`.trim();

  const shareUrl = data.telegram_deep_link || referralUrl;
  const telegramShareHref =
    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(SHARE_TEXT)}`;

  const badgePct = data.total_badges ? Math.round((data.badges.length / data.total_badges) * 100) : 0;

  const allInventoryItems = invData?.items || [];
  const userPosts = postsData?.posts || [];

  const totalActivityCount = (data.recent_attempts?.length || 0) + (data.recent_battles?.length || 0);

  const TABS = [
    { id: 'stats', label: 'Statistika', shortLabel: 'Statistika', icon: BarChart3, count: null },
    { id: 'posts', label: 'Postlarim', shortLabel: 'Postlar', icon: Newspaper, count: userPosts.length },
    { id: 'inventory', label: 'Buyumlarim', shortLabel: 'Buyumlar', icon: ShoppingBag, count: allInventoryItems.length },
    { id: 'activity', label: "So'nggi faollik", shortLabel: 'Faollik', icon: History, count: totalActivityCount },
  ] as const;

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-24 sm:p-6">
        {/* ========================================================================= */}
        {/* 1. ASOSIY PROFILE CARD (Apple ID Style Anchor) */}
        {/* ========================================================================= */}
        <div className="ios-card relative overflow-hidden rounded-[28px] p-6 sm:p-7 shadow-lg border border-border/80">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/[0.08] blur-[70px]" />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="relative shrink-0 group">
              <div
                onClick={handleOpenEdit}
                className="cursor-pointer relative rounded-full transition-transform hover:scale-105"
                title="Profilni tahrirlash"
              >
                <CosmeticAvatar
                  className="size-22 sm:size-24"
                  src={p.avatar_url}
                  name={p.first_name || p.username}
                  cosmetics={p.cosmetics}
                  fallbackClassName="text-xl font-bold"
                />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                  <Camera className="size-5" />
                </div>
              </div>
              {p.is_premium ? (
                <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#FF9500] text-white shadow-md ring-2 ring-white dark:ring-[#1C1C1E]">
                  <Crown className="size-4 fill-current" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  title="Rasmni o'zgartirish"
                  aria-label="Rasmni o'zgartirish"
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ring-2 ring-white dark:ring-[#1C1C1E]"
                >
                  <Camera className="size-3.5" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                  <span>{fullName}</span>
                  <VerifiedBadge role={p.role} isSuperadmin={p.is_superadmin} isTeacher={p.is_teacher} size="md" showLabel />
                </h1>
                <CosmeticBadge cosmetics={p.cosmetics} className="size-4" />
                <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-mono text-[12px] font-bold text-primary">
                  Daraja {p.level}
                </span>
                {p.cosmetics?.title?.payload?.title && (
                  <span className="rounded-full bg-amber-500/12 border border-amber-500/30 px-2.5 py-0.5 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                    👑 {p.cosmetics.title.payload.title}
                  </span>
                )}
                {p.cosmetics?.frame?.name && (
                  <span className="rounded-full bg-amber-500/12 border border-amber-500/30 px-2.5 py-0.5 text-[12px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    {p.cosmetics.frame.name}
                  </span>
                )}
                {p.cosmetics?.theme?.name && (
                  <span className="rounded-full bg-emerald-500/12 border border-emerald-500/30 px-2.5 py-0.5 text-[12px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full inline-block" style={{ backgroundColor: p.cosmetics.theme.payload.accent || '#10b981' }} />
                    {p.cosmetics.theme.name}
                  </span>
                )}
              </div>
              <p className="font-mono text-[13px] text-muted-foreground">@{p.username} • IlmIldizi ID</p>

              {/* Dynamic Island Metric Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                  <Flame className="size-3.5 fill-current" /> {p.streak} kun streak
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Coins className="size-3.5" /> {p.coins.toLocaleString('uz-UZ')} tanga
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-[12px] font-bold text-primary">
                  <Zap className="size-3.5 fill-current" /> {p.xp.toLocaleString('uz-UZ')} XP
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:flex-col sm:items-end sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="rounded-full gap-1.5"
              >
                <Pencil className="size-3.5 text-primary" />
                Tahrirlash
              </Button>
              <Link
                href="/premium"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-[13px] font-semibold text-white shadow-md hover:opacity-95 active:scale-95 transition-all"
              >
                {p.is_premium ? <Crown className="size-4 fill-current" /> : <Lock className="size-3.5" />}
                <span>{p.is_premium ? 'PRO obuna faol' : "PRO-ga o'tish"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. GLANCEABLE QUICK WIDGETS ROW */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="ios-card rounded-[24px] p-4 flex items-center gap-3">
            <PremiumIcon icon={CheckCircle2} tone="emerald" size="md" solid />
            <div className="min-w-0">
              <span className="text-[12px] font-semibold text-muted-foreground block truncate">
                Bugun yechildi
              </span>
              <p className="text-base sm:text-lg font-bold font-mono text-foreground leading-tight">
                {data.solved_today || 0} <span className="text-xs font-normal text-muted-foreground">test</span>
              </p>
            </div>
          </div>

          <div className="ios-card rounded-[24px] p-4 flex items-center gap-3">
            <PremiumIcon icon={Flame} tone="amber" size="md" solid />
            <div className="min-w-0">
              <span className="text-[12px] font-semibold text-muted-foreground block truncate">
                Uzluksiz Streak
              </span>
              <p className="text-base sm:text-lg font-bold font-mono text-foreground leading-tight">
                {p.streak || 0} <span className="text-xs font-normal text-muted-foreground">kun 🔥</span>
              </p>
            </div>
          </div>

          <Link href="/shop" className="ios-card ios-card-interactive rounded-[24px] p-4 flex items-center gap-3">
            <PremiumIcon icon={Coins} tone="gold" size="md" solid />
            <div className="min-w-0">
              <span className="text-[12px] font-semibold text-muted-foreground block truncate">
                Tanga balansi
              </span>
              <p className="text-base sm:text-lg font-bold font-mono text-foreground leading-tight">
                {(p.coins || 0).toLocaleString()}
              </p>
            </div>
          </Link>

          <Link
            href="/battles"
            className="ios-card ios-card-interactive rounded-[24px] p-4 flex items-center gap-3 text-left cursor-pointer"
          >
            <PremiumIcon icon={Swords} tone="indigo" size="md" solid />
            <div className="min-w-0">
              <span className="text-[12px] font-semibold text-muted-foreground block truncate">
                {rankInfo.title}
              </span>
              <p className="text-base sm:text-lg font-bold font-mono text-primary leading-tight">
                {p.elo_rating || 1200} <span className="text-[12px] font-normal text-muted-foreground">ELO</span>
              </p>
            </div>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* 3. ULTRA-MODERN SEGMENTED TAB BAR (4-Col Responsive Grid) */}
        {/* ========================================================================= */}
        <div className="sticky top-16 z-20 -mx-4 px-4 py-2 sm:mx-0 sm:px-0 bg-background/85 backdrop-blur-md transition-all">
          <div className="w-full grid grid-cols-4 p-1 rounded-2xl bg-muted/80 border border-border/80 shadow-xs gap-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    tgHaptic('select');
                    soundFX.click();
                    setActiveTab(tab.id);
                  }}
                  className={cn(
                    'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-[12px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer select-none text-center',
                    active
                      ? 'bg-card text-foreground shadow-sm border border-border/60 scale-[1.01]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                  )}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    <Icon className={cn('size-3.5 sm:size-4 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
                    {tab.count !== null && tab.count > 0 && (
                      <span className="sm:hidden px-1 py-0.2 rounded-full text-[11px] font-mono font-bold leading-none bg-primary/15 text-primary">
                        {tab.count}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-full">
                    <span className="inline sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={cn(
                      'hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[12px] font-mono font-bold leading-none shrink-0',
                      active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TAB CONTENTS */}
        {/* ========================================================================= */}
        <AnimatePresence mode="wait">
          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: STATISTIKA */}
                    {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: STATISTIKA & AKADEMIK TAHLIL */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 1. AKADEMIK ASOSIY KPI METRIKALARI (4 ta Bento Card) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="ios-card rounded-[22px] p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={FileCheck2} tone="sky" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">Jami testlar</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-foreground">
                      {analyticsData?.total_tests || 0} <span className="text-sm font-semibold text-muted-foreground">ta</span>
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Yechilgan to&apos;liq testlar</p>
                  </div>
                </div>

                <div className="ios-card rounded-[22px] p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={Target} tone="emerald" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">O&apos;rtacha aniqlik</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-emerald-500">
                      {analyticsData?.accuracy || 0}%
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">To&apos;g&apos;ri javoblar ulushi</p>
                  </div>
                </div>

                <div className="ios-card rounded-[22px] p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={GraduationCap} tone="amber" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">DTM Tayyorgarlik</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-amber-500">
                      {analyticsData?.readiness_estimate || 0}%
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Imtihon bashorat darajasi</p>
                  </div>
                </div>

                <div className="ios-card rounded-[22px] p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={Clock} tone="indigo" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">Faol mashq vaqti</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-indigo-500">
                      {analyticsData?.time_minutes || 0} <span className="text-sm font-semibold text-muted-foreground">daq</span>
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Fokus dars vaqti</p>
                  </div>
                </div>
              </div>

              {/* 2. KUCHLI VA QIYNOLGAN (ZAIF) MAVZULAR (DIAGNOSTIKA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A. Kuchli Mavzular (80%+ Aniqlik) */}
                <div className="rounded-[24px] border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                        <ThumbsUp className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span>Kuchli mavzularingiz</span>
                          <span className="text-[12px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.2 rounded-full">
                            {analyticsData?.mastery?.strong?.length || 0} ta
                          </span>
                        </h3>
                        <p className="text-[12px] text-muted-foreground">
                          80%+ aniqlik bilan mustahkam o&apos;zlashtirilgan
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {analyticsData?.mastery?.strong && analyticsData.mastery.strong.length > 0 ? (
                      analyticsData.mastery.strong.map((topicName, idx) => (
                        <span
                          key={`strong-${idx}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                        >
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          <span>{topicName}</span>
                          <span className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400 ml-1 font-bold">
                            ✓ Mustahkam
                          </span>
                        </span>
                      ))
                    ) : (
                      <div className="w-full py-4 text-center rounded-xl bg-background/40 border border-dashed border-border/80">
                        <p className="text-xs text-muted-foreground">
                          Hozircha aniqlanmagan. Testlar yechib, kuchli mavzularingizni shakllantiring!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* B. Qiynalgan / Zaif Mavzular (<50% Aniqlik) */}
                <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.07] p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span>Qiynalgan mavzularingiz</span>
                          <span className="text-[12px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-0.2 rounded-full">
                            {analyticsData?.mastery?.weak?.length || 0} ta
                          </span>
                        </h3>
                        <p className="text-[12px] text-muted-foreground">
                          BMB testlarida ko&apos;p xato qilingan va takrorlash zarur bo&apos;lgan mavzular
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {analyticsData?.mastery?.weak && analyticsData.mastery.weak.length > 0 ? (
                      analyticsData.mastery.weak.map((topicName, idx) => (
                        <Link
                          key={`weak-${idx}`}
                          href="/sprint"
                          onClick={() => { soundFX.click(); tgHaptic('medium'); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer group shadow-2xs"
                        >
                          <AlertTriangle className="size-3.5 text-rose-500 shrink-0" />
                          <span>{topicName}</span>
                          <span className="text-[12px] font-bold text-rose-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Qasos <ArrowRight className="size-2.5" />
                          </span>
                        </Link>
                      ))
                    ) : (
                      <div className="w-full py-4 text-center rounded-xl bg-background/40 border border-dashed border-border/80">
                        <p className="text-xs text-muted-foreground">
                          Ajoyib natija! Hozircha jiddiy oqsayotgan zaif mavzular aniqlanmadi.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. FANLAR BO'YICHA UMUMIY O'SISH (PROGRESS & MASTERY) */}
              <Card className="rounded-[28px] border-border/80 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <PremiumIcon icon={BookOpen} tone="sky" size="xs" solid />
                      <span>Fanlar bo&apos;yicha Umumiy O&apos;sish</span>
                    </CardTitle>
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                      {analyticsData?.mastery?.subjects?.length || 0} ta fan faol
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Har bir fan bo&apos;yicha real o&apos;zlashtirish foizi va yechilgan savollar hajmi
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(!analyticsData?.mastery?.subjects || analyticsData.mastery.subjects.length === 0) ? (
                    <div className="text-center py-8 space-y-3 rounded-2xl bg-muted/30 border border-dashed border-border/80 p-4">
                      <p className="text-sm font-semibold text-foreground">Hali fanlar bo&apos;yicha ma&apos;lumot yo&apos;q</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Test yoki sprintlarni yechishni boshlang — har bir fanning o&apos;zlashtirilish dinamikasi bu yerda aks etadi.
                      </p>
                      <Button asChild size="sm" className="rounded-xl mt-1">
                        <Link href="/sprint">Birinchi mashqni boshlash</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {analyticsData.mastery.subjects.map((sub, idx) => (
                        <div
                          key={`sub-${idx}`}
                          className="p-3.5 rounded-2xl border border-border/70 bg-muted/30 hover:bg-muted/50 transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="size-3 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: sub.color || '#007AFF' }}
                              />
                              <span className="font-bold text-foreground truncate">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-bold text-sm text-primary">
                                {sub.mastery}%
                              </span>
                              <span className="text-[12px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                                {getGradeLetter(sub.mastery)}
                              </span>
                            </div>
                          </div>

                          <Progress value={sub.mastery} className="h-2 rounded-full" />

                          <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-0.5">
                            <span>{sub.answered || 0} ta savol ishlangan</span>
                            <span>{sub.mastery >= 75 ? 'Yuqori daraja' : sub.mastery >= 50 ? "O'rtacha" : "E'tibor zarur"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pastki tezkor boshqaruv */}
                  <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 font-bold">
                      <Link href="/sprint">
                        <Zap className="size-3.5 text-amber-500" />
                        <span>Fokus &amp; Qasos Mashqi</span>
                      </Link>
                    </Button>

                    <Button asChild variant="ghost" size="sm" className="rounded-xl gap-1.5 font-bold text-primary hover:text-primary">
                      <Link href="/analytics">
                        <TrendingUp className="size-3.5" />
                        <span>Batafsil OTM va CEFR tahlili</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 4. JAVOBLAR NISBATI (ACCURACY BREAKDOWN) */}
              {analyticsData && analyticsData.total_tests > 0 && (
                <Card className="rounded-[28px] border-border/80 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <PremiumIcon icon={Percent} tone="sky" size="xs" solid />
                      <span>Javoblar Nisbati va To&apos;g&apos;rilik Balansi</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const correct = analyticsData.accuracy_breakdown?.correct || 0;
                      const wrong = analyticsData.accuracy_breakdown?.wrong || 0;
                      const skipped = analyticsData.accuracy_breakdown?.skipped || 0;
                      const totalAnswers = correct + wrong + skipped || 1;
                      const correctPct = Math.round((correct / totalAnswers) * 100);
                      const wrongPct = Math.round((wrong / totalAnswers) * 100);
                      const skippedPct = 100 - correctPct - wrongPct;

                      return (
                        <div className="space-y-3">
                          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                            <div
                              style={{ width: `${correctPct}%` }}
                              className="bg-emerald-500 transition-all duration-500"
                              title={`To'g'ri: ${correct} ta (${correctPct}%)`}
                            />
                            <div
                              style={{ width: `${wrongPct}%` }}
                              className="bg-rose-500 transition-all duration-500"
                              title={`Xato: ${wrong} ta (${wrongPct}%)`}
                            />
                            <div
                              style={{ width: `${Math.max(0, skippedPct)}%` }}
                              className="bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                              title={`Qoldirilgan: ${skipped} ta`}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">To&apos;g&apos;ri</p>
                              <p className="font-mono font-bold text-sm text-foreground mt-0.5">{correct} ta</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                              <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">Xato</p>
                              <p className="font-mono font-bold text-sm text-foreground mt-0.5">{wrong} ta</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/60">
                              <p className="text-[12px] font-semibold text-muted-foreground">O&apos;tkazilgan</p>
                              <p className="font-mono font-bold text-sm text-foreground mt-0.5">{skipped} ta</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* 5. BILIM ILDIZI — Apple Health / Home Ecological Widget */}
              <div className="ios-card overflow-hidden rounded-[28px] p-6 sm:p-7 space-y-5 border border-border/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PremiumIcon icon={Sprout} tone="emerald" size="md" solid />
                    <div>
                      <h2 className="text-[18px] font-bold text-foreground leading-tight">
                        Shaxsiy Bilim Ildizingiz
                      </h2>
                      <p className="text-[12.5px] text-muted-foreground">
                        Dars faolligingiz va muvaffaqiyatlaringizdan unib o&apos;suvchi jonli daraxt
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Faol o&apos;sishda
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-12 items-center">
                  {/* Organic Tree */}
                  <div className="lg:col-span-5 flex items-center justify-center rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                    <KnowledgeTree
                      level={p.level}
                      xpProgress={xpProgress}
                      streak={p.streak}
                      badges={data.badges.length}
                    />
                  </div>

                  {/* 4 Apple Health Sub-cards */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="rounded-[20px] border border-border/60 bg-muted/40 p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-muted-foreground">Daraxt kuchi</span>
                          <PremiumIcon icon={Sprout} tone="emerald" size="2xs" solid />
                        </div>
                        <p className="text-[16px] font-bold text-foreground">
                          {p.level} ta mustahkam shox
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          Erishilgan intellektual darajangiz
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-border/60 bg-muted/40 p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-muted-foreground">Barglar zichligi</span>
                          <PremiumIcon icon={Flame} tone="amber" size="2xs" solid />
                        </div>
                        <p className="text-[16px] font-bold text-foreground">
                          {p.streak} kunlik yashillik
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          Uzluksiz dars seriyasi
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-border/60 bg-muted/40 p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-muted-foreground">Tojdagi mevalar</span>
                          <PremiumIcon icon={Award} tone="rose" size="2xs" solid />
                        </div>
                        <p className="text-[16px] font-bold text-foreground">
                          {data.badges.length} ta oltin meva
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          Ochilgan maxsus yutuqlar
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-border/60 bg-muted/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-muted-foreground">O&apos;sish sur&apos;ati</span>
                          <span className="font-mono text-[12px] font-bold text-primary">{xpProgress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(4, Math.min(100, xpProgress))}%` }}
                          />
                        </div>
                        <p className="text-[11.5px] text-muted-foreground">
                          Keyingi darajagacha progress
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[18px] bg-emerald-500/[0.08] border border-emerald-500/20 p-3.5 text-[12.5px] text-foreground leading-relaxed flex items-start gap-2.5">
                      <PremiumIcon icon={Sprout} tone="emerald" size="2xs" solid className="mt-0.5" />
                      <span>
                        <strong>Har bir yechilgan test</strong>, ko&apos;rilgan dars va tuzatilgan xato bu daraxt ildizini chuqurlashtirib, unga yangi shoxlar qo&apos;shadi.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 burchakli Radar-Analitika (Spider Chart) — Haqiqiy statistika bilan */}
                <div className="mt-6 pt-6 border-t border-border/60">
                  <StudentSpiderRadar stats={radarStats} />
                </div>
              </div>

              {/* 6. PLATFORMA YUTUQLARI & NISHONLAR */}
              <Card className="rounded-[28px] border-border/80 shadow-md">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <PremiumIcon icon={Award} tone="amber" size="xs" solid />
                      <span>Platforma Yutuqlari & Nishonlar</span>
                    </CardTitle>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {data.badges.length} / {data.total_badges} ochilgan ({badgePct}%)
                    </span>
                  </div>
                  <Progress value={badgePct} className="mt-2 h-2" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    {data.badges.map((b, idx) => {
                      const Icon = RARITY_ICON[b.rarity] || Medal;
                      return (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div className="rounded-[20px] border border-border/60 bg-muted/40 p-4 text-center space-y-2.5 transition-all hover:scale-[1.02] cursor-pointer">
                              <PremiumIcon
                                icon={Icon}
                                tone={RARITY_TONE_KEY[b.rarity] || 'emerald'}
                                size="lg"
                                solid
                                className="mx-auto"
                              />
                              <p className="text-[12.5px] font-bold text-foreground leading-tight">{b.name}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56">{b.description}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {(data.locked_badges ?? []).map((b) => (
                      <Tooltip key={`locked-${b.name}`}>
                        <TooltipTrigger asChild>
                          <div className="rounded-[20px] border border-dashed border-border p-4 text-center space-y-2 opacity-65">
                            <PremiumIcon icon={Lock} tone="zinc" size="lg" className="mx-auto" />
                            <p className="text-[12px] font-bold leading-tight text-muted-foreground">{b.name}</p>
                            <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">{b.description}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-56">Hali ochilmagan — {b.description}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: POSTLARIM (Hamjamiyat postlari) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
{activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 border border-border/60 rounded-2xl p-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Newspaper className="size-4 text-primary" />
                    <span>Hamjamiyatdagi Postlarim</span>
                    {userPosts.length > 0 && (
                      <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {userPosts.length} ta
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Siz tomondan IlmIldizi lentasiga ulashilgan natijalar, yutuqlar va savollar
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" className="rounded-xl gap-1.5 font-bold shadow-xs">
                    <Link href="/feed">
                      <PlusCircle className="size-4" />
                      <span>Lentaga o&apos;tish</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {userPosts.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center space-y-4 shadow-sm">
                  <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                    <Share2 className="size-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className="text-lg font-bold text-foreground">
                      Siz hali post ulashmadingiz
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Test natijalaringiz, erishgan sertifikatlaringiz yoki bilim yutuqlaringizni hamjamiyatdagi tengdoshlaringiz bilan baham ko&apos;ring va qo&apos;shimcha XP yutib oling!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button asChild className="rounded-xl font-bold shadow-xs">
                      <Link href="/tests">
                        <Zap className="size-4 mr-1.5" />
                        Test yechib ulashish
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-semibold">
                      <Link href="/feed">
                        <ExternalLink className="size-4 mr-1.5" />
                        Hamjamiyat lentasini ko&apos;rish
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPosts.map((post) => (
                    <article
                      key={post.id}
                      className="ios-card rounded-[24px] p-5 border border-border/80 space-y-3.5 flex flex-col justify-between transition-all hover:border-primary/40 shadow-xs"
                    >
                      <div className="space-y-3">
                        {/* Header: Subject + Post Type + Delete */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[12px] font-bold text-primary">
                              {post.subject_name || 'Fan'}
                            </span>
                            <span className="text-[12px] text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString('uz-UZ')}
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingPostId === post.id}
                            onClick={() => handleDeletePost(post.id)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Postni o'chirish"
                          >
                            {deletingPostId === post.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>

                        {/* Title & Score Pill */}
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2">
                            {post.title}
                          </h4>
                          {post.score > 0 && (
                            <span className="shrink-0 rounded-xl bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {post.score.toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Caption */}
                        {post.caption && (
                          <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                            {post.caption}
                          </p>
                        )}

                        {/* Image Preview */}
                        {post.image_url && (
                          <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40 max-h-48 flex items-center justify-center">
                            <img
                              src={post.image_url}
                              alt={post.title}
                              className="w-full h-auto max-h-48 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer: Reactions & Comments summary */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Heart className="size-3.5 text-rose-500" />
                            <span>{post.reactions_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="size-3.5 text-sky-500" />
                            <span>{post.comments_count || 0}</span>
                          </span>
                        </div>

                        <Link
                          href={`/feed?post=${post.id}`}
                          className="font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>Lentada ko&apos;rish</span>
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 3: MENING BUYUMLARIM (Inventar) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {(() => {
                const allItems = allInventoryItems;
                const availableCategories = Array.from(new Set(allItems.map((i) => i.category)));

                const categoryLabels: Record<string, string> = {
                  frame: 'Ramkalar',
                  theme: 'Mavzular',
                  title: 'Unvonlar',
                  consumable: 'Himoyalar',
                  avatar: 'Avatarlar',
                  badge: 'Nishonlar',
                };

                const getItemSubtitle = (item: InventoryItemData): string => {
                  if (item.slug === 'streak_freeze') return 'Dars qoldirilganda seriyani avtomatik asraydi';
                  if (item.slug === 'premium_test_unlock') return 'Barcha premium mock testlarga to\'liq kirish';
                  if (item.slug === 'frame_gold') return 'Avataringiz atrofida yaltiroq oltin ramka';
                  if (item.slug === 'frame_silver') return 'Avataringiz atrofida nafis kumush ramka';
                  if (item.slug === 'frame_diamond') return 'Avataringiz atrofida porloq olmos ramka';
                  if (item.slug === 'theme_emerald') return 'Ilova urg\'u rangini zumradga o\'zgartiradi';
                  if (item.slug === 'theme_sunset') return 'Iliq to\'q sariq shafaq mavzusi';
                  if (item.slug === 'title_bilimdon') return 'Profil va reytingda ko\'rinuvchi unvon';
                  if (item.slug === 'title_tarix_ustasi') return 'Tarix fani peshqadamlari unvoni';
                  if (item.slug === 'title_afsona') return 'Faqat eng kuchli talabgorlar unvoni';
                  if (item.description && item.description.trim() && item.description !== '.') {
                    return item.description;
                  }
                  if (item.category === 'frame') return 'Profil rasmi bezak ramkasi';
                  if (item.category === 'theme') return 'Ilova dizayni uchun mavzu';
                  if (item.category === 'title') return 'Profil rasmiy unvoni';
                  if (item.category === 'consumable') return 'Foydali kuchaytirgich';
                  return 'Maxsus xarid qilingan buyum';
                };

                const getCategoryTag = (item: InventoryItemData): string => {
                  if (item.category === 'frame') return 'Ramka';
                  if (item.category === 'theme') return 'Mavzu';
                  if (item.category === 'title') return 'Unvon';
                  if (item.category === 'consumable') return item.slug === 'streak_freeze' ? 'Seriya himoyasi' : 'Kuchaytirgich';
                  if (item.category === 'avatar') return 'Avatar';
                  return item.category_display || 'Buyum';
                };

                const filteredItems = inventoryTab === 'all'
                  ? allItems
                  : allItems.filter((i) => i.category === inventoryTab);

                return (
                  <Card className="overflow-hidden border border-border/80 shadow-md rounded-[28px]">
                    <CardHeader className="pb-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <PremiumIcon icon={ShoppingBag} tone="amber" size="xs" solid />
                          <div>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <span>Mening buyumlarim & Inventar</span>
                              {allItems.length > 0 && (
                                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                                  {allItems.length}
                                </span>
                              )}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Do&apos;kondan xarid qilgan barcha ramkalar, mavzular va seriya himoyalaringiz
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-semibold shadow-2xs hover:bg-muted">
                            <Link href="/shop">
                              <Coins className="size-3.5 text-amber-500" />
                              <span>Do&apos;konga o&apos;tish</span>
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Kategoriya filtri */}
                      {availableCategories.length > 1 && (
                        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
                          <button
                            type="button"
                            onClick={() => setInventoryTab('all')}
                            className={cn(
                              'rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                              inventoryTab === 'all'
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            Barchasi ({allItems.length})
                          </button>
                          {availableCategories.map((cat) => {
                            const count = allItems.filter((i) => i.category === cat).length;
                            const label = categoryLabels[cat] || cat;
                            const active = inventoryTab === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setInventoryTab(cat)}
                                className={cn(
                                  'rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                                  active
                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                {label} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-1">
                      {allItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center space-y-3">
                          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <ShoppingBag className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">Sizda hali xarid qilingan buyumlar yo&apos;q</p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                              Do&apos;kondan tangalaringiz evaziga oltin ramka, maxsus zumrad mavzu, bilimdon unvoni yoki seriya himoyasini sotib olishingiz mumkin.
                            </p>
                          </div>
                          <Button asChild size="sm" className="rounded-xl mt-1 font-semibold">
                            <Link href="/shop">Do&apos;kondan tanlash</Link>
                          </Button>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                          Ushbu toifada buyumlar mavjud emas.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {filteredItems.map((item) => {
                            const isBusy = equipBusy === item.slug;
                            const ring = item.payload?.ring;
                            const accent = item.payload?.accent;
                            const isEquipped = !!item.equipped;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  'group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 shadow-2xs',
                                  isEquipped
                                    ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent dark:from-emerald-950/30'
                                    : 'border-border/80 bg-card hover:border-border hover:bg-muted/20'
                                )}
                              >
                                {/* Yuqori qator: Icon + Matnlar */}
                                <div className="flex items-start gap-3">
                                  {/* Icon / Preview */}
                                  <div className="shrink-0 pt-0.5">
                                    {item.category === 'frame' ? (
                                      <div className="relative size-12 flex items-center justify-center">
                                        <div
                                          className="size-11 rounded-full p-[2.5px] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
                                          style={{
                                            background: `linear-gradient(135deg, ${ring || '#f59e0b'}, #ffffff 50%, ${ring || '#f59e0b'})`,
                                            boxShadow: `0 0 12px ${ring || '#f59e0b'}55`,
                                          }}
                                        >
                                          <div className="size-full rounded-full bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-amber-400">
                                            <Award className="size-5" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : item.category === 'theme' ? (
                                      <div
                                        className="size-11 rounded-2xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105"
                                        style={{
                                          background: `linear-gradient(135deg, ${accent || '#10b981'}, ${accent || '#10b981'}dd)`,
                                          boxShadow: `0 4px 12px ${accent || '#10b981'}40`,
                                        }}
                                      >
                                        <Palette className="size-5" />
                                      </div>
                                    ) : item.category === 'title' ? (
                                      <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-xs transition-transform group-hover:scale-105">
                                        <Crown className="size-5" />
                                      </div>
                                    ) : item.category === 'consumable' ? (
                                      <div className="size-11 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-blue-500/20 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400 shadow-xs transition-transform group-hover:scale-105">
                                        <Shield className="size-5" />
                                      </div>
                                    ) : item.category === 'avatar' && item.payload?.avatar_url ? (
                                      <img
                                        src={item.payload.avatar_url}
                                        alt=""
                                        className="size-11 rounded-2xl object-cover border border-border shadow-xs transition-transform group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                        <Sparkles className="size-5" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Matn qismi */}
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-sm text-foreground truncate">
                                        {item.name}
                                      </span>
                                      {isEquipped && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                                          <Check className="size-2.5 stroke-[2.5]" />
                                          Taqilgan
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                      <span className="font-semibold text-foreground/70">
                                        {getCategoryTag(item)}
                                      </span>
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {getItemSubtitle(item)}
                                    </p>
                                  </div>
                                </div>

                                {/* Pastki qator: Holat & Tugma */}
                                <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs">
                                  {item.is_equippable ? (
                                    <>
                                      <div className="flex items-center gap-1.5 text-xs">
                                        {isEquipped ? (
                                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-[12px]">
                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Faol profilga ulangan
                                          </span>
                                        ) : (
                                          <span className="text-[12px] text-muted-foreground">
                                            Inventarda mavjud
                                          </span>
                                        )}
                                      </div>

                                      <Button
                                        size="sm"
                                        variant={isEquipped ? 'outline' : 'default'}
                                        disabled={isBusy}
                                        onClick={() => handleToggleEquip(item.slug, isEquipped, item.name)}
                                        className={cn(
                                          'h-8 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all',
                                          isEquipped
                                            ? 'text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10'
                                            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs active:scale-95'
                                        )}
                                      >
                                        {isBusy ? (
                                          <Loader2 className="size-3.5 animate-spin" />
                                        ) : isEquipped ? (
                                          'Yechish'
                                        ) : (
                                          'Taqish'
                                        )}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-600 dark:text-sky-400">
                                        <Shield className="size-3.5" />
                                        Avtomatik amal qiladi
                                      </span>

                                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold font-mono">
                                        {item.quantity ? `${item.quantity} ta zaxirada` : '1 ta faol'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 4: SO'NGGI FAOLIK (Testlar, Arenalar, Referral, Sozlamalar) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* So'nggi test natijalari & So'nggi Arena duellari */}
              <div className="grid gap-5 md:grid-cols-2">
                <Card className="rounded-[28px] border-border/80 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <PremiumIcon icon={FileCheck2} tone="sky" size="xs" solid />
                      <span>So&apos;nggi test natijalari</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/60">
                    {data.recent_attempts.length === 0 && (
                      <p className="py-4 text-[13px] text-muted-foreground">Hali test yechilmagan.</p>
                    )}
                    {data.recent_attempts.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tests/${t.id}/feedback`}
                        className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary group"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-foreground group-hover:text-primary">
                            {t.test_title}
                          </p>
                          <span className="text-[11.5px] text-muted-foreground">
                            {new Date(t.started_at).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[12.5px] font-bold text-primary">
                            {t.score !== null ? `${t.score.toFixed(0)}%` : '—'}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-border/80 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <PremiumIcon icon={Swords} tone="rose" size="xs" solid />
                      <span>So&apos;nggi Arena duellari</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/60">
                    {data.recent_battles.length === 0 && (
                      <p className="py-4 text-[13px] text-muted-foreground">Hali arena jangi yo&apos;q.</p>
                    )}
                    {data.recent_battles.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-foreground">vs {b.opponent}</p>
                          <span className="text-[11.5px] text-muted-foreground">
                            {new Date(b.created_at).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            b.won
                              ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                              : 'border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400'
                          }
                        >
                          {b.won ? "G'alaba" : "Mag'lubiyat"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Referral Card */}
              <div className="ios-card rounded-[28px] p-5 sm:p-6 flex flex-col items-center justify-between gap-4 sm:flex-row border border-border/80 shadow-md">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                  <PremiumIcon icon={Gift} tone="sky" size="md" solid className="hidden sm:inline-flex" />
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">
                      Do&apos;stlarni taklif qiling va bonus tanga oling
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5">
                      {data.referral_stats.referral_count} ta do&apos;st taklif qildingiz ·{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.referral_stats.coins_earned} tanga</strong> ishladingiz
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Input readOnly value={referralUrl} className="flex-1 font-mono text-xs sm:w-56 h-10" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Havolani nusxalash">
                        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? 'Nusxalandi!' : 'Havolani nusxalash'}</TooltipContent>
                  </Tooltip>
                  <Button asChild className="rounded-full px-4">
                    <a href={telegramShareHref} target="_blank" rel="noopener noreferrer">
                      <Send className="size-4 mr-1.5" /> Ulashish
                    </a>
                  </Button>
                </div>
              </div>

              {/* Ilova sozlamalari */}
              <div className="space-y-2">
                <p className="px-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ilova sozlamalari
                </p>
                <div className="ios-card overflow-hidden rounded-[22px] divide-y divide-border/60 border border-border/80">
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-foreground">Alifbo (Yozuv turi)</div>
                      <div className="text-xs text-muted-foreground">O&apos;zbek tili: Lotin yoki Kirill yozuvi</div>
                    </div>
                    <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/40">
                      <button
                        type="button"
                        onClick={() => {
                          setScript('latin');
                          tgHaptic('light');
                          toast.success("Lotin yozuviga o'tkazildi");
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                          script === 'latin' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Lotin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript('cyrillic');
                          tgHaptic('light');
                          toast.success("Кирилл ёзувига ўтказилди");
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                          script === 'cyrillic' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Кирилл
                      </button>
                    </div>
                  </div>
                  <AudioToggle />
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 5. PROFILNI TAHRIRLASH MODALI */}
        {/* ========================================================================= */}
        <Dialog open={editOpen} onOpenChange={(open) => { if (!saving) setEditOpen(open); }}>
          <DialogContent className="sm:max-w-md rounded-[28px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Pencil className="size-5 text-primary" />
                Profilni tahrirlash
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ism, familiya va profilingiz rasmini o&apos;zgartirishingiz mumkin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-24 sm:size-28 rounded-full overflow-hidden border-2 border-primary shadow-md cursor-pointer bg-muted flex items-center justify-center transition-all hover:opacity-90"
                    title="Rasmni o'zgartirish"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="size-full object-cover" />
                    ) : removeAvatar ? (
                      <div className="size-full flex items-center justify-center text-2xl font-bold text-primary bg-primary/10">
                        {(firstName[0] || p.username[0] || '?').toUpperCase()}
                      </div>
                    ) : (
                      <CosmeticAvatar
                        className="size-full"
                        src={p.base_avatar_url || p.avatar_url}
                        name={firstName || p.username}
                        cosmetics={p.cosmetics}
                        fallbackClassName="text-2xl"
                      />
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1">
                      <Camera className="size-5" />
                      <span>O&apos;zgartirish</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Rasmni yangilash"
                    className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Camera className="size-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 rounded-full text-xs gap-1.5"
                  >
                    <Camera className="size-3.5" />
                    Rasm yuklash
                  </Button>
                  {(avatarPreview || (!removeAvatar && (p.base_avatar_url || p.avatar_url))) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="h-8 rounded-full text-xs text-rose-500 hover:bg-rose-500/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      O&apos;chirish
                    </Button>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground">PNG, JPG yoki WebP (maks. 10 MB)</p>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name" className="text-xs font-semibold">
                    Ism
                  </Label>
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ismingizni kiriting"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-last-name" className="text-xs font-semibold">
                    Familiya
                  </Label>
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Familiyangizni kiriting"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Foydalanuvchi nomi
                  </Label>
                  <Input
                    disabled
                    value={`@${p.username}`}
                    className="font-mono opacity-75"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                  className="rounded-full"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    'Saqlash'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
