'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import BrandLoader from '@/components/BrandLoader';
import CertificateModal from '@/components/student/CertificateModal';
import { Button } from '@/components/ui/button';

type AttemptDetail = {
  id: number;
  student: string;
  test_title: string;
  score: number | null;
  correct_answers?: number;
  total_questions?: number;
  completed_at?: string | null;
  answers: { question_body: string; is_correct: boolean; selected_choice: string | null }[];
};

export default function PanelAttemptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [certOpen, setCertOpen] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<AttemptDetail>(`/api/panel/attempts/${id}/`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  if (!data) return <PanelShell><div className="p-10"><BrandLoader /></div></PanelShell>;

  const correctCount = data.correct_answers ?? data.answers.filter((a) => a.is_correct).length;
  const totalCount = data.total_questions ?? (data.answers.length || 45);

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{data.test_title}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {data.student} · {data.score !== null ? `${data.score.toFixed(1)}%` : '—'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCertOpen(true)}
            className="gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 shrink-0"
          >
            <Award className="size-4 text-amber-500" /> Sertifikatni ko&apos;rish
          </Button>
        </div>
        <div className="space-y-2">
          {data.answers.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${a.is_correct ? 'border-[var(--success-soft)] bg-[var(--success-soft)]/20' : 'border-[var(--danger-soft)] bg-[var(--danger-soft)]/20'}`}>
              <p className="text-[var(--text-primary)]" dangerouslySetInnerHTML={{ __html: `${i + 1}. ${a.question_body}` }} />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Javob: {a.selected_choice ?? '—'} · {a.is_correct ? "To'g'ri" : "Noto'g'ri"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <CertificateModal
        open={certOpen}
        onOpenChange={setCertOpen}
        studentName={data.student}
        testTitle={data.test_title}
        score={data.score ?? 0}
        correctCount={correctCount}
        totalQuestions={totalCount}
        date={data.completed_at || undefined}
        attemptId={data.id}
      />
    </PanelShell>
  );
}

