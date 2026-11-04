import type { Metadata } from 'next';

/* ads.ilmildizi.uz — advertiser kabineti. proxy.ts `ads.*` hostini shu papkaga
   yo'naltiradi; asosiy domenda bu marshrutlar 404. Qidiruv tizimlariga ochilmaydi. */
export const metadata: Metadata = {
  title: { default: 'Ads Manager', template: '%s · IlmIldizi Ads' },
  description: "IlmIldizi reklama kabineti — o'quv markazlari uchun.",
  robots: { index: false, follow: false },
};

export default function AdsManagerLayout({ children }: { children: React.ReactNode }) {
  return <div className="ads-manager min-h-dvh bg-[var(--bg-page)] text-[var(--text-primary)]">{children}</div>;
}
