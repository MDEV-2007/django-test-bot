'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Swords, Bot, Trophy, Shield, Users, Target, Flame, Zap, Play, Loader2, RotateCcw, Radio, Share2, Copy, MapPin, UserCheck, History, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { openSocket } from '@/lib/ws-client';
import { tgHaptic } from '@/lib/telegram';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import StatNumber from '@/components/motion/StatNumber';
import { arenaRankTitle, getRankInfo } from '@/lib/rank';
import AppShell from '@/components/AppShell';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import { useFeatureFlags } from '@/lib/features';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PremiumIcon from '@/components/ui/premium-icon';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import GhostBattleArena from '@/components/arena/GhostBattleArena';
import ViralDuelModal from '@/components/growth/ViralDuelModal';
import ClassBattleStudentModal from '@/components/arena/ClassBattleStudentModal';

type ArenaData = {
  total_battles: number; wins: number; losses: number; draws: number; elo_rating: number;
  subjects: { id: number; name: string; slug: string }[]; selected_subject: string | null;
};

type Question = { round_number: number; question_id: number; text: string; choices: { id: number; text: string }[] };

type Mode = 'idle' | 'ai' | 'live-searching' | 'live' | 'result' | 'ghost';

type OnlineUser = { id: number; name: string; avatar: string; elo: number };
type IncomingChallenge = { battle_id: number; from: { name: string; id?: number } };

