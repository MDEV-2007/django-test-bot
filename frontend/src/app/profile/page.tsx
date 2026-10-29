'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Gift, Copy, Check, Award, Crown, Swords, FileCheck2,
  Medal, Flame, ScrollText, Zap, Coins, Lock, Send, Sprout,
  Pencil, Camera, Trash2, Loader2, ChevronRight, ShoppingBag, Palette, Shield, Sparkles, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUpload, apiFetch, fetchMe } from '@/lib/api-client';
import { useApiQuery, invalidateApi } from '@/lib/api-cache';
import { useAuthStore, type Profile } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
import KnowledgeTree from '@/components/student/KnowledgeTree';
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
import type { Cosmetics } from '@/lib/auth-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  };
  referral_code: string; telegram_deep_link: string;
  referral_stats: { referral_count: number; coins_earned: number };
  recent_attempts: { id: number; test_title: string; score: number | null; started_at: string }[];
  recent_battles: { id: number; opponent: string; won: boolean; created_at: string }[];
  badges: { name: string; description: string; rarity: string }[];
  locked_badges: { name: string; description: string; rarity: string }[];
  total_badges: number;
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
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const { data, refresh } = useApiQuery<ProfileData>('/api/auth/profile/');

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

  const { data: invData, refresh: refreshInventory } = useApiQuery<InventoryResponse>('/api/shop/inventory/');
  const [equipBusy, setEquipBusy] = useState<string | null>(null);
  const [inventoryTab, setInventoryTab] = useState<string>('all');

  useEffect(() => {
    if (data?.profile) {
      useAuthStore.getState().setUser(data.profile as any);
    }
  }, [data]);

  async function handleToggleEquip(slug: string, currentlyEquipped: boolean, name: string) {
    setEquipBusy(slug);
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

  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

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
      toast.success("Profil muvaffaqiyatli yangilandi!");
      setEditOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Profilni saqlashda xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <Skeleton className="h-28 w-full rounded-[24px]" />
          <Skeleton className="h-64 w-full rounded-[28px]" />
        </main>
      </>
    );
  }

  const p = data.profile;
  const xpProgress = p.next_level_xp > 0
    ? Math.min(100, Math.max(0, Math.round((p.xp / p.next_level_xp) * 100)))
    : 0;
  const fullName = `${p.first_name || p.username} ${p.last_name || ''}`.trim();
  const referralUrl = `${origin}/register?ref=${data.referral_code}`;

  const shareUrl = data.telegram_deep_link || referralUrl;
  const telegramShareHref =
    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(SHARE_TEXT)}`;

  const badgePct = data.total_badges ? Math.round((data.badges.length / data.total_badges) * 100) : 0;

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-20 sm:p-6">
        {/* iOS Settings -> Apple ID Profile Card */}
        <div className="ios-card relative overflow-hidden rounded-[28px] p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#007AFF]/[0.08] blur-[70px]" />
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
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#007AFF] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ring-2 ring-white dark:ring-[#1C1C1E]"
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
                <span className="rounded-full bg-[#007AFF]/12 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#007AFF]">
                  Daraja {p.level}
                </span>
                {p.cosmetics?.title?.payload?.title && (
                  <span className="rounded-full bg-[#FF9500]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#FF9500]">
                    👑 {p.cosmetics.title.payload.title}
                  </span>
                )}
                {p.cosmetics?.frame?.name && (
                  <span className="rounded-full bg-amber-500/12 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    {p.cosmetics.frame.name}
                  </span>
                )}
                {p.cosmetics?.theme?.name && (
                  <span className="rounded-full bg-emerald-500/12 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full inline-block" style={{ backgroundColor: p.cosmetics.theme.payload.accent || '#10b981' }} />
                    {p.cosmetics.theme.name}
                  </span>
                )}
              </div>
              <p className="font-mono text-[13px] text-[#8E8E93]">@{p.username} • IlmIldizi ID</p>

              {/* iOS Dynamic Island Metric Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9500]/12 px-3 py-1 text-[12px] font-bold text-[#FF9500]">
                  <Flame className="size-3.5 fill-current" /> {p.streak} kun streak
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/12 px-3 py-1 text-[12px] font-bold text-[#34C759]">
                  <Coins className="size-3.5" /> {p.coins.toLocaleString('uz-UZ')} tanga
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/12 px-3 py-1 text-[12px] font-bold text-[#007AFF]">
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
                <Pencil className="size-3.5 text-[#007AFF]" />
                Tahrirlash
              </Button>
              <Link
                href="/premium"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF9500] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(255,149,0,0.3)] hover:opacity-95 active:scale-95 transition-all"
              >
                {p.is_premium ? <Crown className="size-4 fill-current" /> : <Lock className="size-3.5" />}
                <span>{p.is_premium ? 'PRO obuna faol' : "PRO-ga o'tish"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Profilni tahrirlash modali */}
        <Dialog open={editOpen} onOpenChange={(open) => { if (!saving) setEditOpen(open); }}>
          <DialogContent className="sm:max-w-md rounded-[28px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Pencil className="size-5 text-[#007AFF]" />
                Profilni tahrirlash
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8E8E93]">
                Ism, familiya va profilingiz rasmini o&apos;zgartirishingiz mumkin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-24 sm:size-28 rounded-full overflow-hidden border-2 border-[#007AFF] shadow-md cursor-pointer bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center transition-all hover:opacity-90"
                    title="Rasmni o'zgartirish"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="size-full object-cover" />
                    ) : removeAvatar ? (
                      <div className="size-full flex items-center justify-center text-2xl font-bold text-[#007AFF] bg-[#007AFF]/10">
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
                    className="absolute -bottom-1 -right-1 size-8 rounded-full bg-[#007AFF] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
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
                      className="h-8 rounded-full text-xs text-[#FF3B30] hover:bg-[#FF3B30]/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      O&apos;chirish
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-[#8E8E93]">PNG, JPG yoki WebP (maks. 10 MB)</p>
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
                  <Label className="text-xs font-semibold text-[#8E8E93]">
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

        {/* iOS Share Sheet Style Referral Card */}
        <div className="ios-card rounded-[24px] p-5 sm:p-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <PremiumIcon icon={Gift} tone="sky" size="md" solid className="hidden sm:inline-flex" />
            <div>
              <h3 className="text-[15px] font-bold text-foreground">
                Do&apos;stlarni taklif qiling va bonus tanga oling
              </h3>
              <p className="text-[12.5px] text-[#8E8E93] mt-0.5">
                {data.referral_stats.referral_count} ta do&apos;st taklif qildingiz ·{' '}
                <strong className="text-[#34C759] font-semibold">{data.referral_stats.coins_earned} tanga</strong> ishladingiz
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input readOnly value={referralUrl} className="flex-1 font-mono text-xs sm:w-56 h-10" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Havolani nusxalash">
                  {copied ? <Check className="size-4 text-[#34C759]" /> : <Copy className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? 'Nusxalandi!' : 'Havolani nusxalash'}</TooltipContent>
            </Tooltip>
            <Button asChild className="rounded-full px-4">
              <a href={telegramShareHref} target="_blank" rel="noopener noreferrer">
                <Send className="size-4" /> Ulashish
              </a>
            </Button>
          </div>
        </div>

        {/* Bilim Ildizi — Apple Health / Home Ecological Widget */}
        <div className="ios-card overflow-hidden rounded-[28px] p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PremiumIcon icon={Sprout} tone="emerald" size="md" solid />
              <div>
                <h2 className="text-[18px] font-bold text-foreground leading-tight">
                  Shaxsiy Bilim Ildizingiz
                </h2>
                <p className="text-[12.5px] text-[#8E8E93]">
                  Dars faolligingiz va muvaffaqiyatlaringizdan unib o&apos;suvchi jonli daraxt
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/12 px-3 py-1 text-[11px] font-bold text-[#34C759]">
              <span className="size-2 rounded-full bg-[#34C759] animate-ping" />
              Faol o&apos;sishda
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-center">
            {/* Left: Organic Tree */}
            <div className="lg:col-span-5 flex items-center justify-center rounded-[24px] border border-[#34C759]/20 bg-[#34C759]/[0.05] p-4">
              <KnowledgeTree
                level={p.level}
                xpProgress={xpProgress}
                streak={p.streak}
                badges={data.badges.length}
              />
            </div>

            {/* Right: 4 Apple Health Sub-cards */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#8E8E93]">Daraxt kuchi</span>
                    <PremiumIcon icon={Sprout} tone="emerald" size="2xs" solid />
                  </div>
                  <p className="text-[16px] font-bold text-foreground">
                    {p.level} ta mustahkam shox
                  </p>
                  <p className="text-[11.5px] text-[#8E8E93]">
                    Erishilgan intellektual darajangiz
                  </p>
                </div>

                <div className="rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#8E8E93]">Barglar zichligi</span>
                    <PremiumIcon icon={Flame} tone="amber" size="2xs" solid />
                  </div>
                  <p className="text-[16px] font-bold text-foreground">
                    {p.streak} kunlik yashillik
                  </p>
                  <p className="text-[11.5px] text-[#8E8E93]">
                    Uzluksiz dars seriyasi
                  </p>
                </div>

                <div className="rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#8E8E93]">Tojdagi mevalar</span>
                    <PremiumIcon icon={Award} tone="rose" size="2xs" solid />
                  </div>
                  <p className="text-[16px] font-bold text-foreground">
                    {data.badges.length} ta oltin meva
                  </p>
                  <p className="text-[11.5px] text-[#8E8E93]">
                    Ochilgan maxsus yutuqlar
                  </p>
                </div>

                <div className="rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#8E8E93]">O&apos;sish sur&apos;ati</span>
                    <span className="font-mono text-[12px] font-bold text-[#007AFF]">{xpProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#007AFF] to-[#34C759] rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, Math.min(100, xpProgress))}%` }}
                    />
                  </div>
                  <p className="text-[11.5px] text-[#8E8E93]">
                    Keyingi darajagacha progress
                  </p>
                </div>
              </div>

              <div className="rounded-[18px] bg-[#34C759]/[0.08] border border-[#34C759]/20 p-3.5 text-[12.5px] text-foreground leading-relaxed flex items-start gap-2.5">
                <PremiumIcon icon={Sprout} tone="emerald" size="2xs" solid className="mt-0.5" />
                <span>
                  <strong>Har bir yechilgan test</strong>, ko&apos;rilgan dars va tuzatilgan xato bu daraxt ildizini chuqurlashtirib, unga yangi shoxlar qo&apos;shadi.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Inventar & Do'kondan sotib olingan bezaklar */}
        {(() => {
          const allItems = invData?.items || [];
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
            <Card className="overflow-hidden border border-border shadow-xs">
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

                {/* Kategoriya filtri (agar 1 tadan ortiq toifa bo'lsa) */}
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
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <Check className="size-2.5 stroke-[2.5]" />
                                    Taqilgan
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Faol profilga ulangan
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">
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
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
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

        {/* Platforma Yutuqlari & Nishonlar */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <PremiumIcon icon={Award} tone="amber" size="xs" solid />
                <span>Platforma Yutuqlari & Nishonlar</span>
              </CardTitle>
              <span className="font-mono text-xs font-semibold text-[#8E8E93]">
                {data.badges.length} / {data.total_badges} ochilgan
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
                      <div className="rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/60 dark:bg-[#2C2C2E]/60 p-4 text-center space-y-2.5 transition-all hover:scale-[1.02]">
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
                    <div className="rounded-[20px] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-4 text-center space-y-2 opacity-65">
                      <PremiumIcon icon={Lock} tone="zinc" size="lg" className="mx-auto" />
                      <p className="text-[12px] font-bold leading-tight text-[#8E8E93]">{b.name}</p>
                      <p className="line-clamp-2 text-[11px] leading-snug text-[#8E8E93]">{b.description}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56">Hali ochilmagan — {b.description}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* iOS Inset Grouped Recent Attempts & Arena Battles */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PremiumIcon icon={FileCheck2} tone="sky" size="xs" solid />
                <span>So&apos;nggi test natijalari</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {data.recent_attempts.length === 0 && (
                <p className="py-4 text-[13px] text-[#8E8E93]">Hali test yechilmagan.</p>
              )}
              {data.recent_attempts.map((t) => (
                <Link
                  key={t.id}
                  href={`/tests/${t.id}/feedback`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-[#007AFF] group"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-foreground group-hover:text-[#007AFF]">
                      {t.test_title}
                    </p>
                    <span className="text-[11.5px] text-[#8E8E93]">
                      {new Date(t.started_at).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 font-mono text-[12.5px] font-bold text-[#007AFF]">
                      {t.score !== null ? `${t.score.toFixed(0)}%` : '—'}
                    </span>
                    <ChevronRight className="size-4 text-[#C7C7CC]" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PremiumIcon icon={Swords} tone="rose" size="xs" solid />
                <span>So&apos;nggi Arena duellari</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {data.recent_battles.length === 0 && (
                <p className="py-4 text-[13px] text-[#8E8E93]">Hali arena jangi yo&apos;q.</p>
              )}
              {data.recent_battles.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">vs {b.opponent}</p>
                    <span className="text-[11.5px] text-[#8E8E93]">
                      {new Date(b.created_at).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      b.won
                        ? 'border-[#34C759]/30 bg-[#34C759]/12 text-[#34C759]'
                        : 'border-[#FF3B30]/30 bg-[#FF3B30]/12 text-[#FF3B30]'
                    }
                  >
                    {b.won ? "G'alaba" : "Mag'lubiyat"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* iOS Settings Inset Grouped Preferences Table */}
        <div className="space-y-2">
          <p className="px-2 text-[12px] font-bold uppercase tracking-wider text-[#8E8E93]">
            Ilova sozlamalari
          </p>
          <div className="ios-card overflow-hidden rounded-[22px] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <AudioToggle />
            <ThemeToggle />
          </div>
        </div>
      </main>
    </>
  );
}
