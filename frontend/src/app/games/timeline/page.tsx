'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { celebrate } from '@/lib/confetti';
import { History, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, Calendar, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import { GameHero, SubjectChips, GameEmpty, GameSkeleton, ResultBanner } from '@/components/games/GameKit';
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
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const reduce = useReducedMotion();

  const load = () => {
    setResult(null);
    const q = subject ? `?subject=${subject}` : '';
    apiFetch<TimelineData>(`/api/games/timeline/${q}`).then((d) => {
      setEvents(d.events);
      setSubjects(d.subjects);
      setSubject((prev) => prev ?? d.selected_subject);
      setLoaded(true);
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
    if (submitting) return;
    setSubmitting(true);
    try {
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Javobni yuborib bo‘lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  const yearOf = (id: number) => result?.correct_order?.find((e) => e.id === id)?.year;

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 p-4 pb-28 sm:p-6">
        <GameHero
          tone="blue"
          icon={History}
          eyebrow="Mini o'yin · xronologiya"
          title="Tarixiy voqealar"
          accent="zanjiri"
          description="Voqealarni eng qadimgisidan boshlab to'g'ri tartibda (yuqoridan pastga) joylashtiring."
          xp={100}
          coins={10}
        />

        <SubjectChips subjects={subjects} value={subject} onChange={setSubject} />

        {!loaded && <GameSkeleton />}
        {loaded && events.length < 4 && !result && <GameEmpty icon={History} text="Bu fanda hozircha yetarli voqea yo'q." />}

        {events.length >= 4 && (
          <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
            <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-blue)] opacity-20" />
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-blue)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-[#080808]">
                <History className="size-3.5" /> {events.length} ta voqea
              </span>
              <span className="text-[12px] font-bold text-[var(--text-muted)]">↑ eng qadimgi · eng yangi ↓</span>
            </div>

            {/* `layout` — element joyini almashtirganda fizik ravishda ko'chadi (sakramaydi). */}
            <motion.ol layout className="relative mt-5 space-y-2.5">
              <span aria-hidden className="absolute bottom-6 left-[1.4rem] top-6 w-1 rounded-full bg-[var(--ds-track)]" />
              <AnimatePresence initial={false}>
                {events.map((e, i) => {
                  const year = yearOf(e.id);
                  const correctOrder = result?.correct_order;
                  const isCorrectPos = correctOrder ? correctOrder[i]?.id === e.id : null;
                  return (
                    <motion.li
                      key={e.id}
                      layout={!reduce}
                      transition={spring}
                      className={cn(
                        'relative flex items-center gap-3 rounded-[22px] p-2 pr-2.5 transition-colors',
                        result
                          ? isCorrectPos
                            ? 'bg-[var(--ps-green)] text-white'
                            : 'bg-[var(--ps-coral)] text-white'
                          : 'bg-[var(--ps-neutral)]',
                      )}
                    >
                      <span
                        className={cn(
                          'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[15px] font-bold',
                          result ? 'bg-white/25' : 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]',
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 py-1">
                        <p className="text-[14.5px] font-semibold leading-snug">{e.title}</p>
                        {result && year && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[12px] font-bold tabular-nums">
                            <Calendar className="size-3" /> {year}-yil
                          </span>
                        )}
                      </div>
                      {!result && (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                            aria-label="Yuqoriga"
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-paper)] transition-colors hover:bg-[var(--ps-purple)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--ps-paper)] disabled:hover:text-current"
                          >
                            <ArrowUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={i === events.length - 1}
                            onClick={() => move(i, 1)}
                            aria-label="Pastga"
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-paper)] transition-colors hover:bg-[var(--ps-purple)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--ps-paper)] disabled:hover:text-current"
                          >
                            <ArrowDown className="size-4" />
                          </button>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ol>

            {!result ? (
              <button type="button" onClick={submit} disabled={submitting} className="ps-btn ps-btn-ink relative mt-5 w-full !min-h-14">
                <CheckCircle2 className="size-4 text-[var(--ps-orange)]" /> Ketma-ketlikni tekshirish
                <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
              </button>
            ) : (
              <div className="relative mt-5 space-y-3">
                <ResultBanner
                  correct={result.correct}
                  title={result.correct ? "Barakalla! To'g'ri tartib topildi" : 'Ketma-ketlikda xatolik bor'}
                  xp={result.xp}
                  coins={result.coins}
                >
                  {!result.correct && 'Har voqeaning yili ko‘rsatildi — qayta urinib ko‘ring!'}
                </ResultBanner>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button type="button" onClick={load} className="ps-btn ps-btn-ink">
                    <RotateCcw className="size-4" /> Qayta o&apos;ynash
                  </button>
                  <Link href="/dashboard" className="ps-btn ps-btn-ghost">Bosh sahifa</Link>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
