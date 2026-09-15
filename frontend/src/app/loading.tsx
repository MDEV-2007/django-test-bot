import BrandLoader from '@/components/BrandLoader';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-bg)]/80 backdrop-blur-md">
      <BrandLoader size={80} label="IlmIldizi yuklanmoqda..." />
    </div>
  );
}
