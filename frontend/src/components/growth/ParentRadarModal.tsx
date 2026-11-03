'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Send, Copy, Check, Sparkles, ShieldCheck,
  CreditCard, Award, TrendingUp, MessageSquare, AlertCircle, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { apiFetch } from '@/lib/api-client';
import { tgHaptic } from '@/lib/telegram';
import { toast } from 'sonner';

type ParentStatus = {
  is_connected: boolean;
  connections_count: number;
  invite_url: string;
  parents: { id: number; name: string; chat_id: string; linked_at: string }[];
};

type ParentRadarModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ParentRadarModal({ open, onOpenChange }: ParentRadarModalProps) {
  const { user } = useAuthStore();
  const { flags } = useFeatureFlags();

  const [status, setStatus] = useState<ParentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function fetchStatus() {
      setLoading(true);
      try {
        const res = await apiFetch<ParentStatus>('/api/v1/system/parent-radar/status/');
        setStatus(res);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [open]);

  if (!flags.enable_parent_radar) {
    return null;
  }

  const inviteUrl = status?.invite_url || `https://t.me/ilmildiziuz_bot?start=parent_${user?.id || ''}`;

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    tgHaptic('success');
    toast.success("Ota-onangiz uchun taklif havolasi nusxalandi!");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleShareTelegram() {
    const text = `Assalomu alaykum ota/ona! Men IlmIldizi ta'lim platformasida Milliy Sertifikat va DTM imtihonlariga tayyorlanyapman. Mening haftalik dars hisobotlarimni va natijalarimni kuzatib borishingiz uchun quyidagi havolani bosing:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank');
    tgHaptic('medium');
  }

  async function handleSendInvoice() {
    setSendingInvoice(true);
    tgHaptic('medium');
    try {
      const res = await apiFetch<{ success: boolean; message: string; checkout_url: string }>(
        '/api/v1/system/parent-radar/invoice/',
        { method: 'POST' }
      );
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoys yuborishda xatolik");
    } finally {
      setSendingInvoice(false);
    }
  }

  const studentName = user?.first_name || user?.username || "Abituriyent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border border-emerald-500/30 bg-[#07090E] text-white rounded-2xl shadow-2xl">
        {/* Trustworthy Emerald/Blue Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-blue-950 border-b border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Users className="size-4" />
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[12px] tracking-wider uppercase border border-emerald-500/30">
              OTA-ONA RADARI & NAZORAT
            </Badge>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
            👨‍👩‍👦 Ota-Ona Radari & VIP To&apos;lov
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-zinc-300">
            Ota-onangizga nima bilan bandligingizni isbotlang va har yakshanba rasmiy hisobot yuboring (+100 🪙 bonus).
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* 1-Click Connection Block */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-zinc-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">
                1. Ota-onangizga shaxsiy havolangizni yuboring:
              </span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[12px] font-mono">
                +100 🪙 Tanga Sovg&apos;a
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 bg-black/60 border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 truncate select-all"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className="bg-white/10 hover:bg-white/15 text-white text-xs shrink-0 rounded-lg h-9"
              >
                {copied ? <Check className="size-3.5 mr-1 text-emerald-400" /> : <Copy className="size-3.5 mr-1" />}
                {copied ? "Nusxalandi" : "Nusxalash"}
              </Button>
              <Button
                size="sm"
                onClick={handleShareTelegram}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs shrink-0 rounded-lg h-9 px-3"
              >
                <Send className="size-3.5 mr-1" />
                Telegram
              </Button>
            </div>
          </div>

          {/* Live Telegram Message Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-sky-400" />
              Ota-onangiz har yakshanba soat 19:00 da oladigan hisobot ko&apos;rinishi:
            </span>

            <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-950/20 text-xs text-zinc-300 font-sans space-y-2 relative">
              <div className="flex items-center gap-2 text-sky-400 font-bold border-b border-sky-500/20 pb-2">
                <ShieldCheck className="size-4" />
                <span>IlmIldizi Rasmiy Ta&apos;lim Hisoboti</span>
              </div>
              <p className="leading-relaxed">
                Hurmatli ota-ona! Farzandingiz <strong>{studentName}</strong> ushbu haftada platformada <strong>5 soat 20 daqiqa</strong> ilmiy mashg&apos;ulot bajardi va <strong>240 ta</strong> BMB testini yechdi.
              </p>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1 font-mono text-[12px]">
                <p>📈 BMB Prognoz balli: <strong>158.2 ➡️ 169.4 ball (+11.2 ball o&apos;sish)</strong></p>
                <p>🏆 Eng yaxshi mavzu: <strong>Temuriylar davri (92%)</strong></p>
                <p>🔥 Uzluksiz seriya: <strong>30 kun ketma-ket darsda</strong></p>
              </div>
            </div>
          </div>

          {/* "Ota-onam to'lab bersin" VIP Paywall Invoice Button */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                VIP Obunaga mablag&apos; kerakmi?
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px]">
                92% ota-onalar qo&apos;llab-quvvatlaydi
              </Badge>
            </div>

            <p className="text-[12px] text-zinc-400 leading-relaxed">
              Tugmani bossangiz, Telegram orqali ota-onangizga shaxsiylashtirilgan taklif va 39,000 so&apos;mlik to&apos;lov havolasi boradi.
            </p>

            <Button
              onClick={handleSendInvoice}
              disabled={sendingInvoice}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:opacity-95 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer"
            >
              {sendingInvoice ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="size-4 mr-2" />
              )}
              👨‍👩‍👦 Ota-onamga to&apos;lov so&apos;rovini yuborish (39,000 so&apos;m)
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-white/[0.08] bg-zinc-950/40">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
