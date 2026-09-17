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
          questions.some((q) => q.selected_group_option_id === opt.id)
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
            className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] overflow-hidden shadow-md transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-card)] bg-[var(--surface-hover)]/30">
              <div className="space-y-1 min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 font-bold text-xs">
                    <FileText className="size-4" />
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                    {groupTitle}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                      usedOptionsCount === totalOptions
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    )}
                  >
                    {usedOptionsCount} / {totalOptions} ta ishlatildi
                  </Badge>
                </div>
                {group.instruction && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                    {group.instruction}
                  </p>
                )}
              </div>

              {/* Mobile collapse toggle */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="lg:hidden flex size-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border-card)] hover:bg-[var(--surface-hover)] text-muted-foreground transition"
                aria-label={expanded ? "Yopish" : "Ochish"}
              >
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>

            {/* Content List */}
            {expanded && (
              <div className="p-3.5 sm:p-4 space-y-2.5 max-h-[500px] lg:max-h-[calc(100vh-16rem)] overflow-y-auto divide-y divide-[var(--border-card)]/40">
                {group.options.map((option) => {
                  // Bu variant qaysi savolda tanlangan?
                  const matchedQuestion = questions.find(
                    (q) => q.selected_group_option_id === option.id
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
                        'pt-2.5 first:pt-0 rounded-2xl p-2.5 transition-all flex items-start gap-3 group',
                        isUsed
                          ? 'bg-[var(--surface-hover)]/40 border border-border/40 opacity-90'
                          : 'hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20'
                      )}
                    >
                      {/* Option Letter Badge */}
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-xl font-black text-xs transition-all',
                          isUsed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-105'
                        )}
                      >
                        {option.label}
                      </span>

                      {/* Option Text */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            'text-xs sm:text-sm leading-relaxed text-foreground font-medium',
                            isUsed && 'text-muted-foreground'
                          )}
                        >
                          {option.text}
                        </p>

                        {/* Status tag */}
                        <div className="flex items-center gap-2 pt-0.5">
                          {isUsed ? (
                            <a
                              href={`#q-${matchedQuestion?.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline"
                            >
                              <Check className="size-3" />
                              <span>
                                {matchedQuestion?.exam_number
                                  ? `${matchedQuestion.exam_number}-savolda tanlangan`
                                  : 'Tanlangan'}
                              </span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 font-mono">
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
                            'shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg transition',
                            isForActiveQuestion
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
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
            <div className="px-4 py-2.5 bg-[var(--surface-hover)]/20 border-t border-[var(--border-card)] text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-blue-400 shrink-0" />
              <span>Har bir variant faqat 1 ta savolga mos keladi. Ortiqcha variantlar bo&apos;lishi mumkin.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
