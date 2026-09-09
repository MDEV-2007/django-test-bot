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
    <section id="savollar" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-text)]">
          <HelpCircle className="size-3.5" />
          Savollarga javoblar
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Ko&apos;p so&apos;raladigan savollar
        </h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
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
                  ? 'border-[var(--accent-border)] bg-[var(--surface-card-medium)] shadow-lg'
                  : 'border-[var(--border-card)] bg-[var(--surface-card-soft)] hover:border-[var(--border-card)]/80 hover:bg-[var(--surface-card-soft)]/90'
              }`}
            >
              <button
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-foreground sm:text-base"
              >
                <span>{item.q}</span>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--surface-input)] text-[var(--accent-text)] transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-[var(--accent-soft)]' : ''
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
                    <div className="border-t border-[var(--border-card)]/60 px-5 pb-5 pt-3 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
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
