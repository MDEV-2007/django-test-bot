'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import ShareToCommunityModal from '@/components/student/ShareToCommunityModal';

type HistoryEntry = {
  id: number; test_title: string; score: number | null;
  correct_answers: number; wrong_answers: number; skipped_answers: number; completed_at: string;
};

type HistoryResponse = {
  results: HistoryEntry[]; page: number; num_pages: number; has_next: boolean; has_prev: boolean;
};

export default function HistoryPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sharingAttempt, setSharingAttempt] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<HistoryResponse>(`/api/tests/history/?page=${page}`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, page]);

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-8 p-4 pb-12 sm:p-6">
        {/* Sarlavha */}
        <section className="relative grid items-end gap-6 pt-2 sm:grid-cols-[1fr_auto]">
          <div>
            <Link href="/tests" className="ps-chip w-fit transition-transform hover:-translate-x-0.5">
              <ChevronLeft className="size-4" /> Testlar
            </Link>
            <p className="ps-eyebrow mt-6 text-[var(--text-muted)]">Arxiv va natijalar</p>
            <h1 className="ps-display mt-3 text-[44px] sm:text-[64px]">
              Testlar <span className="text-[var(--ps-purple)]">tarixi</span>
              <span className="text-[var(--ps-coral)]">.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] text-[var(--text-secondary)]">
              Barcha topshirilgan imtihonlaringiz, natijalari va ularni hamjamiyatga ulashish.
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-3 rounded-[28px] bg-[#080808] px-6 py-5 text-[#FFFCF7]">
              <History className="size-6 text-[var(--ps-orange)]" />
              <div>
                <p className="ps-num text-[40px]">{data.results.length}</p>
                <p className="text-[11px] font-semibold text-white/60">shu sahifada</p>
              </div>
            </div>
          )}
        </section>

        {!data && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] w-full rounded-[28px] bg-white/40" />)}
          </div>
        )}

        {data?.results.length === 0 && (
          <div className="ps-card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
              <History className="size-7" />
            </span>
            <p className="ps-display mt-4 text-[26px]">Hali test yechilmagan</p>
            <Link href="/tests" className="ps-btn ps-btn-ink mt-5">
              Birinchi testni boshlash
              <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {data?.results.map((e) => {
            const score = e.score;
            const tone =
              score === null ? 'bg-[var(--ps-neutral)] text-[var(--text-primary)]' :
              score >= 80 ? 'bg-[var(--ps-green)] text-white' :
              score >= 50 ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-coral)] text-white';
            return (
              <div key={e.id} className="ps-card ps-lift group flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <Link href={`/tests/${e.id}/feedback`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className={cn('flex size-16 shrink-0 flex-col items-center justify-center rounded-[20px]', tone)}>
                    <span className="ps-num text-[22px]">{score !== null ? `${score.toFixed(0)}%` : '—'}</span>
                  </span>
                  <span className="min-w-0 space-y-1.5">
                    <span className="ps-display block truncate text-[18px] sm:text-[20px]">{e.test_title}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[var(--text-muted)]">
                        {new Date(e.completed_at).toLocaleString('uz-UZ')}
                      </span>
                      <span className="rounded-full bg-[var(--ps-green)]/15 px-2.5 py-1 text-[var(--ps-green)]">{e.correct_answers} to&apos;g&apos;ri</span>
                      <span className="rounded-full bg-[var(--ps-coral)]/15 px-2.5 py-1 text-[var(--ps-coral)]">{e.wrong_answers} xato</span>
                      <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[var(--text-muted)]">{e.skipped_answers} javobsiz</span>
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setSharingAttempt(e)}
                    className="ps-chip cursor-pointer !bg-[var(--ps-purple)] !text-white"
                  >
                    <Sparkles className="size-3.5" /> Hamjamiyatga qo&apos;yish
                  </button>
                  <Link
                    href={`/tests/${e.id}/feedback`}
                    aria-label="Natijani ko'rish"
                    className="flex size-11 items-center justify-center rounded-full bg-[#080808] text-[#FFFCF7] transition-transform group-hover:-rotate-45 dark:bg-[#FFFCF7] dark:text-[#080808]"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {data && data.num_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button type="button" disabled={!data.has_prev} onClick={() => setPage((p) => p - 1)} className="ps-btn ps-btn-ghost">
              <ChevronLeft className="size-4" /> Oldingi
            </button>
            <span className="ps-chip">Sahifa {data.page} / {data.num_pages}</span>
            <button type="button" disabled={!data.has_next} onClick={() => setPage((p) => p + 1)} className="ps-btn ps-btn-ink">
              Keyingi <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {sharingAttempt && (
          <ShareToCommunityModal
            open={Boolean(sharingAttempt)}
            onOpenChange={(open) => {
              if (!open) setSharingAttempt(null);
            }}
            attemptId={sharingAttempt.id}
            testTitle={sharingAttempt.test_title}
            score={sharingAttempt.score || 0}
            correctCount={sharingAttempt.correct_answers}
            totalQuestions={(sharingAttempt.correct_answers || 0) + (sharingAttempt.wrong_answers || 0) + (sharingAttempt.skipped_answers || 0)}
          />
        )}
      </main>
    </div>
  );
}
