'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { MapPin, RotateCcw, Coins, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  }

  return (
    <>
      <AppShell />
      <main className="page-shell-focus flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="accent"
          eyebrow="Mini o'yin"
          eyebrowIcon={MapPin}
          title="Tarixiy Xarita Challenge"
          description="Xarita orqali qadimiy davlatlar va joylashuvlarni aniqlang."
          actions={
            <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
              <Zap className="size-3" /> +80 XP · <Coins className="size-3" /> 8
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
        {loaded && !challenge && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Bu fanda hozircha challenge yo&apos;q.</p>
            </CardContent>
          </Card>
        )}

        {challenge && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-base font-bold">{challenge.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{challenge.description}</p>

              {challenge.map_image_url && (
                <div className="overflow-hidden rounded-xl border bg-black/40">
                  <img src={challenge.map_image_url} alt="" className="max-h-64 w-full object-cover" />
                </div>
              )}

              <div className="grid gap-2.5 pt-2 sm:grid-cols-2">
                {challenge.options.map((o) => {
                  const isCorrect = result && o === result.correct_location;
                  const isSelected = selected === o;
                  let cls = 'border bg-[var(--surface-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]';
                  if (result) {
                    if (isCorrect) cls = 'border-2 border-[var(--success)] bg-[var(--success)]/20 font-bold text-[var(--success-text)]';
                    else if (isSelected) cls = 'border-2 border-rose-500 bg-rose-500/20 font-bold text-rose-300';
                    else cls = 'border bg-[var(--surface-input)]/50 text-[var(--text-faint)] opacity-60';
                  }
                  return (
                    <button
                      key={o}
                      disabled={!!result}
                      onClick={() => answer(o)}
                      className={cn('tactile-btn rounded-xl p-3.5 text-left text-sm transition-all', cls)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>

              {result && (
                <Card className={cn(result.correct ? 'border-[var(--success)]/30 bg-[var(--success)]/[0.06]' : 'border-rose-500/30 bg-rose-500/[0.06]')}>
                  <CardContent className="space-y-2 pt-6">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      {result.correct
                        ? <><CheckCircle2 className="size-4 text-[var(--success-text)]" /> To&apos;g&apos;ri javob! (+{result.xp} XP, +{result.coins} tanga)</>
                        : <><XCircle className="size-4 text-rose-400" /> Noto&apos;g&apos;ri javob.</>}
                    </p>
                    <p className="text-sm text-muted-foreground">To&apos;g&apos;ri javob: {result.correct_location}</p>
                    <Button variant="outline" size="sm" onClick={load}>
                      <RotateCcw className="size-3.5" /> Yana o&apos;ynash
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
