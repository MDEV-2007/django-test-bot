'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RotateCcw, CheckCircle2, XCircle, ArrowRight, Flame,
  PartyPopper, AlertTriangle, Brain, Sparkles, BookOpen,
  Zap, Trophy, Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import AppShell from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ContinuousLoopController from '@/components/loop/ContinuousLoopController';

type DeckItem = {
  item_id: number;
  question_id: number;
  body: string;
  type: string;
  explanation: string;
  image: string;
  topic: string;
  times_wrong: number;
  choices: { id: number; text: string }[];
  answer_mode: 'choice' | 'text';
};

type RevisionData = {
  deck: DeckItem[];
  active_count: number;
  total: number;
  mastered_count: number;
  subjects: { id: number; name: string; slug: string }[];
  selected_subject: string;
  topics: { id: number; title: string; count: number }[];
};

type CheckResult = {
  ok: boolean;
  correct: boolean;
  mastered: boolean;
  correct_choice_id: number | null;
  explanation: string;
  correct_answer: string;
};

export default function MistakesPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<RevisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [openLoopModal, setOpenLoopModal] = useState(false);

  useEffect(() => {
    if (!access) return;
    setLoading(true);
    apiFetch<RevisionData>('/api/tests/revision/')
      .then((d) => {
        setData(d);
        setIdx(0);
        setResult(null);
        setSelectedChoice(null);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"))
      .finally(() => setLoading(false));
  }, [access]);

  async function checkChoice(choiceId: number) {
    if (!data?.deck[idx] || result) return;
    setSelectedChoice(choiceId);
    const item = data.deck[idx];
    try {
      const res = await apiFetch<CheckResult>(`/api/tests/revision/${item.item_id}/check/`, {
        method: 'POST',
        body: JSON.stringify({ choice_id: choiceId }),
      });
      setResult(res);
      if (res.correct) {
        soundFX.correct();
        tgHaptic('light');
        setCombo((c) => c + 1);
        toast.success("To'g'ri javob! Xato muvaffaqiyatli tuzatildi! 🔥");
      } else {
        soundFX.incorrect();
        tgHaptic('medium');
        setCombo(0);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Xatolik yuz berdi');
    }
  }

  function handleNext() {
    tgHaptic('light');
    if (!data) return;
    if (idx < data.deck.length - 1) {
      setIdx((i) => i + 1);
      setResult(null);
      setSelectedChoice(null);
    } else {
      toast.success("Barcha xatolar ko'rib chiqildi! 🎉");
    }
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-20 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {/* Yuqori Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-rose-950/70 via-zinc-900 to-orange-950/50 border border-rose-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
                <Brain className="size-3.5" />
                <span>Aqlli Xatolar Banki & Qasos Rejimi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Xatolarni Tozalash va Mustahkamlash 🎯
              </h1>
              <p className="text-sm text-zinc-300 max-w-xl leading-relaxed">
                Avvalgi test va sprintlarda adashgan savollaringizni tahlil qiling. Xatolarni tuzatib, 
                DTM imtihonida qopqonlarga tushmaslik ko&apos;nikmasini hosil qiling.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                type="button"
                onClick={() => setOpenLoopModal(true)}
                className="h-12 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-sm shadow-xl shadow-rose-600/25 cursor-pointer"
              >
                <Zap className="size-4 fill-current mr-2" />
                <span>Qasos Sprintini Boshlash</span>
              </Button>
            </div>
          </div>

          {/* Statistika indikatori */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 font-medium block">Tuzatilishi kerak</span>
              <span className="text-lg font-black text-rose-400 font-mono">
                {data?.active_count || data?.deck?.length || 0} ta
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 font-medium block">O&apos;zlashtirilgan</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {data?.mastered_count || 0} ta
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 font-medium block">Combo zanjir</span>
              <span className="text-lg font-black text-amber-400 font-mono flex items-center gap-1">
                <Flame className="size-4 fill-current" />
                {combo}x
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 font-medium block">Tezkor o&apos;tish</span>
              <Link href="/flashcards" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                Flashcards <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Asosiy Kontent Maydoni */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : !data || data.deck.length === 0 ? (
          /* Agar xatolar bo'lmasa — Tabrik ekrani */
          <div className="rounded-[32px] border border-emerald-500/20 bg-zinc-900/60 p-8 sm:p-12 text-center space-y-4 shadow-xl backdrop-blur-xl">
            <div className="size-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="size-9" />
            </div>
            <h2 className="text-2xl font-black text-white">
              Tabriklaymiz! Hozircha tuzatish kerak bo&apos;lgan xatolar yo&apos;q 🎉
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Siz barcha xatolaringizni muvaffaqiyatli tozaladingiz yoki hali yangi xato qilmadingiz. 
              Bilimingizni sinash uchun yangi Sprint yoki DTM sinovini boshlang!
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => setOpenLoopModal(true)}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 text-white font-bold"
              >
                <Zap className="size-4 fill-current mr-2" />
                <span>Sprint Boshlash</span>
              </Button>
              <Button asChild variant="outline" className="h-12 px-6 rounded-2xl border-white/10 text-white">
                <Link href="/tests">Barcha Testlar</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Interaktiv Xatoni Tuzatish Kartasi */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono font-bold text-zinc-400">
                Xato {idx + 1} / {data.deck.length}
              </span>
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="size-3.5" />
                {data.deck[idx].times_wrong} marta adashilgan
              </span>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-zinc-900/80 p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10">
                  {data.deck[idx].topic || 'Mavzu'}
                </Badge>
              </div>

              <h3 className="text-base sm:text-xl font-bold text-white leading-snug">
                {data.deck[idx].body}
              </h3>

              {/* Variantlar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {data.deck[idx].choices.map((choice) => {
                  const isSelected = selectedChoice === choice.id;
                  const isCorrect = result?.correct_choice_id === choice.id;
                  const isWrongSelected = isSelected && result && !result.correct;

                  let btnStyle = 'border-white/10 bg-zinc-950/70 text-zinc-200 hover:border-white/20 hover:bg-zinc-900';
                  if (isSelected && !result) {
                    btnStyle = 'border-primary bg-primary/20 text-white ring-2 ring-primary/40';
                  } else if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500/40';
                  } else if (isWrongSelected) {
                    btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-200 ring-2 ring-rose-500/40';
                  }

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => checkChoice(choice.id)}
                      className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{choice.text}</span>
                      {isCorrect && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-2" />}
                      {isWrongSelected && <XCircle className="size-4 text-rose-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {/* Tushuntirish / Explanation */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                    result.correct
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <p className="font-bold">
                    {result.correct ? "✅ Ajoyib! Xatoni to'g'riladingiz!" : "❌ Yana adashdingiz:"}
                  </p>
                  <p className="text-zinc-200">
                    {result.explanation || data.deck[idx].explanation || "To'g'ri javobni eslab qoling va qayta sinab ko'ring."}
                  </p>
                </motion.div>
              )}

              {/* Keyingi tugmasi */}
              {result && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold"
                  >
                    <span>Keyingi xato</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Avtopilot Konveyer Focus Modali */}
      {openLoopModal && (
        <ContinuousLoopController onClose={() => setOpenLoopModal(false)} />
      )}
    </>
  );
}
