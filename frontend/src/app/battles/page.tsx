'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Swords, Bot, Trophy, Shield, Users, Target, Flame, Zap, Play, Loader2, RotateCcw, Radio, Share2, Copy, MapPin, UserCheck, History, Sparkles, ArrowRight, Clock, CheckCircle2, XCircle, Coins,
} from 'lucide-react';
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
import { cn, formatRichText } from '@/lib/utils';
import GhostBattleArena from '@/components/arena/GhostBattleArena';
import ArenaStage from '@/components/arena/ArenaStage';
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
  const [searchTimedOut, setSearchTimedOut] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number>(0);
  const [lastBattleData, setLastBattleData] = useState<{
    result?: string;
    msg?: string;
    stake_coins?: number;
    net_stake_delta?: number;
    can_rematch?: boolean;
    rematch_cta?: string;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mmRef = useRef<WebSocket | null>(null);
  const lobbyRef = useRef<WebSocket | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function startAiBattle(stakeOverride?: number | unknown, rematchId?: number | null) {
    const stake = typeof stakeOverride === 'number' ? stakeOverride : selectedStake;
    const qs = selectedSubject ? `?subject=${selectedSubject}` : '';
    let data;
    try {
      data = await apiFetch<{ battle_id: number; questions: Question[]; opponent: { name: string } }>(
        `/api/battles/start-quiz/${qs}`, {
          method: 'POST',
          body: JSON.stringify({
            stake_coins: stake,
            rematch_battle_id: rematchId || undefined,
          }),
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Jangni boshlab bo'lmadi");
      return;
    }
    if (!ensurePlayable(data.questions)) return;
    setBattleId(data.battle_id);
    setQuestions(data.questions);
    setOpponentName(data.opponent?.name || 'Raqib');
    setRoundIdx(0); setMyScore(0); setOppScore(0); setSelectedChoice(null); setCorrectChoiceId(null);
    setLastBattleData(null);
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
        const fin = await apiFetch<{
          result: string;
          msg: string;
          stake_coins?: number;
          net_stake_delta?: number;
          can_rematch?: boolean;
          rematch_cta?: string;
        }>('/api/battles/finish/', {
          method: 'POST', body: JSON.stringify({ battle_id: battleId }),
        });
        setResultMsg(fin.msg);
        setLastBattleData(fin);
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
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    mmRef.current?.close();
    setSearchTimedOut(false);
    setMode('live-searching');
    const subject = selectedSubject || '';
    const mm = openSocket('/ws/battles/matchmaking/', subject ? { subject } : {});
    mmRef.current = mm;
    searchTimerRef.current = setTimeout(() => {
      mm.close();
      setSearchTimedOut(true);
    }, 25000);
    mm.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'search_failed') {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        mm.close();
        setMode('idle');
        toast.error(data.reason || "Bu fanda jang boshlab bo'lmadi");
        return;
      }
      if (data.event === 'matched') {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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
      if (msg.event === 'battle_state') {
        if (msg.questions && msg.questions.length > 0) setQuestions(msg.questions);
        const myId = String(useAuthStore.getState().user?.id);
        const scores = (msg.scores || {}) as Record<string, number>;
        const otherId = Object.keys(scores).find((k) => k !== myId);
        setMyScore(scores[myId] ?? 0);
        setOppScore(otherId ? scores[otherId] : 0);
        if (typeof msg.current_round === 'number' && msg.current_round >= 1) {
          setRoundIdx(Math.max(0, msg.current_round - 1));
        }
        setWaitingOpponent(Boolean(msg.waiting_for_opponent));
      } else if (msg.event === 'waiting_for_opponent') {
        setWaitingOpponent(true);
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        roundTimeoutRef.current = setTimeout(() => {
          ws.send(JSON.stringify({ action: 'claim_timeout', round_number: msg.round_number }));
        }, 30000);
      } else if (msg.event === 'round_result') {
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        setWaitingOpponent(false);
        const myId = String(useAuthStore.getState().user?.id);
        const scores = msg.scores as Record<string, number>;
        const otherId = Object.keys(scores).find((k) => k !== myId);
        setMyScore(scores[myId] ?? 0);
        setOppScore(otherId ? scores[otherId] : 0);
        if (typeof msg.correct_choice_id === 'number') {
          setCorrectChoiceId(msg.correct_choice_id);
        }
        setTimeout(() => { setRoundIdx((i) => i + 1); setSelectedChoice(null); setCorrectChoiceId(null); }, 600);
      } else if (msg.event === 'battle_finished') {
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        setWaitingOpponent(false);
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
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    wsRef.current?.close();
    mmRef.current?.close();
    setSearchTimedOut(false);
    setWaitingOpponent(false);
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
                      startLiveMatch();
                    }}
                    className="ps-btn ps-btn-ink"
                  >
                    <Swords className="size-4 text-[var(--ps-orange)]" /> Jonli raqib topish
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      tgHaptic('medium');
                      setMode('ghost');
                    }}
                    className="ps-btn ps-btn-ghost"
                  >
                    <Zap className="size-4" /> Ghost Replay duel
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
            {arena && (arena.subjects || []).length > 0 && (
              <div className="ds-seg flex max-w-full gap-1 overflow-x-auto no-scrollbar sm:w-fit">
                {(arena.subjects || []).map((s) => (
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
                {/* 1v1 Tanga Tikish (Wager) */}
                <div className="ps-card relative flex flex-wrap items-center justify-between gap-4 !rounded-[28px] p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
                      <Coins className="size-6" />
                    </span>
                    <div>
                      <p className="text-sm font-bold">1v1 Tanga Tikish (Duel Banki)</p>
                      <p className="text-xs text-[var(--text-muted)]">G&apos;olib 2x miqdorda «Ildiz tangalari»ni oladi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0, 25, 50, 100].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          soundFX.click();
                          setSelectedStake(s);
                        }}
                        className={cn(
                          'cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all',
                          selectedStake === s
                            ? 'bg-[#080808] text-[#FFFCF7] shadow-md dark:bg-[#FFFCF7] dark:text-[#080808]'
                            : 'bg-[var(--ps-neutral)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        {s === 0 ? '0 🪙 Bepul' : `${s} 🪙`}
                      </button>
                    ))}
                  </div>
                </div>
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
                    { onClick: () => startAiBattle(), icon: Bot, title: "AI bilan mashg'ulot jangi", desc: "AI bilan tezkor savollarda mashq qiling. Xavf yo'q, bilimlarni mustahkamlang.", cta: 'Boshlash', tone: 'bg-[var(--ps-purple)]' },
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
                  {(onlineUsers || []).map((u) => (
                    <Card key={u.id}>
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative shrink-0">
                            <Avatar className="size-9">
                              <AvatarImage src={u.avatar} alt="" />
                              <AvatarFallback className="text-xs">{u?.name ? u.name.slice(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--bg-page)] bg-[var(--success)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{u?.name || "O'quvchi"}</p>
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
          <ArenaStage>
            <div className="relative my-auto flex flex-col items-center py-8 text-center">
              <span className="ps-chip">
                <Radio className="size-3.5 animate-pulse text-[var(--ps-coral)]" />
                Jonli matchmaking
              </span>
              {!searchTimedOut ? (
                <>
                  <h3 className="ps-display mt-5 text-[34px] sm:text-[44px]">
                    Raqib <span className="text-[var(--ps-coral)]">qidirilmoqda</span>
                    <span className="text-[var(--ps-purple)]">…</span>
                  </h3>
                  <p className="mt-2 max-w-xs text-[13px] text-[var(--text-muted)]">Sizning darajangizga mos onlayn bilimdon ulanmoqda</p>
                  <div className="relative mt-8 flex size-24 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ps-coral)] opacity-25" />
                    <span className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--ps-coral)] opacity-60" />
                    <span className="relative inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                      <Swords className="size-7 animate-spin [animation-duration:2.4s]" />
                    </span>
                  </div>
                  <button type="button" onClick={reset} className="ps-btn ps-btn-ghost mt-8">Bekor qilish</button>
                </>
              ) : (
                <>
                  <h3 className="ps-display mt-5 text-[28px] sm:text-[36px]">
                    Hozir bo&apos;sh <span className="text-[var(--ps-coral)]">raqib topilmadi</span>
                  </h3>
                  <p className="mt-2 max-w-sm text-[13px] text-[var(--text-muted)]">
                    Shu fanda hozir onlayn navbatda boshqa o&apos;quvchi yo&apos;q. Qayta qidirishingiz, saqlangan Ghost yozuvi yoki AI bot bilan bellashishingiz mumkin.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={startLiveMatch} className="ps-btn ps-btn-ink">
                      <RotateCcw className="size-4" /> Qayta qidirish
                    </button>
                    <button type="button" onClick={() => setMode('ghost')} className="ps-btn ps-btn-light">
                      <Zap className="size-4" /> Ghost Replay bilan o&apos;ynash
                    </button>
                    <button type="button" onClick={() => startAiBattle()} className="ps-btn ps-btn-ghost">
                      <Bot className="size-4" /> AI Bot bilan mashq
                    </button>
                  </div>
                  <button type="button" onClick={reset} className="mt-4 text-xs font-semibold text-[var(--text-muted)] underline">
                    Arenaga qaytish
                  </button>
                </>
              )}
            </div>
          </ArenaStage>
        )}

        {(mode === 'ai' || mode === 'live') && currentQ && (() => {
          const meName = user?.first_name || user?.username || 'Siz';
          const total = Math.max(1, questions.length);
          const progress = Math.min(100, ((roundIdx + (selectedChoice !== null ? 1 : 0)) / total) * 100);
          const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
          return (
            <ArenaStage>
              <div className="relative flex flex-1 flex-col gap-5">
                {/* HUD */}
                <div className="relative overflow-hidden rounded-[28px] bg-[#080808] p-4 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                  <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-[var(--ps-purple)] opacity-40" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-8 border-2 border-[var(--ps-purple)]">
                          <AvatarImage src={user?.avatar_url || undefined} alt="" />
                          <AvatarFallback className="text-[11px] text-[#080808]">{meName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-[13.5px] font-bold">{meName}</span>
                      </div>
                      <span className="ps-num shrink-0 text-[24px] leading-none text-[var(--ps-lilac)]">
                        {myScore}<span className="ml-1 text-[0.45em] opacity-60">ball</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10 dark:bg-black/10">
                      <div className="h-full rounded-full bg-[var(--ps-purple)] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ps-coral)] bg-[var(--ps-coral)] text-white">
                          {mode === 'ai' ? <Bot className="size-4" /> : <Swords className="size-4" />}
                        </span>
                        <span className="truncate text-[13.5px] font-bold">{opponentName}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ps-green)] px-2 py-0.5 text-[10.5px] font-bold text-white">
                          <span className="size-1.5 rounded-full bg-white" /> {mode === 'ai' ? 'AI' : 'Jonli'}
                        </span>
                      </div>
                      <span className="ps-num shrink-0 text-[24px] leading-none text-[var(--ps-coral)]">
                        {oppScore}<span className="ml-1 text-[0.45em] opacity-60">ball</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10 dark:bg-black/10">
                      <div className="h-full rounded-full bg-[var(--ps-coral)] transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                {/* Savol */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="ps-chip">
                      <Clock className="size-3.5 text-[var(--ps-purple)]" />
                      Raund {roundIdx + 1} / {questions.length}
                    </span>
                    <div className="flex items-center gap-1">
                      {(questions || []).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-2 rounded-full transition-all',
                            i < roundIdx ? 'w-2 bg-[var(--ps-purple)]' : i === roundIdx ? 'w-6 bg-[var(--ps-orange)]' : 'w-2 bg-[var(--ds-track)]'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <h2
                    key={roundIdx}
                    className="mt-4 text-[20px] font-bold leading-snug text-[var(--text-primary)] sm:text-[24px] [&_p]:m-0"
                    dangerouslySetInnerHTML={{ __html: formatRichText(currentQ.text) }}
                  />
                </div>

                {/* Variantlar */}
                {waitingOpponent ? (
                  <p className="mt-auto flex items-center justify-center gap-2 rounded-full bg-[var(--ps-neutral)] p-4 text-[13.5px] font-bold text-[var(--text-muted)]">
                    <Loader2 className="size-4 animate-spin text-[var(--ps-purple)]" /> Raqibning javobi kutilmoqda…
                  </p>
                ) : (
                  <div className="mt-auto space-y-2.5">
                    {(currentQ?.choices || []).map((c, i) => {
                      const isSelected = selectedChoice === c.id;
                      const isCorrect = correctChoiceId === c.id;
                      // Variant matni o'z harfi bilan kelsa ("B) 3, 6") — harfni doiraga olamiz.
                      const own = /^\s*([A-Fa-f])\s*[).]\s*([\s\S]*)$/.exec(c.text);
                      const label = own ? own[1].toUpperCase() : LETTERS[i] || String(i + 1);
                      const body = own ? own[2] : c.text;
                      let row = 'bg-[var(--ps-neutral)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac)] hover:text-[#080808]';
                      let letter = 'bg-[var(--ps-paper)] text-[var(--text-primary)]';
                      if (selectedChoice !== null) {
                        if (isCorrect) { row = 'bg-[var(--ps-green)] text-white'; letter = 'bg-white/25 text-white'; }
                        else if (isSelected) { row = correctChoiceId === null ? 'bg-[var(--ps-purple)] text-white' : 'bg-[var(--ps-coral)] text-white'; letter = 'bg-white/25 text-white'; }
                        else row = 'bg-[var(--ps-neutral)] text-[var(--text-muted)] opacity-50';
                      }
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={selectedChoice !== null}
                          onClick={() => (mode === 'ai' ? answerAi(c.id) : answerLive(c.id))}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-3 rounded-full p-2 pr-5 text-left text-[14.5px] font-semibold transition-all duration-200 disabled:cursor-default',
                            row
                          )}
                        >
                          <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-black', letter)}>
                            {label}
                          </span>
                          <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatRichText(body) }} />
                          {selectedChoice !== null && isCorrect && <CheckCircle2 className="size-5 shrink-0" />}
                          {selectedChoice !== null && isSelected && correctChoiceId !== null && !isCorrect && <XCircle className="size-5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ArenaStage>
          );
        })()}

        {(mode === 'ai' || mode === 'live') && !currentQ && (
          <ArenaStage className="min-h-[420px]">
            <div className="relative my-auto flex flex-col items-center gap-4 text-center">
              <span className="inline-flex size-20 items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-muted)]">
                <Shield className="size-9" />
              </span>
              <h2 className="ps-display text-[28px]">Jangni ko&apos;rsatib bo&apos;lmadi</h2>
              <p className="max-w-xs text-[13.5px] text-[var(--text-muted)]">Savollar yuklanmadi. Boshqa fanni tanlab qayta urinib ko&apos;ring.</p>
              <button type="button" onClick={reset} className="ps-btn ps-btn-ink">
                <RotateCcw className="size-4" /> Arenaga qaytish
              </button>
            </div>
          </ArenaStage>
        )}

        {mode === 'result' && (
          <ArenaStage>
            <div className="relative my-auto flex flex-col items-center py-4 text-center">
              <div className="relative">
                <span className={cn('inline-flex size-24 items-center justify-center rounded-full', isWin ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-neutral)] text-[var(--text-muted)]')}>
                  {isWin ? <Trophy className="size-11" /> : <Shield className="size-11" />}
                </span>
                {isWin && (
                  <span className="absolute -right-3 -top-1 rotate-12 rounded-full bg-[var(--ps-green)] px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                    G&apos;alaba!
                  </span>
                )}
              </div>

              <h2 className="ps-display mt-5 max-w-md text-[26px] sm:text-[32px]">{resultMsg}</h2>

              <div className="mt-5 flex items-center gap-4">
                <div className="text-center">
                  <p className="ps-num text-[44px] leading-none text-[var(--ps-purple)]">{myScore}</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-[var(--text-muted)]">Siz</p>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#080808] text-[12px] font-black italic text-[var(--ps-orange)] dark:bg-[#FFFCF7]">VS</span>
                <div className="text-center">
                  <p className="ps-num text-[44px] leading-none text-[var(--ps-coral)]">{oppScore}</p>
                  <p className="mt-1 max-w-[120px] truncate text-[11.5px] font-semibold text-[var(--text-muted)]">{opponentName || 'Raqib'}</p>
                </div>
              </div>

              {arena && (
                <div className="relative mt-6 w-full max-w-sm overflow-hidden rounded-[26px] bg-[var(--ps-purple)] p-5 text-white">
                  <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                  <p className="relative text-[11px] font-bold uppercase opacity-75">Arena reytingi</p>
                  <div className="relative mt-1 flex items-center justify-center gap-3">
                    <p className="ps-num text-[36px] leading-none">
                      <StatNumber value={arena.elo_rating} />
                    </p>
                    {prevElo !== null && prevElo !== arena.elo_rating && (
                      <span className={cn('rounded-full px-3 py-1 font-mono text-[13px] font-bold', arena.elo_rating > prevElo ? 'bg-[var(--ps-green)]' : 'bg-[var(--ps-coral)]')}>
                        {arena.elo_rating > prevElo ? '+' : ''}{arena.elo_rating - prevElo}
                      </span>
                    )}
                  </div>
                  <p className="relative mt-1.5 text-[12.5px] font-semibold text-white/85">{arenaRankTitle(arena.elo_rating)}</p>
                </div>
              )}

              {lastBattleData?.net_stake_delta != null && lastBattleData.net_stake_delta !== 0 && (
                <div className={cn(
                  'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold',
                  lastBattleData.net_stake_delta > 0
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                )}>
                  <Coins className="size-4" />
                  {lastBattleData.net_stake_delta > 0
                    ? `+${lastBattleData.net_stake_delta} tanga yutib oldingiz!`
                    : `${lastBattleData.net_stake_delta} tanga sarflandi`}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5 w-full max-w-sm">
                {battleId && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      startAiBattle(selectedStake, battleId);
                    }}
                    className="ps-btn ps-btn-ink w-full"
                  >
                    <Swords className="size-4 text-[var(--ps-orange)]" />
                    Yana bir marta kuch sinashamizmi? (Revansh)
                  </button>
                )}
                <button type="button" onClick={reset} className="ps-btn ps-btn-ghost w-full">
                  <RotateCcw className="size-4" /> Arenaga qaytish
                </button>
              </div>
            </div>
          </ArenaStage>
        )}

        <Dialog open={!!incomingChallenge} onOpenChange={(open) => { if (!open) respondChallenge(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="size-5 text-[var(--ps-coral)]" /> Jang chaqiruvi
              </DialogTitle>
              <DialogDescription>
                <strong className="text-foreground">{incomingChallenge?.from?.name || 'Raqib'}</strong> sizni tezkor duelga chaqirmoqda. Jang qilasizmi?
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
