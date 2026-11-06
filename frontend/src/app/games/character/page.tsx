'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { HelpCircle, ArrowRight, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import CharacterCard from '@/components/student/CharacterCard';
import { GameHero, SubjectChips, GameEmpty, GameSkeleton, ResultBanner } from '@/components/games/GameKit';
import { cn } from '@/lib/utils';

type Character = { id: number; clue_1: string; clue_2: string; clue_3: string };
type Subject = { id: number; name: string; slug: string };
type Result = { correct: boolean; xp?: number; coins?: number; name: string; avatar_url?: string | null };

const CLUE_TONES = [
  'bg-[var(--ps-orange)] text-[#080808]',
  'bg-[var(--ps-purple)] text-white',
  'bg-[var(--ps-coral)] text-white',
];

export default function CharacterGamePage() {
  const { access } = useAuthStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setResult(null);
    setGuess('');
    const q = subject ? `?subject=${subject}` : '';
    apiFetch<{ character: Character | null; subjects: Subject[]; selected_subject: string | null }>(`/api/games/character/${q}`).then((d) => {
      setCharacter(d.character);
      setSubjects(d.subjects);
      setSubject((prev) => prev ?? d.selected_subject);
      setLoaded(true);
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  };
  useEffect(() => { if (access) load(); }, [access, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!character || !guess.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<Result>('/api/games/character/', {
        method: 'POST', body: JSON.stringify({ character_id: character.id, guess }),
      });
      setResult(res);
      if (res.correct) {
        soundFX.correct();
        try { celebrate({ particleCount: 75, spread: 60, origin: { y: 0.6 } }); } catch { /* noop */ }
      } else {
        soundFX.incorrect();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Javobni yuborib bo‘lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 p-4 pb-28 sm:p-6">
        <GameHero
          tone="orange"
          icon={HelpCircle}
          eyebrow="Mini o'yin · topishmoq"
          title="Tarixiy shaxsni"
          accent="toping"
          description="3 ta sirli maslahat orqali buyuk ajdodimizni aniqlang va ismini yozing."
          xp={120}
          coins={12}
        />

        <SubjectChips subjects={subjects} value={subject} onChange={setSubject} />

        {!loaded && <GameSkeleton />}
        {loaded && !character && <GameEmpty icon={HelpCircle} text="Bu fanda hozircha shaxs yo'q." />}

        {character && (
          <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
            <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-orange)] opacity-15" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-[#080808]">
              <Search className="size-3.5" /> 3 ta maslahat
            </span>
            <h2 className="ps-display relative mt-3 text-[26px] sm:text-[32px]">Kim bu tarixiy shaxs?</h2>

            <ol className="relative mt-5 space-y-2.5">
              {[character.clue_1, character.clue_2, character.clue_3].map((clue, idx) => (
                <li key={idx} className="flex items-start gap-3 rounded-[22px] bg-[var(--ps-neutral)] p-3 pr-4">
                  <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[15px] font-bold', CLUE_TONES[idx])}>
                    {idx + 1}
                  </span>
                  <span className="pt-1.5 text-[14.5px] leading-relaxed">{clue}</span>
                </li>
              ))}
            </ol>

            {!result ? (
              <form onSubmit={submit} className="relative mt-5 flex items-center gap-2 rounded-full bg-[var(--ps-neutral)] p-1.5 pl-5 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Tarixiy shaxs ismini yozing..."
                  aria-label="Javob"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-faint)]"
                />
                <button type="submit" disabled={!guess.trim() || submitting} className="ps-btn ps-btn-ink !min-h-11 shrink-0 !px-4 sm:!px-5">
                  <span className="hidden sm:inline">Tekshirish</span>
                  <span className="ps-btn-arrow !mr-0 sm:!-mr-3"><ArrowRight className="size-4" /></span>
                </button>
              </form>
            ) : (
              <div className="relative mt-5 space-y-3">
                <CharacterCard
                  name={result.name}
                  imageUrl={result.avatar_url}
                  caption={result.correct ? "To'g'ri topdingiz" : "To'g'ri javob"}
                />
                <ResultBanner
                  correct={result.correct}
                  title={result.correct ? "Barakalla, to'g'ri topdingiz!" : "Afsus, noto'g'ri"}
                  xp={result.xp}
                  coins={result.coins}
                >
                  {!result.correct && <>Sizning javobingiz: <b>{guess}</b></>}
                </ResultBanner>
                <button type="button" onClick={load} className="ps-btn ps-btn-ink w-full">
                  <RotateCcw className="size-4" /> Keyingi shaxsni topish
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
