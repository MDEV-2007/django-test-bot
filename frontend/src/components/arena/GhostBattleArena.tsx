'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Zap,
  Flame,
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Users,
  Shield,
  Clock,
  Send,
  Radio,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { celebrate } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Choice {
  id: number;
  text: string;
  is_correct: boolean;
}

interface QuestionItem {
  id: number;
  body: string;
  choices: Choice[];
}

interface GhostMove {
  question_id: number;
  selected_option_id: number;
  is_correct: boolean;
  time_taken_ms: number;
  score: number;
}

interface OpponentData {
  id: number;
  name: string;
  avatar_url: string;
  region?: string;
  elo_rating: number;
  is_ghost: boolean;
}

export interface GhostBattleArenaProps {
  subjectSlug?: string;
  incomingDuelToken?: string | null;
  onExit?: () => void;
  onOpenViralDuel?: (userScore: number, opponentScore: number) => void;
}

export default function GhostBattleArena({
  subjectSlug = 'tarix',
  incomingDuelToken = null,
  onExit,
  onOpenViralDuel,
}: GhostBattleArenaProps) {
  const { user } = useAuthStore();

  // State phases: 'searching' | 'match_found' | 'battle' | 'result'
  const [phase, setPhase] = useState<'searching' | 'match_found' | 'battle' | 'result'>('searching');
  const [matchId, setMatchId] = useState<string>('');
  const [opponent, setOpponent] = useState<OpponentData | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [ghostMoves, setGhostMoves] = useState<GhostMove[]>([]);

  // Current battle state
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userScore, setUserScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [userCombo, setUserCombo] = useState<number>(0);

  // Micro-toast for opponent action
  const [opponentToast, setOpponentToast] = useState<string | null>(null);

  // User player moves log to save for future Ghost replays & duels
  const userMovesLogRef = useRef<GhostMove[]>([]);
  const qStartTimeRef = useRef<number>(Date.now());

  // 1. MATCHMAKING: 3 soniyada jonli raqib qidirish, topilmasa Ghost Replay
  const startMatchmaking = useCallback(async () => {
    setPhase('searching');
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQIndex(0);
    setOpponentToast(null);
    userMovesLogRef.current = [];

    try {
      if (incomingDuelToken) {
        // Do'stining dueli orqali kirgan
        const duelRes = await apiFetch<{
          ok: boolean;
          duel: {
            token: string;
            creator_name: string;
            creator_avatar: string;
            creator_score: number;
            subject_name: string;
          };
          questions: QuestionItem[];
          opponent_moves: GhostMove[];
        }>(`/api/growth/arena/duel/${incomingDuelToken}/`);

        if (duelRes && duelRes.ok) {
          setMatchId(`duel_${incomingDuelToken}`);
          const opp: OpponentData = {
            id: 9999,
            name: duelRes.duel.creator_name,
            avatar_url: duelRes.duel.creator_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=challenger',
            region: "Do'st Dueli",
            elo_rating: 1240,
            is_ghost: true,
          };
          setOpponent(opp);
          setQuestions(duelRes.questions);
          setGhostMoves(duelRes.opponent_moves);
          triggerMatchFound(opp);
          return;
        }
      }

      // Standart 1v1 Matchmaking (3 soniya radar effekti)
      const res = await apiFetch<{
        ok: boolean;
        match_id: string;
        opponent: OpponentData;
        questions: QuestionItem[];
        ghost_moves: GhostMove[];
      }>('/api/growth/arena/matchmake/', {
        method: 'POST',
        body: JSON.stringify({ subject_slug: subjectSlug }),
      });

      if (res && res.ok) {
        setMatchId(res.match_id);
        const opp: OpponentData = {
          ...res.opponent,
          region: res.opponent.region || 'Toshkent sh., 1-litsey',
        };
        setOpponent(opp);
        setQuestions(res.questions);
        setGhostMoves(res.ghost_moves);
        triggerMatchFound(opp);
      }
    } catch {
      // Fallback opponent agar server offline bo'lsa
      setTimeout(() => {
        const fallbackOpp: OpponentData = {
          id: 8888,
          name: 'Javohir Aliyev',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Javohir',
          region: 'Samarqand sh., 42-maktab',
          elo_rating: 1240,
          is_ghost: true,
        };
        setOpponent(fallbackOpp);
        setQuestions([
          {
            id: 1,
            body: "Amir Temur qaysi yili Balx shahrida buyuk amir deb e'lon qilingan?",
            choices: [
              { id: 1, text: '1365-yil', is_correct: false },
              { id: 2, text: '1370-yil', is_correct: true },
              { id: 3, text: '1385-yil', is_correct: false },
              { id: 4, text: '1391-yil', is_correct: false },
            ],
          },
          {
            id: 2,
            body: "O'zbekiston hududidagi qadimgi Oks ibodatxonasi qaysi yodgorlikdan topilgan?",
            choices: [
              { id: 5, text: 'Dalvarzintepa', is_correct: false },
              { id: 6, text: 'Taxiti Sangin', is_correct: true },
              { id: 7, text: 'Xolchayon', is_correct: false },
              { id: 8, text: 'Qoratepa', is_correct: false },
            ],
          },
          {
            id: 3,
            body: 'Qadimgi Turon xalqlari qaysi din ta\'limotiga e\'tiqod qilgan?',
            choices: [
              { id: 9, text: 'Zardushtiylik', is_correct: true },
              { id: 10, text: 'Buddizm', is_correct: false },
              { id: 11, text: 'Monaviylik', is_correct: false },
              { id: 12, text: 'Xristianlik', is_correct: false },
            ],
          },
        ]);
        setGhostMoves([
          { question_id: 1, selected_option_id: 2, is_correct: true, time_taken_ms: 3200, score: 10 },
          { question_id: 2, selected_option_id: 6, is_correct: true, time_taken_ms: 2800, score: 10 },
          { question_id: 3, selected_option_id: 9, is_correct: true, time_taken_ms: 3500, score: 10 },
        ]);
        triggerMatchFound(fallbackOpp);
      }, 3000);
    }
  }, [incomingDuelToken, subjectSlug]);

  const triggerMatchFound = (_opp: OpponentData) => {
    setPhase('match_found');
    tgHaptic('medium');
    soundFX.click();

    setTimeout(() => {
      setPhase('battle');
      qStartTimeRef.current = Date.now();
    }, 1800);
  };

  useEffect(() => {
    startMatchmaking();
  }, [startMatchmaking]);

  // 2. GHOST OPPONENT SIMULATOR (Vaqt bo'yicha harakatlanish va mikro-toast)
  useEffect(() => {
    if (phase !== 'battle' || currentQIndex >= questions.length) return;

    const ghostMove = ghostMoves[currentQIndex];
    if (!ghostMove) return;

    const delay = Math.min(Math.max(ghostMove.time_taken_ms, 1800), 5000);
    const timer = setTimeout(() => {
      if (ghostMove.is_correct) {
        setOpponentScore((prev) => prev + 10);
        const sec = (delay / 1000).toFixed(1);
        setOpponentToast(`⚡ ${opponent?.name || 'Raqib'} ${currentQIndex + 1}-savolga ${sec}s da to'g'ri javob berdi!`);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, currentQIndex, questions.length, ghostMoves, opponent?.name]);

  // Toastni 2.5s dan keyin tozalash
  useEffect(() => {
    if (!opponentToast) return;
    const t = setTimeout(() => setOpponentToast(null), 2500);
    return () => clearTimeout(t);
  }, [opponentToast]);

  // 3. FOYDALANUVCHI JAVOBINI QABUL QILISH
  const handleSelectChoice = (choice: Choice) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedChoiceId(choice.id);

    const timeTaken = Date.now() - qStartTimeRef.current;
    const isCorrect = choice.is_correct;

    if (isCorrect) {
      soundFX.correct();
      tgHaptic('success');
      setUserCombo((prev) => prev + 1);
      const points = 10 + (userCombo >= 2 ? 5 : 0);
      setUserScore((prev) => prev + points);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
      setUserCombo(0);
    }

    userMovesLogRef.current.push({
      question_id: questions[currentQIndex]?.id,
      selected_option_id: choice.id,
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
      score: isCorrect ? 10 : 0,
    });

    setTimeout(() => {
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex((prev) => prev + 1);
        setSelectedChoiceId(null);
        setIsAnswered(false);
        qStartTimeRef.current = Date.now();
      } else {
        finishBattle();
      }
    }, 1300);
  };

  // 4. JANGNI YAKUNLASH
  const finishBattle = async () => {
    setPhase('result');
    if (userScore >= opponentScore) {
      celebrate();
      soundFX.success();
    } else {
      soundFX.incorrect();
    }

    try {
      await apiFetch('/api/growth/arena/record-replay/', {
        method: 'POST',
        body: JSON.stringify({
          moves_log: userMovesLogRef.current,
          question_ids: questions.map((q) => q.id),
        }),
      });

      if (incomingDuelToken) {
        await apiFetch(`/api/growth/arena/duel/${incomingDuelToken}/submit/`, {
          method: 'POST',
          body: JSON.stringify({ score: userScore }),
        });
      }
    } catch {
      // ignore
    }
  };

  const currentQ = questions[currentQIndex];
  const totalQuestions = questions.length || 1;
  const userProgressPercent = Math.min(((currentQIndex + (isAnswered ? 1 : 0)) / totalQuestions) * 100, 100);
  const opponentProgressPercent = Math.min(((currentQIndex + 1) / totalQuestions) * 100, 100);
  const isWinner = userScore >= opponentScore;

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[580px] flex flex-col justify-between p-4 sm:p-5 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-2xl select-none overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          A. 3-SONIYALIK MATCHMAKING RADAR (Kutish ekrani)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="my-auto flex flex-col items-center justify-center text-center space-y-6 py-10"
          >
            {/* 2 Ta Karta: Siz VS Radar Raqib */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-sm">
              {/* Siz */}
              <div className="flex-1 flex flex-col items-center p-3.5 rounded-xl bg-zinc-950/60 border border-blue-500/30 shadow-[0_0_20px_-5px_rgba(59,130,246,0.25)]">
                <div className="relative">
                  <img
                    src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'}
                    alt="Siz"
                    className="size-14 rounded-full border-2 border-blue-500 bg-zinc-900 object-cover"
                  />
                  <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>
                <p className="mt-2 text-xs font-bold text-white truncate max-w-[100px]">{user?.first_name || user?.username || 'Siz'}</p>
                <span className="text-[10px] font-mono text-blue-400 font-semibold">{user?.elo_rating || 1200} ELO</span>
              </div>

              {/* VS Chaqmoq */}
              <div className="flex flex-col items-center shrink-0">
                <div className="size-10 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                  <Zap className="size-5 fill-white" />
                </div>
                <span className="mt-1 text-[10px] font-black italic tracking-wider text-orange-400">VS</span>
              </div>

              {/* Radar: Raqib qidirilmoqda */}
              <div className="flex-1 flex flex-col items-center p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 relative overflow-hidden">
                <div className="relative flex items-center justify-center size-14">
                  <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-rose-500/30 animate-pulse" />
                  <div className="relative size-12 rounded-full bg-zinc-800 border border-dashed border-rose-500/50 flex items-center justify-center text-rose-400">
                    <Swords className="size-6 animate-spin text-rose-400" />
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold text-zinc-300">Raqib...</p>
                <span className="text-[10px] font-mono text-zinc-500">Qidirilmoqda</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Jonli Raqib Qidirilmoqda...</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Sizning ELO ballingizga yaqin kuchli raqib tanlanmoqda
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <Radio className="size-3.5 animate-pulse text-rose-400" />
              <span>Tezkor Matchmaking (3 soniya)</span>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            B. MATCH FOUND (3-Soniyada Raqib Topildi Chaqnashi)
           ───────────────────────────────────────────────────────────── */}
        {phase === 'match_found' && opponent && (
          <motion.div
            key="match_found"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            className="my-auto flex flex-col items-center justify-center py-10 space-y-6 text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-bounce">
              <Sparkles className="size-3.5" />
              <span>Raqib Topildi!</span>
            </div>

            <div className="flex items-center justify-center gap-6 w-full max-w-sm">
              {/* Siz */}
              <div className="flex flex-col items-center space-y-1.5">
                <img
                  src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'}
                  alt="Siz"
                  className="size-16 rounded-full border-2 border-blue-500 bg-zinc-900 object-cover shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                />
                <span className="text-xs font-bold text-white">{user?.first_name || user?.username || 'Siz'}</span>
                <span className="text-[10px] font-mono text-blue-400">{user?.elo_rating || 1200} ELO</span>
              </div>

              <div className="text-2xl font-black italic text-orange-400 animate-pulse">VS</div>

              {/* Raqib: scale-105 chaqnash */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1.05 }}
                className="flex flex-col items-center space-y-1.5 p-3 rounded-xl bg-zinc-950/80 border border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.4)]"
              >
                <div className="relative">
                  <img
                    src={opponent.avatar_url}
                    alt={opponent.name}
                    className="size-16 rounded-full border-2 border-rose-500 bg-zinc-900 object-cover"
                  />
                  <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[110px]">{opponent.name}</span>
                <span className="text-[10px] text-zinc-400 truncate max-w-[110px]">{opponent.region}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {opponent.elo_rating} ELO
                </span>
              </motion.div>
            </div>

            <p className="text-xs font-mono text-zinc-400 tracking-wider">Jang boshlanmoqda...</p>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            C. DUAL SPLIT-PROGRESS HUD & JANG MAYDONI
           ───────────────────────────────────────────────────────────── */}
        {phase === 'battle' && currentQ && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col justify-between space-y-4"
          >
            {/* Dual Split-Progress HUD (2 qatorli Tug-of-War progress bar) */}
            <div className="space-y-2 p-3 rounded-xl bg-zinc-950/70 border border-white/[0.07]">
              {/* 1-qator: Siz */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'}
                      alt="Siz"
                      className="size-5 rounded-full border border-blue-400"
                    />
                    <span className="font-bold text-white text-[11px] truncate max-w-[100px]">{user?.first_name || user?.username || 'Siz'}</span>
                    {userCombo > 1 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        🔥 {userCombo}x Combo
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-extrabold text-blue-400 text-xs">{userScore} ball</span>
                </div>
                {/* Ko'k progress bar */}
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-300"
                    style={{ width: `${userProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* 2-qator: Raqib */}
              <div className="space-y-1 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <img
                        src={opponent?.avatar_url}
                        alt={opponent?.name}
                        className="size-5 rounded-full border border-rose-500"
                      />
                      <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <span className="font-bold text-zinc-300 text-[11px] truncate max-w-[100px]">{opponent?.name}</span>
                    <span className="text-[9.5px] font-medium text-emerald-400 flex items-center gap-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-400" /> Jonli
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-rose-400 text-xs">{opponentScore} ball</span>
                </div>
                {/* Olovrang progress bar */}
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-500"
                    style={{ width: `${opponentProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Raqib Harakati Mikro-Toasti */}
              <AnimatePresence>
                {opponentToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5 text-center truncate"
                  >
                    {opponentToast}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Savol Matni */}
            <div className="py-2 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Savol {currentQIndex + 1} / {totalQuestions}
              </span>
              <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {currentQ.body}
              </p>
            </div>

            {/* Variantlar */}
            <div className="space-y-2 pt-1">
              {currentQ.choices.map((choice) => {
                const isSelected = selectedChoiceId === choice.id;
                let choiceStyle = 'border-white/10 bg-zinc-950/60 hover:bg-zinc-800/70 hover:border-white/20 text-zinc-200';

                if (isAnswered) {
                  if (choice.is_correct) {
                    choiceStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                  } else if (isSelected && !choice.is_correct) {
                    choiceStyle = 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
                  } else {
                    choiceStyle = 'opacity-40 border-white/5 bg-zinc-950/30 text-zinc-500';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectChoice(choice)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between cursor-pointer disabled:cursor-default',
                      choiceStyle
                    )}
                  >
                    <span>{choice.text}</span>
                    {isAnswered && choice.is_correct && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-2" />}
                    {isAnswered && isSelected && !choice.is_correct && <XCircle className="size-4 text-rose-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            D. NATIJA EKRANI (G'oliblik & Duel Share)
           ───────────────────────────────────────────────────────────── */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto flex flex-col items-center justify-center space-y-5 py-6 text-center"
          >
            <div className="relative">
              <div
                className={cn(
                  'size-20 rounded-2xl flex items-center justify-center text-white shadow-2xl',
                  isWinner
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-amber-500/40'
                    : 'bg-zinc-800 border border-white/10'
                )}
              >
                {isWinner ? <Trophy className="size-10 fill-white" /> : <Shield className="size-10 text-zinc-400" />}
              </div>
              {isWinner && (
                <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white shadow">
                  G&apos;alaba!
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {isWinner ? "G'alaba Qozondingiz!" : "Bu Gal Raqib Qo'li Baland Keldi"}
              </h2>
              <p className="text-xs text-zinc-400">
                Yakuniy hisob: <span className="font-mono font-bold text-white">{userScore}</span> —{' '}
                <span className="font-mono font-bold text-zinc-400">{opponentScore}</span>
              </p>
            </div>

            {/* Mukofotlar bloki */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/10">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tajriba</span>
                <p className="text-xs font-mono font-bold text-blue-400 mt-0.5">+50 XP</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/10">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tanga</span>
                <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">+25 🪙</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/10">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Reyting</span>
                <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {isWinner ? '+18 ELO' : '-10 ELO'}
                </p>
              </div>
            </div>

            {/* Viral Duel Ticket UI */}
            <div className="w-full max-w-sm p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-zinc-950 to-indigo-950/40 border border-blue-500/25 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 uppercase">Sizning Natijangiz</span>
                  <p className="font-bold text-white">{userScore} ball</p>
                </div>
                <div className="size-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  VS
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase">Do&apos;stingiz</span>
                  <p className="font-bold text-zinc-500">? / 10</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenViralDuel?.(userScore, opponentScore)}
                className="w-full h-10 rounded-lg bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(42,171,238,0.4)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <Send className="size-3.5 fill-white" />
                <span>Do&apos;stni Telegramda Duelga Chorlash (+100 🪙)</span>
              </button>
            </div>

            {/* Qayta o'ynash / Chiqish */}
            <div className="flex items-center gap-2.5 w-full max-w-sm pt-1">
              <button
                type="button"
                onClick={startMatchmaking}
                className="flex-1 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Yana O&apos;ynash</span>
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 h-11 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Chiqish
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
