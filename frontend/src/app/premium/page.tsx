'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Crown, CheckCircle2, ArrowRight, Lock, Receipt, Flame,
  Clock, ShieldCheck, Zap, Sparkles, AlertCircle, HelpCircle,
  TrendingUp, Award, Users, ChevronRight, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Plan = {
  id: number;
  plan_type: string;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  features: string[];
};

type PlansData = {
  plans: Plan[];
  is_premium: boolean;
  has_active_premium_lessons: boolean;
  premium_mock_test_unlocked: boolean;
  premium_expires_at: string | null;
};

// Chegirma va marketing ma'lumotlari
const MARKETING_CONFIG: Record<
  number,
  {
    originalPrice: string;
    discountPercent: string;
    ribbon: string;
    isSuper: boolean;
    perMonthText?: string;
  }
> = {
  365: {
    originalPrice: '300,000',
    discountPercent: '-50% TEJASH',
    ribbon: '🔥 ENG FOYDALI NARX',
    isSuper: false,
    perMonthText: '12,500 so\'m/oy — eng arzon',
  },
  180: {
    originalPrice: '150,000',
    discountPercent: '-40% TEJASH',
    ribbon: '👑 TAVSIYA ETAMIZ (ENG OMMABOP)',
    isSuper: true,
    perMonthText: '15,000 so\'m/oy — 40% arzon',
  },
  30: {
    originalPrice: '35,000',
    discountPercent: '-28% TEJASH',
    ribbon: '🚀 BOSHLANG\'ICH',
    isSuper: false,
    perMonthText: '25,000 so\'m/oy',
  },
  0: {
    originalPrice: '',
    discountPercent: '',
    ribbon: '📌 1 TA TEST UCHUN',
    isSuper: false,
  },
};

