'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame, Volume2, FileSpreadsheet, Clock, ShieldAlert,
  Sparkles, CheckCircle2, ArrowRight, Loader2, AlertTriangle, BookOpen,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

type SubjectItem = {
  id: number;
  name: string;
  slug: string;
};

type BmbStressLaunchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects?: SubjectItem[];
  preselectedTestId?: number | null;
  preselectedTitle?: string | null;
};

export default function BmbStressLaunchModal({
  open,
  onOpenChange,
  subjects = [],
  preselectedTestId = null,
  preselectedTitle = null,
}: BmbStressLaunchModalProps) {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    try {
      const payload: { test_id?: number; subject_slug?: string } = {};
      if (preselectedTestId) {
        payload.test_id = preselectedTestId;
      } else if (selectedSubject !== 'all') {
        payload.subject_slug = selectedSubject;
      }

      const res = await apiFetch<{ attempt_id: number; mode?: string; is_stress_mode?: boolean }>(
        '/api/tests/start-stress/',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      toast.success("Imtihon zali eshiklari ochildi! Omad!", { duration: 3000 });
      onOpenChange(false);
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-2 border-rose-500/40 bg-card">
        {/* Exciting Stress Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 text-white space-y-2 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Flame className="size-48 text-rose-500" />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-rose-600">
              <Flame className="size-4 text-white animate-pulse" />
            </span>
            <Badge className="bg-rose-500 text-white font-bold tracking-wider text-[12px] uppercase">
              HARDCORE EXAM SIMULATOR
            </Badge>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            🔥 Real BMB Imtihon Zali (Stress Mode)
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-300">
            Uyda yumshoq divanda 80% to&apos;plash oson. Haqiqiy imtihon zalining 500 kishilik bosimi va Titul varaqasida qo&apos;l qaltirashiga tayyormisiz?
          </DialogDescription>
        </div>

        {/* 3 Main Hardcore Features & Subject Selector (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <Volume2 className="size-4 shrink-0" />
                <span>Audio-bosim</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Parta g&apos;ichirlashi, odamlar yo&apos;talishi, qog&apos;oz shitirlashi va nazoratchi ovozi.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <FileSpreadsheet className="size-4 shrink-0" />
                <span>Titul Varaqasi</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Javoblarni titulga bo&apos;yash shart! 10 daqiqa qolganda ulgurmasangiz — javoblar kuyadi!
              </p>
            </div>

            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Sparkles className="size-4 shrink-0" />
                <span>+50% Bonus XP</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Stressga bardosh bergan haqiqiy abituriyentlarga qo&apos;shimcha 1.5x XP mukofoti!
              </p>
            </div>
          </div>

          {/* Subject or Test Selection */}
          {preselectedTestId ? (
            <div className="p-3 rounded-xl bg-accent/40 border border-border">
              <p className="text-xs text-muted-foreground">Tanlangan Test:</p>
              <p className="text-sm font-bold text-foreground">{preselectedTitle || 'Rasmiy Test'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Imtihon Fanini Tanlang:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                    selectedSubject === 'all'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  🎯 Barcha fanlar (Aralash)
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubject(s.slug)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold truncate transition-all cursor-pointer ${
                      selectedSubject === s.slug
                        ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    📚 {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DTM Warning note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Maslahat:</strong> Quloqchin (naushnik) taqib kirish tavsiya etiladi. Imtihon boshlangach, fon shovqini to&apos;g&apos;ridan-to&apos;g&apos;ri boshlanadi!
            </p>
          </div>
        </div>

        {/* Modal Footer (Pinned at bottom) */}
        <DialogFooter className="p-3 sm:p-4 bg-muted/40 border-t border-border flex items-center justify-between sm:justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={starting}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Bekor qilish
          </Button>

          <Button
            onClick={handleStart}
            disabled={starting}
            className="text-xs font-bold px-6 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 h-10"
          >
            {starting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Flame className="size-4 mr-2" />}
            Zalga Kirish va Boshlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
