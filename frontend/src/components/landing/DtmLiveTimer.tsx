'use client';

import { useState, useEffect } from 'react';

export function DtmLiveTimer() {
  const [secondsLeft, setSecondsLeft] = useState(3 * 3600 - 120);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 3 * 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const formatted = `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {formatted}
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
          Savol 37 / 90
        </span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
          style={{ width: '41%' }}
        />
      </div>
    </div>
  );
}
