'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { motion, useReducedMotion } from 'motion/react';
import { PartyPopper, Flame, Sprout, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { soundFX } from '@/lib/soundFX';
import { springBouncy } from '@/lib/motion';

/* Nishonlash lahzalari.

   Qoida: KAM va KUTILMAGAN bo'lsin. Har safar chiqadigan tabrik qiymatini yo'qotadi,
   shuning uchun faqat uch hodisa nishonlanadi: daraja oshishi, streak bosqichi
   (7/14/30/100 kun) va birinchi yakunlangan test. Har biri bir marta — allaqachon
   nishonlangani localStorage da belgilanadi (server holatiga tegmaydi). */

const KEY_LEVEL = 'ilm_celebrated_level';
const KEY_STREAK = 'ilm_celebrated_streak';
const KEY_FIRST = 'ilm_celebrated_first_test';
const STREAK_MILESTONES = [7, 14, 30, 100];

type Moment = { icon: 'level' | 'streak' | 'first'; title: string; body: string };

export default function Celebration({
  level, streak, completedAttempts,
}: { level: number; streak: number; completedAttempts: number }) {
  const [moment, setMoment] = useState<Moment | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seenLevel = Number(localStorage.getItem(KEY_LEVEL) || '0');
    const seenStreak = Number(localStorage.getItem(KEY_STREAK) || '0');
    const seenFirst = localStorage.getItem(KEY_FIRST) === '1';

    // Birinchi ochilishda "sun'iy" tabrik chiqmasligi uchun boshlang'ich holat
    // shunchaki yozib qo'yiladi — nishonlash faqat KEYINGI o'sishda bo'ladi.
    if (!localStorage.getItem(KEY_LEVEL)) {
      localStorage.setItem(KEY_LEVEL, String(level));
      localStorage.setItem(KEY_STREAK, String(streak));
      if (completedAttempts > 0) localStorage.setItem(KEY_FIRST, '1');
      return;
    }

    let next: Moment | null = null;

    if (level > seenLevel) {
      next = {
        icon: 'level',
        title: `${level}-daraja ochildi!`,
        body: 'Bilim ildizingiz chuqurlashdi. Yangi daraja — yangi imkoniyat.',
      };
      localStorage.setItem(KEY_LEVEL, String(level));
    } else if (!seenFirst && completedAttempts > 0) {
      next = {
        icon: 'first',
        title: 'Birinchi test yakunlandi!',
        body: 'Eng qiyin qadam ortda. Endi tizim sizning kuchli va zaif tomonlaringizni ko\'rsata boshlaydi.',
      };
      localStorage.setItem(KEY_FIRST, '1');
    } else {
      const hit = STREAK_MILESTONES.find((m) => streak >= m && seenStreak < m);
      if (hit) {
        next = {
          icon: 'streak',
          title: `${hit} kunlik uzluksizlik!`,
          body: 'Har kuni ozgina — eng kuchli strategiya. Shu ritmni saqlang.',
        };
      }
      localStorage.setItem(KEY_STREAK, String(streak));
    }

    if (!next) return;
    setMoment(next);
    soundFX.fanfare();
    if (!reduce) {
      try {
        celebrate({ particleCount: 120, spread: 75, origin: { y: 0.35 } });
      } catch { /* noop */ }
    }
  }, [level, streak, completedAttempts, reduce]);

  if (!moment) return null;

  const Icon = moment.icon === 'streak' ? Flame : moment.icon === 'level' ? Sprout : PartyPopper;
  const tone = moment.icon === 'streak'
    ? 'border-amber-500/35 bg-amber-500/[0.08] text-amber-300'
    : 'border-[var(--accent-border)] bg-primary/[0.08] text-[var(--accent-text)]';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springBouncy}
    >
      <Card className={tone}>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-hover)]">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-voice text-lg font-bold">{moment.title}</p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{moment.body}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMoment(null)} aria-label="Yopish">
            <X className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
