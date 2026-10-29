'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';

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
    "1v1 Arena va do'stlar bilan bellashuv",
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
      "Barcha to'liq mock testlar (cheklovsiz)",
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Mavzular kesimidagi chuqur tahlil',
      'Ovozli va darslik havolali izohlar',
      "30 kun to'liq foydalanish",
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
      "Barcha to'liq mock testlar (cheklovsiz)",
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Kutilayotgan DTM ball tahlili',
      "15 000 so'm/oy — 40% tejamkorlik",
      "Shaxsiy o'qish rejasi va diagnostika",
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
      "Barcha to'liq mock testlar (cheklovsiz)",
      'AI Mentor: kuniga 50 ta savol tahlili',
      'Kutilayotgan DTM ball tahlili',
      "12 500 so'm/oy — eng arzon narx",
      "365 kun to'liq foydalanish",
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
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#007AFF]">
          Oddiy va Shaffof Tariflar
        </div>
        <h2 className="mt-2.5 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl md:text-5xl">
          Natijaga mos,{' '}
          <span className="bg-gradient-to-r from-[#007AFF] to-[#34C759] bg-clip-text text-transparent">
            hamyonbop obuna
          </span>
        </h2>
        <p className="mt-4 text-sm text-[#6C6C70] sm:text-base leading-relaxed">
          Kundalik mashqlar, arena va diagnostika mutlaqo bepul. Rasmiy to&apos;liq mock testlar va cheklovsiz AI Mentor uchun qulay tarifni tanlang.
        </p>

        {/* Authentic iOS UISegmentedControl */}
        <div className="mt-8 inline-flex items-center rounded-[14px] bg-[#767680]/12 p-1">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'subscription', label: 'Obuna (1, 6 va 12 oylik)' },
            { id: 'one_time', label: 'Bir martalik' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`rounded-[10px] px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#1C1C1E] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                  : 'text-[#3A3A3C] hover:text-[#1C1C1E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
        {filteredPlans.map((plan) => {
          const isPro = plan.highlight;

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col justify-between rounded-[30px] border p-6 sm:p-7 transition-all duration-200 ${
                isPro
                  ? 'border-[#007AFF] bg-white shadow-[0_20px_50px_-10px_rgba(0,122,255,0.18)] ring-2 ring-[#007AFF]/20 lg:-translate-y-2'
                  : 'border-black/[0.07] bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_14px_34px_-6px_rgba(0,0,0,0.08)]'
              }`}
            >
              {plan.ribbon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#007AFF] px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_10px_rgba(0,122,255,0.3)] whitespace-nowrap">
                  {plan.ribbon}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#1C1C1E]">{plan.name}</h3>
                  {plan.perDay && (
                    <span className="rounded-full bg-[#34C759]/12 px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#248A3D]">
                      {plan.perDay}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#6C6C70] min-h-[36px]">
                  {plan.text}
                </p>

                <div className="mt-4 border-y border-black/[0.06] py-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-black tracking-tight text-[#1C1C1E]">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#6C6C70] font-medium">{plan.unit}</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-[#3A3A3C]">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#34C759]/15 text-[#248A3D] mt-0.5">
                        <Check className="size-3 stroke-[2.5]" />
                      </span>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-2">
                <Link
                  href={plan.href}
                  className={`ios-spring flex w-full items-center justify-center gap-1.5 rounded-full font-semibold text-xs h-11 ${
                    isPro
                      ? 'bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-[0_6px_18px_rgba(0,122,255,0.32)]'
                      : 'bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white'
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-xs text-[#6C6C70] flex items-center justify-center gap-2">
        <ShieldCheck className="size-4 text-[#34C759]" />
        <span>100% xavfsiz to&apos;lov (Payme, Click va Uzum orqali). Yashirin to&apos;lovlar yo&apos;q.</span>
      </div>
    </section>
  );
}
