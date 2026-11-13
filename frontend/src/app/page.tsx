import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileCheck2, Bot, Swords, BarChart3, ArrowUpRight,
  Sprout, Send, Sparkles, CheckCircle2,
  Star, Film
} from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import HeroInteractiveQuiz from '@/components/landing/HeroInteractiveQuiz';
import ResultsTicker from '@/components/landing/ResultsTicker';
import SubjectsShowcase from '@/components/landing/SubjectsShowcase';
import BentoGrid from '@/components/landing/BentoGrid';
import SocialProofAndStats from '@/components/landing/SocialProofAndStats';
import LeadMagnetBanner from '@/components/landing/LeadMagnetBanner';
import PricingSection, { PlanCard, FALLBACK_PLANS, FREE_PLAN } from '@/components/landing/PricingSection';
import FaqAccordion from '@/components/landing/FaqAccordion';
import { AEO_FAQ_ITEMS } from '@/lib/faq-data';
import MobileStickyCta from '@/components/landing/MobileStickyCta';
import LandingAiChatWidget from '@/components/landing/LandingAiChatWidget';
import ProductWorkflow from '@/components/landing/ProductWorkflow';
import WeeklyLeaderboardSection from '@/components/landing/WeeklyLeaderboardSection';
import TelegramBannerCta from '@/components/landing/TelegramBannerCta';
import { AuthRedirect } from '@/components/landing/AuthRedirect';
import LandingForceLight from '@/components/landing/LandingForceLight';
import { BrandMark } from '@/components/BrandMark';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va DTMga AI bilan tayyorgarlik",
  description:
    "Milliy sertifikat va DTM (BMB) formatidagi mock testlar, 24/7 AI mentor va har bir xato bo'yicha tahlil. "
    + "Kuchsiz mavzuni toping va ildizidan tuzating.",
  keywords: [
    'milliy sertifikat', 'BBA', 'DTM', 'mock test', 'onlayn test', 'tarix testlari',
    'cefr multi-level', 'abituriyent', 'test yechish', 'IlmIldizi', 'AI mentor', "ta'lim platformasi",
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: SITE_URL,
    siteName: 'IlmIldizi',
    title: "IlmIldizi — Milliy sertifikat va DTM imtihonlariga AI tayyorgarlik",
    description:
      "Mock testlar, 24/7 AI mentor va darslik iqtiboslari bilan chuqur tahlil. Kuchsiz mavzuni ildizidan yo'q qiling.",
  },
  twitter: {
    card: 'summary_large_image',
    title: "IlmIldizi — Intellektual ta'lim platformasi",
    description: "Milliy sertifikat va DTM imtihonlariga AI bilan tayyorgarlik.",
  },
};

const RIBBONS: Record<number, string> = {
  180: 'TAVSIYA ETILADI',
  365: 'ENG FOYDALI NARX',
};

type ApiPlan = {
  plan_type: string; name: string; description: string;
  price: string; duration_days: number; features: string[];
};

async function loadPlans(): Promise<PlanCard[]> {
  try {
    const base = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8001';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${base}/api/premium/public-plans/`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (!res.ok) return FALLBACK_PLANS;

    const data: { plans: ApiPlan[] } = await res.json();
    if (!data.plans?.length) return FALLBACK_PLANS;

    const sum = (value: string) => Math.round(Number(value)).toLocaleString('uz-UZ');
    const cards: PlanCard[] = data.plans.map((plan) => {
      const oneOff = plan.duration_days === 0;
      return {
        name: plan.name,
        price: sum(plan.price),
        unit: oneOff ? "so'm (bir martalik)" : `so'm / ${plan.duration_days} kun`,
        perDay: oneOff
          ? undefined
          : `≈ ${sum(String(Number(plan.price) / plan.duration_days))} so'm/kun`,
        ribbon: RIBBONS[plan.duration_days],
        text: plan.description,
        features: plan.features,
        cta: oneOff ? 'Test tanlab ochish' : 'Obunani boshlash',
        href: oneOff ? '/tests' : '/premium',
        highlight: plan.duration_days === 180,
      };
    });

    return [FREE_PLAN, ...cards];
  } catch {
    return FALLBACK_PLANS;
  }
}

