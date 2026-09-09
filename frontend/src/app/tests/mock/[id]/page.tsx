'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, Award, Bell, BellOff, ArrowRight, ShieldCheck, CheckCircle2,
  AlertCircle, Share2, Sparkles, HelpCircle, FileText, ChevronLeft,
  Flame, Lock
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
import { Separator } from '@/components/ui/separator';

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

const GRADING_SCALE = [
  { range: '34 – 45 ta', grade: 'A+', label: 'Eng yuqori (A\'lo)', tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { range: '28 – 33 ta', grade: 'A', label: 'A\'lo natija', tone: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { range: '24 – 27 ta', grade: 'B+', label: 'Juda yaxshi', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { range: '21 – 23 ta', grade: 'B', label: 'Yaxshi natija', tone: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { range: '18 – 20 ta', grade: 'C+', label: 'Qoniqarli (O\'tish)', tone: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { range: '0 – 17 ta', grade: '—', label: 'Sertifikat berilmaydi', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

export default function MockLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access, user } = useAuthStore();

  const [data, setData] = useState<MockLobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(false);
  const [togglingReminder, setTogglingReminder] = useState(false);
  const [starting, setStarting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Load Lobby Data
  useEffect(() => {
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
        toast.success("Eslatma yoqildi! Imtihon boshlanganda Telegramingizga xabar yuboramiz.");
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
    toast.success("Mock imtihon havolasi nusxalandi!");
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

  return (
    <>
      <AppShell />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-20 pt-4">
        {/* Navigation */}
        <div>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
            <Link href="/tests">
              <ChevronLeft className="size-4" /> Barcha testlar
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-hover)] to-[var(--tone-growth-soft)]/20 p-6 shadow-xl sm:p-10">
            <div className="relative z-10 space-y-6 text-center">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 px-3 py-1 font-semibold">
                  <Flame className="size-4 text-amber-500 animate-pulse" /> Katta Mock Imtihon
                </Badge>
                <Badge variant="outline" className="gap-1 border-[var(--border-strong)] font-medium">
                  {data.subject}
                </Badge>
                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  Milliy Sertifikat Formati
                </Badge>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                  {data.title}
                </h1>
                <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground">
                  {data.description || "Rasmiy Milliy Sertifikat formati bo'yicha katta sinov imtihoni. Barcha o'quvchilar bir vaqtda topshiradi."}
                </p>
              </div>

              {/* Live or Countdown Block */}
              {isLiveNow ? (
                <div className="space-y-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center shadow-lg">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 animate-pulse">
                    <span className="size-2 rounded-full bg-emerald-500" /> Imtihon boshlandi!
                  </div>
                  <h3 className="text-xl font-black text-foreground sm:text-2xl">
                    Hozir topshirish oynasi ochiq!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sizda to&apos;liq {data.duration_minutes} daqiqa vaqt bo&apos;ladi. O&apos;z bilimingizni sinab, rasmiy sertifikat oling.
                  </p>

                  <div className="pt-2">
                    {data.has_completed ? (
                      <div className="space-y-3">
                        <Badge className="bg-emerald-500 text-white px-3 py-1 text-sm font-semibold">
                          Siz imtihonni topshirdingiz ({data.completed_score?.toFixed(0)}%)
                        </Badge>
                        <div>
                          <Button size="lg" asChild className="rounded-xl font-bold shadow-lg">
                            <Link href={`/tests/${data.completed_attempt_id}/feedback`}>
                              Natijalarni ko&apos;rish <ArrowRight className="ml-2 size-5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : data.has_active_attempt ? (
                      <Button size="lg" onClick={startTest} disabled={starting} className="rounded-xl px-8 font-black text-base shadow-xl bg-amber-500 hover:bg-amber-600 text-white">
                        {starting ? 'Kirilmoqda...' : 'Imtihonni davom ettirish'} <ArrowRight className="ml-2 size-5" />
                      </Button>
                    ) : (
                      <Button size="lg" onClick={startTest} disabled={starting} className="rounded-xl px-10 font-black text-base shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce">
                        {starting ? 'Kirilmoqda...' : '🚀 Imtihonni boshlash'} <ArrowRight className="ml-2 size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-card)]/80 p-6 backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Boshlanishiga qoldi:
                    </span>
                  </div>

                  {/* Countdown Cards */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
                    {[
                      { label: 'Kun', val: days },
                      { label: 'Soat', val: hours },
                      { label: 'Daqiqa', val: minutes },
                      { label: 'Soniya', val: seconds },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)] p-3 sm:p-4 shadow-sm">
                        <span className="text-2xl sm:text-4xl font-black tabular-nums text-foreground tracking-tight">
                          {String(item.val).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase mt-1">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action: Telegram Reminder & Share */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      variant={reminded ? 'secondary' : 'default'}
                      size="lg"
                      onClick={toggleReminder}
                      disabled={togglingReminder}
                      className="rounded-xl font-bold gap-2 shadow-md"
                    >
                      {reminded ? (
                        <>
                          <CheckCircle2 className="size-5 text-emerald-500" />
                          Telegram eslatma yoqilgan
                        </>
                      ) : (
                        <>
                          <Bell className="size-5 animate-wiggle" />
                          Menga Telegramdan eslatish
                        </>
                      )}
                    </Button>

                    <Button variant="outline" size="lg" onClick={copyShareLink} className="rounded-xl gap-2">
                      <Share2 className="size-4" /> Havolani ulashish
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Spec Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)] p-3.5 shadow-sm">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                    <HelpCircle className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Savollar soni</div>
                    <div className="text-sm font-bold text-foreground">{data.questions_count || 45} ta savol</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)] p-3.5 shadow-sm">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Ajratilgan vaqt</div>
                    <div className="text-sm font-bold text-foreground">{data.duration_minutes || 90} daqiqa</div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)] p-3.5 shadow-sm">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Award className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Sertifikat</div>
                    <div className="text-sm font-bold text-foreground">Rasmiy Darajalar</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Official Grading Scale Section */}
        <Reveal delay={0.1}>
          <Card className="border-[var(--border-card)] shadow-lg overflow-hidden">
            <CardHeader className="border-b border-[var(--border-card)] bg-[var(--surface-hover)]/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Milliy Sertifikat Baholash Mezonlari</CardTitle>
                  <p className="text-xs text-muted-foreground">To&apos;plangan to&apos;g&apos;ri javoblar soni bo&apos;yicha darajalar taqsimoti</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border-card)]">
                {GRADING_SCALE.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 transition-colors hover:bg-[var(--surface-hover)]/30">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-foreground">{item.range}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline-block">to&apos;g&apos;ri javob</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                      <span className={`inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-md text-xs font-black border ${item.tone}`}>
                        {item.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Rules & Guidelines */}
        <Reveal delay={0.2}>
          <Card className="border-[var(--border-card)] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-sky-500" /> Imtihon Qoidalari va Muhim Eslatmalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>• <b>Bir martalik kirish:</b> Imtihon boshlangandan keyin taymer orqaga sanaydi. Sahifani yangilasangiz yoki chiqib ketsangiz ham, berilgan {data.duration_minutes} daqiqalik vaqt to&apos;xtamaydi.</p>
              <p>• <b>Javoblarni tasdiqlash:</b> Har bir savolga belgilangan javob avtomatik tarzda tizimga saqlanib boradi.</p>
              <p>• <b>Natijalar va Sertifikat:</b> Imtihonni topshirganingizdan so&apos;ng darhol natijangiz, to&apos;plagan ballingiz, xatolar tahlili va sertifikat taqdim etiladi.</p>
            </CardContent>
          </Card>
        </Reveal>
      </main>
    </>
  );
}
