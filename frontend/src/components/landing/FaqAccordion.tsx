'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AEO_FAQ_ITEMS, type FaqItem } from '@/lib/faq-data';

export type { FaqItem };

interface FaqAccordionProps {
  items?: FaqItem[];
}

export default function FaqAccordion({ items = AEO_FAQ_ITEMS }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((curr) => (curr === index ? null : index));
  };

  const activeItems = items && items.length > 0 ? items : AEO_FAQ_ITEMS;

  return (
    <section id="savollar" aria-label="Ko'p so'raladigan savollar" className="mx-auto max-w-4xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
          Savol-Javoblar
        </div>
        <h2 className="mt-2.5 text-3xl font-bold tracking-[-0.03em] text-[#080808] sm:text-4xl">
          Ko&apos;p so&apos;raladigan savollar
        </h2>
        <p className="mt-3 text-sm text-[#6B6577] max-w-xl mx-auto">
          Platforma, rasmiy mock imtihonlar, baholash va to&apos;lovlar bo&apos;yicha eng muhim ma&apos;lumotlar.
        </p>
      </div>

      {/* iOS Inset Grouped Accordion List - SSR HTML DOM da doim mavjud */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-black/[0.07] bg-white divide-y divide-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)]">
        {activeItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={item.q} className="transition-colors">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 sm:px-6 text-left text-sm sm:text-[15px] font-bold text-[#080808] hover:bg-[#F7F4EF]/50 transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    isOpen
                      ? 'rotate-180 bg-[#7659C7] text-white'
                      : 'bg-[#F7F4EF] text-[#6B6577]'
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              {/* DOM da doim mavjud bo'lgan javob bloki — crawlerlar uchun to'liq ochiq */}
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
                aria-hidden={!isOpen}
              >
                <div className="overflow-hidden">
                  <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
