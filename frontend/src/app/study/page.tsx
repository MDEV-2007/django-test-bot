'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Flame,
  CheckCircle2, Plus, Trash2, Maximize2, Minimize2, Users, Trophy,
  BookOpen, Headphones, Coffee, CloudRain, FlameKindling, Wind, Library,
  ShieldCheck, Award, ArrowRight, Bot, Zap, Target, Dna, Layers, Brain,
  ChevronRight, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';

import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

// Ambient Sound Presets
type AmbientSound = {
  id: string;
  name: string;
  icon: any;
  description: string;
  type: 'rain' | 'library' | 'cafe' | 'campfire' | 'forest';
};

const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'rain', name: 'Yomg\'ir', icon: CloudRain, description: 'Sokin yomg\'ir tomchilari', type: 'rain' },
  { id: 'library', name: 'Kutubxona', icon: Library, description: 'Jimjit zaldagi shivirlash', type: 'library' },
  { id: 'cafe', name: 'Shinam Kofe', icon: Coffee, description: 'Iliq qahvaxona foni', type: 'cafe' },
  { id: 'campfire', name: 'Olov', icon: FlameKindling, description: 'Olov shitirlashi', type: 'campfire' },
  { id: 'forest', name: 'O\'rmon & Shamol', icon: Wind, description: 'Tabiiy sokin shabada', type: 'forest' },
];

type StudyMission = {
  id: string;
  subject: string;
  topic: string;
  icon: any;
  durationMinutes: number;
  xpReward: number;
  tasks: {
    id: string;
    label: string;
    type: 'reading' | 'questions' | 'flashcard';
    completed: boolean;
    current?: number;
    total?: number;
  }[];
  aiReason: string;
  currentMastery: number;
  targetMastery: number;
};

const PRESET_MISSIONS: StudyMission[] = [
  {
    id: 'bio-cell',
    subject: 'Biologiya',
    topic: 'Hujayra va uning tuzilishi',
    icon: Dna,
    durationMinutes: 25,
    xpReward: 75,
    currentMastery: 64,
    targetMastery: 67,
    aiReason: 'Bugun Biologiyadan 64% mastery\'dasan. Kecha "Hujayra membranasi" savollarida qiynalgansan. Bugungi fokus uchun shu mavzuni tayyorladim.',
    tasks: [
      { id: 't1', label: '10 min mavzu o\'rganish', type: 'reading', completed: false },
      { id: 't2', label: '10 ta savol yechish', type: 'questions', completed: false, current: 0, total: 10 },
      { id: 't3', label: 'Flashcard takrorlash', type: 'flashcard', completed: false, current: 0, total: 5 },
    ],
  },
  {
    id: 'hist-temur',
    subject: 'Tarix',
    topic: 'Amir Temur davlati va harbiy yurishlari',
    icon: BookOpen,
    durationMinutes: 25,
    xpReward: 75,
    currentMastery: 78,
    targetMastery: 82,
    aiReason: 'Tarixdan 78% o\'zlashtirishdasan. Temuriylar davri xronologiyasini mustahkamlash uchun ajoyib fursat.',
    tasks: [
      { id: 'h1', label: '10 min konspekt tahlili', type: 'reading', completed: false },
      { id: 'h2', label: '10 ta test savolini yechish', type: 'questions', completed: false, current: 0, total: 10 },
      { id: 'h3', label: 'Sanalar flashcardini ko\'rish', type: 'flashcard', completed: false, current: 0, total: 5 },
    ],
  },
  {
    id: 'math-quad',
    subject: 'Matematika',
    topic: 'Kvadrat tenglamalar va Viyet teoremasi',
    icon: Target,
    durationMinutes: 25,
    xpReward: 75,
    currentMastery: 71,
    targetMastery: 75,
    aiReason: 'Matematika mastery darajang 71%. Viyet formulalarida tezlikni oshirish bugungi fokus vazifang.',
    tasks: [
      { id: 'm1', label: 'Formulalar tahlili (8 min)', type: 'reading', completed: false },
      { id: 'm2', label: '10 ta amaliy mashq yechish', type: 'questions', completed: false, current: 0, total: 10 },
      { id: 'm3', label: 'Tezkor hisoblash kartasi', type: 'flashcard', completed: false, current: 0, total: 5 },
    ],
  },
];

