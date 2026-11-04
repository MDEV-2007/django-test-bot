'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CampaignWizard from '@/components/ads/CampaignWizard';
import { ErrorNote, PageTitle, SkeletonRows } from '@/components/ads/ui';
import { adsApi, type Campaign } from '@/lib/ads-api';

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adsApi.campaign(id).then((r) => setCampaign(r.campaign)).catch((e) => setError(e.message));
  }, [id]);

  return (
    <>
      <PageTitle title={campaign ? `Tahrirlash: ${campaign.title}` : 'Tahrirlash'} />
      {error ? <ErrorNote message={error} /> : !campaign ? <SkeletonRows rows={6} />
        : campaign.ended_manually_at || campaign.status === 'pending_review'
          ? <ErrorNote message={campaign.status === 'pending_review' ? "Kampaniya ko'rib chiqilmoqda — natijani kuting." : 'Yakunlangan kampaniyani tahrirlab bo\'lmaydi.'} />
          : <CampaignWizard initial={campaign} />}
    </>
  );
}
