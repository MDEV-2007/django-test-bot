'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import BrandLoader from '@/components/BrandLoader';

type AttemptDetail = {
  id: number; student: string; test_title: string; score: number | null;
  answers: { question_body: string; is_correct: boolean; selected_choice: string | null }[];
};

export default function PanelAttemptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<AttemptDetail>(`/api/panel/attempts/${id}/`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  if (!data) return <PanelShell><div className="p-10"><BrandLoader /></div></PanelShell>;

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{data.test_title}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {data.student} · {data.score !== null ? `${data.score.toFixed(0)}%` : '—'}
        </p>
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
    </PanelShell>
  );
}
