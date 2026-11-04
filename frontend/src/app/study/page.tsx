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
import { Panel, PanelLabel, PanelLink, Pill, IconTile, Bar, EmptyNote } from '@/components/design/kit';
import { Sigma, Atom, FlaskConical, Landmark, Check } from 'lucide-react';
import TopicCheatSheetView from '@/components/study/TopicCheatSheetView';
import { Gamepad2, Swords, Compass, MapPin } from 'lucide-react';
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
import { useTransliterate } from '@/lib/transliterate';
import { useApiQuery } from '@/lib/api-cache';

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
  tasks: {
    id: string;
    label: string;
    type: 'reading' | 'questions' | 'flashcard';
    completed: boolean;
    current?: number;
    total?: number;
  }[];
  /** Tavsiya sababi — faqat haqiqiy natijalardan yasalgan matn. */
  aiReason: string;
  /** Fan bo'yicha haqiqiy o'zlashtirish (yakunlangan testlardan); null — ma'lumot yo'q. */
  currentMastery: number | null;
  answered: number;
};

type MasteryResponse = {
  mastery?: {
    subjects: { id: number; name: string; mastery: number; answered: number }[];
    topics: { id: number; title: string; mastery: number; answered: number }[];
    weak: string[];
  };
};

const MISSION_ICONS: Record<string, any> = { Biologiya: Dna, Tarix: BookOpen, Matematika: Target };

function missionTasks(prefix: string): StudyMission['tasks'] {
  return [
    { id: `${prefix}-1`, label: "10 min mavzu o'rganish", type: 'reading', completed: false },
    { id: `${prefix}-2`, label: '10 ta savol yechish', type: 'questions', completed: false, current: 0, total: 10 },
    { id: `${prefix}-3`, label: 'Flashcard takrorlash', type: 'flashcard', completed: false, current: 0, total: 5 },
  ];
}

// Natija yo'q (yoki yuklanmagan) holatdagi erkin fokus sessiyasi. Ilgari bu yerda
// "Biologiya 64%", "kecha Hujayra membranasida qiynalgansan" kabi soxta tavsiyalar
// hamma o'quvchiga bir xil ko'rsatilardi.
const FREE_FOCUS_MISSION: StudyMission = {
  id: 'free-focus',
  subject: 'Erkin fokus',
  topic: "O'zingiz tanlagan mavzu",
  icon: Brain,
  durationMinutes: 25,
  aiReason: "Hali yakunlangan test natijangiz yo'q. Bitta test yeching — tavsiyalar haqiqiy natijalaringiz asosida tuziladi.",
  currentMastery: null,
  answered: 0,
  tasks: missionTasks('free'),
};

/** Eng past o'zlashtirilgan 3 ta fan — /api/analytics/ dagi haqiqiy mastery'dan. */
function buildMissions(data: MasteryResponse | null): StudyMission[] {
  const subjects = data?.mastery?.subjects ?? [];
  if (!subjects.length) return [];
  const weakTopic = data?.mastery?.topics
    ?.filter((t) => t.answered > 0)
    .sort((x, y) => x.mastery - y.mastery)[0];
  return [...subjects]
    .sort((x, y) => x.mastery - y.mastery)
    .slice(0, 3)
    .map((s, idx) => ({
      id: `subject-${s.id}`,
      subject: s.name,
      topic: idx === 0 && weakTopic ? weakTopic.title : `${s.name}: takrorlash`,
      icon: MISSION_ICONS[s.name] ?? BookOpen,
      durationMinutes: 25,
      aiReason:
        `${s.name} fanidan o'zlashtirishingiz ${s.mastery}% (${s.answered} ta javob asosida).` +
        (idx === 0 && weakTopic ? ` Eng zaif mavzu: "${weakTopic.title}" (${weakTopic.mastery}%).` : ''),
      currentMastery: s.mastery,
      answered: s.answered,
      tasks: missionTasks(`s${s.id}`),
    }));
}

const WEEK_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const SUBJECT_TILE_TONES = ['brand', 'dark', 'gold', 'sky', 'violet'] as const;
const SUBJECT_TILE_ICONS = [Sigma, Atom, FlaskConical, Dna, Landmark];

/* Subject progress cards + "Continue learning" — all numbers are the student's real
   mastery from /api/analytics/ (correct ÷ answered per subject / topic). */
