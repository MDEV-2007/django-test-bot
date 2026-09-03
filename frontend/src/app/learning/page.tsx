'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Volume2, Lock, ChevronRight, Layers, PlayCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TopicRef = { id: number; title: string; lessons: { id: number; title: string }[] };
type LessonDetail = {
  id: number; title: string; content: string; topic: string | null; is_bookmarked: boolean;
  locked_videos_count: number; locked_audios_count: number;
  videos: { id: number; title: string; video_url: string; duration_display: string }[];
  audios: { id: number; title: string; audio_url: string; duration_display: string }[];
  flashcards: { front: string; back: string }[];
};
type CenterData = {
  subjects: { id: number; name: string; slug: string }[]; selected_subject: string | null;
  history_topics: TopicRef[]; certificate_topics: TopicRef[]; bba_topics: TopicRef[];
  has_lessons_access: boolean; lesson: LessonDetail | null;
};

export default function LearningPage() {
  return (
    <Suspense fallback={null}>
      <LearningPageInner />
    </Suspense>
  );
}

function LearningPageInner() {
  const { access } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('lesson_id');
  const [subject, setSubject] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const params = new URLSearchParams();
  if (lessonId) params.set('lesson_id', lessonId);
  if (subject) params.set('subject', subject);
  const query = params.toString() ? `?${params.toString()}` : '';

  const { data, refresh } = useApiQuery<CenterData>(`/api/learning/${query}`);

  useEffect(() => {
    if (!data) return;
    setSubject((prev) => prev ?? (data.selected_subject || null));
    setFlipped({});
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleBookmark() {
    if (!data?.lesson) return;
    const res = await apiFetch<{ bookmarked: boolean }>(`/api/learning/toggle-bookmark/${data.lesson.id}/`, { method: 'POST' });
    refresh();
    toast.success(res.bookmarked ? 'Dars saqlandi' : 'Saqlanganlardan olib tashlandi');
  }

  const allTopics = data ? [...data.history_topics, ...data.certificate_topics, ...data.bba_topics] : [];
  const lesson = data?.lesson;

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        {data && data.subjects.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {data.subjects.map((s) => (
              <Button
                key={s.slug}
                size="sm"
                variant="outline"
                className={cn('shrink-0 rounded-full', subject === s.slug && 'chip-active')}
                onClick={() => setSubject(s.slug)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}

        {data && !data.has_lessons_access && (
          <Card className="border-[var(--tone-premium)]/25 bg-[var(--tone-premium-soft)] transition-colors hover:border-[var(--tone-premium)]/45">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex items-start gap-2.5">
                <Lock className="mt-0.5 size-4 shrink-0 text-[var(--tone-premium-text)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong>Premium imtiyozi:</strong> barcha audio konspektlar va video darslarga to&apos;liq kirish.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200">
                <Link href="/premium">Tariflarni ko&apos;rish <ChevronRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!data && (
          <div className="grid gap-6 md:grid-cols-12">
            <Skeleton className="h-96 md:col-span-4" />
            <Skeleton className="h-96 md:col-span-8" />
          </div>
        )}

        {data && (
          <div className="grid gap-6 md:grid-cols-12">
            {/* Mavzular ro'yxati */}
            <div className="space-y-3 md:col-span-4">
              <h2 className="section-title">Mavzular & darslar</h2>
              <div className="space-y-4 md:max-h-[70vh] md:overflow-y-auto md:pr-1">
                {allTopics.map((t) => (
                  <div key={t.id} className="space-y-1.5">
                    {/* Mavzu sarlavhasi bosiladigan element emas — darsi yo'q mavzular
                        "nofaol tugma" ga o'xshamasligi uchun holati aniq yoziladi. */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="section-title truncate">{t.title}</p>
                      <Badge variant="secondary" className="shrink-0">{t.lessons.length}</Badge>
                    </div>
                    {t.lessons.length === 0 && (
                      <p className="px-1 text-xs italic text-muted-foreground">Darslar tayyorlanmoqda</p>
                    )}
                    {t.lessons.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => router.push(`/learning?lesson_id=${l.id}`)}
                        className={cn(
                          'tactile-btn flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                          lesson?.id === l.id
                            ? 'border-transparent bg-primary font-medium text-[var(--on-accent)]'
                            : 'bg-card text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-foreground',
                        )}
                      >
                        <span className="min-w-0 truncate">{l.title}</span>
                        <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                      </button>
                    ))}
                  </div>
                ))}
                {allTopics.length === 0 && (
                  <p className="text-sm text-muted-foreground">Bu bo&apos;limda hozircha mavzu yo&apos;q.</p>
                )}
              </div>
            </div>

            {/* Dars */}
            <div className="space-y-5 md:col-span-8">
              {!lesson && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BookOpen className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Chapdan bir dars tanlang.</p>
                  </CardContent>
                </Card>
              )}

              {lesson && (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        {lesson.topic && <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">{lesson.topic}</Badge>}
                        <Button
                          variant={lesson.is_bookmarked ? 'default' : 'outline'}
                          size="icon"
                          onClick={toggleBookmark}
                          title="Saqlab qo'yish"
                          className={lesson.is_bookmarked ? 'bg-primary/20 text-[var(--accent-text)] hover:bg-primary/30' : ''}
                        >
                          <Star className={cn('size-4', lesson.is_bookmarked && 'fill-[var(--accent)]')} />
                        </Button>
                      </div>
                      <CardTitle className="font-voice text-xl leading-snug sm:text-2xl">{lesson.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Separator />
                      <div
                        className="reading-block space-y-3 text-[var(--text-secondary)]"
                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                      />

                      {lesson.videos.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border bg-[var(--surface-input)] p-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-300">
                              <PlayCircle className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{v.title}</p>
                              <p className="text-xs text-muted-foreground">{v.duration_display}</p>
                            </div>
                          </div>
                          <Button asChild size="sm" className="shrink-0">
                            <a href={v.video_url} target="_blank" rel="noreferrer">Ko&apos;rish</a>
                          </Button>
                        </div>
                      ))}
                      {lesson.locked_videos_count > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-rose-400">
                          <Lock className="size-3.5" /> {lesson.locked_videos_count} ta video premium uchun yopiq
                        </p>
                      )}

                      {lesson.audios.map((a) => (
                        <div key={a.id} className="space-y-2 rounded-xl border bg-[var(--surface-input)] p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-[var(--accent-text)]">
                              <Volume2 className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{a.title}</p>
                              <p className="text-xs text-muted-foreground">{a.duration_display}</p>
                            </div>
                          </div>
                          <audio src={a.audio_url} controls className="h-8 w-full" />
                        </div>
                      ))}
                      {lesson.locked_audios_count > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-rose-400">
                          <Lock className="size-3.5" /> {lesson.locked_audios_count} ta audio premium uchun yopiq
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {lesson.flashcards.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="section-title flex items-center gap-1.5">
                          <Layers className="size-3.5 text-[var(--accent-text)]" /> Interaktiv flashcardlar
                        </h3>
                        <span className="text-xs text-muted-foreground">Kartani bosib javobni tekshiring</span>
                      </div>
                      <div className="grid gap-3.5 sm:grid-cols-2">
                        {lesson.flashcards.map((f, i) => {
                          const isFlipped = !!flipped[i];
                          return (
                            <Card
                              key={i}
                              onClick={() => setFlipped({ ...flipped, [i]: !isFlipped })}
                              className={cn(
                                'tactile-btn min-h-32 cursor-pointer justify-between transition-colors',
                                isFlipped ? 'border-[var(--accent)] bg-primary/[0.12]' : 'hover:border-[var(--border-strong)]',
                              )}
                            >
                              <CardContent className="flex h-full flex-col justify-between pt-6">
                                <div>
                                  <span className="mb-1.5 block font-mono text-xs font-bold uppercase text-muted-foreground">
                                    {isFlipped ? 'Javob / izoh' : 'Savol'}
                                  </span>
                                  <p className={cn('text-sm font-medium leading-relaxed', isFlipped && 'text-[var(--accent-text)]')}>
                                    {isFlipped ? f.back : f.front}
                                  </p>
                                </div>
                                <span className="mt-3 text-right text-xs text-muted-foreground">
                                  {isFlipped ? 'Qaytarish ↺' : "Javobni ko'rish ↷"}
                                </span>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
