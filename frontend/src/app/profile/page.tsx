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
import StudentSpiderRadar, { type SkillRadar } from '@/components/student/StudentSpiderRadar';
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
  skill_radar?: SkillRadar;
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
  const { data: analyticsData, error: analyticsError } = useApiQuery<AnalyticsDashboard>(access ? '/api/analytics/' : null);

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
  // Radar — /api/analytics/ dagi `skill_radar` (Analytics sahifasi bilan bir manba).
  // Ilgari bu yerda yuklanish paytida va ma'lumot yo'q o'qlarda soxta 78/72/85 qiymatlar
  // ko'rsatilardi, "Tezlik" esa vaqtdan qat'i nazar 85 edi.
  const skillRadar: SkillRadar | null | undefined = analyticsError
    ? null
    : analyticsData
    ? analyticsData.skill_radar ?? null
    : undefined;

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
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 pb-12 sm:p-6 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-[var(--ps-coral)] font-medium">{error}</p>
            <Button onClick={() => refresh()} variant="outline">
              Qayta urinish
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 pb-12 sm:p-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 p-4 pb-24 sm:p-6">
        {/* ── 1. Hero: avatar kompozitsiyasi + ism + asosiy ko'rsatkichlar ── */}
        <section className="relative grid items-center gap-8 pt-2 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Avatar kompozitsiyasi */}
          <div className="relative mx-auto aspect-square w-full max-w-[240px] sm:max-w-[300px]">
            <div aria-hidden className="absolute inset-[4%] rounded-full bg-[var(--ps-orange)]" />
            <div aria-hidden className="absolute -left-2 bottom-[4%] size-[32%] rounded-tr-full bg-[var(--ps-purple)]" />
            <div aria-hidden className="ps-dots absolute right-0 top-0 size-[26%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
            <div aria-hidden className="ps-spin absolute -right-1 bottom-[12%] size-[18%] text-[var(--ps-ink)]">
              <svg viewBox="0 0 100 100" className="size-full"><path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" /></svg>
            </div>
            <button
              type="button"
              onClick={handleOpenEdit}
              title="Profilni tahrirlash"
              className="group absolute inset-[13%] cursor-pointer rounded-full transition-transform hover:scale-[1.02]"
            >
              <CosmeticAvatar
                className="size-full ring-[6px] ring-[#FFFCF7]"
                src={p.avatar_url}
                name={p.first_name || p.username}
                cosmetics={p.cosmetics}
                fallbackClassName="text-5xl font-bold"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-7" />
              </span>
            </button>
            {p.is_premium && (
              <span className="absolute right-[10%] top-[8%] flex size-12 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)] ring-4 ring-[#FFFCF7]">
                <Crown className="size-6 fill-current" />
              </span>
            )}
            <div className="ps-float absolute -left-3 top-[40%] sm:-left-6">
              <span className="ps-chip text-[13px]">
                <Flame className="size-4 text-[var(--ps-coral)]" /> {p.streak} kun
              </span>
            </div>
          </div>

          {/* Ism va tugmalar */}
          <div className="min-w-0 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="ps-chip">
                <span className="size-2 rounded-full bg-[var(--ps-orange)]" /> {p.level}-daraja
              </span>
              <span className="ps-chip">{rankInfo.title}</span>
              {p.cosmetics?.title?.payload?.title && <span className="ps-chip">👑 {p.cosmetics.title.payload.title}</span>}
              {p.cosmetics?.frame?.name && <span className="ps-chip">{p.cosmetics.frame.name}</span>}
              {p.cosmetics?.theme?.name && (
                <span className="ps-chip">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.cosmetics.theme.payload.accent || '#10b981' }} />
                  {p.cosmetics.theme.name}
                </span>
              )}
            </div>
            <h1 className="ps-display mt-5 break-words text-[44px] sm:text-[64px]">
              {fullName}
              <span className="text-[var(--ps-coral)]">.</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="font-mono text-[13px] text-[var(--text-muted)]">@{p.username} • IlmIldizi ID</span>
              <VerifiedBadge role={p.role} isSuperadmin={p.is_superadmin} isTeacher={p.is_teacher} size="md" showLabel />
              <CosmeticBadge cosmetics={p.cosmetics} className="size-4" />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <button type="button" onClick={handleOpenEdit} className="ps-btn ps-btn-ink">
                <Pencil className="size-4 text-[var(--ps-orange)]" /> Tahrirlash
                <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
              </button>
              <Link href="/premium" className="ps-btn ps-btn-ghost">
                {p.is_premium ? <Crown className="size-4 fill-current text-[var(--ps-orange)]" /> : <Lock className="size-4" />}
                {p.is_premium ? 'PRO obuna faol' : "PRO-ga o'tish"}
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Ko'rsatkichlar bento ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
          <div className="ps-ink relative col-span-2 overflow-hidden rounded-[28px] p-6 lg:col-span-4">
            <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full bg-[var(--ps-purple)] opacity-50" />
            <p className="ps-eyebrow relative text-white/60">Tajriba</p>
            <p className="ps-num relative mt-2 text-[52px] sm:text-[64px]">{p.xp.toLocaleString('uz-UZ')}</p>
            <p className="relative text-[12px] text-white/60">XP · {p.level + 1}-darajagacha {xpProgress}%</p>
            <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/12">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--ps-orange)] to-[var(--ps-coral)]" style={{ width: `${Math.max(2, xpProgress)}%` }} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white lg:col-span-2">
            <CheckCircle2 className="size-5" />
            <p className="ps-num mt-4 text-[44px]">{data.solved_today || 0}</p>
            <p className="text-[12px] font-semibold text-white/75">Bugun yechildi</p>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-coral)] p-5 text-white lg:col-span-2">
            <Flame className="size-5" />
            <p className="ps-num mt-4 text-[44px]">{p.streak || 0}</p>
            <p className="text-[12px] font-semibold text-white/75">Kunlik seriya</p>
          </div>
          <Link href="/shop" className="relative overflow-hidden rounded-[28px] bg-[var(--ps-orange)] p-5 text-[#080808] transition-transform hover:-translate-y-1 lg:col-span-2">
            <Coins className="size-5" />
            <p className="ps-num mt-4 text-[36px]">{(p.coins || 0).toLocaleString('uz-UZ')}</p>
            <p className="text-[12px] font-semibold text-black/65">Tanga</p>
          </Link>
          <Link href="/battles" className="relative overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-5 text-white transition-transform hover:-translate-y-1 lg:col-span-2">
            <Swords className="size-5" />
            <p className="ps-num mt-4 text-[44px]">{p.elo_rating || 1200}</p>
            <p className="text-[12px] font-semibold text-white/75">ELO · {rankInfo.title}</p>
          </Link>
        </div>

        {/* ── 3. Bo'limlar ── */}
        <div className="ds-seg sticky top-20 z-20 grid w-full grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                data-active={active ? 'true' : undefined}
                onClick={() => {
                  tgHaptic('select');
                  soundFX.click();
                  setActiveTab(tab.id);
                }}
                className="ds-seg-item flex cursor-pointer select-none flex-col items-center justify-center gap-0.5 !px-1 font-bold sm:flex-row sm:gap-1.5"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="hidden rounded-full bg-[var(--ps-orange)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#080808] sm:inline-flex">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
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
                <div className="ios-card rounded-xl p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
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

                <div className="ios-card rounded-xl p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={Target} tone="emerald" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">O&apos;rtacha aniqlik</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--ps-green)]">
                      {analyticsData?.accuracy || 0}%
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">To&apos;g&apos;ri javoblar ulushi</p>
                  </div>
                </div>

                <div className="ios-card rounded-xl p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={GraduationCap} tone="amber" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">DTM Tayyorgarlik</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--reward-text)]">
                      {analyticsData?.readiness_estimate || 0}%
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Imtihon bashorat darajasi</p>
                  </div>
                </div>

                <div className="ios-card rounded-xl p-4 flex flex-col justify-between gap-3 border border-border/80 bg-card/60">
                  <div className="flex items-center justify-between">
                    <PremiumIcon icon={Clock} tone="indigo" size="xs" solid />
                    <span className="text-[12px] font-semibold text-muted-foreground">Faol mashq vaqti</span>
                  </div>
                  <div>
                    <p className="font-mono text-[22px] sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--ps-purple)]">
                      {analyticsData?.time_minutes || 0} <span className="text-sm font-semibold text-muted-foreground">daq</span>
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Fokus dars vaqti</p>
                  </div>
                </div>
              </div>

              {/* 2. KUCHLI VA QIYNOLGAN (ZAIF) MAVZULAR (DIAGNOSTIKA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A. Kuchli Mavzular (80%+ Aniqlik) */}
                <div className="rounded-2xl border border-[var(--ps-green)]/30 bg-[var(--ps-green)]/[0.04] dark:bg-[var(--ps-green)]/[0.07] p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-[var(--ps-green)]/15 text-[var(--ps-green)] flex items-center justify-center shrink-0">
                        <ThumbsUp className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span>Kuchli mavzularingiz</span>
                          <span className="text-[12px] font-mono font-bold bg-[var(--ps-green)]/20 text-[var(--ps-green)] px-2 py-0.2 rounded-full">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--ps-green)]/10 border border-[var(--ps-green)]/25 text-[var(--ps-green)] shadow-2xs"
                        >
                          <CheckCircle2 className="size-3.5 text-[var(--ps-green)] shrink-0" />
                          <span>{topicName}</span>
                          <span className="text-[12px] font-mono text-[var(--ps-green)] ml-1 font-bold">
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
                <div className="rounded-2xl border border-[var(--ps-coral)]/30 bg-[var(--ps-coral)]/[0.04] dark:bg-[var(--ps-coral)]/[0.07] p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-[var(--ps-coral)]/15 text-[var(--ps-coral)] flex items-center justify-center shrink-0">
                        <AlertTriangle className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span>Qiynalgan mavzularingiz</span>
                          <span className="text-[12px] font-mono font-bold bg-[var(--ps-coral)]/20 text-[var(--ps-coral)] px-2 py-0.2 rounded-full">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--ps-coral)]/10 border border-[var(--ps-coral)]/25 text-[var(--ps-coral)] hover:bg-[var(--ps-coral)]/20 transition-all cursor-pointer group shadow-2xs"
                        >
                          <AlertTriangle className="size-3.5 text-[var(--ps-coral)] shrink-0" />
                          <span>{topicName}</span>
                          <span className="text-[12px] font-bold text-[var(--ps-coral)] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
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
              <Card className="rounded-2xl border-border/80 shadow-md">
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
                                style={{ backgroundColor: sub.color || 'var(--ps-purple)' }}
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
                        <Zap className="size-3.5 text-[var(--reward-text)]" />
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
                <Card className="rounded-2xl border-border/80 shadow-md">
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
                              className="bg-[var(--ps-green)] transition-all duration-500"
                              title={`To'g'ri: ${correct} ta (${correctPct}%)`}
                            />
                            <div
                              style={{ width: `${wrongPct}%` }}
                              className="bg-[var(--ps-coral)] transition-all duration-500"
                              title={`Xato: ${wrong} ta (${wrongPct}%)`}
                            />
                            <div
                              style={{ width: `${Math.max(0, skippedPct)}%` }}
                              className="bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                              title={`Qoldirilgan: ${skipped} ta`}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-2.5 rounded-xl bg-[var(--ps-green)]/10 border border-[var(--ps-green)]/20">
                              <p className="text-[12px] font-semibold text-[var(--ps-green)]">To&apos;g&apos;ri</p>
                              <p className="font-mono font-bold text-sm text-foreground mt-0.5">{correct} ta</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[var(--ps-coral)]/10 border border-[var(--ps-coral)]/20">
                              <p className="text-[12px] font-semibold text-[var(--ps-coral)]">Xato</p>
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
              <div className="ios-card overflow-hidden rounded-2xl p-6 sm:p-7 space-y-5 border border-border/80">
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

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)]/12 px-3 py-1 text-[12px] font-bold text-[var(--ps-green)]">
                    <span className="size-2 rounded-full bg-[var(--ps-green)] animate-ping" />
                    Faol o&apos;sishda
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-12 items-center">
                  {/* Organic Tree */}
                  <div className="lg:col-span-5 flex items-center justify-center rounded-2xl border border-[var(--ps-green)]/20 bg-[var(--ps-green)]/[0.05] p-4">
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
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-1">
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

                      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-1">
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

                      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-1">
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

                      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-muted-foreground">O&apos;sish sur&apos;ati</span>
                          <span className="font-mono text-[12px] font-bold text-primary">{xpProgress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-[var(--ps-green)] rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(4, Math.min(100, xpProgress))}%` }}
                          />
                        </div>
                        <p className="text-[11.5px] text-muted-foreground">
                          Keyingi darajagacha progress
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[var(--ps-green)]/[0.08] border border-[var(--ps-green)]/20 p-3.5 text-[12.5px] text-foreground leading-relaxed flex items-start gap-2.5">
                      <PremiumIcon icon={Sprout} tone="emerald" size="2xs" solid className="mt-0.5" />
                      <span>
                        <strong>Har bir yechilgan test</strong>, ko&apos;rilgan dars va tuzatilgan xato bu daraxt ildizini chuqurlashtirib, unga yangi shoxlar qo&apos;shadi.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 burchakli Radar-Analitika (Spider Chart) — Haqiqiy statistika bilan */}
                <div className="mt-6">
                  <StudentSpiderRadar radar={skillRadar} />
                </div>
              </div>

              {/* 6. PLATFORMA YUTUQLARI & NISHONLAR */}
              <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-orange)] opacity-20" />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="ps-eyebrow text-[var(--text-muted)]">Yutuqlar</p>
                    <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                      Platforma <span className="text-[var(--ps-orange)]">nishonlari</span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="ps-num text-[40px] sm:text-[48px]">
                      {data.badges.length}<span className="text-[0.5em] text-[var(--text-faint)]">/{data.total_badges}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">{badgePct}% ochilgan</p>
                  </div>
                </div>
                <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-[var(--ds-track)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--ps-orange)] to-[var(--ps-coral)] transition-[width] duration-700"
                    style={{ width: `${Math.max(2, badgePct)}%` }}
                  />
                </div>

                <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {data.badges.map((b, idx) => {
                    const Icon = RARITY_ICON[b.rarity] || Medal;
                    const tone = ['bg-[var(--ps-orange)] text-[#080808]', 'bg-[var(--ps-purple)] text-white', 'bg-[var(--ps-green)] text-white', 'bg-[var(--ps-coral)] text-white', 'bg-[var(--ps-blue)] text-[#080808]'][idx % 5];
                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div className={cn('relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-[24px] p-5 text-center transition-transform hover:-translate-y-1', tone)}>
                            <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                            <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-black/15">
                              <Icon className="size-7" />
                            </span>
                            <p className="relative text-[14px] font-bold leading-tight">{b.name}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-56">{b.description}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {(data.locked_badges ?? []).map((b) => (
                    <Tooltip key={`locked-${b.name}`}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2.5 rounded-[24px] bg-[var(--ps-neutral)] p-5 text-center transition-transform hover:-translate-y-0.5">
                          <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[var(--text-faint)] border-2 border-dashed border-[var(--border-strong)]">
                            <Lock className="size-6" />
                          </span>
                          <p className="text-[13px] font-bold leading-tight text-[var(--text-secondary)]">{b.name}</p>
                          <p className="line-clamp-2 text-[11.5px] leading-snug text-[var(--text-muted)]">{b.description}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">Hali ochilmagan — {b.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </section>
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
                <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center space-y-4 shadow-sm">
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
                      className="ios-card rounded-2xl p-5 border border-border/80 space-y-3.5 flex flex-col justify-between transition-all hover:border-primary/40 shadow-xs"
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
                            <span className="shrink-0 rounded-xl bg-[var(--ps-green)]/12 border border-[var(--ps-green)]/25 px-2.5 py-1 text-xs font-mono font-bold text-[var(--ps-green)]">
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
                            <Heart className="size-3.5 text-[var(--ps-coral)]" />
                            <span>{post.reactions_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="size-3.5 text-[var(--ps-purple)]" />
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
                  <Card className="overflow-hidden border border-border/80 shadow-md rounded-2xl">
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
                              <Coins className="size-3.5 text-[var(--reward-text)]" />
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
                          <div className="size-12 rounded-2xl bg-[var(--ps-orange)]/10 text-[var(--reward-text)] flex items-center justify-center mx-auto">
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
                                    ? 'border-[var(--ps-green)]/40 bg-gradient-to-b from-[var(--ps-green)]/[0.08] via-[var(--ps-green)]/[0.02] to-transparent dark:from-[var(--ps-green)]/30'
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
                                          <div className="size-full rounded-full bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-[var(--reward-text)]">
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
                                      <div className="size-11 rounded-2xl bg-gradient-to-br from-[var(--ps-orange)]/20 via-[var(--ps-orange)]/10 to-[var(--ps-purple)]/20 border border-[var(--ps-orange)]/30 flex items-center justify-center text-[var(--reward-text)] shadow-xs transition-transform group-hover:scale-105">
                                        <Crown className="size-5" />
                                      </div>
                                    ) : item.category === 'consumable' ? (
                                      <div className="size-11 rounded-2xl bg-gradient-to-br from-[var(--ps-blue)]/20 via-[var(--ps-blue)]/10 to-[var(--ps-blue)]/20 border border-[var(--ps-blue)]/30 flex items-center justify-center text-[var(--ps-purple)] shadow-xs transition-transform group-hover:scale-105">
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
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-green)]/15 border border-[var(--ps-green)]/30 px-2 py-0.2 text-[12px] font-bold text-[var(--ps-green)]">
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
                                          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ps-green)] text-[12px]">
                                            <span className="size-1.5 rounded-full bg-[var(--ps-green)] animate-pulse" />
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
                                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ps-purple)]">
                                        <Shield className="size-3.5" />
                                        Avtomatik amal qiladi
                                      </span>

                                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--ps-blue)]/10 border border-[var(--ps-blue)]/20 text-[var(--ps-purple)] text-xs font-bold font-mono">
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
                <Card className="rounded-2xl border-border/80 shadow-md">
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

                <Card className="rounded-2xl border-border/80 shadow-md">
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
                              ? 'border-[var(--ps-green)]/30 bg-[var(--ps-green)]/12 text-[var(--ps-green)]'
                              : 'border-[var(--ps-coral)]/30 bg-[var(--ps-coral)]/12 text-[var(--ps-coral)]'
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
              <div className="ios-card rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-between gap-4 sm:flex-row border border-border/80 shadow-md">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                  <PremiumIcon icon={Gift} tone="sky" size="md" solid className="hidden sm:inline-flex" />
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">
                      Do&apos;stlarni taklif qiling va bonus tanga oling
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5">
                      {data.referral_stats.referral_count} ta do&apos;st taklif qildingiz ·{' '}
                      <strong className="text-[var(--ps-green)] font-semibold">{data.referral_stats.coins_earned} tanga</strong> ishladingiz
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Input readOnly value={referralUrl} className="flex-1 font-mono text-xs sm:w-56 h-10" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Havolani nusxalash">
                        {copied ? <Check className="size-4 text-[var(--ps-green)]" /> : <Copy className="size-4" />}
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
                <div className="ios-card overflow-hidden rounded-xl divide-y divide-border/60 border border-border/80">
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
          <DialogContent className="sm:max-w-md rounded-2xl">
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
                      className="h-8 rounded-full text-xs text-[var(--ps-coral)] hover:bg-[var(--ps-coral)]/10 gap-1.5"
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
    </div>
  );
}
