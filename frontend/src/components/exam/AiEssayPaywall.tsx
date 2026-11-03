'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Crown,
  ArrowRight,
  Terminal,
  XCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OpenQuestionReview {
  is_correct: boolean;
  similarity_score: number;
  ai_feedback: string;
}

/* `/api/growth/essay/evaluate/` javobidagi `data` (growth/ai_grader.py evaluate_essay_bmb). */
interface EssayEvaluation {
  mazmun_ball: number;
  mantiq_uslub_ball: number;
  savodxonlik_ball: number;
  total_ball: number;
  word_count: number;
  summary_feedback: string;
  strengths: string[];
  weaknesses: string[];
  errors_list: { paragraph?: string; mistake?: string; correction?: string; reason?: string }[];
  total_errors_count?: number;
  is_locked: boolean;
}

export interface AiEssayPaywallProps {
  initialQuestionType?: 'open_question' | 'essay';
}

const MIN_ESSAY_WORDS = 30;

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/* Ochiq savol va esseni AI bilan tekshirish.

   Ilgari bu komponent o'quvchi hech narsa yozmasdan "54/75 ball" va "21 ball yo'qotgan
   3 ta xato yashirilgan" soxta natijasini ko'rsatardi, Click/Payme tugmalari esa hech
   qanday to'lovsiz 1.5s dan keyin "To'lov qabul qilindi" deb tahlilni ochardi. Endi
   faqat o'quvchi yozgan matnning haqiqiy bahosi ko'rsatiladi, to'lov — /premium orqali. */
