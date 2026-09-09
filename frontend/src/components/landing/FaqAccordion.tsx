'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <section id="savollar" className="mx-auto max-w-3xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          <HelpCircle className="size-3.5" />
          Savollarga javoblar
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ko&apos;p so&apos;raladigan savollar
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Platforma, imtihonlar va to&apos;lovlar haqida eng muhim ma&apos;lumotlar.
        </p>
      </div>

      <div className="mt-12 space-y-3.5">
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
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-slate-900 sm:text-base"
              >
                <span>{item.q}</span>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-emerald-50 text-emerald-700 border-emerald-200' : ''
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
