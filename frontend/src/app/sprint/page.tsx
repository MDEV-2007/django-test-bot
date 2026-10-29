'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import NeuralSprintView from '@/components/sprint/NeuralSprintView';
import type { QuestionItem, SprintSessionSummary } from '@/types/sprint';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

// Agar tarmoq uzilsa yoki yangi fan bo'lsa zaxira DTM savollari
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
  {
    id: 103,
    topicTitle: "Jadidchilik harakati",
    body: "Turkistonda birinchi yangi usul ('usuli jadid') maktabi 1893-yilda kim tomonidan ochilgan?",
    correctOptionId: 1,
    options: [
      { id: 1, text: "Ismoil Gasprinskiy" },
      { id: 2, text: "Munavvarqori Abdurashidxonov" },
      { id: 3, text: "Mahmudxo'ja Behbudiy" },
      { id: 4, text: "Abdulla Avloniy" },
    ],
  },
];

export default function SprintPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSprintQuestions() {
      try {
        const res = await apiFetch<{ ok: boolean; questions: QuestionItem[] }>('/api/v1/sprint/questions/?count=10');
        if (res?.ok && res.questions?.length > 0) {
          setQuestions(res.questions);
        } else {
          setQuestions(FALLBACK_QUESTIONS);
        }
      } catch (err) {
        setQuestions(FALLBACK_QUESTIONS);
      } finally {
        setLoading(false);
      }
    }
    loadSprintQuestions();
  }, []);

  const handleFinish = (summary: SprintSessionSummary) => {
    toast.success(`Fokus Sprinti yakunlandi! +${summary.totalXpEarned} XP to'plandi`);
  };

  const handleExit = () => {
    router.push('/dashboard');
  };

  if (loading || !questions) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-3 bg-background text-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-bold text-muted-foreground animate-pulse">
          Fokus Sprinti savollari tayyorlanmoqda...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NeuralSprintView
        questions={questions}
        initialDtmScore={178.4}
        initialTopicMastery={45}
        topicTitle={questions[0]?.topicTitle || "Umumiy Tayyorgarlik"}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    </div>
  );
}

