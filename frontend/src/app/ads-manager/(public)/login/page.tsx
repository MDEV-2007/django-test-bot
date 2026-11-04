'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { login, ApiError } from '@/lib/api-client';
import { adsApi } from '@/lib/ads-api';
import { AdsBrand, FullPageLoader, useAdsSessionCheck } from '@/components/ads/AdsShell';
import { ErrorNote, Field, inputCls } from '@/components/ads/ui';

function safeNext(raw: string | null): string {
  // Faqat ichki yo'l (open redirect bo'lmasin).
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useAdsSessionCheck();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.loading || !session.user) return;
    if (!session.center) router.replace('/apply');
    else if (session.center.status !== 'approved') router.replace('/status');
    else router.replace(safeNext(params.get('next')));
  }, [session, router, params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      const me = await adsApi.me();
      if (!me.center) router.replace('/apply');
      else if (me.center.status !== 'approved') router.replace('/status');
      else router.replace(safeNext(params.get('next')));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kirishda xatolik.');
      setBusy(false);
    }
  };

  if (session.loading || session.user) return <FullPageLoader />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <AdsBrand />
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-5 py-12">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">Reklama kabinetiga kirish</h1>
            <p className="mt-1 text-[14px] text-[var(--text-muted)]">IlmIldizi hisobingiz bilan kiring.</p>
          </div>
          {error && <ErrorNote message={error} />}
          <Field label="Login" htmlFor="u">
            <input id="u" autoComplete="username" className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Parol" htmlFor="p">
            <input id="p" type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Tekshirilmoqda…' : 'Kirish'}</Button>
          <p className="text-center text-[13px] text-[var(--text-muted)]">
            Markazingiz hali ro&apos;yxatdan o&apos;tmaganmi?{' '}
            <Link href="/apply" className="font-medium text-[var(--brand-text)] hover:underline">Ariza topshirish</Link>
          </p>
          <p className="text-center text-[12px] text-[var(--text-faint)]">
            Parolni unutdingizmi? Hozircha tiklash administrator orqali amalga oshiriladi.
          </p>
        </form>
        <p className="text-[12px] text-[var(--text-faint)]">© IlmIldizi</p>
      </div>
      <div className="hidden border-l border-[var(--border-card)] bg-[var(--surface-card)] lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md px-12">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--brand-text)]">O&apos;quv markazlari uchun</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
            Imtihonga tayyorlanayotgan o&apos;quvchilarga aniq, o&apos;lchanadigan reklama.
          </h2>
          <ul className="mt-6 space-y-3 text-[14px] text-[var(--text-secondary)]">
            <li>— Fan, hudud va natija bo&apos;yicha nishonlash</li>
            <li>— Faqat rozilik bergan o&apos;quvchilarning lidlari</li>
            <li>— Haqiqiy ko&apos;rsatish, bosish va lid statistikasi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AdsLoginPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
