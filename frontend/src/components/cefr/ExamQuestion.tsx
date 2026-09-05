'use client';

/* Bitta CEFR savoli. Har bir tur o'z ko'rinishiga ega, lekin hammasi bir xil qoidaga
   bo'ysunadi: tanlash bittagina bosishda bo'ladi, javob darhol saqlanadi va o'quvchi
   javob berganini rangdan darhol ko'radi (yashil chegara). To'g'ri/xato esa test
   tugagunicha ko'rsatilmaydi — bu imtihon, mashq emas. */

import { Check } from 'lucide-react';
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
        <div className="flex flex-wrap gap-2">
          {group?.options.map((option) => {
            const selected = question.selected_group_option_id === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.text}
                onClick={() => onAnswer({ group_option_id: option.id })}
                className={cn(
                  'h-10 w-10 rounded-xl border text-sm font-bold transition',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/70 bg-card/60 hover:border-primary/50 hover:bg-primary/5',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
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
