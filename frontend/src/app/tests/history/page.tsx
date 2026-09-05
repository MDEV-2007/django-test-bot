'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type HistoryEntry = {
  id: number; test_title: string; score: number | null;
  correct_answers: number; wrong_answers: number; skipped_answers: number; completed_at: string;
};

type HistoryResponse = {
  results: HistoryEntry[]; page: number; num_pages: number; has_next: boolean; has_prev: boolean;
};

function scoreTone(score: number | null) {
  if (score === null) return 'bg-[var(--surface-hover)] text-[var(--text-secondary)]';
  if (score >= 80) return 'bg-[var(--success)]/20 text-[var(--success-text)]';
  if (score >= 50) return 'bg-amber-500/20 text-amber-300';
  return 'bg-rose-500/20 text-rose-300';
}

export default function HistoryPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!access) return;
    apiFetch<HistoryResponse>(`/api/tests/history/?page=${page}`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, page]);

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="indigo"
          eyebrow="Arxiv"
          eyebrowIcon={History}
          title="Topshirilgan Testlar Tarixi"
          description="Barcha topshirilgan imtihonlaringiz va ularning to'liq tahliliy hisoboti."
        />

        {!data && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[86px] w-full" />)}
          </div>
        )}

        {data?.results.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <History className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hali test yechilmagan.</p>
              <Button asChild size="sm" className="mt-4"><Link href="/tests">Birinchi testni boshlash</Link></Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {data?.results.map((e) => (
            <Link key={e.id} href={`/tests/${e.id}/feedback`} className="group block">
              <Card className="gap-0 py-0 transition-colors group-hover:border-[var(--accent)]/40">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-sm font-bold transition-colors group-hover:text-[var(--accent-text)]">{e.test_title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.completed_at).toLocaleString('uz-UZ')} · <span className="text-[var(--success-text)]">{e.correct_answers} to&apos;g&apos;ri</span>, <span className="text-[var(--danger-text)]">{e.wrong_answers} xato</span>, <span>{e.skipped_answers} javobsiz</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn('rounded-xl px-3 py-1 text-base font-black', scoreTone(e.score))}>
                      {e.score !== null ? `${e.score.toFixed(0)}%` : '—'}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-[var(--accent-text)]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {data && data.num_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={!data.has_prev} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Oldingi
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Sahifa {data.page} / {data.num_pages}</span>
            <Button variant="outline" size="sm" disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>
              Keyingi <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
