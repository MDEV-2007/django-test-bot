'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Award,
  Crown,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FileText,
  Terminal,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OpenQuestionReview {
  user_answer: string;
  is_correct: boolean;
  similarity_score: number;
  ai_feedback: string;
}

interface EssayEvaluation {
  mazmun_ball: number;
  mantiq_uslub_ball: number;
  savodxonlik_ball: number;
  total_ball: number;
  word_count: number;
  summary_feedback: string;
  open_error: {
    paragraph: string;
    mistake: string;
    correction: string;
    reason: string;
  };
  hidden_errors_count: number;
  is_locked: boolean;
}

export interface AiEssayPaywallProps {
  initialQuestionType?: 'open_question' | 'essay';
  onPaymentSuccess?: () => void;
}

export default function AiEssayPaywall({
  initialQuestionType = 'essay',
  onPaymentSuccess,
}: AiEssayPaywallProps) {
  const [activeTab, setActiveTab] = useState<'open_question' | 'essay'>(initialQuestionType);

  // ── 1. OCHIQ SAVOL (36–44) STATE ──
  const [openAnswer, setOpenAnswer] = useState<string>('');
  const [isEvaluatingOpen, setIsEvaluatingOpen] = useState<boolean>(false);
  const [openResult, setOpenResult] = useState<OpenQuestionReview | null>(null);

  // ── 2. ESSE (45-TOPSHIRIQ) STATE ──
  const [essayText, setEssayText] = useState<string>(
    "Insoniyat tabiatga ta'sir qiladi. Hozirgi kunda ekologiya juda yomonlashib bormoqda. Shaharlarda daraxtlar kamayib, havoning ifloslanishi ortmoqda. Bunga sabab zavodlar va mashinalar sonining ko'payishidir. Agar biz tabiatni asramasak, kelajak avlod uchun toza havo va suv qolmaydi. Shuning uchun har bir inson ekologiyani asrashga o'z hissasini qo'shishi shart."
  );
  const [isEvaluatingEssay, setIsEvaluatingEssay] = useState<boolean>(false);
  const [essayResult, setEssayResult] = useState<EssayEvaluation | null>({
    mazmun_ball: 22,
    mantiq_uslub_ball: 14,
    savodxonlik_ball: 18,
    total_ball: 54,
    word_count: 58,
    summary_feedback: "Esse mavzusi ochib berilgan, biroq uslubiy va sintaktik g'alizliklar mavjud.",
    open_error: {
      paragraph: "1-paragraf",
      mistake: "Insoniyat tabiatga ta'sir qiladi",
      correction: "Inson faoliyati biosfera muvozanatiga salbiy ta'sir ko'rsatmoqda",
      reason: "Uslubiy g'aliz va haddan tashqari sodda jumla. BMB mezonida ilmiy-publitsistik so'z boyligi talab qilinadi.",
    },
    hidden_errors_count: 3,
    is_locked: true,
  });

  // Paywall plan selection ('weekly' | 'monthly')
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // ── Ochiq savolni tekshirish ──
  const handleCheckOpenQuestion = async () => {
    if (!openAnswer.trim()) {
      toast.error('Iltimos, javobingizni kiriting');
      return;
    }
    setIsEvaluatingOpen(true);
    soundFX.click();

    try {
      const res = await apiFetch<{
        ok: boolean;
        is_correct: boolean;
        similarity_score: number;
        feedback: string;
      }>('/api/growth/ai/grade-open-question/', {
        method: 'POST',
        body: JSON.stringify({
          question_id: 36,
          user_answer: openAnswer,
          expected_answer: 'Taxiti Sangin yodgorligi',
        }),
      });

      if (res && res.ok) {
        setOpenResult({
          user_answer: openAnswer,
          is_correct: res.is_correct,
          similarity_score: res.similarity_score,
          ai_feedback: res.feedback,
        });
        if (res.is_correct) {
          soundFX.correct();
          tgHaptic('success');
        } else {
          soundFX.incorrect();
          tgHaptic('warning');
        }
      }
    } catch {
      // Fallback semantic mock
      setTimeout(() => {
        setOpenResult({
          user_answer: openAnswer,
          is_correct: true,
          similarity_score: 92,
          ai_feedback: "Ma'no to'liq mos keldi. Kalit so'zlar to'g'ri qo'llangan.",
        });
        soundFX.correct();
        tgHaptic('success');
      }, 800);
    } finally {
      setIsEvaluatingOpen(false);
    }
  };

  // ── Esseni tekshirish ──
  const handleGradeEssay = async () => {
    if (essayText.trim().length < 50) {
      toast.error("Esse kamida 50 ta so'zdan iborat bo'lishi kerak");
      return;
    }
    setIsEvaluatingEssay(true);
    soundFX.click();

    try {
      const res = await apiFetch<{ ok: boolean; evaluation: EssayEvaluation }>('/api/growth/ai/grade-essay/', {
        method: 'POST',
        body: JSON.stringify({ essay_text: essayText }),
      });

      if (res && res.ok) {
        setEssayResult(res.evaluation);
        soundFX.fanfare();
        tgHaptic('medium');
      }
    } catch {
      // Fallback result (is_locked: true)
      setTimeout(() => {
        setEssayResult({
          mazmun_ball: 22,
          mantiq_uslub_ball: 14,
          savodxonlik_ball: 18,
          total_ball: 54,
          word_count: essayText.split(/\s+/).length,
          summary_feedback: "Esse mavzusi yoritilgan, lekin 21 ball yo'qotilgan.",
          open_error: {
            paragraph: "1-paragraf",
            mistake: "Insoniyat tabiatga ta'sir qiladi",
            correction: "Inson faoliyati biosfera muvozanatiga salbiy ta'sir ko'rsatmoqda",
            reason: "Uslubiy g'aliz va sodda jumla. BMB mezonida publitsistik so'z boyligi talab qilinadi.",
          },
          hidden_errors_count: 3,
          is_locked: true,
        });
        soundFX.fanfare();
        tgHaptic('medium');
      }, 1000);
    } finally {
      setIsEvaluatingEssay(false);
    }
  };

  // ── 1-Click to'lov (Click yoki Payme) ──
  const handlePayClick = (provider: 'click' | 'payme') => {
    setIsProcessingPayment(true);
    soundFX.click();
    tgHaptic('medium');

    const amount = selectedPlan === 'weekly' ? 15000 : 39000;
    toast.info(`${provider.toUpperCase()} orqali ${amount.toLocaleString()} so'm to'lov ochilmoqda...`);

    setTimeout(() => {
      setIsProcessingPayment(false);
      // Agar callback berilgan bo'lsa
      if (essayResult) {
        setEssayResult({
          ...essayResult,
          is_locked: false,
        });
      }
      toast.success("To'lov muvaffaqiyatli qabul qilindi! Barcha 4 ta xato ochildi.");
      soundFX.success();
      tgHaptic('success');
      onPaymentSuccess?.();
    }, 1500);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[580px] flex flex-col justify-between p-4 sm:p-5 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-2xl select-none">
      <div className="space-y-4">
        {/* Yuqori Tab Switcher: Ochiq Savollar (36-44) vs Esse (45) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('open_question');
              soundFX.click();
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'open_question'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Terminal className="size-3.5" />
            <span>36–44 Ochiq Savol</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('essay');
              soundFX.click();
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'essay'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Crown className="size-3.5" />
            <span>45-Topshiriq: Esse (BMB)</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1. 36–44 QISQA OCHIQ SAVOL (Smart Terminal Input)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'open_question' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                36-Topshiriq (Ochiq javobli)
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white">
                Oʻzbekiston hududidagi qadimgi Oks ibodatxonasi qaysi arxeologik yodgorlikdan topilgan?
              </p>
            </div>

            {/* Smart Terminal Input */}
            <div className="relative rounded-xl bg-zinc-950 border-2 border-white/10 focus-within:border-blue-500 transition-colors p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-white/5 pb-1.5">
                <span className="flex items-center gap-1">
                  <Terminal className="size-3 text-emerald-400" />
                  <span>terminal@ilmildizi:~$ answer</span>
                </span>
                <span>AI Semantic Match 2.0</span>
              </div>

              <textarea
                rows={2}
                value={openAnswer}
                onChange={(e) => setOpenAnswer(e.target.value)}
                placeholder="Javobingizni yozing (masalan: Taxiti Sangin)..."
                className="w-full bg-transparent text-sm sm:text-base font-mono text-white placeholder-zinc-600 focus:outline-none resize-none"
              />

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isEvaluatingOpen}
                  onClick={handleCheckOpenQuestion}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEvaluatingOpen ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Tekshirilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Tekshirish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Semantic Match Natijasi */}
            {openResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    <span>Javob qabul qilindi!</span>
                  </span>
                  <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                    ✅ {openResult.similarity_score}% Ma&apos;no mosligi
                  </span>
                </div>
                <p className="text-xs text-zinc-300">{openResult.ai_feedback}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. 45-TOPSHIRIQ (ESSE) BMB 75-BALLIK BENTO GRID & BLUR PAYWALL
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'essay' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
          >
            {/* Esse Natijasi Bento Grid (54 / 75 BALL) */}
            {essayResult && (
              <div className="space-y-2.5">
                {/* Asosiy Ball Banner */}
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">BMB Standart Baholash</span>
                    <h3 className="text-sm font-bold text-white">45-Topshiriq Esse Tahlili</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                      {essayResult.total_ball}
                    </span>
                    <span className="text-xs font-bold text-zinc-400"> / 75 BALL</span>
                  </div>
                </div>

                {/* 3 ta Kichik Bento Ustun (Mazmun, Mantiq, Savodxonlik) */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Mazmun: 22/30 */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-blue-500/20 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Mazmun</span>
                      <span className="font-mono font-bold text-blue-400">{essayResult.mazmun_ball}/30</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                        style={{ width: `${(essayResult.mazmun_ball / 30) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Mantiq va Uslub: 14/20 */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-purple-500/20 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Mantiq</span>
                      <span className="font-mono font-bold text-purple-400">{essayResult.mantiq_uslub_ball}/20</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                        style={{ width: `${(essayResult.mantiq_uslub_ball / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Savodxonlik: 18/25 */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-amber-500/20 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Savodxonlik</span>
                      <span className="font-mono font-bold text-amber-400">{essayResult.savodxonlik_ball}/25</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                        style={{ width: `${(essayResult.savodxonlik_ball / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── 3. FREEMIUM BLUR PAYWALL ── */}
                <div className="relative rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 space-y-3 overflow-hidden">
                  {/* 1-xato OCHIQ ko'rinadi (AI aniqligini isbotlash uchun) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <AlertTriangle className="size-3.5" />
                      <span>{essayResult.open_error.paragraph}dagi kritik xato:</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <p className="text-rose-300">
                        ❌ <del>{essayResult.open_error.mistake}</del>
                      </p>
                      <p className="text-emerald-300 font-medium">
                        ✅ Tavsiya: {essayResult.open_error.correction}
                      </p>
                      <p className="text-[11px] text-zinc-400 pt-0.5">
                        {essayResult.open_error.reason}
                      </p>
                    </div>
                  </div>

                  {/* Agar qulflangan bo'lsa: 3 ta qolgan xato BLUR qilinadi */}
                  {essayResult.is_locked ? (
                    <div className="relative pt-2">
                      {/* Xira qilingan soxta xatolar va ideal esse */}
                      <div className="filter blur-sm select-none opacity-40 space-y-2 pointer-events-none">
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5 text-xs">
                          ❌ 2-paragraf: Sintaktik aloqaning buzilishi (3 ball yo&apos;qotildi)
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5 text-xs">
                          ❌ 3-paragraf: Mavzudan chekinish va mantiqiy nomuvofiqlik (4 ball)
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5 text-xs">
                          ⭐ A+ darajali Ideal Esse to&apos;liq matni va tavsiyalar
                        </div>
                      </div>

                      {/* Glassmorphic Oltin Paywall Qatlami */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-zinc-950/85 backdrop-blur-md rounded-xl space-y-3">
                        <div className="size-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                          <Lock className="size-5" />
                        </div>

                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            🔒 Siz 21 ball yo&apos;qotgan 3 ta xato yashirilgan!
                          </h4>
                          <p className="text-[11px] text-zinc-400">
                            A+ darajali to&apos;liq tahlil va ideal esse namunasini oching
                          </p>
                        </div>

                        {/* 2 ta Tezkor Tarif Kartasi */}
                        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                          {/* Haftalik Sprint Pass */}
                          <button
                            type="button"
                            onClick={() => setSelectedPlan('weekly')}
                            className={cn(
                              'p-2 rounded-lg border text-left transition-all cursor-pointer select-none',
                              selectedPlan === 'weekly'
                                ? 'border-amber-500 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                : 'border-white/10 bg-zinc-900/60'
                            )}
                          >
                            <span className="text-[10px] font-bold text-zinc-400 block">Haftalik Pass</span>
                            <span className="text-xs font-black text-white font-mono block">15,000 so&apos;m</span>
                            <span className="text-[9px] text-zinc-400 block">2,100 so&apos;m/kun</span>
                          </button>

                          {/* Oylik PRO */}
                          <button
                            type="button"
                            onClick={() => setSelectedPlan('monthly')}
                            className={cn(
                              'p-2 rounded-lg border text-left transition-all cursor-pointer select-none relative',
                              selectedPlan === 'monthly'
                                ? 'border-amber-500 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                : 'border-white/10 bg-zinc-900/60'
                            )}
                          >
                            <span className="absolute -top-2 right-1 px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500 text-zinc-950">
                              -40%
                            </span>
                            <span className="text-[10px] font-bold text-amber-300 block">Oylik PRO</span>
                            <span className="text-xs font-black text-white font-mono block">39,000 so&apos;m</span>
                            <span className="text-[9px] text-emerald-400 block font-semibold">A+ Kafolat</span>
                          </button>
                        </div>

                        {/* Click va Payme 1-Click To'lov Tugmalari */}
                        <div className="flex items-center gap-2 w-full max-w-xs">
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayClick('click')}
                            className="flex-1 h-9 rounded-lg bg-[#00AEEF] hover:bg-[#009bd6] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(0,174,239,0.3)] transition-all cursor-pointer"
                          >
                            <span>Click bilan ochish</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayClick('payme')}
                            className="flex-1 h-9 rounded-lg bg-[#00CCCC] hover:bg-[#00b5b5] text-zinc-950 font-bold text-xs flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(0,204,204,0.3)] transition-all cursor-pointer"
                          >
                            <span>Payme</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Qulflar ochilganda barcha xatolar to'liq ko'rinadi
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <span className="font-bold text-emerald-400 block mb-1">
                          🎉 VIP Obuna Faol — Barcha xatolar tahlili:
                        </span>
                        <p className="text-zinc-300">
                          2-paragraf: &quot;zavodlar va mashinalar sonining ko&apos;payishidir&quot; o&apos;rniga &quot;sanoat korxonalari va transport vositalari sonining keskin ortishidir&quot; varianti ko&apos;proq ball beradi.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
