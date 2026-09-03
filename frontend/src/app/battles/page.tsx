'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Swords, Bot, Trophy, Shield, Loader2, RotateCcw, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { openSocket } from '@/lib/ws-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import StatNumber from '@/components/motion/StatNumber';
import { arenaRankTitle } from '@/lib/rank';
import AppShell from '@/components/AppShell';
import CardMotif from '@/components/student/CardMotif';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ArenaData = {
  total_battles: number; wins: number; losses: number; draws: number; elo_rating: number;
  subjects: { id: number; name: string; slug: string }[]; selected_subject: string | null;
};

type Question = { round_number: number; question_id: number; text: string; choices: { id: number; text: string }[] };

type Mode = 'idle' | 'ai' | 'live-searching' | 'live' | 'result';

type OnlineUser = { id: number; name: string; avatar: string; elo: number };
type IncomingChallenge = { battle_id: number; from: { name: string; id?: number } };

export default function BattlesPage() {
  const { user, access } = useAuthStore();
  const [arena, setArena] = useState<ArenaData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [battleId, setBattleId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [opponentName, setOpponentName] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [correctChoiceId, setCorrectChoiceId] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const [waitingOpponent, setWaitingOpponent] = useState(false);
  /* Jangdan OLDINGI ELO — natija ekranida o'zgarishni ko'rsatish uchun. Server yangi
     qiymatni qaytargach, raqam eskidan yangisiga "aylanib" o'tadi. */
  const [prevElo, setPrevElo] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallenge | null>(null);
  const [sentChallengeTo, setSentChallengeTo] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mmRef = useRef<WebSocket | null>(null);
  const lobbyRef = useRef<WebSocket | null>(null);

  const loadArena = () => apiFetch<ArenaData>('/api/battles/').then((d) => {
    setArena(d);
    setSelectedSubject((prev) => prev ?? d.selected_subject);
  }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));

  useEffect(() => {
    if (!access) return;
    loadArena();
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { wsRef.current?.close(); mmRef.current?.close(); lobbyRef.current?.close(); }, []);

  const loadOnlineUsers = useCallback(() => {
    apiFetch<{ users: OnlineUser[] }>('/api/battles/online/').then((d) => setOnlineUsers(d.users)).catch(() => {});
  }, []);

  /* Lobby socket — butun sahifa hayoti davomida ulanib turadi, chunki qarshi tomon
     har qanday holatda (idle, jang o'rtasida) chaqiruv yuborishi mumkin. */
  useEffect(() => {
    if (!access) return;
    const ws = openSocket('/ws/battles/lobby/');
    lobbyRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'challenge_received') {
        setIncomingChallenge({ battle_id: data.battle_id, from: data.from });
        soundFX.correct?.();
      } else if (data.event === 'challenge_sent') {
        toast.success("Chaqiruv yuborildi, javob kutilmoqda...");
      } else if (data.event === 'challenge_failed') {
        setSentChallengeTo(null);
        toast.error(data.reason || "Chaqiruvni yuborib bo'lmadi");
      } else if (data.event === 'challenge_declined') {
        setSentChallengeTo(null);
        toast.info("Raqib chaqiruvni rad etdi");
      } else if (data.event === 'challenge_accepted') {
        setSentChallengeTo(null);
        setIncomingChallenge(null);
        if (!ensurePlayable(data.questions)) return;
        setBattleId(data.battle_id);
        setQuestions(data.questions);
        setRoundIdx(0); setMyScore(0); setOppScore(0); setSelectedChoice(null); setCorrectChoiceId(null);
        const opponent = data.player1.id === useAuthStore.getState().user?.id ? data.player2 : data.player1;
        setOpponentName(opponent?.name || 'Raqib');
        openLiveBattle(data.battle_id);
      }
    };
    return () => ws.close();
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Faqat "idle" holatda ro'yxatni yangilab turamiz — jang jarayonida keraksiz. */
  useEffect(() => {
    if (!access || mode !== 'idle') return;
    loadOnlineUsers();
    const t = setInterval(loadOnlineUsers, 15000);
    return () => clearInterval(t);
  }, [access, mode, loadOnlineUsers]);

  function sendChallenge(targetId: number) {
    if (!lobbyRef.current || lobbyRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Ulanish yo'q, sahifani yangilang");
      return;
    }
    setSentChallengeTo(targetId);
    lobbyRef.current.send(JSON.stringify({
      action: 'challenge', target_id: targetId, subject: selectedSubject || undefined,
    }));
  }

  function respondChallenge(accept: boolean) {
    if (!incomingChallenge || !lobbyRef.current) return;
    lobbyRef.current.send(JSON.stringify({ action: 'respond', battle_id: incomingChallenge.battle_id, accept }));
    setIncomingChallenge(null);
  }

  function selectSubject(slug: string) {
    setSelectedSubject(slug);
    apiFetch<ArenaData>(`/api/battles/?subject=${slug}`).then(setArena)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }

  async function startAiBattle() {
    const qs = selectedSubject ? `?subject=${selectedSubject}` : '';
    let data;
    try {
      data = await apiFetch<{ battle_id: number; questions: Question[]; opponent: { name: string } }>(
        `/api/battles/start-quiz/${qs}`, { method: 'POST' },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Jangni boshlab bo'lmadi");
      return;
    }
    if (!ensurePlayable(data.questions)) return;
    setBattleId(data.battle_id);
    setQuestions(data.questions);
    setOpponentName(data.opponent.name);
    setRoundIdx(0); setMyScore(0); setOppScore(0); setSelectedChoice(null); setCorrectChoiceId(null);
    setMode('ai');
  }

  async function answerAi(choiceId: number) {
    if (!battleId || selectedChoice !== null) return;
    setSelectedChoice(choiceId);
    const q = questions[roundIdx];
    const res = await apiFetch<{ player_score: number; opponent_score: number; correct_choice_id: number }>('/api/battles/submit-round/', {
      method: 'POST',
      body: JSON.stringify({ battle_id: battleId, round_number: q.round_number, choice_id: choiceId }),
    });
    setMyScore(res.player_score);
    setOppScore(res.opponent_score);
    setCorrectChoiceId(res.correct_choice_id ?? null);
    (choiceId === res.correct_choice_id ? soundFX.correct : soundFX.incorrect)();
    setTimeout(async () => {
      if (roundIdx + 1 < questions.length) {
        setRoundIdx(roundIdx + 1); setSelectedChoice(null); setCorrectChoiceId(null);
      } else {
        const fin = await apiFetch<{ result: string; msg: string }>('/api/battles/finish/', {
          method: 'POST', body: JSON.stringify({ battle_id: battleId }),
        });
        setResultMsg(fin.msg);
        setMode('result');
        if (fin.result === 'win') {
          soundFX.fanfare();
          try { celebrate({ particleCount: 110, spread: 75, origin: { y: 0.4 } }); } catch { /* noop */ }
        }
        // ELO o'zgarishini ko'rsatish uchun: eski qiymat saqlanadi, yangisi serverdan olinadi.
        setPrevElo(arena?.elo_rating ?? null);
        loadArena();
      }
    }, 900);
  }

  function startLiveMatch() {
    setMode('live-searching');
    const subject = selectedSubject || '';
    const mm = openSocket('/ws/battles/matchmaking/', subject ? { subject } : {});
    mmRef.current = mm;
    mm.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'search_failed') {
        mm.close();
        setMode('idle');
        toast.error(data.reason || "Bu fanda jang boshlab bo'lmadi");
        return;
      }
      if (data.event === 'matched') {
        mm.close();
        if (!ensurePlayable(data.questions)) return;
        setBattleId(data.battle_id);
        setQuestions(data.questions);
        setRoundIdx(0); setMyScore(0); setOppScore(0); setSelectedChoice(null); setCorrectChoiceId(null);
        const opponent = data.player1.id === useAuthStore.getState().user?.id ? data.player2 : data.player1;
        setOpponentName(opponent?.name || 'Raqib');
        openLiveBattle(data.battle_id);
      }
    };
  }

  /* Savolsiz jangga KIRMAYMIZ. Ilgari bo'sh ro'yxat kelsa ham rejim 'live'ga o'tar,
     lekin ko'rsatadigan savol bo'lmagani uchun ekran butunlay bo'sh (qora) qolardi —
     ikkala o'yinchida ham. Server endi bunday jangni yaratmaydi; bu esa eski
     serverga qarshi ham himoya. */
  function ensurePlayable(qs: Question[] | undefined): qs is Question[] {
    if (qs && qs.length > 0) return true;
    setMode('idle');
    toast.error("Bu fanda jang uchun savollar yetarli emas. Boshqa fanni tanlang.");
    return false;
  }

  function openLiveBattle(id: number) {
    const ws = openSocket(`/ws/battles/${id}/`);
    wsRef.current = ws;
    ws.onopen = () => setMode('live');
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'waiting_for_opponent') {
        setWaitingOpponent(true);
      } else if (msg.event === 'round_result') {
        setWaitingOpponent(false);
        const myId = String(useAuthStore.getState().user?.id);
        const scores = msg.scores as Record<string, number>;
        const otherId = Object.keys(scores).find((k) => k !== myId);
        setMyScore(scores[myId] ?? 0);
        setOppScore(otherId ? scores[otherId] : 0);
        setTimeout(() => { setRoundIdx((i) => i + 1); setSelectedChoice(null); setCorrectChoiceId(null); }, 600);
      } else if (msg.event === 'battle_finished') {
        const myId = String(useAuthStore.getState().user?.id);
        const result = msg.results[myId];
        setResultMsg(`Natija: ${result.result} · +${result.xp_gained} XP, +${result.coins_gained} tanga`);
        setMode('result');
        if (String(result.result).toLowerCase().includes('win')) {
          soundFX.fanfare();
          try { celebrate({ particleCount: 110, spread: 75, origin: { y: 0.4 } }); } catch { /* noop */ }
        }
        setPrevElo(arena?.elo_rating ?? null);
        loadArena();
      }
    };
  }

  function answerLive(choiceId: number) {
    if (selectedChoice !== null) return;
    setSelectedChoice(choiceId);
    const q = questions[roundIdx];
    wsRef.current?.send(JSON.stringify({ action: 'answer', round_number: q.round_number, choice_id: choiceId }));
  }

  function reset() {
    wsRef.current?.close();
    mmRef.current?.close();
    setMode('idle');
  }

  const currentQ = questions[roundIdx];
  const isWin = resultMsg.toLowerCase().includes('win') || resultMsg.toLowerCase().includes("g'alaba") || myScore > oppScore;

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        {mode === 'idle' && (
          <div className="space-y-6">
            <PageHero
              tone="amber"
              eyebrow="1v1 Duel"
              eyebrowIcon={Swords}
              title="Battle Arena"
              description="Tezkor savollarda raqiblaringizdan ustun keling va ELO ballingizni oshiring."
            />

            {/* Hali jang qilmagan o'yinchi uchun 5 ta nol to'la qator asosiy harakatdan
                diqqatni tortadi — o'rniga bitta boshlang'ich ELO kartasi ko'rsatiladi. */}
            {arena && arena.total_battles === 0 && (
              <Card className="border-blue-500/25 bg-blue-500/[0.05]">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                    <Swords className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      Boshlang&apos;ich reyting: <span className="font-mono text-blue-300">{arena.elo_rating}</span>
                      <span className="ml-1.5 text-xs font-semibold text-muted-foreground">({arenaRankTitle(arena.elo_rating)})</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Birinchi jangingizni boshlang — g&apos;alaba ELO, XP va tanga olib keladi.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {arena && arena.total_battles > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'ELO', value: arena.elo_rating, sub: arenaRankTitle(arena.elo_rating), cls: 'border-blue-500/25 bg-blue-500/[0.05]', text: 'text-foreground' },
                  { label: 'Janglar', value: arena.total_battles, sub: null, cls: '', text: 'text-foreground' },
                  { label: "G'alaba", value: arena.wins, sub: null, cls: 'border-[var(--success)]/25 bg-[var(--success)]/[0.05]', text: 'text-[var(--success-text)]' },
                  { label: 'Durang', value: arena.draws, sub: null, cls: '', text: 'text-amber-300' },
                  { label: "Mag'lub", value: arena.losses, sub: null, cls: 'border-rose-500/25 bg-rose-500/[0.05]', text: 'text-rose-300' },
                ].map((s) => (
                  <Card key={s.label} className={cn('gap-0 py-3', s.cls)}>
                    <CardContent className="px-2 text-center">
                      <p className="text-xs font-bold uppercase text-muted-foreground">{s.label}</p>
                      <p className={cn('mt-0.5 font-mono text-base font-black tabular-nums', s.text)}>{s.value}</p>
                      {s.sub && <p className="mt-0.5 text-[9px] font-semibold text-blue-300">{s.sub}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {arena && arena.subjects.length > 0 && (
              <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
                {arena.subjects.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="outline"
                    className={cn('shrink-0 rounded-full', selectedSubject === s.slug && 'chip-active')}
                    onClick={() => selectSubject(s.slug)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <Card
                onClick={startAiBattle}
                className="tactile-btn group relative cursor-pointer overflow-hidden border-2 border-[var(--accent-border)] transition-colors hover:border-[var(--accent)]"
              >
                <CardMotif shape="bot" className="text-[var(--accent)]" />
                <CardContent className="relative pt-6">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/20 text-[var(--accent)] transition-transform group-hover:scale-110">
                    <Bot className="size-6" />
                  </div>
                  <h3 className="text-base font-bold transition-colors group-hover:text-[var(--accent-text)]">AI bilan mashg&apos;ulot jangi</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    AI bilan tezkor savollarda mashq qiling. Xavf yo&apos;q, yangi bilimlarni mustahkamlang.
                  </p>
                  <span className="mt-4 inline-block text-xs font-bold text-[var(--accent-text)]">Boshlash (tezkor) →</span>
                </CardContent>
              </Card>

              <Card
                onClick={startLiveMatch}
                className="tactile-btn group relative cursor-pointer overflow-hidden border-2 border-amber-500/30 transition-colors hover:border-amber-500"
              >
                <CardMotif shape="arena" className="text-amber-400" />
                <CardContent className="relative pt-6">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 transition-transform group-hover:scale-110">
                    <Swords className="size-6" />
                  </div>
                  <h3 className="text-base font-bold transition-colors group-hover:text-amber-400">Jonli abituriyent bilan duel</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Onlayn o&apos;quvchilar bilan real vaqtda bellashing va ELO reyting to&apos;plang.
                  </p>
                  <span className="mt-4 inline-block text-xs font-bold text-amber-400">Raqib topish →</span>
                </CardContent>
              </Card>
            </div>

            {onlineUsers.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
                  <Radio className="size-3.5 text-[var(--success-text)]" />
                  Onlayn ({onlineUsers.length})
                </div>
                <div className="space-y-2">
                  {onlineUsers.map((u) => (
                    <Card key={u.id}>
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative shrink-0">
                            <Avatar className="size-9">
                              <AvatarImage src={u.avatar} alt="" />
                              <AvatarFallback className="text-xs">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--bg-page)] bg-[var(--success)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{u.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{u.elo} ELO</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sentChallengeTo === u.id}
                          onClick={() => sendChallenge(u.id)}
                          className="shrink-0"
                        >
                          {sentChallengeTo === u.id
                            ? <><Loader2 className="size-3.5 animate-spin" /> Kutilmoqda</>
                            : <><Swords className="size-3.5" /> Chaqirish</>}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'live-searching' && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Card className="w-full max-w-sm">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <div className="relative mb-6">
                  <div className="size-20 animate-spin rounded-full border-4 border-[var(--accent)]/20 border-t-[var(--accent)]" />
                  <Swords className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-amber-400" />
                </div>
                <h3 className="mb-1 text-lg font-bold">Raqib qidirilmoqda...</h3>
                <p className="text-sm text-muted-foreground">Sizning darajangizga mos bilimdon ulanmoqda</p>
              </CardContent>
            </Card>
          </div>
        )}

        {(mode === 'ai' || mode === 'live') && currentQ && (
          <div className="space-y-5">
            <Card>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-10 border border-[var(--accent)]">
                    <AvatarImage src={user?.avatar_url || undefined} alt="" />
                    <AvatarFallback className="text-xs">{(user?.first_name || user?.username || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">Siz</p>
                    <p className="font-mono text-sm font-black text-[var(--accent-text)]">{myScore} ball</p>
                  </div>
                </div>

                <div className="shrink-0 text-center">
                  <span className="block font-mono text-xs font-bold uppercase text-muted-foreground">
                    Raund {roundIdx + 1} / {questions.length}
                  </span>
                  <span className="text-xs font-black text-amber-400">VS</span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5 text-right">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{opponentName}</p>
                    <p className="font-mono text-sm font-black text-amber-400">{oppScore} ball</p>
                  </div>
                  <Avatar className="size-10 border border-amber-400">
                    <AvatarFallback className="bg-[var(--surface-input)] text-amber-300"><Bot className="size-5" /></AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
              <CardContent className="pt-0">
                <Progress value={((roundIdx + 1) / Math.max(1, questions.length)) * 100} className="h-1.5" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">
                  Tezkor duel savoli
                </Badge>
                <h2
                  className="font-voice text-lg font-bold leading-snug"
                  dangerouslySetInnerHTML={{ __html: currentQ.text }}
                />

                {waitingOpponent ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Raqibning javobi kutilmoqda...
                  </p>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    {currentQ.choices.map((c) => {
                      const isSelected = selectedChoice === c.id;
                      const isCorrect = correctChoiceId === c.id;
                      let cls = 'border bg-[var(--surface-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]';
                      if (selectedChoice !== null) {
                        if (isCorrect) cls = 'border-2 border-[var(--success)] bg-[var(--success)]/20 font-bold text-[var(--success-text)]';
                        else if (isSelected) cls = 'border-2 border-rose-500 bg-rose-500/20 font-bold text-rose-300';
                        else cls = 'border bg-[var(--surface-input)]/50 text-[var(--text-faint)] opacity-60';
                      }
                      return (
                        <button
                          key={c.id}
                          disabled={selectedChoice !== null}
                          onClick={() => (mode === 'ai' ? answerAi(c.id) : answerLive(c.id))}
                          className={cn('tactile-btn w-full rounded-xl p-4 text-left text-sm transition-all', cls)}
                        >
                          {c.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {(mode === 'ai' || mode === 'live') && !currentQ && (
          <Card className="mx-auto max-w-md">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <Shield className="size-10 text-muted-foreground" />
              <h2 className="font-voice text-lg font-bold">Jangni ko&apos;rsatib bo&apos;lmadi</h2>
              <p className="text-sm text-muted-foreground">
                Savollar yuklanmadi. Boshqa fanni tanlab qayta urinib ko&apos;ring.
              </p>
              <Button onClick={reset} className="w-full">
                <RotateCcw className="size-4" /> Arenaga qaytish
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === 'result' && (
          <Card className="mx-auto max-w-md">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className={cn(
                'flex size-16 items-center justify-center rounded-3xl',
                isWin ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--surface-input)] text-muted-foreground',
              )}>
                {isWin ? <Trophy className="size-8" /> : <Shield className="size-8" />}
              </div>
              <h2 className="font-voice text-2xl font-bold">{resultMsg}</h2>
              <p className="font-mono text-sm text-muted-foreground">
                Yakuniy hisob: <strong className="text-foreground">{myScore} — {oppScore}</strong>
              </p>

              {/* ELO o'zgarishi — raqam eski qiymatdan yangisiga aylanib o'tadi. */}
              {arena && (
                <div className="w-full rounded-2xl border bg-[var(--surface-input)] px-4 py-3">
                  <p className="font-mono text-xs uppercase text-muted-foreground">Arena reytingi</p>
                  <p className="mt-0.5 flex items-center justify-center gap-2 font-mono text-xl font-black">
                    <StatNumber value={arena.elo_rating} />
                    {prevElo !== null && prevElo !== arena.elo_rating && (
                      <span className={cn(
                        'text-sm font-bold',
                        arena.elo_rating > prevElo ? 'text-[var(--success-text)]' : 'text-rose-300',
                      )}>
                        {arena.elo_rating > prevElo ? '+' : ''}{arena.elo_rating - prevElo}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-blue-300">{arenaRankTitle(arena.elo_rating)}</p>
                </div>
              )}
              <Button onClick={reset} className="w-full">
                <RotateCcw className="size-4" /> Yana o&apos;ynash
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!incomingChallenge} onOpenChange={(open) => { if (!open) respondChallenge(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="size-5 text-amber-400" /> Jang chaqiruvi
              </DialogTitle>
              <DialogDescription>
                <strong className="text-foreground">{incomingChallenge?.from.name}</strong> sizni tezkor duelga chaqirmoqda. Jang qilasizmi?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => respondChallenge(false)}>Rad etish</Button>
              <Button onClick={() => respondChallenge(true)}>
                <Swords className="size-4" /> Qabul qilish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
