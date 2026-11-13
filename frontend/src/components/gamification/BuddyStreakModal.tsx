'use client';

import { useState, useEffect } from 'react';
import {
  Flame,
  Users,
  Copy,
  Check,
  Send,
  Zap,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Clock,
  Coins,
  Bell,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { soundFX } from '@/lib/soundFX';
import { openTelegramLink } from '@/lib/telegram';
import { cn } from '@/lib/utils';

type BuddyState = {
  has_buddy: boolean;
  status: 'none' | 'pending' | 'active' | 'broken';
  invite_code?: string;
  /** Backend: https://t.me/<bot>?startapp=buddy_<KOD> — do'st bossa ilova shu kod bilan ochiladi */
  share_url?: string;
  current_streak?: number;
  best_streak?: number;
  me?: {
    username: string;
    name: string;
    avatar_url: string;
    is_active_today: boolean;
  };
  partner?: {
    username: string;
    name: string;
    avatar_url: string;
    is_active_today: boolean;
  } | null;
  can_nudge?: boolean;
  nudge_message?: string;
};

interface BuddyStreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStreakUpdate?: () => void;
  /** Taklif havolasidan kelgan do'st kodi — "Bog'lanish" maydoniga oldindan yoziladi */
  initialJoinCode?: string;
}

