'use client';

import { CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { QuestionData } from '@/lib/test-types';
import { dur, easeOut, spring } from '@/lib/motion';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function SingleChoiceQuestion({
  data, onSelect,
}: { data: QuestionData; onSelect: (choiceId: number) => void }) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-3 pt-2">
      {(data.choices || []).map((c, i) => {
        const isSelected = data.selected_choice_id === c.id;
        return (
          <motion.button
            key={c.id}
            onClick={() => onSelect(c.id)}
            /* Variantlar 40ms oralab ketma-ket chiqadi — savol almashganda ro'yxat
               "otilib" chiqmaydi, ko'z tabiiy ravishda yuqoridan pastga yuradi. */
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.fast, ease: easeOut, delay: i * 0.04 }}
            /* Tanlanganda karta bir zumda "nafas oladi" — javob qabul qilinganini
               his qildiradigan yagona signal (ovoz o'chirilgan bo'lishi mumkin). */
            whileTap={reduce ? undefined : { scale: 0.985 }}
            className={`tactile-btn reading-scale flex w-full items-center justify-between gap-3.5 rounded-2xl p-4 text-left font-medium leading-relaxed transition-colors duration-150 sm:p-4.5 ${
              isSelected
                ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/[0.16] text-[var(--text-primary)] shadow-md shadow-[var(--accent)]/15'
                : 'border border-[var(--border-soft)] bg-[var(--surface-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${isSelected ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'}`}>
                {LETTERS[i] || i + 1}
              </span>
              <span className="leading-snug">{c.text}</span>
            </div>
            {isSelected && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
                className="shrink-0"
              >
                <CheckCircle2 className="size-5 text-[var(--accent-text)]" />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
