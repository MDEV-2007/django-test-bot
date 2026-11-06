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
        <div className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
          Oddiy va Shaffof Tariflar
        </div>
        <h2 className="mt-2.5 text-3xl font-bold tracking-[-0.03em] text-[#080808] sm:text-4xl md:text-5xl">
          Natijaga mos,{' '}
          <span className="bg-gradient-to-r from-[#7659C7] to-[#4C806B] bg-clip-text text-transparent">
            hamyonbop obuna
          </span>
        </h2>
        <p className="mt-4 text-sm text-[#6B6577] sm:text-base leading-relaxed">
          Kundalik mashqlar, arena va diagnostika mutlaqo bepul. Rasmiy to&apos;liq mock testlar va cheklovsiz AI Mentor uchun qulay tarifni tanlang.
        </p>

        {/* Authentic iOS UISegmentedControl */}
        <div className="mt-8 inline-flex items-center rounded-lg bg-[#767680]/12 p-1">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'subscription', label: 'Obuna (1, 6 va 12 oylik)' },
            { id: 'one_time', label: 'Bir martalik' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#080808] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                  : 'text-[#3D3846] hover:text-[#080808]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {/* Flex-wrap: oxirgi qatorda yolg'iz qolgan karta markazga tushadi */}
      <div className="mt-12 flex flex-wrap items-stretch justify-center gap-5">
        {filteredPlans.map((plan) => {
          const isPro = plan.highlight;

          return (
            <div
              key={plan.name}
              className={`relative flex w-full flex-col justify-between rounded-[32px] p-6 transition-all duration-200 sm:w-[calc(50%-10px)] sm:p-7 lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)] ${
                isPro
                  ? 'bg-[#080808] text-[#FFFCF7] shadow-[0_30px_60px_-30px_rgba(8,8,8,0.8)] lg:-translate-y-2 [&_h3]:!text-[#FFFCF7] [&_p]:!text-white/70 [&_li]:!text-white/85 [&_.font-mono]:!text-[#FFFCF7] [&_.border-y]:!border-white/10'
                  : 'bg-[#FFFCF7] shadow-[0_18px_40px_-24px_rgba(60,30,110,0.45)] hover:-translate-y-1'
              }`}
            >
              {plan.ribbon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7659C7] px-3.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-[0_4px_10px_rgba(118,89,199,0.3)] whitespace-nowrap">
                  {plan.ribbon}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#080808]">{plan.name}</h3>
                  {plan.perDay && (
                    <span className="rounded-full bg-[#4C806B]/12 px-2.5 py-0.5 text-[12px] font-mono font-bold text-[#3A6654]">
                      {plan.perDay}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#6B6577] min-h-[36px]">
                  {plan.text}
                </p>

                <div className="mt-4 border-y border-black/[0.06] py-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[34px] font-bold tracking-tight text-[#080808]">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#6B6577] font-medium">{plan.unit}</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-[#3D3846]">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#4C806B]/15 text-[#3A6654] mt-0.5">
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
                      ? 'bg-[#7659C7] hover:bg-[#5E45A8] text-white shadow-[0_6px_18px_rgba(118,89,199,0.32)]'
                      : 'bg-[#080808] hover:bg-[#1F1B26] text-white'
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

      <div className="mt-12 text-center text-xs text-[#6B6577] flex items-center justify-center gap-2">
        <ShieldCheck className="size-4 text-[#4C806B]" />
        <span>100% xavfsiz to&apos;lov (Payme, Click va Uzum orqali). Yashirin to&apos;lovlar yo&apos;q.</span>
      </div>
    </section>
  );
}
