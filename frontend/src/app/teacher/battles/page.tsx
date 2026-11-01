'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Users, Play, CheckCircle2, Copy, Trophy, AlertTriangle,
  TrendingUp, Sparkles, Clock, ArrowRight, Plus, RefreshCw, Share2,
  Crown, Medal, ShieldAlert, Award, FileSpreadsheet, Loader2, BookOpen
} from 'lucide-react';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

type BattleRoom = {
  id: number;
  pin_code: string;
  title: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'EXPIRED';
  participants_count: number;
  question_count: number;
  created_at: string;
  subject_name?: string;
  test_title?: string;
};

type Participant = {
  id: number;
  nickname: string;
  score: number;
  submitted: boolean;
  accuracy_rate?: number;
};

type RoomState = {
  room_id: number;
  title: string;
  pin_code: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'EXPIRED';
  is_teacher: boolean;
  participants_count: number;
  participants: Participant[];
  question_count: number;
};

type AnalyticsData = {
  room_id: number;
  title: string;
  pin_code: string;
  participants_count: number;
  average_score: number;
  podium: {
    rank: number;
    nickname: string;
    score: number;
    accuracy_rate: number;
  }[];
  hardest_questions: {
    question_id: number;
    question_text: string;
    correct_count: number;
    total_answers: number;
    accuracy_percent: number;
  }[];
  struggling_students: {
    nickname: string;
    score: number;
    accuracy_percent: number;
    wrong_count: number;
  }[];
};

type TeacherTest = {
  id: number;
  title: string;
  questions_count?: number;
  category?: string;
};

