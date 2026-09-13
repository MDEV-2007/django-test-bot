import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileCheck2, Bot, Swords, BarChart3, ArrowRight,
  Sprout, Send, Sparkles, Clock, CheckCircle2,
  Compass, Award, ShieldCheck, Zap, Star
} from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import RootsBackground from '@/components/landing/RootsBackground';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import HeroInteractiveQuiz from '@/components/landing/HeroInteractiveQuiz';
import ResultsTicker from '@/components/landing/ResultsTicker';
import SubjectsShowcase from '@/components/landing/SubjectsShowcase';
import BentoGrid from '@/components/landing/BentoGrid';
import SocialProofAndStats from '@/components/landing/SocialProofAndStats';
import LeadMagnetBanner from '@/components/landing/LeadMagnetBanner';
import PricingSection, { PlanCard, FALLBACK_PLANS, FREE_PLAN } from '@/components/landing/PricingSection';
import FaqAccordion from '@/components/landing/FaqAccordion';
import MobileStickyCta from '@/components/landing/MobileStickyCta';
import LandingAiChatWidget from '@/components/landing/LandingAiChatWidget';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va BBA'ga onlayn tayyorgarlik platformasi",
  description:
    "Rasmiy formatdagi mock testlar, AI mentor, zaif mavzular tahlili va DTM ball bashorati. "
    + "Kuchsiz mavzuni top, ildizidan yo'q qil. Telegram orqali 1 bosishda kiring.",
  keywords: [
    'milliy sertifikat', 'BBA', 'DTM', 'mock test', 'onlayn test', 'tarix testlari',
    'cefr multi-level', 'abituriyent', 'test yechish', 'IlmIldizi', 'AI mentor',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: SITE_URL,
    siteName: 'IlmIldizi',
    title: "IlmIldizi — Milliy sertifikat va BBA'ga onlayn tayyorgarlik",
    description:
      "Mock testlar, AI mentor va real vaqtdagi tahlil. Kuchsiz mavzuni ildizidan yo'q qiling.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IlmIldizi',
    description: "Milliy sertifikat va BBA'ga onlayn tayyorgarlik platformasi.",
  },
};

const STEPS = [
  {
    n: '01',
    icon: Compass,
    title: "Diagnostik test topshiring",
    text: "Telegram yoki Google hisobingiz bilan bir bosishda kiring va 10 ta savolli ekspress diagnostikadan o'ting.",
  },
  {
    n: '02',
    icon: Bot,
    title: 'Zaif nuqtangizni aniqlang',
    text: "AI tizimi qaysi mavzu, davr yoki darslik betida xato qilganingizni aniqlaydi va shaxsiy reja tuzadi.",
  },
  {
    n: '03',
    icon: Award,
    title: 'Imtihonda eng yuqori ball oling',
    text: "Kunlik 15 daqiqalik mashqlar va 1v1 bellashuvlar orqali natijangizni A+ / Davlat Grantiga chiqaring.",
  },
];

const RIBBONS: Record<number, string> = {
  180: 'TAVSIYA ETAMIZ',
  365: 'ENG PAST OYLIK NARX',
};

type ApiPlan = {
  plan_type: string; name: string; description: string;
  price: string; duration_days: number; features: string[];
};

async function loadPlans(): Promise<PlanCard[]> {
  try {
    const base = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8001';
    const res = await fetch(`${base}/api/premium/public-plans/`, { next: { revalidate: 300 } });
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
        cta: oneOff ? 'Mock testni ochish' : 'Obunani boshlash',
        href: '/premium',
        highlight: plan.duration_days === 180,
      };
    });

    return [FREE_PLAN, ...cards];
  } catch {
    return FALLBACK_PLANS;
  }
}

