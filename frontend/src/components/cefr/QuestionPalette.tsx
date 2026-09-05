'use client';

/* Savollar xaritasi: qaysilari javoblangan, qaysilari belgilab qo'yilgan (flag) va
   hozir qaysi biri ochiq. Bitta bosishda o'sha savolga sakraydi. Imtihon paytida eng
   ko'p kerak bo'ladigan narsa shu — "nechtasi qoldi" degan savolga bir qarashda javob. */

import { Flag } from 'lucide-react';
import type { CefrSection, CefrSkill } from '@/lib/cefr-types';
import { SKILL_LABEL } from '@/lib/cefr-types';
import { cn } from '@/lib/utils';

type Props = {
  sections: CefrSection[];
  activeQuestionId: number | null;
  flagged: Set<number>;
  onJump: (sectionIndex: number, questionId: number) => void;
};

export default function QuestionPalette({ sections, activeQuestionId, flagged, onJump }: Props) {
  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.id}>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{SKILL_LABEL[section.skill as CefrSkill] ?? section.skill}</span>
            <span className="opacity-60">Part {section.part_number}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {section.questions.map((question) => {
              const active = question.id === activeQuestionId;
              const isFlagged = flagged.has(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onJump(sectionIndex, question.id)}
                  aria-current={active}
                  className={cn(
                    'relative h-8 w-8 rounded-lg border text-xs font-semibold tabular-nums transition',
                    active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                    question.answered
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {question.exam_number ?? '•'}
                  {isFlagged && (
                    <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber-400 text-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
