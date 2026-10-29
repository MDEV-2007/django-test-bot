'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ArrowLeft, Sparkles, BookOpen, Landmark,
  Languages, Dna, Calculator, CheckCircle2, ChevronRight,
  Loader2, Trophy, Flame, Layers, Clock, ShieldCheck
} from 'lucide-react';
import NeuralSprintView from '@/components/sprint/NeuralSprintView';
import type { QuestionItem, SprintSessionSummary, SprintSubject } from '@/types/sprint';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Zaxira savollar (tarmoq uzilib qolsa)
const FALLBACK_QUESTIONS: QuestionItem[] = [
  {
    id: 101,
    topicTitle: "Amir Temur davlati",
    body: "Amir Temur qaysi yili Balx shahrini egallab, markazlashgan davlatga asos solgan va buyuk amir deb e'lon qilingan?",
    correctOptionId: 2,
    options: [
      { id: 1, text: "1365-yil" },
      { id: 2, text: "1370-yil" },
      { id: 3, text: "1385-yil" },
      { id: 4, text: "1391-yil" },
    ],
  },
  {
    id: 102,
    topicTitle: "Qadimgi Baqtriya",
    body: "O'zbekiston hududidagi qadimgi Oks ibodatxonasi qaysi arxeologik yodgorlikdan topilgan?",
    correctOptionId: 3,
    options: [
      { id: 1, text: "Dalvarzintepa" },
      { id: 2, text: "Xolchayon" },
      { id: 3, text: "Taxiti Sangin" },
      { id: 4, text: "Qoratepa" },
    ],
  },
];

const DEFAULT_SUBJECTS: SprintSubject[] = [
  { id: 0, name: "Barcha fanlar (Aralash)", slug: "all", questions_count: 730, is_available: true },
  { id: 1, name: "Tarix", slug: "tarix", questions_count: 722, is_available: true },
  { id: 6, name: "Ingliz tili", slug: "ingliz-tili", questions_count: 11, is_available: true },
  { id: 2, name: "Ona tili", slug: "ona-tili", questions_count: 0, is_available: false },
  { id: 4, name: "Biologiya", slug: "biologiya", questions_count: 0, is_available: false },
  { id: 3, name: "Matematika", slug: "matematika", questions_count: 0, is_available: false },
];

function getSubjectIcon(slug: string) {
  switch (slug) {
    case 'tarix':
      return Landmark;
    case 'ingliz-tili':
      return Languages;
    case 'ona-tili':
      return BookOpen;
    case 'biologiya':
      return Dna;
    case 'matematika':
      return Calculator;
    default:
      return Sparkles;
  }
}

function getSubjectBadge(slug: string) {
  switch (slug) {
    case 'tarix':
      return 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30';
    case 'ingliz-tili':
      return 'from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30';
    case 'ona-tili':
      return 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30';
    case 'biologiya':
      return 'from-green-500/20 to-lime-500/20 text-green-400 border-green-500/30';
    case 'matematika':
      return 'from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30';
    default:
      return 'from-rose-500/20 to-amber-500/20 text-primary border-primary/30';
  }
}

