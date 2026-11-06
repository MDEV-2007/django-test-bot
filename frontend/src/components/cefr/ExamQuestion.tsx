'use client';

/* Bitta CEFR savoli. Har bir tur o'z ko'rinishiga ega, lekin hammasi bir xil qoidaga
   bo'ysunadi: tanlash bittagina bosishda bo'ladi, javob darhol saqlanadi va o'quvchi
   javob berganini rangdan darhol ko'radi (yashil chegara). To'g'ri/xato esa test
   tugagunicha ko'rsatilmaydi — bu imtihon, mashq emas. */

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CefrGroup, CefrQuestion } from '@/lib/cefr-types';
import GapInput from './GapInput';
import { cn } from '@/lib/utils';

type Props = {
  question: CefrQuestion;
  group?: CefrGroup;
  active: boolean;
  onActivate: () => void;
  onAnswer: (payload: Record<string, unknown>) => void;
  /* Matn ichida turadigan bo'shliqlar sahifada allaqachon chizilgan — ular bu yerda
     takrorlanmasligi kerak. */
  hideInlineGap?: boolean;
};

export default function ExamQuestion({
  question, group, active, onActivate, onAnswer, hideInlineGap,
}: Props) {
  const answered = question.answered;

  return (
    <div
      id={`q-${question.id}`}
      onFocusCapture={onActivate}
      onMouseDown={onActivate}
      className={cn(
        'scroll-mt-28 rounded-[26px] bg-[var(--ps-paper,var(--surface-card))] p-5 shadow-[var(--ds-panel-shadow)] transition',
        active ? 'ring-[3px] ring-[var(--ps-purple,#7659C7)]' : 'ring-0',
      )}
    >
      <div className="mb-2 flex items-start gap-3">
        {question.exam_number !== null && (
          <span
            className={cn(
              'flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-[13px] font-black tabular-nums',
              answered ? 'bg-[var(--ps-green,#4C806B)] text-white' : 'bg-[var(--ps-neutral,var(--surface-input))] text-[var(--text-secondary)]',
            )}
          >
            {answered ? <Check className="h-3.5 w-3.5" /> : question.exam_number}
          </span>
        )}
        {question.body && (
          <div
            className="flex-1 text-[length:var(--reading-size,1.0625rem)] leading-relaxed [&_p]:m-0 [&_p+p]:mt-2"
            dangerouslySetInnerHTML={{ __html: question.body }}
          />
        )}
      </div>

      {question.image && (
        <img src={question.image} alt="" className="mb-3 w-full rounded-xl border border-border/60" />
      )}

      <Body
        question={question}
        group={group}
        onAnswer={onAnswer}
        onActivate={onActivate}
        hideInlineGap={hideInlineGap}
      />
    </div>
  );
}

