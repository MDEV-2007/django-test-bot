'use client';

import Link from 'next/link';
import { BarChart3, CheckCircle2, Filter, ShieldCheck, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdsBrand, useAdsSessionCheck } from '@/components/ads/AdsShell';

/* ads.ilmildizi.uz bosh sahifasi — ochiq landing. Kirgan advertiser shu yerdan
   kabinetga o'tadi; avtomatik /dashboard ga otib yuborilmaydi. Hech qanday soxta
   statistika (mijozlar soni, natijalar) ko'rsatilmaydi. */

const FEATURES = [
  { icon: Target, title: "Aniq nishonlash", body: "Fan, hudud va o'quvchining so'nggi test natijasi bo'yicha. Reklama aynan yordam kerak bo'lgan o'quvchiga chiqadi." },
  { icon: Users, title: 'Rozilik bilan lidlar', body: "O'quvchi telefon raqamini faqat o'zi rozilik berib yuboradi. Lid darhol Telegram guruhingizga keladi." },
  { icon: BarChart3, title: "Haqiqiy statistika", body: "Ko'rsatish, noyob qamrov, bosish, lid va ro'yxatdan o'tganlar — faqat qayd etilgan hodisalardan." },
  { icon: Filter, title: 'Lidlar CRM', body: "Har bir arizaning holatini yuriting: yangi, bog'lanildi, ro'yxatdan o'tdi, rad etildi." },
];

const STEPS = [
  { title: 'Ariza qoldiring', body: "Markaz ma'lumotlari va kabinet uchun login." },
  { title: 'Tasdiqlash', body: "Administrator markazingizni tekshiradi." },
  { title: 'Kampaniya yarating', body: "Matn, banner, auditoriya va lid limiti — 6 qadamda." },
  { title: 'Lidlarni qabul qiling', body: "Moderatsiyadan so'ng reklama o'quvchilarga ko'rsatiladi." },
];

function PrimaryCta() {
  const session = useAdsSessionCheck();
  if (session.loading) return <Button size="lg" disabled className="min-w-44">…</Button>;
  if (session.user && session.center) {
    const approved = session.center.status === 'approved';
    return (
      <Button asChild size="lg" className="min-w-44">
        <Link href={approved ? '/dashboard' : '/status'}>{approved ? "Kabinetga o'tish" : 'Ariza holati'}</Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild size="lg" className="min-w-44"><Link href="/apply">Ariza topshirish</Link></Button>
      {!session.user && <Button asChild size="lg" variant="outline"><Link href="/login">Kirish</Link></Button>}
    </>
  );
}

export default function AdsLandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[var(--border-card)] bg-[var(--bg-page)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <AdsBrand />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">Kirish</Link>
            <Button asChild size="sm"><Link href="/apply">Ariza</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--brand-text)]">O&apos;quv markazlari uchun reklama</p>
          <h1 className="mt-4 max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
            Imtihonga tayyorlanayotgan o&apos;quvchilarga markazingizni ko&apos;rsating
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--text-muted)] sm:text-[18px]">
            IlmIldizi — DTM va Milliy sertifikatga tayyorlanish platformasi. Ads Manager orqali kampaniya yarating, uni
            zaif faniga mos o&apos;quvchilarga ko&apos;rsating va rozilik bilan kelgan lidlarni bir joyda boshqaring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3"><PrimaryCta /></div>
        </section>

        <section className="border-y border-[var(--border-card)] bg-[var(--surface-card)]">
          <div className="mx-auto grid max-w-6xl gap-px bg-[var(--border-soft)] sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-[var(--surface-card)] p-6">
                <Icon className="size-5 text-[var(--brand)]" aria-hidden />
                <h2 className="mt-4 text-[15px] font-semibold">{title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-[24px] font-semibold tracking-tight">Qanday ishlaydi</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="grid size-8 place-items-center rounded-full bg-[var(--brand-soft)] text-[13px] font-semibold text-[var(--brand-text)]">{i + 1}</span>
                <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
                <p className="mt-1 text-[14px] text-[var(--text-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-8 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <ShieldCheck className="size-6 text-[var(--brand)]" aria-hidden />
              <h2 className="mt-4 text-[22px] font-semibold tracking-tight">Shaffof va xavfsiz</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
                Har bir kampaniya moderatsiyadan o&apos;tadi va o&apos;quvchilarga &quot;Reklama&quot; belgisi bilan ko&apos;rsatiladi.
                Alohida o&apos;quvchini tanlab nishonlash yoki shaxsiy belgilar bo&apos;yicha filtr yo&apos;q.
              </p>
            </div>
            <ul className="space-y-3 text-[14px]">
              {[
                "Telefon va ism faqat o'quvchi rozilik bergan bo'lsa ko'rinadi",
                "Voyaga yetmaganlar uchun ota-ona roziligi tasdig'i",
                "Ko'rsatish va bosish bir foydalanuvchidan kuniga bir marta sanaladi",
                "Hozircha to'lov olinmaydi — byudjet lid limiti bilan cheklanadi",
              ].map((t) => (
                <li key={t} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success-text)]" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-card)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-[var(--text-faint)] sm:px-6">
          <span>© IlmIldizi</span>
          <a href="https://ilmildizi.uz" className="hover:underline">ilmildizi.uz</a>
        </div>
      </footer>
    </div>
  );
}
