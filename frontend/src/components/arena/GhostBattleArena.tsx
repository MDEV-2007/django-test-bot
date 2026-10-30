'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Shield,
  Zap,
  Clock,
  Flame,
  Trophy,
  Share2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Users,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { celebrate } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  elo_rating: number;
  is_ghost: boolean;
}

interface GhostBattleArenaProps {
  subjectSlug?: string;
  incomingDuelToken?: string | null;
  onExit?: () => void;
}

export default function GhostBattleArena({
  subjectSlug = 'tarix',
  incomingDuelToken = null,
  onExit,
}: GhostBattleArenaProps) {
  const { user } = useAuthStore();

  // State phases: 'searching' | 'countdown' | 'battle' | 'result'
  const [phase, setPhase] = useState<'searching' | 'countdown' | 'battle' | 'result'>('searching');
  const [countdown, setCountdown] = useState<number>(3);

  // Match info
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

  // User player moves log to save for future Ghost replays & duels
  const userMovesLogRef = useRef<GhostMove[]>([]);
  const qStartTimeRef = useRef<number>(Date.now());

  // Share state
  const [createdDuelToken, setCreatedDuelToken] = useState<string | null>(null);
  const [isGeneratingDuel, setIsGeneratingDuel] = useState<boolean>(false);

  // 1. MATCHMAKING: 3 soniyada jonli raqib qidirish, topilmasa Ghost Replay
  const startMatchmaking = useCallback(async () => {
    setPhase('searching');
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQIndex(0);
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
          setOpponent({
            id: 9999,
            name: duelRes.duel.creator_name,
            avatar_url: duelRes.duel.creator_avatar,
            elo_rating: 1100,
            is_ghost: true,
          });
          setQuestions(duelRes.questions);
          setGhostMoves(duelRes.opponent_moves);
          startCountdown();
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
        setOpponent(res.opponent);
        setQuestions(res.questions);
        setGhostMoves(res.ghost_moves);
        startCountdown();
      }
    } catch (e) {
      toast.error("Raqib topishda xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  }, [incomingDuelToken, subjectSlug]);

  const startCountdown = () => {
    setPhase('countdown');
    soundFX.click();
    let count = 3;
    setCountdown(3);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      soundFX.click();
      if (count <= 0) {
        clearInterval(interval);
        setPhase('battle');
        qStartTimeRef.current = Date.now();
      }
    }, 1000);
  };

  useEffect(() => {
    startMatchmaking();
  }, [startMatchmaking]);

  // 2. GHOST OPPONENT SIMULATOR (Vaqt bo'yicha harakatlanish)
  useEffect(() => {
    if (phase !== 'battle' || currentQIndex >= questions.length) return;

    const ghostMove = ghostMoves[currentQIndex];
    if (!ghostMove) return;

    // Raqib o'zining yozib olingan vaqtida javob beradi
    const opponentTimer = setTimeout(() => {
      if (ghostMove.is_correct) {
        setOpponentScore((prev) => prev + 10);
      }
    }, Math.min(ghostMove.time_taken_ms, 5000));

    return () => clearTimeout(opponentTimer);
  }, [phase, currentQIndex, questions.length, ghostMoves]);

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
      const points = 10 + (userCombo > 1 ? 5 : 0);
      setUserScore((prev) => prev + points);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
      setUserCombo(0);
    }

    // Harakatni logga saqlash
    userMovesLogRef.current.push({
      question_id: questions[currentQIndex]?.id,
      selected_option_id: choice.id,
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
      score: isCorrect ? 10 : 0,
    });

    // 1.5 soniyadan so'ng keyingi savolga o'tish
    setTimeout(() => {
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex((prev) => prev + 1);
        setSelectedChoiceId(null);
        setIsAnswered(false);
        qStartTimeRef.current = Date.now();
      } else {
        finishBattle();
      }
    }, 1400);
  };

  // 4. JANGNI YAKUNLASH VA REPLAY SAQLASH
  const finishBattle = async () => {
    setPhase('result');
    celebrate();
    soundFX.fanfare();

    // Replayni bazaga yozib qo'yish (kelajakdagi o'yinchilar uchun Ghost sifatida)
    try {
      await apiFetch('/api/growth/arena/record-replay/', {
        method: 'POST',
        body: JSON.stringify({
          moves_log: userMovesLogRef.current,
          question_ids: questions.map((q) => q.id),
        }),
      });

      // Agar bu do'stining dueli bo'lsa, natijani serverga yuborish
      if (incomingDuelToken) {
        await apiFetch(`/api/growth/arena/duel/${incomingDuelToken}/submit/`, {
          method: 'POST',
          body: JSON.stringify({ score: userScore }),
        });
      }
    } catch (e) {
      // ignore
    }
  };

  // 5. VIRAL DUEL ULASHISH (1-Click Telegram Native Share)
  const handleCreateAndShareDuel = async () => {
    setIsGeneratingDuel(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        duel_token: string;
        share_url: string;
        telegram_share_link: string;
        share_text: string;
      }>('/api/growth/arena/create-duel/', {
        method: 'POST',
        body: JSON.stringify({ score: userScore }),
      });

      if (res && res.ok) {
        setCreatedDuelToken(res.duel_token);
        toast.success("Duel havolasi tayyor! Telegram orqali yuboring.");

        // Telegram WebApp ichida bo'lsa, to'g'ridan-to'g'ri share oynasini ochish
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
          (window as any).Telegram.WebApp.openTelegramLink(res.telegram_share_link);
        } else {
          window.open(res.telegram_share_link, '_blank');
        }
      }
    } catch {
      toast.error("Duel havolasini yaratishda xatolik");
    } finally {
      setIsGeneratingDuel(false);
    }
  };

  const currentQ = questions[currentQIndex];
  const isWinner = userScore >= opponentScore;

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[580px] flex flex-col justify-between p-4 sm:p-6 bg-card rounded-[32px] border border-border shadow-2xl overflow-hidden select-none">
      {/* ─── A. MATCHMAKING SCANNER EKRANI ─── */}
      <AnimatePresence mode="wait">
        {phase === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="my-auto flex flex-col items-center justify-center text-center space-y-6 py-12"
          >
            {/* Radar Pulsatsiyasi */}
            <div className="relative flex items-center justify-center size-36">
              <span className="absolute size-full rounded-full bg-rose-500/20 animate-ping" />
              <span className="absolute size-28 rounded-full bg-rose-500/30 animate-pulse" />
              <div className="relative size-20 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/30">
                <Swords className="size-10 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground">Jonli Raqib Qidirilmoqda...</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Sizning ELO ballingizga ({user?.elo_rating || 1000}) mos kuchli raqib tanlanmoqda
              </p>
            </div>

            <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-rose-500/30 text-rose-500">
              ⚡️ Maksimal qidiruv: 3 soniya
            </Badge>
          </motion.div>
        )}

        {/* ─── B. 3-2-1 START COUNTDOWN ─── */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="my-auto flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="flex items-center gap-6">
              {/* Siz */}
              <div className="flex flex-col items-center space-y-1">
                <img
                  src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'}
                  alt="Siz"
                  className="size-16 rounded-full border-2 border-emerald-500 bg-background shadow-md"
                />
                <span className="text-xs font-bold text-foreground">Siz</span>
              </div>

              <span className="text-3xl font-black text-rose-500 italic">VS</span>

              {/* Raqib */}
              <div className="flex flex-col items-center space-y-1">
                <img
                  src={opponent?.avatar_url}
                  alt={opponent?.name}
                  className="size-16 rounded-full border-2 border-rose-500 bg-background shadow-md"
                />
                <span className="text-xs font-bold text-foreground truncate max-w-[90px]">{opponent?.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">ELO {opponent?.elo_rating}</span>
              </div>
            </div>

            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="text-7xl font-black text-primary font-mono"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}

        {/* ─── C. JONLI JANG MAYDONI (BATTLE) ─── */}
        {phase === 'battle' && currentQ && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col justify-between space-y-4"
          >
            {/* Header: Scoreboard & Progress */}
            <div className="space-y-3 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                {/* O'yinchi */}
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-full overflow-hidden border-2 border-emerald-500">
                    <img src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=me'} alt="Siz" className="size-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Siz</p>
                    <p className="text-base font-black text-emerald-500 font-mono leading-none">{userScore}</p>
                  </div>
                </div>

                {/* Markaziy indikator & Savol sanog'i */}
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="text-[10px] font-mono border-border">
                    Savol: {currentQIndex + 1} / {questions.length}
                  </Badge>
                  {userCombo >= 2 && (
                    <span className="text-[10px] font-black text-amber-500 animate-pulse flex items-center gap-0.5 mt-0.5">
                      <Flame className="size-3 fill-current" /> {userCombo}x Combo
                    </span>
                  )}
                </div>

                {/* Raqib */}
                <div className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="size-9 rounded-full overflow-hidden border-2 border-rose-500">
                    <img src={opponent?.avatar_url} alt="Raqib" className="size-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-xs font-bold leading-tight truncate max-w-[80px]">{opponent?.name}</p>
                    </div>
                    <p className="text-base font-black text-rose-500 font-mono leading-none">{opponentScore}</p>
                  </div>
                </div>
              </div>

              {/* Ikki tomonlama nisbiy progress bar */}
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(10, (userScore / Math.max(1, userScore + opponentScore)) * 100)}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.max(10, (opponentScore / Math.max(1, userScore + opponentScore)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Savol matni */}
            <div className="my-auto py-2">
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 shadow-sm">
                <div
                  className="text-base sm:text-lg font-bold text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentQ.body }}
                />
              </div>
            </div>

            {/* Variantlar */}
            <div className="space-y-2.5">
              {currentQ.choices.map((choice, cIdx) => {
                const isSelected = selectedChoiceId === choice.id;
                let btnStyle = 'border-border/70 hover:border-primary/50 bg-card';

                if (isAnswered) {
                  if (choice.is_correct) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold';
                  } else {
                    btnStyle = 'opacity-40 border-border/40';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    disabled={isAnswered}
                    onClick={() => handleSelectChoice(choice)}
                    className={cn(
                      'w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-98',
                      btnStyle
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-7 rounded-xl bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                        {String.fromCharCode(65 + cIdx)}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-snug">{choice.text}</span>
                    </div>

                    {isAnswered && choice.is_correct && <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />}
                    {isAnswered && isSelected && !choice.is_correct && <XCircle className="size-5 text-rose-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── D. G'ALABA / MAG'LUBIYAT & VIRAL SHARE EKRANI ─── */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-auto flex flex-col items-center justify-center text-center space-y-6 py-4"
          >
            {/* G'oliblik statusi */}
            <div className="relative">
              <div
                className={cn(
                  'size-24 rounded-full flex items-center justify-center text-white shadow-2xl',
                  isWinner ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-amber-500/40' : 'bg-gradient-to-tr from-slate-600 to-slate-500'
                )}
              >
                {isWinner ? <Trophy className="size-12 animate-bounce" /> : <Shield className="size-12" />}
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">
                {isWinner ? "G'alaba qozondingiz! 🏆" : "Bu safar raqib ustun keldi!"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Siz: <b className="text-foreground">{userScore} ball</b> vs {opponent?.name}: <b className="text-foreground">{opponentScore} ball</b>
              </p>
            </div>

            {/* Mukofotlar */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold py-1 px-3">
                🪙 +25 Tanga
              </Badge>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-bold py-1 px-3">
                ⚡️ +50 XP
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold py-1 px-3">
                📈 +18 ELO
              </Badge>
            </div>

            {/* 1-CLICK TELEGRAM EGO VIRAL DUEL TUGMASI */}
            <div className="w-full space-y-3 pt-2">
              <Button
                disabled={isGeneratingDuel}
                onClick={handleCreateAndShareDuel}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Share2 className="size-4.5" />
                <span>⚔️ Sinfdoshingizni shu savollarda duelga chorlang! (+100 Tanga)</span>
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={startMatchmaking}
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-10 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Yana bir jang</span>
                </Button>
                {onExit && (
                  <Button
                    variant="ghost"
                    onClick={onExit}
                    className="flex-1 rounded-xl text-xs text-muted-foreground hover:text-foreground h-10 cursor-pointer"
                  >
                    Chiqish
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
