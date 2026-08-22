'use client';

import { Star } from 'lucide-react';
import type { Cosmetics } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

/* Do'kondan olingan NISHON — ism yonida turadigan kichik belgi.
 *
 * Mahsulot ma'lumotida faqat rang bo'ladi (`{"color": "#f7c948"}`), shakl esa bir xil
 * yulduz: nishonning vazifasi — ism yonida ko'zga tashlanadigan, lekin ismni bosib
 * ketmaydigan belgi berish. Nishon taqilmagan bo'lsa hech narsa chizilmaydi. */
export default function CosmeticBadge({
  cosmetics,
  className,
}: {
  cosmetics?: Cosmetics;
  className?: string;
}) {
  const badge = cosmetics?.badge;
  const color = badge?.payload?.color;
  if (!badge || !color) return null;

  return (
    <Star
      className={cn('size-3.5 shrink-0', className)}
      style={{ color, fill: color }}
      aria-label={badge.name}
    />
  );
}
