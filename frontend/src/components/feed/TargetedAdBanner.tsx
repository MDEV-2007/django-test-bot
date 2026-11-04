'use client';

import React, { useRef, useState } from 'react';
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
import { trackAd, useAdImpression } from '@/lib/adTracking';

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
  subject?: string;
  is_sponsored?: boolean;
  sponsored_label?: string;
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
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  useAdImpression(bannerRef, offer.id);

  function handleOpenModal() {
    tgHaptic('medium');
    trackAd(offer.id, 'click');
    setModalOpen(true);
  }

  async function handleSubmitLead() {
    if (!phone || phone.trim().length < 9) {
      toast.error("Iltimos, telefon raqamingizni to'liq kiriting!");
      return;
    }
    if (!guardianConfirmed) {
      toast.error("18 yoshdan kattaligingizni yoki ota-onangiz roziligi borligini tasdiqlang.");
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
            // Tasdiqlash tugmasi — ma'lumotni markazga yuborishga aniq rozilik.
            // Zaif mavzu va ball serverda haqiqiy natijalardan olinadi.
            consent: true,
            guardian_confirmed: guardianConfirmed,
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
      {/* Native Ad Banner — "Reklama" deb aniq belgilangan; oltin fon — ko'zga tashlanadi */}
      <div
        ref={bannerRef}
        className={cn(
          'ps-gold-card relative isolate w-full overflow-hidden rounded-[28px] p-5 text-[#2A1A00] sm:p-6 md:p-7',
          className
        )}
      >
        {/* Dekor: yaltiroq chiziq, oq doira, punktir halqa */}
        <span aria-hidden className="ps-gold-shine pointer-events-none absolute inset-0 -z-10" />
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 -z-10 size-48 rounded-full bg-white/30" />
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-4 -z-10 size-20 rounded-full border-2 border-dashed border-[#2A1A00]/25" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 -z-10 size-40 rounded-full bg-[#F0523D]/15" />

        <div className="relative space-y-4">
          {/* Yuqori belgilar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#2A1A00]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                {offer.sponsored_label || 'Reklama'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#080808] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFD36B]">
                <Sparkles className="size-3" />
                {offer.badge_text || 'Homiylik taklifi'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-1 text-xs font-bold">
                <Building2 className="size-3.5 shrink-0" />
                {offer.center_name}
              </span>
            </div>
            <span className="hidden items-center gap-1 text-[12px] font-semibold text-[#2A1A00]/65 sm:inline-flex">
              <ShieldCheck className="size-3.5" />
              Homiy kontent
            </span>
          </div>

          {/* Sarlavha va tavsif */}
          <div className="space-y-2">
            <h3 className="text-[24px] font-bold leading-tight tracking-[-0.03em] sm:text-[30px] [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">
              {offer.title}
            </h3>
            <p className="max-w-2xl text-[13px] leading-relaxed text-[#2A1A00]/75 sm:text-sm">
              {offer.description}
            </p>
          </div>

          {/* Pastki qator: afzalliklar + CTA */}
          <div className="flex flex-col justify-between gap-3 border-t border-[#2A1A00]/12 pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">🎁 1-dars bepul</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F0523D] px-3 py-1 text-white">🏷️ 20% chegirma</span>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="group inline-flex min-h-12 w-full shrink-0 cursor-pointer items-center justify-between gap-3 rounded-full bg-[#080808] py-1.5 pl-5 pr-1.5 text-[13px] font-bold text-[#FFFCF7] shadow-[0_14px_28px_-14px_rgba(8,8,8,0.8)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <PhoneCall className="size-4 shrink-0 text-[#FFD36B]" />
                <span>{(offer.cta_text || "1-bosishda ro'yxatdan o'tish (1-dars BEPUL)").replace(/^[📞\s]+/, '').trim()}</span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFB82E] text-[#080808] transition-transform group-hover:-rotate-45">
                <ChevronRight className="size-4" />
              </span>
            </button>
          </div>
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
              className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/15 p-5 sm:p-6 shadow-2xl overflow-hidden"
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
                    <div className="size-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Building2 className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{offer.center_name}</h4>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[12px]">
                        1-dars BEPUL • Rasmiy Hamkor
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
                    Tasdiqlasangiz, ismingiz, telefon raqamingiz va zaif mavzuingiz shu o&apos;quv markazga yuboriladi va markaz siz bilan bog&apos;lanadi. Ma&apos;lumotlar faqat sizning roziligingiz bilan uzatiladi.
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
                      <label className="mb-3 flex items-start gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={guardianConfirmed}
                          onChange={(e) => setGuardianConfirmed(e.target.checked)}
                          className="mt-0.5 size-4 accent-amber-500"
                        />
                        <span>Men 18 yoshdan kattaman yoki ota-onam (vasiyim) roziligi bor.</span>
                      </label>
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
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-2xl text-sm transition-transform active:scale-95"
                  >
                    {submitting ? "Yuborilmoqda..." : "📞 1-bosishda ariza topshirish"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
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
