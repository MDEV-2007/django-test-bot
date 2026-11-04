'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AdsBrand, FullPageLoader, adsLogout, useAdsSessionCheck } from '@/components/ads/AdsShell';
import { fmtDate } from '@/lib/ads-api';

const COPY = {
  pending: { title: "Arizangiz ko'rib chiqilmoqda", body: "Administrator markaz ma'lumotlarini tekshiradi. Tasdiqlangach shu sahifadan kabinetga o'tasiz." },
  rejected: { title: 'Ariza rad etildi', body: "Quyidagi sababni ko'rib chiqing. Savollar bo'lsa administrator bilan bog'laning." },
  suspended: { title: "Hisob to'xtatilgan", body: "Barcha kampaniyalaringiz ko'rsatilmayapti. Sabab quyida ko'rsatilgan." },
} as const;

export default function AdsStatusPage() {
  const router = useRouter();
  const session = useAdsSessionCheck();

  useEffect(() => {
    if (session.loading) return;
    if (!session.user) router.replace('/login');
    else if (!session.center) router.replace('/apply');
    else if (session.center.status === 'approved') router.replace('/dashboard');
  }, [session, router]);

  if (session.loading || !session.center || session.center.status === 'approved') return <FullPageLoader />;
  const status = session.center.status as keyof typeof COPY;
  const copy = COPY[status];

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-lg">
        <AdsBrand />
        <div className="mt-10 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)] p-6 sm:p-8">
          <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{session.center.name}</p>
          <h1 className="mt-2 text-[20px] font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-[14px] text-[var(--text-muted)]">{copy.body}</p>
          {session.center.review_note && (
            <div className="mt-4 rounded-lg bg-[var(--surface-hover)] px-4 py-3 text-[14px] text-[var(--text-secondary)]">
              {session.center.review_note}
            </div>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <dt className="text-[var(--text-muted)]">Ariza sanasi</dt><dd>{fmtDate(session.center.created_at, true)}</dd>
            {session.center.reviewed_at && (<><dt className="text-[var(--text-muted)]">Ko&apos;rib chiqilgan</dt><dd>{fmtDate(session.center.reviewed_at, true)}</dd></>)}
          </dl>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => session.reload()}>Holatni yangilash</Button>
            <Button variant="ghost" onClick={() => adsLogout(router)}>Chiqish</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
