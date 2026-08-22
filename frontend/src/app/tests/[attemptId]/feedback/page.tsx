'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Crown, Sparkles, XCircle, RotateCcw, Compass, Lightbulb, ThumbsUp,
  AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Mistake = {
  mavzu: string; savol_mazmuni: string; bola_javobi: string; togri_javob: string;
  nega_muhim?: string; eslab_qolish?: string;
};
type RoadmapStep = { step: number; title: string; duration: string };

type FeedbackData = {
  status: 'pending' | 'ready';
  attempt?: { id: number; score: number; correct_answers: number; wrong_answers: number; skipped_answers: number };
  overall_analysis?: string;
  weak_topics?: string[];
  strong_topics?: string[];
  ai_motivation?: string;
  recommendations?: string;
  predicted_score?: string;
  roadmap?: RoadmapStep[];
  detailed_mistakes?: Mistake[];
  review_items?: {
    question_id: number; body: string; is_correct: boolean; is_skipped: boolean;
    your_answer: string; correct_answer: string; explanation: string; grading_note: string;
  }[];
};

export default function FeedbackPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mistakesError, setMistakesError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!access) return;
    const load = () => {
      apiFetch<FeedbackData>(`/api/tests/attempts/${attemptId}/feedback/`)
        .then((d) => {
          setData(d);
          if (d.status === 'ready' && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
    };
    load();
    pollRef.current = setInterval(load, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [access, attemptId]);

  async function startMistakesTest() {
    setMistakesError(null);
    try {
      const res = await apiFetch<{ attempt_id: number }>('/api/tests/start-mistakes/', { method: 'POST' });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      setMistakesError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  if (error) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 p-6">
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{error}</CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 sm:p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </main>
      </>
    );
  }

  if (data.status === 'pending') {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-4 p-4 sm:p-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Sparkles className="size-8 animate-pulse text-[var(--accent-text)]" />
              <p className="text-sm text-muted-foreground">AI tahlili tayyorlanmoqda... (avtomatik yangilanadi)</p>
            </CardContent>
          </Card>
          <Skeleton className="h-40 w-full" />
        </main>
      </>
    );
  }

  const a = data.attempt!;
  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/tests"><ChevronLeft className="size-4" /> Testlar ro&apos;yxati</Link>
          </Button>
          {a.score < 100 && (
            <Button
              size="sm"
              variant="outline"
              onClick={startMistakesTest}
              className="border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 hover:text-rose-100"
            >
              <RotateCcw className="size-4" /> Xatolar ustida ishlash
            </Button>
          )}
        </div>

        {mistakesError && (
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{mistakesError}</CardContent>
          </Card>
        )}

        {/* Natija */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-3 pt-8 text-center">
            <div className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-text)] to-[var(--success)] bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
              {a.score.toFixed(0)}%
            </div>
            <Progress value={a.score} className="h-2 max-w-sm" />
            <p className="text-xs text-muted-foreground">
              {a.correct_answers} to&apos;g&apos;ri · {a.wrong_answers} xato · {a.skipped_answers} javobsiz
            </p>
            {data.predicted_score && (
              <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 py-1.5 text-amber-300">
                <Crown className="size-4" /> Prognoz Sertifikat: {data.predicted_score} Daraja
              </Badge>
            )}
          </CardContent>
        </Card>

        {data.overall_analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--accent-text)]">
                <Sparkles className="size-4 text-[var(--accent)]" /> Sun&apos;iy Intellekt Tahlili &amp; Tavsiyasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="reading-block text-sm leading-relaxed">{data.overall_analysis}</p>
              {data.ai_motivation && (
                <p className="rounded-2xl border-l-4 border-l-[var(--accent)] bg-[var(--surface-hover)] p-3 text-xs italic text-[var(--text-secondary)]">
                  {data.ai_motivation}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border-[var(--success)]/20 bg-[var(--success)]/5">
            <CardContent className="space-y-2 pt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--success-text)]">
                <ThumbsUp className="size-4" /> Kuchli mavzular
              </h3>
              <div className="space-y-1.5">
                {data.strong_topics?.length ? data.strong_topics.map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-[var(--success)]" />{t}
                  </div>
                )) : <span className="text-xs text-[var(--text-faint)]">Kiritilmagan</span>}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--danger)]/20 bg-[var(--danger)]/5">
            <CardContent className="space-y-2 pt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--danger-text)]">
                <AlertTriangle className="size-4" /> Kuchsiz mavzular
              </h3>
              <div className="space-y-1.5">
                {data.weak_topics?.length ? data.weak_topics.map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-[var(--danger)]" />{t}
                  </div>
                )) : <span className="text-xs text-[var(--text-faint)]">Yo&apos;q</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {!!data.detailed_mistakes?.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircle className="size-4 text-[var(--danger)]" /> Aynan qayerda xato qildingiz?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.detailed_mistakes.map((m, i) => (
                <div key={i} className="space-y-3 rounded-2xl border bg-[var(--surface-input)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/15 text-[var(--accent-text)]">{m.mavzu}</Badge>
                    <span className="text-xs font-bold text-rose-400">Xato javob</span>
                  </div>
                  <p className="text-xs font-bold sm:text-sm">{m.savol_mazmuni}</p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs">
                      <span className="mb-1 block text-xs font-bold uppercase text-rose-400">Sizning javobingiz:</span>
                      <p className="font-semibold text-rose-200">{m.bola_javobi}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-2.5 text-xs">
                      <span className="mb-1 block text-xs font-bold uppercase text-[var(--success-text)]">To&apos;g&apos;ri javob:</span>
                      <p className="font-semibold text-[var(--success-text)]">{m.togri_javob}</p>
                    </div>
                  </div>
                  {m.nega_muhim && <p className="pt-1 text-xs leading-relaxed text-muted-foreground"><strong>Izoh:</strong> {m.nega_muhim}</p>}
                  {m.eslab_qolish && (
                    <p className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs italic text-amber-300">
                      <Lightbulb className="size-4 shrink-0 text-amber-400" /> {m.eslab_qolish}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.recommendations && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Tavsiya etilgan amallar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.recommendations.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--accent-text)]" />
                  <span>{line}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!!data.roadmap?.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Compass className="size-4 text-[var(--accent-text)]" /> Bosqichma-bosqich yo&apos;l xaritasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.roadmap.map((s) => (
                <div key={s.step} className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-hover)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-[var(--accent-text)]">{s.step}</span>
                    <span className="text-xs font-semibold">{s.title}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{s.duration}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!!data.review_items?.length && (
          <section className="space-y-2">
            <h2 className="section-title">Savollar tahlili</h2>
            {data.review_items.map((r) => (
              <Card
                key={r.question_id}
                className={cn(
                  'gap-0 py-0',
                  r.is_correct ? 'border-[var(--success)]/25 bg-[var(--success)]/10'
                    : r.is_skipped ? '' : 'border-[var(--danger)]/25 bg-[var(--danger)]/10',
                )}
              >
                <CardContent className="p-3 text-sm">
                  <p dangerouslySetInnerHTML={{ __html: r.body }} />
                  {r.your_answer && <p className="mt-1 text-xs text-muted-foreground">Sizning javobingiz: {r.your_answer}</p>}
                  {!r.is_correct && r.correct_answer && (
                    <p className="mt-1 text-xs text-muted-foreground">To&apos;g&apos;ri javob: {r.correct_answer}</p>
                  )}
                  {r.grading_note && <p className="mt-1 text-xs italic text-[var(--text-secondary)]">{r.grading_note}</p>}
                  {r.explanation && (
                    <>
                      <Separator className="my-2" />
                      <p className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                        <Lightbulb className="size-3.5 shrink-0 text-amber-400" /> {r.explanation}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
