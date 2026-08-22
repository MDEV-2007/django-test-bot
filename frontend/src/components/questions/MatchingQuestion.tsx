'use client';

import type { QuestionData } from '@/lib/test-types';

export default function MatchingQuestion({
  data, onChange,
}: { data: QuestionData; onChange: (leftKey: string, rightKey: string) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-[var(--text-muted)]">Chap ustundagi tushunchaga o&apos;ng tomondan to&apos;g&apos;ri moslikni tanlang:</p>
      {(data.matching_rows || []).map((row) => (
        <div key={row.left_key} className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-input)] p-3.5 sm:flex-row sm:items-center">
          <span className="text-xs font-semibold text-[var(--text-primary)] sm:text-sm">
            <span className="mr-1.5 font-bold text-[var(--accent-text)]">{row.left_key}.</span>{row.left_text}
          </span>
          <select
            value={row.selected_right_key}
            onChange={(e) => onChange(row.left_key, e.target.value)}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card-strong)] px-3.5 py-2.5 text-xs font-medium text-[var(--accent-text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="">— Mos javobni tanlang —</option>
            {(data.matching_options || []).map((o) => (
              <option key={o.right_key} value={o.right_key}>{o.right_key}) {o.right_text}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
