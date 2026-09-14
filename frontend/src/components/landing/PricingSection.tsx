'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';

export type PlanCard = {
  name: string;
  price: string;
  unit: string;
  text: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
  perDay?: string;
  ribbon?: string;
};

export const FREE_PLAN: PlanCard = {
  name: 'Bepul Boshlash',
  price: '0',
  unit: "so'm",
  text: "Kundalik mashq testlari, 1v1 arena, mini o'yinlar, reyting va asosiy diagnostika.",
  features: [
    'Kunlik 10 ta bepul mashq testi',
    '1v1 Arena va do\'stlar bilan bellashuv',
    'AI Mentor: kuniga 5 ta savol',
    'Kunlik streak va reyting',
    'Asosiy xatolar tahlili',
  ],
  cta: 'Bepul boshlash',
  href: '/register',
  highlight: false,
};

export const FALLBACK_PLANS: PlanCard[] = [
  FREE_PLAN,
  {
    name: 'PRO — Oylik',
    price: '25 000',
    unit: "so'm / 30 kun",
    perDay: "≈ 833 so'm / kun",
    text: "Barcha mock testlar va kengaytirilgan AI Mentor. Istalgan vaqtda to'xtatasiz.",
    features: [
      'Barcha to\'liq mock testlar (cheklovsiz)',
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Mavzular kesimidagi chuqur tahlil',
      'Ovozli va darslik havolali izohlar',
      '30 kun to\'liq foydalanish',
    ],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: false,
  },
  {
    name: 'PRO — 6 Oylik',
    price: '90 000',
    unit: "so'm / 180 kun",
    perDay: "≈ 500 so'm / kun",
    ribbon: 'TAVSIYA ETILADI',
    text: "Milliy sertifikat va DTM imtihoniga to'liq 6 oylik tayyorgarlik kursi.",
    features: [
      'Barcha to\'liq mock testlar (cheklovsiz)',
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Kutilayotgan DTM ball tahlili',
      '15 000 so\'m/oy — 40% tejamkorlik',
      'Shaxsiy o\'qish rejasi va diagnostika',
    ],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: true,
  },
  {
    name: 'PRO — 12 Oylik',
    price: '150 000',
    unit: "so'm / 365 kun",
    perDay: "≈ 411 so'm / kun",
    ribbon: 'ENG FOYDALI NARX',
    text: "Eng past oylik narx. Butun o'quv yili davomida cheklovsiz tayyorgarlik.",
    features: [
      'Barcha to\'liq mock testlar (cheklovsiz)',
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Kutilayotgan DTM ball tahlili',
      '12 500 so\'m/oy — eng arzon narx',
      '365 kun to\'liq foydalanish',
    ],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: false,
  },
  {
    name: 'Alohida Test — bir martalik',
    price: '15 000',
    unit: "so'm (bir martalik)",
    text: "Faqat tanlangan 1 ta premium mock testni muddatsiz ochish uchun.",
    features: [
      'Faqat tanlangan 1 ta mock test',
      'Ushbu testga muddatsiz (umrbod) kirish',
      'Xatolar tahlili va sertifikat',
      'Boshqa testlar va AI Mentor kirmaydi',
    ],
    cta: 'Test tanlab ochish',
    href: '/tests',
    highlight: false,
  },
];

interface PricingSectionProps {
  plans?: PlanCard[];
}

export default function PricingSection({ plans }: PricingSectionProps) {
  const { access, authReady } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'subscription' | 'one_time'>('all');

  const safePlans = plans && plans.length > 0 ? plans : FALLBACK_PLANS;

  const filteredPlans = safePlans.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'subscription') return p.unit?.includes('kun') || p.name.includes('Bepul');
    if (filter === 'one_time') return p.unit?.includes('bir martalik') || p.name.includes('Bepul');
    return true;
  });

  return (
    <section id="narxlar" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      
      {/* Header — No pill badge */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Shaffof va Ochiq Narxlar
        </div>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Natijaga mos, <span className="text-emerald-600">hamyonbop tariflar</span>
        </h2>
        <p className="mt-4 text-sm text-slate-600 sm:text-base leading-relaxed">
          Kundalik mashqlar, arena va diagnostika mutlaqo bepul. Rasmiy to&apos;liq mock testlar va cheklovsiz AI Mentor uchun qulay tarifni tanlang.
        </p>

        {/* Filter Tab */}
        <div className="mt-8 inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => setFilter('subscription')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === 'subscription'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Obuna (1, 6 va 12 oylik)
          </button>
          <button
            onClick={() => setFilter('one_time')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === 'one_time'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bir martalik
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
        {filteredPlans.map((plan) => {
          const isPro = plan.highlight;

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                isPro
                  ? 'border-emerald-600 bg-white shadow-xl ring-2 ring-emerald-600/20 lg:-translate-y-2'
                  : 'border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-lg'
              }`}
            >
              {/* Ribbon */}
              {plan.ribbon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  {plan.ribbon}
                </div>
              )}

              <div>
                {/* Plan Name & Tag */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  {plan.perDay && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-700">
                      {plan.perDay}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-500 min-h-[36px]">
                  {plan.text}
                </p>

                {/* Price Display */}
                <div className="mt-4 border-y border-slate-100 py-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-black tracking-tight text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{plan.unit}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-2">
                <Button
                  asChild
                  className={`w-full rounded-xl font-bold text-xs h-11 transition-all ${
                    isPro
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Link href={plan.href}>
                    {plan.cta} <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Guarantee Note */}
      <div className="mt-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="size-4 text-emerald-600" />
        <span>100% xavfsiz to&apos;lov (Payme, Click va Uzum orqali). Yashirin to&apos;lovlar yo&apos;q.</span>
      </div>

    </section>
  );
}
