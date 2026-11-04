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

  const [questions, setQuestions] = useState<BlitzQuestion[]>(DEFAULT_BLITZ_QUESTIONS);
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
        if (res && res.ok && res.session_id && res.questions?.length === 7) {
          setQuestions(res.questions);
          setSessionId(res.session_id);
        }
      } catch {
        // Fallback ishlaydi
      }
    }
    loadQuestions();
  }, [subject]);

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
      router.push('/sprint?subject=tarix&count=10');
    }
  };

  const currentQ = questions[currentIndex];

  /* Natija faqat haqiqiy javoblardan. Ilgari bu yerda hamma uchun bir xil "B+, 164.5/189
     ball, A daraja kafolatlanadi" qattiq yozilgan edi — 7 ta savoldan sertifikat balli
     bashorat qilib bo'lmaydi, shuning uchun ball ko'rsatilmaydi. */
  const total = questions.length;
  const level =
    correctAnswersCount >= total - 1
      ? { label: 'Kuchli boshlanish', tone: 'text-emerald-300', note: "Asosiy bilimlar mustahkam. Endi rasmiy formatdagi to'liq testlar bilan darajangizni aniqlang." }
      : correctAnswersCount >= Math.ceil(total / 2)
      ? { label: "O'rtacha", tone: 'text-blue-300', note: "Yaxshi asos bor. Quyidagi mavzularni mustahkamlasangiz, natija tez o'sadi." }
      : { label: "Boshlang'ich", tone: 'text-amber-300', note: "Hammasi oldinda — kunlik qisqa mashqlar bilan bilimlar tez to'planadi." };
  const DIFFICULTY_UZ: Record<BlitzQuestion['difficulty'], string> = { EASY: 'Oson', MEDIUM: "O'rta", HARD: 'Qiyin' };

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[580px] flex flex-col justify-between p-4 sm:p-5 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-2xl select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {!isCompleted && currentQ && (
          <motion.div
            key="blitz_quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between space-y-4"
          >
            {/* ── 1. SEGMENTED STEP BAR (7 ta Kapsula) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-blue-400" />
                  <span>Bilim darajasini aniqlash</span>
                </span>
                <span className="font-mono text-zinc-300 font-bold">
                  {currentIndex + 1} / 7
                </span>
              </div>

              {/* 7 ta kichik kapsula */}
              <div className="grid grid-cols-7 gap-1.5 h-2">
                {questions.map((_, idx) => {
                  const status = answersStatus[idx];
                  let capBg = 'bg-zinc-800';

                  if (status === true) {
                    capBg = 'bg-emerald-400 shadow-[0_0_10px_#34d399]';
                  } else if (status === false) {
                    capBg = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
                  } else if (idx === currentIndex) {
                    capBg = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse';
                  }

                  return (
                    <div
                      key={idx}
                      className={cn('rounded-full transition-all duration-300', capBg)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Qiyinlik darajasi & Mavzu */}
            <div className="flex items-center gap-2 pt-1">
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                  currentQ.difficulty === 'EASY' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  currentQ.difficulty === 'MEDIUM' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  currentQ.difficulty === 'HARD' && 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                )}
              >
                {DIFFICULTY_UZ[currentQ.difficulty] ?? currentQ.difficulty}
              </span>
              <span className="text-xs text-zinc-400 truncate">{currentQ.topic}</span>
            </div>

            {/* Savol Matni */}
            <div className="py-2">
              <h3 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {currentQ.body}
              </h3>
            </div>

            {/* Variantlar */}
            <div className="space-y-2 pt-2">
              {currentQ.choices.map((choice) => {
                const isSelected = selectedId === choice.id;
                let choiceStyle = 'border-white/10 bg-zinc-950/60 hover:bg-zinc-800/70 hover:border-white/20 text-zinc-200';

                if (isAnswered) {
                  if (choice.is_correct) {
                    choiceStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                  } else if (isSelected && !choice.is_correct) {
                    choiceStyle = 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
                  } else {
                    choiceStyle = 'opacity-40 border-white/5 bg-zinc-950/30 text-zinc-500';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelect(choice)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between cursor-pointer disabled:cursor-default',
                      choiceStyle
                    )}
                  >
                    <span>{choice.text}</span>
                    {isAnswered && choice.is_correct && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-2" />}
                    {isAnswered && isSelected && !choice.is_correct && <XCircle className="size-4 text-rose-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── 2. NATIJA KARTASI (haqiqiy javoblardan) ── */}
        {isCompleted && (
          <motion.div
            key="blitz_result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto flex flex-col justify-between space-y-5 py-4 text-center"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Award className="size-3.5" />
                <span>Diagnostika Natijasi</span>
              </div>

              <div className="relative mx-auto size-28 sm:size-32 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-[2px] shadow-[0_0_35px_rgba(59,130,246,0.45)]">
                <div className="size-full bg-[#07090E] rounded-2xl flex flex-col items-center justify-center p-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    {correctAnswersCount}/{total}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase mt-1">
                    to&apos;g&apos;ri javob
                  </span>
                </div>
              </div>

              <h2 className={cn('text-lg sm:text-xl font-bold pt-1', level.tone)}>{level.label}</h2>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">{level.note}</p>
            </div>

            {weakTopics.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left max-w-md mx-auto w-full space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Target className="size-4 text-amber-400 shrink-0" />
                  <span>Takrorlash kerak bo&apos;lgan mavzular:</span>
                </div>
                <ul className="text-xs text-zinc-200 pl-5 list-disc space-y-0.5">
                  {weakTopics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartSprintTramplin}
                className="w-full h-13 sm:h-14 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 px-4 sm:px-5 cursor-pointer"
              >
                <Zap className="size-4.5 fill-white text-white shrink-0" />
                <span>Mashqni boshlash</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

