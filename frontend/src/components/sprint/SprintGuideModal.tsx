'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Zap,
  Flame,
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Brain,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface SprintGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = 'flow' | 'mechanics' | 'hints';
type GuideItem = { icon: LucideIcon; tone: string; title: string; body: React.ReactNode };

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'flow', label: 'Tartib', icon: Clock },
  { key: 'mechanics', label: 'Mexanizm', icon: Flame },
  { key: 'hints', label: 'AI hintlar', icon: Lightbulb },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-md bg-[var(--ps-paper)] px-1.5 py-0.5 font-mono text-[11.5px] font-bold text-[var(--text-primary)]">{children}</kbd>
);

const CONTENT: Record<TabKey, GuideItem[]> = {
  flow: [
    {
      icon: BookOpen,
      tone: 'bg-[var(--ps-purple)] text-white',
      title: 'Fanni tanlang',
      body: <>Barcha fanlar aralashmasi (<b>AI Smart Mix</b>) yoki maxsus fan (Tarix, Ingliz tili va b.) ni belgilang.</>,
    },
    {
      icon: Clock,
      tone: 'bg-[var(--ps-orange)] text-[#080808]',
      title: 'Davomiylik va intensivlik',
      body: (
        <span className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[var(--ps-paper)] px-2.5 py-1 text-[12px] font-bold">10 savol · ~5 daq · isinish</span>
          <span className="rounded-full bg-[var(--ps-orange)] px-2.5 py-1 text-[12px] font-bold text-[#080808]">20 savol · ~10 daq · tavsiya</span>
          <span className="rounded-full bg-[var(--ps-paper)] px-2.5 py-1 text-[12px] font-bold">30 savol · ~15 daq · Deep Flow</span>
        </span>
      ),
    },
    {
      icon: Zap,
      tone: 'bg-[var(--ps-green)] text-white',
      title: 'Tezkor oqim va natija',
      body: <>Variantni bosing yoki klaviaturadan tez javob bering. Yakunda to&apos;plangan XP va oshgan DTM balingiz saqlanadi.</>,
    },
  ],
  mechanics: [
    {
      icon: Flame,
      tone: 'bg-[var(--ps-orange)] text-[#080808]',
      title: '2.0x combo va ko‘proq XP',
      body: <>Ketma-ket to&apos;g&apos;ri javoblarda combo ko&apos;paytirgich (1.5x va 2.0x) faollashadi — har to&apos;g&apos;ri javob uchun ko&apos;proq XP va tanga.</>,
    },
    {
      icon: TrendingUp,
      tone: 'bg-[var(--ps-purple)] text-white',
      title: 'Jonli DTM prognoz',
      body: <>Har to&apos;g&apos;ri javob DTM kirish imtihonidagi ehtimoliy balingizni real vaqtda o&apos;stiradi — natija jonli barometrda ko&apos;rinadi.</>,
    },
    {
      icon: Target,
      tone: 'bg-[var(--ps-coral)] text-white',
      title: 'AI qasos savoli',
      body: <>Xato qilgan mavzuingizni tizim eslab qoladi va bilimni mustahkamlash uchun test davomida qayta beradi.</>,
    },
  ],
  hints: [
    {
      icon: Lightbulb,
      tone: 'bg-[var(--ps-green)] text-white',
      title: 'AI tushuntirish va mnemonika',
      body: <>Savol ostidagi AI layfxak qoidalar va sanalarni oson eslab qolish yo&apos;lini ko&apos;rsatadi.</>,
    },
    {
      icon: Brain,
      tone: 'bg-[var(--ps-purple)] text-white',
      title: 'Aqlli daftar',
      body: <>Barcha xatolar avtomatik <b>Aqlli daftar</b>ga tushadi — istalgan vaqt ular ustida ishlab, tozalashingiz mumkin.</>,
    },
    {
      icon: ShieldCheck,
      tone: 'bg-[var(--ps-blue)] text-[#080808]',
      title: 'Klaviatura tugmalari',
      body: <>Kompyuterda <Kbd>1–4</Kbd> yoki <Kbd>A–D</Kbd> bilan javob tanlang, <Kbd>Enter</Kbd> bilan keyingisiga o&apos;ting.</>,
    },
  ],
};

export default function SprintGuideModal({ open, onOpenChange }: SprintGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('flow');

  const handleClose = () => {
    soundFX.click();
    tgHaptic('light');
    try {
      localStorage.setItem('ilm_sprint_guide_seen_v1', 'true');
    } catch {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ps-shell max-h-[92vh] w-[calc(100%-1rem)] max-w-xl gap-0 overflow-y-auto rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)] sm:w-full sm:p-0 dark:bg-[var(--ps-paper)]"
      >
        {/* Sarlavha — rangli lenta */}
        <div className="relative overflow-hidden bg-[var(--ps-purple)] px-6 pb-6 pt-6 text-white sm:px-8">
          <span aria-hidden className="absolute -right-10 -top-12 size-44 rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-10 -right-4 size-20 rounded-full bg-[var(--ps-orange)] opacity-80" />
          <span aria-hidden className="ps-dots absolute bottom-3 left-1/2 h-12 w-28 opacity-25" />
          <div className="relative flex items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
              <Zap className="size-5 fill-current" />
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider">Qo&apos;llanma</span>
          </div>
          <DialogTitle className="ps-display relative mt-4 text-[30px] text-white sm:text-[38px]">
            Tezkor test qanday ishlaydi?
          </DialogTitle>
          <DialogDescription className="relative mt-2 text-[13.5px] !text-white/85">
            10–15 daqiqada diqqatni jamlab ishlash tartibi, AI hintlar va rivojlanish mexanizmi.
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-7">
          {/* Tablar */}
          <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--ps-neutral)] p-1">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    soundFX.click();
                    setActiveTab(tab.key);
                  }}
                  className={cn(
                    'flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2.5 text-[12.5px] font-bold transition-all sm:text-[13px]',
                    active
                      ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className={cn('size-3.5 shrink-0', active && 'text-[var(--ps-orange)]')} />
                  <span><span className="hidden sm:inline">{i + 1}. </span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Kontent */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-4 space-y-2.5"
            >
              {CONTENT[activeTab].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3.5 rounded-[24px] bg-[var(--ps-neutral)] p-4">
                    <span className={cn('relative inline-flex size-11 shrink-0 items-center justify-center rounded-full', item.tone)}>
                      <Icon className="size-5" />
                      <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[10px] font-black text-[var(--text-primary)]">
                        {idx + 1}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-bold leading-tight">{item.title}</h4>
                      <div className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.body}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Pastki qism */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="order-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-muted)] sm:order-1">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--ps-green)]" />
              Tepadagi &quot;Qo&apos;llanma&quot; orqali qayta ochish mumkin
            </p>
            <button type="button" onClick={handleClose} className="ps-btn ps-btn-ink order-1 w-full shrink-0 sm:order-2 sm:w-auto">
              Tushundim, boshlaymiz
              <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
