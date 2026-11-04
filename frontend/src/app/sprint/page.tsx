'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NeuralSprintView from '@/components/sprint/NeuralSprintView';
import FocusSprintSetup from '@/components/sprint/FocusSprintSetup';
import type { QuestionItem, SprintSessionSummary, SprintSubject } from '@/types/sprint';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import { useAuthStore } from '@/lib/auth-store';
import { Zap, Flame, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import GhostBattleArena from '@/components/arena/GhostBattleArena';

/* Server snake_case qaytaradi. Ilgari javob to'g'ridan-to'g'ri `QuestionItem` deb
   olinardi — `correctOptionId` undefined bo'lib, HAR BIR javob xato deb baholanardi. */
type SprintApiQuestion = {
  id: number;
  body: string;
  topic_title: string;
  correct_option_id: number;
  difficulty?: QuestionItem['difficulty'];
  options: { id: number; text: string }[];
};

function toQuestionItem(q: SprintApiQuestion): QuestionItem {
  return {
    id: q.id,
    body: q.body,
    topicTitle: q.topic_title,
    correctOptionId: q.correct_option_id,
    difficulty: q.difficulty,
    options: q.options,
  };
}

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
  const { user } = useAuthStore();
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
  const [activeTab, setActiveTab] = useState<'sprint' | 'arena'>(() => {
    return searchParams.get('tab') === 'arena' ? 'arena' : 'sprint';
  });

  useEffect(() => {
    if (searchParams.get('tab') === 'arena') {
      setActiveTab('arena');
    } else if (!searchParams.get('tab')) {
      setActiveTab('sprint');
    }
  }, [searchParams]);

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

  // Avtomatik boshlash (Turnir / Jonli Banner / Anti-Darslik Shpargalka havolasidan kelganda)
  useEffect(() => {
    if (searchParams.get('autostart') === 'true') {
      const p = searchParams.get('subject');
      const subjId = p === 'all' ? 0 : (parseInt(p || '0', 10) || 0);
      const c = searchParams.get('count');
      const count = c ? parseInt(c, 10) || 10 : 10;
      const t = searchParams.get('topic_id');
      const topicId = t ? parseInt(t, 10) || 0 : 0;
      startSprint(subjId, count, topicId);
    }
  }, [searchParams]);

  // Tanlangan fan/mavzu bo'yicha sprintni boshlash
  const startSprint = async (subjectId = selectedSubjectId, count = questionCount, topicId = 0) => {
    setLoadingQuestions(true);
    try {
      let qParam = '';
      if (topicId > 0) {
        qParam = `&topic_id=${topicId}`;
      } else if (subjectId > 0) {
        qParam = `&subject_id=${subjectId}`;
      }
      const res = await apiFetch<{ ok: boolean; questions: SprintApiQuestion[] }>(
        `/api/v1/sprint/questions/?count=${count}${qParam}`
      );

      if (res?.ok && res.questions?.length > 0) {
        setQuestions(res.questions.map(toQuestionItem));
        setIsSprintActive(true);
      } else {
        setQuestions(null);
        toast.error("Tanlangan fan bo'yicha hozircha savollar topilmadi. Boshqa fan yoki mavzuni tanlang.");
      }
    } catch (err) {
      setQuestions(null);
      toast.error("Savollarni yuklab bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleFinish = (summary: SprintSessionSummary) => {
    toast.success(`Tezkor test yakunlandi! +${summary.totalXpEarned} XP to'plandi`);
  };

  const handleExitSprint = () => {
    if (searchParams.get('from') === 'learning') {
      router.push('/study');
      return;
    }
    setIsSprintActive(false);
    setQuestions(null);
  };

  const customTopicTitle = searchParams.get('topic_title');
  const isAutostart = searchParams.get('autostart') === 'true';

  // ─────────────────────────────────────────────────────────────
  // 1. TEZKOR YUKLASH HUDI (Shpargalka yoki Turnirdan avto-kirishda)
  // ─────────────────────────────────────────────────────────────
  if (loadingQuestions && isAutostart) {
    const displayTitle = customTopicTitle || "Fokus Sprinti";
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative size-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 animate-spin blur-md opacity-60" />
          <div className="relative size-20 rounded-full bg-zinc-950 border border-amber-500/40 flex items-center justify-center shadow-2xl">
            <Zap className="size-9 text-amber-400 animate-pulse" />
          </div>
        </div>

        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 mb-3 px-3 py-1 font-bold text-xs uppercase tracking-wider">
          ⚡ 3 Daqiqalik Fokus Sprint
        </Badge>

        <h2 className="text-xl sm:text-2xl font-bold text-white max-w-md mb-2 leading-snug">
          &ldquo;{displayTitle}&rdquo;
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed mb-6">
          Shpargalkadagi fakt va qopqonlar asosida 10 ta maxsus saralangan savol tayyorlanmoqda...
        </p>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Loader2 className="size-3.5 animate-spin text-amber-400" />
          <span>Neyron savollar saralanmoqda...</span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. FAOL SPRINT REJIMI (Savol-Javob Ekranı)
  // ─────────────────────────────────────────────────────────────
  if (isSprintActive && questions && questions.length > 0) {
    const chosenSubject = subjects.find((s) => s.id === selectedSubjectId);
    const sprintTitle = customTopicTitle || chosenSubject?.name || questions[0]?.topicTitle || "Fokus Sprinti";

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
  // 3. 1v1 GHOST ARENA REJIMI (Mashq Markazidagi Arena Tabi)
  // ─────────────────────────────────────────────────────────────
  if (activeTab === 'arena') {
    const chosenSubject = subjects.find((s) => s.id === selectedSubjectId);
    const slug = chosenSubject?.slug && chosenSubject.slug !== 'all' ? chosenSubject.slug : 'tarix';

    return (
      <div className="min-h-screen bg-background text-foreground">
        <GhostBattleArena
          subjectSlug={slug}
          onExit={() => {
            setActiveTab('sprint');
            router.push('/sprint');
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. FANNI TANLASH VA SPRINTNI SOZLASH EKRANI (Bento Cockpit UI)
  // ─────────────────────────────────────────────────────────────
  return (
    <ModernAppLayout user={user}>
      <FocusSprintSetup
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
        questionCount={questionCount}
        onSelectCount={setQuestionCount}
        onStart={(subjId, count) => startSprint(subjId, count)}
        onSelectArena={() => {
          setActiveTab('arena');
          router.push('/sprint?tab=arena');
        }}
        loading={loadingQuestions}
      />
    </ModernAppLayout>
  );
}
