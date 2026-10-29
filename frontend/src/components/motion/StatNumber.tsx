'use client';

import { useEffect, useState } from 'react';
import NumberFlow, { type Format } from '@number-flow/react';
import { isTelegramEnv } from '@/lib/telegram';

/* Raqam o'zgarganda "aylanib" yangilanadi (XP, tanga, ELO, ball).
   Telegram Mini App muhitida yoki sekin mobil qurilmalarda ortiqcha shadow DOM
   hisoblashlari CPU ni band qilmasligi uchun optimallashtirilgan. */
export default function StatNumber({
  value,
  suffix,
  prefix,
  className,
  format,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  format?: Format;
}) {
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    if (isTelegramEnv()) {
      setInTelegram(true);
    }
  }, []);

  if (inTelegram) {
    const formatted = typeof value === 'number' ? value.toLocaleString('uz-UZ') : value;
    return (
      <span className={className}>
        {prefix}{formatted}{suffix}
      </span>
    );
  }

  return (
    <NumberFlow
      value={value}
      prefix={prefix}
      suffix={suffix}
      className={className}
      locales="uz-UZ"
      format={format}
      transformTiming={{ duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      spinTiming={{ duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      opacityTiming={{ duration: 150, easing: 'ease-out' }}
    />
  );
}
