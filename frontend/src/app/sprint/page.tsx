'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NeuralSprintView from '@/components/sprint/NeuralSprintView';
import FocusSprintSetup from '@/components/sprint/FocusSprintSetup';
import type { QuestionItem, SprintSessionSummary, SprintSubject } from '@/types/sprint';
import { apiFetch } from '@/lib/api-client';
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
  { id: 0, name: "Barcha fanlar (Aralash)", slug: "all", questions_count: 1671, is_available: true },
  { id: 1, name: "Tarix", slug: "tarix", questions_count: 722, is_available: true },
  { id: 2, name: "Ona tili", slug: "ona-tili", questions_count: 0, is_available: false },
  { id: 3, name: "Matematika", slug: "matematika", questions_count: 0, is_available: false },
  { id: 4, name: "Biologiya", slug: "biologiya", questions_count: 0, is_available: false },
  { id: 6, name: "Ingliz tili", slug: "ingliz-tili", questions_count: 11, is_available: true },
  { id: 7, name: "Rus tili", slug: "rus-tili", questions_count: 0, is_available: false },
];

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
      }
    }
    fetchSubjects();
  }, []);

  // Avtomatik boshlash (Turnir / Jonli Banner havolasidan kelganda)
  useEffect(() => {
    if (searchParams.get('autostart') === 'true') {
      const p = searchParams.get('subject');
      const subjId = p === 'all' ? 0 : (parseInt(p || '0', 10) || 0);
      const c = searchParams.get('count');
      const count = c ? parseInt(c, 10) || 10 : 10;
      startSprint(subjId, count);
    }
  }, [searchParams]);

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
      <div className="min-h-screen bg-[#07090E] text-foreground">
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
  // 2. FANNI TANLASH VA SPRINTNI SOZLASH EKRANI (Bento Cockpit UI)
  // ─────────────────────────────────────────────────────────────
  return (
    <FocusSprintSetup
      subjects={subjects}
      selectedSubjectId={selectedSubjectId}
      onSelectSubject={setSelectedSubjectId}
      questionCount={questionCount}
      onSelectCount={setQuestionCount}
      onStart={(subjId, count) => startSprint(subjId, count)}
      loading={loadingQuestions}
    />
  );
}
