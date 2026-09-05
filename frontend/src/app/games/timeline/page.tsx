'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { celebrate } from '@/lib/confetti';
import {
  History, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, Coins,
  Calendar, PartyPopper, XCircle, Zap,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

type Event = { id: number; title: string };
type Subject = { id: number; name: string; slug: string };
type TimelineData = { events: Event[]; subjects: Subject[]; selected_subject: string | null };
type Result = { correct: boolean; xp?: number; coins?: number; correct_order?: { id: number; title: string; year: number }[] };

export default function TimelineGamePage() {
  const { access } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const load = () => {
    setResult(null);
    const q = subject ? `?subject=${subject}` : '';
    apiFetch<TimelineData>(`/api/games/timeline/${q}`).then((d) => {
      setEvents(d.events);
      setSubjects(d.subjects);
      setSubject((prev) => prev ?? d.selected_subject);
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  };
  useEffect(() => { if (access) load(); }, [access, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(i: number, dir: -1 | 1) {
    if (result) return;
    const arr = [...events];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setEvents(arr);
  }

  async function submit() {
    const res = await apiFetch<Result>('/api/games/timeline/', {
      method: 'POST', body: JSON.stringify({ event_ids: events.map((e) => e.id) }),
    });
    setResult(res);
    if (res.correct) {
      soundFX.correct();
      try { celebrate({ particleCount: 80, spread: 60, origin: { y: 0.6 } }); } catch { /* noop */ }
    } else {
      soundFX.incorrect();
    }
  }

  const yearOf = (id: number) => result?.correct_order?.find((e) => e.id === id)?.year;

  return (
    <>
      <AppShell />
      <main className="page-shell-focus flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="sky"
          eyebrow="Xronologik ketma-ketlik"
          eyebrowIcon={History}
          title="Tarixiy Voqealar Zanjiri"
          description="Voqealarni eng qadimgisidan boshlab to'g'ri xronologik tartibda (yuqoridan pastga) joylashtiring."
          actions={
            <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-400">
              <Zap className="size-3" /> +100 XP · <Coins className="size-3" /> 10
            </Badge>
          }
        />

        {subjects.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {subjects.map((s) => (
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

        {events.length < 4 && !result && (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Bu fanda hozircha yetarli voqea yo&apos;q.</p>
            </CardContent>
          </Card>
        )}

        {/* `layout` — element joyini almashtirganda FIZIK ravishda ko'chadi (sakramaydi).
            Xronologiya o'yinining butun mohiyati tartibni o'zgartirish bo'lgani uchun
            bu yerdagi eng sezilarli yaxshilanish shu. */}
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
          {events.map((e, i) => {
            const year = yearOf(e.id);
            const correctOrder = result?.correct_order;
            const isCorrectPos = correctOrder ? correctOrder[i]?.id === e.id : null;
            return (
              <motion.div key={e.id} layout={!reduce} transition={spring}>
              <Card
                className={cn(
                  'gap-0 py-4 transition-colors',
                  result && (isCorrectPos
                    ? 'border-[var(--success)]/40 bg-[var(--success)]/[0.08]'
                    : 'border-rose-500/40 bg-rose-500/[0.08]'),
                )}
              >
                <CardContent className="flex items-center justify-between gap-4 px-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border bg-[var(--surface-input)] font-mono text-xs font-bold text-[var(--accent-text)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{e.title}</p>
                      {result && year && (
                        <p className="mt-1 flex items-center gap-1 font-mono text-xs font-bold text-[var(--accent-text)]">
                          <Calendar className="size-3" /> {year}-yil
                        </p>
                      )}
                    </div>
                  </div>
                  {!result && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button variant="outline" size="icon" className="size-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yuqoriga">
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="size-8" disabled={i === events.length - 1} onClick={() => move(i, 1)} aria-label="Pastga">
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>

        {events.length >= 4 && !result && (
          <Button onClick={submit} className="w-full" size="lg">
            <CheckCircle2 className="size-4" /> Ketma-ketlikni tekshirish
          </Button>
        )}

        {result && (
          <div className="space-y-4">
            <Card className={cn(result.correct ? 'border-[var(--success)]/30 bg-[var(--success)]/[0.08]' : 'border-rose-500/30 bg-rose-500/[0.08]')}>
              <CardContent className="flex items-center justify-center gap-2 py-5 text-center text-sm font-semibold">
                {result.correct
                  ? <><PartyPopper className="size-4 shrink-0 text-[var(--success-text)]" /> <span className="text-[var(--success-text)]">Barakalla! To&apos;g&apos;ri tartib topildi! +{result.xp} XP, +{result.coins} tanga</span></>
                  : <><XCircle className="size-4 shrink-0 text-rose-300" /> <span className="text-rose-300">Ketma-ketlikda xatolik bor. Yillar ko&apos;rsatildi, qayta urinib ko&apos;ring!</span></>}
              </CardContent>
            </Card>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex-1" onClick={load}>
                <RotateCcw className="size-4" /> Qayta o&apos;ynash
              </Button>
              <Button asChild><Link href="/dashboard">Bosh sahifa</Link></Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
