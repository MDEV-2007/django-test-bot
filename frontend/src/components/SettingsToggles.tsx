'use client';

import { useEffect, useState } from 'react';
import { Moon, Volume2 } from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, soundFX } from '@/lib/soundFX';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/* Authentic iOS Settings Inset Grouped Switch Rows */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  if (typeof document !== 'undefined' && document.documentElement.dataset.tg === 'on') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#5856D6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          <Moon className="size-4 stroke-[2.2]" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-foreground">Tungi rejim (Dark Mode)</p>
          <p className="text-[11.5px] text-[#8E8E93]">
            {isDark ? 'OLED qora mavzu faol' : 'iOS yorug\' mavzu faol'}
          </p>
        </div>
      </div>

      {/* iOS UISwitch */}
      <span
        className={cn(
          'relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200',
          isDark ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#39393D]'
        )}
      >
        <span
          className={cn(
            'size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.22)] transition-transform duration-200',
            isDark ? 'translate-x-[20px]' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  );
}

export function AudioToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isAudioEnabled());
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setAudioEnabled(next);
    if (next) soundFX.click();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#FF2D55] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          <Volume2 className="size-4 stroke-[2.2]" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-foreground">Ovozli effektlar</p>
          <p className="text-[11.5px] text-[#8E8E93]">
            {enabled ? 'Tugma va yutuq tovushlari yoqilgan' : "Tovushlar o'chirilgan"}
          </p>
        </div>
      </div>

      {/* iOS UISwitch */}
      <span
        className={cn(
          'relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200',
          enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#39393D]'
        )}
      >
        <span
          className={cn(
            'size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.22)] transition-transform duration-200',
            enabled ? 'translate-x-[20px]' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  );
}