export default function PremiumPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const [data, setData] = useState<PlansData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Marketing: Chegirma taymeri (FOMO)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 8,
    minutes: 42,
    seconds: 15,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 11, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authReady && !access) {
      router.replace('/register?next=%2Fpremium');
      return;
    }
    if (!access) return;
    apiFetch<PlansData>('/api/premium/plans/')
      .then((d) => {
        setData(d);
        const recommended = d.plans.find((p) => p.duration_days === 180);
        setSelectedPlanId((prev) => prev ?? recommended?.id ?? d.plans[0]?.id ?? null);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik yuz berdi'));
  }, [authReady, access, router]);

  function isPlanActive(plan: Plan) {
    if (!data) return false;
    if (plan.plan_type === 'lessons') return data.has_active_premium_lessons;
    if (plan.plan_type === 'mock_test') return data.premium_mock_test_unlocked;
    return false;
  }

  const planCount = data?.plans.length ?? 0;
  const planGridCols =
    planCount <= 1
      ? 'max-w-md mx-auto'
      : planCount === 2
      ? 'sm:grid-cols-2 max-w-3xl mx-auto'
      : planCount === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : 'sm:grid-cols-2 xl:grid-cols-4';

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-16 sm:p-6">
        {/* Vohima & Aksiya Taymeri (Urgency Banner) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 p-4 shadow-lg backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 animate-pulse">
                <Flame className="size-6" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-sm text-amber-400 uppercase tracking-wide">
                    Maxsus Taklif • 50% Gacha Chegirma
                  </span>
                  <Badge variant="destructive" className="animate-bounce text-[10px] px-1.5 py-0 font-extrabold">
                    SO&apos;NGGI SOATLAR
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Barcha rasmiy mock testlar va AI Mentordan foydalanish uchun eng katta chegirmalar amal qilmoqda!
                </p>
              </div>
            </div>

            {/* Raqamli taymer */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl shrink-0">
              <Clock className="size-4 text-amber-400 mr-1" />
              <div className="flex items-center gap-1 font-mono text-sm font-bold text-amber-300">
                <span className="bg-white/10 px-1.5 py-0.5 rounded">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-white/10 px-1.5 py-0.5 rounded">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-rose-400">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-1.5 uppercase">qoldi</span>
            </div>
          </div>
        </div>

        {/* Hero */}
        <PageHero
          tone="amber"
          eyebrow="ILMILDIZI PRO — KAFOLATLANGAN NATIJA"
          eyebrowIcon={Crown}
          title="Imtihonda 100% Natija va Milliy Sertifikatni Kafolatlang!"
          description="Barcha rasmiy mock testlar, kengaytirilgan AI Mentor, to'liq xatolar tahlili va tasdiqlangan rasmiy sertifikatlar."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/premium/payments">
                <Receipt className="size-4" /> To&apos;lovlarim
              </Link>
            </Button>
          }
        />

        {/* Ijtimoiy isbot va ishonch ko'rsatkichlari */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">100% Rasmiy</p>
              <p className="text-[11px] text-muted-foreground">DTM/BBA formati</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">1,500+ O&apos;quvchi</p>
              <p className="text-[11px] text-muted-foreground">Biz bilan tayyorlanmoqda</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Tezkor Ulanish</p>
              <p className="text-[11px] text-muted-foreground">To&apos;lovdan so&apos;ng 5 daqiqada</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Sertifikat</p>
              <p className="text-[11px] text-muted-foreground">Rasmiy seriya raqamli</p>
            </div>
          </div>
        </div>

        {/* Holat kartalari (faol obuna bo'lsa) */}
        {data && (data.has_active_premium_lessons || data.premium_mock_test_unlocked) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Video/Audio darslar & PRO Obuna',
                on: data.has_active_premium_lessons,
                note: data.has_active_premium_lessons
                  ? `Faol${
                      data.premium_expires_at
                        ? ` — ${new Date(data.premium_expires_at).toLocaleDateString('uz-UZ')} gacha`
                        : ''
                    }`
                  : 'Qulflangan',
              },
              {
                label: 'Mock test tizimi',
                on: data.premium_mock_test_unlocked,
                note: data.premium_mock_test_unlocked ? 'Ochilgan (muddatsiz)' : 'Qulflangan',
              },
            ].map((s) => (
              <Card key={s.label} className="border-border/60 bg-card/60">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      s.on
                        ? 'bg-[var(--success)]/20 text-[var(--success-text)]'
                        : 'bg-[var(--surface-input)] text-[var(--text-faint)]'
                    )}
                  >
                    {s.on ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{s.label}</h4>
                    <p
                      className={cn(
                        'mt-0.5 text-xs',
                        s.on ? 'text-[var(--success-text)]' : 'text-[var(--text-faint)]'
                      )}
                    >
                      {s.note}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!data && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Tarif kartalari */}
        <div className={cn('grid grid-cols-1 gap-5', planGridCols)}>
          {data?.plans.map((p) => {
            const isSelected = selectedPlanId === p.id;
            const active = isPlanActive(p);
            const mConfig = MARKETING_CONFIG[p.duration_days] || MARKETING_CONFIG[0];
            const isSingleTestPlan = p.plan_type === 'mock_test' || p.duration_days === 0;

            return (
              <Card
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={cn(
                  'tactile-btn relative cursor-pointer flex flex-col justify-between transition-all rounded-2xl overflow-hidden border',
                  mConfig.isSuper
                    ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/15 via-card to-card ring-2 ring-amber-400/40 shadow-2xl shadow-amber-500/20'
                    : isSelected
                    ? 'border-amber-400 bg-gradient-to-b from-amber-500/10 to-card shadow-xl shadow-amber-500/10'
                    : 'border-border/60 hover:border-amber-400/40 bg-card/60'
                )}
              >
                {/* Lenta (Ribbon) */}
                {mConfig.ribbon && (
                  <div
                    className={cn(
                      'absolute left-0 right-0 top-0 py-1 text-center font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-md z-10',
                      mConfig.isSuper
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-pulse'
                        : isSingleTestPlan
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    )}
                  >
                    {mConfig.ribbon}
                  </div>
                )}

                <CardContent className={cn('space-y-3.5 pt-6 pb-2', mConfig.ribbon && 'pt-9')}>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
                        isSingleTestPlan
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      )}
                    >
                      {isSingleTestPlan ? '1 TA TEST UCHUN' : 'TO\'LIQ OBUNA'}
                    </span>

                    {/* Chegirma foizi belgisi */}
                    {mConfig.discountPercent && (
                      <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-mono text-[11px] font-black px-2 py-0.5 shadow-md animate-pulse">
                        {mConfig.discountPercent}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                      {p.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground mt-1">
                      {p.description}
                    </p>
                  </div>

                  {/* Narx qismi (Eskirgan narx ustidan chizilgan + Yangi narx) */}
                  <div className="pt-1.5">
                    {mConfig.originalPrice && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-muted-foreground/80 line-through decoration-rose-500 decoration-2 font-mono">
                          {mConfig.originalPrice} so&apos;m
                        </span>
                        <span className="text-[10px] font-bold text-rose-400 uppercase">Aksiya narxi</span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-black text-foreground">
                        {Number(p.price).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        so&apos;m{p.duration_days > 0 ? ` / ${p.duration_days} kun` : ' (muddatsiz)'}
                      </span>
                    </div>

                    {mConfig.perMonthText && (
                      <p className="mt-1 font-mono text-xs font-semibold text-amber-400/90">
                        ⚡ {mConfig.perMonthText}
                      </p>
                    )}
                  </div>

                  {/* Yagona test bo'lsa ogohlantirish */}
                  {isSingleTestPlan && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-tight">
                      ⚠️ <strong>Muhim:</strong> Bu to&apos;lov faqat tanlangan 1 ta testni ochadi (barcha testlarni emas!).
                    </div>
                  )}

                  <Separator className="my-2" />

                  {/* Imkoniyatlar ro'yxati */}
                  <ul className="space-y-2 text-xs">
                    {p.features.map((f, i) => {
                      const isNegative = f.toLowerCase().includes('kirmaydi') || f.toLowerCase().includes('emas');
                      return (
                        <li key={i} className="flex items-start gap-2">
                          {isNegative ? (
                            <XCircle className="size-4 shrink-0 text-muted-foreground/60 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                          )}
                          <span
                            className={cn(
                              'leading-snug',
                              isNegative ? 'text-muted-foreground/70 italic' : 'text-foreground/90'
                            )}
                          >
                            {f}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>

                <CardContent className="pb-6 pt-2">
                  {active ? (
                    <Button disabled className="w-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="size-4 mr-1.5" /> Sizda Faol
                    </Button>
                  ) : isSingleTestPlan ? (
                    <div className="space-y-2">
                      <Button
                        asChild
                        variant="secondary"
                        className="w-full font-bold border border-border/80 hover:bg-accent"
                      >
                        <Link href="/tests">
                          Test tanlab ochish <ArrowRight className="size-4 ml-1.5" />
                        </Link>
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">
                        Yoki to&apos;g&apos;ridan-to&apos;g&apos;ri to&apos;lov sahifasiga{' '}
                        <Link href={`/premium/checkout/${p.id}`} className="underline text-primary">
                          o&apos;tish
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <Button
                      asChild
                      variant={mConfig.isSuper || isSelected ? 'default' : 'secondary'}
                      className={cn(
                        'w-full font-extrabold shadow-lg transition-all',
                        mConfig.isSuper
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black hover:from-amber-500 hover:to-yellow-500 shadow-amber-500/25 py-5 text-sm'
                          : isSelected
                          ? 'bg-amber-400 text-black shadow-amber-500/20 hover:bg-amber-500'
                          : 'hover:bg-accent'
                      )}
                    >
                      <Link href={`/premium/checkout/${p.id}`}>
                        Obunani Boshlash <ArrowRight className="size-4 ml-1.5" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Nega aynan PRO obuna? (Marketing qiyosiy bloki) */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-8">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
              <Sparkles className="size-3 mr-1" /> TEJAMKOR VA SAMARALI
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold">Nega PRO obunani tanlash 10 barobar foydali?</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              O&apos;quv markazlar yoki oddiy repetitorlar bilan solishtiring:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Oddiy Repetitor</p>
              <p className="text-2xl font-black text-rose-300">400,000+ so&apos;m</p>
              <p className="text-xs text-muted-foreground">Har oy to&apos;lanadi</p>
              <ul className="text-xs space-y-1.5 text-muted-foreground pt-2 border-t border-rose-500/15">
                <li>❌ Haftada atigi 3 kun dars</li>
                <li>❌ Qog&apos;oz testlar xatolari sekin tekshiriladi</li>
                <li>❌ Bir yilda: 4,000,000+ so&apos;m sarf</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/40 space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alohida 1 ta test</p>
              <p className="text-2xl font-black text-slate-200">15,000 so&apos;m</p>
              <p className="text-xs text-muted-foreground">Har bir test uchun alohida</p>
              <ul className="text-xs space-y-1.5 text-muted-foreground pt-2 border-t border-slate-700">
                <li>⚠️ Faqat o&apos;sha 1 ta test ochiladi</li>
                <li>❌ Boshqa 50+ ta testlar yopiq qoladi</li>
                <li>❌ AI Mentor kirmaydi</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/15 to-card space-y-3 shadow-xl relative">
              <span className="absolute -top-3 right-4 bg-amber-400 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                ENG ZO&apos;R TANLOV
              </span>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">ILMILDIZI PRO (12 OY)</p>
              <p className="text-2xl font-black text-amber-300">12,500 so&apos;m/oy</p>
              <p className="text-xs text-amber-400/80">Butun yilga bor-yo&apos;g&apos;i 150,000 so&apos;m!</p>
              <ul className="text-xs space-y-1.5 text-foreground/90 pt-2 border-t border-amber-400/30 font-medium">
                <li>✅ Barcha 50+ ta rasmiy mock testlar</li>
                <li>✅ Yangi chiqadigan barcha testlar bepul</li>
                <li>✅ AI Mentor bilan 24/7 savol-javob</li>
                <li>✅ Rasmiy sertifikatlar va tahlillar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tez-tez so'raladigan savollar (FAQ) */}
        <div className="max-w-3xl mx-auto space-y-4 pt-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold">Ko&apos;p beriladigan savollar</h3>
            <p className="text-xs text-muted-foreground">To&apos;lov va obunalar bo&apos;yicha aniq ma&apos;lumotlar</p>
          </div>

          <div className="grid gap-3 pt-2">
            {[
              {
                q: "To'lov qilgandan keyin akkauntim qachon ochiladi?",
                a: "To'lov chekini (skrinshot) yuklashingiz bilan adminlarimiz odatda 5-15 daqiqa ichida tekshirib, hisobingizni to'liq faollashtiradi.",
              },
              {
                q: "Bir martalik test bilan PRO obunaning farqi nima?",
                a: "15,000 so'mlik bir martalik to'lov faqat siz tanlagan 1 ta testni muddatsiz ochadi. PRO obunada esa platformadagi mavjud va kelajakda qo'shiladigan BARCHA rasmiy mock testlar hamda 24/7 AI Mentor cheklovsiz ochiladi.",
              },
              {
                q: "Qanday to'lov qilsam bo'ladi?",
                a: "Click, Payme yoki istalgan bank ilovasi (Uzcard/Humo) orqali ko'rsatilgan kartaga to'lov qilib, chek rasmini yuklashingiz kifoya.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1.5">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="size-4 text-amber-400 shrink-0" />
                  {faq.q}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
