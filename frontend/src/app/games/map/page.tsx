'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { MapPin, RotateCcw, Check, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import { GameHero, SubjectChips, GameEmpty, GameSkeleton, ResultBanner, LETTERS } from '@/components/games/GameKit';
import { cn } from '@/lib/utils';

type Challenge = { id: number; title: string; description: string; map_image_url: string; options: string[] };
type Subject = { id: number; name: string; slug: string };
type Result = { correct: boolean; xp?: number; coins?: number; correct_location: string };

export default function MapGamePage() {
  const { access } = useAuthStore();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    setResult(null);
    setSelected(null);
    const q = subject ? `?subject=${subject}` : '';
    apiFetch<{ challenge: Challenge | null; subjects: Subject[]; selected_subject: string | null }>(`/api/games/map/${q}`).then((d) => {
      setChallenge(d.challenge);
      setSubjects(d.subjects);
      setSubject((prev) => prev ?? d.selected_subject);
      setLoaded(true);
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  };
  useEffect(() => { if (access) load(); }, [access, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  async function answer(region: string) {
    if (!challenge || selected) return;
    setSelected(region);
    try {
      const res = await apiFetch<Result>('/api/games/map/', {
        method: 'POST', body: JSON.stringify({ challenge_id: challenge.id, region }),
      });
      setResult(res);
      if (res.correct) {
        soundFX.correct();
        try { celebrate({ particleCount: 60, spread: 60, origin: { y: 0.6 } }); } catch { /* noop */ }
      } else {
        soundFX.incorrect();
      }
    } catch (e) {
      setSelected(null);
      toast.error(e instanceof Error ? e.message : 'Javobni yuborib bo‘lmadi');
    }
  }

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 p-4 pb-28 sm:p-6">
        <GameHero
          tone="green"
          icon={MapPin}
          eyebrow="Mini o'yin · xarita"
          title="Tarixiy xarita"
          accent="challenge"
          description="Xarita va ta'rif orqali qadimiy davlatlar, shaharlar va hududlarning joylashuvini aniqlang."
          xp={80}
          coins={8}
        />

        <SubjectChips subjects={subjects} value={subject} onChange={setSubject} />

        {!loaded && <GameSkeleton />}
        {loaded && !challenge && <GameEmpty icon={MapPin} text="Bu fanda hozircha challenge yo'q." />}

        {challenge && (
          <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
            <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-green)] opacity-10" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
              <MapPin className="size-3.5" /> Joylashuvni toping
            </span>
            <h2 className="ps-display relative mt-3 text-[24px] sm:text-[30px]">{challenge.title}</h2>
            <p className="relative mt-2 text-[14.5px] leading-relaxed text-[var(--text-secondary)]">{challenge.description}</p>

            {challenge.map_image_url && (
              <div className="relative mt-5 overflow-hidden rounded-[24px] bg-[var(--ps-neutral)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={challenge.map_image_url} alt="Xarita" className="max-h-80 w-full object-cover" />
              </div>
            )}

            <div className="relative mt-5 grid gap-2.5 sm:grid-cols-2">
              {challenge.options.map((o, i) => {
                const isCorrect = !!result && o === result.correct_location;
                const isSelected = selected === o;
                const wrong = !!result && isSelected && !isCorrect;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={!!selected}
                    onClick={() => answer(o)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-[22px] p-2.5 pr-4 text-left text-[14.5px] font-semibold transition-all active:scale-[0.99]',
                      isCorrect
                        ? 'bg-[var(--ps-green)] text-white'
                        : wrong
                          ? 'bg-[var(--ps-coral)] text-white'
                          : result
                            ? 'bg-[var(--ps-neutral)] opacity-55'
                            : isSelected
                              ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                              : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[14px] font-bold',
                        isCorrect || wrong ? 'bg-white/25' : 'bg-[var(--ps-paper)]',
                      )}
                    >
                      {isCorrect ? <Check className="size-4 stroke-[3]" /> : wrong ? <X className="size-4 stroke-[3]" /> : LETTERS[i] || i + 1}
                    </span>
                    <span className="flex-1">{o}</span>
                  </button>
                );
              })}
            </div>

            {result && (
              <div className="relative mt-5 space-y-3">
                <ResultBanner correct={result.correct} title={result.correct ? "To'g'ri javob!" : "Noto'g'ri javob"} xp={result.xp} coins={result.coins}>
                  {!result.correct && <>To&apos;g&apos;ri javob: <b>{result.correct_location}</b></>}
                </ResultBanner>
                <button type="button" onClick={load} className="ps-btn ps-btn-ink w-full">
                  <RotateCcw className="size-4" /> Yana o&apos;ynash
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
