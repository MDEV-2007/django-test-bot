'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Crown, CheckCircle2, ArrowRight, Lock, Receipt, Flame,
  Clock, ShieldCheck, Zap, Sparkles, HelpCircle,
  Award, Users, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PremiumIcon from '@/components/ui/premium-icon';
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

const MARKETING_CONFIG: Record<
  number,
  {
    originalPrice: string;
    discountPercent: string;
    ribbon: string;
    isSuper: boolean;
    perMonthText?: string;
    accentColor: string;
  }
> = {
  365: {
    originalPrice: '300,000',
    discountPercent: '-50%',
    ribbon: 'ENG FOYDALI YILLIK',
    isSuper: false,
    perMonthText: 'Oyiga atigi 12,500 so\'m',
    accentColor: '#34C759',
  },
  180: {
    originalPrice: '150,000',
    discountPercent: '-40%',
    ribbon: 'ENG OMMABOP TANLOV',
    isSuper: true,
    perMonthText: 'Oyiga 15,000 so\'m • 40% tejamkor',
    accentColor: '#007AFF',
  },
  30: {
    originalPrice: '35,000',
    discountPercent: '-28%',
    ribbon: 'BOSHLANG\'ICH',
    isSuper: false,
    perMonthText: 'Oyiga 25,000 so\'m',
    accentColor: '#5856D6',
  },
  0: {
    originalPrice: '',
    discountPercent: '',
    ribbon: '1 TA IMTIHON UCHUN',
    isSuper: false,
    accentColor: '#8E8E93',
  },
};

function DiscountCountdownPill() {
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

  return (
    <div className="flex items-center gap-2 rounded-full bg-[#1C1C1E] px-4 py-2 text-white shadow-md shrink-0 border border-white/10">
      <Clock className="size-4 text-[#FF9500]" />
      <div className="flex items-center gap-1 font-mono text-[14px] font-bold tabular-nums">
        <span>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-white/40">:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-white/40">:</span>
        <span className="text-[#FF9500]">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
        qoldi
      </span>
    </div>
  );
}

