'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Flame,
  CheckCircle2, Plus, Trash2, Maximize2, Minimize2, Users, Trophy,
  BookOpen, Headphones, Coffee, CloudRain, FlameKindling, Wind, Library,
  ShieldCheck, Award, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

// Ambient Sound Presets (Sintezlangan yoki tabiiy sokin tovushlar generatori)
type AmbientSound = {
  id: string;
  name: string;
  icon: typeof CloudRain;
  description: string;
  type: 'rain' | 'library' | 'whitenoise' | 'campfire';
};

const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'rain', name: 'Yomg\'ir Sadosi', icon: CloudRain, description: 'Derazaga urilayotgan sokin yomg\'ir tomchilari', type: 'rain' },
  { id: 'library', name: 'Jimjit Kutubxona', icon: Library, description: 'Sokin varaqlash va qalam shivirlashi', type: 'library' },
  { id: 'cafe', name: 'Shinam Kofe', icon: Coffee, description: 'Iliq qahvaxona muhiti va sokin fon', type: 'whitenoise' },
  { id: 'campfire', name: 'Olov Shitirlashi', icon: FlameKindling, description: 'Fokusni oshiruvchi muloyim olov ovozi', type: 'campfire' },
];

type GoalItem = {
  id: string;
  text: string;
  completed: boolean;
};

