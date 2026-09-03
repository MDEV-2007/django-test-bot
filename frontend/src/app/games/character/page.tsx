'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { HelpCircle, Coins, CheckCircle2, XCircle, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import CharacterCard from '@/components/student/CharacterCard';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Character = { id: number; clue_1: string; clue_2: string; clue_3: string };
type Subject = { id: number; name: string; slug: string };
type Result = { correct: boolean; xp?: number; coins?: number; name: string; avatar_url?: string | null };

export default function CharacterGamePage() {
  const { access } = useAuthStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    if (!character || !guess.trim()) return;
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
  }

  return (
    <>
      <AppShell />
      <main className="page-shell-focus flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="amber"
          eyebrow="Mini o'yin"
          eyebrowIcon={HelpCircle}
          title="Tarixiy Shaxsni Toping"
          description="3 ta sirli maslahat orqali buyuk ajdodimizni aniqlang."
          actions={
            <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-400">
              <Zap className="size-3" /> +120 XP · <Coins className="size-3" /> 12
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

        {!loaded && <Skeleton className="h-80 w-full" />}
        {loaded && !character && (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Bu fanda hozircha shaxs yo&apos;q.</p>
            </CardContent>
          </Card>
        )}

        {character && (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <h2 className="text-base font-bold">Kim bu tarixiy shaxs?</h2>

              <div className="space-y-2.5">
                {[character.clue_1, character.clue_2, character.clue_3].map((clue, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-xl border bg-[var(--surface-input)] p-3.5 text-sm leading-relaxed">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-xs font-bold text-amber-300">
                      {idx + 1}
                    </span>
                    <span>{clue}</span>
                  </div>
                ))}
              </div>

              {!result ? (
                <form onSubmit={submit} className="flex gap-2 pt-2">
                  <Input
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Tarixiy shaxs ismini yozing..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!guess.trim()} className="shrink-0">
                    Tekshirish <ArrowRight className="size-4" />
                  </Button>
                </form>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Javob ochilgan lahza — sahifadagi YAGONA "jasur" joy: personaj
                      kartasi (rasm hukmron, matn scrim ustida). Qolgan hamma karta
                      jim turadi. */}
                  <CharacterCard
                    name={result.name}
                    imageUrl={result.avatar_url}
                    caption={result.correct ? "To'g'ri topdingiz" : "To'g'ri javob"}
                  />
                  <Card className={cn(result.correct ? 'border-[var(--success)]/30 bg-[var(--success)]/[0.06]' : 'border-rose-500/30 bg-rose-500/[0.06]')}>
                    <CardContent className="space-y-1 pt-6">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        {result.correct
                          ? <><CheckCircle2 className="size-4 text-[var(--success-text)]" /> Barakalla, to&apos;g&apos;ri topdingiz!</>
                          : <><XCircle className="size-4 text-rose-400" /> Afsus, noto&apos;g&apos;ri.</>}
                      </p>
                      {result.correct && (
                        <p className="text-xs text-muted-foreground">+{result.xp} XP, +{result.coins} tanga</p>
                      )}
                    </CardContent>
                  </Card>
                  <Button onClick={load} className="w-full">Keyingi shaxsni topish</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