export default function SprintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subjects, setSubjects] = useState<SprintSubject[]>(DEFAULT_SUBJECTS);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(() => {
    const p = searchParams.get('subject');
    return p ? parseInt(p, 10) || 0 : 0;
  });
  const [questionCount, setQuestionCount] = useState<number>(() => {
    const c = searchParams.get('count');
    return c ? parseInt(c, 10) || 10 : 10;
  });

  const [isSprintActive, setIsSprintActive] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Bazadagi amaldagi fanlarni yuklash
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await apiFetch<{ ok: boolean; subjects: SprintSubject[] }>('/api/v1/sprint/subjects/');
        if (res?.ok && res.subjects?.length > 0) {
          setSubjects(res.subjects);
        }
      } catch (err) {
        // Fallback sifatida DEFAULT_SUBJECTS qoladi
      } finally {
        setLoadingSubjects(false);
      }
    }
    fetchSubjects();
  }, []);

  // Tanlangan fan bo'yicha sprintni boshlash
  const startSprint = async (subjectId = selectedSubjectId, count = questionCount) => {
    setLoadingQuestions(true);
    try {
      const qParam = subjectId > 0 ? `&subject_id=${subjectId}` : '';
      const res = await apiFetch<{ ok: boolean; questions: QuestionItem[] }>(
        `/api/v1/sprint/questions/?count=${count}${qParam}`
      );

      if (res?.ok && res.questions?.length > 0) {
        setQuestions(res.questions);
        setIsSprintActive(true);
      } else {
        setQuestions(FALLBACK_QUESTIONS);
        setIsSprintActive(true);
      }
    } catch (err) {
      toast.error("Savollarni yuklashda uzilish bo'ldi. Zaxira savollar ishga tushirildi.");
      setQuestions(FALLBACK_QUESTIONS);
      setIsSprintActive(true);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleFinish = (summary: SprintSessionSummary) => {
    toast.success(`Fokus Sprinti yakunlandi! +${summary.totalXpEarned} XP to'plandi`);
  };

  const handleExitSprint = () => {
    setIsSprintActive(false);
    setQuestions(null);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. FAOL SPRINT REJIMI (Savol-Javob Ekranı)
  // ─────────────────────────────────────────────────────────────
  if (isSprintActive && questions && questions.length > 0) {
    const chosenSubject = subjects.find((s) => s.id === selectedSubjectId);
    const sprintTitle = chosenSubject?.name || questions[0]?.topicTitle || "Fokus Sprinti";

    return (
      <div className="min-h-screen bg-background text-foreground">
        <NeuralSprintView
          questions={questions}
          initialDtmScore={178.4}
          initialTopicMastery={45}
          topicTitle={sprintTitle}
          onExit={handleExitSprint}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. FANNI TANLASH VA SPRINTNI SOZLASH EKRANI
  // ─────────────────────────────────────────────────────────────
  const activeSubjectObj = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:py-10 flex flex-col justify-between max-w-3xl mx-auto">
      <div className="space-y-6 sm:space-y-8">
        {/* Navigatsiya & Back */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Dashboardga qaytish</span>
          </Button>

          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary gap-1.5 py-1 px-3">
            <Zap className="size-3.5 fill-primary text-primary" />
            <span className="font-bold text-[11px] uppercase tracking-wider">15 daqiqalik Flow State</span>
          </Badge>
        </div>

        {/* Hero Sarlavha */}
        <div className="space-y-2 text-left">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <span>⚡ Fokus Sprinti</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
            O&apos;zingiz tayyorlanayotgan fanni tanlang. Har bir savoldan keyin <b>0.2 soniyalik jonli reaksiya</b>, <b>AI layfxaki</b> va xatolarni joyida tuzatuvchi <b>Qasos savollari</b> sizni flow (oqim) holatida ushlab turadi.
          </p>
        </div>

        {/* ─── A. FANLAR RO'YXATI (Subject Selection Grid) ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary" />
              <span>1. Fanni tanlang:</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {subjects.filter((s) => s.is_available).length} ta fan faol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((subj) => {
              const isSelected = selectedSubjectId === subj.id;
              const isAvailable = subj.is_available;
              const IconComponent = getSubjectIcon(subj.slug);
              const badgeStyle = getSubjectBadge(subj.slug);

              return (
                <motion.div
                  key={subj.id}
                  whileTap={isAvailable ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (isAvailable) setSelectedSubjectId(subj.id);
                  }}
                  className={cn(
                    'relative p-4 rounded-2xl border transition-all duration-200 select-none flex items-center justify-between gap-3 text-left',
                    isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-45 bg-muted/20 border-border/40',
                    isSelected && isAvailable
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15 ring-2 ring-primary/40'
                      : isAvailable && 'border-border/70 bg-card hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      'size-11 rounded-xl flex items-center justify-center border shrink-0 bg-gradient-to-br',
                      badgeStyle
                    )}>
                      <IconComponent className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-sm sm:text-base text-foreground leading-snug truncate">
                        {subj.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isAvailable ? `${subj.questions_count} ta rasmiy test` : "Tez kunda bazaga qo'shiladi"}
                      </p>
                    </div>
                  </div>

                  {/* Indicator */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="size-5 text-primary fill-primary/20" />
                    ) : (
                      <div className="size-5 rounded-full border border-border" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── B. SAVOLLAR SONI (Length Selector) ─── */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            <span>2. Sprint davomiyligi:</span>
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { count: 10, label: '10 ta test', time: '~5 daqiqa', desc: 'Tezkor isinish' },
              { count: 20, label: '20 ta test', time: '~10 daqiqa', desc: 'Tavsiya etiladi' },
              { count: 30, label: '30 ta test', time: '~15 daqiqa', desc: 'Chuqur Flow' },
            ].map((item) => {
              const isSelected = questionCount === item.count;
              return (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => setQuestionCount(item.count)}
                  className={cn(
                    'p-3 rounded-2xl border text-center transition-all select-none cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/10 ring-1 ring-primary'
                      : 'border-border/70 bg-card hover:border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <p className="text-sm font-extrabold">{item.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-80">{item.time}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'mt-1.5 text-[9px] py-0 px-1.5',
                      isSelected ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.desc}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── C. IMTIYOZ VA GAMIFIKATSIYA KODLARI ─── */}
        <div className="p-4 rounded-2xl border border-border/60 bg-muted/30 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Prognoz</span>
            <p className="font-extrabold text-foreground">Jonli DTM</p>
          </div>
          <div className="space-y-0.5 border-x border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Combo</span>
            <p className="font-extrabold text-amber-500">2.0x Ball & XP</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Qasos Savoli</span>
            <p className="font-extrabold text-emerald-500">Avto-tuzatish</p>
          </div>
        </div>
      </div>

      {/* ─── D. START SPRINT TUGMASI ─── */}
      <div className="pt-8">
        <Button
          disabled={loadingQuestions}
          onClick={() => startSprint(selectedSubjectId, questionCount)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-primary to-amber-500 hover:from-primary/95 hover:to-amber-500/95 text-white font-extrabold text-base shadow-xl shadow-primary/25 gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          {loadingQuestions ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Savollar tayyorlanmoqda...</span>
            </>
          ) : (
            <>
              <Zap className="size-5 fill-white" />
              <span>Sprintni Boshlash ({activeSubjectObj?.name} · {questionCount} ta savol)</span>
              <ChevronRight className="size-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
