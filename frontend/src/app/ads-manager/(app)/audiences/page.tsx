'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, PageTitle, Panel, PanelHeader, SkeletonRows } from '@/components/ads/ui';
import { adsApi, fmtNum, type Audiences } from '@/lib/ads-api';

export default function AudiencesPage() {
  const [data, setData] = useState<Audiences | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { adsApi.audiences().then(setData).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <PageTitle title="Auditoriya" description="Platforma qo'llab-quvvatlaydigan nishonlash segmentlari. Sonlar taxminiy va pastga yaxlitlangan; kichik segmentlar ko'rsatilmaydi." />
      {error && <ErrorNote message={error} />}
      {!data ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-3">
            <div className="grid gap-px overflow-hidden rounded-xl bg-[var(--border-soft)] sm:grid-cols-3">
              <div className="bg-[var(--surface-card)] px-5 py-4">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Faol o&apos;quvchilar (30 kun)</div>
                <div className="mt-1.5 text-[24px] font-semibold tabular-nums">{data.active_students_30d === null ? `<${data.min_bucket}` : `~${fmtNum(data.active_students_30d)}+`}</div>
              </div>
              <div className="bg-[var(--surface-card)] px-5 py-4">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Fanlar</div>
                <div className="mt-1.5 text-[24px] font-semibold tabular-nums">{data.subjects.length}</div>
              </div>
              <div className="bg-[var(--surface-card)] px-5 py-4">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Hududlar (≥{data.min_bucket})</div>
                <div className="mt-1.5 text-[24px] font-semibold tabular-nums">{data.regions.length}</div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Fan" description="Kampaniya o'quvchining eng zaif faniga mos tanlanadi." />
            <ul className="divide-y divide-[var(--border-soft)] text-[13px]">
              {data.subjects.length === 0 && <li className="px-5 py-3 text-[var(--text-muted)]">Fanlar yo&apos;q</li>}
              {data.subjects.map((s) => <li key={s.value} className="px-5 py-2.5">{s.value}</li>)}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Hudud" description="Profilida hudud ko'rsatgan faol o'quvchilar." />
            {data.regions.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-[var(--text-muted)]">Hozircha hech bir hududda {data.min_bucket} tadan ortiq faol o&apos;quvchi yo&apos;q — &quot;Barcha hududlar&quot; tanlang.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)] text-[13px]">
                {data.regions.map((r) => (
                  <li key={r.value} className="flex justify-between px-5 py-2.5"><span>{r.value}</span><span className="tabular-nums text-[var(--text-muted)]">~{fmtNum(r.approx_size)}+</span></li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Natija va maxfiylik" />
            <div className="space-y-3 px-5 py-4 text-[13px] text-[var(--text-secondary)]">
              <p>{data.score_threshold.help}</p>
              <p className="text-[var(--text-muted)]">
                Yosh, jins, sog&apos;liq va boshqa sezgir belgilar bo&apos;yicha nishonlash mavjud emas. Alohida o&apos;quvchini aniqlash mumkin bo&apos;lgan filtrlar yo&apos;q; o&apos;quvchi ma&apos;lumoti faqat u o&apos;zi rozilik bilan ariza qoldirganda keladi.
              </p>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
