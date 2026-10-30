'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Crown,
  Zap,
  ArrowRight,
  Send,
  BookOpen,
  FileText,
  CreditCard,
  Check,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── PART 1: 7-SAVOLLIK DOFAMIN ONBOARDING TYPES ───
interface BlitzQuestion {
  index: number;
  id: number;
  body: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  choices: { id: number; text: string; is_correct: boolean }[];
}

interface BlitzData {
  title: string;
  total_questions: number;
  questions: BlitzQuestion[];
  tramplin_bonus: {
    badge: string;
    reward_coins: number;
    next_step_route: string;
    cta_text: string;
  };
}

// ─── PART 2: AI ESSE EVALUATION TYPES ───
interface ErrorItem {
  original_text: string;
  suggested_fix: string;
  error_type: string;
  explanation: string;
}

interface EssayEvaluationData {
  mazmun_ball: number;
  mantiq_uslub_ball: number;
  savodxonlik_ball: number;
  total_ball: number;
  word_count: number;
  summary_feedback: string;
  strengths: string[];
  weaknesses: string[];
  errors_list: ErrorItem[];
  total_errors_count: number;
  is_locked: boolean;
  paywall_message?: string;
}

interface AiEssayPaywallProps {
  mode?: 'onboarding' | 'essay';
  defaultPrompt?: string;
  onComplete?: () => void;
}

