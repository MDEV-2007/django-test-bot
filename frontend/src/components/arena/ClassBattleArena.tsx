'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Users, Play, Trophy, AlertTriangle, Share2,
  Copy, Check, Sparkles, RefreshCw, ArrowRight, ShieldCheck,
  Award, QrCode, Crown, CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { apiFetch } from '@/lib/api-client';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Participant = {
  id: number;
  nickname: string;
  avatar?: string | null;
  score: number;
  correct_count: number;
};

type QuestionItem = {
  id: number;
  body: string;
  choices: { id: number; text: string }[];
};

type RoomState = {
  room_id: number;
  title: string;
  pin_code: string;
  status: 'waiting' | 'live' | 'finished';
  is_teacher: boolean;
  participants_count: number;
  participants: Participant[];
  questions?: QuestionItem[];
};

type Analytics = {
  total_participants: number;
  avg_score: number;
  avg_mastery: number;
  podium: { rank: number; nickname: string; avatar?: string; score: number }[];
  hardest_questions: {
    id: number;
    body: string;
    wrong_percentage: number;
    wrong_count: number;
    correct_answer: string;
    explanation: string;
  }[];
  struggling_students: { nickname: string; correct_count: number; mastery_pct: number }[];
};

type ClassBattleArenaProps = {
  initialPin?: string;
  roomId?: number;
};

