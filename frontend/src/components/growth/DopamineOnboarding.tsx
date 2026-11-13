'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  TrendingUp,
  Target,
  Award,
  Flame,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { celebrate } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import SosAskButton from '@/components/common/SosAskButton';

interface BlitzChoice {
  id: number;
  text: string;
  /** Server savollarida javob berilgandan keyingina to'ldiriladi (GET'da kalit yo'q).
      Faqat oflayn DEFAULT_BLITZ_QUESTIONS da oldindan bor. */
  is_correct?: boolean;
}

type BlitzAnswerResponse = {
  ok: boolean;
  is_correct: boolean;
  correct_choice_id: number | null;
};

interface BlitzQuestion {
  id: number;
  body: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topic: string;
  choices: BlitzChoice[];
}

export interface DopamineOnboardingProps {
  onComplete?: () => void;
  subject?: string;
}

// 7 ta moslashtirilgan Dofamin savollari (1-4 Easy, 5-6 Medium, 7 Hard)
const DEFAULT_BLITZ_QUESTIONS: BlitzQuestion[] = [
  {
    id: 1,
    difficulty: 'EASY',
    topic: 'Qadimgi Turon Tarixi',
    body: "Amir Temur qaysi shahar yaqinida 'Loy jangi'da qatnashgan?",
    choices: [
      { id: 1, text: 'Chinoz va Toshkent oraligʻida', is_correct: true },
      { id: 2, text: 'Samarqand yaqinida', is_correct: false },
      { id: 3, text: 'Buxoro chekkasida', is_correct: false },
      { id: 4, text: 'Balx atrofida', is_correct: false },
    ],
  },
  {
    id: 2,
    difficulty: 'EASY',
    topic: 'Alisher Navoiy Davri',
    body: "Alisher Navoiy o'zining besh dostondan iborat durdonasini nima deb atagan?",
    choices: [
      { id: 5, text: 'Devoni Foniy', is_correct: false },
      { id: 6, text: 'Xamsa', is_correct: true },
      { id: 7, text: 'Majolis un-nafois', is_correct: false },
      { id: 8, text: 'Mahbub ul-qulub', is_correct: false },
    ],
  },
  {
    id: 3,
    difficulty: 'EASY',
    topic: 'Oʻzbekiston Geografiyasi',
    body: "O'zbekistonning eng uzun va sersuv daryosi qaysi?",
    choices: [
      { id: 9, text: 'Sirdaryo', is_correct: false },
      { id: 10, text: 'Amudaryo', is_correct: true },
      { id: 11, text: 'Zarafshon', is_correct: false },
      { id: 12, text: 'Chirchiq', is_correct: false },
    ],
  },
  {
    id: 4,
    difficulty: 'EASY',
    topic: 'Tarixiy Shaharlar',
    body: "Qaysi shahar qadimda 'Sayqali roʻyi zamin' (Yer yuzining sayqali) deb ulug'langan?",
    choices: [
      { id: 13, text: 'Xiva', is_correct: false },
      { id: 14, text: 'Samarqand', is_correct: true },
      { id: 15, text: 'Qoʻqon', is_correct: false },
      { id: 16, text: 'Termiz', is_correct: false },
    ],
  },
  {
    id: 5,
    difficulty: 'MEDIUM',
    topic: 'Davlat Boshqaruvi',
    body: "Temuriylar davlatida moliya va devon ishlarini nazorat qiluvchi oliy mansabdor kim bo'lgan?",
    choices: [
      { id: 17, text: 'Kotib', is_correct: false },
      { id: 18, text: 'Devonbegi', is_correct: true },
      { id: 19, text: 'Xos Hojib', is_correct: false },
      { id: 20, text: 'Kutvol', is_correct: false },
    ],
  },
  {
    id: 6,
    difficulty: 'MEDIUM',
    topic: 'Mantiq va Grammatika',
    body: "'Bilim oʻrganish — igna bilan quduq qazish kabidir' gapida qo'llangan badiiy san'at turi?",
    choices: [
      { id: 21, text: 'Tazod', is_correct: false },
      { id: 22, text: 'Tashbeh (Oʻxshatish)', is_correct: true },
      { id: 23, text: 'Mubolagʻa', is_correct: false },
      { id: 24, text: 'Talmeh', is_correct: false },
    ],
  },
  {
    id: 7,
    difficulty: 'HARD',
    topic: 'Jadidchilik Harakati',
    body: "1917-yilda Turkiston Muxtoriyati hukumatining birinchi raisi etib kim saylangan?",
    choices: [
      { id: 25, text: 'Mustafo Choʻqay', is_correct: false },
      { id: 26, text: 'Muhammadjon Tinishboyev', is_correct: true },
      { id: 27, text: 'Mahmudxoʻja Behbudiy', is_correct: false },
      { id: 28, text: 'Munavvarqori Abdurashidxonov', is_correct: false },
    ],
  },
];

