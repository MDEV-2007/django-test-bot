'use client';

import { useState } from 'react';
import type { QuestionData } from '@/lib/test-types';

export default function OpenWrittenQuestion({
  data, onSave,
}: { data: QuestionData; onSave: (payload: { text_answer?: string; subanswers?: Record<string, string> }) => void }) {
  const hasSubs = (data.sub_question_rows || []).length > 0;
  const [text, setText] = useState(data.text_answer || '');
  const [subs, setSubs] = useState<Record<string, string>>(
    Object.fromEntries((data.sub_question_rows || []).map((r) => [r.label, r.answer])),
  );

  if (hasSubs) {
    return (
      <div className="space-y-4 pt-2">
        {(data.sub_question_rows || []).map((row) => (
          <div key={row.label} className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              <span className="text-[var(--accent-text)]">{row.label}:</span> {row.text}
            </label>
            <textarea
              rows={2}
              value={subs[row.label] || ''}
              onChange={(e) => setSubs({ ...subs, [row.label]: e.target.value })}
              placeholder="Javobingizni asoslab, bu yerga yozing..."
              className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        ))}
        <button
          onClick={() => onSave({ subanswers: subs })}
          className="tactile-btn w-full rounded-2xl border border-[var(--border-card)] bg-[rgba(255,255,255,0.04)] py-3 text-xs font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
        >
          Javobni saqlash
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Javobingizni shu yerga yozing..."
        className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
      />
      <button
        onClick={() => onSave({ text_answer: text })}
        className="tactile-btn w-full rounded-2xl border border-[var(--border-card)] bg-[rgba(255,255,255,0.04)] py-3 text-xs font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
      >
        Javobni saqlash
      </button>
    </div>
  );
}
