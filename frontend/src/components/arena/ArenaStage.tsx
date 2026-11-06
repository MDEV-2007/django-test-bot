'use client';

import { cn } from '@/lib/utils';

/* Arena sahnasi — jonli/ghost va AI janglari uchun umumiy "Pastel Studio" fon:
   qiyshaygan qatlamli kartalar, suzuvchi bezaklar va krem asosiy karta. */
export default function ArenaStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="ps-shell relative mx-auto w-full max-w-2xl px-3 py-10 sm:px-8 sm:py-14">
      <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-6 top-16 -rotate-[5deg] rounded-[40px] bg-[var(--ps-orange)] shadow-[0_30px_60px_-30px_rgba(120,70,0,0.45)] sm:inset-x-10" />
      <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-10 top-10 rotate-[3.5deg] rounded-[40px] bg-[var(--ps-purple)] shadow-[0_30px_60px_-30px_rgba(60,30,110,0.6)] sm:inset-x-6">
        <span className="ps-dots absolute right-6 top-6 h-20 w-28 opacity-30" />
      </div>
      <span aria-hidden className="ps-float pointer-events-none absolute -left-1 top-24 z-20 size-14 rounded-full border-[5px] border-[var(--ps-paper)] bg-[var(--ps-green)] sm:-left-3 sm:size-16" />
      <span aria-hidden className="ps-float pointer-events-none absolute -right-1 bottom-20 z-20 size-10 rounded-full border-4 border-[var(--ps-paper)] bg-[var(--ps-coral)] [animation-delay:-2s] sm:-right-2" />
      <svg aria-hidden viewBox="0 0 24 24" className="ps-spin pointer-events-none absolute right-6 top-4 z-20 size-10 text-[#080808] dark:text-[#FFFCF7] sm:right-12">
        <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" fill="currentColor" />
      </svg>

      <div
        className={cn(
          'relative z-10 flex min-h-[600px] w-full select-none flex-col overflow-hidden rounded-[36px] bg-[var(--ps-paper)] p-5 shadow-[0_30px_60px_-30px_rgba(60,30,110,0.55)] sm:p-7',
          className
        )}
      >
        <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[var(--ps-purple)] opacity-10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 size-44 rounded-full bg-[var(--ps-coral)] opacity-10" />
        {children}
      </div>
    </div>
  );
}