const WEEK_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function StudyRoomPage() {
  const { user } = useAuthStore();

  // Tanlangan Missiya
  const [activeMission, setActiveMission] = useState<StudyMission>(PRESET_MISSIONS[0]);

  // Pomodoro Taymer
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Fullscreen / Zen Rejimi
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Yakunlash modali holati
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedStats, setCompletedStats] = useState<{
    xpEarned: number;
    streak: number;
    prevMastery: number;
    newMastery: number;
    subject: string;
  } | null>(null);

  // Streak ma'lumoti
  const currentStreak = 17; // foydalanuvchi streaki
  const todayDayIndex = 5; // Shanba (0=Du, 5=Sh)

  // Ambient Ovoz generatori
  const [activeSound, setActiveSound] = useState<string | null>('rain');
  const [volume, setVolume] = useState(0.4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Onlayn hamrohlar
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
      handleFinishSession();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Missiya o'zgarganda taymerni yangilash
  useEffect(() => {
    setDurationMinutes(activeMission.durationMinutes);
    setTimeLeft(activeMission.durationMinutes * 60);
    setIsRunning(false);
  }, [activeMission]);

  // Jonli foydalanuvchilar
  useEffect(() => {
    const timer = setInterval(() => {
      setPeerCount((prev) => Math.max(38, prev + (Math.random() > 0.5 ? 1 : -1)));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API ambient tovush yaratish
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

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          b0 = 0.99 * b0 + white * 0.05;
          data[i] = b0 * 3.5;
        } else if (type === 'campfire') {
          b0 = 0.95 * b0 + white * 0.1;
          const crackle = Math.random() > 0.998 ? (Math.random() * 0.4) : 0;
          data[i] = b0 * 2.0 + crackle;
        } else {
          b0 = (b0 + (0.02 * white)) / 1.02;
          data[i] = b0 * 3.5;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

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
      // Audio autoplay
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

  // Sessiyani yakunlash (Finish)
  async function handleFinishSession() {
    celebrate();
    soundFX.fanfare();
    setIsRunning(false);
    setSessionsCompleted((prev) => prev + 1);

    const xpEarned = activeMission.xpReward;
    const newStreak = currentStreak + 1;

    setCompletedStats({
      xpEarned,
      streak: newStreak,
      prevMastery: activeMission.currentMastery,
      newMastery: activeMission.targetMastery,
      subject: activeMission.subject,
    });
    setShowCompletionModal(true);

    try {
      await apiFetch('/api/learning/study/complete/', {
        method: 'POST',
        body: JSON.stringify({
          duration_minutes: durationMinutes,
          mission_id: activeMission.id,
        }),
      });
      fetchMe().catch(() => {});
    } catch {
      // Offline / demo fallback
    }
  }

  const toggleTimer = () => {
    soundFX.click();
    if (!isRunning && !activeSound) {
      // Default yomg'ir ovozini ishga tushiramiz
      setActiveSound('rain');
      startAmbientSound('rain');
    }
    setIsRunning(!isRunning);
  };

  const changeDurationPreset = (mins: number) => {
    soundFX.click();
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
    setIsRunning(false);
  };

  const resetTimer = () => {
    soundFX.click();
    setIsRunning(false);
    setTimeLeft(durationMinutes * 60);
  };

  // Vazifani bajarildi deb belgilash
  const toggleTask = (taskId: string) => {
    soundFX.click();
    setActiveMission((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id === taskId) {
          const nextVal = !t.completed;
          if (nextVal) soundFX.correct();
          return {
            ...t,
            completed: nextVal,
            current: t.total ? (nextVal ? t.total : 0) : undefined,
          };
        }
        return t;
      }),
    }));
  };

  // Savol/kartalar hisobini oshirish
  const incrementTaskCounter = (taskId: string, step: number = 1) => {
    soundFX.click();
    setActiveMission((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id === taskId && t.total) {
          const next = Math.min(t.total, Math.max(0, (t.current || 0) + step));
          if (next === t.total) soundFX.correct();
          return {
            ...t,
            current: next,
            completed: next === t.total,
          };
        }
        return t;
      }),
    }));
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress doirasi foizi
  const totalSecs = durationMinutes * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100));

  const SubjectIcon = activeMission.icon;
  const currentAmbient = AMBIENT_SOUNDS.find((s) => s.id === activeSound);

  return (
    <div className={cn("min-h-screen bg-[var(--surface-bg)] text-foreground flex flex-col", isFullscreen && "bg-[#080b12]")}>
      {!isFullscreen && <AppShell />}

      <main className={cn(
        "flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 pb-20",
        isFullscreen && "max-w-none p-4 sm:p-8 flex flex-col justify-center min-h-screen"
      )}>
        {/* ============================================================ */}
        {/* TO'LIQ EKRAN (ZEN ANTI-DISTRACTION MODE)                      */}
        {/* ============================================================ */}
        {isFullscreen ? (
          <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
            {/* Top exit & logo */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-primary text-sm tracking-wider">ILMILDIZI</span>
                <span>•</span>
                <span className="font-bold text-foreground">ZEN STUDY MODE</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-xs font-bold gap-1 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Minimize2 className="size-3.5" />
                <span>Chiqish</span>
              </Button>
            </div>

            {/* Title & Subject */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <SubjectIcon className="size-3.5" />
                <span>{activeMission.subject}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {activeMission.topic}
              </h2>
            </div>

            {/* Giant Countdown */}
            <div className="py-6 space-y-3">
              <span className="font-mono text-7xl sm:text-8xl font-black tracking-tight drop-shadow-lg text-foreground">
                {formatTime(timeLeft)}
              </span>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto relative h-3.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  🎯 FOKUSDA
                </span>
                <span>•</span>
                <span>{Math.round(progressPercent)}% o&apos;tdi</span>
              </div>
            </div>

            {/* Inline Ambient Audio Controller */}
            <div className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/50 max-w-lg mx-auto">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Headphones className="size-4 text-emerald-400" />
                <span>{currentAmbient ? `${currentAmbient.name} • ${Math.round(volume * 100)}%` : 'Ovoz o\'chirilgan'}</span>
              </span>

              <div className="flex items-center gap-2">
                {AMBIENT_SOUNDS.map((snd) => (
                  <button
                    key={snd.id}
                    onClick={() => toggleSound(snd.id, snd.type)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",
                      activeSound === snd.id
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {snd.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Task Progress */}
            <div className="max-w-md mx-auto p-4 rounded-3xl bg-card border border-border/70 text-left space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Sessiya Vazifalari</span>
                <span className="text-amber-500 font-mono">+{activeMission.xpReward} XP</span>
              </div>

              <div className="space-y-2">
                {activeMission.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-background/80 border border-border/60 text-xs"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      <div className={cn(
                        "size-4 rounded-full border flex items-center justify-center shrink-0",
                        task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border"
                      )}>
                        {task.completed && <CheckCircle2 className="size-3" />}
                      </div>
                      <span className={cn("truncate font-medium", task.completed && "line-through text-muted-foreground")}>
                        {task.label}
                      </span>
                    </button>

                    {task.total && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 font-mono text-xs">
                        <button
                          onClick={() => incrementTaskCounter(task.id, -1)}
                          className="size-5 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold">{task.current} / {task.total}</span>
                        <button
                          onClick={() => incrementTaskCounter(task.id, 1)}
                          className="size-5 rounded-md bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={toggleTimer}
                size="lg"
                className={cn(
                  "px-8 py-5 rounded-2xl font-black text-sm transition-all shadow-lg",
                  isRunning
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="size-4 mr-1.5 fill-current" /> Pauza
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-1.5 fill-current" /> Davom ettirish
                  </>
                )}
              </Button>

              <Button
                onClick={handleFinishSession}
                variant="outline"
                size="lg"
                className="py-5 rounded-2xl font-bold text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                <span>Yakunlash</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground font-mono">
              🔥 {currentStreak} kunlik streak saqlanmoqda
            </p>
          </div>
        ) : (
          /* ============================================================ */
          /* ODDIY REJIM: AI TAVSIYA, FOKUS MISSIYASI & STREAK            */
          /* ============================================================ */
          <>
            {/* Sarlavha */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase px-2.5 py-0.5 rounded-xl gap-1.5">
                    <PremiumIcon icon={Target} tone="primary" size="xs" />
                    <span>STUDY MODE</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    25 daqiqa. Bitta maqsad. Nol chalg&apos;ituvchi.
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-1">
                  Fokus Xonasi &amp; Study Session
                </h1>
              </div>

              {/* Jonli talabalar & Zen button */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{peerCount} nafar o&apos;quvchi zalda</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(true)}
                  className="rounded-2xl text-xs font-bold gap-1.5 border-border/80 hover:border-primary/40"
                >
                  <Maximize2 className="size-3.5" />
                  <span className="hidden sm:inline">Zen Mode</span>
                </Button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 🤖 AI MENTOR: BUGUN SIZ UCHUN TAVSIYA                        */}
            {/* ============================================================ */}
            <Card className="rounded-3xl border-2 border-indigo-500/35 bg-gradient-to-r from-indigo-950/20 via-card to-purple-950/20 p-5 sm:p-6 shadow-md relative overflow-hidden backdrop-blur-md">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-indigo-500/10 blur-2xl" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-2xl">
                  <div className="size-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="size-6 text-indigo-400" />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[10px] font-black uppercase tracking-wider">
                        🤖 AI Mentor Tavsiyasi
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        Bugun siz uchun
                      </Badge>
                    </div>

                    {/* Alohida ajralib turuvchi iqtibos ramkasi */}
                    <div className="border-l-2 border-indigo-400/70 pl-3 py-0.5 my-1">
                      <p className="text-xs sm:text-[13px] text-foreground/90 italic font-medium leading-relaxed">
                        &ldquo;{activeMission.aiReason}&rdquo;
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-muted-foreground">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Tavsiya etilgan: <strong className="text-indigo-300">{activeMission.subject}</strong>
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-[11px]">
                        Mastery: <strong className="text-emerald-400 font-mono">{activeMission.currentMastery}%</strong> ➔ <strong className="text-primary font-mono">{activeMission.targetMastery}%</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Switch Subject presets */}
                <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto shrink-0 bg-background/60 p-1.5 rounded-2xl border border-border/80">
                  <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground px-2">Fanlar:</span>
                  {PRESET_MISSIONS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        soundFX.click();
                        setActiveMission(m);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all",
                        activeMission.id === m.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {m.subject}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* ============================================================ */}
            {/* 🎯 BIRLASHTIRILGAN STUDY SESSION & 🔥 FOCUS STREAK           */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ASOSIY STUDY SESSION KARTASI (Col 8) */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-7 shadow-md relative overflow-hidden">
                  <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/10 blur-3xl" />

                  {/* Header: Fan & Mavzu - Asosiy Dominant Sarlavha */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-primary flex items-center gap-1">
                          <Target className="size-3.5" /> BUGUNGI FOKUS MAQSADI
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/10">
                          {activeMission.subject}
                        </Badge>
                      </div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
                        {activeMission.topic}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1">
                        <Zap className="size-3.5" /> +{activeMission.xpReward} XP
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(true)}
                        className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                        title="To'liq ekran (Zen Mode)"
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Ikki ustunli Session Layout: Timer chapda, Vazifalar o'ngda */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
                    {/* Chap ustun: Katta Digital Taymer, Sozlama Presets & Tugmalar (Col 6) */}
                    <div className="md:col-span-6 flex flex-col items-center justify-center p-4 sm:p-5 rounded-3xl bg-background/80 border border-border/70 text-center space-y-4">
                      
                      {/* Pomodoro vaqtini tezda o'zgartirish (15, 25, 50 min presets) */}
                      <div className="flex items-center justify-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                        {[15, 25, 50].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => changeDurationPreset(mins)}
                            className={cn(
                              "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                              durationMinutes === mins
                                ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                            title={`${mins} daqiqalik taymer`}
                          >
                            {mins} daq {mins === 25 && '⚡'}
                          </button>
                        ))}
                      </div>

                      <div className="relative size-48 sm:size-52 flex items-center justify-center">
                        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50" cy="50" r="42"
                            className="stroke-muted/40 fill-none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50" cy="50" r="42"
                            className="stroke-emerald-500 fill-none transition-all duration-500 stroke-linecap-round"
                            strokeWidth="6"
                            strokeDasharray="263.89"
                            strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                          <span className="font-mono text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                            {formatTime(timeLeft)}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground mt-1">
                            FOKUS JARAYONI
                          </span>
                          {isRunning && (
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Flame className="size-3 text-emerald-400 animate-pulse" /> Davom etmoqda
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center gap-2.5 w-full">
                        <Button
                          onClick={toggleTimer}
                          size="lg"
                          className={cn(
                            "flex-1 h-12 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md gap-2",
                            isRunning
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          {isRunning ? (
                            <>
                              <Pause className="size-4 fill-current" /> Pauza
                            </>
                          ) : (
                            <>
                              <Play className="size-4 fill-current" /> [ 🚀 BOSHLASH ]
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={resetTimer}
                          size="icon"
                          variant="outline"
                          className="size-12 rounded-2xl border-border/80 hover:bg-muted text-muted-foreground shrink-0"
                          title="Qayta o'rnatish"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* O'ng ustun: BUGUNGI MISSIYA CHECKLIST (Col 6) */}
                    <div className="md:col-span-6 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-black uppercase tracking-wider text-muted-foreground">
                          BUGUNGI MISSIYA
                        </h4>
                        <span className="text-xs font-bold text-muted-foreground">
                          {activeMission.tasks.filter((t) => t.completed).length} / {activeMission.tasks.length} bajarildi
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {activeMission.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 text-xs group",
                              task.completed
                                ? "bg-emerald-500/[0.07] border-emerald-500/30 text-muted-foreground"
                                : "bg-card border-border/70 hover:border-primary/40 text-foreground"
                            )}
                          >
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                            >
                              <div className={cn(
                                "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                task.completed
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground/40 group-hover:border-primary"
                              )}>
                                {task.completed && <CheckCircle2 className="size-3.5" />}
                              </div>
                              <span className={cn("font-bold truncate", task.completed && "line-through")}>
                                {task.label}
                              </span>
                            </button>

                            {task.total && (
                              <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                                <button
                                  onClick={() => incrementTaskCounter(task.id, -1)}
                                  className="size-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold"
                                  title="Kamaytirish"
                                >
                                  -
                                </button>
                                <span className="font-bold px-1">{task.current} / {task.total}</span>
                                <button
                                  onClick={() => incrementTaskCounter(task.id, 1)}
                                  className="size-6 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center font-bold"
                                  title="Oshirish"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Mukofot badge */}
                      <div className="p-3 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          🎁 Sessiya Mukofoti:
                        </span>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                          +{activeMission.xpReward} XP &bull; Mastery +3%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 🎧 FOKUS MUHITI (AMBIENT SOUND MIXER) */}
                <Card className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
                  {/* Header: Title + Realtime Master Volume Slayderi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={Headphones} tone="emerald" size="sm" glow />
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          🎧 Fokus Muhiti (Ambient Fon Tovushlari)
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Miyani tinchlantiruvchi va diqqatni jamlovchi tabiiy tovushlar
                        </p>
                      </div>
                    </div>

                    {/* Mikser: Doimiy ko'rinib turuvchi ovoz slayderi */}
                    <div className="flex items-center gap-2.5 bg-muted/40 px-3 py-1.5 rounded-2xl border border-border/60 shrink-0 self-start sm:self-auto">
                      <Volume2 className="size-4 text-emerald-500 shrink-0" />
                      <Slider
                        value={[volume]}
                        max={1}
                        step={0.05}
                        onValueChange={handleVolumeChange}
                        className="w-24 sm:w-28"
                      />
                      <span className="text-xs font-mono font-bold text-foreground w-8 text-right">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Tovush kartochkalari (Alohida holat va mini-indikator bilan) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AMBIENT_SOUNDS.map((snd) => {
                      const Icon = snd.icon;
                      const isActive = activeSound === snd.id;
                      return (
                        <button
                          key={snd.id}
                          onClick={() => toggleSound(snd.id, snd.type)}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer",
                            isActive
                              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 ring-2 ring-emerald-500/30 shadow-xs"
                              : "bg-background border-border/70 hover:border-border/90 text-foreground hover:scale-[1.01]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <PremiumIcon icon={Icon} tone={isActive ? "emerald" : "zinc"} size="xs" glow={isActive} />
                            {isActive && (
                              <span className="flex items-center gap-0.5">
                                <span className="size-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="size-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold block truncate">{snd.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                            {isActive ? '🔊 Yangramoqda' : 'Yoqish'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeSound && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="italic text-[11px]">Hozir faol: <strong className="text-foreground">{currentAmbient?.name}</strong></span>
                      <button
                        onClick={stopAmbientSound}
                        className="text-xs font-semibold text-rose-500 hover:underline"
                      >
                        Ovozni o&apos;chirish
                      </button>
                    </div>
                  )}
                </Card>
              </div>

              {/* O'NG USTUN: 🔥 FOCUS STREAK & YUTUQLAR (Col 4) */}
              <div className="lg:col-span-4 space-y-6">
                {/* 🔥 FOCUS STREAK KARTASI */}
                <Card className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={Flame} tone="amber" size="sm" glow />
                      <h3 className="text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                        FOCUS STREAK
                      </h3>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 font-mono text-xs font-extrabold">
                      +{currentStreak * 5} XP Bonus
                    </Badge>
                  </div>

                  <div className="text-center py-2 space-y-1">
                    <p className="text-3xl sm:text-4xl font-black text-foreground font-mono flex items-center justify-center gap-2">
                      <Flame className="size-7 text-amber-500" />
                      <span>{currentStreak} KUN</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uzluksiz kunlik dars odati
                    </p>
                  </div>

                  {/* Haftalik Nuqtalar: Du Se Ch Pa Ju Sh Ya */}
                  <div className="p-3.5 rounded-2xl bg-background/80 border border-border/70">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEK_DAYS.map((day, idx) => {
                        const isDone = idx < todayDayIndex;
                        const isToday = idx === todayDayIndex;
                        return (
                          <div key={day} className="flex flex-col items-center space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                              {day}
                            </span>
                            <div className={cn(
                              "size-6 rounded-full flex items-center justify-center text-xs transition-all",
                              isDone
                                ? "bg-amber-500 text-black font-black shadow-xs shadow-amber-500/30"
                                : isToday
                                ? "border-2 border-dashed border-amber-500 bg-amber-500/20 text-amber-500 font-black animate-pulse"
                                : "bg-muted/50 text-muted-foreground border border-border"
                            )}>
                              {isDone ? '●' : isToday ? '○' : '·'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bugungi fokus maqsadi mini progress bar */}
                  <div className="p-3.5 rounded-2xl bg-background/80 border border-border/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground flex items-center gap-1.5">
                        <Target className="size-3.5 text-amber-500" />
                        <span>Bugungi Maqsad</span>
                      </span>
                      <span className="font-mono text-amber-500 font-black">
                        25 / 50 daq (50%)
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700"
                        style={{ width: '50%' }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>🎯 Yana 1 ta Pomodoro qoldi</span>
                      <span className="font-semibold text-emerald-500">+25 XP</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center text-xs">
                    <span className="text-muted-foreground block text-[11px]">Bugun sessiyani yakunlab uzluksizlikni saqlang:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 inline-block">
                      Bugun davom ettiring: +25 XP
                    </strong>
                  </div>
                </Card>

                {/* Tezkor navigatsiya kartalari with Pulsing Notification Badges */}
                <Card className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={BookOpen} tone="indigo" size="sm" glow />
                      <h4 className="text-xs font-mono font-black uppercase tracking-wider text-muted-foreground">
                        O&apos;quv Qurollari
                      </h4>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Yangiliklar</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href="/tests"
                      className="p-3 rounded-2xl bg-background border border-border/70 hover:border-primary/40 transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Brain} tone="emerald" size="xs" />
                        <span>Amaliy Mashqlar Banki</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black">
                          +15 yangi
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>

                    <Link
                      href="/flashcards"
                      className="p-3 rounded-2xl bg-background border border-border/70 hover:border-primary/40 transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Layers} tone="amber" size="xs" />
                        <span>Quick Learn Flashcards</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-black">
                          8 ta takrorlash
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>

                    <Link
                      href="/reels"
                      className="p-3 rounded-2xl bg-background border border-border/70 hover:border-primary/40 transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Sparkles} tone="rose" size="xs" />
                        <span>Bilim Reels Videolari</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[10px] font-mono font-black flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>Yangi 🔥</span>
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ============================================================ */}
      {/* 🏆 SESSION COMPLETE MODAL (Misiyaning yakunlanishi)          */}
      {/* ============================================================ */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 text-center space-y-5 border-2 border-emerald-500/40">
          <DialogHeader className="space-y-2">
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-3xl">
              🎉
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
              MISSIYA BAJARILDI!
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Ajoyib natija! Siz 25 daqiqalik chuqur fokus sessiyasini muvaffaqiyatli yakunladingiz.
            </DialogDescription>
          </DialogHeader>

          {completedStats && (
            <div className="space-y-3">
              {/* Rewards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-500 block">Mukofot</span>
                  <span className="text-xl font-black text-amber-500 font-mono">
                    +{completedStats.xpEarned} XP
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">Focus Streak</span>
                  <span className="text-xl font-black text-rose-500 font-mono">
                    🔥 {completedStats.streak} kun
                  </span>
                </div>
              </div>

              {/* Mastery Progress: 64% -> 67% */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">🧠 {completedStats.subject} Mastery</span>
                  <span className="font-mono text-emerald-500 font-extrabold">
                    {completedStats.prevMastery}% ➔ {completedStats.newMastery}% (+3%)
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${completedStats.newMastery}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button asChild size="lg" className="w-full rounded-2xl font-black text-xs gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md">
              <Link href="/tests">
                <span>[ Keyingi missiya (Mashqlar) ➔ ]</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompletionModal(false)}
              className="w-full rounded-xl text-xs font-bold text-muted-foreground"
            >
              Yopish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
