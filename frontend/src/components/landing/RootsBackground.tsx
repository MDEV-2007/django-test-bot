'use client';

export default function RootsBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F7F4EF]">
      {/* 1. Apple iOS 18 Top Mesh Aura (Soft System Blue & System Green) */}
      <div className="absolute left-1/2 top-[-14%] -translate-x-1/2 w-[68rem] h-[42rem] rounded-full bg-gradient-to-b from-[#7659C7]/12 via-[#4C806B]/10 to-transparent blur-[130px]" />

      {/* 2. Subtle Secondary Ambient Orbs */}
      <div className="absolute -left-24 top-[22%] size-[38rem] rounded-full bg-[#4C806B]/8 blur-[140px]" />
      <div className="absolute -right-24 top-[38%] size-[38rem] rounded-full bg-[#7659C7]/8 blur-[140px]" />

      {/* 3. Ultra-fine Apple Keynote Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(28,28,30,0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_75%_50%_at_50%_12%,#000_50%,transparent_100%)] opacity-75" />

      {/* 4. Smooth vertical fade into iOS systemGroupedBackground */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-[#F7F4EF]" />
    </div>
  );
}