export default function TeacherBattlesPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Modal create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [newQuestionCount, setNewQuestionCount] = useState<number>(10);
  const [teacherTests, setTeacherTests] = useState<TeacherTest[]>([]);

  // Polling ref
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await apiFetch<{ rooms: BattleRoom[] }>('/api/v1/system/class-battles/my/');
      if (res && res.rooms) {
        setRooms(res.rooms);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchTeacherTests = useCallback(async () => {
    try {
      const res = await apiFetch<{ results?: TeacherTest[]; test_sets?: TeacherTest[] }>('/api/teacher/tests/');
      const list = res.results || res.test_sets || [];
      setTeacherTests(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchTeacherTests();
  }, [fetchRooms, fetchTeacherTests]);

  // Polling current active room
  const pollRoomState = useCallback(async (roomId: number) => {
    try {
      const res = await apiFetch<RoomState>(`/api/v1/system/class-battles/${roomId}/state/`);
      setRoomState(res);
      if (res.status === 'FINISHED') {
        loadAnalytics(roomId);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollRoomState(activeRoomId);
    pollTimerRef.current = setInterval(() => {
      pollRoomState(activeRoomId);
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeRoomId, pollRoomState]);

  async function loadAnalytics(roomId: number) {
    setLoadingAnalytics(true);
    try {
      const data = await apiFetch<AnalyticsData>(`/api/v1/system/class-battles/${roomId}/analytics/`);
      setAnalytics(data);
    } catch (e: any) {
      toast.error(e.message || "Tahlilni yuklashda xatolik");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function handleCreateRoom() {
    if (!newTitle.trim()) {
      toast.error("Iltimos, bellashuv nomini kiriting");
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch<{ room_id: number; pin_code: string; title: string }>(
        '/api/v1/system/class-battles/create/',
        {
          method: 'POST',
          body: JSON.stringify({
            title: newTitle.trim(),
            test_id: selectedTestId || undefined,
            question_count: newQuestionCount,
          }),
        }
      );

      soundFX.fanfare();
      tgHaptic('success');
      toast.success(`🎉 Sinf Jangi xonasi ochildi! PIN: ${res.pin_code}`);
      setCreateOpen(false);
      setNewTitle('');
      setSelectedTestId(null);
      await fetchRooms();
      setActiveRoomId(res.room_id);
    } catch (e: any) {
      toast.error(e.message || "Xona ochishda xatolik yuz berdi");
    } finally {
      setCreating(false);
    }
  }

  async function handleStartBattle(roomId: number) {
    tgHaptic('medium');
    try {
      await apiFetch(`/api/v1/system/class-battles/${roomId}/start/`, {
        method: 'POST',
      });
      soundFX.fanfare();
      toast.success("🚀 Jang boshlandi! O'quvchilar telefonlarida savollar ochildi!");
      pollRoomState(roomId);
    } catch (e: any) {
      toast.error(e.message || "Jangni boshlashda xatolik yuz berdi");
    }
  }

  function handleCopyPIN(pin: string) {
    navigator.clipboard.writeText(pin);
    tgHaptic('light');
    toast.success(`PIN nusxalandi: ${pin}`);
  }

  function handleCopyLink(pin: string) {
    const link = `https://ilmildizi.uz/battles?pin=${pin}`;
    navigator.clipboard.writeText(link);
    tgHaptic('light');
    toast.success(`Havola nusxalandi: ${link}`);
  }

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="Sinf Janglari (Live Quiz Studio)"
          description="Dars davomida o'quvchilaringizga 6 xonali PIN ulashib jonli bellashuv (Kahoot uslubida) o'tkazing va darsdan so'ng tayyor o'zlashtirish tahliliga ega bo'ling."
          actions={
            <Button
              onClick={() => {
                tgHaptic('medium');
                setCreateOpen(true);
              }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold shadow-md shadow-amber-500/20"
            >
              <Plus className="size-4 mr-1.5" /> Yangi Sinf Jangi Ochish
            </Button>
          }
        />

        {/* ─── LIVE HOST ARENA (If active room selected) ─── */}
        {activeRoomId && roomState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-card to-background p-5 sm:p-7 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 size-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-border/60 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-amber-500 text-black font-black uppercase text-[10px] tracking-wider">
                    JONLI STUDIYA
                  </Badge>
                  <Badge variant="outline" className={cn(
                    'text-xs font-bold',
                    roomState.status === 'WAITING' ? 'border-amber-500 text-amber-500 animate-pulse' :
                    roomState.status === 'ACTIVE' ? 'border-emerald-500 text-emerald-500 animate-pulse' :
                    'border-zinc-500 text-muted-foreground'
                  )}>
                    {roomState.status === 'WAITING' ? 'Kutish zali (Lobby)' :
                     roomState.status === 'ACTIVE' ? 'Jang ketmoqda (Live)' : 'Jang yakunlandi'}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {roomState.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveRoomId(null);
                    setRoomState(null);
                    setAnalytics(null);
                  }}
                  className="rounded-xl text-xs"
                >
                  Studiyani yopish
                </Button>
                {roomState.status === 'WAITING' && (
                  <Button
                    onClick={() => handleStartBattle(roomState.room_id)}
                    size="lg"
                    className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold shadow-lg shadow-emerald-500/25 px-6"
                  >
                    <Play className="size-4 mr-2 fill-white" /> Jangni Boshlash ({roomState.participants_count} o&apos;quvchi)
                  </Button>
                )}
                {roomState.status === 'ACTIVE' && (
                  <Button
                    onClick={() => loadAnalytics(roomState.room_id)}
                    variant="destructive"
                    size="lg"
                    className="rounded-2xl font-extrabold shadow-md px-6"
                  >
                    <Trophy className="size-4 mr-2" /> Natijalarni ko&apos;rish
                  </Button>
                )}
              </div>
            </div>

            {/* WAITING LOBBY (Massive PIN + Live Joining Roster) */}
            {roomState.status === 'WAITING' && (
              <div className="space-y-8">
                {/* PIN Display Banner */}
                <div className="text-center py-6 px-4 rounded-3xl bg-black/40 border border-amber-500/30 max-w-2xl mx-auto shadow-inner">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-400 mb-2">
                    Doskaga / Telegramga ulashing:
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-mono text-5xl sm:text-7xl font-black tracking-widest text-white drop-shadow-[0_4px_20px_rgba(245,158,11,0.5)]">
                      {roomState.pin_code.slice(0, 3)} {roomState.pin_code.slice(3)}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    <Button
                      onClick={() => handleCopyPIN(roomState.pin_code)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold"
                    >
                      <Copy className="size-3.5 mr-1.5" /> PIN Nusxalash
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(roomState.pin_code)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold"
                    >
                      <Share2 className="size-3.5 mr-1.5" /> Havola Nusxalash
                    </Button>
                  </div>

                  <p className="text-xs text-zinc-400 mt-3">
                    O&apos;quvchilar <strong>ilmildizi.uz/battles</strong> manziliga kirib <strong>{roomState.pin_code}</strong> PIN kodini kiritishsin.
                  </p>
                </div>

                {/* Joined Students Roster */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Users className="size-4 text-amber-500" />
                      <span>Uланган O&apos;quvchilar ({roomState.participants_count})</span>
                    </h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="size-3 animate-spin text-amber-500" /> Jonli yangilanmoqda
                    </span>
                  </div>

                  {roomState.participants.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
                      <Users className="size-10 text-muted-foreground/40 mx-auto mb-2 animate-bounce" />
                      <p className="text-sm font-bold text-foreground">O&apos;quvchilar ulanishi kutilmoqda...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PIN kodni o&apos;quvchilaringizga e&apos;lon qiling. Ular kirishi bilan bu yerda aks etadi.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {roomState.participants.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          className="p-3 rounded-2xl bg-card border border-border/80 flex items-center gap-2.5 shadow-xs"
                        >
                          <div className="size-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                            {p.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{p.nickname}</p>
                            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="size-2.5" /> Tayyor
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE JANG (Leaderboard / Progress) */}
            {roomState.status === 'ACTIVE' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Savollar soni</CardDescription>
                      <CardTitle className="text-2xl font-black text-amber-500">{roomState.question_count} ta</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Uланган o&apos;quvchilar</CardDescription>
                      <CardTitle className="text-2xl font-black text-emerald-500">{roomState.participants_count} nafar</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Javob berganlar</CardDescription>
                      <CardTitle className="text-2xl font-black text-primary">
                        {roomState.participants.filter(p => p.submitted).length} / {roomState.participants_count}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Real-time score table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Jonli Natijalar Jadvali</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <RefreshCw className="size-3 animate-spin text-primary" /> Har 2 soniyada yangilanmoqda
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {roomState.participants
                      .sort((a, b) => b.score - a.score)
                      .map((p, idx) => (
                        <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'size-7 rounded-xl flex items-center justify-center font-black text-xs',
                              idx === 0 ? 'bg-amber-500 text-black' :
                              idx === 1 ? 'bg-zinc-300 text-zinc-900' :
                              idx === 2 ? 'bg-amber-700 text-white' :
                              'bg-muted text-muted-foreground'
                            )}>
                              {idx + 1}
                            </span>
                            <span className="text-sm font-bold text-foreground">{p.nickname}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              p.submitted ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                            )}>
                              {p.submitted ? 'Yakunladi' : 'Yechmoqda...'}
                            </span>
                            <span className="font-mono font-black text-base text-foreground tabular-nums">
                              {p.score} ball
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* FINISHED ANALYTICS REPORT */}
            {analytics && (
              <div className="space-y-6 pt-4">
                {/* Podium Top 3 */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-500 px-3 py-1 text-xs font-bold">
                    <Crown className="size-4" /> G&apos;oliblar Shoxsupasi
                  </div>
                  <h3 className="text-2xl font-black text-foreground">Jang Yakunlari va Reyting</h3>
                  <p className="text-xs text-muted-foreground">
                    Sinf o&apos;rtacha o&apos;zlashtirishi: <strong className="text-emerald-500 font-bold">{analytics.average_score}%</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
                  {analytics.podium.map((pod) => (
                    <Card key={pod.rank} className={cn(
                      'text-center relative overflow-hidden border-2',
                      pod.rank === 1 ? 'border-amber-500 bg-amber-500/10 shadow-lg' :
                      pod.rank === 2 ? 'border-zinc-400 bg-zinc-500/10' :
                      'border-amber-700 bg-amber-800/10'
                    )}>
                      <CardContent className="pt-6 pb-5 space-y-2">
                        <div className="size-12 rounded-2xl mx-auto flex items-center justify-center font-black text-lg shadow-sm"
                          style={{
                            background: pod.rank === 1 ? '#f59e0b' : pod.rank === 2 ? '#9ca3af' : '#b45309',
                            color: '#fff',
                          }}
                        >
                          {pod.rank === 1 ? <Crown className="size-6 text-white" /> : `${pod.rank}`}
                        </div>
                        <h4 className="text-base font-extrabold text-foreground truncate">{pod.nickname}</h4>
                        <p className="font-mono text-2xl font-black text-primary tabular-nums">
                          {pod.score} <span className="text-xs text-muted-foreground font-normal">ball</span>
                        </p>
                        <Badge variant="outline" className="text-xs font-semibold">
                          Aniqlik: {pod.accuracy_rate}%
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Hardest Questions & Struggling Students */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                  {/* Hardest Questions */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="size-4 text-rose-500" />
                        <span>Sinf eng ko&apos;p xato qilgan savollar</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ushbu savollarni keyingi darsda qayta tushuntirib berish tavsiya etiladi.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analytics.hardest_questions && analytics.hardest_questions.length > 0 ? (
                        analytics.hardest_questions.map((hq, idx) => (
                          <div key={hq.question_id || idx} className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                            <p className="text-xs font-medium text-foreground line-clamp-2">
                              {idx + 1}. {hq.question_text}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                              <span>To&apos;g&apos;ri javoblar: {hq.correct_count} / {hq.total_answers}</span>
                              <span className="text-rose-500 font-bold">Aniqlik: {hq.accuracy_percent}%</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">Savollar tahlili hisoblanmoqda...</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Struggling Students */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-500" />
                        <span>Qo&apos;shimcha yordamga muhtoj o&apos;quvchilar</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Eng past natija qayd etgan o&apos;quvchilar ro&apos;yxati.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analytics.struggling_students && analytics.struggling_students.length > 0 ? (
                        analytics.struggling_students.map((st, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{st.nickname}</p>
                              <p className="text-[11px] text-rose-500">
                                {st.wrong_count} ta xato javob
                              </p>
                            </div>
                            <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-xs font-mono font-bold">
                              {st.accuracy_percent}% aniqlik
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">Barcha o&apos;quvchilar a&apos;lo darajada o&apos;zlashtirdi!</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── PREVIOUS ROOMS LIST ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Swords className="size-4 text-amber-500" />
              <span>Sizning Sinf Janglaringiz ({rooms.length})</span>
            </h3>
            <Button
              onClick={fetchRooms}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
            >
              <RefreshCw className={cn('size-3.5 mr-1.5', loadingRooms && 'animate-spin')} /> Yangilash
            </Button>
          </div>

          {rooms.length === 0 && !loadingRooms ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <Swords className="size-12 text-amber-500/50 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">Hali hech qanday Sinf Jangi ochilmagan</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Darsingiz qiziqarli o&apos;tishi uchun birinchi jonli bellashuv xonasini oching va 6 xonali PIN-kod oling!
                  </p>
                </div>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                >
                  <Plus className="size-4 mr-1.5" /> Birinchi Jangni Ochish
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className={cn(
                    'border transition-all hover:border-amber-500/50 hover:shadow-md cursor-pointer',
                    activeRoomId === room.id && 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                  )}
                  onClick={() => {
                    tgHaptic('select');
                    setActiveRoomId(room.id);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-black text-lg text-amber-500 tracking-wider">
                        PIN: {room.pin_code}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[10px] font-bold uppercase',
                        room.status === 'WAITING' ? 'border-amber-500 text-amber-500' :
                        room.status === 'ACTIVE' ? 'border-emerald-500 text-emerald-500' :
                        'border-zinc-500 text-muted-foreground'
                      )}>
                        {room.status === 'WAITING' ? 'Lobby' : room.status === 'ACTIVE' ? 'Jonli' : 'Yakunlangan'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-extrabold text-foreground truncate">
                      {room.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {room.test_title || room.subject_name || 'Aralash test'} • {room.question_count} ta savol
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="size-3.5 text-primary" /> {room.participants_count} o&apos;quvchi
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold text-amber-500">
                      Studiyaga kirish <ArrowRight className="size-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ─── CREATE ROOM MODAL ─── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="size-5 text-amber-500" />
                <span>Yangi Sinf Jangi Xonasi (Kahoot Live)</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                O&apos;quvchilaringiz dars oxirida telefonlaridan 6 xonali PIN bilan kirib bir vaqtda bellashishadi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Bellashuv nomi:</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masalan: 7-A sinf | Jahon Tarixi Jonli Bellashuv"
                  className="rounded-xl text-sm"
                />
              </div>

              {/* Select Test from Teacher's Tests */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test to&apos;plami (ixtiyoriy):</label>
                <select
                  value={selectedTestId || ''}
                  onChange={(e) => setSelectedTestId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Platformaning tasodifiy savollaridan tuzish</option>
                  {teacherTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.questions_count || 30} ta savol)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  O&apos;zingiz yaratgan maxsus testni tanlashingiz yoki butun bazadan savollar tanlashingiz mumkin.
                </p>
              </div>

              {/* Question Count Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Savollar soni:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setNewQuestionCount(cnt)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer',
                        newQuestionCount === cnt
                          ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cnt} ta
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleCreateRoom}
                disabled={creating}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black"
              >
                {creating ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Play className="size-4 mr-1.5" />}
                Xona Ochish (PIN olish)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TeacherShell>
  );
}
