'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { QuestionData } from '@/lib/test-types';

export default function OpenWrittenQuestion({
  data, onSave,
}: { data: QuestionData; onSave: (payload: { text_answer?: string; subanswers?: Record<string, string> }) => void }) {
  const hasSubs = (data.sub_question_rows || []).length > 0;
  const [text, setText] = useState(data.text_answer || '');
  const [subs, setSubs] = useState<Record<string, string>>(() =>
    Object.fromEntries((data.sub_question_rows || []).map((r) => [r.label, r.answer || ''])),
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Savol o'zgarganda yangi savolning saqlangan javoblarini yuklash
  useEffect(() => {
    isInitialMount.current = true;
    setText(data.text_answer || '');
    setSubs(Object.fromEntries((data.sub_question_rows || []).map((r) => [r.label, r.answer || ''])));
    setSaveStatus('idle');
  }, [data.question.id]);

  const triggerSave = (newText?: string, newSubs?: Record<string, string>) => {
    setSaveStatus('saving');
    if (hasSubs) {
      onSave({ subanswers: newSubs ?? subs });
    } else {
      onSave({ text_answer: newText ?? text });
    }
    setTimeout(() => {
      setSaveStatus('saved');
    }, 300);
  };

  // Har safar o'quvchi yozganda 600ms debounce bilan avtomatik saqlash
  const scheduleAutoSave = (newText?: string, newSubs?: Record<string, string>) => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('idle');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      triggerSave(newText, newSubs);
    }, 600);
  };

  const handleTextChange = (val: string) => {
    setText(val);
    scheduleAutoSave(val, undefined);
  };

  const handleSubChange = (label: string, val: string) => {
    const updated = { ...subs, [label]: val };
    setSubs(updated);
    scheduleAutoSave(undefined, updated);
  };

  const handleBlur = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    triggerSave();
  };

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
              onChange={(e) => handleSubChange(row.label, e.target.value)}
              onBlur={handleBlur}
              placeholder="Javobingizni bu yerga yozing..."
              className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="size-3 animate-spin text-[var(--accent-text)]" />
                <span>Saqlanmoqda...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="size-3 text-[var(--success)]" />
                <span className="text-[var(--success)] font-medium">Javob saqlandi</span>
              </>
            )}
            {saveStatus === 'idle' && <span>Matn kiritilganda avtomatik saqlanadi</span>}
          </div>

          <button
            type="button"
            onClick={() => triggerSave()}
            className="tactile-btn rounded-xl border border-[var(--border-card)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
          >
            Saqlash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <textarea
        rows={4}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Javobingizni shu yerga yozing..."
        className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="size-3 animate-spin text-[var(--accent-text)]" />
              <span>Saqlanmoqda...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="size-3 text-[var(--success)]" />
              <span className="text-[var(--success)] font-medium">Javob saqlandi</span>
            </>
          )}
          {saveStatus === 'idle' && <span>Matn kiritilganda avtomatik saqlanadi</span>}
        </div>

        <button
          type="button"
          onClick={() => triggerSave()}
          className="tactile-btn rounded-xl border border-[var(--border-card)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
        >
          Saqlash
        </button>
      </div>
    </div>
  );
}
