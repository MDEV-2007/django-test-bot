'use client';

/* iOS 18 Cupertino System Grouped Canvas with Soft Mesh Aura */
export default function AuthBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F2F2F7] dark:bg-black transition-colors"
    >
      {/* Cupertino soft radial mesh auras */}
      <div
        className="absolute -top-48 left-1/2 -translate-x-1/2 h-[540px] w-[960px] rounded-full opacity-60 dark:opacity-35 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle at 30% 35%, rgba(0, 122, 255, 0.16), rgba(52, 199, 89, 0.12) 45%, rgba(88, 86, 214, 0.1) 80%, transparent 100%)',
        }}
      />
      <div
        className="absolute -bottom-40 -right-24 h-[420px] w-[520px] rounded-full opacity-50 dark:opacity-25 blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 122, 255, 0.12) 0%, rgba(52, 199, 89, 0.08) 60%, transparent 100%)',
        }}
      />
    </div>
  );
}
