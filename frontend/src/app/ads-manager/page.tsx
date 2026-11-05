'use client';

import Link from 'next/link';
import {
  ArrowRight, BarChart3, BellRing, CheckCircle2, ChevronDown, Filter, Lock, ShieldCheck, Target, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdsBrand, useAdsSessionCheck } from '@/components/ads/AdsShell';
import { cn } from '@/lib/utils';

/* ads.ilmildizi.uz bosh sahifasi — ochiq landing.
   Qoida: hech qanday soxta statistika yo'q (mijozlar soni, "+300% lid" va h.k.).
   Hero'dagi vizual — mahsulotning o'zi: o'quvchi ko'radigan reklama kartasi va
   markazga keladigan Telegram xabari formati, "Namuna" deb belgilangan. */

type Session = ReturnType<typeof useAdsSessionCheck>;

function ctaFor(session: Session) {
  if (session.user && session.center) {
    return session.center.status === 'approved'
      ? { href: '/dashboard', label: "Kabinetga o'tish" }
      : { href: '/status', label: 'Ariza holati' };
  }
  return { href: '/apply', label: 'Ariza topshirish' };
}

const FEATURES = [
  {
    icon: Target, title: 'Aniq nishonlash', wide: true,
    body: "Reklama o'quvchining eng zaif faniga, hududiga va so'nggi test natijasiga mos tanlanadi. Tarix bo'yicha kurs — tarixdan qiynalayotgan o'quvchiga.",
    tags: ['Fan', 'Hudud', 'Test natijasi'],
  },
  {
    icon: Users, title: 'Rozilik bilan lidlar',
    body: "O'quvchi raqamini o'zi, aniq rozilik bilan yuboradi. Voyaga yetmaganlar uchun ota-ona roziligi tasdig'i so'raladi.",
  },
  {
    icon: BellRing, title: "Telegram'ga darhol",
    body: "Har bir yangi lid markazingiz Telegram guruhiga zaif mavzular bilan birga keladi.",
  },
  {
    icon: BarChart3, title: 'Haqiqiy statistika',
    body: "Ko'rsatish, noyob qamrov, bosish, CTR, lid va konversiya — faqat qayd etilgan hodisalardan. O'lchanmagan narsa N/A.",
  },
  {
    icon: Filter, title: 'Lidlar CRM',
    body: "Har bir ariza holatini yuriting, ichki izoh qoldiring va roziligi bor lidlarni CSV'ga eksport qiling.",
    tags: ['Yangi', "Bog'lanildi", "Ro'yxatdan o'tdi", 'Rad etildi'],
  },
];

const STEPS = [
  { title: 'Ariza qoldiring', body: "Markaz ma'lumotlari va kabinet uchun login — 2 daqiqa." },
  { title: 'Tasdiqlash', body: 'Administrator markazingizni tekshiradi.' },
  { title: 'Kampaniya yarating', body: 'Matn, banner, auditoriya va lid limiti — 6 qadamda.' },
  { title: 'Lidlarni qabul qiling', body: "Moderatsiyadan so'ng reklama o'quvchilarga chiqadi." },
];

const FAQ = [
  {
    q: 'Narxi qancha?',
    a: "Hozircha to'lov olinmaydi. Kampaniya hajmi lid limiti bilan cheklanadi: limitga yetganda kampaniya avtomatik to'xtaydi. To'lov tizimi ulanganda shartlar oldindan e'lon qilinadi.",
  },
  {
    q: "Reklama qayerda ko'rinadi?",
    a: "O'quvchilar lentasida va bosh sahifadagi tavsiya kartasida, \"Reklama\" belgisi bilan. Bir vaqtda o'quvchiga bitta eng mos taklif ko'rsatiladi.",
  },
  {
    q: "O'quvchi ma'lumotlarini kim ko'radi?",
    a: "Faqat siz — va faqat o'quvchi ariza qoldirib, rozilik bergan bo'lsa. Rozilik bo'lmasa ism va telefon yashirin turadi. Alohida o'quvchini tanlab nishonlash imkoni yo'q.",
  },
  {
    q: 'Kampaniya qachon ishga tushadi?',
    a: "Moderatsiyaga yuborilgandan so'ng administrator tekshiradi. Tasdiqlangach belgilangan sanadan (yoki darhol) ko'rsatila boshlaydi.",
  },
];

