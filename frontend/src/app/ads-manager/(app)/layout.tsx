import AdsShell from '@/components/ads/AdsShell';

export default function AdsAppLayout({ children }: { children: React.ReactNode }) {
  return <AdsShell>{children}</AdsShell>;
}
