'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface PricingSectionProps {
  plans: PlanCard[];
}

export default function PricingSection({ plans }: PricingSectionProps) {
  const [filter, setFilter] = useState<'all' | 'subscription' | 'one_time'>('all');

  const filteredPlans = plans.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'subscription') return p.unit.includes('kun') || p.name === 'Bepul';
    if (filter === 'one_time') return p.unit.includes('bir martalik') || p.name === 'Bepul';
    return true;
  });

  return (
    <section id="narxlar" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
      {/* Sarlavha */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
          <Zap className="size-3.5" />
          Shaffof va hamyonbop
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Natijaga mos <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">ochiq narxlar</span>
        </h2>
        <p className="mt-4 text-sm text-zinc-400 sm:text-base">
          Mashq testlari, arena va mini o&apos;yinlar bepul. To&apos;liq mock testlar va AI Mentor uchun arzon tarifni tanlang.
        </p>

        {/* Filtr tugmalari */}
        <div className="mt-8 inline-flex items-center rounded-full border border-white/[0.08] bg-[#0c0e14]/80 p-1 backdrop-blur-xl">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Barcha rejalar
          </button>
          <button
            onClick={() => setFilter('subscription')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'subscription'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Muddatli obuna (Tejamkor)
          </button>
          <button
            onClick={() => setFilter('one_time')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'one_time'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
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
                  ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/25 via-[#0c0e14]/90 to-[#0c0e14]/90 shadow-[0_12px_40px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                  : 'border-white/[0.08] bg-[#0c0e14]/75 hover:border-white/[0.16] hover:bg-[#0f121a]'
              } p-6 sm:p-8 backdrop-blur-xl`}
            >
              {p.ribbon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-3.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black shadow-lg">
                  {p.ribbon}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white sm:text-xl">{p.name}</h3>
                  {isHighlight && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <Sparkles className="size-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold text-white sm:text-4xl">
                    {p.price}
                  </span>
                  <span className="text-xs text-zinc-400">{p.unit}</span>
                </div>

                {p.perDay && (
                  <p className="mt-1 font-mono text-xs font-medium text-emerald-400">
                    {p.perDay}
                  </p>
                )}

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-zinc-300">
                  {p.text}
                </p>

                {/* Imkoniyatlar ro'yxati */}
                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <span className="text-xs font-semibold text-white">Tarif imkoniyatlari:</span>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-zinc-300">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Button
                  asChild
                  variant={isHighlight ? 'default' : 'outline'}
                  size="lg"
                  className={`w-full rounded-full ${
                    isHighlight
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-black hover:brightness-110 font-bold shadow-lg shadow-emerald-500/25 border border-emerald-300/40'
                      : 'border-white/10 hover:bg-white/[0.06] text-white'
                  }`}
                >
                  <Link href={p.href}>
                    {p.cta} <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Xavfsizlik kafolati */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-400" />
          <span>Payme va Click orqali 100% xavfsiz to&apos;lov</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="size-4 text-emerald-400" />
          <span>Yashirin to&apos;lovlar yo&apos;q, istalgan vaqtda to&apos;xtatish mumkin</span>
        </div>
      </div>
    </section>
  );
}
