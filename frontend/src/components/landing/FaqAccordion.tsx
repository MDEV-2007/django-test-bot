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
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#007AFF]">
          Savol-Javoblar
        </div>
        <h2 className="mt-2.5 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl">
          Ko&apos;p so&apos;raladigan savollar
        </h2>
        <p className="mt-3 text-sm text-[#6C6C70] max-w-xl mx-auto">
          Platforma, rasmiy mock imtihonlar, baholash va to&apos;lovlar bo&apos;yicha eng muhim ma&apos;lumotlar.
        </p>
      </div>

      {/* iOS Inset Grouped Accordion List */}
      <div className="mt-10 overflow-hidden rounded-[28px] border border-black/[0.07] bg-white divide-y divide-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)]">
        {items.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={item.q} className="transition-colors">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 sm:px-6 text-left text-sm sm:text-[15px] font-bold text-[#1C1C1E] hover:bg-[#F2F2F7]/50 transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    isOpen
                      ? 'rotate-180 bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] text-[#6C6C70]'
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
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
