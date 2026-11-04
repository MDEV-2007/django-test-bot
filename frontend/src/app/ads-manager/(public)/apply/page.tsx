'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, fetchMe } from '@/lib/api-client';
import { useAuthStore, type Profile } from '@/lib/auth-store';
import { adsApi } from '@/lib/ads-api';
import { AdsBrand, FullPageLoader, useAdsSessionCheck } from '@/components/ads/AdsShell';
import { ErrorNote, Field, inputCls, textareaCls } from '@/components/ads/ui';

export default function AdsApplyPage() {
  const router = useRouter();
  const session = useAdsSessionCheck();
  const [form, setForm] = useState({
    center_name: '', city_or_region: '', contact_name: '', phone: '', contact_email: '', website: '',
    telegram_username: '', description: '', username: '', password: '',
  });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session.loading && session.center) router.replace(session.center.status === 'approved' ? '/dashboard' : '/status');
  }, [session, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body: Record<string, unknown> = { ...form, accept_terms: terms };
      if (session.user) { delete body.username; delete body.password; }
      const res = await adsApi.apply(body);
      if (res.access && res.refresh) {
        // Yangi hisob: sessiyani saqlaymiz, so'ng to'liq profilni /api/auth/me/ dan olamiz.
        const store = useAuthStore.getState();
        store.setSession(res.access, res.refresh, { username: res.user.username } as Profile);
        try { store.setUser(await fetchMe()); } catch { /* profil keyinroq yuklanadi */ }
      }
      router.replace('/status');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ariza yuborilmadi.');
      setBusy(false);
    }
  };

  if (session.loading || session.center) return <FullPageLoader />;

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <AdsBrand />
        <div className="mt-8 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)] p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold tracking-tight">Advertiser arizasi</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Ariza administrator tomonidan tekshiriladi. Tasdiqlangandan so&apos;ng kampaniya yaratishingiz mumkin.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            {error && <ErrorNote message={error} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Markaz nomi *" htmlFor="cn"><input id="cn" className={inputCls} value={form.center_name} onChange={set('center_name')} required minLength={2} /></Field>
              <Field label="Hudud *" htmlFor="rg"><input id="rg" className={inputCls} value={form.city_or_region} onChange={set('city_or_region')} required placeholder="Toshkent" /></Field>
              <Field label="Mas'ul shaxs *" htmlFor="ct"><input id="ct" className={inputCls} value={form.contact_name} onChange={set('contact_name')} required /></Field>
              <Field label="Telefon *" htmlFor="ph"><input id="ph" className={inputCls} value={form.phone} onChange={set('phone')} required placeholder="+998 90 123 45 67" inputMode="tel" /></Field>
              <Field label="Email" htmlFor="em"><input id="em" type="email" className={inputCls} value={form.contact_email} onChange={set('contact_email')} /></Field>
              <Field label="Veb-sayt" htmlFor="ws"><input id="ws" type="url" className={inputCls} value={form.website} onChange={set('website')} placeholder="https://" /></Field>
              <Field label="Telegram" htmlFor="tg"><input id="tg" className={inputCls} value={form.telegram_username} onChange={set('telegram_username')} placeholder="@markaz" /></Field>
            </div>
            <Field label="Markaz haqida" htmlFor="ds"><textarea id="ds" className={textareaCls} value={form.description} onChange={set('description')} maxLength={2000} /></Field>

            {session.user ? (
              <p className="rounded-lg bg-[var(--surface-hover)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                Ariza <b>@{session.user.username}</b> hisobiga bog&apos;lanadi.
              </p>
            ) : (
              <div className="grid gap-4 border-t border-[var(--border-soft)] pt-5 sm:grid-cols-2">
                <Field label="Login *" htmlFor="un" hint="Kabinetga kirish uchun"><input id="un" autoComplete="username" className={inputCls} value={form.username} onChange={set('username')} required minLength={3} /></Field>
                <Field label="Parol *" htmlFor="pw" hint="Kamida 8 belgi"><input id="pw" type="password" autoComplete="new-password" className={inputCls} value={form.password} onChange={set('password')} required minLength={8} /></Field>
              </div>
            )}

            <label className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>
                Reklama qoidalariga roziman: reklama haqqoniy bo&apos;ladi, o&apos;quvchilar ma&apos;lumotlari faqat ular rozilik bergan
                maqsadda ishlatiladi va uchinchi shaxslarga berilmaydi. Barcha kampaniyalar moderatsiyadan o&apos;tadi.
              </span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/login" className="text-[13px] text-[var(--text-muted)] hover:underline">Hisobim bor — kirish</Link>
              <Button type="submit" disabled={busy || !terms}>{busy ? 'Yuborilmoqda…' : 'Ariza yuborish'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