export default function StudyRoomPage() {
  const { user } = useAuthStore();

  // Pomodoro Taymer holatlari
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [focusDuration, setFocusDuration] = useState(25); // minut
  const [breakDuration] = useState(5); // minut
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);

  // Zen / To'liq ekran rejimi
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ambient Ovoz generatori (Web Audio API orqali sof sintetik shovqin)
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.45);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Dars vazifalari (Goals)
  const [goals, setGoals] = useState<GoalItem[]>([
    { id: '1', text: "Bugungi mavzu konspektini o'qib chiqish", completed: false },
    { id: '2', text: "20 ta test savolini tahlil qilish", completed: false },
    { id: '3', text: "Yodda qolmagan sanalarni flashcardda takrorlash", completed: false },
  ]);
  const [newGoalText, setNewGoalText] = useState('');

  // Jonli talabalar soni
  const [peerCount, setPeerCount] = useState(48);

  // Taymer hisobi
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSessionComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Rejim o'zgarganda vaqtni moslash
  useEffect(() => {
    if (timerMode === 'focus') {
      setTimeLeft(focusDuration * 60);
    } else if (timerMode === 'shortBreak') {
      setTimeLeft(breakDuration * 60);
    } else {
      setTimeLeft(15 * 60);
    }
    setIsRunning(false);
  }, [timerMode, focusDuration, breakDuration]);

  // Jonli abituriyentlar sonining tebranishi (real vaqt hissi)
  useEffect(() => {
    const timer = setInterval(() => {
      setPeerCount((prev) => Math.max(35, prev + (Math.random() > 0.5 ? 1 : -1)));
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API yordamida sokin ambient shovqin yaratish
  const stopAmbientSound = useCallback(() => {
    try {
      if (noiseNodeRef.current) {
        noiseNodeRef.current.disconnect();
        noiseNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {
      // Ignore
    }
  }, []);

  const startAmbientSound = useCallback((type: string) => {
    stopAmbientSound();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink / Brown shovqin yaratish (miyani tinchlantiruvchi va diqqatni jamlovchi)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          // Yumshoq yomg'ir filtri
          b0 = 0.99 * b0 + white * 0.05;
          data[i] = b0 * 3.5;
        } else if (type === 'campfire') {
          // Olov shitirlashi
          b0 = 0.95 * b0 + white * 0.1;
          const crackle = Math.random() > 0.998 ? (Math.random() * 0.4) : 0;
          data[i] = b0 * 2.0 + crackle;
        } else {
          // Brown shovqin (kutubxona va kofe foni)
          b0 = (b0 + (0.02 * white)) / 1.02;
          data[i] = b0 * 3.5;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Past chastotali filtr (yumshoq eshitilishi uchun)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'rain' ? 800 : (type === 'campfire' ? 1200 : 500);

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainNodeRef.current = gain;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noiseNodeRef.current = noise;
    } catch {
      // Audio autoplay restrictions
    }
  }, [stopAmbientSound, volume]);

  const toggleSound = (soundId: string, type: string) => {
    soundFX.click();
    if (activeSound === soundId) {
      stopAmbientSound();
      setActiveSound(null);
    } else {
      setActiveSound(soundId);
      startAmbientSound(type);
    }
  };

  const handleVolumeChange = (newVal: number[]) => {
    const val = newVal[0];
    setVolume(val);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val;
    }
  };

  // Fokus sessiyasi yakunlanganda mukofot olish
  async function handleSessionComplete() {
    celebrate();
    soundFX.fanfare();
    const completedGoals = goals.filter((g) => g.completed).length;

    if (timerMode === 'focus') {
      const minutesSpent = focusDuration;
      setSessionsCompleted((prev) => prev + 1);
      setTotalStudyMinutes((prev) => prev + minutesSpent);

      try {
        const res = await apiFetch<{
          success: boolean;
          xp_earned: number;
          coins_earned: number;
          streak: number;
          message: string;
        }>('/api/learning/study/complete/', {
          method: 'POST',
          body: JSON.stringify({
            duration_minutes: minutesSpent,
            goals_done: completedGoals,
          }),
        });

        toast.success(res.message || `Ajoyib natija! +${res.xp_earned} XP qo'lga kiritildi! 🚀`, {
          duration: 6000,
        });
        fetchMe().catch(() => {});
      } catch {
        toast.success(`Fokus sessiyasi muvaffaqiyatli yakunlandi! +25 XP berildi! 🔥`);
      }

      // Avtomatik tanaffus rejimiga o'tish
      setTimerMode('shortBreak');
    } else {
      toast.info("Tanaffus yakunlandi! Qayta quvvatlandingiz, navbatdagi fokus darsiga tayyormisiz? ⚡");
      setTimerMode('focus');
    }
  }

  const toggleTimer = () => {
    soundFX.click();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    soundFX.click();
    setIsRunning(false);
    setTimeLeft(timerMode === 'focus' ? focusDuration * 60 : breakDuration * 60);
  };

  // Maqsad qo'shish va o'chirish
  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    soundFX.click();
    setGoals((prev) => [...prev, { id: String(Date.now()), text: newGoalText.trim(), completed: false }]);
    setNewGoalText('');
  };

  const toggleGoal = (id: string) => {
    soundFX.click();
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const next = !g.completed;
          if (next) soundFX.correct();
          return { ...g, completed: next };
        }
        return g;
      })
    );
  };

  const deleteGoal = (id: string) => {
    soundFX.click();
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress doirasi foizi
  const totalSecs = timerMode === 'focus' ? focusDuration * 60 : breakDuration * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100));

  return (
    <div className={cn("min-h-screen bg-[var(--surface-bg)] text-foreground flex flex-col", isFullscreen && "bg-[#06080d]")}>
      {!isFullscreen && <AppShell />}

      <main className={cn("flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 pb-20", isFullscreen && "max-w-none p-6 sm:p-10 flex flex-col justify-center")}>
        {/* Page Hero Header */}
        {!isFullscreen && (
          <PageHero
            eyebrow="Fokus 2.0 · Hamfikrlar Xonasi"
            eyebrowIcon={Headphones}
            title="Sokin Tayyorgarlik Zali"
            description="Ilmiy Pomodoro taymeri, sokin ambient tovushlari va jonli abituriyentlar zali. Chalg'imasdan dars qiling va bilimingizni yangi bosqichga olib chiqing."
            tone="emerald"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT / MAIN COLUMN: THE INTERACTIVE POMODORO CLOCK (Col 7) ── */}
          <div className={cn("lg:col-span-7 space-y-6", isFullscreen && "lg:col-span-8 mx-auto w-full max-w-3xl")}>
            <Card className="relative overflow-hidden border border-[var(--border-card)] bg-gradient-to-b from-[var(--surface-card)] via-[var(--surface-card-strong)] to-[var(--surface-card)] shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
              {/* Subtle ambient blur light */}
              <div className={cn(
                "absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
                timerMode === 'focus' ? "bg-emerald-500/15" : "bg-amber-500/15"
              )} />

              {/* Mode Selectors & Fullscreen button */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-4">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/40">
                  <button
                    onClick={() => { soundFX.click(); setTimerMode('focus'); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                      timerMode === 'focus' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🎯 Chuqur Dars (25m)
                  </button>
                  <button
                    onClick={() => { soundFX.click(); setTimerMode('shortBreak'); }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      timerMode === 'shortBreak' ? "bg-amber-500 text-black shadow-md shadow-amber-500/30" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ☕ Tanaffus (5m)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>{peerCount} nafar faol</span>
                  </div>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? "Oddiy rejimga qaytish" : "To'liq ekran (Zen Mode)"}
                    className="p-2 rounded-xl bg-card border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                  </button>
                </div>
              </div>

              {/* ── Circular Progress & Huge Digital Timer ── */}
              <div className="my-8 sm:my-10 flex flex-col items-center justify-center relative">
                <div className="relative size-64 sm:size-72 flex items-center justify-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    {/* Track */}
                    <circle
                      cx="50" cy="50" r="42"
                      className="stroke-muted/30 fill-none"
                      strokeWidth="5"
                    />
                    {/* Animated Progress */}
                    <circle
                      cx="50" cy="50" r="42"
                      className={cn(
                        "fill-none transition-all duration-500 stroke-linecap-round",
                        timerMode === 'focus' ? "stroke-emerald-500" : "stroke-amber-400"
                      )}
                      strokeWidth="5.5"
                      strokeDasharray="263.89"
                      strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
                    />
                  </svg>

                  {/* Inside circle content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                    <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md text-foreground">
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      {timerMode === 'focus' ? "Fokus Jarayoni" : "Dam Olish Vaqti"}
                    </span>
                    {isRunning && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Flame className="size-3 text-emerald-400 animate-pulse" /> Dars davom etmoqda
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Control Buttons ── */}
                <div className="mt-6 flex items-center gap-3">
                  <Button
                    onClick={toggleTimer}
                    size="lg"
                    className={cn(
                      "px-8 py-6 rounded-2xl font-black text-base transition-all active:scale-95 shadow-xl",
                      isRunning
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                    )}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="size-5 mr-2 fill-current" /> To&apos;xtatish
                      </>
                    ) : (
                      <>
                        <Play className="size-5 mr-2 fill-current" /> Boshlash
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={resetTimer}
                    size="icon"
                    variant="outline"
                    className="size-12 rounded-2xl border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Vaqtni qayta o'rnatish"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom Quick Session Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40 text-center">
                <div className="p-2.5 rounded-2xl bg-card/60 border border-border/40">
                  <span className="text-[11px] text-muted-foreground font-medium block">Tugallangan</span>
                  <span className="text-base font-black text-foreground">{sessionsCompleted} ta dars</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-card/60 border border-border/40">
                  <span className="text-[11px] text-muted-foreground font-medium block">Umumiy vaqt</span>
                  <span className="text-base font-black text-emerald-400">{totalStudyMinutes} daqiqa</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-card/60 border border-border/40">
                  <span className="text-[11px] text-muted-foreground font-medium block">Yig&apos;ilgan XP</span>
                  <span className="text-base font-black text-amber-400">+{sessionsCompleted * 25} XP</span>
                </div>
              </div>
            </Card>

            {/* ── AMBIENT AUDIO SOUNDSCAPES ── */}
            <Card className="border border-[var(--border-card)] bg-[var(--surface-card)] rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground">Sokin Fon Tovushlari (Ambient Generator)</h3>
                </div>
                {activeSound && (
                  <button
                    onClick={stopAmbientSound}
                    className="text-xs font-semibold text-rose-400 hover:underline"
                  >
                    Ovozni o&apos;chirish
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AMBIENT_SOUNDS.map((snd) => {
                  const SoundIcon = snd.icon;
                  const isActive = activeSound === snd.id;
                  return (
                    <button
                      key={snd.id}
                      onClick={() => toggleSound(snd.id, snd.type)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all relative overflow-hidden group",
                        isActive
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-card border-border/60 hover:border-border hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <SoundIcon className={cn("size-5 mb-2", isActive ? "text-emerald-400 animate-pulse" : "text-muted-foreground")} />
                      <span className="text-xs font-bold block truncate">{snd.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{isActive ? '🔊 Yangramoqda' : 'Yoqish'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Volume Slider */}
              {activeSound && (
                <div className="flex items-center gap-3 pt-2">
                  <Volume2 className="size-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.05}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT COLUMN: STUDY GOALS & STUDY TIPS (Col 5) ── */}
          <div className={cn("lg:col-span-5 space-y-6", isFullscreen && "hidden")}>
            {/* Session Goals Card */}
            <Card className="border border-[var(--border-card)] bg-[var(--surface-card)] rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground">Bugungi Dars Maqsadlarim</h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-bold">
                  {goals.filter((g) => g.completed).length} / {goals.length}
                </Badge>
              </div>

              {/* New Goal Input Form */}
              <form onSubmit={addGoal} className="flex items-center gap-2">
                <Input
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="Yangi dars maqsadi kiriting..."
                  className="rounded-xl text-xs bg-muted/40 border-border/70 focus-visible:ring-emerald-500"
                />
                <Button type="submit" size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                  <Plus className="size-4" />
                </Button>
              </form>

              {/* Goal List */}
              <div className="space-y-2 pt-1">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all text-xs group",
                      goal.completed
                        ? "bg-emerald-500/10 border-emerald-500/20 text-muted-foreground line-through"
                        : "bg-card border-border/60 hover:border-border text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                    >
                      <div className={cn(
                        "size-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                        goal.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border"
                      )}>
                        {goal.completed && <CheckCircle2 className="size-3" />}
                      </div>
                      <span className="truncate">{goal.text}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-opacity p-1 ml-2"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Study Navigation Card */}
            <Card className="border border-[var(--border-card)] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Darslik &amp; Flashcardlar</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tayyorgarlik davomida konspektlarni qayta o&apos;qib, eng muhim faktlarni xotirada mustahkamlang:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Link
                  href="/learning"
                  className="p-3 rounded-2xl bg-card border border-border/60 hover:bg-muted transition-colors flex items-center justify-between text-xs font-bold"
                >
                  <span>📖 Darslar Markazi</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href="/flashcards"
                  className="p-3 rounded-2xl bg-card border border-border/60 hover:bg-muted transition-colors flex items-center justify-between text-xs font-bold"
                >
                  <span>🎴 Flashcard Yodlash</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </Card>

            {/* Motivation Quote Box */}
            <div className="p-4 rounded-3xl bg-card/40 border border-border/40 text-center space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                ⚡ Kunlik Imtihon Qoidasi
              </span>
              <p className="text-xs text-muted-foreground italic">
                &ldquo;Kichik muntazam odatlar — buyuk natijalarning asosi. Har kuni 50 daqiqa dars qilish 1 oyda 30 soat sof bilim beradi.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
