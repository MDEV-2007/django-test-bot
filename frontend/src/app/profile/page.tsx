'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Copy, Check, Award, Crown, Swords, FileCheck2, Medal, Flame, ScrollText, Zap, Coins, Lock, Send, Sprout, Pencil, Camera, Trash2, Loader2, ChevronRight, ShoppingBag, Palette, Shield, Sparkles, CheckCircle2, BarChart3, Newspaper, History, PlusCircle, MessageCircle, Heart, Share2, ExternalLink, AlertTriangle, Target, ThumbsUp, Clock, BookOpen, ArrowRight, GraduationCap, type LucideIcon, ArrowUpRight, Sun, Moon, TrendingUp, X, LogOut,
} from 'lucide-react';
import { getRankInfo } from '@/lib/rank';
import { toast } from 'sonner';
import { apiUpload, apiFetch, fetchMe } from '@/lib/api-client';
import { useApiQuery, invalidateApi } from '@/lib/api-cache';
import { useAuthStore, type Profile, type Cosmetics } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { cn, formatCompact } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import ScriptToggle from '@/components/ScriptToggle';
import KnowledgeTree from '@/components/student/KnowledgeTree';
import StudentSpiderRadar, { type SkillRadar } from '@/components/student/StudentSpiderRadar';
import { AudioToggle, ThemeToggle } from '@/components/SettingsToggles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import VerifiedBadge from '@/components/ui/verified-badge';
import { type PremiumIconTone } from '@/components/ui/premium-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { useLanguageStore } from '@/lib/transliterate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { isDark, toggleTheme } = useTheme();
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['stats', 'posts', 'inventory', 'activity'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
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
        {/* Mobil: til va tungi rejim (headerda faqat katta ekranda ko'rinadi) */}
        <div className="flex items-center justify-end gap-2 sm:hidden">
          <ScriptToggle />
          <button
            type="button"
            onClick={() => { tgHaptic('light'); toggleTheme(); }}
            className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-full bg-[var(--ps-paper)] px-3 text-[12px] font-bold text-[var(--text-primary)] shadow-[var(--ds-panel-shadow)] transition-transform active:scale-95"
            aria-label={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
          >
            {isDark ? <Sun className="size-4 text-[var(--ps-orange)]" /> : <Moon className="size-4 text-[var(--ps-purple)]" />}
            {isDark ? "Yorug'" : 'Tungi'}
          </button>
        </div>

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
            <p className="ps-num relative mt-2 text-[52px] sm:text-[64px]"><span title={p.xp.toLocaleString('uz-UZ')}>{formatCompact(p.xp)}</span></p>
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
            <p className="ps-num mt-4 text-[44px]" title={(p.coins || 0).toLocaleString('uz-UZ')}>{formatCompact(p.coins)}</p>
            <p className="text-[12px] font-semibold text-black/65">Tanga</p>
          </Link>
          <Link href="/battles" className="relative overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-5 text-white transition-transform hover:-translate-y-1 lg:col-span-2">
            <Swords className="size-5" />
            <p className="ps-num mt-4 text-[44px]">{formatCompact(p.elo_rating || 1200)}</p>
            <p className="text-[12px] font-semibold text-white/75">ELO · {rankInfo.title}</p>
          </Link>
        </div>

        {/* ── Taklif dasturi (har doim ko'rinadi) ── */}
        <section className="relative overflow-hidden rounded-[32px] bg-[var(--ps-purple)] p-6 text-white sm:p-8">
          <span aria-hidden className="absolute -right-14 -top-14 size-48 rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-10 right-40 size-24 rounded-full bg-[var(--ps-orange)] opacity-80" />
          <span aria-hidden className="ps-dots absolute bottom-0 left-0 h-24 w-48 opacity-20" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="ps-eyebrow text-white/70">Taklif dasturi</p>
              <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                Do&apos;stlarni taklif qiling — <span className="text-[var(--ps-orange)]">tanga</span> oling
              </h3>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-[20px] bg-white/15 px-4 py-3">
                  <p className="ps-num text-[30px] leading-none">{data.referral_stats.referral_count}</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-white/75">taklif qilingan do&apos;st</p>
                </div>
                <div className="rounded-[20px] bg-[var(--ps-orange)] px-4 py-3 text-[#080808]">
                  <p className="ps-num text-[30px] leading-none">{data.referral_stats.coins_earned}</p>
                  <p className="mt-1 text-[11.5px] font-semibold opacity-75">ishlangan tanga</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-full bg-white/15 p-1.5 pl-4">
                <Gift className="size-4 shrink-0 text-[var(--ps-orange)]" />
                <input
                  readOnly
                  value={referralUrl}
                  aria-label="Taklif havolasi"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white outline-none"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Havolani nusxalash"
                      className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#FFFCF7] text-[#080808] transition-transform hover:scale-105"
                    >
                      {copied ? <Check className="size-4 text-[var(--ps-green)]" /> : <Copy className="size-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Nusxalandi!' : 'Havolani nusxalash'}</TooltipContent>
                </Tooltip>
              </div>
              <a href={telegramShareHref} target="_blank" rel="noopener noreferrer" className="ps-btn ps-btn-light w-full">
                <Send className="size-4" />
                Telegramda ulashish
                <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
              </a>
            </div>
          </div>
        </section>

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
              {/* 1. AKADEMIK ASOSIY KPI METRIKALARI — rangli plitkalar */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                  { icon: FileCheck2, label: 'Jami testlar', value: analyticsData?.total_tests || 0, unit: 'ta', hint: "Yechilgan to'liq testlar", tone: 'bg-[var(--ps-blue)] text-[#080808]' },
                  { icon: Target, label: "O'rtacha aniqlik", value: analyticsData?.accuracy || 0, unit: '%', hint: "To'g'ri javoblar ulushi", tone: 'bg-[var(--ps-green)] text-white' },
                  { icon: GraduationCap, label: 'DTM tayyorgarlik', value: analyticsData?.readiness_estimate || 0, unit: '%', hint: 'Imtihon bashorat darajasi', tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                  { icon: Clock, label: 'Mashq vaqti', value: analyticsData?.time_minutes || 0, unit: 'daq', hint: 'Fokus dars vaqti', tone: 'bg-[var(--ps-purple)] text-white' },
                ].map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className={cn('relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-[28px] p-5 transition-transform hover:-translate-y-1', k.tone)}>
                      <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
                      <span aria-hidden className="ps-dots absolute bottom-0 right-0 h-16 w-24 opacity-25" />
                      <div className="relative flex items-center justify-between gap-2">
                        <span className="inline-flex size-10 items-center justify-center rounded-full bg-black/15">
                          <Icon className="size-5" />
                        </span>
                        <span className="text-right text-[12px] font-bold leading-tight opacity-80">{k.label}</span>
                      </div>
                      <div className="relative">
                        <p className="ps-num text-[40px] leading-none sm:text-[46px]">
                          {k.value}
                          <span className="ml-1 text-[0.4em] font-bold opacity-70">{k.unit}</span>
                        </p>
                        <p className="mt-1.5 text-[12px] font-semibold opacity-75">{k.hint}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. KUCHLI VA QIYNOLGAN (ZAIF) MAVZULAR (DIAGNOSTIKA) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* A. Kuchli mavzular */}
                <section className="ps-card relative overflow-hidden !rounded-[32px] p-6">
                  <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[var(--ps-green)] opacity-15" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-green)] text-white">
                        <ThumbsUp className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[22px]">Kuchli mavzular</h3>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">80%+ aniqlik bilan o&apos;zlashtirilgan</p>
                      </div>
                    </div>
                    <p className="ps-num text-[40px] leading-none text-[var(--ps-green)]">{analyticsData?.mastery?.strong?.length || 0}</p>
                  </div>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {analyticsData?.mastery?.strong && analyticsData.mastery.strong.length > 0 ? (
                      analyticsData.mastery.strong.map((topicName, idx) => (
                        <span
                          key={`strong-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-bold text-white"
                        >
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/25">
                            <Check className="size-3.5 stroke-[3]" />
                          </span>
                          {topicName}
                        </span>
                      ))
                    ) : (
                      <p className="w-full rounded-[20px] bg-[var(--ps-neutral)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">
                        Hozircha aniqlanmagan. Testlar yechib, kuchli mavzularingizni shakllantiring!
                      </p>
                    )}
                  </div>
                </section>

                {/* B. Qiynalgan mavzular */}
                <section className="ps-card relative overflow-hidden !rounded-[32px] p-6">
                  <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[var(--ps-coral)] opacity-15" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                        <AlertTriangle className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[22px]">Qiynalgan mavzular</h3>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">Ko&apos;p xato qilingan, takrorlash zarur</p>
                      </div>
                    </div>
                    <p className="ps-num text-[40px] leading-none text-[var(--ps-coral)]">{analyticsData?.mastery?.weak?.length || 0}</p>
                  </div>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {analyticsData?.mastery?.weak && analyticsData.mastery.weak.length > 0 ? (
                      analyticsData.mastery.weak.map((topicName, idx) => (
                        <Link
                          key={`weak-${idx}`}
                          href="/sprint"
                          onClick={() => { soundFX.click(); tgHaptic('medium'); }}
                          className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--ps-neutral)] py-1.5 pl-3.5 pr-1.5 text-[12.5px] font-bold text-[var(--text-primary)] transition-transform hover:-translate-y-0.5"
                        >
                          {topicName}
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-coral)] px-2.5 py-1 text-[11px] text-white">
                            Qasos <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="w-full rounded-[20px] bg-[var(--ps-neutral)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">
                        Ajoyib natija! Hozircha jiddiy oqsayotgan zaif mavzular aniqlanmadi.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* 3. FANLAR BO'YICHA UMUMIY O'SISH */}
              <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-blue)] opacity-20" />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="ps-eyebrow text-[var(--text-muted)]">Fanlar</p>
                    <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                      Fanlar bo&apos;yicha <span className="text-[var(--ps-purple)]">o&apos;sish</span>
                    </h3>
                    <p className="mt-2 text-[13px] text-[var(--text-muted)]">Har bir fan bo&apos;yicha o&apos;zlashtirish foizi va yechilgan savollar.</p>
                  </div>
                  <div className="text-right">
                    <p className="ps-num text-[40px] sm:text-[48px]">{analyticsData?.mastery?.subjects?.length || 0}</p>
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">ta fan faol</p>
                  </div>
                </div>

                <div className="relative mt-6">
                  {(!analyticsData?.mastery?.subjects || analyticsData.mastery.subjects.length === 0) ? (
                    <div className="flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-neutral)] p-8 text-center">
                      <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-blue)] text-[#080808]">
                        <BookOpen className="size-6" />
                      </span>
                      <p className="text-[15px] font-bold">Hali fanlar bo&apos;yicha ma&apos;lumot yo&apos;q</p>
                      <p className="max-w-md text-[13px] text-[var(--text-muted)]">
                        Test yoki sprintlarni yechishni boshlang — har bir fanning o&apos;zlashtirilish dinamikasi bu yerda aks etadi.
                      </p>
                      <Link href="/sprint" className="ps-btn ps-btn-ink mt-1">
                        Birinchi mashqni boshlash
                        <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {analyticsData.mastery.subjects.map((sub, idx) => {
                        const color = sub.color || 'var(--ps-purple)';
                        const status = sub.mastery >= 75 ? 'Yuqori daraja' : sub.mastery >= 50 ? "O'rtacha" : "E'tibor zarur";
                        const statusTone = sub.mastery >= 75 ? 'bg-[var(--ps-green)] text-white' : sub.mastery >= 50 ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-coral)] text-white';
                        return (
                          <div
                            key={`sub-${idx}`}
                            className="flex items-center gap-4 rounded-[24px] bg-[var(--ps-neutral)] p-4 transition-transform hover:-translate-y-0.5"
                          >
                            <span
                              className="relative inline-flex size-14 shrink-0 items-center justify-center rounded-full text-[20px] font-black text-white"
                              style={{ backgroundColor: color }}
                            >
                              {getGradeLetter(sub.mastery)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[15px] font-bold">{sub.name}</p>
                                <p className="ps-num shrink-0 text-[22px] leading-none">{sub.mastery}<span className="text-[0.55em] text-[var(--text-faint)]">%</span></p>
                              </div>
                              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--ds-track)]">
                                <div
                                  className="h-full rounded-full transition-[width] duration-700"
                                  style={{ width: `${Math.max(3, Math.min(100, sub.mastery))}%`, backgroundColor: color }}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
                                <span className="font-semibold text-[var(--text-muted)]">{sub.answered || 0} ta savol</span>
                                <span className={cn('rounded-full px-2 py-0.5 font-bold', statusTone)}>{status}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12.5px] text-[var(--text-muted)]">Zaif fanlarni tezkor mashq bilan mustahkamlang.</p>
                    <Link href="/sprint" className="ps-btn ps-btn-ink">
                      <Zap className="size-4 text-[var(--ps-orange)]" />
                      Fokus &amp; Qasos mashqi
                      <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                    </Link>
                  </div>
                </div>
              </section>

              {/* 4. JAVOBLAR NISBATI */}
              {analyticsData && analyticsData.total_tests > 0 && (() => {
                const correct = analyticsData.accuracy_breakdown?.correct || 0;
                const wrong = analyticsData.accuracy_breakdown?.wrong || 0;
                const skipped = analyticsData.accuracy_breakdown?.skipped || 0;
                const totalAnswers = correct + wrong + skipped || 1;
                const correctPct = Math.round((correct / totalAnswers) * 100);
                const wrongPct = Math.round((wrong / totalAnswers) * 100);
                const skippedPct = Math.max(0, 100 - correctPct - wrongPct);

                return (
                  <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                    <div aria-hidden className="pointer-events-none absolute -left-12 -bottom-12 size-40 rounded-full bg-[var(--ps-green)] opacity-15" />
                    <div className="relative flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="ps-eyebrow text-[var(--text-muted)]">Javoblar</p>
                        <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                          To&apos;g&apos;rilik <span className="text-[var(--ps-green)]">balansi</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="ps-num text-[40px] text-[var(--ps-green)] sm:text-[48px]">{correctPct}%</p>
                        <p className="text-[11px] font-semibold text-[var(--text-muted)]">{correct + wrong + skipped} ta javobdan</p>
                      </div>
                    </div>

                    <div className="relative mt-6 flex h-5 w-full gap-1 overflow-hidden rounded-full">
                      {correctPct > 0 && <div style={{ width: `${correctPct}%` }} className="rounded-full bg-[var(--ps-green)] transition-all duration-500" title={`To'g'ri: ${correct} ta (${correctPct}%)`} />}
                      {wrongPct > 0 && <div style={{ width: `${wrongPct}%` }} className="rounded-full bg-[var(--ps-coral)] transition-all duration-500" title={`Xato: ${wrong} ta (${wrongPct}%)`} />}
                      {skippedPct > 0 && <div style={{ width: `${skippedPct}%` }} className="rounded-full bg-[var(--ds-track)] transition-all duration-500" title={`Qoldirilgan: ${skipped} ta`} />}
                    </div>

                    <div className="relative mt-5 grid grid-cols-3 gap-3">
                      {[
                        { label: "To'g'ri", value: correct, pct: correctPct, icon: CheckCircle2, tone: 'bg-[var(--ps-green)] text-white' },
                        { label: 'Xato', value: wrong, pct: wrongPct, icon: AlertTriangle, tone: 'bg-[var(--ps-coral)] text-white' },
                        { label: "O'tkazilgan", value: skipped, pct: skippedPct, icon: Clock, tone: 'bg-[var(--ps-neutral)] text-[var(--text-primary)]' },
                      ].map((r) => {
                        const Icon = r.icon;
                        return (
                          <div key={r.label} className={cn('relative overflow-hidden rounded-[24px] p-4', r.tone)}>
                            <span aria-hidden className="absolute -right-5 -top-5 size-16 rounded-full bg-white/15" />
                            <div className="relative flex items-center justify-between">
                              <span className="text-[12px] font-bold opacity-85">{r.label}</span>
                              <Icon className="size-4 opacity-80" />
                            </div>
                            <p className="ps-num relative mt-2 text-[30px] leading-none sm:text-[34px]">{r.value}</p>
                            <p className="relative mt-1 text-[11.5px] font-semibold opacity-70">{r.pct}% ulush</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}

              {/* 5. BILIM ILDIZI — jonli daraxt */}
              <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-green)] opacity-15" />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="ps-eyebrow text-[var(--text-muted)]">Bilim ildizi</p>
                    <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                      Shaxsiy bilim <span className="text-[var(--ps-green)]">daraxtingiz</span>
                    </h3>
                    <p className="mt-2 text-[13px] text-[var(--text-muted)]">Dars faolligingiz va yutuqlaringizdan unib o&apos;suvchi jonli daraxt.</p>
                  </div>
                  <span className="ps-chip">
                    <span className="size-2 animate-pulse rounded-full bg-[var(--ps-green)]" />
                    Faol o&apos;sishda
                  </span>
                </div>

                <div className="relative mt-6 grid items-stretch gap-5 lg:grid-cols-12">
                  {/* Daraxt sahnasi */}
                  <div className="relative flex items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-[#DDEEF7] to-[#E2F0E6] p-4 dark:from-[#1F2733] dark:to-[#1C2A23] lg:col-span-5">
                    <KnowledgeTree
                      level={p.level}
                      xpProgress={xpProgress}
                      streak={p.streak}
                      badges={data.badges.length}
                    />
                  </div>

                  {/* Ko'rsatkichlar */}
                  <div className="flex flex-col gap-3 lg:col-span-7">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { icon: Sprout, label: 'Daraxt kuchi', value: p.level, unit: 'shox', hint: 'Erishilgan darajangiz', tone: 'bg-[var(--ps-green)] text-white' },
                        { icon: Flame, label: 'Barglar zichligi', value: p.streak, unit: 'kun', hint: 'Uzluksiz dars seriyasi', tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                        { icon: Award, label: 'Tojdagi mevalar', value: data.badges.length, unit: 'meva', hint: 'Ochilgan yutuqlar', tone: 'bg-[var(--ps-coral)] text-white' },
                      ].map((m) => {
                        const Icon = m.icon;
                        return (
                          <div key={m.label} className={cn('relative overflow-hidden rounded-[24px] p-4', m.tone)}>
                            <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                            <div className="relative flex items-center justify-between">
                              <span className="text-[12px] font-bold opacity-85">{m.label}</span>
                              <span className="inline-flex size-8 items-center justify-center rounded-full bg-black/15">
                                <Icon className="size-4" />
                              </span>
                            </div>
                            <p className="ps-num relative mt-2 text-[32px] leading-none">
                              {m.value}
                              <span className="ml-1 text-[0.42em] font-bold opacity-75">{m.unit}</span>
                            </p>
                            <p className="relative mt-1 text-[11.5px] font-semibold opacity-75">{m.hint}</p>
                          </div>
                        );
                      })}

                      <div className="relative overflow-hidden rounded-[24px] bg-[#080808] p-4 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                        <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-[var(--ps-purple)] opacity-60" />
                        <div className="relative flex items-center justify-between">
                          <span className="text-[12px] font-bold opacity-80">O&apos;sish sur&apos;ati</span>
                          <TrendingUp className="size-4 opacity-80" />
                        </div>
                        <p className="ps-num relative mt-2 text-[32px] leading-none">
                          {xpProgress}<span className="text-[0.5em] opacity-60">%</span>
                        </p>
                        <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/15 dark:bg-black/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--ps-orange)] to-[var(--ps-green)] transition-all duration-700"
                            style={{ width: `${Math.max(4, Math.min(100, xpProgress))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-[22px] bg-[var(--ps-neutral)] p-4 text-[12.5px] leading-relaxed">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ps-green)] text-white">
                        <Sprout className="size-4" />
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">Har bir yechilgan test</strong>, ko&apos;rilgan dars va tuzatilgan xato daraxt ildizini chuqurlashtirib, unga yangi shoxlar qo&apos;shadi.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 burchakli Radar-Analitika */}
                <div className="relative mt-6">
                  <StudentSpiderRadar radar={skillRadar} />
                </div>
              </section>

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
              <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-coral)] opacity-15" />
                <div className="relative flex flex-wrap items-end justify-between gap-5">
                  <div className="max-w-xl">
                    <p className="ps-eyebrow text-[var(--text-muted)]">Hamjamiyat</p>
                    <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                      Mening <span className="text-[var(--ps-coral)]">postlarim</span>
                      <span className="text-[var(--ps-purple)]">.</span>
                    </h3>
                    <p className="mt-2 text-[13.5px] text-[var(--text-muted)]">
                      IlmIldizi lentasiga ulashgan natijalaringiz, yutuqlaringiz va savollaringiz.
                    </p>
                  </div>
                  <div className="flex items-end gap-5">
                    <div className="text-right">
                      <p className="ps-num text-[40px] sm:text-[48px]">{userPosts.length}</p>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)]">ta post</p>
                    </div>
                    <Link href="/feed" className="ps-btn ps-btn-ink">
                      <PlusCircle className="size-4 text-[var(--ps-orange)]" />
                      Lentaga
                      <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                    </Link>
                  </div>
                </div>

                <div className="relative mt-6">
                  {userPosts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-neutral)] p-10 text-center">
                      <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                        <Share2 className="size-7" />
                      </span>
                      <h4 className="ps-display text-[22px]">Siz hali post ulashmadingiz</h4>
                      <p className="max-w-md text-[13px] leading-relaxed text-[var(--text-muted)]">
                        Test natijalaringiz, sertifikatlaringiz yoki bilim yutuqlaringizni tengdoshlaringiz bilan baham ko&apos;ring va qo&apos;shimcha XP yutib oling!
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/tests" className="ps-btn ps-btn-ink">
                          <Zap className="size-4 text-[var(--ps-orange)]" />
                          Test yechib ulashish
                        </Link>
                        <Link href="/feed" className="ps-btn ps-btn-ghost">
                          <ExternalLink className="size-4" />
                          Lentani ko&apos;rish
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {userPosts.map((post, idx) => {
                        const tone = ['bg-[var(--ps-purple)] text-white', 'bg-[var(--ps-orange)] text-[#080808]', 'bg-[var(--ps-green)] text-white', 'bg-[var(--ps-blue)] text-[#080808]'][idx % 4];
                        return (
                          <article
                            key={post.id}
                            className="group flex flex-col overflow-hidden rounded-[28px] bg-[var(--ps-neutral)] transition-transform duration-300 hover:-translate-y-1"
                          >
                            {/* Rangli sarlavha */}
                            <div className={cn('relative overflow-hidden p-5', tone)}>
                              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
                              <div className="relative flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-black/15 px-2.5 py-1 text-[11.5px] font-bold">
                                    {post.subject_name || 'Fan'}
                                  </span>
                                  <span className="text-[11.5px] font-semibold opacity-75">
                                    {new Date(post.created_at).toLocaleDateString('uz-UZ')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={deletingPostId === post.id}
                                  onClick={() => handleDeletePost(post.id)}
                                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/15 transition-colors hover:bg-[#080808] hover:text-white disabled:opacity-60"
                                  title="Postni o'chirish"
                                  aria-label="Postni o'chirish"
                                >
                                  {deletingPostId === post.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                                </button>
                              </div>
                              <div className="relative mt-4 flex items-end justify-between gap-3">
                                <h4 className="line-clamp-2 text-[18px] font-bold leading-snug">{post.title}</h4>
                                {post.score > 0 && (
                                  <p className="ps-num shrink-0 text-[34px] leading-none">
                                    {post.score.toFixed(0)}<span className="text-[0.5em] opacity-70">%</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col gap-3 p-5">
                              {post.caption && (
                                <p className="line-clamp-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{post.caption}</p>
                              )}
                              {post.image_url && (
                                <div className="overflow-hidden rounded-[20px]">
                                  <img src={post.image_url} alt={post.title} className="h-auto max-h-48 w-full object-cover" />
                                </div>
                              )}

                              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-paper)] px-3 py-1.5 text-[12px] font-bold">
                                    <Heart className="size-3.5 text-[var(--ps-coral)]" />
                                    {post.reactions_count || 0}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-paper)] px-3 py-1.5 text-[12px] font-bold">
                                    <MessageCircle className="size-3.5 text-[var(--ps-purple)]" />
                                    {post.comments_count || 0}
                                  </span>
                                </div>
                                <Link
                                  href={`/feed?post=${post.id}`}
                                  className="ps-arrow-host inline-flex items-center gap-2 text-[12.5px] font-bold text-[var(--text-primary)]"
                                >
                                  Lentada
                                  <span className="ps-btn-arrow !mr-0"><ArrowUpRight className="size-4" /></span>
                                </Link>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
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

                /* Har bir toifa — o'z pastel "sahnasi" */
                const CATEGORY_TONE: Record<string, { stage: string; text: string; tag: string }> = {
                  frame: { stage: 'bg-[var(--ps-orange)]', text: 'text-[#080808]', tag: 'bg-[var(--ps-orange)] text-[#080808]' },
                  theme: { stage: 'bg-[var(--ps-green)]', text: 'text-white', tag: 'bg-[var(--ps-green)] text-white' },
                  title: { stage: 'bg-[var(--ps-purple)]', text: 'text-white', tag: 'bg-[var(--ps-purple)] text-white' },
                  consumable: { stage: 'bg-[var(--ps-blue)]', text: 'text-[#080808]', tag: 'bg-[var(--ps-blue)] text-[#080808]' },
                  avatar: { stage: 'bg-[var(--ps-coral)]', text: 'text-white', tag: 'bg-[var(--ps-coral)] text-white' },
                  badge: { stage: 'bg-[var(--ps-lilac)]', text: 'text-[#080808]', tag: 'bg-[var(--ps-lilac)] text-[#080808]' },
                };
                const DEFAULT_TONE = CATEGORY_TONE.title;
                const equippedCount = allItems.filter((i) => i.equipped).length;

                return (
                  <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                    <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-purple)] opacity-15" />
                    <div aria-hidden className="pointer-events-none absolute -left-10 bottom-10 size-24 rounded-full bg-[var(--ps-orange)] opacity-15" />

                    {/* Sarlavha */}
                    <div className="relative flex flex-wrap items-end justify-between gap-5">
                      <div className="max-w-xl">
                        <p className="ps-eyebrow text-[var(--text-muted)]">Inventar</p>
                        <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                          Mening <span className="text-[var(--ps-purple)]">buyumlarim</span>
                          <span className="text-[var(--ps-coral)]">.</span>
                        </h3>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
                          Do&apos;kondan xarid qilgan ramkalar, mavzular, unvonlar va seriya himoyalaringiz.
                        </p>
                      </div>

                      <div className="flex items-end gap-5">
                        <div className="text-right">
                          <p className="ps-num text-[40px] sm:text-[48px]">
                            {allItems.length}
                          </p>
                          <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                            {equippedCount} tasi taqilgan
                          </p>
                        </div>
                        <Link href="/shop" className="ps-btn ps-btn-ink">
                          <Coins className="size-4 text-[var(--ps-orange)]" />
                          Do&apos;kon
                          <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                        </Link>
                      </div>
                    </div>

                    {/* Kategoriya filtri */}
                    {availableCategories.length > 1 && (
                      <div className="relative mt-6 flex items-center gap-2 overflow-x-auto pb-1">
                        {[{ key: 'all', label: 'Barchasi', count: allItems.length }, ...availableCategories.map((cat) => ({
                          key: cat,
                          label: categoryLabels[cat] || cat,
                          count: allItems.filter((i) => i.category === cat).length,
                        }))].map((f) => {
                          const active = inventoryTab === f.key;
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setInventoryTab(f.key)}
                              className={cn(
                                'inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-4 pr-1.5 text-[13px] font-bold transition-all',
                                active
                                  ? 'bg-[#080808] text-[#FFFCF7] shadow-[0_10px_22px_-12px_rgba(8,8,8,0.7)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                                  : 'bg-[var(--ps-neutral)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:text-[var(--text-primary)]'
                              )}
                            >
                              {f.label}
                              <span
                                className={cn(
                                  'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[11.5px] tabular-nums',
                                  active ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-paper)] text-[var(--text-muted)]'
                                )}
                              >
                                {f.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative mt-6">
                      {allItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-neutral)] p-10 text-center">
                          <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                            <ShoppingBag className="size-7" />
                          </span>
                          <p className="text-[15px] font-bold text-[var(--text-primary)]">Sizda hali xarid qilingan buyumlar yo&apos;q</p>
                          <p className="max-w-sm text-[13px] leading-relaxed text-[var(--text-muted)]">
                            Do&apos;kondan tangalaringiz evaziga oltin ramka, maxsus zumrad mavzu, bilimdon unvoni yoki seriya himoyasini sotib olishingiz mumkin.
                          </p>
                          <Link href="/shop" className="ps-btn ps-btn-ink mt-1">
                            Do&apos;kondan tanlash
                            <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                          </Link>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="rounded-[24px] bg-[var(--ps-neutral)] p-6 text-center text-[13px] text-[var(--text-muted)]">
                          Ushbu toifada buyumlar mavjud emas.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredItems.map((item) => {
                            const isBusy = equipBusy === item.slug;
                            const ring = item.payload?.ring;
                            const accent = item.payload?.accent;
                            const isEquipped = !!item.equipped;
                            const tone = CATEGORY_TONE[item.category] || DEFAULT_TONE;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  'group relative flex flex-col overflow-hidden rounded-[28px] bg-[var(--ps-neutral)] transition-transform duration-300 hover:-translate-y-1',
                                  isEquipped && 'ring-[3px] ring-[var(--ps-green)] ring-offset-2 ring-offset-[var(--ps-paper)]'
                                )}
                              >
                                {/* Sahna — buyum ko'rinishi */}
                                <div className={cn('relative flex h-32 items-center justify-center overflow-hidden', tone.stage, tone.text)}>
                                  <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
                                  <span aria-hidden className="absolute -bottom-10 -left-6 size-24 rounded-full bg-black/10" />
                                  <span aria-hidden className="ps-dots absolute inset-0 opacity-20" />

                                  <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm', tone.text === 'text-white' ? 'bg-white/20' : 'bg-black/10')}>
                                    {getCategoryTag(item)}
                                  </span>
                                  {isEquipped && (
                                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                                      <Check className="size-3 stroke-[3]" />
                                      Taqilgan
                                    </span>
                                  )}

                                  <div className="relative transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                                    {item.category === 'frame' ? (
                                      <div
                                        className="flex size-[72px] items-center justify-center rounded-full p-[4px]"
                                        style={{
                                          background: `linear-gradient(135deg, ${ring || '#f59e0b'}, #ffffff 50%, ${ring || '#f59e0b'})`,
                                          boxShadow: `0 0 22px ${ring || '#f59e0b'}88`,
                                        }}
                                      >
                                        <div className="flex size-full items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
                                          <Award className="size-7" />
                                        </div>
                                      </div>
                                    ) : item.category === 'theme' ? (
                                      <div
                                        className="flex size-[72px] items-center justify-center rounded-[22px] border-4 border-white/70 text-white shadow-lg"
                                        style={{ background: `linear-gradient(135deg, ${accent || '#10b981'}, ${accent || '#10b981'}bb)` }}
                                      >
                                        <Palette className="size-8" />
                                      </div>
                                    ) : item.category === 'avatar' && item.payload?.avatar_url ? (
                                      <img
                                        src={item.payload.avatar_url}
                                        alt=""
                                        className="size-[72px] rounded-full border-4 border-[#FFFCF7] bg-[#FFFCF7] object-cover shadow-lg"
                                      />
                                    ) : (
                                      <span className="flex size-[72px] items-center justify-center rounded-full border-4 border-white/60 bg-black/15 shadow-lg">
                                        {item.category === 'title' ? (
                                          <Crown className="size-8" />
                                        ) : item.category === 'consumable' ? (
                                          <Shield className="size-8" />
                                        ) : (
                                          <Sparkles className="size-8" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Matn */}
                                <div className="flex flex-1 flex-col p-5">
                                  <p className="truncate text-[17px] font-bold leading-tight text-[var(--text-primary)]">{item.name}</p>
                                  <p className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13px] leading-snug text-[var(--text-muted)]">
                                    {getItemSubtitle(item)}
                                  </p>

                                  <div className="mt-4 flex items-center justify-between gap-2">
                                    {item.is_equippable ? (
                                      <>
                                        {isEquipped ? (
                                          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--ps-green)]">
                                            <span className="size-2 animate-pulse rounded-full bg-[var(--ps-green)]" />
                                            Faol profilda
                                          </span>
                                        ) : (
                                          <span className="text-[12px] font-semibold text-[var(--text-muted)]">Inventarda</span>
                                        )}
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleToggleEquip(item.slug, isEquipped, item.name)}
                                          className={cn(
                                            'ps-btn !min-h-10 !px-5 !text-[13px]',
                                            isEquipped ? 'ps-btn-ghost hover:!border-[var(--ps-coral)] hover:!text-[var(--ps-coral)]' : 'ps-btn-ink'
                                          )}
                                        >
                                          {isBusy ? <Loader2 className="size-4 animate-spin" /> : isEquipped ? 'Yechish' : 'Taqish'}
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--ps-purple)]">
                                          <Shield className="size-3.5" />
                                          Avtomatik amal qiladi
                                        </span>
                                        <span className="rounded-full bg-[var(--ps-paper)] px-3 py-1 text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
                                          {item.quantity ? `${item.quantity} ta zaxirada` : '1 ta faol'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
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
                <section className="ps-card relative overflow-hidden !rounded-[32px] p-6">
                  <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[var(--ps-blue)] opacity-20" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-blue)] text-[#080808]">
                        <FileCheck2 className="size-5" />
                      </span>
                      <div>
                        <p className="ps-eyebrow text-[var(--text-muted)]">Testlar</p>
                        <h3 className="ps-display text-[22px]">So&apos;nggi natijalar</h3>
                      </div>
                    </div>
                    <p className="ps-num text-[34px] leading-none">{data.recent_attempts.length}</p>
                  </div>

                  <div className="relative mt-5 space-y-2">
                    {data.recent_attempts.length === 0 && (
                      <p className="rounded-[20px] bg-[var(--ps-neutral)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">Hali test yechilmagan.</p>
                    )}
                    {data.recent_attempts.map((t) => {
                      const sc = t.score;
                      const scoreTone = sc === null ? 'bg-[var(--ps-paper)] text-[var(--text-muted)]' : sc >= 80 ? 'bg-[var(--ps-green)] text-white' : sc >= 50 ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-coral)] text-white';
                      return (
                        <Link
                          key={t.id}
                          href={`/tests/${t.id}/feedback`}
                          className="group flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2.5 pr-4 transition-transform hover:-translate-y-0.5"
                        >
                          <span className={cn('inline-flex size-12 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-black', scoreTone)}>
                            {sc !== null ? `${sc.toFixed(0)}%` : '—'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-bold text-[var(--text-primary)]">{t.test_title}</p>
                            <span className="text-[11.5px] font-semibold text-[var(--text-muted)]">
                              {new Date(t.started_at).toLocaleDateString('uz-UZ')}
                            </span>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="ps-card relative overflow-hidden !rounded-[32px] p-6">
                  <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[var(--ps-coral)] opacity-15" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                        <Swords className="size-5" />
                      </span>
                      <div>
                        <p className="ps-eyebrow text-[var(--text-muted)]">Arena</p>
                        <h3 className="ps-display text-[22px]">So&apos;nggi duellar</h3>
                      </div>
                    </div>
                    <p className="ps-num text-[34px] leading-none">
                      {data.recent_battles.filter((b) => b.won).length}
                      <span className="text-[0.5em] text-[var(--text-faint)]">/{data.recent_battles.length}</span>
                    </p>
                  </div>

                  <div className="relative mt-5 space-y-2">
                    {data.recent_battles.length === 0 && (
                      <p className="rounded-[20px] bg-[var(--ps-neutral)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">Hali arena jangi yo&apos;q.</p>
                    )}
                    {data.recent_battles.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2.5 pr-3">
                        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[15px] font-black uppercase text-[var(--ps-purple)]">
                          {(b.opponent || '?').slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-bold text-[var(--text-primary)]">vs {b.opponent}</p>
                          <span className="text-[11.5px] font-semibold text-[var(--text-muted)]">
                            {new Date(b.created_at).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold',
                            b.won ? 'bg-[var(--ps-green)] text-white' : 'bg-[var(--ps-coral)] text-white'
                          )}
                        >
                          {b.won ? "G'alaba" : "Mag'lubiyat"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Ilova sozlamalari */}
              <section className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
                <p className="ps-eyebrow text-[var(--text-muted)]">Sozlamalar</p>
                <h3 className="ps-display mt-2 text-[24px] sm:text-[30px]">Ilova sozlamalari</h3>
                <div className="mt-5 divide-y divide-[var(--border-card)] overflow-hidden rounded-[24px] bg-[var(--ps-neutral)]">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[var(--text-primary)]">Alifbo (Yozuv turi)</div>
                      <div className="text-xs text-[var(--text-muted)]">O&apos;zbek tili: Lotin yoki Kirill yozuvi</div>
                    </div>
                    <div className="flex items-center rounded-full bg-[var(--ps-paper)] p-1">
                      {([['latin', 'Lotin', "Lotin yozuviga o'tkazildi"], ['cyrillic', 'Кирилл', 'Кирилл ёзувига ўтказилди']] as const).map(([key, label, msg]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setScript(key);
                            tgHaptic('light');
                            toast.success(msg);
                          }}
                          className={cn(
                            'cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                            script === key
                              ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AudioToggle />
                  <ThemeToggle />
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tizimdan chiqish (mobil va Telegram Web App'da yon panel yo'q — shu yerda) ── */}
        <section className="ps-card flex flex-col gap-3 !rounded-[28px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
              <LogOut className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">Tizimdan chiqish</p>
              <p className="text-[12.5px] text-[var(--text-muted)]">
                {confirmLogout ? 'Rostdan ham hisobdan chiqmoqchimisiz?' : `@${p.username} hisobidan chiqish`}
              </p>
            </div>
          </div>
          {confirmLogout ? (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => setConfirmLogout(false)} className="ps-btn ps-btn-ghost !min-h-11">
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  tgHaptic('medium');
                  useAuthStore.getState().logout();
                  router.replace('/login');
                }}
                className="ps-btn !min-h-11 !bg-[var(--ps-coral)] !text-white"
              >
                <LogOut className="size-4" /> Ha, chiqish
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                tgHaptic('light');
                setConfirmLogout(true);
              }}
              className="ps-btn ps-btn-ghost !min-h-11 !border-[var(--ps-coral)]/40 !text-[var(--ps-coral)] hover:!bg-[var(--ps-coral)]/10"
            >
              <LogOut className="size-4" /> Chiqish
            </button>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 5. PROFILNI TAHRIRLASH MODALI */}
        {/* ========================================================================= */}
        <Dialog open={editOpen} onOpenChange={(open) => { if (!saving) setEditOpen(open); }}>
          <DialogContent
            showCloseButton={false}
            className="ps-shell max-h-[94vh] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)] sm:w-full sm:max-w-md sm:p-0 dark:bg-[var(--ps-paper)]"
          >
            {/* Sarlavha lentasi */}
            <div className="relative overflow-hidden bg-[var(--ps-purple)] px-6 pb-20 pt-6 text-white">
              <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/15" />
              <span aria-hidden className="ps-dots absolute bottom-4 left-4 h-12 w-24 opacity-25" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                    <Pencil className="size-3" /> Profil
                  </span>
                  <DialogTitle className="ps-display mt-3 text-[28px] text-white sm:text-[32px]">
                    Profilni tahrirlash
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-[13px] !text-white/85">
                    Ism, familiya va profilingiz rasmini o&apos;zgartirishingiz mumkin.
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                  aria-label="Yopish"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white hover:text-[#080808]"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="px-6 pb-6">
              {/* Avatar — lenta ustiga chiqib turadi */}
              <div className="-mt-16 flex flex-col items-center gap-3">
                <div className="group relative">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--ps-neutral)] ring-[6px] ring-[var(--ps-paper)] shadow-[0_20px_40px_-20px_rgba(40,20,80,0.7)]"
                    title="Rasmni o&apos;zgartirish"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="size-full object-cover" />
                    ) : removeAvatar ? (
                      <div className="flex size-full items-center justify-center bg-[var(--ps-lilac)] font-[family-name:var(--font-grotesk)] text-[40px] font-bold text-[#080808]">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#080808]/45 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="size-5" />
                      <span>O&apos;zgartirish</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Rasmni yangilash"
                    className="absolute bottom-0 right-0 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808] ring-4 ring-[var(--ps-paper)] transition-transform hover:scale-110 active:scale-95"
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

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--ps-neutral)] px-4 py-2 text-[12.5px] font-bold transition-colors hover:bg-[#080808] hover:text-[#FFFCF7] dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]"
                  >
                    <Camera className="size-3.5" />
                    Rasm yuklash
                  </button>
                  {(avatarPreview || (!removeAvatar && (p.base_avatar_url || p.avatar_url))) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--ps-coral)]/12 px-4 py-2 text-[12.5px] font-bold text-[var(--ps-coral)] transition-colors hover:bg-[var(--ps-coral)] hover:text-white"
                    >
                      <Trash2 className="size-3.5" />
                      O&apos;chirish
                    </button>
                  )}
                </div>
                <p className="text-[11.5px] font-semibold text-[var(--text-muted)]">PNG, JPG yoki WebP · maks. 10 MB</p>
              </div>

              {/* Maydonlar */}
              <div className="mt-6 space-y-3">
                <label htmlFor="edit-first-name" className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-2.5 pt-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Ism</span>
                  <input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ismingizni kiriting"
                    maxLength={50}
                    className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                  />
                </label>
                <label htmlFor="edit-last-name" className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-2.5 pt-2 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Familiya</span>
                  <input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Familiyangizni kiriting"
                    maxLength={50}
                    className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                  />
                </label>

                <div className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-dashed border-[var(--border-card)] px-5 py-3">
                  <div className="min-w-0">
                    <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Foydalanuvchi nomi</span>
                    <span className="mt-0.5 block truncate font-mono text-[14px] font-semibold text-[var(--text-secondary)]">@{p.username}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--text-muted)]">o&apos;zgarmaydi</span>
                </div>
              </div>

              {/* Tugmalar */}
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                  className="ps-btn ps-btn-ghost"
                >
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving} className="ps-btn ps-btn-ink">
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      Saqlash
                      <span className="ps-btn-arrow"><Check className="size-4 stroke-[3]" /></span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