export default function ClassBattleArena({ initialPin, roomId }: ClassBattleArenaProps) {
  const { user } = useAuthStore();
  const { flags } = useFeatureFlags();

  const [pinInput, setPinInput] = useState(initialPin || '');
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(roomId || null);
  const [state, setState] = useState<RoomState | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Student test taking states
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  // Poll room state every 3 seconds while waiting or live
  useEffect(() => {
    if (!currentRoomId) return;

    async function fetchState() {
      try {
        const res = await apiFetch<RoomState>(`/api/v1/system/class-battles/${currentRoomId}/state/`);
        setState(res);

        if (res.status === 'finished' && !analytics) {
          const ana = await apiFetch<Analytics>(`/api/v1/system/class-battles/${currentRoomId}/analytics/`);
          setAnalytics(ana);
        }
      } catch {}
    }

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [currentRoomId, analytics]);

  if (!flags.enable_teacher_class_battles) {
    return null;
  }

  async function handleJoinByPin() {
    if (pinInput.length !== 6) {
      toast.error("PIN-kod 6 xonali bo'lishi kerak!");
      return;
    }
    setLoading(true);
    tgHaptic('medium');
    try {
      const res = await apiFetch<{ room_id: number; pin_code: string; title: string; status: string }>(
        `/api/v1/system/class-battles/${pinInput}/join/`,
        { method: 'POST', body: JSON.stringify({ nickname: user?.first_name || user?.username }) }
      );
      setCurrentRoomId(res.room_id);
      toast.success("Sinf jangiga muvaffaqiyatli qo'shildingiz!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Jangga qo'shilishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartBattle() {
    if (!currentRoomId) return;
    tgHaptic('success');
    try {
      await apiFetch(`/api/v1/system/class-battles/${currentRoomId}/start/`, { method: 'POST' });
      toast.success("Jang boshlandi!");
    } catch {
      toast.error("Boshlashda xatolik");
    }
  }

  async function handleSubmitAnswers() {
    if (!currentRoomId || !state?.questions) return;
    tgHaptic('success');
    setSubmitted(true);
    try {
      await apiFetch(`/api/v1/system/class-battles/${currentRoomId}/submit/`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      toast.success("Javoblaringiz qabul qilindi!");
    } catch {}
  }

  function handleCopyPin() {
    if (!state) return;
    navigator.clipboard.writeText(state.pin_code);
    setCopied(true);
    tgHaptic('select');
    toast.success("PIN-kod nusxalandi!");
    setTimeout(() => setCopied(false), 2000);
  }

  // 1. PIN Kirish Ekrani (Agar xonaga kirmagan bo'lsa)
  if (!currentRoomId || !state) {
    return (
      <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl p-6 sm:p-8 text-white max-w-lg mx-auto shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Swords className="size-6" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">⚔️ Jonli Sinf Jangiga Kirish</h3>
            <p className="text-xs text-zinc-400 mt-1">
              O&apos;qituvchingiz bergan 6 xonali PIN-kodni kiriting:
            </p>
          </div>

          <div className="w-full space-y-3">
            <input
              type="text"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="482 910"
              className="w-full text-center tracking-[0.4em] text-3xl font-mono font-bold bg-zinc-950 border border-white/[0.12] rounded-xl py-3 text-amber-400 focus:outline-none focus:border-amber-400"
            />

            <Button
              onClick={handleJoinByPin}
              disabled={loading || pinInput.length !== 6}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              {loading ? "Ulanmoqda..." : "Jangga Qo'shilish"}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // 2. Teacher Lobby Ekrani (Kutilmoqda - 6-xonali ulkan PIN va o'quvchilar avatar ro'yxati)
  if (state.status === 'waiting') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl p-6 sm:p-10 text-white shadow-2xl text-center space-y-6">
          <div className="space-y-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[12px] font-mono">
              B2B2C LIVE QUIZ LOBBY
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">{state.title}</h2>
          </div>

          {/* Neon 6-Digit PIN Code */}
          <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/[0.1] inline-block mx-auto space-y-2">
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">O&apos;quvchilar uchun PIN-kod:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl sm:text-6xl font-mono font-bold tracking-widest text-amber-400 select-all drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                {state.pin_code.slice(0, 3)} {state.pin_code.slice(3)}
              </span>
              <button
                onClick={handleCopyPin}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Nusxalash"
              >
                {copied ? <Check className="size-5 text-emerald-400" /> : <Copy className="size-5" />}
              </button>
            </div>
            <p className="text-[12px] text-zinc-500 font-mono">
              Telegramdan kirish: t.me/ilmildiziuz_bot?startapp=battle_{state.pin_code}
            </p>
          </div>

          {/* Joined Students Spring Pop-in Avatars */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-300">
              Qo&apos;shilgan o&apos;quvchilar: <strong className="text-amber-400 font-mono text-sm">{state.participants.length} nafar</strong>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto min-h-[80px]">
              <AnimatePresence>
                {state.participants.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-zinc-900 text-xs font-medium text-zinc-200 shadow-sm"
                  >
                    <Avatar className="size-5">
                      <AvatarImage src={p.avatar || undefined} />
                      <AvatarFallback className="text-[11px] uppercase">{p.nickname.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span>{p.nickname}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Button */}
          {state.is_teacher ? (
            <Button
              onClick={handleStartBattle}
              disabled={state.participants.length === 0}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-zinc-950 font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer active:scale-98"
            >
              <Play className="size-5 mr-2 fill-zinc-950" />
              🔥 JANGNI BOSHLASH ({state.participants.length} o&apos;quvchi)
            </Button>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] text-xs text-zinc-400 max-w-sm mx-auto flex items-center justify-center gap-2">
              <span className="size-2 rounded-full bg-amber-400 animate-ping" />
              <span>O&apos;qituvchi jangni boshlashini kuting...</span>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 3. Live Battle Screen (Race Leaderboard + Questions)
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Live Race Bars (Top-10 Poyga Jadvali) */}
      <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
              Jonli Poyga Jadvali (Live Race)
            </span>
          </div>
          <Badge className="bg-rose-500 text-white font-mono text-[12px]">
            {state.status === 'live' ? 'JONLI JANG' : 'YAKUNLANDI'}
          </Badge>
        </div>

        <div className="space-y-2.5">
          {state.participants.slice(0, 6).map((p, idx) => {
            const maxScore = Math.max(1, ...state.participants.map((x) => x.score));
            const pct = Math.min(100, Math.round((p.score / maxScore) * 100));

            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span className="font-mono text-zinc-500 text-[12px]">#{idx + 1}</span>
                    {p.nickname}
                  </span>
                  <span className="font-mono font-bold text-amber-400">{p.score} ball</span>
                </div>
                <Progress value={pct} className="h-2 bg-zinc-900" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Student Question Taking or Teacher Diagnostic */}
      {!state.is_teacher && state.status === 'live' && state.questions && (
        <div className="space-y-4">
          {state.questions.map((q, idx) => (
            <Card key={q.id} className="border border-white/[0.08] bg-[#07090E] rounded-xl p-5 text-white">
              <div className="space-y-3">
                <p className="text-xs font-bold text-amber-400">Savol {idx + 1}:</p>
                <div className="text-sm font-semibold text-zinc-100" dangerouslySetInnerHTML={{ __html: q.body }} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {q.choices.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                      disabled={submitted}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer",
                        answers[q.id] === c.id
                          ? "bg-amber-500 text-zinc-950 font-bold border-amber-400"
                          : "bg-zinc-900/60 border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                      )}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}

          {!submitted && (
            <Button
              onClick={handleSubmitAnswers}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Javoblarni Topshirish va Natijani Ko&apos;rish
            </Button>
          )}
        </div>
      )}

      {/* Post-Battle Analytics & Hardest Questions (Repetitor Doska hisoboti) */}
      {analytics && (
        <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl p-6 text-white space-y-5">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <AlertTriangle className="size-4" />
            <span>🚨 Repetitor uchun Doska Tahlili: Eng ko&apos;p xato qilingan savollar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analytics.hardest_questions.map((hq, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2 text-xs">
                <Badge variant="destructive" className="text-[12px] px-1.5 py-0 font-mono">
                  {hq.wrong_percentage}% o&apos;quvchi adashdi
                </Badge>
                <div className="text-zinc-200 font-medium line-clamp-3" dangerouslySetInnerHTML={{ __html: hq.body }} />
                <p className="text-emerald-400 font-bold text-[12px]">
                  ✅ To&apos;g&apos;ri javob: {hq.correct_answer}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
