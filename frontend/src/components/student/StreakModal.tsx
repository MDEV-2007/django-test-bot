'use client';

import Link from 'next/link';
import { Flame, Snowflake, Check, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { Profile } from '@/lib/auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
}

const WEEKDAYS = [
  { key: 'mon', label: 'Du' },
  { key: 'tue', label: 'Se' },
  { key: 'wed', label: 'Ch' },
  { key: 'thu', label: 'Pa' },
  { key: 'fri', label: 'Ju' },
  { key: 'sat', label: 'Sh' },
  { key: 'sun', label: 'Ya' },
];

export default function StreakModal({ open, onOpenChange, user }: StreakModalProps) {
  if (!user) return null;

  const streak = user.streak || 0;
  const freezeCount = user.freeze_count || 0;

  // Hafta kunini hisoblash (0: Dushanba ... 6: Yakshanba)
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Dushanbani 0 qilish

  // Bugun faol bo'lganmi? (agar last_active_date bugun bo'lsa)
  const todayStr = now.toISOString().split('T')[0];
  const isDoneToday = user.last_active_date === todayStr;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-6 border border-[var(--border-card)] bg-[var(--surface-card-soft)] sm:rounded-3xl">
        <DialogHeader className="flex flex-col items-center text-center">
          {/* Animated Flame Icon Container */}
          <div className="relative mb-3 flex size-20 items-center justify-center rounded-3xl border border-[var(--tone-streak)]/30 bg-[var(--tone-streak-soft)] shadow-lg shadow-[var(--tone-streak)]/20">
            <Flame className="size-10 text-[var(--tone-streak-text)] animate-flame-pulse" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[var(--tone-streak)]/10 blur-xl" />
          </div>

          <DialogTitle className="font-voice text-3xl font-black text-[var(--text-primary)]">
            {streak} kunlik <span className="text-[var(--tone-streak-text)]">Olov!</span>
          </DialogTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            {isDoneToday
              ? "Bugungi vazifangiz bajarildi! Olovingiz xavfsiz holatda saqlandi."
              : "Bugun hali mashq qilmadingiz. Olovingiz o'chib qolmasligi uchun 1 ta test yeching!"}
          </p>
        </DialogHeader>

        {/* 7 Kunlik Haftalik Taqvim */}
        <div className="my-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Haftalik davomat</span>
            <span>{isDoneToday ? 'Bugun: Bajarildi' : 'Bugun: Kutilmoqda'}</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-2.5 text-center">
            {WEEKDAYS.map((day, idx) => {
              const isPast = idx < dayOfWeek;
              const isToday = idx === dayOfWeek;
              const isFuture = idx > dayOfWeek;

              const active = (isPast && streak > (dayOfWeek - idx)) || (isToday && isDoneToday);

              return (
                <div key={day.key} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">{day.label}</span>
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'border border-[var(--tone-streak)]/40 bg-[var(--tone-streak-soft)] text-[var(--tone-streak-text)] shadow-sm'
                        : isToday
                        ? 'border-2 border-dashed border-[var(--tone-streak)]/60 bg-[var(--surface-hover)] text-[var(--tone-streak-text)] animate-pulse'
                        : 'border border-[var(--border-soft)] bg-[var(--surface-hover)] text-muted-foreground/40'
                    }`}
                  >
                    {active ? (
                      <Flame className="size-4 fill-current" />
                    ) : isToday ? (
                      <span className="text-[11px]">Bugun</span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak Muzlatish (Freeze) Bloki */}
        <Card className="border-sky-500/25 bg-sky-500/[0.06] shadow-none">
          <CardContent className="flex items-center justify-between gap-3 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
                <Snowflake className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {freezeCount > 0 ? `${freezeCount} ta muzlatish mavjud` : 'Muzlatish mavjud emas'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {freezeCount > 0
                    ? "Kira olmagan kuningizda olov avtomatik saqlanadi."
                    : "Streak uzilishidan himoya qilish uchun oling."}
                </p>
              </div>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="shrink-0 h-8 rounded-lg border-sky-500/30 text-xs font-semibold text-sky-600 dark:text-sky-300 hover:bg-sky-500/15"
            >
              <Link href="/shop/inventory">
                <ShoppingBag className="size-3.5" /> Olish
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <div className="mt-5">
          {!isDoneToday ? (
            <Button
              asChild
              size="lg"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-2xl bg-gradient-to-r from-[var(--tone-streak)] to-orange-500 font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-500"
            >
              <Link href="/tests" className="flex items-center justify-center gap-2">
                <Flame className="size-4" /> Bugungi testni yechish <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-2xl border-[var(--border-card)] font-bold text-muted-foreground"
            >
              Yopish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
