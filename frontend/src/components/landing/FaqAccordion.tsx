'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, Send, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=faq';

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((curr) => (curr === index ? null : index));
  };

  return (
    <section id="savollar" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14 items-start">
        {/* Chap ustun: Sticky sarlavha va qo'shimcha havolalar */}
        <div className="lg:col-span-4 lg:sticky lg:top-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <HelpCircle className="size-3.5" />
            FAQ & Yordam
          </span>
          <h2 className="font-voice mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Ko&apos;p so&apos;raladigan savollar
          </h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Platforma, mock testlar, baholash tizimi va to&apos;lovlar haqida eng ko&apos;p beriladigan savollarga javoblar.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-600 transition-colors"
            >
              <Send className="size-3.5 text-sky-600" />
              Telegram bot orqali savol berish <ArrowRight className="size-3" />
            </a>
          </div>
        </div>

        {/* O'ng ustun: Akkordeon ro'yxati */}
        <div className="lg:col-span-8 space-y-3.5">
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
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-bold text-slate-900 sm:text-base"
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
                      <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