export default function AiEssayPaywall({ initialQuestionType = 'essay' }: AiEssayPaywallProps) {
  const [activeTab, setActiveTab] = useState<'open_question' | 'essay'>(initialQuestionType);

  const [openAnswer, setOpenAnswer] = useState('');
  const [isEvaluatingOpen, setIsEvaluatingOpen] = useState(false);
  const [openResult, setOpenResult] = useState<OpenQuestionReview | null>(null);

  const [essayText, setEssayText] = useState('');
  const [isEvaluatingEssay, setIsEvaluatingEssay] = useState(false);
  const [essayResult, setEssayResult] = useState<EssayEvaluation | null>(null);

  const errorText = (e: unknown) =>
    e instanceof ApiError ? e.message : "Tekshiruvda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.";

  const handleCheckOpenQuestion = async () => {
    if (!openAnswer.trim()) {
      toast.error('Iltimos, javobingizni kiriting');
      return;
    }
    setIsEvaluatingOpen(true);
    soundFX.click();
    try {
      const res = await apiFetch<{ ok: boolean; data?: { is_correct: boolean; score_pct: number; feedback: string } }>(
        '/api/growth/open-question/evaluate/',
        {
          method: 'POST',
          body: JSON.stringify({ student_answer: openAnswer, reference_answer: 'Taxiti Sangin yodgorligi' }),
        },
      );
      if (res.ok && res.data) {
        setOpenResult({ is_correct: res.data.is_correct, similarity_score: res.data.score_pct, ai_feedback: res.data.feedback });
        if (res.data.is_correct) { soundFX.correct(); tgHaptic('success'); } else { soundFX.incorrect(); tgHaptic('warning'); }
      }
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setIsEvaluatingOpen(false);
    }
  };

  const handleGradeEssay = async () => {
    if (countWords(essayText) < MIN_ESSAY_WORDS) {
      toast.error(`Esse kamida ${MIN_ESSAY_WORDS} ta so'zdan iborat bo'lishi kerak`);
      return;
    }
    setIsEvaluatingEssay(true);
    soundFX.click();
    try {
      const res = await apiFetch<{ ok: boolean; data?: EssayEvaluation }>('/api/growth/essay/evaluate/', {
        method: 'POST',
        body: JSON.stringify({ essay_text: essayText, prompt_text: "Tabiat va insoniyat o'rtasidagi uyg'unlik" }),
      });
      if (res.ok && res.data) {
        setEssayResult(res.data);
        soundFX.fanfare();
        tgHaptic('medium');
      }
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setIsEvaluatingEssay(false);
    }
  };

  const tabClass = (active: boolean, activeTone: string) =>
    cn(
      'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
      active ? activeTone : 'text-zinc-400 hover:text-white',
    );

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col p-4 sm:p-5 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-white/10">
          <button
            type="button"
            onClick={() => { setActiveTab('open_question'); soundFX.click(); }}
            className={tabClass(activeTab === 'open_question', 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]')}
          >
            <Terminal className="size-3.5" />
            <span>36–44 Ochiq Savol</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('essay'); soundFX.click(); }}
            className={tabClass(activeTab === 'essay', 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]')}
          >
            <Crown className="size-3.5" />
            <span>45-Topshiriq: Esse</span>
          </button>
        </div>

        {activeTab === 'open_question' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">Namuna: ochiq javobli savol</span>
              <p className="text-xs sm:text-sm font-semibold text-white">
                Oʻzbekiston hududidagi qadimgi Oks ibodatxonasi qaysi arxeologik yodgorlikdan topilgan?
              </p>
            </div>

            <div className="relative rounded-xl bg-zinc-950 border-2 border-white/10 focus-within:border-blue-500 transition-colors p-3.5 space-y-2">
              <textarea
                rows={2}
                value={openAnswer}
                onChange={(e) => setOpenAnswer(e.target.value)}
                placeholder="Javobingizni yozing..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-zinc-600 focus:outline-none resize-none"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isEvaluatingOpen}
                  onClick={handleCheckOpenQuestion}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEvaluatingOpen ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span>{isEvaluatingOpen ? 'Tekshirilmoqda...' : 'Tekshirish'}</span>
                </button>
              </div>
            </div>

            {openResult && (
              <div
                className={cn(
                  'p-3.5 rounded-xl border space-y-1.5',
                  openResult.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30',
                )}
              >
                <div className={cn('flex items-center justify-between text-xs font-bold', openResult.is_correct ? 'text-emerald-400' : 'text-rose-400')}>
                  <span className="flex items-center gap-1.5">
                    {openResult.is_correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    <span>{openResult.is_correct ? "To'g'ri javob" : "Javob mos kelmadi"}</span>
                  </span>
                  <span className="font-mono text-[11px]">{openResult.similarity_score}% mos</span>
                </div>
                <p className="text-xs text-zinc-300">{openResult.ai_feedback}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'essay' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
            {!essayResult ? (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Mavzu</span>
                  <p className="text-xs sm:text-sm font-semibold text-white">Tabiat va insoniyat o&apos;rtasidagi uyg&apos;unlik</p>
                  <p className="text-[11px] text-zinc-400">
                    Essengizni yozing — AI uni 75 ballik mezon (mazmun, mantiq, savodxonlik) bo&apos;yicha baholaydi.
                  </p>
                </div>
                <textarea
                  rows={8}
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="Esse matni..."
                  className="w-full rounded-xl bg-zinc-950 border-2 border-white/10 focus:border-amber-500 p-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none resize-y"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {countWords(essayText)} so&apos;z (kamida {MIN_ESSAY_WORDS})
                  </span>
                  <button
                    type="button"
                    disabled={isEvaluatingEssay}
                    onClick={handleGradeEssay}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isEvaluatingEssay ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    <span>{isEvaluatingEssay ? 'Baholanmoqda...' : 'Esseni tekshirish'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">AI baholash ({essayResult.word_count} so&apos;z)</span>
                    <h3 className="text-sm font-bold text-white">Esse natijasi</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">{essayResult.total_ball}</span>
                    <span className="text-xs font-bold text-zinc-400"> / 75</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['Mazmun', essayResult.mazmun_ball, 30, 'bg-blue-500'],
                    ['Mantiq', essayResult.mantiq_uslub_ball, 20, 'bg-purple-500'],
                    ['Savodxonlik', essayResult.savodxonlik_ball, 25, 'bg-amber-500'],
                  ] as const).map(([label, value, max, bar]) => (
                    <div key={label} className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">{label}</span>
                        <span className="font-mono font-bold text-white">{value}/{max}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className={cn('h-full', bar)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-zinc-300 p-3 rounded-xl bg-zinc-950/60 border border-white/10">{essayResult.summary_feedback}</p>

                {(essayResult.strengths.length > 0 || essayResult.weaknesses.length > 0) && (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {essayResult.strengths.length > 0 && (
                      <ul className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-emerald-200 list-disc pl-6">
                        {essayResult.strengths.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    )}
                    {essayResult.weaknesses.length > 0 && (
                      <ul className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-rose-200 list-disc pl-6">
                        {essayResult.weaknesses.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {essayResult.is_locked ? (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
                      <Lock className="size-4" />
                      <span>
                        {essayResult.total_errors_count
                          ? `${essayResult.total_errors_count} ta xatoning batafsil tahlili PRO obunada`
                          : 'Batafsil xatolar tahlili PRO obunada'}
                      </span>
                    </div>
                    <Link
                      href="/premium"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-bold text-xs"
                    >
                      Tariflarni ko&apos;rish <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                ) : essayResult.errors_list.length > 0 ? (
                  <div className="space-y-2">
                    {essayResult.errors_list.map((err, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/10 text-xs space-y-1">
                        {err.paragraph && (
                          <div className="flex items-center gap-1.5 font-bold text-rose-400">
                            <AlertTriangle className="size-3.5" /> {err.paragraph}
                          </div>
                        )}
                        {err.mistake && <p className="text-rose-300">❌ <del>{err.mistake}</del></p>}
                        {err.correction && <p className="text-emerald-300">✅ {err.correction}</p>}
                        {err.reason && <p className="text-[11px] text-zinc-400">{err.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setEssayResult(null)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  ← Yangi esse yozish
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
