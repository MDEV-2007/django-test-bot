'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap, ArrowRight, Shield } from 'lucide-react';
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
  name: 'Bepul',
  price: '0',
  unit: "so'm",
  text: "Kundalik mashq testlari, arena, mini o'yinlar, reyting va asosiy tahlil.",
  features: ['Mashq testlari', '1v1 Arena', 'Kunlik missiyalar', 'Reyting va yutuqlar', 'AI Mentor (kuniga 5 ta savol)'],
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
    perDay: "≈ 833 so'm/kun",
    text: "Barcha mock testlar va kengaytirilgan AI Mentor. Istalgan vaqtda to'xtatasiz.",
    features: ['Barcha mock testlar — cheklovsiz kirish', 'AI Mentor: kuniga 50 savol', '30 kun amal qiladi'],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: false,
  },
  {
    name: 'PRO — 6 oylik',
    price: '90 000',
    unit: "so'm / 180 kun",
    perDay: "≈ 500 so'm/kun",
    ribbon: 'TAVSIYA ETAMIZ',
    text: "Milliy sertifikat imtihoniga to'liq tayyorgarlik davri uchun.",
    features: [
      'Barcha mock testlar — cheklovsiz kirish',
      'AI Mentor: kuniga 50 savol',
      "15 000 so'm/oy — oylikka nisbatan 40% arzon",
    ],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: true,
  },
  {
    name: 'PRO — 12 oylik',
    price: '150 000',
    unit: "so'm / 365 kun",
    perDay: "≈ 411 so'm/kun",
    ribbon: 'ENG PAST OYLIK NARX',
    text: "Eng past oylik narx. Butun o'quv yili davomida amal qiladi.",
    features: [
      'Barcha mock testlar — cheklovsiz kirish',
      'AI Mentor: kuniga 50 savol',
      "12 500 so'm/oy — eng past oylik narx",
    ],
    cta: 'Obunani boshlash',
    href: '/premium',
    highlight: false,
  },
  {
    name: 'Mock test — bir martalik',
    price: '15 000',
    unit: "so'm (bir martalik)",
    text: "Bitta to'lov, muddatsiz kirish. AI Mentor chegarasi obunasiz darajada qoladi.",
    features: ['Barcha rasmiy mock testlar', 'Muddatsiz kirish', 'AI natija tahlili'],
    cta: 'Mock testni ochish',
    href: '/premium',
    highlight: false,
  },
];

interface PricingSectionProps {
  plans?: PlanCard[];
}

export default function PricingSection({ plans }: PricingSectionProps) {
  const { access, authReady } = useAuthStore();
  const loggedIn = authReady && !!access;
  const [filter, setFilter] = useState<'all' | 'subscription' | 'one_time'>('all');

  const safePlans = plans && plans.length > 0 ? plans : FALLBACK_PLANS;

  const filteredPlans = safePlans.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'subscription') return p.unit?.includes('kun') || p.name === 'Bepul';
    if (filter === 'one_time') return p.unit?.includes('bir martalik') || p.name === 'Bepul';
    return true;
  });

  return (
    <section id="narxlar" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
      {/* Sarlavha */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          <Zap className="size-3.5" />
          Shaffof va hamyonbop
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Natijaga mos <span className="text-emerald-600">ochiq narxlar</span>
        </h2>
        <p className="mt-4 text-sm text-slate-600 sm:text-base">
          Mashq testlari, arena va mini o&apos;yinlar bepul. To&apos;liq mock testlar va AI Mentor uchun arzon tarifni tanlang.
        </p>

        {/* Filtr tugmalari */}
        <div className="mt-8 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barcha rejalar
          </button>
          <button
            onClick={() => setFilter('subscription')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'subscription'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Muddatli obuna (Tejamkor)
          </button>
          <button
            onClick={() => setFilter('one_time')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'one_time'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bir martalik
          </button>
        </div>
      </div>

      {/* Tarif kartalari */}
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.map((p) => {
          const isHighlight = p.highlight;

          return (
            <div
              key={p.name}
              className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border transition-all duration-300 ${
                isHighlight
                  ? 'border-2 border-emerald-500 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-lg'
              } p-6 sm:p-8`}
            >
              {p.ribbon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  {p.ribbon}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{p.name}</h3>
                  {isHighlight && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Sparkles className="size-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold text-slate-900 sm:text-4xl">
                    {p.price}
                  </span>
                  <span className="text-xs text-slate-500">{p.unit}</span>
                </div>

                {p.perDay && (
                  <p className="mt-1 font-mono text-xs font-medium text-emerald-700">
                    {p.perDay}
                  </p>
                )}

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600">
                  {p.text}
                </p>

                {/* Imkoniyatlar ro'yxati */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <span className="text-xs font-semibold text-slate-900">Tarif imkoniyatlari:</span>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-slate-600">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                {(() => {
                  const targetHref = loggedIn
                    ? p.href
                    : p.href.startsWith('/premium')
                      ? `/register?next=${encodeURIComponent(p.href)}`
                      : p.href;
                  return (
                    <Button
                      asChild
                      variant={isHighlight ? 'default' : 'outline'}
                      size="lg"
                      className={`w-full rounded-full ${
                        isHighlight
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md'
                          : 'border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <Link href={targetHref}>
                        {p.cta} <ArrowRight className="size-4 ml-1.5" />
                      </Link>
                    </Button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Xavfsizlik kafolati */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-600" />
          <span>Payme va Click orqali 100% xavfsiz to&apos;lov</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="size-4 text-emerald-600" />
          <span>Yashirin to&apos;lovlar yo&apos;q, istalgan vaqtda to&apos;xtatish mumkin</span>
        </div>
      </div>
    </section>
  );
}
