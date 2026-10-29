'use client';

import Link from 'next/link';
import { Flame, Snowflake, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import type { Profile } from '@/lib/auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

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

  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const todayStr = now.toISOString().split('T')[0];
  const isDoneToday = user.last_active_date === todayStr;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] overflow-hidden rounded-[32px] border border-border bg-card p-6 text-card-foreground shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div className="mb-1">
            <PremiumIcon icon={Flame} tone="amber" size="xl" solid />
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-[-0.025em] text-foreground">
            {streak} kunlik <span className="text-[#FF9500]">Olov!</span>
          </DialogTitle>

          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-xs">
            {isDoneToday
              ? 'Bugungi vazifangiz bajarildi! Olovingiz xavfsiz holatda saqlandi.'
              : "Bugun hali mashq qilmadingiz. Olovingiz o'chib qolmasligi uchun 1 ta test yeching!"}
          </p>
        </DialogHeader>

        {/* 7 Kunlik Haftalik Taqvim */}
        <div className="my-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
            <span>Haftalik davomat</span>
            <span className={isDoneToday ? 'text-[#34C759]' : 'text-[#FF9500]'}>
              {isDoneToday ? 'Bugun: Bajarildi ✓' : 'Bugun: Kutilmoqda'}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 rounded-[22px] border border-border bg-muted/45 p-2.5 text-center">
            {WEEKDAYS.map((day, idx) => {
              const isPast = idx < dayOfWeek;
              const isToday = idx === dayOfWeek;
              const active = (isPast && streak > dayOfWeek - idx) || (isToday && isDoneToday);

              return (
                <div key={day.key} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">{day.label}</span>
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-[12px] text-xs font-bold transition-all',
                      active
                        ? 'bg-gradient-to-b from-[#FF9F0A] to-[#FF9500] text-white shadow-[0_4px_10px_rgba(255,149,0,0.3)]'
                        : isToday
                        ? 'border-2 border-dashed border-[#FF9500] bg-[#FF9500]/10 text-[#FF9500]'
                        : 'border border-border bg-card text-muted-foreground/40'
                    )}
                  >
                    {active ? (
                      <Check className="size-4 stroke-[2.6]" />
                    ) : isToday ? (
                      <Flame className="size-4" />
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
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-primary/20 bg-primary/8 p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <PremiumIcon icon={Snowflake} tone="sky" size="sm" solid />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {freezeCount > 0 ? `${freezeCount} ta muzlatish mavjud` : 'Muzlatish mavjud emas'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {freezeCount > 0
                  ? 'Kira olmagan kuningizda olov avtomatik saqlanadi.'
                  : 'Streak uzilishidan himoya qilish uchun oling.'}
              </p>
            </div>
          </div>

          <Link
            href="/shop/inventory"
            onClick={() => onOpenChange(false)}
            className="ios-spring shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-2xs"
          >
            <ShoppingBag className="size-3.5" />
            <span>Olish</span>
          </Link>
        </div>

        {/* CTA Button */}
        <div className="mt-4">
          {!isDoneToday ? (
            <Link
              href="/tests"
              onClick={() => onOpenChange(false)}
              className="ios-spring w-full h-12 rounded-full bg-gradient-to-r from-[#FF9500] to-[#FF7A00] font-extrabold text-sm text-white shadow-[0_8px_22px_rgba(255,149,0,0.35)] flex items-center justify-center gap-2"
            >
              <Flame className="size-4 fill-white" />
              <span>Bugungi testni yechish</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ios-spring w-full h-11 rounded-full bg-muted hover:bg-muted/80 font-bold text-sm text-foreground cursor-pointer"
            >
              Yopish
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