export default function BuddyStreakModal({
  open,
  onOpenChange,
  onStreakUpdate,
  initialJoinCode,
}: BuddyStreakModalProps) {
  const { user } = useAuthStore();
  const [buddyData, setBuddyData] = useState<BuddyState | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBuddyStatus = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<BuddyState>('/api/v1/system/buddy-streak/');
      setBuddyData(data);
    } catch (err: unknown) {
      console.error('Failed to load buddy streak status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBuddyStatus();
    }
  }, [open]);

  useEffect(() => {
    if (open && initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
    }
  }, [open, initialJoinCode]);

  const shareInvite = () => {
    if (!buddyData?.share_url) return;
    const text = `Keling, IlmIldizi'da birga o'qiymiz! Do'stlik Zanjiriga qo'shiling — kod: ${buddyData.invite_code}`;
    openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(buddyData.share_url)}&text=${encodeURIComponent(text)}`,
    );
  };

  const handleCreateInvite = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<BuddyState>('/api/v1/system/buddy-streak/create/', {
        method: 'POST',
      });
      setBuddyData(data);
      soundFX.click();
      toast.success("Do'stlik taklif kodi yaratildi!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Taklif yaratishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinStreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Iltimos, taklif kodini kiriting');
      return;
    }
    try {
      setJoining(true);
      const res = await apiFetch<{ ok: boolean; message: string; state: BuddyState }>(
        '/api/v1/system/buddy-streak/join/',
        {
          method: 'POST',
          body: JSON.stringify({ invite_code: joinCode.trim() }),
        }
      );
      if (res.ok) {
        soundFX.fanfare();
        toast.success(res.message);
        setBuddyData(res.state);
        setJoinCode('');
        if (onStreakUpdate) onStreakUpdate();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Do'stlikka ulanib bo'lmadi");
    } finally {
      setJoining(false);
    }
  };

  const handleNudge = async () => {
    try {
      setNudging(true);
      soundFX.click();
      const res = await apiFetch<{ ok: boolean; message: string; telegram_url?: string }>(
        '/api/v1/system/buddy-streak/nudge/',
        { method: 'POST' }
      );
      toast.success(res.message);
      if (res.telegram_url) {
        window.open(res.telegram_url, '_blank');
      }
      fetchBuddyStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eslatma yuborishda xatolik');
    } finally {
      setNudging(false);
    }
  };

  const copyCode = () => {
    if (!buddyData?.invite_code) return;
    navigator.clipboard.writeText(buddyData.invite_code);
    setCopied(true);
    soundFX.click();
    toast.success('Kod nusxalandi!');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusPill = (active?: boolean) => (
    <span
      className={cn(
        'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold',
        active ? 'bg-[var(--ps-green)] text-white' : 'bg-[var(--ps-orange)] text-[#080808]',
      )}
    >
      {active ? <><Check className="size-3 stroke-[3]" /> Bajarildi</> : <><Clock className="size-3" /> Kutilmoqda</>}
    </span>
  );

  const person = (p?: { name?: string; avatar_url?: string; is_active_today?: boolean } | null, fallback = 'U') => (
    <div className="flex min-w-0 flex-col items-center rounded-[24px] bg-[var(--ps-neutral)] p-4 text-center">
      <Avatar className={cn('size-14 ring-4', p?.is_active_today ? 'ring-[var(--ps-green)]/40' : 'ring-[var(--ps-orange)]/40')}>
        <AvatarImage src={p?.avatar_url} />
        <AvatarFallback className="font-bold">{p?.name?.[0] || fallback}</AvatarFallback>
      </Avatar>
      <p className="mt-2 max-w-full truncate text-[13.5px] font-bold">{p?.name || 'Siz'}</p>
      {statusPill(p?.is_active_today)}
    </div>
  );

  const benefits = [
    { tone: 'bg-[var(--ps-orange)] text-[#080808]', icon: Coins, text: <>Bog&apos;langanda darhol <b>+30 Ildiz tangasi</b></> },
    { tone: 'bg-[var(--ps-purple)] text-white', icon: Zap, text: <>Har kuni birga test yechsangiz <b>1.5× tanga</b></> },
    { tone: 'bg-[var(--ps-blue)] text-[#080808]', icon: Bell, text: <>Kechki 22:00 da bir-biringizni darsga undaysiz</> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ps-shell max-h-[94svh] w-[calc(100%-1rem)] max-w-[460px] gap-0 overflow-y-auto rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)] sm:p-0"
      >
        {/* Sarlavha lentasi */}
        <DialogHeader className="relative overflow-hidden bg-[var(--ps-orange)] px-6 pb-6 pt-6 text-left text-[#080808]">
          <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/25" />
          <span aria-hidden className="ps-dots absolute bottom-3 right-6 h-12 w-24 opacity-25" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Yopish"
            className="absolute right-4 top-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#080808]/10 transition-colors hover:bg-[#080808] hover:text-[#FFFCF7]"
          >
            <X className="size-4" />
          </button>
          <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-[#FFFCF7]">
            <Users className="size-6 text-[var(--ps-coral)]" />
          </span>
          <DialogTitle className="ps-display relative mt-3 text-[28px] text-[#080808] sm:text-[32px]">
            Do&apos;stlik zanjiri
          </DialogTitle>
          <p className="relative mt-1.5 max-w-sm text-[13.5px] font-medium leading-relaxed text-[#080808]/75">
            Bir-biringizni qo&apos;llab-quvvatlang! Ikkalangiz ham bugun test ishlamasangiz, umumiy olov o&apos;chadi.
          </p>
        </DialogHeader>

        <div className="space-y-3 p-5 sm:p-6">
          {loading && !buddyData ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[var(--ps-orange)]" />
            </div>
          ) : buddyData?.status === 'active' && buddyData.partner ? (
            <>
              {/* Umumiy zanjir */}
              <div className="relative overflow-hidden rounded-[24px] bg-[#080808] p-5 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-[var(--ps-orange)] opacity-70" />
                <div className="relative flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider opacity-60">Umumiy zanjir</p>
                    <p className="mt-1 flex items-center gap-2">
                      <Flame className="size-8 fill-[var(--ps-orange)] text-[var(--ps-orange)]" />
                      <span className="ps-num text-[44px] leading-none">{buddyData.current_streak || 0}</span>
                      <span className="text-[14px] font-bold opacity-70">kun</span>
                    </p>
                  </div>
                  <div className="relative text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-2.5 py-1 text-[11.5px] font-bold text-[#080808]">
                      <Zap className="size-3 fill-current" /> 1.5× tanga
                    </span>
                    <p className="mt-1.5 text-[11.5px] font-semibold opacity-60">Rekord: {buddyData.best_streak || 0} kun</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {person(buddyData.me, 'U')}
                {person(buddyData.partner, 'D')}
              </div>

              {!buddyData.partner?.is_active_today ? (
                <div className="rounded-[24px] bg-[var(--ps-neutral)] p-4">
                  <p className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-[var(--text-secondary)]">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--ps-coral)]" />
                    Do&apos;stingiz bugun hali test ishlamadi. Soat 24:00 gacha kirmasa, olovingiz so&apos;nadi.
                  </p>
                  <button
                    type="button"
                    onClick={handleNudge}
                    disabled={nudging || !buddyData.can_nudge}
                    className="ps-btn ps-btn-ink mt-3 w-full"
                  >
                    {nudging ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-[var(--ps-orange)]" />}
                    {buddyData.can_nudge ? "Do'stni turtish" : 'Eslatma yuborilgan'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-[24px] bg-[var(--ps-green)] p-4 text-[13px] font-semibold text-white">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7]">
                    <ShieldCheck className="size-5 text-[var(--ps-green)]" />
                  </span>
                  Ikkalangiz ham bugungi vazifani bajardingiz. Zanjir saqlandi!
                </div>
              )}
            </>
          ) : (
            <>
              {/* Afzalliklar */}
              <div className="space-y-2">
                {benefits.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2 pr-4">
                      <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full', b.tone)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-[13.5px] leading-snug text-[var(--text-secondary)]">{b.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Taklif kodi */}
              {buddyData?.invite_code ? (
                <div className="relative overflow-hidden rounded-[24px] bg-[var(--ps-purple)] p-5 text-center text-white">
                  <span aria-hidden className="absolute -left-8 -top-8 size-24 rounded-full bg-white/15" />
                  <p className="relative text-[11px] font-black uppercase tracking-wider opacity-75">Sizning taklif kodingiz</p>
                  <button
                    type="button"
                    onClick={copyCode}
                    title="Nusxalash"
                    className="relative mt-2 inline-flex max-w-full cursor-pointer items-center gap-2.5 rounded-full bg-[#080808]/25 py-2 pl-5 pr-2 transition-colors hover:bg-[#080808]/35"
                  >
                    <span className="truncate font-mono text-[22px] font-bold tracking-[0.12em] text-white sm:text-[24px]">
                      {buddyData.invite_code}
                    </span>
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                      {copied ? <Check className="size-4 stroke-[3]" /> : <Copy className="size-4" />}
                    </span>
                  </button>
                  {buddyData.share_url && (
                    <button type="button" onClick={shareInvite} className="ps-btn relative mt-4 w-full !bg-[#2AABEE] !text-white">
                      <Send className="size-4" /> Telegramda do&apos;stga yuborish
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={handleCreateInvite} disabled={loading} className="ps-btn ps-btn-ink w-full">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-[var(--ps-orange)]" />}
                  Taklif kodi yaratish
                </button>
              )}

              {/* Do'st kodi bilan bog'lanish */}
              <form onSubmit={handleJoinStreak} className="pt-1">
                <p className="mb-2 text-[13px] font-bold">Do&apos;stingizning kodi bormi?</p>
                <div className="flex items-center gap-2 rounded-full bg-[var(--ps-neutral)] p-1.5 pl-5 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                  <input
                    placeholder="ILDIZ-XXXXXX"
                    aria-label="Do'stingizning taklif kodi"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[14px] font-bold uppercase tracking-wider text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                    maxLength={12}
                  />
                  <button
                    type="submit"
                    disabled={joining || !joinCode.trim()}
                    className="ps-btn !min-h-10 shrink-0 !bg-[var(--ps-green)] !px-4 !text-white disabled:!opacity-45"
                  >
                    {joining ? <Loader2 className="size-4 animate-spin" /> : "Bog'lanish"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
