'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { adsLogout, useAds } from '@/components/ads/AdsShell';
import { Field, PageTitle, Panel, PanelHeader, inputCls, textareaCls } from '@/components/ads/ui';
import { adsApi, fmtDate, type Center } from '@/lib/ads-api';

type Editable = Pick<Center, 'city_or_region' | 'phone' | 'contact_name' | 'contact_email' | 'website' | 'description' | 'telegram_username' | 'telegram_chat_id' | 'notify_new_leads'>;

export default function SettingsPage() {
  const router = useRouter();
  const { center, user, reload } = useAds();
  const [form, setForm] = useState<Editable>({
    city_or_region: center.city_or_region, phone: center.phone, contact_name: center.contact_name,
    contact_email: center.contact_email, website: center.website, description: center.description,
    telegram_username: center.telegram_username, telegram_chat_id: center.telegram_chat_id, notify_new_leads: center.notify_new_leads,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adsApi.updateProfile(form);
      await reload();
      toast.success('Saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlanmadi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Sozlamalar" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Markaz profili" description="Markaz nomini o'zgartirish uchun administratorga murojaat qiling." />
          <form onSubmit={save} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Markaz nomi"><input className={inputCls} value={center.name} disabled /></Field>
              <Field label="Hudud" htmlFor="r"><input id="r" className={inputCls} value={form.city_or_region} onChange={(e) => set('city_or_region', e.target.value)} /></Field>
              <Field label="Mas'ul shaxs" htmlFor="c"><input id="c" className={inputCls} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Field>
              <Field label="Telefon" htmlFor="p"><input id="p" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email" htmlFor="e"><input id="e" type="email" className={inputCls} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} /></Field>
              <Field label="Veb-sayt" htmlFor="w"><input id="w" type="url" className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            </div>
            <Field label="Tavsif" htmlFor="d"><textarea id="d" className={textareaCls} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>

            <div className="border-t border-[var(--border-soft)] pt-4">
              <h3 className="mb-3 text-[14px] font-semibold">Telegram va bildirishnomalar</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telegram username" htmlFor="tu"><input id="tu" className={inputCls} value={form.telegram_username} onChange={(e) => set('telegram_username', e.target.value)} /></Field>
                <Field label="Lidlar uchun chat ID" htmlFor="tc" hint="Botni guruhga qo'shing va guruh ID sini kiriting."><input id="tc" className={inputCls} value={form.telegram_chat_id} onChange={(e) => set('telegram_chat_id', e.target.value)} placeholder="-1001234567890" /></Field>
              </div>
              <label className="mt-3 flex items-center gap-2.5 text-[13px]">
                <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={form.notify_new_leads} onChange={(e) => set('notify_new_leads', e.target.checked)} />
                Yangi lid haqida Telegram xabari yuborilsin
              </label>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button></div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Hisob" />
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 px-5 py-4 text-[13px]">
              <dt className="text-[var(--text-muted)]">Holat</dt><dd className="font-medium text-[var(--success-text)]">Tasdiqlangan</dd>
              <dt className="text-[var(--text-muted)]">Tasdiqlangan</dt><dd>{fmtDate(center.reviewed_at, true)}</dd>
              <dt className="text-[var(--text-muted)]">Login</dt><dd>@{user.username}</dd>
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Xavfsizlik" />
            <div className="space-y-3 px-5 py-4 text-[13px] text-[var(--text-secondary)]">
              <p>Parolni o&apos;zgartirish va tiklash hozircha administrator orqali. Jamoa a&apos;zolarini qo&apos;shish keyingi bosqichda.</p>
              <Button variant="outline" size="sm" onClick={() => adsLogout(router)}>Chiqish</Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
