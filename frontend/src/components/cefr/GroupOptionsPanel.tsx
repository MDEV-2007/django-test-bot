'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, FileText, Info } from 'lucide-react';
import type { CefrGroup, CefrQuestion } from '@/lib/cefr-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  groups: CefrGroup[];
  questions: CefrQuestion[];
  activeQuestionId?: number | null;
  onSelectOption?: (questionId: number, optionId: number | null) => void;
  title?: string;
  className?: string;
};

export default function GroupOptionsPanel({
  groups,
  questions,
  activeQuestionId,
  onSelectOption,
  title,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!groups || groups.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group) => {
        // Hisoblash: nechta variant ishlatildi
        const totalOptions = group.options.length;
        const usedOptionsCount = group.options.filter((opt) =>
          questions.some((q) => (q.selected_group_option_id ?? (q as any).group_option_id) === opt.id)
        ).length;

        const groupTitle =
          title ||
          (group.options[0]?.label.match(/[A-Z]/)
            ? group.options[0].label === 'K'
              ? "Sarlavhalar ro'yxati (Headings K–R)"
              : `Bayonotlar ro'yxati (Statements ${group.options[0].label}–${group.options[group.options.length - 1].label})`
            : "Variantlar banki");

        return (
          <div
            key={group.id}
            className="overflow-hidden rounded-[32px] bg-[var(--ps-paper,var(--surface-card))] shadow-[var(--ds-panel-shadow)] transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[var(--ps-purple,#7659C7)] p-5 text-white sm:p-6">
              <div className="space-y-1 min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ps-purple,#7659C7)]">
                    <FileText className="size-4" />
                  </span>
                  <h3 className="truncate font-[family-name:var(--font-grotesk)] text-[17px] font-bold tracking-[-0.02em] text-white sm:text-[19px]">
                    {groupTitle}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 rounded-full border-0 px-2.5 py-0.5 text-[12px] font-bold',
                      usedOptionsCount === totalOptions
                        ? 'bg-[var(--ps-green,#4C806B)] text-white'
                        : 'bg-white/20 text-white'
                    )}
                  >
                    {usedOptionsCount} / {totalOptions} ta ishlatildi
                  </Badge>
                </div>
                {group.instruction && (
                  <p className="pt-1 text-[12.5px] leading-relaxed text-white/80">
                    {group.instruction}
                  </p>
                )}
              </div>

              {/* Mobile collapse toggle */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 lg:hidden"
                aria-label={expanded ? "Yopish" : "Ochish"}
              >
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>

            {/* Content List */}
            {expanded && (
              <div className="max-h-[500px] space-y-2 overflow-y-auto p-3 sm:p-4 lg:max-h-[calc(100vh-16rem)]">
                {group.options.map((option) => {
                  // Bu variant qaysi savolda tanlangan?
                  const matchedQuestion = questions.find(
                    (q) => (q.selected_group_option_id ?? (q as any).group_option_id) === option.id
                  );
                  const isUsed = Boolean(matchedQuestion);
                  const isForActiveQuestion =
                    activeQuestionId &&
                    matchedQuestion &&
                    matchedQuestion.id === activeQuestionId;

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        'group flex items-start gap-3 rounded-[20px] p-3 transition-all',
                        isUsed
                          ? 'bg-[var(--ps-neutral,var(--surface-input))] opacity-75'
                          : 'bg-[var(--ps-neutral,var(--surface-input))] hover:-translate-y-0.5'
                      )}
                    >
                      {/* Option Letter Badge */}
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-black transition-all',
                          isUsed
                            ? 'bg-[var(--ps-green,#4C806B)] text-white'
                            : 'bg-[var(--ps-paper,var(--surface-card))] text-[var(--ps-purple,#7659C7)] group-hover:scale-105'
                        )}
                      >
                        {option.label}
                      </span>

                      {/* Option Text */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            'text-[13.5px] font-semibold leading-relaxed text-[var(--text-primary)]',
                            isUsed && 'line-through decoration-[var(--text-faint)]'
                          )}
                        >
                          {option.text}
                        </p>

                        {/* Status tag */}
                        <div className="flex items-center gap-2 pt-0.5">
                          {isUsed ? (
                            <a
                              href={`#q-${matchedQuestion?.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-green,#4C806B)] px-2 py-0.5 text-[11.5px] font-bold text-white hover:underline"
                            >
                              <Check className="size-3" />
                              <span>
                                {matchedQuestion?.exam_number
                                  ? `${matchedQuestion.exam_number}-savolda tanlangan`
                                  : 'Tanlangan'}
                              </span>
                            </a>
                          ) : (
                            <span className="text-[11.5px] font-semibold text-[var(--text-faint)]">
                              Ishlatilmagan (bo&apos;sh)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Assign to active question if active */}
                      {activeQuestionId && onSelectOption && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isForActiveQuestion) {
                              onSelectOption(activeQuestionId, null);
                            } else {
                              onSelectOption(activeQuestionId, option.id);
                            }
                          }}
                          className={cn(
                            'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition',
                            isForActiveQuestion
                              ? 'bg-[var(--ps-coral,#F0523D)] text-white'
                              : 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                          )}
                        >
                          {isForActiveQuestion ? 'Bekor' : 'Tanlash'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer tip */}
            <div className="flex items-center gap-1.5 border-t border-[var(--border-card)] px-5 py-3 text-[12px] font-semibold text-[var(--text-muted)]">
              <Info className="size-3.5 shrink-0 text-[var(--ps-purple,#7659C7)]" />
              <span>Har bir variant faqat 1 ta savolga mos keladi. Ortiqcha variantlar bo&apos;lishi mumkin.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