const FAQ = [
  {
    q: "IlmIldizi qanday imtihonlarga tayyorlaydi?",
    a: "Milliy sertifikat, BBA (Bakalavr Bosqichiga Ariza) va CEFR Multi-Level ingliz tili formatidagi testlarga. Savol turlari, taymer va ball hisobi rasmiy davlat imtihoni bilan bir xil tuzilgan.",
  },
  {
    q: "Platformadan bepul foydalansa bo'ladimi?",
    a: "Ha! Kundalik mashq testlari, 1v1 arena, mini o'yinlar, kunlik missiyalar, reyting, asosiy tahlil va AI Mentor mutlaqo bepul. To'lov faqat rasmiy to'liq jonli mock testlar va cheklovsiz AI Mentor tahlili uchun.",
  },
  {
    q: "Telegram orqali kirish xavfsizmi?",
    a: "Ha, 100% xavfsiz. Telegram orqali kirganingizda ma'lumotlar rasmiy Telegram bot kaliti bilan kriptografik tekshiriladi. Parol o'ylab topish yoki bank karta kiritish talab etilmaydi.",
  },
  {
    q: "DTM ball bashorati qanday ishlaydi?",
    a: "Hisob yechilgan savollar soni, ularning qiyinlik darajasi, fanlar kesimidagi xatolar va so'nggi natijalarga asoslanadi. Test yechganingiz sayin bashorat aniqligi 96% gacha yetadi.",
  },
  {
    q: "O'qituvchilar uchun qanday qulayliklar bor?",
    a: "O'qituvchi o'z havolasi orqali butun sinfini bir joyga jamlaydi. Barcha o'quvchilarning kuchli va zaif mavzulari, yechgan testlari va natijalari bitta umumiy monitoring jadvalida ko'rinadi.",
  },
];

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
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient Grid & Glow Atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
      <RootsBackground />
      <LandingNav />
      <MobileStickyCta />
      <LandingAiChatWidget />

      <main className="relative z-10 flex-1">
        
        {/* =========================================================
            HERO SECTION (High-contrast value proposition + Interactive Quiz)
            ========================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:pt-40">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            
            {/* Left: Value Proposition */}
            <RevealOnScroll className="lg:col-span-6 text-center lg:text-left space-y-6">
              
              {/* Trust Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-4 py-1.5 text-xs font-bold text-emerald-800 backdrop-blur-xs">
                <span className="flex size-2 rounded-full bg-emerald-600 animate-ping" />
                <span>Milliy sertifikat va Davlat Granti kafolati</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-slate-900">
                Kuchsiz mavzuni top,{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                  ildizidan
                </span>{' '}
                yo&apos;q qil.
              </h1>

              {/* Subhead */}
              <p className="max-w-xl text-base text-slate-600 sm:text-lg leading-relaxed mx-auto lg:mx-0 font-normal">
                Rasmiy BMB va Milliy sertifikat formatidagi mock testlar, 24/7 AI mentor va har bir savoldan keyingi darslik tahlili.
                <strong className="text-slate-800 font-semibold block mt-1">
                  Taxminiy tayyorgarlik emas — 100% Davlat Grantiga kirish tizimi.
                </strong>
              </p>

              {/* CTAs */}
              <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center lg:justify-start pt-2">
                <Link
                  href="/register"
                  className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-13 px-8 text-sm sm:text-base shadow-[0_8px_25px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Hoziroq bepul boshlash</span>
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href={BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 font-bold h-13 px-6 text-sm sm:text-base shadow-xs transition-all hover:border-slate-300"
                >
                  <Send className="size-4.5 text-sky-500" />
                  <span>Telegram bot orqali</span>
                </a>
              </div>

              {/* Social Proof & Trust Badges */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-2">
                    {['#10b981', '#059669', '#0d9488', '#0284c7'].map((col, i) => (
                      <div
                        key={i}
                        className="size-6.5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: col }}
                      >
                        ✓
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 ml-1 text-slate-700 font-bold">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9 / 5</span>
                    <span className="text-slate-400 font-normal">(12,400+ o&apos;quvchi)</span>
                  </div>
                </div>

                <span className="hidden sm:inline-block text-slate-300">•</span>

                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Karta kiritish talab etilmaydi</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-100">
                {[
                  { icon: FileCheck2, label: 'Rasmiy format' },
                  { icon: Clock, label: 'Imtihon taymeri' },
                  { icon: Bot, label: 'AI mentor' },
                  { icon: BarChart3, label: 'Zaiflik tahlili' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-2xs"
                  >
                    <item.icon className="size-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>

            </RevealOnScroll>

            {/* Right: Interactive Quiz Simulator */}
            <RevealOnScroll index={1} className="lg:col-span-6">
              <HeroInteractiveQuiz />
            </RevealOnScroll>

          </div>
        </section>

        {/* =========================================================
            INFINITE STUDENT RESULTS TICKER (Social Proof Ticker)
            ========================================================= */}
        <ResultsTicker />

        {/* =========================================================
            FANLAR VITRINASI
            ========================================================= */}
        <RevealOnScroll>
          <SubjectsShowcase />
        </RevealOnScroll>

        {/* =========================================================
            BENTO GRID (EKOTIZIM: 4 Dynamic Product Widgets)
            ========================================================= */}
        <RevealOnScroll>
          <BentoGrid />
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
            QANDAY ISHLAYDI (3 QADAM)
            ========================================================= */}
        <section id="qanday" className="scroll-mt-28 border-y border-slate-200/80 bg-slate-50/70 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <RevealOnScroll className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Oddiy va Samarali
              </div>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Muvaffaqiyatga 3 oddiy qadam
              </h2>
              <p className="mt-4 text-sm text-slate-600 sm:text-base leading-relaxed">
                Ro&apos;yxatdan o&apos;tishdan birinchi shaxsiy diagnostik tahlilgacha bor-yo&apos;g&apos;i 5 daqiqa.
              </p>
            </RevealOnScroll>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <RevealOnScroll key={s.n} index={i} className="relative">
                  <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-3xl font-black text-slate-200 group-hover:text-emerald-600 transition-colors">
                          {s.n}
                        </span>
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <s.icon className="size-5" />
                        </div>
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl">{s.title}</h3>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-600 sm:text-sm">{s.text}</p>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <span>Batafsil</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            NARXLAR BO'LIMI
            ========================================================= */}
        <PricingSection plans={plans} />

        {/* =========================================================
            SAVOLLAR (FAQ)
            ========================================================= */}
        <RevealOnScroll>
          <FaqAccordion items={FAQ} />
        </RevealOnScroll>

        {/* =========================================================
            YAKUNIY CHAQIRIQ (FINAL CTA)
            ========================================================= */}
        <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <RevealOnScroll>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-8 text-center shadow-xl sm:p-14">
              <div className="absolute -right-20 -top-20 size-80 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-xs">
                  <Sprout className="size-7 text-emerald-600" />
                </span>

                <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                  Bugun bitta test — imtihonda esa{' '}
                  <span className="text-emerald-600">
                    Grant va Kontrakt
                  </span>{' '}
                  farqi!
                </h2>

                <p className="mt-4 text-sm text-slate-600 sm:text-base leading-relaxed">
                  O&apos;z bilimingizni hoziroq sinab ko&apos;ring. Hech qanday to&apos;lovsiz, Telegram orqali 10 soniyada kiring va diagnostik testni yeching.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-13 px-8 text-sm sm:text-base shadow-[0_4px_20px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Bepul boshlash <ArrowRight className="size-4" />
                  </Link>
                  <a
                    href={BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold h-13 px-7 text-sm sm:text-base shadow-xs transition-all"
                  >
                    <Send className="size-4 text-sky-600" /> Telegram bot
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* =========================================================
          FOOTER
          ========================================================= */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Sprout className="size-4.5" />
              </span>
              <span className="text-base font-black text-slate-900">
                Ilm<span className="text-emerald-600">Ildizi</span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium">
              <a href="#imkoniyatlar" className="transition-colors hover:text-slate-900">Imkoniyatlar</a>
              <a href="#qanday" className="transition-colors hover:text-slate-900">Qanday ishlaydi</a>
              <a href="#narxlar" className="transition-colors hover:text-slate-900">Narxlar</a>
              <a href="#savollar" className="transition-colors hover:text-slate-900">Savollar</a>
              <Link href="/login" className="transition-colors hover:text-slate-900">Kirish</Link>
              <Link href="/register" className="transition-colors hover:text-slate-900">Ro&apos;yxatdan o&apos;tish</Link>
            </nav>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Barcha tizimlar barqaror</span>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} IlmIldizi. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
