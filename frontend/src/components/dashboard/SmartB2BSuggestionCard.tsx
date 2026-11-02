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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

export type B2BCampaignData = {
  id: number;
  center_name: string;
  logo: string;
  title: string;
  description: string;
  offer_badge: string;
  target_subject: string;
  rating: number;
};

export type B2BDiagnosisData = {
  weakest_topic: string;
  mastery_percentage: number;
  predicted_score: string;
  target_grade: string;
};

export default function SmartB2BSuggestionCard() {
  const [campaign, setCampaign] = useState<B2BCampaignData>({
    id: 1,
    center_name: "Registon O'quv Markazi",
    logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80",
    title: "Tarix va Ona tili intensiv DTM kursi",
    description: "2 oylik intensiv tayyorgarlik orqali qiyin mavzularda 90%+ natijaga erishing!",
    offer_badge: "1-dars BEPUL + 20% chegirma",
    target_subject: "Tarix",
    rating: 4.9,
  });

  const [diagnosis, setDiagnosis] = useState<B2BDiagnosisData>({
    weakest_topic: "Qadimiy dunyo (Rim/Yunoniston) sardorlari va janglari",
    mastery_percentage: 42,
    predicted_score: "178.4",
    target_grade: "A+ (175+ ball)",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCampaign() {
      try {
        const res = await apiFetch<{
          campaign: B2BCampaignData;
          diagnosis: B2BDiagnosisData;
        }>('/api/v1/b2b/active-campaign/');

        if (isMounted) {
          if (res?.campaign) setCampaign(res.campaign);
          if (res?.diagnosis) setDiagnosis(res.diagnosis);
        }
      } catch {
        // Fallback default mock
      }
    }
    loadCampaign();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleOneClickSubmit() {
    if (submitted || submitting) return;
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
          campaign_id: campaign.id,
          weakest_topics: diagnosis.weakest_topic,
          predicted_dtm_score: diagnosis.predicted_score,
        }),
      });

      setSubmitted(true);
      toast.success(res?.message || "Arizangiz qabul qilindi! +50 🪙 qo'shildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full rounded-[26px] border border-amber-500/20 bg-zinc-900/90 p-4 sm:p-5 shadow-sm relative overflow-hidden transition-colors hover:border-amber-500/35">
      {/* 1. Dynamic AI Diagnosis Notice (Toza va ko'zni toliqtirmaydigan qilib ishlangan) */}
      <div className="rounded-2xl bg-amber-500/8 border border-amber-500/20 p-3.5 mb-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Sparkles className="size-3 text-amber-400" />
            <span>AI Diagnostika</span>
          </span>
        </div>
        <p className="text-[12px] font-medium leading-relaxed text-zinc-300">
          Siz &ldquo;<b className="text-white">{diagnosis.weakest_topic}</b>&rdquo; mavzusida{' '}
          <span className="text-rose-400 font-bold font-mono">
            {diagnosis.mastery_percentage}%
          </span>{' '}
          natija ko&apos;rsatyapsiz. <span className="text-zinc-200 font-semibold">{diagnosis.target_grade}</span> darajasiga chiqish uchun rasmiy o&apos;quv markaz ustozlari tavsiya etiladi.
        </p>
      </div>

      {/* 2. Education Center & Course Card */}
      <div className="flex items-start gap-3 mb-3.5">
        <Avatar className="size-11 rounded-2xl border border-white/10 shrink-0">
          <AvatarImage src={campaign.logo} alt={campaign.center_name} className="object-cover" />
          <AvatarFallback className="bg-amber-500/20 text-amber-400 font-bold text-xs">
            {campaign.center_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs font-bold text-white truncate">
              {campaign.center_name}
            </span>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5">
              {campaign.offer_badge}
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-zinc-200 leading-snug line-clamp-1">
            {campaign.title}
          </h4>
        </div>
      </div>

      {/* 3. 1-Click Action Button (Miltillash/o'chib-yonishsiz barqaror tugma) */}
      <div className="mb-3">
        {!submitted ? (
          <Button
            type="button"
            onClick={handleOneClickSubmit}
            disabled={submitting}
            className="w-full h-11 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black rounded-2xl shadow-sm transition-all active:scale-[0.98] text-xs sm:text-[13px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneCall className="size-4 shrink-0" />
            <span>
              {submitting ? "Yuborilmoqda..." : "1-Bosishda Bepul Darsga Yozilish (+50 🪙)"}
            </span>
          </Button>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
              <CheckCircle2 className="size-4" />
              <span>Arizangiz muvaffaqiyatli yetkazildi!</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              <b>+50 🪙 Ilm Tanga</b> hisobingizga qo&apos;shildi. {campaign.center_name} tez orada siz bilan bog&apos;lanadi.
            </p>
          </motion.div>
        )}
      </div>

      {/* 4. Bottom Corner Link to Feed */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-zinc-400">
        <span className="flex items-center gap-1">
          <GraduationCap className="size-3.5 text-amber-500" />
          IlmIldizi Rasmiy Hamkori
        </span>
        <Link
          href="/feed"
          onClick={() => tgHaptic('select')}
          className="font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors"
        >
          <span>Hamjamiyat lentasi</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
