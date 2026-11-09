'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Users, Trophy, CheckCircle2, Clock, Loader2,
  Crown, ArrowRight, X, AlertCircle, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

type QuestionChoice = {
  id: number;
  text: string;
};

type BattleQuestion = {
  id: number;
  text?: string;
  body?: string;
  choices: QuestionChoice[];
};

type RoomState = {
  room_id: number;
  title: string;
  pin_code: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'EXPIRED' | 'waiting' | 'live' | 'finished';
  is_teacher: boolean;
  participants_count: number;
  participants: { id: number; nickname: string; score: number; submitted: boolean }[];
  questions?: BattleQuestion[];
};

interface ClassBattleStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPin?: string | null;
}

const CHOICE_COLORS = [
  'bg-rose-500 hover:bg-rose-600 border-rose-600 text-white',
  'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white',
  'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white',
  'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white',
];

export default function ClassBattleStudentModal({
  open,
  onOpenChange,
  initialPin = null,
}: ClassBattleStudentModalProps) {
  const { user } = useAuthStore();
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState(user?.first_name || user?.username || '');
  const [joining, setJoining] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // In-game state
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myResult, setMyResult] = useState<{ score: number; accuracy: number; rank?: number } | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  useEffect(() => {
    if (user?.first_name || user?.username) {
      setNickname((prev) => prev || user.first_name || user.username || '');
    }
  }, [user]);

  // Polling room state
  const pollState = useCallback(async (rId: number) => {
    try {
      const res = await apiFetch<RoomState>(`/api/v1/system/class-battles/${rId}/state/`);
      setRoomState(res);
      if (res.status === 'ACTIVE' && res.questions && res.questions.length > 0) {
        // Active battle!
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!roomId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollState(roomId);
    pollTimerRef.current = setInterval(() => {
      pollState(roomId);
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [roomId, pollState]);

  async function handleJoinRoom() {
    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin.length !== 6) {
      toast.error("PIN-kod 6 ta raqamdan iborat bo'lishi kerak!");
      return;
    }
    if (!nickname.trim()) {
      toast.error("Iltimos, ismingizni kiriting!");
      return;
    }

    setJoining(true);
    tgHaptic('medium');
    try {
      const res = await apiFetch<{ room_id: number; status: 'WAITING' | 'ACTIVE' | 'FINISHED'; title: string }>(
        `/api/v1/system/class-battles/${cleanPin}/join/`,
        {
          method: 'POST',
          body: JSON.stringify({ nickname: nickname.trim() }),
        }
      );

      soundFX.fanfare();
      toast.success(`Xonaga ulandingiz: ${res.title}`);
      setRoomId(res.room_id);
      pollState(res.room_id);
    } catch (e: any) {
      toast.error(e.message || "Xonaga ulanib bo'lmadi. PIN-kodni tekshiring.");
    } finally {
      setJoining(false);
    }
  }

  function handleSelectChoice(choiceId: number) {
    if (!roomState?.questions || roomState.questions.length === 0) return;
    const currentQ = roomState.questions[currentQIdx];
    tgHaptic('light');
    soundFX.click();

    const newAnswers = { ...selectedAnswers, [currentQ.id]: choiceId };
    setSelectedAnswers(newAnswers);

    // Auto advance to next question if not last
    if (currentQIdx < roomState.questions.length - 1) {
      setTimeout(() => {
        setCurrentQIdx((prev) => prev + 1);
      }, 250);
    }
  }

  async function handleSubmitAnswers() {
    if (!roomId || submitting) return;
    setSubmitting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<{ success: boolean; score: number; accuracy_rate: number }>(
        `/api/v1/system/class-battles/${roomId}/submit/`,
        {
          method: 'POST',
          body: JSON.stringify({ answers: selectedAnswers }),
        }
      );

      celebrate();
      soundFX.fanfare();
      setSubmitted(true);
      setMyResult({
        score: res.score || 0,
        accuracy: res.accuracy_rate || 0,
      });
      toast.success("Javoblaringiz qabul qilindi!");
    } catch (e: any) {
      toast.error(e.message || "Javoblarni yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setRoomId(null);
    setRoomState(null);
    setSelectedAnswers({});
    setCurrentQIdx(0);
    setSubmitted(false);
    setMyResult(null);
    onOpenChange(false);
  }

  const questions = roomState?.questions || [];
  const currentQ = questions[currentQIdx];
  const allAnswered = questions.length > 0 && Object.keys(selectedAnswers).length >= questions.length;
  const normalizedStatus = (roomState?.status || '').toUpperCase();
  const isWaiting = normalizedStatus === 'WAITING';
  const isActive = normalizedStatus === 'ACTIVE' || normalizedStatus === 'LIVE';
  const isFinished = normalizedStatus === 'FINISHED';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-2 border-amber-500/40 bg-card">
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-900 text-white relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="size-9 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold">
                <Swords className="size-5" />
              </span>
              <div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[12px] font-bold uppercase">
                  TEACHER LIVE QUIZ
                </Badge>
                <DialogTitle className="text-lg sm:text-xl font-bold text-white">
                  {roomState ? roomState.title : "Sinf Jangi (Live PIN Arena)"}
                </DialogTitle>
              </div>
            </div>

            {roomState && (
              <Badge variant="outline" className="border-amber-400 text-amber-300 font-mono text-xs">
                PIN: {roomState.pin_code}
              </Badge>
            )}
          </div>
        </div>

        {/* ─── 1. PIN & NICKNAME FORM (Not joined yet) ─── */}
        {!roomId && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">
                O&apos;qituvchingiz bergan 6 xonali PIN-kodni kiriting
              </h3>
              <p className="text-xs text-muted-foreground">
                Kahoot uslubidagi jonli bellashuvga qo&apos;shiling va sinf peshqadami bo&apos;ling!
              </p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">6 Xonali PIN:</label>
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Masalan: 849201"
                  className="h-14 text-center font-mono text-2xl tracking-[0.4em] font-bold rounded-2xl border-2 focus-visible:border-amber-500"
                  maxLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Ismingiz (Doskada ko&apos;rinadi):</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ismingiz yoki Nickname"
                  className="rounded-xl h-11 text-sm font-semibold"
                  maxLength={30}
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                disabled={joining || pin.length !== 6 || !nickname.trim()}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
              >
                {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : <Swords className="size-4 mr-2" />}
                Jangga Kirish
              </Button>
            </div>
          </div>
        )}

        {/* ─── 2. WAITING LOBBY (Waiting for Teacher to Start) ─── */}
        {roomId && roomState && isWaiting && (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="size-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-inner animate-pulse">
              <Users className="size-10" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-xs font-bold">
                ✓ Siz jangga muvaffaqiyatli ulandingiz!
              </Badge>
              <h3 className="text-xl font-bold text-foreground">
                O&apos;qituvchi jangni boshlashini kuting...
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Hozirda sinfdan <strong>{roomState.participants_count} nafar</strong> o&apos;quvchi ulandi. O&apos;qituvchi ekranda Start tugmasini bosishi bilan savollar telefoningizda ochiladi.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground pt-4 border-t border-border/50">
              <Loader2 className="size-4 animate-spin text-amber-500" />
              <span>O&apos;qituvchi start berishi kutilmoqda...</span>
            </div>
          </div>
        )}

        {/* ─── 3. ACTIVE QUIZ (Kahoot-Style Question & Answers) ─── */}
        {roomId && roomState && isActive && !submitted && currentQ && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Question Progress bar */}
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Savol: {currentQIdx + 1} / {questions.length}</span>
              <span className="text-amber-500 font-mono">
                {Object.keys(selectedAnswers).length} ta belgilandi
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentQIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border min-h-[90px] flex items-center justify-center text-center">
              <h4 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {currentQ.text || currentQ.body}
              </h4>
            </div>

            {/* Kahoot-Style 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentQ.choices.map((choice, cIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === choice.id;
                return (
                  <motion.button
                    key={choice.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectChoice(choice.id)}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all duration-150 flex items-center justify-between gap-3 min-h-[64px] shadow-sm cursor-pointer',
                      isSelected
                        ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-500 text-black font-bold scale-[1.02]'
                        : CHOICE_COLORS[cIdx % CHOICE_COLORS.length]
                    )}
                  >
                    <span className="leading-snug">{choice.text}</span>
                    {isSelected && <CheckCircle2 className="size-5 shrink-0 text-black" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Navigation & Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentQIdx === 0}
                onClick={() => setCurrentQIdx((prev) => Math.max(0, prev - 1))}
                className="rounded-xl text-xs"
              >
                Oldingisi
              </Button>

              {currentQIdx < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentQIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  Keyingisi <ArrowRight className="size-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmitAnswers}
                  disabled={submitting}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
                  Jangni Yakunlash
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── 4. SUBMITTED / RESULTS ─── */}
        {roomId && (submitted || (roomState && isFinished)) && (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="size-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-500 mx-auto shadow-lg animate-bounce">
              <Trophy className="size-10" />
            </div>

            <div className="space-y-1.5">
              <Badge className="bg-amber-500 text-black font-bold text-xs uppercase">
                JANG YAKUNLANDI
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">
                Barakalla, {nickname}!
              </h3>
              <p className="text-xs text-muted-foreground">
                Barcha savollarga javoblaringiz o&apos;qituvchi monitoriga muvaffaqiyatli yetkazildi.
              </p>
            </div>

            {myResult && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border max-w-xs mx-auto grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[12px] text-muted-foreground font-semibold">To&apos;plangan ball:</p>
                  <p className="font-mono text-2xl font-bold text-amber-500">{myResult.score}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground font-semibold">Aniqlik darajasi:</p>
                  <p className="font-mono text-2xl font-bold text-emerald-500">{myResult.accuracy}%</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleClose}
              className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-8 h-11"
            >
              Yopish
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
