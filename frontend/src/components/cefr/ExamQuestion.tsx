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
        'scroll-mt-28 rounded-2xl border p-4 transition',
        active ? 'border-primary/60 bg-primary/5 shadow-sm' : 'border-border/60 bg-card/40',
      )}
    >
      <div className="mb-2 flex items-start gap-3">
        {question.exam_number !== null && (
          <span
            className={cn(
              'mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-bold tabular-nums',
              answered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground',
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
          {question.choices?.map((choice) => (
            <Choice
              key={choice.id}
              text={choice.text}
              selected={question.selected_choice_id === choice.id}
              onClick={() => onAnswer({ choice_id: choice.id })}
            />
          ))}
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
                  'rounded-full border px-4 py-2 text-sm font-medium transition',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/70 bg-card/60 hover:border-primary/50 hover:bg-primary/5',
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
                      'h-8 w-8 rounded-lg border text-xs font-bold transition',
                      row.selected_right_key === option.right_key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 bg-card/60 hover:border-primary/50',
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
        'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-[0.95rem] leading-relaxed transition',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border/70 bg-card/50 hover:border-primary/40 hover:bg-primary/5',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/50',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
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
  const selectedOption = group?.options.find(
    (o) => o.id === question.selected_group_option_id
  );

  return (
    <div className="space-y-3 pt-1">
      {/* Letter buttons row */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {group?.options.map((option) => {
          const selected = question.selected_group_option_id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              title={option.text}
              onClick={() => onAnswer({ group_option_id: selected ? null : option.id })}
              className={cn(
                'flex h-9 min-w-9 sm:h-10 sm:min-w-10 px-2 items-center justify-center rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer select-none active:scale-95',
                selected
                  ? 'border-blue-500 bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30 scale-105'
                  : 'border-border/80 bg-card/70 hover:border-blue-500/50 hover:bg-blue-500/10 text-foreground'
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card/50 hover:bg-[var(--surface-hover)] text-[11px] font-bold text-muted-foreground hover:text-foreground transition ml-auto cursor-pointer"
          >
            <span>{showOptionsList ? "Variantlarni yashirish" : "Variantlar matni"}</span>
            {showOptionsList ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        )}
      </div>

      {/* Selected Option Preview Card */}
      {selectedOption && (
        <div className="flex items-start justify-between gap-2.5 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs text-blue-300 shadow-xs animate-in fade-in-50">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white text-[11px] font-black mt-0.5">
              {selectedOption.label}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
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
            className="text-[11px] text-muted-foreground hover:text-rose-400 font-bold shrink-0 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
            title="Bekor qilish"
          >
            Bekor qilish ✕
          </button>
        </div>
      )}

      {/* Expandable Options List */}
      {showOptionsList && group && (
        <div className="rounded-2xl border border-border/80 bg-card/90 p-3 space-y-1.5 animate-in fade-in-50">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pb-1">
            Mavjud variantlardan birini tanlang:
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {group.options.map((opt) => {
              const isSelected = question.selected_group_option_id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAnswer({ group_option_id: isSelected ? null : opt.id })}
                  className={cn(
                    'w-full flex items-start gap-2.5 p-2 rounded-xl text-left text-xs transition-all cursor-pointer',
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 font-bold text-foreground'
                      : 'hover:bg-[var(--surface-hover)] text-muted-foreground hover:text-foreground border border-transparent'
                  )}
                >
                  <span className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-black',
                    isSelected ? 'bg-blue-600 text-white' : 'bg-muted text-foreground border border-border/60'
                  )}>
                    {opt.label}
                  </span>
                  <span className="leading-relaxed flex-1">{opt.text}</span>
                  {isSelected && <Check className="size-4 text-blue-400 shrink-0 ml-1 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

