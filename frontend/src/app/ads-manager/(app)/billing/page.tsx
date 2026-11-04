'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, PageTitle, Panel, PanelHeader, SkeletonRows } from '@/components/ads/ui';
import { adsApi } from '@/lib/ads-api';

export default function BillingPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adsApi.billing>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { adsApi.billing().then(setData).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <PageTitle title="Billing" />
      {error && <ErrorNote message={error} />}
      {!data ? <SkeletonRows rows={3} /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="To'lovlar hozircha mavjud emas" />
            <div className="space-y-3 px-5 py-4 text-[14px] text-[var(--text-secondary)]">
              <p>{data.reason}</p>
              <p>Shu sababli kabinetda sarf (spend), CPL, balans va qolgan pul byudjeti ko&apos;rsatilmaydi — taxminiy yoki soxta raqamlar ishlatilmaydi.</p>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Byudjet qanday ishlaydi" />
            <div className="space-y-3 px-5 py-4 text-[14px] text-[var(--text-secondary)]">
              <p>{data.budget_help}</p>
              <p className="text-[var(--text-muted)]">To&apos;lov integratsiyasi ulanganda bu yerda balans, tranzaksiyalar va hisob-fakturalar paydo bo&apos;ladi.</p>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
