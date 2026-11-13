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
  Share2,
  AlertCircle,
  ShieldCheck,
  Loader2,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-[460px] overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF9500] to-[#FF5E00] text-white shadow-lg shadow-orange-500/30">
            <Users className="size-7 stroke-[2.2]" />
          </div>

          <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
            Do&apos;stlik Zanjiri <span className="text-[#FF9500]">(Co-op Streak)</span>
          </DialogTitle>

          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-sm">
            Bir-biringizni qo&apos;llab-quvvatlang! Agar ikkalangiz ham bugun test ishlamasangiz, umumiy olov o&apos;chadi.
          </p>
        </DialogHeader>

        {loading && !buddyData ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#FF9500]" />
          </div>
        ) : buddyData?.status === 'active' && buddyData.partner ? (
          /* ACTIVE PAIR VIEW */
          <div className="mt-4 space-y-4">
            {/* Streak Counter Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#080808] to-[#201d1a] p-4 text-white shadow-md">
              <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-[#FF9500]/25 blur-xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Umumiy Zanjir</p>
                  <p className="mt-0.5 text-3xl font-black tracking-tight flex items-center gap-1.5">
                    <Flame className="size-7 fill-[#FF9500] text-[#FF9500] animate-bounce" />
                    <span>{buddyData.current_streak || 0}</span>
                    <span className="text-sm font-semibold text-white/70">kun</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                    <Zap className="size-3" /> 1.5x Tanga Bonusi
                  </span>
                  <p className="mt-1 text-[11px] text-white/50">Rekord: {buddyData.best_streak || 0} kun</p>
                </div>
              </div>
            </div>

            {/* Side-by-Side Status */}
            <div className="grid grid-cols-2 gap-3">
              {/* Me */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-3.5 text-center">
                <Avatar className="size-14 border-2 border-primary/20">
                  <AvatarImage src={buddyData.me?.avatar_url} />
                  <AvatarFallback>{buddyData.me?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs font-bold truncate max-w-full">{buddyData.me?.name || 'Siz'}</p>
                <span
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    buddyData.me?.is_active_today
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-amber-500/15 text-amber-500'
                  )}
                >
                  {buddyData.me?.is_active_today ? '✓ Bajarildi' : '⏳ Kutilmoqda'}
                </span>
              </div>

              {/* Partner */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-3.5 text-center">
                <Avatar className="size-14 border-2 border-primary/20">
                  <AvatarImage src={buddyData.partner?.avatar_url} />
                  <AvatarFallback>{buddyData.partner?.name?.[0] || 'D'}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs font-bold truncate max-w-full">{buddyData.partner?.name}</p>
                <span
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    buddyData.partner?.is_active_today
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-amber-500/15 text-amber-500'
                  )}
                >
                  {buddyData.partner?.is_active_today ? '✓ Bajarildi' : '⏳ Kutilmoqda'}
                </span>
              </div>
            </div>

            {/* Action / Nudge Section */}
            {!buddyData.partner?.is_active_today ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-snug">
                    Do&apos;stingiz bugun hali test ishlamadi! Soat 24:00 gacha kirmasa, olovingiz so&apos;nadi.
                  </p>
                </div>
                <Button
                  onClick={handleNudge}
                  disabled={nudging || !buddyData.can_nudge}
                  className="mt-3 w-full bg-gradient-to-r from-[#FF9500] to-[#FF5E00] text-white font-bold text-xs h-10 rounded-xl shadow-md hover:opacity-90"
                >
                  {nudging ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="size-3.5 mr-1.5" />
                  )}
                  {buddyData.can_nudge
                    ? 'Do‘stni turtish (Tez kiring deb eslatish)'
                    : 'Eslatma yuborilgan (Kuting)'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="size-5 shrink-0" />
                <span>Ikkalangiz ham bugungi vazifani bajardingiz. Zanjir xavfsiz saqlandi!</span>
              </div>
            )}
          </div>
        ) : (
          /* NO BUDDY YET / PENDING VIEW */
          <div className="mt-4 space-y-4">
            {/* Benefits Banner */}
            <div className="rounded-2xl border border-border bg-muted/40 p-3.5 space-y-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-[#FF9500]" /> Birga o‘qishning afzalliklari:
              </p>
              <ul className="text-[12px] text-muted-foreground space-y-1 list-disc list-inside">
                <li>Bog‘langanda darhol <strong>+30 Ildiz tangasi</strong> olasiz</li>
                <li>Har kuni birga test yechsangiz <strong>1.5x tanga bonusi</strong></li>
                <li>Bir-biringizni kechki soat 22:00 da darsga undab turasiz</li>
              </ul>
            </div>

            {/* Invite Code Generation */}
            {buddyData?.invite_code ? (
              <div className="space-y-2 rounded-2xl border-2 border-dashed border-[#FF9500]/40 bg-[#FF9500]/5 p-4 text-center">
                <p className="text-xs font-semibold text-muted-foreground">Sizning taklif kodingiz:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black tracking-widest text-[#FF9500]">
                    {buddyData.invite_code}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyCode}
                    className="h-8 rounded-lg px-2 text-xs"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
                {buddyData.share_url && (
                  <Button
                    size="sm"
                    className="mt-2 w-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs h-9 rounded-xl font-bold"
                    onClick={shareInvite}
                  >
                    <Share2 className="size-3.5 mr-1.5" /> Telegramda do‘stga jo‘natish
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={handleCreateInvite}
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#FF9500] to-[#FF5E00] text-white font-bold text-xs rounded-xl shadow-md"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
                Taklif kodi yaratish
              </Button>
            )}

            {/* Join via Friend's Code */}
            <form onSubmit={handleJoinStreak} className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">Do‘stingizning kodi bormi?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Masalan: ILD-72849"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase text-xs h-10 rounded-xl"
                  maxLength={12}
                />
                <Button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="h-10 px-4 text-xs font-bold rounded-xl bg-primary text-primary-foreground shrink-0"
                >
                  {joining ? <Loader2 className="size-4 animate-spin" /> : 'Bog‘lanish'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