const FAQ = AEO_FAQ_ITEMS;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'IlmIldizi',
      inLanguage: 'uz-UZ',
      description: "Milliy sertifikat va BBA'ga onlayn tayyorgarlik platformasi.",
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#org`,
      name: 'IlmIldizi',
      url: SITE_URL,
      sameAs: [BOT_URL],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default async function LandingPage() {
  const plans = await loadPlans();

  return (
    <div className="theme-pastel ps-landing relative min-h-screen font-sans antialiased selection:bg-[#BFA6F0]/50">
      <AuthRedirect />
      <LandingForceLight />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNav />
      <MobileStickyCta />
      <LandingAiChatWidget />

      <main className="relative z-10 flex-1">
        {/* =========================================================
            HERO — dashboard uslubidagi editorial kompozitsiya
            ========================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Chap: matn */}
            <div className="space-y-7 text-center lg:col-span-7 lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="ps-chip">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--ps-green)] opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-[var(--ps-green)]" />
                  </span>
                  BMB va Milliy sertifikat formati · 2026
                </span>
                <span className="ps-chip !bg-[#080808] !text-[#FFFCF7]">Bepul boshlash</span>
              </div>

              <h1 className="ps-display text-[44px] sm:text-[64px] lg:text-[76px]">
                Milliy sertifikat va DTMga{' '}
                <span className="relative inline-block text-[var(--ps-purple)]">
                  AI bilan
                  <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                    <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                  </svg>
                </span>{' '}
                tayyorlaning<span className="text-[var(--ps-coral)]">.</span>
              </h1>

              <p className="mx-auto max-w-xl text-[16px] leading-relaxed text-[var(--text-secondary)] sm:text-[18px] lg:mx-0">
                Rasmiy formatdagi mock testlar, 24/7 AI mentor va har bir savoldan keyingi darslik sahifasi tahlili.{' '}
                <strong className="font-bold text-[var(--text-primary)]">Kuchsiz mavzuni toping, ildizidan yo&apos;q qiling.</strong>
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/register" className="ps-btn ps-btn-ink w-full sm:w-auto">
                  Hoziroq bepul boshlash
                  <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                </Link>
                <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="ps-btn ps-btn-ghost w-full sm:w-auto">
                  <Send className="size-4 text-[var(--ps-blue)]" />
                  Telegram bot orqali
                </a>
              </div>

              <div className="flex flex-col items-center gap-3 text-[13px] font-semibold text-[var(--text-secondary)] sm:flex-row sm:justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[var(--ps-green)]" /> Ro&apos;yxatdan o&apos;tish bepul</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[var(--ps-green)]" /> Karta kiritish talab etilmaydi</span>
              </div>

              {/* Tezkor modullar */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
                {[
                  { icon: FileCheck2, label: 'Mock testlar', href: '/tests', tone: 'bg-[var(--ps-green)] text-white' },
                  { icon: Bot, label: '24/7 AI Mentor', href: '#imkoniyatlar', tone: 'bg-[var(--ps-purple)] text-white' },
                  { icon: BarChart3, label: 'OTM bashorati', href: '/profile', tone: 'bg-[var(--ps-blue)] text-[#080808]' },
                  { icon: Film, label: 'Bilim Reels', href: '/reels', tone: 'bg-[var(--ps-coral)] text-white' },
                  { icon: Sparkles, label: 'Kutubxona 5–11', href: '/library', tone: 'bg-[var(--ps-lilac)] text-[#080808]' },
                  { icon: Swords, label: '1v1 Arena', href: '/battles', tone: 'bg-[var(--ps-orange)] text-[#080808]' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-2.5 rounded-full bg-[var(--ps-paper)] p-1.5 pr-4 shadow-[var(--ds-panel-shadow)] transition-transform hover:-translate-y-0.5"
                  >
                    <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:-rotate-6 ${item.tone}`}>
                      <item.icon className="size-4" />
                    </span>
                    <span className="truncate text-[13px] font-bold text-[var(--text-primary)]">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* O'ng: jamoa rasmi kompozitsiyasi (dashboard hero bilan bir xil) */}
            <div className="relative mx-auto aspect-square w-full max-w-[420px] lg:col-span-5 lg:max-w-none">
              <div aria-hidden className="absolute inset-[6%] rounded-full bg-[var(--ps-orange)]" />
              <div aria-hidden className="absolute -left-2 bottom-[4%] size-[34%] rounded-tl-full bg-[var(--ps-coral)] sm:-left-4" />
              <div aria-hidden className="ps-dots absolute right-[2%] top-[2%] size-[26%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
              <div aria-hidden className="absolute -right-1 bottom-[16%] h-[13%] w-[38%] rotate-[-18deg] rounded-full bg-[var(--ps-green)]" />
              <div className="absolute inset-[12%] overflow-hidden rounded-full border-[6px] border-[#FFFCF7] bg-[var(--ps-sky)] shadow-[0_30px_60px_-30px_rgba(40,20,80,0.7)]">
                <Image
                  src="/images/dashboard-hero-team.webp"
                  alt="IlmIldizi jamoasi"
                  fill
                  priority
                  sizes="(max-width: 1024px) 360px, 480px"
                  className="object-cover object-[50%_32%]"
                />
              </div>
              <svg aria-hidden viewBox="0 0 100 100" className="ps-spin absolute left-[4%] top-[6%] size-[16%] text-[#080808]">
                <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" />
              </svg>
              <span className="ps-chip ps-float absolute left-0 top-[44%]"><Star className="size-3.5 fill-[var(--ps-orange)] text-[var(--ps-orange)]" /> Rasmiy format</span>
              <span className="ps-chip ps-float-slow absolute right-0 top-[10%] !bg-[#080808] !text-[#FFFCF7]"><Bot className="size-3.5 text-[var(--ps-orange)]" /> 24/7 AI mentor</span>
              <span className="ps-chip ps-float absolute bottom-[4%] right-[10%]"><Swords className="size-3.5 text-[var(--ps-purple)]" /> 1v1 Arena</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            INTERAKTIV SINOV — 3 savolda darajangizni tekshiring
            ========================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 rounded-[40px] bg-[var(--ps-paper)] p-6 shadow-[var(--ds-panel-shadow)] sm:p-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="ps-chip !bg-[var(--ps-neutral)]"><Sparkles className="size-3.5 text-[var(--ps-purple)]" /> Interaktiv sinov</span>
              <h2 className="ps-display mt-5 text-[34px] sm:text-[44px]">
                Darajangizni <span className="text-[var(--ps-purple)]">hoziroq</span> tekshiring
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Ro&apos;yxatdan o&apos;tmasdan namuna savolni yechib ko&apos;ring — javobdan keyin darslik manbasi bilan izoh chiqadi.
              </p>
            </div>
            <div className="lg:col-span-7">
              <HeroInteractiveQuiz />
            </div>
          </div>
        </section>

        {/* =========================================================
            INFINITE STUDENT RESULTS TICKER (Social Proof Ticker)
            ========================================================= */}
        <ResultsTicker />

        {/* =========================================================
            FANLAR VITRINASI (Fanlar Vitrinasi)
            ========================================================= */}
        <RevealOnScroll>
          <SubjectsShowcase />
        </RevealOnScroll>

        {/* =========================================================
            BENTO GRID (Bento Grid)
            ========================================================= */}
        <RevealOnScroll>
          <BentoGrid />
        </RevealOnScroll>

        {/* =========================================================
            HAFTALIK YETAKCHILAR REYTINGI VA SHARHLAR
            ========================================================= */}
        <RevealOnScroll>
          <WeeklyLeaderboardSection />
        </RevealOnScroll>

        {/* =========================================================
            ISHONCH VA JONLI METRIKALAR
            ========================================================= */}
        <RevealOnScroll>
          <SocialProofAndStats />
        </RevealOnScroll>

        {/* =========================================================
            LEAD MAGNET (BEPUL PDF SOVG'A)
            ========================================================= */}
        <RevealOnScroll>
          <LeadMagnetBanner />
        </RevealOnScroll>

        {/* =========================================================
            AEO / SEO SEMANTIK EKOTIZIM: TARIX, CEFR, CLASSROOM, BOT
            ========================================================= */}
        <section aria-label="Ilm Ildizi Ekotizimi va Fanlar" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
              Imtihonlar va Asosiy Yo&apos;nalishlar
            </span>
            <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-[#080808] sm:text-4xl">
              DTM, Milliy Sertifikat va CEFR uchun Yagona Platforma
            </h2>
            <p className="mt-3 text-sm text-[#6B6577] leading-relaxed">
              6-sinfdan 11-sinfgacha maktab darsliklari, Rasch modeli algoritmi, AI yozma tahlil va Telegram bot integratsiyasi.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Tarix fani */}
            <div className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <span className="text-3xl">🏛️</span>
              <h3 className="mt-4 text-lg font-bold text-[#080808]">Tarix Fani va Interaktiv O&apos;yinlar</h3>
              <p className="mt-2 text-xs text-[#6B6577] leading-relaxed">
                6–11-sinf O&apos;zbekiston tarixi va Jahon tarixi davlat darsliklari asosida mavzuli testlar, Milliy sertifikat variantlari hamda Tarixiy xarita (<Link href="/games/map" className="text-[#7659C7] font-semibold underline">/games/map</Link>), Xronologiya (<Link href="/games/timeline" className="text-[#7659C7] font-semibold underline">/games/timeline</Link>) va Tarixiy shaxslar (<Link href="/games/character" className="text-[#7659C7] font-semibold underline">/games/character</Link>) o&apos;yinlari.
              </p>
            </div>

            {/* 2. CEFR Ingliz tili */}
            <div className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <span className="text-3xl">🇬🇧</span>
              <h3 className="mt-4 text-lg font-bold text-[#080808]">CEFR Ingliz Tili va AI Writing</h3>
              <p className="mt-2 text-xs text-[#6B6577] leading-relaxed">
                CEFR Multi-Level standartlari bo&apos;yicha Listening va Reading bo&apos;limlari, shuningdek rasmiy mezonlar asosida sun&apos;iy intellekt (AI Grader) tomonidan mezonlar bilan baholanuvchi Writing esse tekshiruvi.
              </p>
            </div>

            {/* 3. O'quv markazlari va Classroom */}
            <div className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <span className="text-3xl">🏫</span>
              <h3 className="mt-4 text-lg font-bold text-[#080808]">O&apos;quv Markazlari &amp; Ustozlar</h3>
              <p className="mt-2 text-xs text-[#6B6577] leading-relaxed">
                Repetitorlar va o&apos;quv markazlari uchun Classroom virtual sinflari, PDF formatidagi testlarni AI yordamida bir zumda platformaga yuklash va guruhlar bo&apos;yicha jonli mock imtihonlar o&apos;tkazish imkoniyati.
              </p>
            </div>

            {/* 4. Telegram bot & AI Ustoz */}
            <div className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <span className="text-3xl">🤖</span>
              <h3 className="mt-4 text-lg font-bold text-[#080808]">@ilmildiziuz_bot &amp; AI Ustoz</h3>
              <p className="mt-2 text-xs text-[#6B6577] leading-relaxed">
                Rasmiy <a href="https://t.me/ilmildiziuz_bot" target="_blank" rel="noopener noreferrer" className="text-[#7659C7] font-semibold underline">@ilmildiziuz_bot</a> Telegram boti orqali kunlik mashqlar, UZBMB viktorinalari va <Link href="/mentor" className="text-[#7659C7] font-semibold underline">AI Ustoz (/mentor)</Link> bilan xatolarni tahlil qilish.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            QANDAY ISHLAYDI (ILMILDIZI O'RGANISH SIKLI - 6 BOSQICH)
            ========================================================= */}
        <RevealOnScroll>
          <ProductWorkflow />
        </RevealOnScroll>

        {/* =========================================================
            TELEGRAM BOT CTA BANNER (/start)
            ========================================================= */}
        <RevealOnScroll>
          <TelegramBannerCta />
        </RevealOnScroll>

        {/* =========================================================
            NARXLAR BO'LIMI (Tariflar Bo'limi)
            ========================================================= */}
        <PricingSection plans={plans} />

        {/* =========================================================
            SAVOLLAR (Savollar & Javoblar)
            ========================================================= */}
        <RevealOnScroll>
          <FaqAccordion items={FAQ} />
        </RevealOnScroll>

        {/* =========================================================
            YAKUNIY CHAQIRIQ
            ========================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="relative overflow-hidden rounded-[40px] bg-[#080808] p-8 text-center text-[#FFFCF7] sm:p-14">
              <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-[var(--ps-purple)] opacity-60" />
              <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full bg-[var(--ps-orange)] opacity-80" />
              <span aria-hidden className="ps-dots pointer-events-none absolute bottom-6 right-10 h-20 w-36 opacity-30" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-green)] text-white">
                  <Sprout className="size-8" />
                </span>

                <h2 className="ps-display mt-6 text-[34px] text-[#FFFCF7] sm:text-[48px]">
                  Bugun bitta test — imtihonda esa{' '}
                  <span className="text-[var(--ps-orange)]">grant va kontrakt</span> farqi!
                </h2>

                <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                  O&apos;z bilimingizni hoziroq sinab ko&apos;ring. Hech qanday to&apos;lovsiz, Telegram orqali 10 soniyada kiring va diagnostik testni yeching.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/register" className="ps-btn ps-btn-light w-full sm:w-auto">
                    Bepul boshlash
                    <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                  </Link>
                  <a
                    href={BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ps-btn w-full border-[1.5px] border-white/20 text-[#FFFCF7] hover:bg-white/10 sm:w-auto"
                  >
                    <Send className="size-4 text-[var(--ps-blue)]" /> Telegram bot
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[12.5px] font-semibold text-white/70">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CheckCircle2 className="size-3.5 text-[var(--ps-green)]" /> Karta talab etilmaydi</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CheckCircle2 className="size-3.5 text-[var(--ps-green)]" /> 10 soniyada tayyor</span>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* =========================================================
          FOOTER
          ========================================================= */}
      <footer className="relative z-10 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[36px] bg-[var(--ps-paper)] p-6 shadow-[var(--ds-panel-shadow)] sm:p-8">
          <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
            <div className="flex items-center gap-3">
              <BrandMark size={40} rounded="rounded-full" />
              <span className="font-[family-name:var(--font-grotesk)] text-[20px] font-bold tracking-[-0.03em] text-[#080808]">
                <span data-no-translit>Ilm<span className="text-[var(--ps-purple)]">Ildizi</span></span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
              {[
                ['#imkoniyatlar', 'Imkoniyatlar'],
                ['#qanday', 'Qanday ishlaydi'],
                ['#narxlar', 'Narxlar'],
                ['#savollar', 'Savollar'],
                ['/dtm-test', 'DTM test yechish'],
                ['/milliy-sertifikat', 'Milliy sertifikat testlari'],
                ['/login', 'Kirish'],
                ['/register', "Ro'yxatdan o'tish"],
              ].map(([href, label]) =>
                href.startsWith('#') ? (
                  <a key={href} href={href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-[var(--ps-neutral)] hover:text-[var(--text-primary)]">{label}</a>
                ) : (
                  <Link key={href} href={href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-[var(--ps-neutral)] hover:text-[var(--text-primary)]">{label}</Link>
                )
              )}
            </nav>
          </div>

          <div className="mt-6 border-t border-[var(--border-card)] pt-5 text-center text-[12px] font-semibold text-[var(--text-muted)]">
            © {new Date().getFullYear()} <span data-no-translit>IlmIldizi</span>. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
