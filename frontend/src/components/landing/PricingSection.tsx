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
    <section id="narxlar" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      {/* Sarlavha */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-text)]">
          <Zap className="size-3.5" />
          Hamyonbop va shaffof
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Natijaga yarasha <span className="text-[var(--accent-text)]">ochiq narxlar</span>
        </h2>
        <p className="mt-4 text-sm text-[var(--text-secondary)] sm:text-base">
          Asosiy mashqlar, arena va mini o&apos;yinlar har doim bepul. Rasmiy mock testlar va AI Mentor uchun arzon tarifni tanlang.
        </p>

        {/* Filtr tugmalari */}
        <div className="mt-8 inline-flex items-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/80 p-1 backdrop-blur-md">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[var(--accent)] text-black shadow-md'
                : 'text-[var(--text-secondary)] hover:text-foreground'
            }`}
          >
            Barcha rejalar
          </button>
          <button
            onClick={() => setFilter('subscription')}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'subscription'
                ? 'bg-[var(--accent)] text-black shadow-md'
                : 'text-[var(--text-secondary)] hover:text-foreground'
            }`}
          >
            Muddatli obuna (Tejamkor)
          </button>
          <button
            onClick={() => setFilter('one_time')}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === 'one_time'
                ? 'bg-[var(--accent)] text-black shadow-md'
                : 'text-[var(--text-secondary)] hover:text-foreground'
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
              className={`relative flex flex-col justify-between rounded-3xl border transition-all duration-300 ${
                isHighlight
                  ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/30 via-[var(--surface-card-soft)] to-[var(--surface-card-soft)] shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'border-[var(--border-card)] bg-[var(--surface-card-soft)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-card-medium)]/80'
              } p-6 sm:p-8`}
            >
              {p.ribbon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400 px-3.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-black shadow-lg">
                  {p.ribbon}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground sm:text-xl">{p.name}</h3>
                  {isHighlight && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <Sparkles className="size-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold text-foreground sm:text-4xl">
                    {p.price}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{p.unit}</span>
                </div>

                {p.perDay && (
                  <p className="mt-1 font-mono text-xs font-medium text-emerald-400">
                    {p.perDay}
                  </p>
                )}

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                  {p.text}
                </p>

                {/* Imkoniyatlar ro'yxati */}
                <div className="mt-6 border-t border-[var(--border-card)] pt-5">
                  <span className="text-xs font-semibold text-foreground">Tarif imkoniyatlari:</span>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
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
                  className={`w-full ${
                    isHighlight
                      ? 'bg-emerald-400 text-black hover:bg-emerald-300 font-bold shadow-lg shadow-emerald-500/20'
                      : ''
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

      {/* Kafolat va xavfsizlik nishoni */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-400" />
          <span>Payme va Click orqali 100% xavfsiz to&apos;lov</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="size-4 text-emerald-400" />
          <span>Yashirin to&apos;lovlar yo&apos;q, istalgan payt to&apos;xtatish mumkin</span>
        </div>
      </div>
    </section>
  );
}
