'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, Sparkles, Building2, CheckCircle2, ChevronRight, X, Coins, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

export type TargetedOfferData = {
  id: number;
  center_id: number;
  center_name: string;
  center_logo?: string;
  center_phone?: string;
  title: string;
  description: string;
  cta_text: string;
  badge_text: string;
  banner_url?: string;
  video_url?: string;
  score_received?: number;
  subject?: string;
};

interface TargetedAdBannerProps {
  offer: TargetedOfferData;
  weakTopics?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function TargetedAdBanner({
  offer,
  weakTopics = '',
  onSuccess,
  className,
}: TargetedAdBannerProps) {
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState(user?.first_name || user?.username || '');
  const [phone, setPhone] = useState('+998 ');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleOpenModal() {
    tgHaptic('medium');
    setModalOpen(true);
  }

  async function handleSubmitLead() {
    if (!phone || phone.trim().length < 9) {
      toast.error("Iltimos, telefon raqamingizni to'liq kiriting!");
      return;
    }
    setSubmitting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        '/api/v1/system/ads/lead-submit/',
        {
          method: 'POST',
          body: JSON.stringify({
            campaign_id: offer.id,
            name: name.trim(),
            phone: phone.trim(),
            subject: offer.subject || 'Umumiy',
            score: offer.score_received || 0,
            weak_topics: weakTopics,
          }),
        }
      );

      setSubmitted(true);
      toast.success(res.message);
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Arizani yuborishda xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Native Ad Banner */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-900 to-[#0A0C12] p-5 sm:p-6 shadow-2xl backdrop-blur-xl',
          className
        )}
      >
        {/* Glow corner */}
        <div className="absolute -top-16 -right-16 size-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-bold uppercase tracking-wide">
                <Sparkles className="size-3 mr-1" />
                {offer.badge_text || "Homiylik Taklifi"}
              </Badge>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Building2 className="size-3.5 text-zinc-400" />
                {offer.center_name}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              {offer.title}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {offer.description}
            </p>
          </div>

          <Button
            onClick={handleOpenModal}
            className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <PhoneCall className="size-4" />
            <span>{offer.cta_text || "1-bosishda yozilish"}</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* 1-Click Lead Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/15 p-6 shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>

              {!submitted ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Building2 className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{offer.center_name}</h4>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        1-dars BEPUL • Rasmiy Hamkor
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white mb-2 leading-tight">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
                    Telefon raqamingizni qoldiring. O'quv markaz siz bilan 10 daqiqada bog'lanadi va IlmIldizi uchun ajratilgan 20% chegirmani faollashtiradi!
                  </p>

                  <div className="space-y-3.5 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Ismingiz:
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ismingizni kiriting"
                        className="bg-zinc-800/80 border-white/10 text-white rounded-xl h-11"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Telefon raqamingiz:
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        type="tel"
                        className="bg-zinc-800/80 border-white/10 text-white font-mono rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 mb-5 text-amber-300 text-xs">
                    <Coins className="size-4 shrink-0 text-amber-400" />
                    <span>Ro'yxatdan o'tganingiz uchun sizga darhol <b>+20 🪙 Ilm Tanga</b> sovg'a qilinadi!</span>
                  </div>

                  <Button
                    onClick={handleSubmitLead}
                    disabled={submitting}
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black rounded-2xl text-sm transition-transform active:scale-95"
                  >
                    {submitting ? "Yuborilmoqda..." : "📞 1-bosishda ariza topshirish"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    Arizangiz qabul qilindi! 🎉
                  </h3>
                  <p className="text-sm text-zinc-300 max-w-sm mx-auto">
                    <b>{offer.center_name}</b> mutaxassisi tez orada siz bilan bog'lanib, bepul dars va chegirmangizni taqdim etadi. Hisobingizga <b>+20 🪙 Ilm Tanga</b> qo'shildi!
                  </p>
                  <Button
                    onClick={() => setModalOpen(false)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl h-11 mt-4"
                  >
                    Tushundim
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
