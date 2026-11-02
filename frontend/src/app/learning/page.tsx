'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Volume2, Lock, ChevronRight, Layers, PlayCircle, BookOpen,
  Zap, Sparkles, Flame, Clock, ArrowRight, ShieldAlert, CheckCircle2,
} from 'lucide-react';
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
import LessonAudioPlayer from '@/components/learning/LessonAudioPlayer';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import TopicCheatSheetView from '@/components/study/TopicCheatSheetView';
import { useFeatureFlags } from '@/lib/features';
import { tgHaptic } from '@/lib/telegram';
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
  const { isEnabled } = useFeatureFlags();
  const { access } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('lesson_id');
  const urlTopicId = searchParams.get('topic_id');
  const urlView = searchParams.get('view');

  const [subject, setSubject] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  // Study Mode: 'cheatsheet' (60s Anti-Darslik) or 'lesson' (To'liq matnli dars)
  const [studyMode, setStudyMode] = useState<'cheatsheet' | 'lesson'>(
    urlView === 'lesson' || lessonId ? 'lesson' : 'cheatsheet'
  );
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    urlTopicId ? parseInt(urlTopicId, 10) : null
  );
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>('');

  const params = new URLSearchParams();
  if (lessonId) params.set('lesson_id', lessonId);
  if (selectedTopicId) params.set('topic_id', selectedTopicId.toString());
  if (subject) params.set('subject', subject);
  const query = params.toString() ? `?${params.toString()}` : '';

  const { data, refresh } = useApiQuery<CenterData>(`/api/learning/${query}`);

  if (!isEnabled('learning')) {
    return (
      <ComingSoonFeature
        title="Darslar & Konspektlar"
        badge="Tez kunda"
        description="Mavzulashtirilgan video darslar, audio ma'ruzalar va yuklab olinuvchi konspektlar moduli tez kunda taqdim etiladi."
      />
    );
  }

  const allTopics = data ? [...data.history_topics, ...data.certificate_topics, ...data.bba_topics] : [];
  const lesson = data?.lesson;

  useEffect(() => {
    if (!data) return;
    setSubject((prev) => prev ?? (data.selected_subject || null));
    setFlipped({});
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Topic selection on data load or subject switch
  useEffect(() => {
    if (!allTopics || allTopics.length === 0) {
      setSelectedTopicId(null);
      setSelectedTopicTitle('');
      return;
    }

    // Tekshiramiz: joriy selectedTopicId yangi fanning mavzulari ichida bormi?
    const currentTopic = selectedTopicId
      ? allTopics.find((t) => t.id === selectedTopicId)
      : null;

    if (!currentTopic) {
      if (lesson?.topic) {
        const found = allTopics.find((t) => t.title.toLowerCase() === lesson.topic?.toLowerCase());
        if (found) {
          setSelectedTopicId(found.id);
          setSelectedTopicTitle(found.title);
          return;
        }
      }
      setSelectedTopicId(allTopics[0].id);
      setSelectedTopicTitle(allTopics[0].title);
    } else if (!selectedTopicTitle) {
      setSelectedTopicTitle(currentTopic.title);
    }
  }, [allTopics, selectedTopicId, lesson, selectedTopicTitle]);

  function handleSubjectChange(newSlug: string) {
    if (newSlug === subject) return;
    tgHaptic('select');
    setSubject(newSlug);
    setSelectedTopicId(null);
    setSelectedTopicTitle('');
    router.push(`/learning?subject=${newSlug}`);
  }

  async function toggleBookmark() {
    if (!data?.lesson) return;
    const res = await apiFetch<{ bookmarked: boolean }>(`/api/learning/toggle-bookmark/${data.lesson.id}/`, { method: 'POST' });
    refresh();
    toast.success(res.bookmarked ? 'Dars saqlandi' : 'Saqlanganlardan olib tashlandi');
  }

  function handleSelectTopic(topicId: number, topicTitle: string) {
    tgHaptic('select');
    setSelectedTopicId(topicId);
    setSelectedTopicTitle(topicTitle);
    const targetTopic = allTopics.find((t) => t.id === topicId);
    const firstLessonId = targetTopic?.lessons?.[0]?.id;
    if (studyMode === 'lesson') {
      if (firstLessonId) {
        router.push(`/learning?lesson_id=${firstLessonId}&topic_id=${topicId}&view=lesson${subject ? `&subject=${subject}` : ''}`);
      } else {
        // Agar bu mavzuda alohida matn bo'lmasa, avtomatik 60s Shpargalkani ochamiz
        setStudyMode('cheatsheet');
        router.push(`/learning?topic_id=${topicId}&view=cheatsheet${subject ? `&subject=${subject}` : ''}`);
      }
    } else {
      router.push(`/learning?topic_id=${topicId}&view=cheatsheet${subject ? `&subject=${subject}` : ''}`);
    }
  }

  function handleSelectTopicCheatSheet(topicId: number, topicTitle: string) {
    tgHaptic('select');
    setSelectedTopicId(topicId);
    setSelectedTopicTitle(topicTitle);
    setStudyMode('cheatsheet');
    router.push(`/learning?topic_id=${topicId}&view=cheatsheet${subject ? `&subject=${subject}` : ''}`);
  }

  function handleSelectLesson(lId: number, tId: number, tTitle: string) {
    tgHaptic('light');
    setSelectedTopicId(tId);
    setSelectedTopicTitle(tTitle);
    setStudyMode('lesson');
    router.push(`/learning?lesson_id=${lId}&topic_id=${tId}&view=lesson${subject ? `&subject=${subject}` : ''}`);
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-20 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. HERO BANNER: 60-SONIYALIK ANTI-DARSLIK */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5 sm:p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-10 -bottom-10 size-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-white">
                <Zap className="size-3.5 fill-amber-300 text-amber-300" />
                <span>Anti-Darslik: 60 Soniyalik Shpargalka Xaritasi</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                800 betlik kitobni o&apos;qishga vaqt sarflamang!
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                Mavzuni 60 soniyada skaner qiling: faqat imtihonda tushadigan <strong>Oltin Faktlar</strong>, <strong>BMB Qopqonlari</strong> va 3 daqiqalik <strong>Sprint</strong> mashqi bilan mustahkamlang!
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                onClick={() => {
                  tgHaptic('select');
                  setStudyMode('cheatsheet');
                  if (!selectedTopicId && allTopics.length > 0) {
                    setSelectedTopicId(allTopics[0].id);
                    setSelectedTopicTitle(allTopics[0].title);
                  }
                }}
                size="lg"
                className="rounded-xl bg-white text-orange-700 hover:bg-orange-50 font-black shadow-md h-11 px-5 cursor-pointer text-xs sm:text-sm active:scale-95 transition-all"
              >
                <Zap className="size-4 mr-1.5 fill-current" />
                60s Shpargalkani ko&apos;rish
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUBJECTS FILTER PILLS */}
        {/* ========================================================================= */}
        {data && data.subjects.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {data.subjects.map((s) => (
              <Button
                key={s.slug}
                size="sm"
                variant="outline"
                className={cn('shrink-0 rounded-full font-semibold cursor-pointer', subject === s.slug && 'chip-active')}
                onClick={() => handleSubjectChange(s.slug)}
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
            <Skeleton className="h-96 md:col-span-4 rounded-3xl" />
            <Skeleton className="h-96 md:col-span-8 rounded-3xl" />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MAIN WORKSPACE: LEFT TOPICS + RIGHT CONTENT */}
        {/* ========================================================================= */}
        {data && (
          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* ─────────────────────────────────────────────────────────────
                LEFT: MAVZULAR RO'YXATI (Topics with 1-Click Cheat-Sheet buttons)
               ───────────────────────────────────────────────────────────── */}
            <div className="space-y-3 md:col-span-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="section-title text-base font-bold flex items-center gap-1.5">
                  <BookOpen className="size-4 text-primary" />
                  <span>Mavzular & Darslar</span>
                </h2>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {allTopics.length} ta mavzu
                </Badge>
              </div>

              <div className="space-y-3 md:max-h-[75vh] md:overflow-y-auto md:pr-1">
                {allTopics.map((t) => {
                  const isTopicActive = selectedTopicId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded-2xl border p-3 space-y-2.5 transition-all shadow-2xs',
                        isTopicActive
                          ? 'border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/30'
                          : 'border-border/70 bg-card hover:border-border'
                      )}
                    >
                      {/* Topic Header: Clickable to open Cheat-Sheet or Lesson depending on active mode */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => handleSelectTopic(t.id, t.title)}
                          className="min-w-0 flex-1 cursor-pointer group"
                        >
                          <h4 className="font-extrabold text-sm text-foreground group-hover:text-amber-500 transition-colors leading-snug">
                            {t.title}
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            {t.lessons.length > 0 ? `${t.lessons.length} ta darslik` : 'Matnli dars & Shpargalka'}
                          </span>
                        </div>

                        {/* 1-Click 60s Cheat-Sheet Pill Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTopicCheatSheet(t.id, t.title);
                          }}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-2xs',
                            isTopicActive && studyMode === 'cheatsheet'
                              ? 'bg-amber-500 text-black shadow-amber-500/20'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                          )}
                          title="60 soniyalik shpargalkani ochish"
                        >
                          <Zap className="size-3 fill-current" />
                          <span>60s</span>
                        </button>
                      </div>

                      {/* Lessons list under this topic */}
                      {t.lessons.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/40">
                          {t.lessons.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => handleSelectLesson(l.id, t.id, t.title)}
                              className={cn(
                                'tactile-btn flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                                lesson?.id === l.id && studyMode === 'lesson'
                                  ? 'border-transparent bg-primary font-bold text-white'
                                  : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <span className="min-w-0 truncate">{l.title}</span>
                              <ChevronRight className="size-3 shrink-0 opacity-60" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {allTopics.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">Bu bo&apos;limda hozircha mavzu yo&apos;q.</p>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                RIGHT: CHOSEN VIEW (60s Anti-Darslik Cheat-Sheet OR Full Lesson)
               ───────────────────────────────────────────────────────────── */}
            <div className="space-y-4 md:col-span-8">
              {allTopics.length === 0 ? (
                <Card className="rounded-[28px] border border-border/80 p-8 sm:p-14 text-center bg-card/60 backdrop-blur-sm">
                  <CardContent className="space-y-4 max-w-md mx-auto p-0">
                    <div className="size-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles className="size-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl font-black text-foreground">
                        {data?.subjects?.find((s) => s.slug === subject)?.name || "Ushbu fan"} bo&apos;yicha darslar tayyorlanmoqda
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Tez kunda {data?.subjects?.find((s) => s.slug === subject)?.name || "ushbu fan"} bo&apos;yicha 60 soniyalik Shpargalkalar, BMB Qopqonlari va audio konspektlar yuklanadi. Hozirda Tarix fanining barcha darslari to&apos;liq mavjud!
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        onClick={() => handleSubjectChange('tarix')}
                        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                      >
                        Tarix darslarini ko&apos;rish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Mode Switcher Tabs */}
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/60 border border-border/70 p-1.5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          tgHaptic('select');
                          setStudyMode('cheatsheet');
                          if (selectedTopicId) {
                            router.push(`/learning?topic_id=${selectedTopicId}&view=cheatsheet${subject ? `&subject=${subject}` : ''}`);
                          }
                        }}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer select-none',
                          studyMode === 'cheatsheet'
                            ? 'bg-amber-500 text-black shadow-sm font-black'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        )}
                      >
                        <Zap className="size-4 fill-current" />
                        <span>⚡ 60s Anti-Darslik</span>
                        <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-[10px] font-mono uppercase">
                          Tavsiya
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          tgHaptic('select');
                          setStudyMode('lesson');
                          if (selectedTopicId) {
                            const targetTopic = allTopics.find((t) => t.id === selectedTopicId);
                            const firstLessonId = targetTopic?.lessons?.[0]?.id;
                            if (firstLessonId) {
                              router.push(`/learning?lesson_id=${firstLessonId}&topic_id=${selectedTopicId}&view=lesson${subject ? `&subject=${subject}` : ''}`);
                            } else {
                              router.push(`/learning?topic_id=${selectedTopicId}&view=lesson${subject ? `&subject=${subject}` : ''}`);
                            }
                          }
                        }}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer select-none',
                          studyMode === 'lesson'
                            ? 'bg-card text-foreground shadow-sm border border-border/50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        )}
                      >
                        <BookOpen className="size-4" />
                        <span>📖 To&apos;liq Matnli Dars</span>
                      </button>
                    </div>

                    {selectedTopicTitle && (
                      <span className="text-xs font-semibold text-muted-foreground px-2 truncate max-w-xs hidden lg:inline">
                        {selectedTopicTitle}
                      </span>
                    )}
                  </div>

                  {/* VIEW 1: 60-SONIYALIK ANTI-DARSLIK (Shpargalka & BMB Qopqonlari) */}
                  {studyMode === 'cheatsheet' && (
                    <div className="space-y-4">
                      <TopicCheatSheetView
                        topicId={selectedTopicId || allTopics[0]?.id || 1}
                        topicTitle={selectedTopicTitle || allTopics[0]?.title || 'Mavzu'}
                      />
                    </div>
                  )}

                  {/* VIEW 2: TO'LIQ MATNLI DARS (Konspekt, Audio, Video, Flashcard) */}
                  {studyMode === 'lesson' && (
                <>
                  {!lesson && (
                    <Card className="rounded-[28px] border-border/80">
                      <CardContent className="py-16 text-center space-y-3">
                        <BookOpen className="mx-auto size-10 text-amber-500/60" />
                        <div className="space-y-1">
                          <p className="text-base font-bold text-foreground">
                            {selectedTopicTitle ? `${selectedTopicTitle} uchun 60s Shpargalka tayyor` : 'Dars tanlanmagan'}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Ushbu mavzuning to&apos;liq matni o&apos;rniga 60 soniyalik tezkor Shpargalka, asosiy faktlar va BMB qopqonlaridan foydalanishingiz mumkin.
                          </p>
                        </div>
                        <Button
                          onClick={() => setStudyMode('cheatsheet')}
                          className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black cursor-pointer shadow-md shadow-amber-500/20"
                        >
                          <Zap className="size-4 mr-1.5 fill-current" />
                          60s Shpargalkani ochish
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {lesson && (
                    <>
                      {/* Quick CTA to Cheat-Sheet */}
                      <div
                        onClick={() => setStudyMode('cheatsheet')}
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/12 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                            <Zap className="size-4 fill-current" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                              Matnni o&apos;qishga vaqt yo&apos;qmi? 60 soniyalik Shpargalkani oching!
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Faqat imtihonda tushadigan faktlar va BMB qopqonlari
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-xl shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs">
                          Ochish <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      </div>

                      <Card className="rounded-[28px] border-border/80 shadow-md">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            {lesson.topic && <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary font-bold">{lesson.topic}</Badge>}
                            <Button
                              variant={lesson.is_bookmarked ? 'default' : 'outline'}
                              size="icon"
                              onClick={toggleBookmark}
                              title="Saqlab qo'yish"
                              className={lesson.is_bookmarked ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}
                            >
                              <Star className={cn('size-4', lesson.is_bookmarked && 'fill-current')} />
                            </Button>
                          </div>
                          <CardTitle className="font-voice text-xl leading-snug sm:text-2xl">{lesson.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Separator />
                          <div
                            className="reading-block space-y-3 text-muted-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                          />

                          {lesson.videos.map((v) => (
                            <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                                  <PlayCircle className="size-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{v.title}</p>
                                  <p className="text-xs text-muted-foreground">{v.duration_display}</p>
                                </div>
                              </div>
                              <Button asChild size="sm" className="shrink-0 rounded-xl font-bold">
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
                            <LessonAudioPlayer
                              key={a.id}
                              audioUrl={a.audio_url}
                              title={a.title}
                              durationDisplay={a.duration_display}
                            />
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
                            <h3 className="section-title flex items-center gap-1.5 text-sm font-bold">
                              <Layers className="size-4 text-primary" /> Interaktiv flashcardlar
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
                                    'tactile-btn min-h-32 cursor-pointer justify-between transition-colors rounded-2xl',
                                    isFlipped ? 'border-primary/40 bg-primary/[0.08]' : 'hover:border-border',
                                  )}
                                >
                                  <CardContent className="flex h-full flex-col justify-between pt-6">
                                    <div>
                                      <span className="mb-1.5 block font-mono text-xs font-bold uppercase text-muted-foreground">
                                        {isFlipped ? 'Javob / izoh' : 'Savol'}
                                      </span>
                                      <p className={cn('text-sm font-medium leading-relaxed', isFlipped && 'text-primary font-bold')}>
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
                </>
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
