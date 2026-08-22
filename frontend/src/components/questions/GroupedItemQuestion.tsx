'use client';

import { CheckCircle2 } from 'lucide-react';
import type { QuestionData } from '@/lib/test-types';

export default function GroupedItemQuestion({
  data, onSelect,
}: { data: QuestionData; onSelect: (optionId: number) => void }) {
  return (
    <div className="space-y-4 pt-2">
      {data.group_instruction && (
        <p className="text-xs italic leading-relaxed text-[var(--text-muted)]">{data.group_instruction}</p>
      )}
      <div className="space-y-2">
        {(data.group_options || []).map((o, i) => {
          const isSelected = data.selected_group_option_id === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`tactile-btn flex w-full items-center justify-between gap-2.5 rounded-xl p-3 text-left text-xs transition-all ${
                isSelected ? 'border border-[var(--accent)] bg-[var(--accent)]/[0.16] font-semibold text-[var(--text-primary)]' : 'bg-[var(--surface-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(255,255,255,0.06)] text-xs font-bold">{o.label}</span>
                <span>{o.text}</span>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
