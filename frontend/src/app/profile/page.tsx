'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Gift, Copy, Check, Award, Crown, Swords, FileCheck2,
  Medal, Flame, ScrollText, Zap, Coins, Lock, Send, Sprout,
  Pencil, Camera, Trash2, Loader2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUpload } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore, type Profile } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import KnowledgeTree from '@/components/student/KnowledgeTree';
import PredictedScore from '@/components/student/PredictedScore';
import { AudioToggle, ThemeToggle } from '@/components/SettingsToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import VerifiedBadge from '@/components/ui/verified-badge';
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
const RARITY_TONE: Record<string, string> = {
  legendary: 'border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-300',
  epic: 'border-purple-500/30 bg-purple-500/12 text-purple-600 dark:text-purple-300',
  rare: 'border-sky-500/30 bg-sky-500/12 text-sky-600 dark:text-sky-300',
  common: 'border-[var(--border-card)] bg-[var(--surface-hover)] text-[var(--text-secondary)]',
};

const SHARE_TEXT = "IlmIldizi'da bilim sinovidan o'ting va men bilan bonus tanga yutib oling!";

export default function ProfilePage() {
  const { access } = useAuthStore();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const { data, refresh } = useApiQuery<ProfileData>('/api/auth/profile/');

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
        <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-52 w-full" />
        </main>
      </>
    );
  }

  const p = data.profile;
  /* Joriy darajadagi o'sish foizi — daraxtning bo'yi shunga bog'liq. `next_level_xp`
     keyingi daraja chegarasi, shuning uchun foiz to'g'ridan-to'g'ri nisbat sifatida
     hisoblanadi va 0–100 oralig'ida cheklanadi. */
  const xpProgress = p.next_level_xp > 0
    ? Math.min(100, Math.max(0, Math.round((p.xp / p.next_level_xp) * 100)))
    : 0;
  const fullName = `${p.first_name || p.username} ${p.last_name || ''}`.trim();
  const referralUrl = `${origin}/register?ref=${data.referral_code}`;

  /* Mini App ichida bo'lsak bot deep link'i ulashiladi (odam Telegramda qoladi va
     /start referralni qo'llaydi), aks holda oddiy veb-havola. */
  const shareUrl = data.telegram_deep_link || referralUrl;
  const telegramShareHref =
    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(SHARE_TEXT)}`;

  const badgePct = data.total_badges ? Math.round((data.badges.length / data.total_badges) * 100) : 0;

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const chips = [
    { icon: Flame, tone: 'text-[var(--tone-streak-text)]', label: `${p.streak} kunlik streak` },
    { icon: Coins, tone: 'text-[var(--tone-premium-text)]', label: `${p.coins.toLocaleString('uz-UZ')} tanga` },
    { icon: Zap, tone: 'text-[var(--accent-text)]', label: `${p.xp.toLocaleString('uz-UZ')} XP` },
  ];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        {/* Profil sarlavhasi */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl" />
          <CardContent className="relative flex flex-col items-center gap-5 pt-6 text-center sm:flex-row sm:text-left">
            <div className="relative shrink-0 group">
              <div
                onClick={handleOpenEdit}
                className="cursor-pointer relative rounded-full overflow-hidden transition-transform hover:scale-105"
                title="Profilni tahrirlash"
              >
                <CosmeticAvatar
                  className="size-20 border-2 border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 sm:size-24"
                  src={p.avatar_url}
                  name={p.first_name || p.username}
                  cosmetics={p.cosmetics}
                  fallbackClassName="text-lg"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="size-5" />
                </div>
              </div>
              {p.is_premium ? (
                <span className="absolute -bottom-1.5 -right-1.5 rounded-xl bg-amber-500 p-1.5 text-black shadow-md">
                  <Crown className="size-4" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  title="Rasmni o'zgartirish"
                  aria-label="Rasmni o'zgartirish"
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[var(--accent)] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                >
                  <Camera className="size-3.5" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-voice text-xl font-bold sm:text-2xl flex items-center gap-2 flex-wrap">
                  <span>{fullName}</span>
                  <VerifiedBadge role={p.role} isSuperadmin={p.is_superadmin} isTeacher={p.is_teacher} size="md" showLabel />
                </h1>
                <CosmeticBadge cosmetics={p.cosmetics} className="size-4" />
                <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 font-mono text-[var(--accent-text)]">
                  Daraja {p.level}
                </Badge>
                {/* Do'kondan olingan unvon — sotib olingan bezak ekranda ko'rinishi kerak. */}
                {p.cosmetics?.title?.payload?.title && (
                  <Badge variant="outline" className="border-[var(--tone-streak-border,var(--border-strong))] text-[var(--tone-streak-text)]">
                    {p.cosmetics.title.payload.title}
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground">@{p.username}</p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-1 font-mono text-xs sm:justify-start">
                {chips.map((c) => {
                  const Icon = c.icon;
                  return (
                    <span key={c.label} className={`flex items-center gap-1 font-bold ${c.tone}`}>
                      <Icon className="size-3.5" /> {c.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:flex-col sm:items-end sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="h-9 gap-1.5 border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-sm font-medium"
              >
                <Pencil className="size-3.5 text-[var(--accent-text)]" />
                Tahrirlash
              </Button>
              <Button asChild className="h-9 shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-500/90 hover:to-amber-600/90 shadow-sm font-medium">
                <Link href="/premium">
                  {p.is_premium ? <Crown className="size-4" /> : <Lock className="size-4" />}
                  {p.is_premium ? 'PRO obuna faol' : "PRO-ga o'tish"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profilni tahrirlash modali */}
        <Dialog open={editOpen} onOpenChange={(open) => { if (!saving) setEditOpen(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Pencil className="size-5 text-[var(--accent-text)]" />
                Profilni tahrirlash
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ism, familiya va profilingiz rasmini o&apos;zgartirishingiz mumkin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-5 py-2">
              {/* Avatar yuklash qismi */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-24 sm:size-28 rounded-full overflow-hidden border-2 border-[var(--accent)] shadow-md cursor-pointer bg-[var(--surface-hover)] flex items-center justify-center transition-all hover:opacity-90"
                    title="Rasmni o'zgartirish"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="size-full object-cover" />
                    ) : removeAvatar ? (
                      <div className="size-full flex items-center justify-center font-voice text-2xl font-bold text-[var(--accent-text)] bg-primary/10">
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
                    className="absolute -bottom-1 -right-1 size-8 rounded-full bg-[var(--accent)] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
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
                    className="h-8 text-xs gap-1.5"
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
                      className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      O&apos;chirish
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">PNG, JPG yoki WebP (maks. 10 MB)</p>
              </div>

              {/* Ism va Familiya maydonlari */}
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
                    className="h-9 text-sm"
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
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Foydalanuvchi nomi
                  </Label>
                  <Input
                    disabled
                    value={`@${p.username}`}
                    className="h-9 text-sm bg-muted/40 cursor-not-allowed opacity-75 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
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

        {/* DTM ball bashorati — ilovaning farqlovchi xususiyati, shuning uchun
            Hisobim ekranining eng tepasida, ro'yxat ichiga yashiringan emas. */}
        <PredictedScore />

        {/* Referral */}
        <Card className="border-[var(--accent-border)]">
          <CardContent className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--accent-text)] sm:justify-start">
                <Gift className="size-4" /> Do&apos;stlarni taklif qiling
              </h3>
              <p className="text-xs text-muted-foreground">
                {data.referral_stats.referral_count} ta do&apos;st taklif qildingiz ·{' '}
                <strong className="text-foreground">{data.referral_stats.coins_earned} tanga</strong> ishladingiz
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input readOnly value={referralUrl} className="flex-1 font-mono text-xs sm:w-56" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Havolani nusxalash">
                    {copied ? <Check className="size-4 text-[var(--success-text)]" /> : <Copy className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? 'Nusxalandi!' : 'Havolani nusxalash'}</TooltipContent>
              </Tooltip>
              <Button asChild>
                <a href={telegramShareHref} target="_blank" rel="noopener noreferrer">
                  <Send className="size-4" /> Telegram
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bilim Ildizi — brend metaforasi. Daraxt to'liq real ma'lumotdan quriladi:
            daraja (shoxlar), joriy darajadagi XP (bo'y), streak (barglar), yutuqlar (mevalar). */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="size-4 text-[var(--accent-text)]" /> Bilim Ildizingiz
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
            <KnowledgeTree
              level={p.level}
              xpProgress={xpProgress}
              streak={p.streak}
              badges={data.badges.length}
            />
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p><strong className="text-foreground">{p.level}</strong> ta shox — erishilgan darajangiz</p>
              <p><strong className="text-foreground">{p.streak}</strong> kunlik uzluksizlik — barglarning zichligi</p>
              <p><strong className="text-foreground">{data.badges.length}</strong> ta meva — ochilgan yutuqlar</p>
              <p><strong className="text-foreground">{xpProgress}%</strong> — keyingi darajagacha o'sish</p>
              <p className="pt-1 text-xs text-muted-foreground">
                Har bir yechilgan test va takrorlangan xato bu daraxtni o&apos;stiradi.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Yutuqlar */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-amber-400" /> Erishilgan yutuqlar
              </CardTitle>
              <span className="font-mono text-xs text-muted-foreground">
                {data.badges.length} / {data.total_badges} ochilgan
              </span>
            </div>
            <Progress value={badgePct} className="mt-2 h-1.5" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {data.badges.map((b, idx) => {
                const Icon = RARITY_ICON[b.rarity] || Medal;
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <Card className="gap-0 py-4 text-center transition-colors hover:border-[var(--accent-border)]">
                        <CardContent className="space-y-2 px-3">
                          <div className={`mx-auto flex size-12 items-center justify-center rounded-2xl border ${RARITY_TONE[b.rarity] || RARITY_TONE.common}`}>
                            <Icon className="size-6" />
                          </div>
                          <p className="text-xs font-bold leading-tight">{b.name}</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56">{b.description}</TooltipContent>
                  </Tooltip>
                );
              })}
              {/* Qulflangan yutuq ham nomi va sharti bilan ko'rsatiladi — bir xil
                  "Qulflangan" kataklar hech qanday maqsad bermas edi. */}
              {(data.locked_badges ?? []).map((b) => (
                <Tooltip key={`locked-${b.name}`}>
                  <TooltipTrigger asChild>
                    <Card className="gap-0 border-dashed py-4 text-center transition-colors hover:border-[var(--border-strong)]">
                      <CardContent className="space-y-2 px-3">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                          <Lock className="size-5" />
                        </div>
                        <p className="text-xs font-bold leading-tight text-muted-foreground">{b.name}</p>
                        <p className="line-clamp-2 text-xs leading-snug text-[var(--text-faint)]">{b.description}</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56">Hali ochilmagan — {b.description}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="size-4 text-[var(--accent-text)]" /> So&apos;nggi test natijalari
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_attempts.length === 0 && <p className="py-4 text-sm text-muted-foreground">Hali test yechilmagan.</p>}
              {data.recent_attempts.map((t, i) => (
                <div key={t.id}>
                  {i > 0 && <Separator />}
                  <Link href={`/tests/${t.id}/feedback`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-[var(--accent-text)]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.test_title}</p>
                      <span className="text-xs text-muted-foreground">{new Date(t.started_at).toLocaleDateString('uz-UZ')}</span>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-[var(--accent-text)]">
                      {t.score !== null ? `${t.score.toFixed(0)}%` : '—'}
                    </span>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="size-4 text-rose-400" /> So&apos;nggi arena duellari
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_battles.length === 0 && <p className="py-4 text-sm text-muted-foreground">Hali arena jangi yo&apos;q.</p>}
              {data.recent_battles.map((b, i) => (
                <div key={b.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">vs {b.opponent}</p>
                      <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString('uz-UZ')}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={b.won
                        ? 'border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success-text)]'
                        : 'border-rose-500/30 bg-rose-500/12 text-rose-300'}
                    >
                      {b.won ? "G'alaba" : "Mag'lubiyat"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sozlamalar — kunlik ishlatilmaydigan narsalar (ovoz, tema) shu yerda,
            har sahifaning tepa panelida emas. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sozlamalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <AudioToggle />
            <ThemeToggle />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
