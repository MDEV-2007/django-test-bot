'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Zap,
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
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
import ArenaStage from './ArenaStage';
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

  const meName = user?.first_name || user?.username || 'Siz';
  const meAvatar = user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me';
  const meElo = user?.elo_rating || 1200;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <ArenaStage>
      <AnimatePresence mode="wait">
        {/* ─────────────────────────────────────────────────────────────
            A. MATCHMAKING RADAR (Kutish ekrani)
           ───────────────────────────────────────────────────────────── */}
        {phase === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative my-auto flex flex-col items-center py-8 text-center"
          >
            <span className="ps-chip">
              <Radio className="size-3.5 animate-pulse text-[var(--ps-coral)]" />
              Tezkor matchmaking · 3 soniya
            </span>
            <h3 className="ps-display mt-5 text-[34px] sm:text-[44px]">
              Raqib <span className="text-[var(--ps-coral)]">qidirilmoqda</span>
              <span className="text-[var(--ps-purple)]">…</span>
            </h3>
            <p className="mt-2 max-w-xs text-[13px] text-[var(--text-muted)]">
              ELO reytingingizga yaqin kuchli raqib tanlanmoqda
            </p>

            <div className="mt-8 grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
              {/* Siz */}
              <div className="relative flex flex-col items-center overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-5 text-white">
                <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                <div className="relative">
                  <img src={meAvatar} alt="Siz" className="size-16 rounded-full border-4 border-white/80 bg-white object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full border-[3px] border-[var(--ps-purple)] bg-[var(--ps-green)]" />
                </div>
                <p className="relative mt-3 max-w-full truncate text-[14px] font-bold">{meName}</p>
                <span className="relative mt-1 rounded-full bg-black/20 px-2.5 py-0.5 font-mono text-[11.5px] font-bold">{meElo} ELO</span>
              </div>

              {/* VS */}
              <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)] dark:bg-[#FFFCF7]">
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[var(--ps-orange)] opacity-25" />
                <Zap className="relative size-6 fill-current" />
              </span>

              {/* Radar */}
              <div className="relative flex flex-col items-center overflow-hidden rounded-[28px] bg-[var(--ps-neutral)] p-5">
                <div className="relative flex size-16 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ps-coral)] opacity-25" />
                  <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-[var(--ps-coral)] opacity-60" />
                  <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                    <Swords className="size-5 animate-spin [animation-duration:2.4s]" />
                  </span>
                </div>
                <p className="mt-3 text-[14px] font-bold text-[var(--text-primary)]">Raqib…</p>
                <span className="mt-1 rounded-full bg-[var(--ps-paper)] px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-[var(--text-muted)]">qidirilmoqda</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            B. MATCH FOUND — VS ekrani
           ───────────────────────────────────────────────────────────── */}
        {phase === 'match_found' && opponent && (
          <motion.div
            key="match_found"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            className="relative my-auto flex flex-col items-center py-6 text-center"
          >
            <motion.span
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-4 py-1.5 text-[13px] font-bold text-white"
            >
              <Sparkles className="size-4" />
              Raqib topildi!
            </motion.span>

            <div className="relative mt-8 grid w-full grid-cols-2 gap-3">
              {/* Siz */}
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="relative flex flex-col items-center overflow-hidden rounded-[32px] bg-[var(--ps-purple)] px-4 py-7 text-white"
              >
                <span aria-hidden className="absolute -left-8 -top-8 size-28 rounded-full bg-white/15" />
                <span aria-hidden className="ps-dots absolute bottom-0 left-0 h-16 w-28 opacity-25" />
                <img src={meAvatar} alt="Siz" className="relative size-24 rounded-full border-[5px] border-white/85 bg-white object-cover" />
                <p className="relative mt-4 max-w-full truncate text-[18px] font-bold">{meName}</p>
                <span className="relative mt-2 rounded-full bg-black/20 px-3 py-1 font-mono text-[12.5px] font-bold">{meElo} ELO</span>
              </motion.div>

              {/* Raqib */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="relative flex flex-col items-center overflow-hidden rounded-[32px] bg-[var(--ps-coral)] px-4 py-7 text-white"
              >
                <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
                <span aria-hidden className="ps-dots absolute bottom-0 right-0 h-16 w-28 opacity-25" />
                <div className="relative">
                  <img src={opponent.avatar_url} alt={opponent.name} className="size-24 rounded-full border-[5px] border-white/85 bg-white object-cover" />
                  <span className="absolute bottom-1 right-1 size-5 rounded-full border-[3px] border-[var(--ps-coral)] bg-[var(--ps-green)]" />
                </div>
                <p className="relative mt-4 max-w-full truncate text-[18px] font-bold">{opponent.name}</p>
                {opponent.region && <p className="relative max-w-full truncate text-[12px] font-semibold text-white/80">{opponent.region}</p>}
                <span className="relative mt-2 rounded-full bg-black/20 px-3 py-1 font-mono text-[12.5px] font-bold">{opponent.elo_rating} ELO</span>
              </motion.div>

              {/* VS markazda */}
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.15 }}
                className="ps-display absolute left-1/2 top-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-[var(--ps-paper)] bg-[#080808] text-[22px] italic text-[var(--ps-orange)] sm:size-20 sm:text-[26px] dark:bg-[#FFFCF7]"
              >
                VS
              </motion.span>
            </div>

            <p className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-[var(--text-muted)]">
              <span className="size-2 animate-pulse rounded-full bg-[var(--ps-orange)]" />
              Jang boshlanmoqda…
            </p>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            C. JANG MAYDONI — ikki qatorli HUD + savol
           ───────────────────────────────────────────────────────────── */}
        {phase === 'battle' && currentQ && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex flex-1 flex-col gap-5"
          >
            {/* HUD */}
            <div className="relative overflow-hidden rounded-[28px] bg-[#080808] p-4 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
              <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-[var(--ps-purple)] opacity-40" />
              {/* Siz */}
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <img src={meAvatar} alt="Siz" className="size-8 rounded-full border-2 border-[var(--ps-purple)] bg-white object-cover" />
                    <span className="truncate text-[13.5px] font-bold">{meName}</span>
                    {userCombo > 1 && (
                      <span className="shrink-0 animate-pulse rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[11px] font-bold text-[#080808]">
                        🔥 {userCombo}x combo
                      </span>
                    )}
                  </div>
                  <span className="ps-num shrink-0 text-[24px] leading-none text-[var(--ps-lilac)]">
                    {userScore}<span className="ml-1 text-[0.45em] opacity-60">ball</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10 dark:bg-black/10">
                  <div className="h-full rounded-full bg-[var(--ps-purple)] transition-all duration-300" style={{ width: `${userProgressPercent}%` }} />
                </div>
              </div>

              {/* Raqib */}
              <div className="relative mt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative shrink-0">
                      <img src={opponent?.avatar_url} alt={opponent?.name} className="size-8 rounded-full border-2 border-[var(--ps-coral)] bg-white object-cover" />
                      <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-[var(--ps-green)]" />
                    </div>
                    <span className="truncate text-[13.5px] font-bold">{opponent?.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ps-green)] px-2 py-0.5 text-[10.5px] font-bold text-white">
                      <span className="size-1.5 rounded-full bg-white" /> Jonli
                    </span>
                  </div>
                  <span className="ps-num shrink-0 text-[24px] leading-none text-[var(--ps-coral)]">
                    {opponentScore}<span className="ml-1 text-[0.45em] opacity-60">ball</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10 dark:bg-black/10">
                  <div className="h-full rounded-full bg-[var(--ps-coral)] transition-all duration-500" style={{ width: `${opponentProgressPercent}%` }} />
                </div>
              </div>

              {/* Raqib harakati */}
              <AnimatePresence>
                {opponentToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="relative mt-3 truncate rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-center text-[12px] font-bold text-[#080808]"
                  >
                    {opponentToast}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Savol */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="ps-chip">
                  <Clock className="size-3.5 text-[var(--ps-purple)]" />
                  Savol {currentQIndex + 1} / {totalQuestions}
                </span>
                <div className="flex items-center gap-1">
                  {questions.map((q, i) => (
                    <span
                      key={q.id}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        i < currentQIndex ? 'w-2 bg-[var(--ps-purple)]' : i === currentQIndex ? 'w-6 bg-[var(--ps-orange)]' : 'w-2 bg-[var(--ds-track)]'
                      )}
                    />
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentQ.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 text-[20px] font-bold leading-snug text-[var(--text-primary)] sm:text-[24px]"
                >
                  {currentQ.body}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Variantlar */}
            <div className="mt-auto space-y-2.5">
              {currentQ.choices.map((choice, i) => {
                const isSelected = selectedChoiceId === choice.id;
                let row = 'bg-[var(--ps-neutral)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac)] hover:text-[#080808]';
                let letter = 'bg-[var(--ps-paper)] text-[var(--text-primary)]';
                if (isAnswered) {
                  if (choice.is_correct) {
                    row = 'bg-[var(--ps-green)] text-white';
                    letter = 'bg-white/25 text-white';
                  } else if (isSelected) {
                    row = 'bg-[var(--ps-coral)] text-white';
                    letter = 'bg-white/25 text-white';
                  } else {
                    row = 'bg-[var(--ps-neutral)] text-[var(--text-muted)] opacity-50';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectChoice(choice)}
                    className={cn(
                      'group flex w-full cursor-pointer items-center gap-3 rounded-full p-2 pr-5 text-left text-[14.5px] font-semibold transition-all duration-200 disabled:cursor-default',
                      row
                    )}
                  >
                    <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-black transition-colors', letter)}>
                      {LETTERS[i] || i + 1}
                    </span>
                    <span className="flex-1">{choice.text}</span>
                    {isAnswered && choice.is_correct && <CheckCircle2 className="size-5 shrink-0" />}
                    {isAnswered && isSelected && !choice.is_correct && <XCircle className="size-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            D. NATIJA EKRANI
           ───────────────────────────────────────────────────────────── */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative my-auto flex flex-col items-center py-4 text-center"
          >
            <div className="relative">
              <span
                className={cn(
                  'inline-flex size-24 items-center justify-center rounded-full',
                  isWinner ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-neutral)] text-[var(--text-muted)]'
                )}
              >
                {isWinner ? <Trophy className="size-11" /> : <Shield className="size-11" />}
              </span>
              {isWinner && (
                <span className="absolute -right-3 -top-1 rotate-12 rounded-full bg-[var(--ps-green)] px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                  G&apos;alaba!
                </span>
              )}
            </div>

            <h2 className="ps-display mt-5 text-[30px] sm:text-[38px]">
              {isWinner ? (
                <>G&apos;alaba <span className="text-[var(--ps-orange)]">qozondingiz!</span></>
              ) : (
                <>Bu gal raqib <span className="text-[var(--ps-coral)]">kuchliroq</span></>
              )}
            </h2>

            {/* Yakuniy hisob */}
            <div className="mt-5 flex items-center gap-4">
              <div className="text-center">
                <p className="ps-num text-[44px] leading-none text-[var(--ps-purple)]">{userScore}</p>
                <p className="mt-1 text-[11.5px] font-semibold text-[var(--text-muted)]">Siz</p>
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#080808] text-[12px] font-black italic text-[var(--ps-orange)] dark:bg-[#FFFCF7]">VS</span>
              <div className="text-center">
                <p className="ps-num text-[44px] leading-none text-[var(--ps-coral)]">{opponentScore}</p>
                <p className="mt-1 max-w-[110px] truncate text-[11.5px] font-semibold text-[var(--text-muted)]">{opponent?.name || 'Raqib'}</p>
              </div>
            </div>

            {/* Mukofotlar */}
            <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2.5">
              {[
                { label: 'Tajriba', value: '+50 XP', tone: 'bg-[var(--ps-purple)] text-white' },
                { label: 'Tanga', value: '+25 🪙', tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                { label: 'Reyting', value: isWinner ? '+18 ELO' : '-10 ELO', tone: isWinner ? 'bg-[var(--ps-green)] text-white' : 'bg-[var(--ps-coral)] text-white' },
              ].map((r) => (
                <div key={r.label} className={cn('relative overflow-hidden rounded-[22px] p-3', r.tone)}>
                  <span aria-hidden className="absolute -right-4 -top-4 size-12 rounded-full bg-white/20" />
                  <p className="relative text-[11px] font-bold uppercase opacity-75">{r.label}</p>
                  <p className="relative mt-1 font-mono text-[15px] font-black">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Do'stni duelga chorlash */}
            <div className="mt-4 w-full max-w-md rounded-[26px] bg-[var(--ps-neutral)] p-4">
              <div className="flex items-center justify-between text-left">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Sizning natijangiz</p>
                  <p className="text-[16px] font-bold">{userScore} ball</p>
                </div>
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ps-blue)] text-[11px] font-black text-[#080808]">VS</span>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Do&apos;stingiz</p>
                  <p className="text-[16px] font-bold text-[var(--text-muted)]">? ball</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenViralDuel?.(userScore, opponentScore)}
                className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2AABEE] text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Send className="size-4 fill-white" />
                Do&apos;stni Telegramda duelga chorlash (+100 🪙)
              </button>
            </div>

            {/* Qayta o'ynash / Chiqish */}
            <div className="mt-4 flex w-full max-w-md items-center gap-2.5">
              <button type="button" onClick={startMatchmaking} className="ps-btn ps-btn-ink flex-1">
                <RotateCcw className="size-4" />
                Yana o&apos;ynash
              </button>
              {onExit && (
                <button type="button" onClick={onExit} className="ps-btn ps-btn-ghost">
                  Chiqish
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ArenaStage>
  );
}