/* ─── Hero vizuali: mahsulotning o'zi ─────────────────────────────────────── */

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mx-0" aria-hidden>
      <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)] blur-2xl" />

      {/* O'quvchi ko'radigan reklama kartasi */}
      <div className="relative ml-auto w-[300px] rotate-[1.5deg] rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card)] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] sm:w-[320px]">
        <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-medium text-[var(--text-faint)]">
          <span>O&apos;quvchi lentasi</span>
          <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5">Namuna</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)]">
          <div className="relative aspect-[1200/628] bg-[linear-gradient(135deg,#2D6A4F_0%,#1B4332_60%,#081C15_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/70">DTM 2026</div>
              <div className="text-[18px] font-semibold leading-tight">Tarix intensiv kursi</div>
            </div>
          </div>
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-[var(--brand-soft)] text-[10px] font-bold text-[var(--brand-text)]">M</span>
              <span className="text-[12px] font-semibold">Markazingiz nomi</span>
              <span className="ml-auto rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">Reklama</span>
            </div>
            <span className="inline-block rounded-full bg-[var(--reward-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--reward-text)]">1-dars bepul</span>
            <p className="text-[12px] leading-snug text-[var(--text-muted)]">Haftada 3 dars, mock testlar va shaxsiy mentor.</p>
            <div className="rounded-lg bg-[var(--brand)] py-2 text-center text-[12px] font-semibold text-[var(--on-brand)]">Bepul darsga yozilish</div>
          </div>
        </div>
      </div>

      {/* Markazga keladigan Telegram xabari */}
      <div className="relative -mt-6 w-[270px] -rotate-[2deg] rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] sm:-mt-10 sm:w-[290px]">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300"><BellRing className="size-3.5" /></span>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold">Yangi lid · Telegram</div>
            <div className="text-[10px] text-[var(--text-faint)]">Markaz guruhiga</div>
          </div>
          <span className="ml-auto rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-faint)]">Namuna</span>
        </div>
        <dl className="mt-3 grid grid-cols-[86px_1fr] gap-y-1.5 text-[11px]">
          <dt className="text-[var(--text-faint)]">O&apos;quvchi</dt><dd className="font-medium">Ism Familiya</dd>
          <dt className="text-[var(--text-faint)]">Telefon</dt><dd className="font-medium tabular-nums">+998 •• ••• •• ••</dd>
          <dt className="text-[var(--text-faint)]">Zaif mavzu</dt><dd className="font-medium">Amir Temur davri</dd>
          <dt className="text-[var(--text-faint)]">Rozilik</dt><dd className="inline-flex items-center gap-1 font-medium text-[var(--success-text)]"><Lock className="size-3" /> Tasdiqlangan</dd>
        </dl>
      </div>
    </div>
  );
}

/* ─── Sahifa ──────────────────────────────────────────────────────────────── */

