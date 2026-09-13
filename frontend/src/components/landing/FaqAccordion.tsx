'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((curr) => (curr === index ? null : index));
  };

  return (
    <section id="savollar" className="mx-auto max-w-4xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      
      {/* Header — No pill badge */}
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Savol-Javoblar
        </div>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Ko&apos;p so&apos;raladigan savollar
        </h2>
        <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
          Platforma, rasmiy mock imtihonlar, baholash va to&apos;lovlar bo&apos;yicha eng muhim ma&apos;lumotlar.
        </p>
      </div>

      {/* Accordion List */}
      <div className="mt-12 space-y-3">
        {items.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                isOpen
                  ? 'border-emerald-300 bg-white shadow-md ring-1 ring-emerald-100'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm sm:text-base font-bold text-slate-900 cursor-pointer"
              >
                <span>{item.q}</span>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-emerald-50 text-emerald-700 border-emerald-200' : ''
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}
