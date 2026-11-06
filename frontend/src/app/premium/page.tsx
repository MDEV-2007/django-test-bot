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
import { trackEvent } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
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
    <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#080808] px-4 py-2.5 text-[#FFFCF7]">
      <Clock className="size-4 text-[var(--ps-orange,#FFB82E)]" />
      <div className="flex items-center gap-1 font-mono text-[14px] font-bold tabular-nums">
        <span>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-white/40">:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-white/40">:</span>
        <span className="text-[var(--ps-orange,#FFB82E)]">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
      <span className="text-[12px] font-semibold uppercase tracking-wider text-white/55">
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

  // Voronka: tariflar sahifasi ochildi (faqat kirgan foydalanuvchi uchun, bir marta).
  useEffect(() => {
    if (access) trackEvent('premium_view');
  }, [access]);

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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 p-4 pb-20 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* 1. Aksiya banneri */}
          <section className="relative overflow-hidden rounded-[32px] bg-[var(--ps-coral)] p-5 text-white sm:p-6">
            <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/15" />
            <span aria-hidden className="absolute -bottom-14 -left-6 size-24 rounded-full bg-[var(--ps-orange)] opacity-70" />
            <span aria-hidden className="ps-dots absolute bottom-0 right-1/4 h-14 w-32 opacity-25" />
            <div className="relative flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex flex-col items-center gap-3.5 sm:flex-row">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ps-coral)]">
                  <Flame className="size-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="text-[14px] font-black uppercase tracking-wider">Mavsumiy aksiya · 50% gacha</span>
                    <span className="rounded-full bg-[#080808] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[var(--ps-orange)]">Cheklangan vaqt</span>
                  </div>
                  <p className="mt-1 text-[13px] text-white/85">
                    Barcha rasmiy Milliy Sertifikat va BBA mock testlari hamda 24/7 AI Mentor bitta obunada.
                  </p>
                </div>
              </div>
              <DiscountCountdownPill />
            </div>
          </section>

          {/* 2. Hero */}
          <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-9">
              <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[var(--ps-orange)] opacity-20" />
              <span className="ps-chip relative">
                <Crown className="size-3.5 text-[var(--ps-orange)]" />
                IlmIldizi One PRO
              </span>
              <h1 className="ps-display relative mt-5 text-[40px] sm:text-[56px]">
                Maksimal ball uchun{' '}
                <span className="relative inline-block text-[var(--ps-purple)]">
                  to&apos;liq
                  <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)]">
                    <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                  </svg>
                </span>{' '}
                ekotizim<span className="text-[var(--ps-coral)]">.</span>
              </h1>
              <p className="relative mt-5 max-w-lg text-[14.5px] leading-relaxed text-[var(--text-secondary)]">
                Rasmiy formatdagi barcha mock testlar, cheklovsiz AI Mentor, chuqur xatolar tahlili va rasmiy sertifikatlar.
              </p>
              <div className="relative mt-6 flex flex-wrap items-center gap-3">
                <a href="#tariflar" className="ps-btn ps-btn-ink">
                  Tarifni tanlash
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </a>
                <Link href="/premium/payments" className="ps-btn ps-btn-ghost">
                  <Receipt className="size-4" /> To&apos;lovlar tarixi
                </Link>
              </div>
            </div>

            {/* Ishonch plitkalari */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, title: '100% rasmiy format', sub: 'Milliy Sertifikat va BBA', tone: 'bg-[var(--ps-green)] text-white' },
                { icon: Users, title: '4,300+ abituriyent', sub: 'Faol tayyorlanmoqda', tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                { icon: Zap, title: 'Tezkor faollashuv', sub: "To'lovdan so'ng 5 daqiqada", tone: 'bg-[var(--ps-blue)] text-[#080808]' },
                { icon: Award, title: 'QR sertifikat', sub: 'Tasdiqlangan natija hujjati', tone: 'bg-[var(--ps-purple)] text-white' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={cn('relative flex flex-col justify-between overflow-hidden rounded-[28px] p-5 transition-transform hover:-translate-y-1', item.tone)}>
                    <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                    <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-black/15">
                      <Icon className="size-5" />
                    </span>
                    <div className="relative mt-6">
                      <p className="text-[15px] font-bold leading-tight">{item.title}</p>
                      <p className="mt-1 text-[12px] font-semibold opacity-75">{item.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Faol obuna holati */}
          {data && (data.has_active_premium_lessons || data.premium_mock_test_unlocked) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  label: 'IlmIldizi PRO obuna',
                  on: data.has_active_premium_lessons,
                  note: data.has_active_premium_lessons
                    ? `Faol${data.premium_expires_at ? ` — ${new Date(data.premium_expires_at).toLocaleDateString('uz-UZ')} gacha` : ''}`
                    : 'Faol emas',
                },
                {
                  label: 'Mock imtihon ruxsati',
                  on: data.premium_mock_test_unlocked,
                  note: data.premium_mock_test_unlocked ? 'Ochilgan (muddatsiz)' : 'Qulflangan',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    'flex items-center gap-4 rounded-[26px] p-4',
                    s.on ? 'bg-[var(--ps-green)] text-white' : 'bg-[var(--ps-paper)] text-[var(--text-primary)]'
                  )}
                >
                  <span className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-full', s.on ? 'bg-white/25' : 'bg-[var(--ps-neutral)] text-[var(--text-muted)]')}>
                    {s.on ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
                  </span>
                  <div>
                    <h4 className="text-[14.5px] font-bold">{s.label}</h4>
                    <p className={cn('text-[12.5px] font-semibold', s.on ? 'text-white/85' : 'text-[var(--text-muted)]')}>{s.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Tariflar */}
          <section id="tariflar" className="scroll-mt-24 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="ps-eyebrow text-[var(--text-muted)]">Tariflar</p>
                <h2 className="ps-display mt-2 text-[30px] sm:text-[40px]">
                  O&apos;zingizga mos <span className="text-[var(--ps-orange)]">tarif</span>
                </h2>
              </div>
              <span className="ps-chip">
                <ShieldCheck className="size-3.5 text-[var(--ps-green)]" /> Xavfsiz to&apos;lov · Click, Payme, Uzum
              </span>
            </div>

            {!data && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[440px] w-full rounded-[32px]" />
                ))}
              </div>
            )}

            <div className={cn('grid grid-cols-1 items-stretch gap-4', planGridCols)}>
              {data?.plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const active = isPlanActive(p);
                const mConfig = MARKETING_CONFIG[p.duration_days] || MARKETING_CONFIG[0];
                const isSingleTestPlan = p.plan_type === 'mock_test' || p.duration_days === 0;
                const dark = mConfig.isSuper;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={cn(
                      'relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[32px] p-6 transition-all duration-300 hover:-translate-y-1',
                      dark
                        ? 'bg-[#080808] text-[#FFFCF7] shadow-[0_30px_60px_-30px_rgba(8,8,8,0.8)] lg:-translate-y-2 dark:bg-[#FFFCF7] dark:text-[#080808]'
                        : 'bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[var(--ds-panel-shadow)]',
                      isSelected && 'ring-[3px] ring-[var(--ps-purple)] ring-offset-4 ring-offset-transparent'
                    )}
                  >
                    {dark && <span aria-hidden className="absolute -right-12 -top-12 size-40 rounded-full bg-[var(--ps-purple)] opacity-50" />}
                    {!dark && <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-[var(--ps-orange)] opacity-15" />}

                    <div className="relative space-y-4">
                      {/* Yorliqlar */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider',
                            dark ? 'bg-[var(--ps-orange)] text-[#080808]' : isSingleTestPlan ? 'bg-[var(--ps-neutral)] text-[var(--text-muted)]' : 'bg-[var(--ps-lilac)] text-[#080808]'
                          )}
                        >
                          {mConfig.ribbon}
                        </span>
                        {mConfig.discountPercent && (
                          <span className="rounded-full bg-[var(--ps-green)] px-2.5 py-1 font-mono text-[12px] font-bold text-white">
                            {mConfig.discountPercent}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="ps-display text-[24px]">{p.name}</h3>
                        <p className={cn('mt-1.5 text-[13px] leading-relaxed', dark ? 'opacity-70' : 'text-[var(--text-muted)]')}>{p.description}</p>
                      </div>

                      {/* Narx */}
                      <div>
                        {mConfig.originalPrice && (
                          <span className={cn('font-mono text-[12.5px] line-through', dark ? 'opacity-45' : 'text-[var(--text-faint)]')}>
                            {mConfig.originalPrice} so&apos;m
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5">
                          <span className="ps-num text-[40px] leading-none">{Number(p.price).toLocaleString()}</span>
                          <span className={cn('text-[12.5px] font-semibold', dark ? 'opacity-65' : 'text-[var(--text-muted)]')}>
                            so&apos;m{p.duration_days > 0 ? ` / ${p.duration_days} kun` : ' (1 ta test)'}
                          </span>
                        </div>
                        {mConfig.perMonthText && (
                          <p className={cn('mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-bold', dark ? 'bg-white/10 text-[var(--ps-orange)] dark:bg-black/10' : 'bg-[var(--ps-neutral)] text-[var(--ps-purple)]')}>
                            {mConfig.perMonthText}
                          </p>
                        )}
                      </div>

                      {isSingleTestPlan && (
                        <p className="rounded-[18px] bg-[var(--ps-orange)] p-3 text-[12px] font-semibold leading-snug text-[#080808]">
                          <strong>Eslatma:</strong> bu tarif faqat siz tanlagan 1 ta mock imtihonni ochadi.
                        </p>
                      )}

                      <div className={cn('h-px w-full', dark ? 'bg-white/10 dark:bg-black/10' : 'bg-[var(--border-card)]')} />

                      {/* Imkoniyatlar */}
                      <ul className="space-y-2.5 text-[13px]">
                        {p.features.map((f, i) => {
                          const isNegative = f.toLowerCase().includes('kirmaydi') || f.toLowerCase().includes('emas');
                          return (
                            <li key={i} className="flex items-start gap-2.5">
                              <span
                                className={cn(
                                  'mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full',
                                  isNegative ? (dark ? 'bg-white/10 dark:bg-black/10' : 'bg-[var(--ps-neutral)]') : 'bg-[var(--ps-green)] text-white'
                                )}
                              >
                                {isNegative ? <XCircle className="size-3 opacity-50" /> : <CheckCircle2 className="size-3" />}
                              </span>
                              <span className={cn('leading-snug', isNegative ? 'line-through opacity-45' : 'font-semibold')}>{f}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Tugma */}
                    <div className="relative mt-6 pt-2">
                      {active ? (
                        <button disabled className="flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--ps-green)] text-[13.5px] font-bold text-white">
                          <CheckCircle2 className="size-4" /> Sizda faol
                        </button>
                      ) : isSingleTestPlan ? (
                        <div className="space-y-2">
                          <Link href="/tests" className="ps-btn ps-btn-ghost w-full">
                            Test tanlab ochish <ArrowRight className="size-4" />
                          </Link>
                          <p className="text-center text-[12px] text-[var(--text-muted)]">
                            Yoki{' '}
                            <Link href={`/premium/checkout/${p.id}`} className="font-bold text-[var(--ps-purple)] hover:underline">
                              to&apos;g&apos;ridan-to&apos;g&apos;ri to&apos;lash
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <Link
                          href={`/premium/checkout/${p.id}`}
                          className={cn('ps-btn w-full', dark ? 'bg-[var(--ps-orange)] text-[#080808]' : isSelected ? 'ps-btn-ink' : 'ps-btn-ghost')}
                        >
                          Obunani boshlash
                          <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Taqqoslash */}
          <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-9">
            <span aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-[var(--ps-purple)] opacity-10" />
            <div className="relative mx-auto max-w-2xl text-center">
              <span className="ps-chip"><Sparkles className="size-3.5 text-[var(--ps-purple)]" /> Taqqoslash</span>
              <h2 className="ps-display mt-4 text-[28px] sm:text-[38px]">
                Nega PRO <span className="text-[var(--ps-green)]">10 barobar</span> tejamkor?
              </h2>
              <p className="mt-2 text-[13.5px] text-[var(--text-muted)]">An&apos;anaviy kurslar va bir martalik testlar bilan taqqoslang</p>
            </div>

            <div className="relative mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
              <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-neutral)] p-6">
                <p className="text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-coral)]">Oddiy repetitor</p>
                <p className="ps-num mt-2 text-[30px] leading-none">400,000+</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">so&apos;m · har oy to&apos;lanadi</p>
                <ul className="mt-4 space-y-2 border-t border-[var(--border-card)] pt-4 text-[12.5px] text-[var(--text-secondary)]">
                  <li>• Haftada atigi 3 kun dars</li>
                  <li>• Qog&apos;oz testlar sekin tekshiriladi</li>
                  <li>• Yiliga 4,000,000+ so&apos;m xarajat</li>
                </ul>
              </div>

              <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-neutral)] p-6">
                <p className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">Alohida 1 ta test</p>
                <p className="ps-num mt-2 text-[30px] leading-none">15,000</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">so&apos;m · har bir imtihon uchun</p>
                <ul className="mt-4 space-y-2 border-t border-[var(--border-card)] pt-4 text-[12.5px] text-[var(--text-secondary)]">
                  <li>• Faqat tanlangan 1 ta test ochiladi</li>
                  <li>• Boshqa 50+ testlar yopiq qoladi</li>
                  <li>• 24/7 AI Mentor kirmaydi</li>
                </ul>
              </div>

              <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-6 text-white md:-translate-y-3">
                <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
                <span className="absolute right-4 top-4 rounded-full bg-[var(--ps-orange)] px-3 py-1 text-[10.5px] font-black uppercase text-[#080808]">Eng to&apos;g&apos;ri tanlov</span>
                <p className="relative text-[11.5px] font-black uppercase tracking-wider text-white/75">IlmIldizi PRO (yillik)</p>
                <p className="ps-num relative mt-2 text-[30px] leading-none">12,500</p>
                <p className="relative mt-1 text-[12px] font-semibold text-white/80">so&apos;m/oy · yiliga 150,000 so&apos;m</p>
                <ul className="relative mt-4 space-y-2 border-t border-white/20 pt-4 text-[12.5px] font-semibold">
                  {['Barcha 50+ rasmiy mock testlar', "Yangi qo'shiladigan testlar bepul", '24/7 AI Mentor va tahlillar'].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/25"><CheckCircle2 className="size-3" /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 6. FAQ */}
          <section className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <div className="relative overflow-hidden rounded-[36px] bg-[var(--ps-orange)] p-6 text-[#080808] sm:p-8">
              <span aria-hidden className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/25" />
              <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
                <HelpCircle className="size-6" />
              </span>
              <h3 className="ps-display relative mt-5 text-[30px] sm:text-[36px]">Ko&apos;p beriladigan savollar</h3>
              <p className="relative mt-2 text-[13.5px] font-semibold opacity-75">To&apos;lov va obunalar bo&apos;yicha ma&apos;lumot</p>
            </div>

            <div className="ps-card space-y-2.5 !rounded-[36px] p-4 sm:p-5">
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
                <div key={i} className="flex gap-3.5 rounded-[24px] bg-[var(--ps-neutral)] p-4 sm:p-5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple)] font-mono text-[13px] font-black text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold text-[var(--text-primary)]">{faq.q}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
