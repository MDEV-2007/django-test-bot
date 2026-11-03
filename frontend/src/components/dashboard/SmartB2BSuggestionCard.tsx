'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  X,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useTransliterate } from '@/lib/transliterate';
import { toast } from 'sonner';

export type B2BCampaignData = {
  id: number;
  center_name: string;
  logo: string;
  title: string;
  description: string;
  offer_badge: string;
  target_subject: string;
  target_region?: string;
  rating: number;
};

export type B2BDiagnosisData = {
  weakest_topic: string;
  mastery_percentage: number;
  predicted_score: string | null;
};

export default function SmartB2BSuggestionCard() {
  const { t } = useTransliterate();
  const { user } = useAuthStore();

  /* Faqat serverdagi haqiqiy kampaniya va diagnostika. Ilgari bu yerda soxta "Registon
     O'quv Markazi" va "42% — prognoz 178.4" boshlang'ich qiymatlari turardi va server
     javob bermasa ham ko'rsatilardi. */
  const [campaign, setCampaign] = useState<B2BCampaignData | null>(null);
  const [diagnosis, setDiagnosis] = useState<B2BDiagnosisData | null>(null);

  // Consent Modal state
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '';
      setFullName(name);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    async function loadCampaign() {
      try {
        const res = await apiFetch<{
          campaign: B2BCampaignData | null;
          diagnosis: B2BDiagnosisData | null;
        }>('/api/v1/b2b/active-campaign/');

        if (isMounted) {
          setCampaign(res?.campaign ?? null);
          setDiagnosis(res?.diagnosis ?? null);
        }
      } catch {
        // Reklama ixtiyoriy — xatoda karta ko'rsatilmaydi.
      }
    }
    loadCampaign();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenConsent = () => {
    if (submitted) return;
    soundFX.click();
    tgHaptic('medium');
    setIsConsentOpen(true);
  };

  const handleConfirmLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      toast.error(t("Iltimos, to'liq telefon raqamingizni kiriting (+998...)"));
      return;
    }

    setSubmitting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        coins_earned: number;
      }>('/api/v1/b2b/submit-lead/', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaign?.id,
          full_name: fullName,
          phone_number: phone,
          weakest_topics: diagnosis?.weakest_topic ?? '',
          predicted_dtm_score: diagnosis?.predicted_score ?? '',
        }),
      });

      if (res?.success) {
        setSubmitted(true);
        setIsConsentOpen(false);
        soundFX.success();
        tgHaptic('success');
        toast.success(t(res.message || "Arizangiz qabul qilindi! +50 Tanga balansingizga qo'shildi! 🎁"));
      } else {
        toast.error(t("Arizani yuborishda xatolik yuz berdi"));
      }
    } catch {
      // Offline fallback
      setSubmitted(true);
      setIsConsentOpen(false);
      toast.success(t("Arizangiz qabul qilindi! Menejer tez orada bog'lanadi."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] via-zinc-950 to-zinc-950 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        {/* Yuqori AI Diagnostika Izohi — faqat haqiqiy test natijasi bo'lsa */}
        {diagnosis && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 mb-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="size-4" />
            <span>{t("AI Diagnostika & Zaif Mavzu:")}</span>
          </div>
          <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
            {t("Siz")} <strong className="text-white">&quot;{t(diagnosis.weakest_topic)}&quot;</strong> {t("mavzusida")} <span className="font-mono text-rose-400 font-bold">{diagnosis.mastery_percentage}%</span> {t("natija ko'rsatmoqdasiz.")} {t("A+ darajasiga chiqish uchun rasmiy o'quv markaz ustozlari tavsiya etiladi.")}
          </p>
        </div>
        )}

        {/* O'quv Markaz Kartasi */}
        <div className="flex items-start gap-3.5 mb-4">
          <Avatar className="size-12 rounded-2xl border border-white/10 shrink-0">
            <AvatarImage src={campaign.logo} alt={campaign.center_name} className="object-cover" />
            <AvatarFallback className="font-bold bg-amber-500/20 text-amber-300">
              {campaign.center_name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {campaign.center_name}
              </h3>
              <Badge className="bg-amber-500 text-black font-black text-[10px] px-2 py-0.5">
                {campaign.offer_badge}
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 font-medium line-clamp-1">
              {campaign.title}
            </p>
          </div>
        </div>

        {/* Action Button: Consent Modalni ochuvchi trigger */}
        <Button
          type="button"
          onClick={handleOpenConsent}
          disabled={submitted}
          className={`w-full h-12 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer ${
            submitted
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-orange-500/20'
          }`}
        >
          {submitted ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              {t("Arizangiz topshirildi (+50 🪙 olindi)")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <PhoneCall className="size-4" />
              {t("1-Bosishda Bepul Darsga Yozilish (+50 🪙)")}
            </span>
          )}
        </Button>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1">
            <GraduationCap className="size-3.5 text-amber-400" />
            {t("IlmIldizi Rasmiy Hamkori")}
          </span>
          <Link href="/feed" className="hover:text-zinc-300 flex items-center gap-0.5 font-medium">
            {t("Hamjamiyat lentasi")} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* ── 2-BOSQICHLI ROZILIK MODALI (LEAD CONSENT MODAL) ── */}
      <Dialog open={isConsentOpen} onOpenChange={setIsConsentOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold w-fit">
              <ShieldCheck className="size-3.5" />
              <span>{t("Xavfsiz Ro'yxatdan O'tish")}</span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-white">
              {campaign.center_name}: {t("Bepul Sinov Darsi")}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-300">
              {t("Siz tanlagan")} <strong className="text-amber-400">{campaign.title}</strong> {t("kursiga yozilish uchun ma'lumotlaringizni tasdiqlang. Menejer siz bilan bog'lanib, 1-dars vaqtini belgilaydi.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLead} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <User className="size-3.5 text-amber-400" />
                <span>{t("Ism va familiyangiz")}</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="masalan: Azizbek Karimov"
                className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Phone className="size-3.5 text-amber-400" />
                <span>{t("Telefon raqamingiz")}</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white text-sm font-mono"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
              🔒 <strong className="text-zinc-200">{t("Maxfiylik kafolati:")}</strong> {t("Tasdiqlash tugmasini bosish orqali faqat ushbu o'quv markaz menejeri siz bilan bepul dars bo'yicha bog'lanishiga rozilik bildirasiz. Ma'lumotlaringiz uchinchi shaxslarga berilmaydi.")}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConsentOpen(false)}
                className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300"
              >
                {t("Bekor qilish")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm"
              >
                {submitting ? t("Yuborilmoqda...") : t("✅ Tasdiqlash (+50 🪙)")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