export default function PremiumPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const [data, setData] = useState<PlansData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

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
      <main className="page-shell flex-1 space-y-7 bg-[var(--bg-page)] p-4 pb-20 sm:p-6">
        {/* iOS Live Activity Offer Banner */}
        <div className="ios-card relative overflow-hidden rounded-[24px] p-4 sm:p-5 border border-[#FF9500]/25 bg-gradient-to-r from-[#FF9500]/[0.08] via-transparent to-[#FF3B30]/[0.06]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <PremiumIcon icon={Flame} tone="amber" size="md" solid />
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-[13px] text-[#FF9500] uppercase tracking-wider">
                    Mavsumiy Aksiya • 50% gacha chegirma
                  </span>
                  <span className="rounded-full bg-[#FF3B30] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    Cheklangan vaqt
                  </span>
                </div>
                <p className="text-[13px] text-[#8E8E93] mt-0.5">
                  Barcha rasmiy Milliy Sertifikat va BBA mock testlari hamda 24/7 AI Mentor bitta obunada.
                </p>
              </div>
            </div>

            {/* Dynamic Island Countdown Pill (izolyatsiya qilingan komponent) */}
            <DiscountCountdownPill />
          </div>
        </div>

        {/* Hero */}
        <PageHero
          tone="amber"
          eyebrow="IlmIldizi One PRO"
          eyebrowIcon={Crown}
          title="Maksimal ball uchun to'liq ekotizim"
          description="Rasmiy formatdagi barcha mock testlar, cheklovsiz AI Mentor, chuqur xatolar tahlili va rasmiy sertifikatlar."
          actions={
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/premium/payments">
                <Receipt className="size-4 text-[#007AFF]" /> To&apos;lovlar tarixi
              </Link>
            </Button>
          }
        />

        {/* 4 iOS Widget Trust Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { icon: ShieldCheck, tone: 'emerald' as const, title: '100% Rasmiy Format', sub: 'Milliy Sertifikat va BBA' },
            { icon: Users, tone: 'amber' as const, title: '4,300+ Abituriyent', sub: 'Faol tayyorlanmoqda' },
            { icon: Zap, tone: 'sky' as const, title: 'Tezkor Faollashuv', sub: 'To\'lovdan so\'ng 5 daqiqada' },
            { icon: Award, tone: 'indigo' as const, title: 'QR Sertifikat', sub: 'Tasdiqlangan natija hujjati' },
          ].map((item) => (
            <div
              key={item.title}
              className="ios-card flex items-center gap-3.5 rounded-[22px] p-4"
            >
              <PremiumIcon icon={item.icon} tone={item.tone} size="md" solid />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">{item.title}</p>
                <p className="text-[11.5px] text-[#8E8E93] truncate">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Subscription Status Cards */}
        {data && (data.has_active_premium_lessons || data.premium_mock_test_unlocked) && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {[
              {
                label: 'IlmIldizi PRO Obuna',
                on: data.has_active_premium_lessons,
                note: data.has_active_premium_lessons
                  ? `Faol${
                      data.premium_expires_at
                        ? ` — ${new Date(data.premium_expires_at).toLocaleDateString('uz-UZ')} gacha`
                        : ''
                    }`
                  : 'Faol emas',
              },
              {
                label: 'Mock Imtihon Ruxsati',
                on: data.premium_mock_test_unlocked,
                note: data.premium_mock_test_unlocked ? 'Ochilgan (muddatsiz)' : 'Qulflangan',
              },
            ].map((s) => (
              <div key={s.label} className="ios-card flex items-center gap-4 rounded-[22px] p-4">
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px] text-white',
                    s.on ? 'bg-[#34C759]' : 'bg-[#8E8E93]/30 text-[#8E8E93]'
                  )}
                >
                  {s.on ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">{s.label}</h4>
                  <p className={cn('text-[12px] font-medium', s.on ? 'text-[#34C759]' : 'text-[#8E8E93]')}>
                    {s.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!data && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full rounded-[28px]" />
            ))}
          </div>
        )}

        {/* Apple One Style Plan Cards */}
        <div className={cn('grid grid-cols-1 gap-5 items-stretch', planGridCols)}>
          {data?.plans.map((p) => {
            const isSelected = selectedPlanId === p.id;
            const active = isPlanActive(p);
            const mConfig = MARKETING_CONFIG[p.duration_days] || MARKETING_CONFIG[0];
            const isSingleTestPlan = p.plan_type === 'mock_test' || p.duration_days === 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={cn(
                  'relative cursor-pointer flex flex-col justify-between rounded-[28px] p-6 transition-all duration-300',
                  mConfig.isSuper
                    ? 'bg-[#1C1C1E] text-white ring-2 ring-[#007AFF] shadow-[0_24px_48px_-12px_rgba(0,122,255,0.28)]'
                    : isSelected
                    ? 'ios-card ring-2 ring-[#007AFF]'
                    : 'ios-card hover:border-black/15 dark:hover:border-white/15'
                )}
              >
                <div className="space-y-4">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                        mConfig.isSuper
                          ? 'bg-[#007AFF] text-white'
                          : isSingleTestPlan
                          ? 'bg-[#8E8E93]/15 text-[#8E8E93]'
                          : 'bg-[#FF9500]/15 text-[#FF9500]'
                      )}
                    >
                      {mConfig.ribbon}
                    </span>

                    {mConfig.discountPercent && (
                      <span className="rounded-full bg-[#34C759]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#34C759]">
                        {mConfig.discountPercent}
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3
                      className={cn(
                        'text-[20px] font-bold tracking-tight',
                        mConfig.isSuper ? 'text-white' : 'text-foreground'
                      )}
                    >
                      {p.name}
                    </h3>
                    <p
                      className={cn(
                        'mt-1 text-[13px] leading-relaxed',
                        mConfig.isSuper ? 'text-white/65' : 'text-[#8E8E93]'
                      )}
                    >
                      {p.description}
                    </p>
                  </div>

                  {/* Price Block */}
                  <div className="pt-1">
                    {mConfig.originalPrice && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            'text-[12px] line-through font-mono',
                            mConfig.isSuper ? 'text-white/40' : 'text-[#8E8E93]'
                          )}
                        >
                          {mConfig.originalPrice} so&apos;m
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'font-mono text-[32px] font-black tracking-tight tabular-nums leading-none',
                          mConfig.isSuper ? 'text-white' : 'text-foreground'
                        )}
                      >
                        {Number(p.price).toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          'text-[12px] font-medium',
                          mConfig.isSuper ? 'text-white/65' : 'text-[#8E8E93]'
                        )}
                      >
                        so&apos;m{p.duration_days > 0 ? ` / ${p.duration_days} kun` : ' (1 ta test)'}
                      </span>
                    </div>

                    {mConfig.perMonthText && (
                      <p
                        className={cn(
                          'mt-1.5 text-[12px] font-semibold',
                          mConfig.isSuper ? 'text-[#5AC8FA]' : 'text-[#007AFF]'
                        )}
                      >
                        {mConfig.perMonthText}
                      </p>
                    )}
                  </div>

                  {isSingleTestPlan && (
                    <div className="rounded-[14px] bg-[#FF9500]/10 border border-[#FF9500]/25 p-3 text-[11.5px] text-foreground leading-snug">
                      <strong className="text-[#FF9500]">Eslatma:</strong> Ushbu tarif faqat siz tanlagan 1 ta mock imtihonni ochadi.
                    </div>
                  )}

                  <div
                    className={cn(
                      'h-px w-full',
                      mConfig.isSuper ? 'bg-white/10' : 'bg-black/[0.06] dark:bg-white/[0.08]'
                    )}
                  />

                  {/* Features List */}
                  <ul className="space-y-2.5 text-[13px]">
                    {p.features.map((f, i) => {
                      const isNegative =
                        f.toLowerCase().includes('kirmaydi') || f.toLowerCase().includes('emas');
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          {isNegative ? (
                            <XCircle
                              className={cn(
                                'size-4 shrink-0 mt-0.5',
                                mConfig.isSuper ? 'text-white/30' : 'text-[#8E8E93]/60'
                              )}
                            />
                          ) : (
                            <CheckCircle2 className="size-4 shrink-0 text-[#34C759] mt-0.5" />
                          )}
                          <span
                            className={cn(
                              'leading-snug',
                              isNegative
                                ? mConfig.isSuper
                                  ? 'text-white/40 line-through'
                                  : 'text-[#8E8E93] line-through'
                                : mConfig.isSuper
                                ? 'text-white/90 font-medium'
                                : 'text-foreground font-medium'
                            )}
                          >
                            {f}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-4">
                  {active ? (
                    <button
                      disabled
                      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#34C759]/15 text-[#34C759] text-[13px] font-bold"
                    >
                      <CheckCircle2 className="size-4" /> Sizda faol
                    </button>
                  ) : isSingleTestPlan ? (
                    <div className="space-y-2">
                      <Link
                        href="/tests"
                        className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#767680]/[0.14] dark:bg-[#767680]/[0.28] text-foreground text-[13.5px] font-semibold hover:bg-[#767680]/[0.22] transition-all"
                      >
                        <span>Test tanlab ochish</span>
                        <ArrowRight className="size-4" />
                      </Link>
                      <p className="text-[11px] text-center text-[#8E8E93]">
                        Yoki{' '}
                        <Link href={`/premium/checkout/${p.id}`} className="text-[#007AFF] font-semibold hover:underline">
                          to&apos;g&apos;ridan-to&apos;g&apos;ri to&apos;lash
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <Link
                      href={`/premium/checkout/${p.id}`}
                      className={cn(
                        'flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]',
                        mConfig.isSuper || isSelected
                          ? 'bg-[#007AFF] text-white shadow-[0_8px_20px_-4px_rgba(0,122,255,0.45)] hover:bg-[#0071EB]'
                          : 'bg-[#767680]/[0.14] dark:bg-[#767680]/[0.28] text-foreground hover:bg-[#007AFF] hover:text-white'
                      )}
                    >
                      <span>Obunani boshlash</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Apple Keynote Comparison Section */}
        <div className="ios-card rounded-[28px] p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <Badge variant="outline" className="border-[#007AFF]/25 text-[#007AFF] bg-[#007AFF]/10">
              <Sparkles className="size-3 mr-1" /> TAQQOSLASH
            </Badge>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">
              Nega IlmIldizi PRO 10 barobar tejamkor?
            </h2>
            <p className="text-[13.5px] text-[#8E8E93]">
              An&apos;anaviy kurslar va bir martalik testlar bilan taqqoslang
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="rounded-[22px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.04] p-5 space-y-3">
              <p className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-wider">Oddiy Repetitor</p>
              <p className="text-[24px] font-black text-foreground">400,000+ so&apos;m</p>
              <p className="text-[12px] text-[#8E8E93]">Har oy to&apos;lanadi</p>
              <ul className="text-[12.5px] space-y-2 text-[#8E8E93] pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                <li>• Haftada atigi 3 kun dars</li>
                <li>• Qog&apos;oz testlar sekin tekshiriladi</li>
                <li>• Yiliga 4,000,000+ so&apos;m xarajat</li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-5 space-y-3">
              <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Alohida 1 ta test</p>
              <p className="text-[24px] font-black text-foreground">15,000 so&apos;m</p>
              <p className="text-[12px] text-[#8E8E93]">Har bir imtihon uchun alohida</p>
              <ul className="text-[12.5px] space-y-2 text-[#8E8E93] pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                <li>• Faqat tanlangan 1 ta test ochiladi</li>
                <li>• Boshqa 50+ testlar yopiq qoladi</li>
                <li>• 24/7 AI Mentor kirmaydi</li>
              </ul>
            </div>

            <div className="rounded-[22px] border-2 border-[#007AFF] bg-[#007AFF]/[0.06] p-5 space-y-3 relative">
              <span className="absolute -top-3 right-4 rounded-full bg-[#007AFF] text-white font-bold text-[10px] px-3 py-0.5 uppercase shadow-xs">
                Eng to&apos;g&apos;ri tanlov
              </span>
              <p className="text-[11px] font-bold text-[#007AFF] uppercase tracking-wider">ILMILDIZI PRO (YILLIK)</p>
              <p className="text-[24px] font-black text-foreground">12,500 so&apos;m/oy</p>
              <p className="text-[12px] text-[#007AFF] font-semibold">Butun o&apos;quv yili uchun 150,000 so&apos;m</p>
              <ul className="text-[12.5px] space-y-2 text-foreground font-medium pt-3 border-t border-[#007AFF]/20">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#34C759]" /> Barcha 50+ rasmiy mock testlar</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#34C759]" /> Yangi qo&apos;shiladigan testlar bepul</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#34C759]" /> 24/7 AI Mentor va tahlillar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* iOS Settings Inset Grouped FAQ */}
        <div className="max-w-3xl mx-auto space-y-3 pt-2">
          <div className="px-1">
            <h3 className="text-[18px] font-bold text-foreground">Ko&apos;p beriladigan savollar</h3>
            <p className="text-[13px] text-[#8E8E93]">To&apos;lov va obunalar bo&apos;yicha ma&apos;lumot</p>
          </div>

          <div className="ios-card rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            {[
              {
                q: "To'lov qilgandan keyin obuna qachon faollashadi?",
                a: "To'lov chekini (skrinshot) yuklaganingizdan so'ng moderatorlarimiz 5–15 daqiqa ichida tekshirib, hisobingizni to'liq faollashtiradi.",
              },
              {
                q: "Bir martalik test bilan PRO obunaning farqi nimada?",
                a: "Bir martalik to'lov faqat siz tanlagan 1 ta mock imtihonni ochadi. PRO obunada esa platformadagi barcha mavjud va yangi qo'shiladigan mock testlar hamda 24/7 AI Mentor to'liq ochiladi.",
              },
              {
                q: "Qanday usulda to'lov qilish mumkin?",
                a: "Click, Payme, Uzum Bank yoki istalgan bank ilovasi (Uzcard / Humo) orqali ko'rsatilgan kartaga o'tkazib, chek skrinshotini yuklashingiz kifoya.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-5 space-y-1.5">
                <p className="text-[14px] font-bold text-foreground flex items-center gap-2">
                  <PremiumIcon icon={HelpCircle} tone="sky" size="2xs" solid />
                  <span>{faq.q}</span>
                </p>
                <p className="text-[13px] text-[#8E8E93] leading-relaxed pl-7">
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