function StudyOverview({ data, loading }: { data?: MasteryResponse | null; loading: boolean }) {
  const subjects = (data?.mastery?.subjects || []).slice(0, 4);
  const topics = [...(data?.mastery?.topics || [])]
    .filter((tp) => tp.answered > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ds-panel h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {subjects.map((s, i) => (
            <Link key={s.id} href={`/learning`} className="ds-panel ds-panel-interactive p-3.5">
              <IconTile icon={SUBJECT_TILE_ICONS[i % SUBJECT_TILE_ICONS.length]} tone={SUBJECT_TILE_TONES[i % SUBJECT_TILE_TONES.length]} size="sm" />
              <p className="mt-3 text-[13px] font-bold text-foreground truncate">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.answered} ta javob · {s.mastery}% o&apos;zlashtirildi
              </p>
              <Bar value={s.mastery} className="mt-2.5" />
            </Link>
          ))}
        </div>
      )}

      <Panel>
        <PanelLabel icon={Play} right={topics.length ? <Pill tone="brand">{topics.length} ta mavzu</Pill> : null}>
          O&apos;qishni davom ettirish
        </PanelLabel>
        {topics.length === 0 ? (
          <EmptyNote action={<PanelLink href="/tests">Test yechish →</PanelLink>}>
            Test yechganingizdan keyin eng ko&apos;p yordam kerak bo&apos;lgan mavzular shu yerda chiqadi.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            {topics.map((tp) => {
              const done = tp.mastery >= 80;
              return (
                <Link key={tp.id} href={`/learning?topic_id=${tp.id}`} className="ds-row">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      done ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'bg-[var(--brand)] text-white'
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Play className="size-4 fill-current" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground truncate">{tp.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tp.answered} ta savol · {tp.mastery}% to&apos;g&apos;ri
                    </p>
                    {!done && <Bar value={tp.mastery} tone={tp.mastery < 50 ? 'danger' : 'brand'} className="mt-1.5 h-1" />}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    {done ? 'Takrorlash' : 'Davom etish'} <ChevronRight className="size-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function StudyRoomPage() {
  const { user } = useAuthStore();
  const { t } = useTransliterate();

  // Tanlangan Missiya
  // Tavsiyalar — haqiqiy natijalardan (yuklanish / xato / bo'sh holatlar bilan).
  const { data: masteryData, error: masteryError, loading: masteryLoading, refresh: refreshMastery } =
    useApiQuery<MasteryResponse>('/api/analytics/');
  const missions = React.useMemo(() => buildMissions(masteryData), [masteryData]);
  const [activeMission, setActiveMission] = useState<StudyMission>(FREE_FOCUS_MISSION);
  const pickedMissionRef = useRef(false);
  useEffect(() => {
    if (!pickedMissionRef.current && missions.length) setActiveMission(missions[0]);
  }, [missions]);

  // Pomodoro Taymer
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Fullscreen / Zen Rejimi
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cheatsheets' | 'games' | 'library' | 'focus'>('cheatsheets');
  const [selectedCheatTopic, setSelectedCheatTopic] = useState<{ id: number; title: string } | null>(null);
  const [studySubject, setStudySubject] = useState<string>('Tarix');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab');
      if (tabParam === 'games' || tabParam === 'library' || tabParam === 'focus' || tabParam === 'cheatsheets') {
        setActiveTab(tabParam);
      }
      const topId = p.get('topic_id');
      if (topId) {
        setSelectedCheatTopic({ id: parseInt(topId, 10), title: 'Tanlangan mavzu' });
      }
    }
  }, []);

  // Yakunlash modali holati
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedStats, setCompletedStats] = useState<{
    xpEarned: number;
    streak: number;
    subject: string;
  } | null>(null);

  // Streak ma'lumoti
  // Haqiqiy streak (profil) va bugungi hafta kuni (0=Du ... 6=Ya).
  const currentStreak = typeof user?.streak === 'number' ? user.streak : 0;
  const todayDayIndex = (new Date().getDay() + 6) % 7;

  // Ambient Ovoz generatori
  const [activeSound, setActiveSound] = useState<string | null>('rain');
  const [volume, setVolume] = useState(0.4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  // Server sessiya boshlanishini qayd etdimi (mukofot server o'lchagan vaqtga qarab beriladi).
  const studyStartedRef = useRef(false);

  // Onlayn hamrohlar

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
    studyStartedRef.current = false;

    // Mukofot faqat server javobiga ko'ra ko'rsatiladi (kunlik limit / xato bo'lsa 0 XP).
    let xpEarned = 0;
    let newStreak = currentStreak;
    try {
      const res = await apiFetch<{ xp_earned: number; streak: number }>(
        '/api/learning/study/complete/',
        {
          method: 'POST',
          body: JSON.stringify({
            duration_minutes: durationMinutes,
            mission_id: activeMission.id,
          }),
        },
      );
      xpEarned = res.xp_earned ?? 0;
      newStreak = res.streak ?? currentStreak;
      fetchMe().catch(() => {});
    } catch {
      // Tarmoq xatosi: yolg'on mukofot ko'rsatmaymiz.
    }

    setCompletedStats({
      xpEarned,
      streak: newStreak,
      subject: activeMission.subject,
    });
    setShowCompletionModal(true);
  }

  const toggleTimer = () => {
    soundFX.click();
    if (!isRunning && !activeSound) {
      // Default yomg'ir ovozini ishga tushiramiz
      setActiveSound('rain');
      startAmbientSound('rain');
    }
    if (!isRunning && !studyStartedRef.current) {
      studyStartedRef.current = true;
      apiFetch('/api/learning/study/start/', { method: 'POST' }).catch(() => {
        studyStartedRef.current = false;
      });
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
    <div className="theme-pastel min-h-screen text-foreground flex flex-col">
      {!isFullscreen && <AppShell />}

      <main className={cn(
        "ps-scope flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 pb-24 overflow-x-clip",
        isFullscreen && "max-w-none p-4 sm:p-8 flex flex-col justify-center min-h-screen"
      )}>
        {/* ============================================================ */}
        {/* TO'LIQ EKRAN (ZEN ANTI-DISTRACTION MODE)                      */}
        {/* ============================================================ */}
        {isFullscreen ? (
          <div className="mx-auto w-full max-w-2xl space-y-6 text-center text-foreground">
            {/* Top exit & logo */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary text-sm tracking-wider">ILMILDIZI</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-semibold text-foreground tracking-wide">ZEN STUDY MODE</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-xs font-semibold gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Minimize2 className="size-3.5" />
                <span>Chiqish</span>
              </Button>
            </div>

            {/* Title & Subject */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                <SubjectIcon className="size-3.5" />
                <span>{activeMission.subject}</span>
              </div>
              <h2 className="ps-display text-[32px] sm:text-[44px] text-foreground">
                {activeMission.topic}
              </h2>
            </div>

            {/* Giant Countdown */}
            <div className="py-6 space-y-3">
              <span className="ps-num text-[88px] sm:text-[120px] text-foreground">
                {formatTime(timeLeft)}
              </span>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto relative h-2.5 w-full overflow-hidden rounded-full bg-muted border border-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  🎯 FOKUSDA
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span>{Math.round(progressPercent)}% o&apos;tdi</span>
              </div>
            </div>

            {/* Inline Ambient Audio Controller */}
            <div className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-full bg-[var(--ps-paper)] shadow-[var(--ds-panel-shadow)] max-w-lg mx-auto">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Headphones className="size-4 text-primary" />
                <span>{currentAmbient ? `${currentAmbient.name} • ${Math.round(volume * 100)}%` : 'Ovoz o\'chirilgan'}</span>
              </span>

              <div className="flex items-center gap-1.5">
                {AMBIENT_SOUNDS.map((snd) => (
                  <button
                    key={snd.id}
                    onClick={() => toggleSound(snd.id, snd.type)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      activeSound === snd.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    {snd.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Task Progress */}
            <div className="max-w-md mx-auto p-4 sm:p-5 rounded-2xl bg-card border border-border text-left space-y-3 shadow-card">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground tracking-wide">Sessiya Vazifalari</span>
                <span className="text-amber-500 font-mono font-bold">≈ +{durationMinutes} XP</span>
              </div>

              <div className="space-y-2">
                {activeMission.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--ps-neutral)] text-xs transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className={cn(
                        "size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        task.completed ? "bg-primary border-primary text-primary-foreground" : "border-border"
                      )}>
                        {task.completed && <CheckCircle2 className="size-3" />}
                      </div>
                      <span className={cn("truncate font-medium text-foreground", task.completed && "line-through text-muted-foreground")}>
                        {task.label}
                      </span>
                    </button>

                    {task.total && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 font-mono text-xs">
                        <button
                          onClick={() => incrementTaskCounter(task.id, -1)}
                          className="size-5 rounded bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-bold transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-semibold text-foreground px-1">{task.current} / {task.total}</span>
                        <button
                          onClick={() => incrementTaskCounter(task.id, 1)}
                          className="size-5 rounded bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center font-bold transition-colors cursor-pointer"
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
                  "px-8 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-xs",
                  isRunning
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
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
                className="py-2.5 px-6 rounded-lg font-semibold text-xs border border-border bg-card text-foreground hover:bg-muted transition-all"
              >
                <CheckCircle2 className="size-4 mr-1.5 text-primary" />
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
            {/* ── Hero ── */}
            <section className="relative grid items-center gap-8 pt-2 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ps-chip">
                    <span className="size-2 rounded-full bg-[var(--ps-green)]" /> Shaxsiy o&apos;quv studiyasi
                  </span>
                  {currentStreak > 0 && (
                    <span className="ps-chip">
                      <Flame className="size-3.5 text-[var(--ps-coral)]" /> {currentStreak} kunlik seriya
                    </span>
                  )}
                </div>
                <h1 className="ps-display mt-5 text-[46px] sm:text-[68px] xl:text-[80px]">
                  O&apos;qish{' '}
                  <span className="relative inline-block text-[var(--ps-purple)]">
                    maydoni
                    <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                      <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                    </svg>
                  </span>
                  <span className="text-[var(--ps-coral)]">.</span>
                </h1>
                <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  Darslar, 60 soniyalik shpargalkalar, flashcards va xatolar ustida ishlash — barchasi bir joyda.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setIsFullscreen(true)} className="ps-btn ps-btn-ink">
                    <Maximize2 className="size-4" /> Zen rejim
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                  <Link href="/learning" className="ps-btn ps-btn-ghost">
                    Darslarga o&apos;tish
                  </Link>
                </div>
              </div>

              {/* Taymer kompozitsiyasi — joriy pomodoro uzunligi */}
              <div className="relative mx-auto aspect-square w-full max-w-[230px] sm:max-w-[320px]">
                <div aria-hidden className="absolute inset-[4%] rounded-full bg-[var(--ps-green)]" />
                <div aria-hidden className="absolute -right-2 bottom-[4%] size-[34%] rounded-tl-full bg-[var(--ps-orange)]" />
                <div aria-hidden className="ps-dots absolute left-0 top-0 size-[28%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
                <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full border-[6px] border-[#FFFCF7] bg-[#080808] text-[#FFFCF7]">
                  <span className="ps-eyebrow text-white/60">Fokus</span>
                  <span className="ps-num mt-1 text-[44px] sm:text-[56px]">{formatTime(timeLeft)}</span>
                  <span className="mt-1 text-[11px] font-semibold text-[var(--ps-orange)]">{isRunning ? 'Davom etmoqda' : 'Tayyor'}</span>
                </div>
              </div>
            </section>

            {/* ── O'quv bo'limlari ── */}
            <nav className="ds-seg flex w-full gap-1 overflow-x-auto no-scrollbar sm:w-fit">
              {[
                { href: '/learning', label: 'Darslar', icon: BookOpen },
                { href: '/study', label: 'Fokus xonasi', icon: Target, active: true },
                { href: '/flashcards', label: 'Flashcards', icon: Layers },
                { href: '/tests/revision', label: 'Takrorlash', icon: RotateCcw },
              ].map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  data-active={tab.active ? 'true' : undefined}
                  className="ds-seg-item inline-flex shrink-0 items-center gap-1.5 font-semibold"
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </Link>
              ))}
            </nav>

            <StudyOverview data={masteryData} loading={masteryLoading} />

            {/* ── 4 ta o'rganish bo'limi ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { id: 'cheatsheets', label: '60s shpargalkalar', badge: '60s', icon: Zap, tone: 'bg-[var(--ps-purple)] text-white' },
                { id: 'games', label: "Fan o'yinlari & Arena", badge: 'XP', icon: Gamepad2, tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                { id: 'library', label: 'Audio & kitoblar', badge: 'PDF', icon: BookOpen, tone: 'bg-[var(--ps-blue)] text-[#080808]' },
                { id: 'focus', label: 'Fokus xonasi (Zen)', badge: 'Zen', icon: Headphones, tone: 'bg-[var(--ps-green)] text-white' },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setActiveTab(tab.id as 'cheatsheets' | 'games' | 'library' | 'focus');
                      soundFX.click();
                    }}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-[24px] p-4 text-left transition-transform hover:-translate-y-1 sm:p-5',
                      tab.tone,
                      active && 'ps-mode-active',
                    )}
                  >
                    <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/15" />
                    <span className="relative flex w-full items-center justify-between">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-black/15">
                        <tab.icon className="size-5" />
                      </span>
                      <span className="rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-bold">{tab.badge}</span>
                    </span>
                    <span className="ps-display relative text-[18px] sm:text-[21px]">{t(tab.label)}</span>
                  </button>
                );
              })}
            </div>

            {/* ── 1-TAB: 60s shpargalkalar ── */}
            {activeTab === 'cheatsheets' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="ps-eyebrow text-[var(--text-muted)]">Anti-darslik</p>
                    <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">60 soniyalik <span className="text-[var(--ps-purple)]">shpargalkalar</span></h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Imtihonda tushadigan eng muhim faktlar va formulalar</p>
                  </div>
                  <div className="ds-seg flex max-w-full gap-1 overflow-x-auto no-scrollbar">
                    {['Tarix', 'Ona tili', 'Matematika', 'Biologiya', 'Ingliz tili'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        data-active={studySubject === sub ? 'true' : undefined}
                        onClick={() => { setStudySubject(sub); soundFX.click(); }}
                        className="ds-seg-item shrink-0 cursor-pointer font-semibold"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { id: 1, title: studySubject === 'Tarix' ? "Qadimgi davlatlar va ilk sivilizatsiyalar" : `${studySubject}: Asosiy qoidalar va formulalar`, traps: "Inkor savollari va davrlar chalkashishi", bullets: 3, mins: 1 },
                    { id: 2, title: studySubject === 'Tarix' ? "Amir Temur va Temuriylar saltanati" : `${studySubject}: Imtihon qopqonlari`, traps: "Yillar va jang maydonlari nozik farqlari", bullets: 4, mins: 1 },
                    { id: 3, title: studySubject === 'Tarix' ? "O'zbek xonliklari va mustaqillik sari" : `${studySubject}: Test tahlili va formulalar`, traps: "Shaxslar va asarlar mualliflari", bullets: 3, mins: 1 },
                  ].map((topicItem, i) => (
                    <div key={topicItem.id} className="ps-card ps-lift relative flex flex-col overflow-hidden p-5 sm:p-6">
                      <div aria-hidden className={cn('absolute -right-10 -top-10 size-32 rounded-full opacity-20', ['bg-[var(--ps-purple)]', 'bg-[var(--ps-orange)]', 'bg-[var(--ps-green)]'][i % 3])} />
                      <div className="relative flex items-center justify-between">
                        <span className="rounded-full bg-[var(--ps-orange)] px-2.5 py-1 text-[11px] font-bold text-[#080808]">⚡ 60s shpargalka</span>
                        <span className="ps-num text-[30px] text-[var(--text-faint)] opacity-50">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="ps-display relative mt-4 line-clamp-2 text-[21px]">{topicItem.title}</h3>
                      <p className="relative mt-2 rounded-2xl bg-[var(--ps-coral)]/12 px-3 py-2 text-[12px] font-semibold text-[var(--ps-coral)]">
                        ⚠️ Qopqon: {topicItem.traps}
                      </p>
                      <div className="relative mt-auto flex items-center gap-2 pt-5">
                        <button type="button" onClick={() => setSelectedCheatTopic(topicItem)} className="ps-btn ps-btn-ink flex-1 justify-between">
                          Shpargalkani ko&apos;rish
                          <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                        </button>
                        <Link href="/sprint" aria-label="Sprint" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-primary)] transition-transform hover:-translate-y-0.5">
                          <Zap className="size-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shpargalka modali */}
                {selectedCheatTopic && (
                  <Dialog open={Boolean(selectedCheatTopic)} onOpenChange={() => setSelectedCheatTopic(null)}>
                    <DialogContent className="ps-shell ps-dialog max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                          <Zap className="size-4 text-[var(--ps-purple)]" />
                          <span>{selectedCheatTopic.title}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Imtihonda tushadigan eng muhim formulalar va qopqonlar
                        </DialogDescription>
                      </DialogHeader>

                      <TopicCheatSheetView
                        topicId={selectedCheatTopic.id}
                        topicTitle={selectedCheatTopic.title}
                        onStartSprint={() => {
                          setSelectedCheatTopic(null);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {/* ── 2-TAB: Fan o'yinlari va arena ── */}
            {activeTab === 'games' && (
              <div className="space-y-5">
                <div>
                  <p className="ps-eyebrow text-[var(--text-muted)]">O&apos;ynab o&apos;rganing</p>
                  <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">Fan o&apos;yinlari va <span className="text-[var(--ps-orange)]">arena</span></h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">O&apos;yin o&apos;ynab bilimni mustahkamlang, reytingda ko&apos;tariling va bonus XP yutib oling</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { title: 'Tarixiy xronologiya', desc: "Voqealarni to'g'ri vaqt tartibida terish", xp: '+50 XP', coins: '+20 🪙', href: '/games/timeline', icon: Clock, tone: 'bg-[var(--ps-orange)] text-[#080808]', dark: false },
                    { title: 'Tarixiy shaxslar', desc: 'Hukmdorlar va kashfiyotlar mosligi', xp: '+60 XP', coins: '+25 🪙', href: '/games/character', icon: Gamepad2, tone: 'bg-[var(--ps-purple)] text-white', dark: true },
                    { title: 'Xaritalar & hududlar', desc: 'Davlatlar chegaralari va geografiya', xp: '+45 XP', coins: '+15 🪙', href: '/games/map', icon: MapPin, tone: 'bg-[var(--ps-green)] text-white', dark: true },
                    { title: '1v1 Ghost Battle', desc: '60 soniyada tengdoshlaringiz bilan duel', xp: '+100 XP', coins: '+50 🪙', href: '/battles', icon: Swords, tone: 'bg-[var(--ps-coral)] text-white', dark: true },
                  ].map((game) => (
                    <Link
                      key={game.title}
                      href={game.href}
                      className={cn('group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-5 transition-transform hover:-translate-y-1 sm:p-6', game.tone)}
                    >
                      <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
                      <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-black/15">
                        <game.icon className="size-6" />
                      </span>
                      <span className="relative">
                        <span className="ps-display block text-[22px]">{game.title}</span>
                        <span className={cn('mt-1.5 block text-[12px] leading-relaxed', game.dark ? 'text-white/75' : 'text-black/65')}>{game.desc}</span>
                      </span>
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex gap-1.5">
                          <span className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-bold">{game.xp}</span>
                          <span className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-bold">{game.coins}</span>
                        </span>
                        <span className="flex size-10 items-center justify-center rounded-full bg-[#080808] text-[#FFFCF7] transition-transform group-hover:-rotate-45">
                          <ArrowRight className="size-4" />
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── 3-TAB: Audio, video va kitoblar ── */}
            {activeTab === 'library' && (
              <div className="space-y-5">
                <div>
                  <p className="ps-eyebrow text-[var(--text-muted)]">Kutubxona</p>
                  <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">Audio konspektlar va <span className="text-[var(--ps-blue)]">darsliklar</span></h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Kutubxona darsliklari, ekspert audio konspektlar va rasmiy BMB qo&apos;llanmalari</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { title: 'DTM & BMB rasmiy darsliklar', desc: "Maktab darsliklari va test savollariga asos bo'lgan barcha kitoblar PDF shaklida", href: '/library', cta: "Kutubxonaga o'tish", icon: BookOpen, tone: 'ps-ink', accent: 'bg-[var(--ps-blue)] text-[#080808]' },
                    { title: '5 daqiqalik audio konspektlar', desc: "Yo'lda yoki dam olayotganda mavzuni tezda takrorlash uchun audio darsliklar", href: '/study?tab=cheatsheets', cta: 'Audio darslarni tinglash', icon: Headphones, tone: '', accent: 'bg-[var(--ps-purple)] text-white' },
                    { title: 'Bilim Reels: 60s video darslar', desc: "Eng qiyin savollarning 60 soniyalik qisqa video tahlillari va sirlari", href: '/reels', cta: 'Reels tomosha qilish', icon: Flame, tone: '', accent: 'bg-[var(--ps-coral)] text-white' },
                  ].map((it) => (
                    <div key={it.title} className={cn('ps-card ps-lift relative flex flex-col overflow-hidden p-6', it.tone && `${it.tone} !border-0`)}>
                      <div aria-hidden className={cn('absolute -right-10 -top-10 size-32 rounded-full opacity-25', it.accent)} />
                      <span className={cn('relative inline-flex size-12 items-center justify-center rounded-2xl', it.accent)}>
                        <it.icon className="size-6" />
                      </span>
                      <h3 className="ps-display relative mt-5 text-[22px]">{it.title}</h3>
                      <p className={cn('relative mt-2 text-[13px] leading-relaxed', it.tone ? 'text-white/65' : 'text-[var(--text-muted)]')}>{it.desc}</p>
                      <Link href={it.href} className={cn('ps-btn relative mt-auto w-full justify-between', it.tone ? 'ps-btn-light' : 'ps-btn-ink', 'mt-6')}>
                        {it.cta}
                        <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 4-TAB: FOKUS XONASI (Faqat 'focus' tab tanlanganda ko'rinadi) ── */}
            {activeTab === 'focus' && (
              <div className="space-y-6">
            {/* ============================================================ */}
            {/* 🤖 AI MENTOR: BUGUN SIZ UCHUN TAVSIYA                        */}
            {/* ============================================================ */}
            <Card className="ps-card !border-0 p-5 sm:p-7">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-2xl">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot className="size-5" />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-[12px] font-semibold uppercase tracking-wider">
                        Natijalaringiz asosida
                      </span>
                      <Badge variant="secondary" className="text-[12px] font-mono bg-muted text-muted-foreground border-border">
                        Bugun siz uchun
                      </Badge>
                    </div>

                    <div className="border-l-2 border-primary pl-3 py-0.5 my-1">
                      {masteryLoading && !masteryData ? (
                        <p className="text-xs text-muted-foreground">Natijalaringiz yuklanmoqda...</p>
                      ) : masteryError && !masteryData ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-rose-500">Tavsiyalarni yuklab bo&apos;lmadi.</span>
                          <button type="button" onClick={() => refreshMastery()}
                                  className="font-semibold text-primary underline cursor-pointer">
                            Qayta urinish
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-[13px] text-foreground font-medium leading-relaxed">
                          {activeMission.aiReason}
                          {!missions.length && (
                            <Link href="/tests" className="ml-1 font-semibold text-primary underline">Testlarga o&apos;tish</Link>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-muted-foreground">
                      <span className="text-[12px] font-medium text-muted-foreground">
                        Tavsiya etilgan: <strong className="text-primary font-semibold">{activeMission.subject}</strong>
                      </span>
                      <span className="opacity-40">•</span>
                      <span className="text-[12px]">
                        O&apos;zlashtirish: <strong className="text-emerald-500 font-mono font-semibold">{activeMission.currentMastery !== null ? `${activeMission.currentMastery}%` : "ma'lumot yo'q"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Switch Subject presets */}
                <div className="flex flex-wrap items-center gap-1 self-start md:self-auto shrink-0 bg-muted/50 p-1.5 rounded-xl border border-border">
                  <span className="text-[12px] uppercase font-mono font-semibold text-muted-foreground px-2">Fanlar:</span>
                  {(missions.length ? missions : [FREE_FOCUS_MISSION]).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        soundFX.click();
                        pickedMissionRef.current = true;
                        setActiveMission(m);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                        activeMission.id === m.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                <Card className="ps-card !border-0 !rounded-[32px] p-6 sm:p-8">
                  {/* Header: Fan & Mavzu */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-primary flex items-center gap-1">
                          <Target className="size-3.5" /> BUGUNGI FOKUS MAQSADI
                        </span>
                        <Badge variant="outline" className="text-[12px] font-semibold border-primary/20 text-primary bg-primary/10">
                          {activeMission.subject}
                        </Badge>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                        {activeMission.topic}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-semibold text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1">
                        <Zap className="size-3.5 fill-amber-500" /> ≈ +{durationMinutes} XP
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(true)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title="To'liq ekran (Zen Mode)"
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Ikki ustunli Session Layout: Timer chapda, Vazifalar o'ngda */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
                    {/* Chap ustun: Digital Taymer & Tugmalar (Col 6) */}
                    <div className="md:col-span-6 flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl bg-muted/30 border border-border text-center space-y-4">
                      
                      {/* Pomodoro presets */}
                      <div className="flex items-center justify-center gap-1.5 p-1 rounded-lg bg-card border border-border shadow-xs">
                        {[15, 25, 50].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => changeDurationPreset(mins)}
                            className={cn(
                              "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                              durationMinutes === mins
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                            className="stroke-muted fill-none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50" cy="50" r="42"
                            className="stroke-primary fill-none transition-all duration-500 stroke-linecap-round"
                            strokeWidth="6"
                            strokeDasharray="263.89"
                            strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                          <span className="font-mono text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                            {formatTime(timeLeft)}
                          </span>
                          <span className="text-[12px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">
                            FOKUS JARAYONI
                          </span>
                          {isRunning && (
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                              <Flame className="size-3 text-amber-500 animate-pulse fill-amber-500" /> Davom etmoqda
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
                            "flex-1 h-11 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs gap-2 cursor-pointer",
                            isRunning
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          )}
                        >
                          {isRunning ? (
                            <>
                              <Pause className="size-4 fill-current" /> Pauza
                            </>
                          ) : (
                            <>
                              <Play className="size-4 fill-current" /> Boshlash
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={resetTimer}
                          size="icon"
                          variant="outline"
                          className="size-11 rounded-lg border-border bg-card hover:bg-muted text-foreground shrink-0 shadow-xs cursor-pointer"
                          title="Qayta o'rnatish"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* O'ng ustun: BUGUNGI MISSIYA CHECKLIST (Col 6) */}
                    <div className="md:col-span-6 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                          BUGUNGI MISSIYA
                        </h4>
                        <span className="text-xs font-semibold text-foreground">
                          {activeMission.tasks.filter((t) => t.completed).length} / {activeMission.tasks.length} bajarildi
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {activeMission.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "p-3 rounded-xl border transition-colors flex items-center justify-between gap-2 text-xs",
                              task.completed
                                ? "bg-muted/40 border-border text-muted-foreground"
                                : "bg-card border-border hover:border-primary/40 text-foreground shadow-xs"
                            )}
                          >
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                            >
                              <div className={cn(
                                "size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                task.completed
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border hover:border-primary"
                              )}>
                                {task.completed && <CheckCircle2 className="size-3.5" />}
                              </div>
                              <span className={cn("font-medium truncate", task.completed && "line-through text-muted-foreground")}>
                                {task.label}
                              </span>
                            </button>

                            {task.total && (
                              <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                                <button
                                  onClick={() => incrementTaskCounter(task.id, -1)}
                                  className="size-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-bold cursor-pointer"
                                  title="Kamaytirish"
                                >
                                  -
                                </button>
                                <span className="font-semibold px-1 text-foreground">{task.current} / {task.total}</span>
                                <button
                                  onClick={() => incrementTaskCounter(task.id, 1)}
                                  className="size-6 rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-bold cursor-pointer"
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
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          🎁 Sessiya Mukofoti:
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          ≈ +{durationMinutes} XP (server hisoblaydi, kuniga 6 ta sessiya)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 🎧 FOKUS MUHITI (AMBIENT SOUND MIXER) */}
                <Card className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] p-5 shadow-sm space-y-4">
                  {/* Header: Title + Realtime Master Volume Slayderi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-card)]">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={Headphones} tone="emerald" size="sm" glow />
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          🎧 Fokus Muhiti (Ambient Fon Tovushlari)
                        </h4>
                        <p className="text-[12px] text-muted-foreground">
                          Miyani tinchlantiruvchi va diqqatni jamlovchi tabiiy tovushlar
                        </p>
                      </div>
                    </div>

                    {/* Mikser: Doimiy ko'rinib turuvchi ovoz slayderi */}
                    <div className="flex items-center gap-2.5 bg-[var(--surface-input)] px-3 py-1.5 rounded-2xl border border-[var(--border-card)] shrink-0 self-start sm:self-auto">
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
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                              : "bg-[var(--surface-input)] border-[var(--border-card)] hover:border-[var(--border-strong)] text-foreground hover:bg-[var(--surface-hover)]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <PremiumIcon icon={Icon} tone={isActive ? "emerald" : "zinc"} size="xs" glow={isActive} />
                            {isActive && (
                              <span className="flex items-center gap-0.5">
                                <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold block truncate">{snd.name}</span>
                          <span className={cn("text-[12px] block truncate mt-0.5", isActive ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            {isActive ? '🔊 Yangramoqda' : 'Yoqish'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeSound && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="italic text-[12px]">Hozir faol: <strong className="text-foreground">{currentAmbient?.name}</strong></span>
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
                <Card className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={Flame} tone="amber" size="sm" glow />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 font-mono">
                        FOCUS STREAK
                      </h3>
                    </div>
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-500 font-mono text-xs font-bold">
                      Streak
                    </Badge>
                  </div>

                  <div className="text-center py-2 space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold text-foreground font-mono flex items-center justify-center gap-2">
                      <Flame className="size-7 text-orange-500 fill-orange-500" />
                      <span>{currentStreak} KUN</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uzluksiz kunlik dars odati
                    </p>
                  </div>

                  {/* Haftalik Nuqtalar: Du Se Ch Pa Ju Sh Ya */}
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-input)] border border-[var(--border-card)]">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEK_DAYS.map((day, idx) => {
                        // Streak oynasi: bugundan oldingi `currentStreak` kun (streak asosida).
                        const isDone = idx < todayDayIndex && todayDayIndex - idx <= currentStreak;
                        const isToday = idx === todayDayIndex;
                        return (
                          <div key={day} className="flex flex-col items-center space-y-1.5">
                            <span className="text-[12px] font-mono font-bold text-muted-foreground">
                              {day}
                            </span>
                            <div className={cn(
                              "size-6 rounded-full flex items-center justify-center text-xs transition-all",
                              isDone
                                ? "bg-amber-500 text-white font-bold shadow-xs shadow-amber-500/30"
                                : isToday
                                ? "border-2 border-dashed border-orange-500 bg-orange-500/20 text-orange-500 font-bold animate-pulse"
                                : "bg-[var(--surface-hover)] text-muted-foreground/60 border border-[var(--border-card)]"
                            )}>
                              {isDone ? '●' : isToday ? '○' : '·'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bugungi fokus maqsadi mini progress bar */}
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-input)] border border-[var(--border-card)] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground flex items-center gap-1.5">
                        <Target className="size-3.5 text-orange-500" />
                        <span>Bugungi Maqsad</span>
                      </span>
                      <span className="font-mono text-orange-500 font-bold">
                        25 / 50 daq (50%)
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-700"
                        style={{ width: '50%' }}
                      />
                    </div>
                    <p className="text-[12px] text-muted-foreground flex items-center justify-between">
                      <span>🎯 Yana 1 ta Pomodoro qoldi</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">+25 XP</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs">
                    <span className="text-muted-foreground block text-[12px]">Bugun sessiyani yakunlab uzluksizlikni saqlang:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 inline-block">
                      Bugun davom ettiring: +25 XP
                    </strong>
                  </div>
                </Card>

                {/* Tezkor navigatsiya kartalari with Pulsing Notification Badges */}
                <Card className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PremiumIcon icon={BookOpen} tone="indigo" size="sm" glow />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        O&apos;quv Qurollari
                      </h4>
                    </div>
                    <span className="flex items-center gap-1 text-[12px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
                      <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Yangiliklar</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href="/tests"
                      className="p-3 rounded-2xl bg-[var(--surface-input)] border border-[var(--border-card)] hover:border-teal-500/40 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Brain} tone="emerald" size="xs" />
                        <span>Amaliy Mashqlar Banki</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[12px] font-mono font-bold">
                          +15 yangi
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>

                    <Link
                      href="/flashcards"
                      className="p-3 rounded-2xl bg-[var(--surface-input)] border border-[var(--border-card)] hover:border-amber-500/40 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Layers} tone="amber" size="xs" />
                        <span>Quick Learn Flashcards</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[12px] font-mono font-bold">
                          8 ta takrorlash
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>

                    <Link
                      href="/reels"
                      className="p-3 rounded-2xl bg-[var(--surface-input)] border border-[var(--border-card)] hover:border-rose-500/40 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between text-xs font-bold group"
                    >
                      <span className="flex items-center gap-2.5">
                        <PremiumIcon icon={Sparkles} tone="rose" size="xs" />
                        <span>Bilim Reels Videolari</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[12px] font-mono font-bold flex items-center gap-1">
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
              </div>
            )}
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
            <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
              MISSIYA BAJARILDI!
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Fokus sessiyasi yakunlandi. Mukofot server o&apos;lchagan vaqt bo&apos;yicha hisoblanadi.
            </DialogDescription>
          </DialogHeader>

          {completedStats && (
            <div className="space-y-3">
              {/* Rewards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <span className="text-[12px] uppercase font-bold text-amber-500 block">Mukofot</span>
                  <span className="text-xl font-bold text-amber-500 font-mono">
                    +{completedStats.xpEarned} XP
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                  <span className="text-[12px] uppercase font-bold text-rose-500 block">Focus Streak</span>
                  <span className="text-xl font-bold text-rose-500 font-mono">
                    🔥 {completedStats.streak} kun
                  </span>
                </div>
              </div>

              {/* O'zlashtirish fokus sessiyasidan emas, test natijalaridan hisoblanadi —
                  ilgari bu yerda har sessiyadan keyin soxta "+3% mastery" ko'rsatilardi. */}
              <p className="p-3 rounded-2xl bg-card border border-border/80 text-left text-xs text-muted-foreground">
                🧠 {completedStats.subject}: o&apos;zlashtirish test natijalaringizdan hisoblanadi — o&apos;sishni ko&apos;rish uchun shu fandan test yeching.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button asChild size="lg" className="w-full rounded-2xl font-bold text-xs gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md">
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
