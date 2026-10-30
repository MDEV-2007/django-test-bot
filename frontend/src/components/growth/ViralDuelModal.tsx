'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Send,
  Zap,
  Flame,
  X,
  Copy,
  Check,
  Trophy,
  ShieldAlert,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ViralDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  userScore?: number;
  totalQuestions?: number;
  subjectName?: string;
  // Agar do'st sifatida link orqali kirgan bo'lsa
  isChallengerMode?: boolean;
  challengerName?: string;
  challengerAvatar?: string;
  challengerScore?: number;
  duelToken?: string;
  onAcceptDuel?: () => void;
}

export default function ViralDuelModal({
  isOpen,
  onClose,
  userScore = 80,
  totalQuestions = 10,
  subjectName = 'Tarix',
  isChallengerMode = false,
  challengerName = 'Murodulla',
  challengerAvatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=creator',
  challengerScore = 8,
  duelToken = '',
  onAcceptDuel,
}: ViralDuelModalProps) {
  const { user } = useAuthStore();
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  // 1-Click Telegram orqali ulashish
  const handleShareToTelegram = async () => {
    setIsGenerating(true);
    soundFX.click();
    tgHaptic('medium');

    try {
      const res = await apiFetch<{
        ok: boolean;
        duel_token: string;
        telegram_share_link: string;
        share_url: string;
      }>('/api/growth/arena/create-duel/', {
        method: 'POST',
        body: JSON.stringify({ score: userScore }),
      });

      if (res && res.ok) {
        if (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { openTelegramLink: (url: string) => void } } })?.Telegram?.WebApp?.openTelegramLink) {
          (window as unknown as { Telegram: { WebApp: { openTelegramLink: (url: string) => void } } }).Telegram.WebApp.openTelegramLink(res.telegram_share_link);
        } else {
          window.open(res.telegram_share_link, '_blank');
        }
      }
    } catch {
      // Fallback share link
      const fallbackUrl = `https://t.me/share/url?url=${encodeURIComponent(
        `https://t.me/ilmildizi_bot?startapp=duel_${Date.now()}`
      )}&text=${encodeURIComponent(
        `⚔️ Men IlmIldizi 1v1 Arenasida ${userScore} ball to'pladim! Meni yenga olasanmi? Duelga marhamat:`
      )}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    soundFX.click();
    tgHaptic('light');
    const shareLink = `https://t.me/ilmildizi_bot?startapp=duel_${duelToken || 'invite'}`;
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    toast.success('Havola nusxalandi!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAccept = () => {
    soundFX.click();
    tgHaptic('medium');
    onAcceptDuel?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090E]/80 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative w-full max-w-md rounded-2xl bg-zinc-900/90 border border-white/10 p-5 shadow-2xl space-y-5 overflow-hidden"
      >
        {/* Yopish tugmasi */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* ─────────────────────────────────────────────────────────────
            A. CHALLENGER LANDING SCREEN (Do'st link orqali kirganda)
           ───────────────────────────────────────────────────────────── */}
        {isChallengerMode ? (
          <div className="space-y-5 text-center py-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Swords className="size-3.5 text-rose-400" />
              <span>RASMIY DUEL CHAQIRIG&apos;I</span>
            </div>

            {/* Chaqiruvchi Avatari va Provokatsion Matn */}
            <div className="space-y-3">
              <div className="relative mx-auto size-20 rounded-2xl p-[2px] bg-gradient-to-tr from-orange-500 to-rose-600 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                <img
                  src={challengerAvatar}
                  alt={challengerName}
                  className="size-full rounded-2xl bg-zinc-950 object-cover"
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white shadow">
                  Chaqiruvchi
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {challengerName} sizni duelga chorladi!
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
                  &quot;{challengerName} <strong>{subjectName}</strong> fanidan {totalQuestions} tadan{' '}
                  <strong className="text-orange-400">{challengerScore} ta</strong> to&apos;g&apos;ri topdi va sizni
                  yenga olmaysiz deb hisoblaydi!&quot;
                </p>
              </div>
            </div>

            {/* Qoidalar & Mukofot */}
            <div className="grid grid-cols-2 gap-2 text-left p-3 rounded-xl bg-zinc-950/70 border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Savollar soni:</span>
                <p className="font-bold text-white">{totalQuestions} ta test</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">G&apos;olib mukofoti:</span>
                <p className="font-bold text-emerald-400">+50 XP • +25 🪙</p>
              </div>
            </div>

            {/* Sticky Mobile CTA: Qo'lqopni ko'tarish */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAccept}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-orange-500 via-rose-600 to-orange-500 hover:from-orange-400 hover:to-rose-500 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flame className="size-4.5 fill-white text-white" />
                <span>QO&apos;LQOPNI KO&apos;TARISH: Jangni Boshlash</span>
              </button>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              B. G'URUR KARTASI (Natija ekranidagi Duel Share Ticket UI)
             ───────────────────────────────────────────────────────────── */
          <div className="space-y-5 text-center py-2">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                1v1 VIRAL LOOP
              </span>
              <h3 className="text-lg font-bold text-white">Do&apos;stingizni Duelga Chorlang</h3>
              <p className="text-xs text-zinc-400">
                Natijangiz bilan faxrlaning va do&apos;stingizni bellashuvga chaqiring
              </p>
            </div>

            {/* "G'urur Bileti" (Ticket UI) */}
            <div className="relative p-4 rounded-xl bg-gradient-to-r from-blue-950/50 via-zinc-950 to-indigo-950/50 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                {/* Sizning kartangiz */}
                <div className="flex-1 text-left space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Siz</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'}
                      alt="Siz"
                      className="size-8 rounded-full border border-blue-400 object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[90px]">
                        {user?.first_name || user?.username || 'Murodulla'}
                      </p>
                      <p className="text-[11px] font-mono font-extrabold text-blue-400">
                        {userScore} ball
                      </p>
                    </div>
                  </div>
                </div>

                {/* Markazdagi VS */}
                <div className="size-8 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/30">
                  VS
                </div>

                {/* Bo'sh do'st silueti (?) */}
                <div className="flex-1 text-right space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Sinfdoshingiz</span>
                  <div className="flex items-center justify-end gap-2">
                    <div>
                      <p className="text-xs font-bold text-zinc-400">Raqib</p>
                      <p className="text-[11px] font-mono font-bold text-zinc-500">? / {totalQuestions}</p>
                    </div>
                    <div className="size-8 rounded-full border border-dashed border-white/20 bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                      ?
                    </div>
                  </div>
                </div>
              </div>

              {/* Bonus yorlig'i */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Har bir duel uchun bonus:</span>
                <span className="font-bold text-amber-400">+100 🪙 Tanga</span>
              </div>
            </div>

            {/* Telegram Ko'k Tugmasi */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleShareToTelegram}
                className="w-full h-12 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(42,171,238,0.4)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <Send className="size-4 fill-white" />
                <span>Do&apos;stni Telegramda Duelga Chorlash (+100 🪙)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Havola nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Duel Havolasini Nusxalash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

