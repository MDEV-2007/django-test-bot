'use client';

/* Matn ichidagi bo'shliq: raqami ustida turadi, javob yozilgach yashil chizig'i bilan
   "to'ldirilgan" ko'rinishga o'tadi. Kenglik so'z chegarasiga qarab o'sadi, shunda
   "ONE WORD" bo'shlig'i uzun jumla kutayotgandek ko'rinmaydi. */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  number: number | null;
  value: string;
  maxWords?: number | null;
  active?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
};

export default function GapInput({ number, value, maxWords, active, onChange, onFocus }: Props) {
  const [draft, setDraft] = useState(value);

  // Server tomondan kelgan qiymat o'zgarsa (masalan sahifa qayta yuklandi) — sinxronlanadi.
  useEffect(() => { setDraft(value); }, [value]);

  const width = Math.max(6, Math.min(22, (maxWords ?? 1) * 8));

  return (
    <span className="mx-0.5 inline-flex items-baseline gap-1 align-baseline">
      {number !== null && (
        <span
          className={cn(
            'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-black tabular-nums transition',
            active ? 'bg-[var(--ps-purple,#7659C7)] text-white' : 'bg-[var(--ps-neutral,var(--surface-input))] text-[var(--text-secondary)]',
          )}
        >
          {number}
        </span>
      )}
      <input
        value={draft}
        onChange={(event) => { setDraft(event.target.value); onChange(event.target.value); }}
        onFocus={onFocus}
        id={number !== null ? `gap-${number}` : undefined}
        aria-label={number !== null ? `${number}-bo'shliq` : "Bo'shliq"}
        autoComplete="off"
        spellCheck={false}
        style={{ width: `${width}ch` }}
        className={cn(
          'rounded-t-[8px] border-0 border-b-[2.5px] bg-transparent px-1 pb-0.5 text-center text-[0.95em] font-bold outline-none transition',
          'focus:border-[var(--ps-purple,#7659C7)] focus:bg-[var(--ps-lilac,#E6B5F2)]/30',
          draft.trim() ? 'border-[var(--ps-green,#4C806B)] text-[var(--text-primary)]' : 'border-dashed border-[var(--text-faint)] text-[var(--text-primary)]',
        )}
      />
    </span>
  );
}
