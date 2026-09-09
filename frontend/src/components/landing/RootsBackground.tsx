'use client';

export default function RootsBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07080b]">
      {/* 1. Yuqori markaziy Aurora nuri (Linear / Raycast uslubida) */}
      <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 size-[52rem] rounded-full bg-gradient-to-b from-emerald-500/15 via-teal-500/8 to-transparent blur-[130px]" />
      
      {/* 2. Nozik ikkilamchi binafsha/ko'k yorug'lik chuqurligi */}
      <div className="absolute -left-20 top-[25%] size-[36rem] rounded-full bg-indigo-500/[0.05] blur-[140px]" />
      <div className="absolute -right-20 top-[45%] size-[36rem] rounded-full bg-emerald-600/[0.06] blur-[140px]" />

      {/* 3. Zamonaviy nozik mikro-nuqtali grid (Dot matrix) */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_15%,#000_60%,transparent_100%)] opacity-70" />

      {/* 4. Pastki qismga yumshoq tumanli soya */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07080b]/40 to-[#07080b]" />
    </div>
  );
}
