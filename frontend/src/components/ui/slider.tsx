'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  max?: number;
  min?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  defaultValue = [0],
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  disabled = false,
}: SliderProps) {
  const currentVal = value ? value[0] : defaultValue[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    if (onValueChange) {
      onValueChange([num]);
    }
  };

  const percentage = Math.max(0, Math.min(100, ((currentVal - min) / (max - min)) * 100));

  return (
    <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentVal}
        disabled={disabled}
        onChange={handleChange}
        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${percentage}%, var(--muted, #27272a) ${percentage}%, var(--muted, #27272a) 100%)`,
        }}
      />
    </div>
  );
}
