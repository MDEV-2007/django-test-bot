'use client';

import React from 'react';
import { useLanguageStore } from '@/lib/transliterate';
import { tgHaptic } from '@/lib/telegram';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ScriptToggleProps {
  className?: string;
}

export default function ScriptToggle({ className }: ScriptToggleProps) {
  const { script, toggleScript } = useLanguageStore();

  const handleToggle = () => {
    tgHaptic('light');
    toggleScript();
    const nextScript = script === 'latin' ? 'cyrillic' : 'latin';
    toast.success(
      nextScript === 'cyrillic'
        ? 'Кирилл ёзувига ўтилди'
        : "Lotin yozuviga o'tildi",
      { duration: 1500 }
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'ios-spring tap-44 flex h-8.5 px-2.5 items-center justify-center gap-1 rounded-full border border-border bg-card text-xs font-bold shadow-2xs cursor-pointer select-none transition-all active:scale-95',
            script === 'cyrillic'
              ? 'text-primary border-primary/40 bg-primary/10'
              : 'text-muted-foreground hover:text-foreground',
            className
          )}
          aria-label={script === 'latin' ? "Кирилл ёзувига ўтиш" : "Lotin yozuviga o'tish"}
        >
          <span
            className={cn(
              'text-[12px] tracking-tight transition-colors',
              script === 'cyrillic' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'
            )}
          >
            Ўз
          </span>
          <span aria-hidden="true" className="text-[12px] text-muted-foreground/60 font-mono">/</span>
          <span
            className={cn(
              'text-[12px] tracking-tight transition-colors',
              script === 'latin' ? 'text-foreground font-bold' : 'text-muted-foreground font-semibold'
            )}
          >
            Oʻz
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs font-medium">
        {script === 'latin' ? "Кирилл ёзувига ўтиш" : "Lotin yozuviga o'tish"}
      </TooltipContent>
    </Tooltip>
  );
}
