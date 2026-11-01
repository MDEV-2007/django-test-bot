'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Building2,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Coins,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

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
  const { user } = useAuthStore();
  const [campaign, setCampaign] = useState<B2BCampaignData>({
    id: 1,
    center_name: "Registon O'quv Markazi",
    logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80",
    title: "Tarix va Ona tili intensiv DTM kursi",
    description: "2 oylik intensiv tayyorgarlik orqali qiyin mavzularda 90%+ natijaga erishing!",
    offer_badge: "⭐ 4.9 • 🎁 1-dars BEPUL",
    target_subject: "Tarix",
    rating: 4.9,
  });

  const [diagnosis, setDiagnosis] = useState<B2BDiagnosisData>({
    weakest_topic: "XIX asr xonliklari davri",
    mastery_percentage: 42,
    predicted_score: "178.4",
    target_grade: "A+ (175+ ball)",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const res = await apiFetch<{
          campaign: B2BCampaignData;
          diagnosis: B2BDiagnosisData;
        }>('/api/v1/b2b/active-campaign/');

        if (res && res.campaign) {
          setCampaign(res.campaign);
        }
        if (res && res.diagnosis) {
          setDiagnosis(res.diagnosis);
        }
      } catch {
        // Fallback default mock
      }
    }
    loadCampaign();
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
      toast.success(res.message || "Arizangiz qabul qilindi! +50 🪙 qo'shildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full rounded-[26px] border border-amber-500/25 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] via-card to-background p-4 sm:p-5 shadow-lg backdrop-blur-xl relative overflow-hidden transition-all hover:border-amber-500/40">
      {/* Decorative ambient corner glow */}
      <div className="absolute -top-12 -right-12 size-32 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Dynamic AI Diagnosis Notice */}
      <div className="rounded-2xl bg-amber-500/12 dark:bg-amber-500/15 border border-amber-500/25 p-3 mb-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium leading-relaxed text-foreground">
            <strong className="text-amber-600 dark:text-amber-400 font-bold block mb-0.5">
              🎯 AI Diagnostika:
            </strong>
            Siz &ldquo;<b>{diagnosis.weakest_topic}</b>&rdquo; mavzusida{' '}
            <span className="text-red-600 dark:text-red-400 font-bold">
              {diagnosis.mastery_percentage}%
            </span>{' '}
            natija ko&apos;rsatyapsiz. {diagnosis.target_grade} darajasiga chiqish uchun rasmiy
            o&apos;quv markaz ustozlari tavsiya etiladi.
          </p>
        </div>
      </div>

      {/* 2. Education Center & Course Card */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="size-12 rounded-2xl border border-border shadow-xs shrink-0">
          <AvatarImage src={campaign.logo} alt={campaign.center_name} className="object-cover" />
          <AvatarFallback className="bg-amber-500/20 text-amber-600 font-bold text-xs">
            {campaign.center_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs font-bold text-foreground truncate">
              {campaign.center_name}
            </span>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2">
              {campaign.offer_badge}
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
            {campaign.title}
          </h4>
        </div>
      </div>

      {/* 3. 1-Click Action Button with Animated Transition */}
      <div className="mb-3">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="submit-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                onClick={handleOneClickSubmit}
                disabled={submitting}
                className="w-full h-11 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold rounded-2xl shadow-md shadow-amber-500/25 transition-all active:scale-[0.98] text-xs sm:text-[13px] flex items-center justify-center gap-2"
              >
                <PhoneCall className="size-4 shrink-0" />
                <span>
                  {submitting ? "Yuborilmoqda..." : "📞 1-Bosishda Bepul Darsga Yozilish (+50 🪙)"}
                </span>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="success-box"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 className="size-4" />
                <span>Arizangiz muvaffaqiyatli yetkazildi!</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                <b>+50 🪙 Ilm Tanga</b> hisobingizga qo&apos;shildi. {campaign.center_name} tez orada siz bilan bog&apos;lanadi.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Corner Link to Feed */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
        <span className="flex items-center gap-1">
          <GraduationCap className="size-3.5 text-amber-500" />
          IlmIldizi Rasmiy Hamkori
        </span>
        <Link
          href="/feed"
          onClick={() => tgHaptic('select')}
          className="font-bold text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          <span>Hamjamiyat lentasi</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
