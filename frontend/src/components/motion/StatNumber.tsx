'use client';

import NumberFlow, { type Format } from '@number-flow/react';

/* Raqam o'zgarganda "aylanib" yangilanadi (XP, tanga, ELO, ball). Gamifikatsiyada
   bu eng arzon va eng kuchli mikro-mukofot: o'quvchi o'z natijasi o'sganini KO'RADI,
   shunchaki yangi raqamni o'qimaydi. */
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
  return (
    <NumberFlow
      value={value}
      prefix={prefix}
      suffix={suffix}
      className={className}
      locales="uz-UZ"
      format={format}
      /* Uzun ro'yxatlarda bir vaqtda o'nlab raqam aylanmasligi uchun qisqa davomiylik. */
      transformTiming={{ duration: 450, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      spinTiming={{ duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      opacityTiming={{ duration: 180, easing: 'ease-out' }}
    />
  );
}