export default function BattlesPage() {
  const { user, access } = useAuthStore();
  const { isEnabled } = useFeatureFlags();
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
  const [showViralDuel, setShowViralDuel] = useState(false);
  const [showClassBattle, setShowClassBattle] = useState(false);
  const [classBattlePin, setClassBattlePin] = useState<string | null>(null);
  const [isChallengerMode, setIsChallengerMode] = useState(false);
  const [duelToken, setDuelToken] = useState<string | null>(null);
  const [duelUserScore, setDuelUserScore] = useState(80);
  const [activeBattleTab, setActiveBattleTab] = useState<'1v1' | 'class' | 'leaderboard'>('1v1');
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
  }, [access]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const token =
      urlParams.get('duel') ||
      (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } })?.Telegram?.WebApp?.initDataUnsafe?.start_param?.replace('duel_', '') ||
      null;
    if (token) {
      setDuelToken(token);
      setIsChallengerMode(true);
      setShowViralDuel(true);
    }
    const pinParam = urlParams.get('pin');
    if (pinParam) {
      setClassBattlePin(pinParam);
      setShowClassBattle(true);
    }
  }, []);
 // eslint-disable-line react-hooks/exhaustive-deps

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
    setMode('ghost');
    return;
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

  function inviteFriend() {
    soundFX.click();
    setShowViralDuel(true);
  }

  function copyInviteLink(e: React.MouseEvent) {
    e.stopPropagation();
    soundFX.click();
    setShowViralDuel(true);
  }

  const currentQ = questions[roundIdx];
  const isWin = resultMsg.toLowerCase().includes('win') || resultMsg.toLowerCase().includes("g'alaba") || myScore > oppScore;

  if (!isEnabled('battles')) {
    return (
      <ComingSoonFeature
        title="1v1 Battle Arena"
        badge="Live Duel"
        description="O'quvchilar o'rtasida 5 ta tezkor savoldan iborat jonli intellektual jang va ELO ligalari IlmIldizi 2.0 relizida ishga tushiriladi."
      />
    );
  }

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-8 p-4 pb-12 sm:p-6 overflow-x-clip">
                {mode === 'ghost' && (
          <GhostBattleArena
            subjectSlug={selectedSubject || 'tarix'}
            incomingDuelToken={duelToken}
            onExit={() => {
              setMode('idle');
              setDuelToken(null);
            }}
            onOpenViralDuel={(score) => {
              setDuelUserScore(score);
              setShowViralDuel(true);
            }}
          />
        )}

        {mode === 'idle' && (
          <div className="space-y-6">
            {/* ── Hero ── */}
            <section className="relative grid items-center gap-8 pt-2 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="min-w-0">
                <span className="ps-chip">
                  <Swords className="size-3.5 text-[var(--ps-coral)]" /> Raqobatli o&apos;rganish
                </span>
                <h1 className="ps-display mt-5 text-[52px] sm:text-[76px] xl:text-[88px]">
                  <span className="relative inline-block text-[var(--ps-coral)]">
                    Arena
                    <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                      <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                    </svg>
                  </span>
                  <span className="text-[var(--ps-purple)]">.</span>
                </h1>
                <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  Tengdoshlaringizga qarshi chiqing, ligada ko&apos;tariling va bilimingizni jonli bellashuvda isbotlang.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      tgHaptic('medium');
                      setMode('ghost');
                    }}
                    className="ps-btn ps-btn-ink"
                  >
                    <Swords className="size-4 text-[var(--ps-orange)]" /> Raqib topish
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                  <button type="button" onClick={() => setActiveBattleTab('class')} className="ps-btn ps-btn-ghost">
                    <Users className="size-4" /> Sinf jangi
                  </button>
                </div>
              </div>

              {/* Unvon kompozitsiyasi — real ELO */}
              {arena ? (() => {
                const rk = getRankInfo(arena.elo_rating);
                return (
                  <div className="relative mx-auto aspect-square w-full max-w-[240px] sm:max-w-[320px]">
                    <div aria-hidden className="absolute inset-[4%] rounded-full bg-[var(--ps-coral)]" />
                    <div aria-hidden className="absolute -left-2 bottom-[4%] size-[32%] rounded-tr-full bg-[var(--ps-orange)]" />
                    <div aria-hidden className="ps-dots absolute right-0 top-0 size-[26%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
                    <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full border-[6px] border-[#FFFCF7] bg-[#080808] text-center text-[#FFFCF7]">
                      <Shield className="size-6 text-[var(--ps-orange)]" />
                      <span className="ps-num mt-1 text-[44px] sm:text-[56px]">{arena.elo_rating}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">ELO</span>
                    </div>
                    <div className="ps-float absolute -right-1 top-[14%] sm:-right-5">
                      <span className="ps-chip text-[13px]">{rk.title}</span>
                    </div>
                  </div>
                );
              })() : null}
            </section>

            {/* ── Statistika bento ── */}
            {arena && (() => {
              const rk = getRankInfo(arena.elo_rating);
              const decided = arena.wins + arena.losses + arena.draws;
              const winRate = decided ? Math.round((arena.wins / decided) * 100) : 0;
              return (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
                  <div className="ps-ink col-span-2 relative overflow-hidden rounded-[28px] p-6 lg:col-span-6">
                    <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full bg-[var(--ps-purple)] opacity-50" />
                    <p className="ps-eyebrow relative text-white/60">Joriy unvon</p>
                    <p className="ps-display relative mt-2 text-[32px] sm:text-[40px]">{rk.title}</p>
                    <p className="relative mt-2 text-[13px] text-white/70">
                      {rk.nextTitle ? (
                        <>
                          <b className="text-[var(--ps-orange)]">{rk.pointsNeeded} ELO</b> qoldi — {rk.nextTitle} unvoniga ko&apos;tarilish uchun g&apos;alabalarni davom ettiring.
                        </>
                      ) : (
                        "Siz eng yuqori unvondasiz — o'rningizni himoya qiling!"
                      )}
                    </p>
                    <div className="relative mt-4">
                      <div className="mb-1.5 flex justify-between text-[11px] tabular-nums text-white/55">
                        <span>{arena.elo_rating} ELO</span>
                        {rk.nextElo && <span>{rk.nextElo} ELO</span>}
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/12">
                        <div className="h-full rounded-full bg-gradient-to-r from-[var(--ps-orange)] to-[var(--ps-coral)]" style={{ width: `${rk.progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white lg:col-span-2">
                    <Trophy className="size-5" />
                    <p className="ps-num mt-4 text-[44px]">{arena.wins}</p>
                    <p className="text-[12px] font-semibold text-white/75">G&apos;alaba</p>
                  </div>
                  <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-orange)] p-5 text-[#080808] lg:col-span-2">
                    <Target className="size-5" />
                    <p className="ps-num mt-4 text-[44px]">{winRate}%</p>
                    <p className="text-[12px] font-semibold text-black/65">G&apos;alaba ulushi</p>
                  </div>
                  <div className="col-span-2 relative overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-5 text-white lg:col-span-2">
                    <Flame className="size-5" />
                    <p className="ps-num mt-4 text-[44px]">{arena.total_battles}</p>
                    <p className="text-[12px] font-semibold text-white/75">Janglar</p>
                  </div>
                </div>
              );
            })()}

            {/* ── Fan filtri ── */}
            {arena && arena.subjects.length > 0 && (
              <div className="ds-seg flex max-w-full gap-1 overflow-x-auto no-scrollbar sm:w-fit">
                {arena.subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-active={selectedSubject === s.slug ? 'true' : undefined}
                    onClick={() => selectSubject(s.slug)}
                    className="ds-seg-item shrink-0 cursor-pointer font-semibold"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* ── 3 ta bo'lim ── */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { value: '1v1', label: '1v1 duel', icon: Swords, tone: 'bg-[var(--ps-coral)] text-white' },
                { value: 'class', label: 'Sinf jangi', icon: Users, tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                { value: 'leaderboard', label: 'Liga va reyting', icon: Trophy, tone: 'bg-[var(--ps-purple)] text-white' },
              ].map((tab) => {
                const active = activeBattleTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      soundFX.click();
                      tgHaptic('select');
                      setActiveBattleTab(tab.value as '1v1' | 'class' | 'leaderboard');
                    }}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-[24px] p-4 text-left transition-transform hover:-translate-y-1 sm:p-5',
                      tab.tone,
                      active && 'ps-mode-active',
                    )}
                  >
                    <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/15" />
                    <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-black/15">
                      <tab.icon className="size-5" />
                    </span>
                    <span className="ps-display relative text-[16px] sm:text-[22px]">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: 1v1 jonli duel */}
            {activeBattleTab === '1v1' && (
              <div className="space-y-8">
                {/* Tezkor duel banneri */}
                <section className="ps-ink relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[32px] p-6 sm:flex-row sm:items-center sm:p-8">
                  <span aria-hidden className="absolute -right-12 -top-16 size-48 rounded-full bg-[var(--ps-coral)] opacity-60" />
                  <div className="relative flex items-center gap-4">
                    <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                      <Zap className="size-7" />
                    </span>
                    <div>
                      <p className="ps-display text-[28px] sm:text-[34px]">Tezkor duel</p>
                      <p className="mt-1 max-w-md text-[13px] text-white/70">
                        Kutish yo&apos;q: o&apos;zingizga yaqin darajadagi raqib bilan bir zumda bellashing.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      tgHaptic('medium');
                      // Arena `mode === 'ghost'` da chiziladi.
                      setMode('ghost');
                    }}
                    className="ps-btn ps-btn-light relative shrink-0"
                  >
                    <Play className="size-4" /> Duelni boshlash
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                </section>

                {/* 3 ta duel turi */}
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { onClick: startAiBattle, icon: Bot, title: "AI bilan mashg'ulot jangi", desc: "AI bilan tezkor savollarda mashq qiling. Xavf yo'q, bilimlarni mustahkamlang.", cta: 'Boshlash', tone: 'bg-[var(--ps-purple)]' },
                    { onClick: startLiveMatch, icon: Swords, title: 'Jonli abituriyent bilan duel', desc: "Onlayn o'quvchilar bilan real vaqtda bellashing va ELO reyting to'plang.", cta: 'Raqib topish', tone: 'bg-[var(--ps-coral)]' },
                    { onClick: inviteFriend, icon: Share2, title: "Do'stni jangga chorlash", desc: "Sinfdoshingizga Telegram orqali duel havolasini yuborib bellashing.", cta: 'Telegramda ulashish', tone: 'bg-[var(--ps-orange)]', copy: true },
                  ].map((c, i) => (
                    <div
                      key={c.title}
                      role="button"
                      tabIndex={0}
                      onClick={() => c.onClick()}
                      onKeyDown={(e) => { if (e.key === 'Enter') c.onClick(); }}
                      className="ps-card ps-lift tactile-btn group relative flex cursor-pointer flex-col overflow-hidden p-6"
                    >
                      <span aria-hidden className={cn('absolute -right-10 -top-10 size-32 rounded-full opacity-25', c.tone)} />
                      <div className="relative flex items-start justify-between">
                        <span className={cn('ps-zoom inline-flex size-12 items-center justify-center rounded-2xl', c.tone, c.tone.includes('orange') ? 'text-[#080808]' : 'text-white')}>
                          <c.icon className="size-6" />
                        </span>
                        <span className="ps-num text-[34px] text-[var(--text-faint)] opacity-50">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="ps-display relative mt-5 text-[22px]">{c.title}</h3>
                      <p className="relative mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{c.desc}</p>
                      <div className="relative mt-auto flex items-center justify-between gap-2 pt-5">
                        <span className="ps-btn ps-btn-ink !min-h-11 flex-1 justify-between">
                          {c.cta}
                          <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                        </span>
                        {c.copy && (
                          <button
                            type="button"
                            onClick={copyInviteLink}
                            title="Nusxa olish"
                            aria-label="Havoladan nusxa olish"
                            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-primary)] transition-transform hover:-translate-y-0.5"
                          >
                            <Copy className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini-o'yinlar */}
                <div className="space-y-4">
                  <div>
                    <p className="ps-eyebrow text-[var(--text-muted)]">Mini-o&apos;yinlar</p>
                    <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">Intellektual <span className="text-[var(--ps-green)]">o&apos;yinlar</span></h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Xaritalar, tarixiy shaxslar va xronologiya bo&apos;yicha maxsus sinovlar</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { href: '/games/map', icon: MapPin, badge: 'Xarita', title: "Xarita topshirig'i", desc: 'Tarixiy xaritalardan qadimiy hudud, shahar va davlatlarni aniqlang.', reward: '+25 XP • +10 tanga', tone: 'bg-[var(--ps-blue)] text-[#080808]', dark: false },
                      { href: '/games/character', icon: UserCheck, badge: 'Tarixiy shaxs', title: 'Tarixiy shaxslar', desc: 'Tarixiy shaxslar hayoti va faoliyatini savollarda oching.', reward: '+25 XP • +10 tanga', tone: 'bg-[var(--ps-purple)] text-white', dark: true },
                      { href: '/games/timeline', icon: History, badge: 'Xronologiya', title: "Vaqt o'qi (Timeline)", desc: "Voqealar ketma-ketligini xronologik tartibda to'g'ri joylashtiring.", reward: '+30 XP • +15 tanga', tone: 'bg-[var(--ps-green)] text-white', dark: true },
                    ].map((g) => (
                      <Link key={g.href} href={g.href} className={cn('group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-6 transition-transform hover:-translate-y-1', g.tone)}>
                        <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
                        <span className="relative flex items-center justify-between">
                          <span className="inline-flex size-12 items-center justify-center rounded-full bg-black/15">
                            <g.icon className="size-6" />
                          </span>
                          <span className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-bold">{g.badge}</span>
                        </span>
                        <span className="relative">
                          <span className="ps-display block text-[24px]">{g.title}</span>
                          <span className={cn('mt-1.5 block text-[12px] leading-relaxed', g.dark ? 'text-white/75' : 'text-black/65')}>{g.desc}</span>
                        </span>
                        <span className="relative flex items-center justify-between gap-2">
                          <span className="rounded-full bg-black/15 px-3 py-1 text-[11px] font-bold">{g.reward}</span>
                          <span className="flex size-10 items-center justify-center rounded-full bg-[#080808] text-[#FFFCF7] transition-transform group-hover:-rotate-45">
                            <ArrowRight className="size-4" />
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Sinf jangi (PIN) */}
            {activeBattleTab === 'class' && (
              <section
                role="button"
                tabIndex={0}
                onClick={() => {
                  soundFX.click();
                  tgHaptic('medium');
                  setShowClassBattle(true);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') setShowClassBattle(true); }}
                className="tactile-btn relative flex cursor-pointer flex-col items-start justify-between gap-6 overflow-hidden rounded-[32px] bg-[var(--ps-orange)] p-6 text-[#080808] transition-transform hover:-translate-y-1 sm:flex-row sm:items-center sm:p-9"
              >
                <span aria-hidden className="absolute -right-14 -top-14 size-52 rounded-full bg-white/25" />
                <div className="relative flex items-center gap-5">
                  <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
                    <Swords className="size-8" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-white">Teacher live quiz</span>
                      <span className="text-[12px] font-bold">6 xonali PIN-kod</span>
                    </div>
                    <h3 className="ps-display mt-2 text-[28px] sm:text-[36px]">Sinf jangiga kirish</h3>
                    <p className="mt-2 max-w-lg text-[13px] text-black/70">
                      Ustozingiz doskaga PIN-kod tashladimi? Shu tugmani bosing va 6 xonali PIN bilan butun sinf doskasidagi jonli jangga qo&apos;shiling!
                    </p>
                  </div>
                </div>
                <span className="ps-btn ps-btn-ink relative shrink-0">
                  PIN kiritish
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </span>
              </section>
            )}

            {/* TAB 3: Liga va reyting */}
            {activeBattleTab === 'leaderboard' && (
              <section className="relative overflow-hidden rounded-[32px] bg-[var(--ps-purple)] p-6 text-white sm:p-9">
                <span aria-hidden className="absolute -right-14 -top-14 size-52 rounded-full bg-white/15" />
                <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-5">
                    <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                      <Trophy className="size-8" />
                    </span>
                    <div>
                      <h3 className="ps-display text-[28px] sm:text-[36px]">Haftalik ELO ligasi</h3>
                      <p className="mt-2 max-w-md text-[13px] text-white/75">
                        Har bir g&apos;alaba sizga +25 ELO ball beradi. Respublika bo&apos;yicha top-10 o&apos;quvchilar ro&apos;yxatiga kiring va sovrinlarni yutib oling!
                      </p>
                    </div>
                  </div>
                  <Link href="/leaderboard" className="ps-btn ps-btn-light relative shrink-0">
                    To&apos;liq reyting
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </Link>
                </div>
              </section>
            )}

            {activeBattleTab === '1v1' && onlineUsers.length > 0 && (
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
                  <div className="size-20 animate-spin rounded-full border-4 border-[var(--ps-coral)]/20 border-t-[var(--ps-coral)]" />
                  <Swords className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[var(--ps-coral)]" />
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
                    <p className="font-mono text-sm font-bold text-[var(--accent-text)]">{myScore} ball</p>
                  </div>
                </div>

                <div className="shrink-0 text-center">
                  <span className="block font-mono text-xs font-bold uppercase text-muted-foreground">
                    Raund {roundIdx + 1} / {questions.length}
                  </span>
                  <span className="text-xs font-bold text-[var(--ps-coral)]">VS</span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5 text-right">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{opponentName}</p>
                    <p className="font-mono text-sm font-bold text-[var(--ps-coral)]">{oppScore} ball</p>
                  </div>
                  <Avatar className="size-10 border border-[var(--ps-coral)]">
                    <AvatarFallback className="bg-[var(--surface-input)] text-[var(--ps-coral)]"><Bot className="size-5" /></AvatarFallback>
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
                        else if (isSelected) cls = 'border-2 border-rose-500 bg-rose-500/20 font-bold text-[var(--ps-coral)]';
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
                isWin ? 'bg-[var(--tone-premium-soft)] text-[var(--tone-premium-text)]' : 'bg-[var(--surface-input)] text-muted-foreground',
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
                  <p className="mt-0.5 flex items-center justify-center gap-2 font-mono text-xl font-bold">
                    <StatNumber value={arena.elo_rating} />
                    {prevElo !== null && prevElo !== arena.elo_rating && (
                      <span className={cn(
                        'text-sm font-bold',
                        arena.elo_rating > prevElo ? 'text-[var(--success-text)]' : 'text-[var(--ps-coral)]',
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
                <Swords className="size-5 text-[var(--ps-coral)]" /> Jang chaqiruvi
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
      {/* O'qituvchi Sinf Jangi (PIN-kod) Modali */}
      <ClassBattleStudentModal
        open={showClassBattle}
        onOpenChange={setShowClassBattle}
        initialPin={classBattlePin}
      />

      <ViralDuelModal
        isOpen={showViralDuel}
        onClose={() => setShowViralDuel(false)}
        userScore={duelUserScore}
        isChallengerMode={isChallengerMode}
        duelToken={duelToken || undefined}
        onAcceptDuel={() => {
          setShowViralDuel(false);
          setMode('ghost');
        }}
      />
    </div>
  );
}
