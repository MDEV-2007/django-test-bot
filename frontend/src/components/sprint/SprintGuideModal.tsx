'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface SprintGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SprintGuideModal({ open, onOpenChange }: SprintGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'mechanics' | 'hints'>('flow');

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
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl sm:rounded-[28px] border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-2xl">
        <DialogHeader className="space-y-1.5 sm:space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-8 sm:size-9 rounded-xl bg-amber-500/15 text-amber-500 shadow-xs">
              <Zap className="size-4 sm:size-5 fill-amber-500" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Qo&apos;llanma &amp; Yo&apos;riqnoma
            </span>
          </div>

          <DialogTitle className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground">
            Tezkor Test qanday ishlaydi?
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            10–15 daqiqada diqqatni jamlab, testlarni tezkor ishlash tartibi, AI hintlar va rivojlanish mexanizmi:
          </p>
        </DialogHeader>

        {/* 3 ta Kategoriya Tablari (Responsive: no awkward wrapping) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl sm:rounded-2xl border border-border/60 my-1.5 sm:my-2">
          <button
            type="button"
            onClick={() => {
              soundFX.click();
              setActiveTab('flow');
            }}
            className={cn(
              'py-2 px-1 sm:px-2.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap select-none',
              activeTab === 'flow'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="size-3 sm:size-3.5 text-primary shrink-0" />
            <span>1. Tartib</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.click();
              setActiveTab('mechanics');
            }}
            className={cn(
              'py-2 px-1 sm:px-2.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap select-none',
              activeTab === 'mechanics'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Flame className="size-3 sm:size-3.5 text-amber-500 shrink-0" />
            <span>2. Mexanizm</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.click();
              setActiveTab('hints');
            }}
            className={cn(
              'py-2 px-1 sm:px-2.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap select-none',
              activeTab === 'hints'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Lightbulb className="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
            <span>3. AI Hintlar</span>
          </button>
        </div>

        {/* TAB 1: ISHLASH TARTIBI */}
        {activeTab === 'flow' && (
          <div className="space-y-2.5 sm:space-y-3 py-1 text-xs sm:text-sm">
            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-accent/30 border border-border/80">
              <div className="size-7 sm:size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm">
                1
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm">Fanni tanlang</h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Barcha fanlar aralashmasi (<b>AI Smart Mix</b>) yoki maxsus fan (Tarix, Ingliz tili va b.) ni belgilang.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-accent/30 border border-border/80">
              <div className="size-7 sm:size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm">
                2
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm">Davomiylik va intensivlik</h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  <b>10 ta savol (~5 daq)</b>: Tezkor isinish mashqi.<br />
                  <b>20 ta savol (~10 daq)</b>: Optimal o&apos;quv zanjiri (Tavsiya etiladi).<br />
                  <b>30 ta savol (~15 daq)</b>: Chuqur diqqat (Deep Flow).
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-accent/30 border border-border/80">
              <div className="size-7 sm:size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm">
                3
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm">Tezkor oqim va natija</h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Savollarga variantlarni bosish yoki klaviatura orqali tezda javob bering. Yakunda to&apos;plangan XP va oshgan DTM balingiz saqlanadi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ISHLASH MEXANIZMI */}
        {activeTab === 'mechanics' && (
          <div className="space-y-2.5 sm:space-y-3 py-1 text-xs sm:text-sm">
            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div className="size-7 sm:size-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Flame className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>2.0x Combo &amp; Ko&apos;proq XP</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Ketma-ket to&apos;g&apos;ri javob berganingizda Combo ko&apos;paytirgich faollashadi (1.5x va 2.0x). Har bir to&apos;g&apos;ri javob uchun ikki barobar ko&apos;p XP va tanga olasiz!
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="size-7 sm:size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <TrendingUp className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Jonli DTM Prognoz (+0.2 ball)</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Har bir to&apos;g&apos;ri javob real vaqt rejimida DTM kirish imtihoni ehtimoliy balingizni o&apos;stiradi. Natijangiz jonli barometrda aks etadi.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="size-7 sm:size-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Target className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>0.2s AI Qasos Savoli (Revenge)</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Agar biron savolda xatoga yo&apos;l qo&apos;ysangiz, tizim bu mavzuni eslab qoladi va test davomida bilimingizni mustahkamlash uchun yana qaytarib beradi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HINTLAR VA LAYFXAKLAR */}
        {activeTab === 'hints' && (
          <div className="space-y-2.5 sm:space-y-3 py-1 text-xs sm:text-sm">
            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="size-7 sm:size-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <Lightbulb className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>AI Tushuntirish &amp; Mnemonika</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Savol ostidagi AI layfxak orqali qoidalar va sanalarni oson eslab qolish yo&apos;llarini ko&apos;rishingiz mumkin.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="size-7 sm:size-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                <Brain className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Aqlli Daftar sinxronizatsiyasi</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Barcha xatolar avtomatik profilingizdagi <b>Aqlli Daftar</b>ga tushadi, shunda istalgan vaqt xatolar ustida ishlab, ularni tozalashingiz mumkin.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20">
              <div className="size-7 sm:size-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Klaviatura Tezkor Tugmalari</span>
                </h4>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Desktopda <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] sm:text-[11px] font-mono">1-4</kbd> yoki <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] sm:text-[11px] font-mono">A-D</kbd> orqali javoblarni tezkor tanlashingiz va <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] sm:text-[11px] font-mono">Enter</kbd> bosishingiz mumkin.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pastki Harakat Tugmasi (Responsive: Clean button and helper tip) */}
        <div className="pt-3 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center justify-between border-t border-border/70 mt-2 sm:mt-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 order-2 sm:order-1">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span className="leading-tight">Istalgan vaqt tepadagi <b>&quot;Qo&apos;llanma&quot;</b> orqali qayta ochishingiz mumkin</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto shrink-0 whitespace-nowrap px-6 py-3 sm:py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs sm:text-sm hover:opacity-90 shadow-md shadow-primary/25 transition-all cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-[0.99]"
          >
            <span>Tushundim, Boshlaymiz!</span>
            <ArrowRight className="size-4 shrink-0" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