export default function AiEssayPaywall({
  mode = 'essay',
  defaultPrompt = "Ona tili va adabiyot 45-topshiriq: 'Kitob mutolaasi va shaxsiy rivojlanish' mavzusida 100-150 so'zdan iborat esse yozing.",
  onComplete,
}: AiEssayPaywallProps) {
  // ─── ONBOARDING BLITZ STATE ───
  const [blitzData, setBlitzData] = useState<BlitzData | null>(null);
  const [blitzIndex, setBlitzIndex] = useState<number>(0);
  const [blitzScore, setBlitzScore] = useState<number>(0);
  const [blitzSelectedId, setBlitzSelectedId] = useState<number | null>(null);
  const [blitzIsAnswered, setBlitzIsAnswered] = useState<boolean>(false);
  const [blitzFinished, setBlitzFinished] = useState<boolean>(false);
  const [loadingBlitz, setLoadingBlitz] = useState<boolean>(mode === 'onboarding');

  // ─── ESSAY STATE ───
  const [promptText, setPromptText] = useState<string>(defaultPrompt);
  const [essayText, setEssayText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [essayResult, setEssayResult] = useState<EssayEvaluationData | null>(null);
  const [showVipModal, setShowVipModal] = useState<boolean>(false);

  // 1. Onboarding blitz yuklash
  useEffect(() => {
    if (mode === 'onboarding') {
      apiFetch<BlitzData>('/api/growth/onboarding-blitz/')
        .then((res) => {
          if (res && res.questions) {
            setBlitzData(res);
          }
        })
        .finally(() => setLoadingBlitz(false));
    }
  }, [mode]);

  // Onboarding savol tanlash
  const handleSelectBlitzChoice = (choice: { id: number; text: string; is_correct: boolean }) => {
    if (blitzIsAnswered) return;
    setBlitzIsAnswered(true);
    setBlitzSelectedId(choice.id);

    if (choice.is_correct) {
      soundFX.correct();
      tgHaptic('success');
      setBlitzScore((prev) => prev + 1);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
    }

    setTimeout(() => {
      if (blitzData && blitzIndex + 1 < blitzData.questions.length) {
        setBlitzIndex((prev) => prev + 1);
        setBlitzSelectedId(null);
        setBlitzIsAnswered(false);
      } else {
        setBlitzFinished(true);
        celebrate();
        soundFX.fanfare();
      }
    }, 1200);
  };

  // 2. Esse baholash yuborish
  const handleEvaluateEssay = async () => {
    if (!essayText.trim()) {
      toast.error("Iltimos, esse matnini yozing.");
      return;
    }
    const words = essayText.trim().split(/\s+/).length;
    if (words < 25) {
      toast.warning("Esse kamida 30 ta so'zdan iborat bo'lishi kerak.");
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await apiFetch<{ ok: boolean; data: EssayEvaluationData }>('/api/growth/essay/evaluate/', {
        method: 'POST',
        body: JSON.stringify({
          prompt_text: promptText,
          essay_text: essayText,
        }),
      });

      if (res && res.ok) {
        setEssayResult(res.data);
        if (res.data.is_locked) {
          soundFX.click();
        } else {
          celebrate();
          soundFX.fanfare();
        }
      }
    } catch {
      toast.error("Esseni baholashda xatolik yuz berdi.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  // ─── RENDER: 7-SAVOLLIK DOFAMIN BLITZ ───
  if (mode === 'onboarding') {
    if (loadingBlitz) {
      return (
        <div className="w-full max-w-lg mx-auto p-8 text-center space-y-4">
          <Sparkles className="size-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">7-savollik Dofamin Blitz tayyorlanmoqda...</p>
        </div>
      );
    }

    if (blitzFinished && blitzData) {
      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-card rounded-[32px] border border-border shadow-2xl text-center space-y-6"
        >
          <div className="size-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
            <Award className="size-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1">
              🎉 Dastlabki Diagnostika Yakunlandi
            </Badge>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Sizda Milliy Sertifikat B+ (164.5 ball) potensiali aniqlandi!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              7 tadan {blitzScore} tasini to&apos;g&apos;ri yechdingiz. A darajaga chiqish uchun faqat zaif mavzudagi 1 ta teshikni yopish qoldi.
            </p>
          </div>

          {/* 1-bosqichdan 2-bosqichga O'tish Tramplini */}
          <div className="pt-2">
            <Button
              asChild
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Link href="/sprint">
                <span>{blitzData.tramplin_bonus.cta_text}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      );
    }

    const currentQ = blitzData?.questions[blitzIndex];

    return (
      <div className="w-full max-w-lg mx-auto p-4 sm:p-6 bg-card rounded-[32px] border border-border shadow-xl space-y-5 select-none">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="text-primary font-bold">{currentQ?.topic}</span>
            <span className="font-mono">
              {blitzIndex + 1} / {blitzData?.total_questions || 7}
            </span>
          </div>
          <Progress value={((blitzIndex + 1) / (blitzData?.total_questions || 7)) * 100} className="h-2 rounded-full" />
        </div>

        {/* Savol matni */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80">
          <p
            className="text-sm sm:text-base font-bold leading-relaxed"
            dangerouslySetInnerHTML={{ __html: currentQ?.body || '' }}
          />
        </div>

        {/* Variantlar */}
        <div className="space-y-2.5">
          {currentQ?.choices.map((choice, idx) => {
            const isSelected = blitzSelectedId === choice.id;
            let style = 'border-border/80 bg-card hover:border-primary/40';

            if (blitzIsAnswered) {
              if (choice.is_correct) {
                style = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold';
              } else if (isSelected) {
                style = 'border-rose-500 bg-rose-500/15 text-rose-600 font-bold';
              } else {
                style = 'opacity-40 border-border/40';
              }
            }

            return (
              <button
                key={choice.id}
                disabled={blitzIsAnswered}
                onClick={() => handleSelectBlitzChoice(choice)}
                className={cn(
                  'w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-98',
                  style
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="size-6.5 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium">{choice.text}</span>
                </div>
                {blitzIsAnswered && choice.is_correct && <CheckCircle2 className="size-4.5 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── RENDER: 45-TOPSHIRIQ AI ESSE BAHOLAGICH & BLUR PAYWALL ───
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Esse matn kiritish kartasi */}
      <Card className="rounded-[28px] border-border shadow-lg overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
              <FileText className="size-4" />
              <span>45-Topshiriq: Rasmiy Esse (75 Ball)</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {wordCount} ta so&apos;z
            </Badge>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs sm:text-sm font-semibold text-foreground">
            {promptText}
          </div>

          <textarea
            rows={7}
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="Esse matnini shu yerga yozing yoki nusxa ko'chirib qo'ying (kamida 80-100 so'z)..."
            className="w-full p-4 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-none"
          />

          <Button
            disabled={isEvaluating || wordCount < 20}
            onClick={handleEvaluateEssay}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            {isEvaluating ? (
              <Sparkles className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" />
                <span>BMB 75 Ballik Mezonida Tekshirish</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ─── TAHLIL VA BLUR PAYWALL NATIJASI ─── */}
      {essayResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[32px] border border-border bg-card p-6 shadow-2xl space-y-6 overflow-hidden"
        >
          {/* Umumiy Natija Barometri */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 border border-border">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Umumiy Natija</p>
              <h3 className="text-3xl font-black text-foreground font-mono">
                {essayResult.total_ball} <span className="text-sm font-normal text-muted-foreground">/ 75 ball</span>
              </h3>
            </div>

            {/* 3 ta BMB Mezonlari */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-center">
                <span className="text-[10px] text-muted-foreground block font-bold">Mazmun (30)</span>
                <span className="font-mono font-bold text-sm text-emerald-500">{essayResult.mazmun_ball}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-center">
                <span className="text-[10px] text-muted-foreground block font-bold">Mantiq (20)</span>
                <span className="font-mono font-bold text-sm text-blue-500">{essayResult.mantiq_uslub_ball}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-center">
                <span className="text-[10px] text-muted-foreground block font-bold">Savodxonlik (25)</span>
                <span className="font-mono font-bold text-sm text-amber-500">{essayResult.savodxonlik_ball}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{essayResult.summary_feedback}</p>

          {/* ─── XATOLAR TAHLILI YOKI BLUR PAYWALL ─── */}
          <div className="relative">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Xatolar va Qoidalar Tahlili ({essayResult.total_errors_count} ta aniqlandi)
            </h4>

            {essayResult.is_locked ? (
              // BLURRED PAYWALL OVERLAY
              <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 p-6 min-h-[220px] flex flex-col items-center justify-center text-center">
                {/* Orqa fondagi xiralashtirilgan matn */}
                <div className="absolute inset-0 p-4 filter blur-sm opacity-40 select-none pointer-events-none space-y-2 text-left">
                  <div className="h-4 bg-muted-foreground/30 rounded w-3/4" />
                  <div className="h-4 bg-rose-500/30 rounded w-full" />
                  <div className="h-4 bg-emerald-500/30 rounded w-5/6" />
                  <div className="h-4 bg-muted-foreground/30 rounded w-2/3" />
                </div>

                {/* Markaziy VIP Paywall Kartasi */}
                <div className="relative z-10 max-w-md space-y-3 p-4">
                  <div className="size-12 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/25">
                    <Lock className="size-6" />
                  </div>
                  <h5 className="text-base font-black text-foreground">
                    Xatolar tahlili VIP rejimda ochiq
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Essengizdagi <b>{essayResult.total_errors_count} ta imlo va punktuatsiya xatolarini</b>, to&apos;g&apos;ri variantlarini ko&apos;rish va yo&apos;qotilgan ballarni qaytarish uchun VIP rejimni yoqing.
                  </p>
                  <Button
                    onClick={() => setShowVipModal(true)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/25 cursor-pointer"
                  >
                    <Crown className="size-4" />
                    <span>VIP Rejimni Faollashtirish (15,000 so&apos;m)</span>
                  </Button>
                </div>
              </div>
            ) : (
              // OCHIQ XATOLAR RO'YXATI (VIP)
              <div className="space-y-2.5">
                {essayResult.errors_list.map((err, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-500 line-through">&ldquo;{err.original_text}&rdquo;</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-bold text-emerald-500">&ldquo;{err.suggested_fix}&rdquo;</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">
                        {err.error_type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{err.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── VIP TARIFF TANLASH MODALI (CLICK / PAYME) ─── */}
      <AnimatePresence>
        {showVipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md bg-card rounded-[32px] border border-border p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500 font-extrabold text-sm uppercase">
                  <Crown className="size-5" />
                  <span>IlmIldizi VIP Obuna</span>
                </div>
                <button
                  onClick={() => setShowVipModal(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tarif kartalari */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border-2 border-border hover:border-primary/50 text-left space-y-1 cursor-pointer">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Haftalik</span>
                  <p className="text-lg font-black font-mono">15,000 so&apos;m</p>
                  <p className="text-[10px] text-muted-foreground">Cheksiz Esse va AI Mentor</p>
                </div>
                <div className="p-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 text-left space-y-1 cursor-pointer relative overflow-hidden">
                  <span className="absolute top-1 right-2 text-[8px] font-black text-amber-600 uppercase">Tejamkor</span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Oylik</span>
                  <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">39,000 so&apos;m</p>
                  <p className="text-[10px] text-muted-foreground">To&apos;liq BMB bazasi</p>
                </div>
              </div>

              {/* To'lov tugmalari */}
              <div className="space-y-2 pt-2">
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-[#00A3FF] hover:bg-[#0091E6] text-white font-bold text-xs gap-2"
                >
                  <Link href="/premium">
                    <CreditCard className="size-4" />
                    <span>Click yoki Payme orqali to&apos;lash</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowVipModal(false)}
                  className="w-full text-xs text-muted-foreground"
                >
                  Keyinroq
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