function Body({ question, group, onAnswer, onActivate, hideInlineGap }: Omit<Props, 'active'>) {
  switch (question.type) {
    case 'single_choice':
    case 'image_based':
    case 'table_based':
      return (
        <div className="space-y-2">
          {question.choices?.map((choice) => {
            const selectedChoiceId = question.selected_choice_id ?? (question as any).choice_id;
            return (
              <Choice
                key={choice.id}
                text={choice.text}
                selected={selectedChoiceId === choice.id}
                onClick={() => onAnswer({ choice_id: choice.id })}
              />
            );
          })}
        </div>
      );

    case 'tfng':
      return (
        <div className="flex flex-wrap gap-2">
          {(question.tfng_options ?? []).map((option) => {
            const selected = (question.text_answer ?? '').toUpperCase() === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onAnswer({ text_answer: option })}
                className={cn(
                  'rounded-full px-5 py-2.5 text-sm font-bold transition',
                  selected
                    ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'bg-[var(--ps-neutral,var(--surface-input))] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac,#E6B5F2)] hover:text-[#080808]',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      );

    case 'grouped_item':
      return (
        <GroupedItemSelector
          question={question}
          group={group}
          onAnswer={onAnswer}
        />
      );

    case 'gap_fill':
      // Bo'shliq matnning ichida bo'lsa, u yerda allaqachon chizilgan.
      if (hideInlineGap) {
        return <p className="text-xs text-muted-foreground">Javobni matndagi bo&apos;sh joyga yozing.</p>;
      }
      return (
        <GapInput
          number={question.exam_number}
          value={question.text_answer ?? ''}
          maxWords={question.max_words}
          onChange={(value) => onAnswer({ text_answer: value })}
          onFocus={onActivate}
        />
      );

    case 'matching':
      return (
        <div className="space-y-2">
          {question.matching_rows?.map((row) => (
            <div key={row.left_key} className="flex flex-wrap items-center gap-2">
              <span className="w-8 shrink-0 text-sm font-semibold text-muted-foreground">{row.left_key}</span>
              <span className="min-w-0 flex-1 text-sm">{row.left_text}</span>
              <div className="flex gap-1">
                {question.matching_options?.map((option) => (
                  <button
                    key={option.right_key}
                    type="button"
                    title={option.right_text}
                    onClick={() => {
                      const matches = Object.fromEntries(
                        (question.matching_rows ?? []).map((r) => [r.left_key, r.selected_right_key]),
                      );
                      matches[row.left_key] = option.right_key;
                      onAnswer({ matches });
                    }}
                    className={cn(
                      'size-9 rounded-full text-xs font-black transition',
                      row.selected_right_key === option.right_key
                        ? 'bg-[var(--ps-purple,#7659C7)] text-white'
                        : 'bg-[var(--ps-neutral,var(--surface-input))] hover:bg-[var(--ps-lilac,#E6B5F2)] hover:text-[#080808]',
                    )}
                  >
                    {option.right_key}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function Choice({ text, selected, onClick }: { text: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-[20px] p-3.5 text-left text-[0.95rem] leading-relaxed transition',
        selected
          ? 'bg-[var(--ps-purple,#7659C7)] text-white'
          : 'bg-[var(--ps-neutral,var(--surface-input))] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac,#E6B5F2)] hover:text-[#080808]',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition',
          selected ? 'border-white bg-white' : 'border-current opacity-50',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ps-purple,#7659C7)]" />}
      </span>
      <span>{text}</span>
    </button>
  );
}

function GroupedItemSelector({
  question,
  group,
  onAnswer,
}: {
  question: CefrQuestion;
  group?: CefrGroup;
  onAnswer: (payload: Record<string, unknown>) => void;
}) {
  const [showOptionsList, setShowOptionsList] = useState(false);
  const selectedId = question.selected_group_option_id ?? (question as any).group_option_id;
  const selectedOption = group?.options.find(
    (o) => o.id === selectedId
  );

  return (
    <div className="space-y-3 pt-1">
      {/* Letter buttons row */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {group?.options.map((option) => {
          const selected = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              title={option.text}
              onClick={() => onAnswer({ group_option_id: selected ? null : option.id })}
              className={cn(
                'flex h-10 min-w-10 cursor-pointer select-none items-center justify-center rounded-full px-2 text-sm font-black transition-all active:scale-95',
                selected
                  ? 'scale-105 bg-[var(--ps-purple,#7659C7)] text-white shadow-[0_8px_18px_-8px_rgba(118,89,199,0.9)]'
                  : 'bg-[var(--ps-neutral,var(--surface-input))] text-[var(--text-primary)] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac,#E6B5F2)] hover:text-[#080808]'
              )}
            >
              {option.label}
            </button>
          );
        })}

        {/* Toggle full options list preview on mobile/desktop */}
        {group && group.options.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOptionsList(!showOptionsList)}
            className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-[var(--ps-neutral,var(--surface-input))] px-3 py-2 text-[12px] font-bold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <span>{showOptionsList ? "Variantlarni yashirish" : "Variantlar matni"}</span>
            {showOptionsList ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        )}
      </div>

      {/* Selected Option Preview Card */}
      {selectedOption && (
        <div className="flex animate-in items-start justify-between gap-2.5 rounded-[20px] bg-[var(--ps-lilac,#E6B5F2)]/45 p-3.5 text-xs fade-in-50 dark:bg-[var(--ps-purple,#7659C7)]/25">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple,#7659C7)] text-[12px] font-black text-white">
              {selectedOption.label}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--ps-purple,#7659C7)]">
                Tanlangan javob
              </span>
              <p className="font-semibold text-foreground leading-relaxed mt-0.5">
                {selectedOption.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAnswer({ group_option_id: null })}
            className="shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[12px] font-bold text-[var(--text-muted)] transition hover:bg-[var(--ps-coral,#F0523D)] hover:text-white"
            title="Bekor qilish"
          >
            Bekor qilish ✕
          </button>
        </div>
      )}

      {/* Expandable Options List */}
      {showOptionsList && group && (
        <div className="animate-in space-y-1.5 rounded-[20px] bg-[var(--ps-neutral,var(--surface-input))] p-3 fade-in-50">
          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider pb-1">
            Mavjud variantlardan birini tanlang:
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {group.options.map((opt) => {
              const isSelected = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAnswer({ group_option_id: isSelected ? null : opt.id })}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2.5 rounded-[14px] p-2 text-left text-xs transition-all',
                    isSelected
                      ? 'bg-[var(--ps-purple,#7659C7)] font-bold text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ps-paper,var(--surface-card))] hover:text-[var(--text-primary)]'
                  )}
                >
                  <span className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-black',
                    isSelected ? 'bg-white text-[var(--ps-purple,#7659C7)]' : 'bg-[var(--ps-paper,var(--surface-card))] text-[var(--text-primary)]'
                  )}>
                    {opt.label}
                  </span>
                  <span className="leading-relaxed flex-1">{opt.text}</span>
                  {isSelected && <Check className="ml-1 mt-0.5 size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

