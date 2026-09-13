'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, Award, Bell, ArrowRight, ShieldCheck, CheckCircle2,
  AlertCircle, Share2, HelpCircle, FileText, ChevronLeft,
  Flame, Sparkles, Check, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import BrandLoader from '@/components/BrandLoader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MockLobbyData = {
  id: number;
  title: string;
  description: string;
  subject: string;
  subject_slug: string;
  category: string;
  duration_minutes: number;
  questions_count: number;
  is_live_mock: boolean;
  scheduled_at: string | null;
  server_now: string;
  is_reminded: boolean;
  has_active_attempt: boolean;
  active_attempt_id: number | null;
  has_completed: boolean;
  completed_attempt_id: number | null;
  completed_score: number | null;
};

type GradingItem = {
  score: string;
  percent?: string;
  grade: string;
  label: string;
  tone: string;
};

const MILLIY_GRADING_SCALE: GradingItem[] = [
  { score: '86 – 100 ball', percent: '86 – 100%', grade: 'A+', label: "Oltin (Maksimal)", tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { score: '70 – 85.9 ball', percent: '70 – 85.9%', grade: 'A', label: "A'lo daraja", tone: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { score: '60 – 69.9 ball', percent: '60 – 69.9%', grade: 'B+', label: 'Juda yaxshi', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { score: '50 – 59.9 ball', percent: '50 – 59.9%', grade: 'B', label: 'Yaxshi natija', tone: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { score: '46 – 49.9 ball', percent: '46 – 49.9%', grade: 'C+', label: "Qoniqarli", tone: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { score: '40 – 45.9 ball', percent: '40 – 45.9%', grade: 'C', label: "O'tish darajasi", tone: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { score: '0 – 39.9 ball', percent: '0 – 39.9%', grade: '—', label: 'Sertifikatsiz', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

const CEFR_GRADING_SCALE: GradingItem[] = [
  { score: '65 – 75 ball', percent: '86 – 100%', grade: 'C1', label: "Ilg'or (Advanced)", tone: 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  { score: '50 – 64.9 ball', percent: '67 – 85.9%', grade: 'B2', label: "Mustaqil (OTM Imtiyoz)", tone: 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  { score: '35 – 49.9 ball', percent: '47 – 66.9%', grade: 'B1', label: "Ostonaviy (Threshold)", tone: 'border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-300' },
  { score: '20 – 34.9 ball', percent: '27 – 46.9%', grade: 'A2', label: "Boshlang'ich (Waystage)", tone: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  { score: '0 – 19.9 ball', percent: '0 – 26.9%', grade: '—', label: 'Sertifikat berilmaydi', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

function getScheduledClock(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (match) {
      return `${match[4]}:${match[5]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  } catch {
    // ignore
  }
  return '';
}

function formatScheduledTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    let year: number, month: number, day: number, hour: number, minute: number;

    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
      hour = parseInt(match[4], 10);
      minute = parseInt(match[5], 10);
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
      hour = d.getHours();
      minute = d.getMinutes();
    }

    const now = new Date();
    const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.getFullYear() === year && tomorrow.getMonth() === month && tomorrow.getDate() === day;

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    if (isToday) {
      return `Bugun soat ${timeStr}`;
    }
    if (isTomorrow) {
      return `Ertaga soat ${timeStr}`;
    }
    const d = new Date(year, month, day, hour, minute);
    const dateFormatted = d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    return `${dateFormatted}, soat ${timeStr}`;
  } catch {
    return '';
  }
}

export default function MockLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access, authReady } = useAuthStore();

  const [data, setData] = useState<MockLobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(false);
  const [togglingReminder, setTogglingReminder] = useState(false);
  const [starting, setStarting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Load Lobby Data
  useEffect(() => {
    if (authReady && !access) {
      router.replace(`/register?next=${encodeURIComponent(`/tests/mock/${id}`)}`);
      return;
    }
    if (!access) return;
    apiFetch<MockLobbyData>(`/api/tests/${id}/lobby/`)
      .then((res) => {
        setData(res);
        setReminded(res.is_reminded);

        if (res.scheduled_at) {
          const target = new Date(res.scheduled_at).getTime();
          const serverNow = new Date(res.server_now).getTime();
          const diff = Math.max(0, Math.floor((target - serverNow) / 1000));
          setSecondsLeft(diff);
        } else {
          setSecondsLeft(0);
        }
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik yuz berdi');
        setLoading(false);
      });
  }, [id, access]);

  // Live countdown timer
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Reminder toggle
  async function toggleReminder() {
    setTogglingReminder(true);
    try {
      const res = await apiFetch<{ reminded: boolean; message: string }>(`/api/tests/${id}/remind/`, {
        method: 'POST',
      });
      setReminded(res.reminded);
      if (res.reminded) {
        toast.success("Eslatma yoqildi! Imtihon boshlanganda Telegramingizga xabar yuboriladi.");
      } else {
        toast.info("Eslatma bekor qilindi.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setTogglingReminder(false);
    }
  }

  // Start test
  async function startTest() {
    setStarting(true);
    try {
      const res = await apiFetch<{ attempt_id: number; mode?: string; completed?: boolean }>(
        `/api/tests/${id}/start/`,
        { method: 'POST' }
      );
      if (res.completed) {
        router.push(`/tests/${res.attempt_id}/feedback`);
        return;
      }
      router.push(res.mode === 'cefr' ? `/tests/${res.attempt_id}/exam` : `/tests/${res.attempt_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Testni boshlab bo\'lmadi');
      setStarting(false);
    }
  }

  function copyShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Mock imtihon havolasi nusxalandi!");
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <>
        <AppShell />
        <div className="flex min-h-[60vh] items-center justify-center">
          <BrandLoader />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <div className="mx-auto max-w-xl py-20 text-center">
          <AlertCircle className="mx-auto size-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-bold">Mock imtihon topilmadi</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bu imtihon hali nashr etilmagan yoki muddati o&apos;tgan bo&apos;lishi mumkin.</p>
          <Button asChild className="mt-6">
            <Link href="/tests">Testlar ro&apos;yxatiga qaytish</Link>
          </Button>
        </div>
      </>
    );
  }

  // Calculate formatted countdown units
  const days = secondsLeft ? Math.floor(secondsLeft / 86400) : 0;
  const hours = secondsLeft ? Math.floor((secondsLeft % 86400) / 3600) : 0;
  const minutes = secondsLeft ? Math.floor((secondsLeft % 3600) / 60) : 0;
  const seconds = secondsLeft ? secondsLeft % 60 : 0;

  const isLiveNow = secondsLeft === 0;
  const isCefr =
    data.category === 'cefr' ||
    data.subject_slug === 'cefr' ||
    data.subject_slug === 'ingliz-tili' ||
    Boolean(data.title?.toLowerCase().includes('cefr'));
  const gradingScale = isCefr ? CEFR_GRADING_SCALE : MILLIY_GRADING_SCALE;
  const scheduledClock = getScheduledClock(data.scheduled_at);

  return (
    <>
      <AppShell />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 pt-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/tests">
              <ChevronLeft className="size-4" /> Barcha testlar
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={copyShareLink}
            className="gap-1.5 text-xs rounded-xl border-[var(--border-strong)]"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
            {copied ? 'Nusxalandi!' : 'Ulashish'}
          </Button>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          
          {/* =========================================================
              LEFT / MAIN COLUMN (Hero + Countdown + Rules)
              ========================================================= */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card-medium)] via-[var(--surface-card-soft)] to-amber-500/[0.04] p-6 sm:p-8 shadow-xl">
                {/* Decorative background ambient glows */}
                <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-sky-500/10 blur-3xl" />

                <div className="relative z-10 space-y-6">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 gap-1.5 px-3 py-1 font-bold text-xs">
                      <Flame className="size-3.5 text-amber-500 animate-pulse" /> Jonli Mock Imtihon
                    </Badge>
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400 font-semibold text-xs">
                      {data.subject}
                    </Badge>
                    <Badge variant="outline" className={isCefr ? "border-violet-500/30 bg-violet-500/10 text-violet-400 font-semibold text-xs" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-xs"}>
                      {isCefr ? 'CEFR / Multi-Level' : 'Milliy Sertifikat'}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-foreground leading-tight">
                      {data.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                      {data.description || (isCefr ? "Rasmiy CEFR (BMB Multi-Level) formati bo'yicha katta sinov imtihoni. Barcha o'quvchilar bir vaqtda topshiradi." : "Rasmiy Milliy Sertifikat formati bo'yicha katta sinov imtihoni. Barcha o'quvchilar bir vaqtda topshiradi.")}
                    </p>
                  </div>

                  {/* 3 Quick Stat Cards */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-3 sm:p-3.5 text-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Savollar</span>
                      <span className="text-sm sm:text-lg font-black text-foreground mt-0.5 block">{data.questions_count || (isCefr ? 73 : 45)} ta</span>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-3 sm:p-3.5 text-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Vaqt</span>
                      <span className="text-sm sm:text-lg font-black text-foreground mt-0.5 block">{data.duration_minutes || (isCefr ? 150 : 90)} daqiqa</span>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-3 sm:p-3.5 text-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Baholash</span>
                      <span className={`text-sm sm:text-lg font-black mt-0.5 block ${isCefr ? 'text-violet-500 dark:text-violet-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        {isCefr ? 'C1 dan A2' : 'A+ dan C+'}
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions Section */}
                  {data.has_completed ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
                        <div>
                          <h4 className="font-bold text-foreground text-sm sm:text-base">Siz ushbu mock imtihonni topshirgansiz</h4>
                          <p className="text-xs text-muted-foreground">Natijangiz: <strong className="text-emerald-400 font-mono text-sm">{data.completed_score?.toFixed(0)}%</strong></p>
                        </div>
                      </div>
                      <Button asChild className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link href={`/tests/${data.completed_attempt_id}/feedback`}>
                          Natijalar va Tahlilni ko&apos;rish <ArrowRight className="size-4 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  ) : isLiveNow || data.has_active_attempt ? (
                    <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex size-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                            {data.has_active_attempt ? "Imtihoningiz davom etmoqda" : "Imtihon ochiq — Hoziroq boshlang!"}
                          </span>
                        </div>
                        <Badge className="bg-emerald-500 text-white font-bold text-xs">JONLI EFIR</Badge>
                      </div>

                      <Button
                        size="lg"
                        onClick={startTest}
                        disabled={starting}
                        className="w-full rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25 h-14"
                      >
                        {starting ? 'Boshlanmoqda...' : data.has_active_attempt ? 'Davom ettirish 🚀' : 'Imtihonni boshlash 🚀'}
                        <ArrowRight className="size-5 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-card)]/90 p-5 sm:p-6 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-amber-500" /> Boshlanishiga qoldi:
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {data.scheduled_at ? formatScheduledTime(data.scheduled_at) : 'Tez kunda'}
                        </span>
                      </div>

                      {/* High-Tech Countdown Display */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[
                          { label: 'Kun', val: days },
                          { label: 'Soat', val: hours },
                          { label: 'Daqiqa', val: minutes },
                          { label: 'Soniya', val: seconds },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/70 p-3 sm:p-4 shadow-sm">
                            <span className="text-2xl sm:text-4xl font-black tabular-nums font-mono text-foreground tracking-tight">
                              {String(item.val).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase mt-1">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Reminder Action Button */}
                      <div className="pt-1">
                        <Button
                          variant={reminded ? 'outline' : 'default'}
                          size="lg"
                          onClick={toggleReminder}
                          disabled={togglingReminder}
                          className={cn(
                            "w-full rounded-2xl font-bold text-xs sm:text-sm shadow-md min-h-12 h-auto py-3 px-4 whitespace-normal text-center leading-snug transition-all",
                            reminded
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                        >
                          {reminded ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="size-4 sm:size-5 text-emerald-400 shrink-0" />
                              <span>Telegram eslatma yoqilgan {scheduledClock ? `(${scheduledClock} da xabar boradi)` : ''}</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Bell className="size-4 sm:size-5 animate-wiggle shrink-0 text-amber-400" />
                              <span>Menga Telegramdan eslatish</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </Reveal>

            {/* Imtihon Qoidalari va Yo'riqnoma */}
            <Reveal delay={0.1}>
              <Card className="border-[var(--border-card)] bg-[var(--surface-card-soft)]/90 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                    <FileText className="size-4 text-sky-500" /> Imtihon Qoidalari va Muhim Eslatmalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3">
                    <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Bir martalik kirish:</b> Imtihon boshlangandan keyin taymer orqaga sanaydi. Sahifani yangilasangiz ham, berilgan {data.duration_minutes} daqiqalik vaqt to&apos;xtamaydi.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Avtomatik saqlash:</b> Har bir savolga belgilangan javob avtomatik tarzda tizimga saqlanib boradi.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3">
                    <Award className="size-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Natijalar va Sertifikat:</b> Imtihonni topshirganingizdan so&apos;ng darhol natijangiz, to&apos;plagan ballingiz, xatolar tahlili va sertifikat taqdim etiladi.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          {/* =========================================================
              RIGHT / SIDEBAR COLUMN (Grading Scale & Telegram Info)
              ========================================================= */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 lg:sticky lg:top-20">
            
            {/* Baholash Mezonlari Card */}
            <Reveal delay={0.15}>
              <Card className="border-[var(--border-card)] bg-[var(--surface-card-medium)] shadow-xl overflow-hidden">
                <CardHeader className="border-b border-[var(--border-card)] bg-[var(--surface-hover)]/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-xl shrink-0 ${isCefr ? 'bg-violet-500/15 text-violet-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">Baholash Mezonlari</CardTitle>
                      <p className="text-[11px] text-muted-foreground">
                        {isCefr ? "CEFR B2-C1 ballari bo'yicha darajalar taqsimoti" : "To'plangan ballar bo'yicha darajalar taqsimoti"}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Table Header Row */}
                  <div className="grid grid-cols-12 items-center bg-[var(--surface-hover)]/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-[var(--border-card)]">
                    <div className="col-span-5">{isCefr ? "To'plangan ball" : "Ball oralig'i"}</div>
                    <div className="col-span-4">Daraja</div>
                    <div className="col-span-3 text-right">Sertifikat</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-[var(--border-card)]">
                    {gradingScale.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 items-center px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]/30 text-xs"
                      >
                        {/* Range Column */}
                        <div className="col-span-5 pr-2">
                          <div className="font-mono font-bold text-foreground text-xs leading-snug">
                            {item.score}
                          </div>
                          {item.percent && (
                            <div className="text-[10px] font-mono text-muted-foreground leading-tight mt-0.5">
                              {item.percent}
                            </div>
                          )}
                        </div>

                        {/* Label Column */}
                        <div className="col-span-4 text-left text-muted-foreground font-medium text-xs leading-tight pr-1">
                          {item.label}
                        </div>

                        {/* Badge Column (Aligned right) */}
                        <div className="col-span-3 text-right">
                          <span className={`inline-flex items-center justify-center min-w-[38px] px-2 py-1 rounded-md text-xs font-black border ${item.tone}`}>
                            {item.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            {/* Telegram Info Card */}
            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-[var(--surface-card-soft)] to-transparent p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm">
                  <Send className="size-4" /> Telegram Bot xabarnomasi
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Eslatmani yoqqan bo&apos;lsangiz, {scheduledClock ? <>soat <b>{scheduledClock}</b> da</> : 'imtihon boshlanishi bilan'} Telegram botimiz sizga to&apos;g&apos;ridan-to&apos;g&apos;ri imtihon boshlanganligi haqida xabar va bevosita testga o&apos;tish tugmasini yuboradi.
                </p>
              </div>
            </Reveal>

          </div>

        </div>
      </main>
    </>
  );
}
