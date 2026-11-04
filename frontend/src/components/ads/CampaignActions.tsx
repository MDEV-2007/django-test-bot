'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adsApi, type Campaign } from '@/lib/ads-api';

type Action = 'submit' | 'pause' | 'resume' | 'end' | 'duplicate';

const SUCCESS: Record<Action, string> = {
  submit: "Moderatsiyaga yuborildi",
  pause: "Kampaniya to'xtatildi",
  resume: 'Kampaniya davom ettirildi',
  end: 'Kampaniya yakunlandi',
  duplicate: 'Nusxa (qoralama) yaratildi',
};

/* Holatga mos amallar. Mavjud bo'lmagan amal ko'rsatilmaydi — backend baribir
   tekshiradi (409), lekin foydalanuvchi o'lik tugmani bosmasin. */
export function CampaignActions({ campaign, compact, onChanged }: {
  campaign: Campaign;
  compact?: boolean;
  onChanged: (c: Campaign, message?: string) => void;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const s = campaign.status;
  const approved = campaign.review_status === 'approved';

  const run = async (action: Action) => {
    setBusy(action);
    try {
      const res = await adsApi.campaignAction(campaign.id, action);
      onChanged(res.campaign, SUCCESS[action]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setBusy(null);
      setConfirmEnd(false);
    }
  };

  const size = compact ? 'xs' : 'sm';
  const canEdit = s !== 'pending_review' && !campaign.ended_manually_at;
  const canSubmit = s === 'draft' || s === 'rejected';
  const canPause = approved && campaign.is_active && !campaign.ended_manually_at && s !== 'ended';
  const canResume = approved && !campaign.is_active && !campaign.ended_manually_at;
  const canEnd = !campaign.ended_manually_at && s !== 'draft';

  return (
    <div className="inline-flex flex-wrap justify-end gap-1.5">
      {canEdit && <Button asChild variant="outline" size={size}><Link href={`/campaigns/${campaign.id}/edit`}>Tahrirlash</Link></Button>}
      {canSubmit && <Button size={size} disabled={!!busy} onClick={() => run('submit')}>Yuborish</Button>}
      {canPause && <Button variant="outline" size={size} disabled={!!busy} onClick={() => run('pause')}>To&apos;xtatish</Button>}
      {canResume && <Button variant="outline" size={size} disabled={!!busy} onClick={() => run('resume')}>Davom ettirish</Button>}
      {!compact && <Button variant="ghost" size={size} disabled={!!busy} onClick={() => run('duplicate')}>Nusxa olish</Button>}
      {canEnd && !compact && <Button variant="ghost" size={size} className="text-[var(--danger-text)]" disabled={!!busy} onClick={() => setConfirmEnd(true)}>Yakunlash</Button>}

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampaniyani yakunlaysizmi?</DialogTitle>
            <DialogDescription>
              Yakunlangan kampaniya qayta yoqilmaydi va tahrirlanmaydi. Lidlar va statistika saqlanadi; kerak bo&apos;lsa nusxa olib yangisini boshlashingiz mumkin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={busy === 'end'} onClick={() => run('end')}>Yakunlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
