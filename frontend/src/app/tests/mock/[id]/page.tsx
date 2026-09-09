'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, Award, Bell, ArrowRight, ShieldCheck, CheckCircle2,
  AlertCircle, Share2, HelpCircle, FileText, ChevronLeft,
  Flame
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
  const { access } = useAuthStore();

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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 pt-6">
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/tests">
              <ChevronLeft className="size-4" /> Barcha testlar
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5 text-xs">
            <Share2 className="size-3.5" /> Ulashish
          </Button>
        </div>

        {/* 2-Column Responsive Layout for Desktop / Single Column for Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Column: Hero + Countdown + Rules (Left 7 cols on Desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card-medium)] via-[var(--surface-card-soft)] to-amber-500/5 p-6 sm:p-10 shadow-2xl">
                {/* Decorative background glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-sky-500/10 blur-3xl" />

                <div className="relative z-10 space-y-6">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
                      <Flame className="size-4 text-amber-500 animate-pulse" /> Katta Jonli Mock Imtihon
                    </Badge>
                    <Badge variant="outline" className="border-[var(--border-strong)] font-medium text-xs">
                      {data.subject}
                    </Badge>
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300 text-xs">
                      Milliy Sertifikat Formati
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-3">
                    <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-foreground leading-tight">
                      {data.title}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {data.description || "Rasmiy Milliy Sertifikat formati bo'yicha katta sinov imtihoni. Barcha o'quvchilar bir vaqtda topshiradi."}
                    </p>
                  </div>

                  {/* Live or Countdown Block */}
                  {isLiveNow ? (
                    <div className="space-y-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8 text-center shadow-lg">
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 animate-pulse">
                        <span className="size-2 rounded-full bg-emerald-500" /> Imtihon boshlandi!
                      </div>
                      <h3 className="text-xl font-black text-foreground sm:text-2xl">
                        Hozir topshirish oynasi ochiq!
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                        Sizda to&apos;liq {data.duration_minutes} daqiqa vaqt bo&apos;ladi. O&apos;z bilimingizni sinab, rasmiy sertifikat darajangizni oling.
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
                    <div className="space-y-6 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-card)]/80 p-6 sm:p-8 backdrop-blur-md shadow-inner">
                      <div className="text-center sm:text-left">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Imtihon boshlanishiga qoldi:
                        </span>
                      </div>

                      {/* Countdown Cards */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-xl mx-auto">
                        {[
                          { label: 'Kun', val: days },
                          { label: 'Soat', val: hours },
                          { label: 'Daqiqa', val: minutes },
                          { label: 'Soniya', val: seconds },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/70 p-3 sm:p-5 shadow-sm">
                            <span className="text-2xl sm:text-4xl xl:text-5xl font-black tabular-nums text-foreground tracking-tight">
                              {String(item.val).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase mt-1">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action: Telegram Reminder & Share */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                        <Button
                          variant={reminded ? 'secondary' : 'default'}
                          size="lg"
                          onClick={toggleReminder}
                          disabled={togglingReminder}
                          className="rounded-xl font-bold gap-2 shadow-md px-6"
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

                  {/* Quick Spec Pills (3 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)]/60 p-3.5 shadow-sm">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                        <HelpCircle className="size-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Savollar soni</div>
                        <div className="text-sm font-bold text-foreground">{data.questions_count || 45} ta savol</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)]/60 p-3.5 shadow-sm">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                        <Clock className="size-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Ajratilgan vaqt</div>
                        <div className="text-sm font-bold text-foreground">{data.duration_minutes || 90} daqiqa</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)]/60 p-3.5 shadow-sm">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
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

            {/* Imtihon Qoidalari va Muhim Yo'riqnoma */}
            <Reveal delay={0.1}>
              <Card className="border-[var(--border-card)] bg-[var(--surface-card-soft)]/90 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <FileText className="size-4 text-sky-500" /> Imtihon Qoidalari va Muhim Yo&apos;riqnoma
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3.5">
                    <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Bir martalik topshirish:</b> Imtihon boshlangandan keyin umumiy {data.duration_minutes} daqiqa vaqt beriladi. Sahifani yangilasangiz yoki brauzerdan vaqtincha chiqib ketsangiz ham taymer to&apos;xtamaydi.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3.5">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Avtomatik saqlash:</b> Har bir belgilagan javobingiz darhol tizimga saqlanadi. Internet aloqasi vaqtincha sekinlashsa ham javoblaringiz yo&apos;qolmaydi.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-3.5">
                    <Award className="size-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-foreground font-semibold">Tezkor Natija va Sertifikat:</b> Testni yakunlashingiz bilan avtomatik baholanadi, to&apos;plangan ballaringiz, xatolar tahlili va rasmiy Milliy sertifikat taqdim etiladi.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          {/* Right Column: Baholash Mezonlari (Sidebar on Desktop - Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Baholash Mezonlari Card */}
            <Reveal delay={0.15}>
              <Card className="border-[var(--border-card)] bg-[var(--surface-card-medium)] shadow-xl overflow-hidden">
                <CardHeader className="border-b border-[var(--border-card)] bg-[var(--surface-hover)]/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Baholash Mezonlari</CardTitle>
                      <p className="text-xs text-muted-foreground">45 talik Milliy Sertifikat darajalari</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[var(--border-card)]">
                    {GRADING_SCALE.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[var(--surface-hover)]/40">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-foreground">{item.range}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">to&apos;g&apos;ri</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                          <span className={`inline-flex items-center justify-center min-w-[50px] px-2.5 py-1 rounded-lg text-xs font-black border ${item.tone}`}>
                            {item.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            {/* Telegram Bot Notification Info Card */}
            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-[var(--surface-card-soft)] to-transparent p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2.5 text-sky-500 font-bold text-sm">
                  <Bell className="size-4" /> Telegram Bot Eslatmasi
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Imtihon boshlangan vaqtda (soat 21:30 da) Telegram botimiz sizga to&apos;g&apos;ridan-to&apos;g&apos;ri xabar va kirish tugmasini yuboradi.
                </p>
                <Button
                  variant={reminded ? 'secondary' : 'default'}
                  size="sm"
                  onClick={toggleReminder}
                  disabled={togglingReminder}
                  className="w-full rounded-xl font-bold text-xs gap-2"
                >
                  {reminded ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      Eslatma yoqilgan
                    </>
                  ) : (
                    <>
                      <Bell className="size-4 animate-wiggle" />
                      Menga eslatishni yoqish
                    </>
                  )}
                </Button>
              </div>
            </Reveal>
          </div>

        </div>
      </main>
    </>
  );
}