export default function DopamineOnboarding({ onComplete, subject }: DopamineOnboardingProps) {
  const router = useRouter();

  // Zaxira (oflayn) savollar faqat Tarixdan. Boshqa fan tanlangan bo'lsa, tarix savollarini
  // ko'rsatib yubormaslik uchun faqat server savollari ishlatiladi.
  const serverOnly = Boolean(subject) && subject !== 'tarix';
  const [questions, setQuestions] = useState<BlitzQuestion[]>(serverOnly ? [] : DEFAULT_BLITZ_QUESTIONS);
  const [loadingQs, setLoadingQs] = useState<boolean>(serverOnly);
  const [noQuestions, setNoQuestions] = useState<boolean>(false);
  // Server sessiyasi: bo'lsa javoblar serverda tekshiriladi, bo'lmasa oflayn savollar lokal.
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [answersStatus, setAnswersStatus] = useState<boolean[]>([]); // har bir savol to'g'ri/xato
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Xato qilingan savollarning mavzulari (takrorlanmasdan) — natijada ko'rsatiladi.
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  // Backenddan 7 ta savol olish (agar mavjud bo'lsa)
  useEffect(() => {
    async function loadQuestions() {
      try {
        const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
        const res = await apiFetch<{ ok: boolean; session_id: number | null; questions: BlitzQuestion[] }>(
          `/api/growth/onboarding/blitz/${query}`,
        );
        // Server savollarida kalit yo'q — ular faqat sessiya bilan ishlatiladi.
        // Fanda 7 tadan kam savol bo'lsa ham (kamida 3 ta) — o'sha fandan savollar beriladi.
        if (res && res.ok && res.session_id && (res.questions?.length ?? 0) >= 3) {
          setQuestions(res.questions);
          setSessionId(res.session_id);
        } else if (serverOnly) {
          setNoQuestions(true);
        }
      } catch {
        // Tarix uchun zaxira savollar ishlaydi; boshqa fan uchun — "savol yetarli emas"
        if (serverOnly) setNoQuestions(true);
      } finally {
        setLoadingQs(false);
      }
    }
    loadQuestions();
  }, [subject, serverOnly]);

  const handleSelect = async (choice: BlitzChoice) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedId(choice.id);

    const question = questions[currentIndex];
    let isCorrect = !!choice.is_correct;
    if (sessionId && question) {
      try {
        const res = await apiFetch<BlitzAnswerResponse>('/api/growth/onboarding/blitz/answer/', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId, question_id: question.id, choice_id: choice.id }),
        });
        isCorrect = !!res.is_correct;
        // To'g'ri variantni faqat endi (javobdan keyin) belgilaymiz — UI yashil/qizil ko'rsatadi.
        setQuestions((prev) =>
          prev.map((q, i) =>
            i === currentIndex
              ? { ...q, choices: q.choices.map((c) => ({ ...c, is_correct: c.id === res.correct_choice_id })) }
              : q,
          ),
        );
      } catch (err) {
        setIsAnswered(false);
        setSelectedId(null);
        toast.error(err instanceof Error && err.message ? err.message : "Javobni yuborib bo'lmadi. Qayta urinib ko'ring.");
        return;
      }
    }
    setAnswersStatus((prev) => [...prev, isCorrect]);

    if (isCorrect) {
      soundFX.correct();
      tgHaptic('success');
      setCorrectAnswersCount((prev) => prev + 1);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
      // Xato qilingan mavzuni eslab qolish
      const topic = questions[currentIndex]?.topic;
      if (topic) setWeakTopics((prev) => (prev.includes(topic) ? prev : [...prev, topic]));
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedId(null);
        setIsAnswered(false);
      } else {
        finishDiagnostic();
      }
    }, 1200);
  };

  const finishDiagnostic = () => {
    setIsCompleted(true);
    celebrate();
    soundFX.success();
    tgHaptic('medium');
  };

  const handleStartSprintTramplin = () => {
    soundFX.click();
    tgHaptic('medium');
    if (onComplete) {
      onComplete();
    } else {
      router.push(`/sprint?subject=${subject || 'tarix'}&count=10`);
    }
  };

  const currentQ = questions[currentIndex];

  /* Natija faqat haqiqiy javoblardan. Ilgari bu yerda hamma uchun bir xil "B+, 164.5/189
     ball, A daraja kafolatlanadi" qattiq yozilgan edi — 7 ta savoldan sertifikat balli
     bashorat qilib bo'lmaydi, shuning uchun ball ko'rsatilmaydi. */
  const total = questions.length;
  const level =
    correctAnswersCount >= total - 1
      ? { label: 'Kuchli boshlanish', tone: 'text-[var(--ps-green)]', note: "Asosiy bilimlar mustahkam. Endi rasmiy formatdagi to'liq testlar bilan darajangizni aniqlang." }
      : correctAnswersCount >= Math.ceil(total / 2)
      ? { label: "O'rtacha", tone: 'text-[var(--ps-purple)]', note: "Yaxshi asos bor. Quyidagi mavzularni mustahkamlasangiz, natija tez o'sadi." }
      : { label: "Boshlang'ich", tone: 'text-[var(--ps-coral)]', note: "Hammasi oldinda — kunlik qisqa mashqlar bilan bilimlar tez to'planadi." };
  const DIFFICULTY_UZ: Record<BlitzQuestion['difficulty'], string> = { EASY: 'Oson', MEDIUM: "O'rta", HARD: 'Qiyin' };
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  // API qiyinlikni kichik harfda ham yuborishi mumkin ("easy") — bir xil ko'rinishga keltiramiz.
  const diff = String(currentQ?.difficulty ?? '').toUpperCase() as BlitzQuestion['difficulty'];

  /* ── Natija: alohida markazlashgan karta ── */
  if (isCompleted) {
    return (
      <motion.section
        key="blitz_result"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ps-card relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 overflow-hidden !rounded-[32px] p-6 text-center sm:p-10"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-purple)] opacity-20" />
        <span className="ps-chip relative">
          <Award className="size-3.5 text-[var(--ps-orange)]" />
          Diagnostika natijasi
        </span>

        <div className="relative size-44 sm:size-52">
          <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--ps-orange)]" />
          <div aria-hidden className="absolute -bottom-1 -left-3 size-16 rounded-tr-full bg-[var(--ps-purple)]" />
          <div className="absolute inset-[12%] flex flex-col items-center justify-center rounded-full border-[5px] border-[#FFFCF7] bg-[#080808] text-[#FFFCF7]">
            <span className="ps-num text-[44px] sm:text-[52px]">
              {correctAnswersCount}
              <span className="text-[0.5em] text-[var(--ps-orange)]">/{total}</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">to&apos;g&apos;ri javob</span>
          </div>
        </div>

        <div className="relative">
          <h2 className={cn('ps-display text-[34px] sm:text-[44px]', level.tone)}>{level.label}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">{level.note}</p>
        </div>

        {weakTopics.length > 0 && (
          <div className="relative w-full max-w-md rounded-[24px] bg-[var(--ps-neutral)] p-4 text-left">
            <p className="flex items-center gap-2 text-sm font-bold">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                <Target className="size-3.5" />
              </span>
              Takrorlash kerak bo&apos;lgan mavzular
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {weakTopics.map((t) => (
                <span key={t} className="rounded-full bg-[var(--ps-paper)] px-3 py-1 text-[12px] font-semibold">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={handleStartSprintTramplin} className="ps-btn ps-btn-ink relative w-full max-w-md justify-between">
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4 text-[var(--ps-orange)]" />
            Mashqni boshlash
          </span>
          <span className="ps-btn-arrow">
            <ArrowRight className="size-4" />
          </span>
        </button>
      </motion.section>
    );
  }

  if (!currentQ) {
    return (
      <div className="space-y-5">
        <div className="h-[86px] animate-pulse rounded-[28px] bg-white/40" />
        <div className="h-96 animate-pulse rounded-[32px] bg-white/40" />
      </div>
    );
  }

  /* Savollar yuklanmoqda (tanlangan fan bo'yicha) */
  if (loadingQs) {
    return (
      <div className="ps-card mx-auto flex max-w-xl flex-col items-center gap-3 !rounded-[32px] p-10 text-center">
        <span className="inline-flex size-14 animate-pulse items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
          <Sparkles className="size-6" />
        </span>
        <p className="text-[15px] font-bold">Savollar tayyorlanmoqda…</p>
        <p className="text-[13px] text-[var(--text-muted)]">Tanlangan fan bo&apos;yicha diagnostika yig&apos;ilmoqda</p>
      </div>
    );
  }

  /* Tanlangan fanda hali yetarli savol yo'q */
  if (noQuestions || questions.length === 0) {
    return (
      <div className="ps-card mx-auto flex max-w-xl flex-col items-center gap-3 !rounded-[32px] p-10 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
          <Zap className="size-7" />
        </span>
        <h3 className="ps-display text-[26px]">Bu fanda savollar hali yetarli emas</h3>
        <p className="max-w-sm text-[13.5px] leading-relaxed text-[var(--text-muted)]">
          Diagnostika uchun kamida 3 ta savol kerak. Boshqa fanni tanlang yoki testlar bo&apos;limiga o&apos;ting.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => router.push('/onboarding')} className="ps-btn ps-btn-ink">
            Boshqa fan tanlash
          </button>
          <button type="button" onClick={() => router.push('/tests')} className="ps-btn ps-btn-ghost">
            Testlar
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = answersStatus.length;
  const totalQ = questions.length;

  /* ── Savol: standart test ekrani bilan bir xil tuzilish ── */
  return (
    <div className="space-y-5 select-none sm:space-y-6">
      {/* Yuqori panel */}
      <div className="ps-runner-bar sticky top-2 z-30 rounded-[28px] p-2.5 sm:top-3 sm:p-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              title="Blitsdan chiqish"
              aria-label="Blitsdan chiqish"
              onClick={() => router.push(subject ? '/tests?mode=blitz' : '/tests')}
              className="ps-runner-icon flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:rotate-90"
            >
              <X className="size-4" />
            </button>
            <span className="ps-runner-count flex h-10 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-sm font-bold">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                <Zap className="size-3.5" />
              </span>
              <span className="tabular-nums">
                {currentIndex + 1}<span className="opacity-50">/{totalQ}</span>
              </span>
            </span>
            <span className="ps-runner-chip hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold min-[420px]:flex">
              <Sparkles className="size-3.5 text-[var(--ps-purple)]" />
              {totalQ}-savol blits
            </span>
          </div>
          <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3.5 text-sm font-bold text-white">
            <CheckCircle2 className="size-4" />
            <span className="tabular-nums">{correctAnswersCount}</span>
          </span>
        </div>

        {/* Bosqichlar */}
        <div className="mt-2.5 flex items-center gap-3 px-1">
          <div className="grid h-2 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, totalQ)}, minmax(0, 1fr))` }}>
            {questions.map((_, idx) => {
              const status = answersStatus[idx];
              return (
                <div
                  key={idx}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    status === true
                      ? 'bg-[var(--ps-green)]'
                      : status === false
                        ? 'bg-[var(--ps-coral)]'
                        : idx === currentIndex
                          ? 'animate-pulse bg-[var(--ps-purple)]'
                          : 'ps-runner-track',
                  )}
                />
              );
            })}
          </div>
          <span className="shrink-0 text-[11px] font-bold tabular-nums opacity-70">
            {answeredCount}/{totalQ} yechildi
          </span>
        </div>
      </div>

      {/* Savol kartasi */}
      <AnimatePresence mode="wait">
        <motion.section
          key={currentQ.id ?? currentIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="ps-card relative overflow-hidden !rounded-[32px] p-5 sm:p-9"
        >
          <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-purple)] opacity-20" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-end gap-3">
              <span className="ps-num text-[56px] text-[var(--ps-purple)] sm:text-[72px]">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="mb-2 sm:mb-3">
                <span className="ps-eyebrow block text-[var(--text-muted)]">Savol</span>
                <span className="text-sm font-bold text-[var(--text-muted)]">/ {totalQ}</span>
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Oflayn demo savollar bazada yo'q — SOS faqat server sessiyasida */}
              {sessionId && <SosAskButton questionId={currentQ.id} source="blitz" />}
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-bold',
                  diff === 'EASY' && 'bg-[var(--ps-green)] text-white',
                  diff === 'MEDIUM' && 'bg-[var(--ps-orange)] text-[#080808]',
                  diff === 'HARD' && 'bg-[var(--ps-coral)] text-white',
                )}
              >
                {DIFFICULTY_UZ[diff] ?? currentQ.difficulty}
              </span>
              {currentQ.topic && (
                <span className="max-w-[200px] truncate rounded-full bg-[var(--ps-neutral)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  {currentQ.topic}
                </span>
              )}
            </div>
          </div>

          <div className="relative mt-6 space-y-6">
            {/* Savol matni HTML bo'lib keladi (<p>, <b>…) — oddiy test ekranidagidek chiziladi */}
            <div
              role="heading"
              aria-level={2}
              className="reading-block font-bold [&_p]:m-0 [&_p+p]:mt-2"
              dangerouslySetInnerHTML={{ __html: currentQ.body }}
            />

            <div className="space-y-3 pt-2">
              {currentQ.choices.map((choice, ci) => {
                const isSelected = selectedId === choice.id;
                const state = !isAnswered ? undefined : choice.is_correct ? 'correct' : isSelected ? 'wrong' : 'muted';
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelect(choice)}
                    data-state={state}
                    className="ps-choice reading-scale flex w-full cursor-pointer items-center justify-between gap-3.5 p-4 text-left font-medium leading-relaxed disabled:cursor-default sm:p-4.5"
                  >
                    <span className="flex items-center gap-3.5">
                      <span className="ps-choice-letter flex shrink-0 items-center justify-center font-bold">
                        {LETTERS[ci] || ci + 1}
                      </span>
                      <span className="leading-snug">{choice.text}</span>
                    </span>
                    {state === 'correct' && <CheckCircle2 className="size-5 shrink-0" />}
                    {state === 'wrong' && <XCircle className="size-5 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center justify-between gap-3 border-t border-[var(--border-card)] pt-4 text-[12px] font-medium text-[var(--text-muted)] sm:flex">
              <span>Variantni tanlang — javob darhol tekshiriladi.</span>
              <span className="tabular-nums">{correctAnswersCount} ta to&apos;g&apos;ri · {answeredCount - correctAnswersCount} ta xato</span>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