export default function AdsLandingPage() {
  const session = useAdsSessionCheck();
  const cta = ctaFor(session);
  const signedIn = !!(session.user && session.center);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--bg-page)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Bosh sahifa"><AdsBrand /></Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#imkoniyatlar" className="hidden rounded-lg px-3 py-2 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:inline">Imkoniyatlar</a>
            <a href="#savollar" className="hidden rounded-lg px-3 py-2 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:inline">Savollar</a>
            {!signedIn && !session.loading && (
              <Link href="/login" className="rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">Kirish</Link>
            )}
            <Button asChild size="sm"><Link href={cta.href}>{signedIn ? cta.label : 'Boshlash'}</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-soft)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.3fr_1fr] lg:pb-28 lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)]">
                <span className="size-1.5 rounded-full bg-[var(--brand)]" /> O&apos;quv markazlari uchun
              </span>
              <h1 className="mt-6 text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
                Imtihonga tayyorlanayotgan o&apos;quvchilarga{' '}
                <span className="bg-[linear-gradient(90deg,var(--brand)_0%,#52B788_100%)] bg-clip-text text-transparent">markazingizni ko&apos;rsating</span>
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--text-muted)]">
                IlmIldizi — DTM va Milliy sertifikatga tayyorlanish platformasi. Reklamangiz aynan sizning faningizdan
                yordam izlayotgan o&apos;quvchilarga chiqadi, lidlar esa rozilik bilan keladi.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group min-w-48">
                  <Link href={cta.href}>{cta.label}<ArrowRight className="transition-transform group-hover:translate-x-0.5" /></Link>
                </Button>
                {!signedIn && (
                  <Button asChild size="lg" variant="outline"><Link href="/login">Kabinetga kirish</Link></Button>
                )}
              </div>
              <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--text-muted)]">
                {['Har kampaniya moderatsiyada', 'Faqat rozilik bilan lidlar', 'Hozircha to\'lovsiz'].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[var(--brand)]" />{t}</li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* Imkoniyatlar — bento */}
        <section id="imkoniyatlar" className="scroll-mt-20 border-t border-[var(--border-soft)] bg-[var(--surface-card)]/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--brand-text)]">Imkoniyatlar</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">Reklamadan lidgacha — bitta kabinetda</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body, wide, tags }) => (
                <article key={title}
                  className={cn('group rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-6 transition hover:border-[var(--brand-border)] hover:shadow-[0_20px_50px_-30px_rgba(45,106,79,0.45)] sm:p-7',
                    wide && 'md:col-span-2')}>
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:scale-105">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold">{title}</h3>
                  <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-[var(--text-muted)]">{body}</p>
                  {tags && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full border border-[var(--border-card)] px-2.5 py-1 text-[12px] text-[var(--text-secondary)]">{t}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Qanday ishlaydi */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--brand-text)]">Jarayon</p>
          <h2 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">Qanday ishlaydi</h2>
          <ol className="relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <div className="absolute left-5 right-5 top-5 hidden h-px bg-[linear-gradient(90deg,var(--brand-border),var(--border-soft))] lg:block" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="relative grid size-10 place-items-center rounded-full border border-[var(--brand-border)] bg-[var(--bg-page)] text-[14px] font-semibold text-[var(--brand-text)]">{i + 1}</span>
                <h3 className="mt-5 text-[16px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Ishonch */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] p-7 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck className="size-5" /></span>
              <h2 className="mt-5 text-[26px] font-semibold tracking-tight">Shaffof va xavfsiz</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
                O&apos;quvchilar ishonchi — platformaning asosi. Shu sababli reklama qat&apos;iy qoidalar bilan ishlaydi.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ['Moderatsiya', "Har kampaniya ko'rsatilishidan oldin tekshiriladi."],
                ['"Reklama" belgisi', "O'quvchi reklamani boshqa kontentdan aniq ajratadi."],
                ['Rozilik', "Ism va telefon faqat o'quvchi roziligi bilan ko'rinadi."],
                ['Halol hisob', "Ko'rsatish va bosish foydalanuvchidan kuniga bir marta."],
              ].map(([t, d]) => (
                <li key={t} className="rounded-xl border border-[var(--border-soft)] p-4">
                  <div className="flex items-center gap-2 text-[14px] font-semibold"><CheckCircle2 className="size-4 text-[var(--brand)]" />{t}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="savollar" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-24">
          <h2 className="text-center text-[30px] font-semibold tracking-tight sm:text-[36px]">Ko&apos;p beriladigan savollar</h2>
          <div className="mt-10 divide-y divide-[var(--border-card)] rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)]">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="size-4 shrink-0 text-[var(--text-faint)] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-muted)]">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Yakuniy CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#2D6A4F_0%,#1B4332_100%)] px-7 py-14 text-center text-white sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.14),transparent_45%)]" aria-hidden />
            <h2 className="relative text-[28px] font-semibold tracking-tight sm:text-[36px]">Birinchi kampaniyangizni bugun tayyorlang</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/75">Ariza qoldiring — tasdiqlangach kabinetda kampaniya yaratib, moderatsiyaga yuborasiz.</p>
            <div className="relative mt-8 flex justify-center">
              <Button asChild size="lg" className="bg-white text-[#1B4332] shadow-none hover:bg-white/90">
                <Link href={cta.href}>{cta.label}<ArrowRight /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-soft)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-[var(--text-faint)] sm:px-6">
          <AdsBrand />
          <div className="flex gap-5">
            <a href="https://ilmildizi.uz" className="hover:text-[var(--text-primary)]">ilmildizi.uz</a>
            <span>© {new Date().getFullYear()} IlmIldizi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
