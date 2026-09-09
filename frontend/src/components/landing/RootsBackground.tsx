'use client';

export default function RootsBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#f8fafc]">
      {/* 1. Yuqori markaziy mayin zumrad tuman nuri */}
      <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 size-[54rem] rounded-full bg-gradient-to-b from-emerald-100/70 via-teal-50/40 to-transparent blur-[140px]" />
      
      {/* 2. Nozik ikkilamchi osmon/safir rang yorug'lik chuqurligi */}
      <div className="absolute -left-20 top-[20%] size-[40rem] rounded-full bg-sky-100/40 blur-[150px]" />
      <div className="absolute -right-20 top-[40%] size-[36rem] rounded-full bg-emerald-100/40 blur-[150px]" />

      {/* 3. Zamonaviy nozik mikro-nuqtali grid (Dot matrix) — oq fon uchun */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_15%,#000_60%,transparent_100%)] opacity-80" />

      {/* 4. Pastki qismga o'tish */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8fafc]/30 to-[#f8fafc]" />
    </div>
  );
}
