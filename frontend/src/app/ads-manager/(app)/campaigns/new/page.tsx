'use client';

import CampaignWizard from '@/components/ads/CampaignWizard';
import { PageTitle } from '@/components/ads/ui';

export default function NewCampaignPage() {
  return (
    <>
      <PageTitle title="Yangi kampaniya" description="Qoralama sifatida saqlang yoki moderatsiyaga yuboring. Administrator tasdiqlamaguncha kampaniya ko'rsatilmaydi." />
      <CampaignWizard />
    </>
  );
}
