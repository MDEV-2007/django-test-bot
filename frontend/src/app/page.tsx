import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileCheck2, Bot, Swords, BarChart3, ArrowRight,
  Sprout, Send, Sparkles, CheckCircle2,
  Star, Film
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
import ProductWorkflow from '@/components/landing/ProductWorkflow';
import WeeklyLeaderboardSection from '@/components/landing/WeeklyLeaderboardSection';
import TelegramBannerCta from '@/components/landing/TelegramBannerCta';
import { AuthRedirect } from '@/components/landing/AuthRedirect';
import { BrandMark } from '@/components/BrandMark';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va DTM imtihonlariga AI tayyorgarlik platformasi",
  description:
    "BMB va Milliy sertifikat rasmiy formatidagi mock testlar, 24/7 AI mentor va har bir savol bo'yicha darslik tahlili. "
    + "Kuchsiz mavzuni toping, ildizidan yo'q qiling.",
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
    <div className="relative min-h-screen bg-[#F2F2F7] text-[#1C1C1E] selection:bg-[#007AFF]/15 selection:text-[#007AFF] font-sans antialiased">
      <AuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <RootsBackground />
      <LandingNav />
      <MobileStickyCta />
      <LandingAiChatWidget />

      <main className="relative z-10 flex-1">
        
        {/* =========================================================
            HERO SECTION (Apple iOS 18 Keynote Style + Interactive Widget)
            ========================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:pt-14">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            
            {/* Left: Apple Editorial Value Proposition */}
            <div className="lg:col-span-6 text-center lg:text-left space-y-6">
              
              {/* iOS Dynamic Island Style Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-white/85 ios-glass px-4 py-1.5 text-xs font-semibold text-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34C759] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#34C759]" />
                </span>
                <span>BMB va Milliy sertifikat rasmiy formati · 2026</span>
              </div>

              {/* Apple Keynote Headline */}
              <h1 className="text-4xl font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-5xl md:text-[58px] text-[#1C1C1E]">
                Milliy sertifikat va DTMga{' '}
                <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#34C759] bg-clip-text text-transparent">
                  AI bilan
                </span>{' '}
                tayyorlaning.
              </h1>

              {/* Subhead */}
              <p className="max-w-xl text-base text-[#3A3A3C] sm:text-[18px] leading-[1.55] mx-auto lg:mx-0 font-normal">
                Rasmiy formatdagi mock testlar, 24/7 AI mentor va har bir savoldan keyingi darslik sahifasi tahlili.
                <strong className="text-[#1C1C1E] font-semibold block mt-1">
                  Kuchsiz mavzuni toping, ildizidan yo&apos;q qiling.
                </strong>
              </p>

              {/* iOS Pill CTAs */}
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start pt-1">
                <Link
                  href="/register"
                  className="ios-spring group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold h-13 px-8 text-sm sm:text-[15px] shadow-[0_8px_24px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]"
                >
                  <span>Hoziroq bepul boshlash</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <a
                  href={BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ios-spring inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-black/[0.08] bg-white/85 hover:bg-white text-[#1C1C1E] font-semibold h-13 px-6 text-sm sm:text-[15px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] ios-glass"
                >
                  <Send className="size-4 text-[#007AFF]" />
                  <span>Telegram bot orqali</span>
                </a>
              </div>

              {/* Social Proof & App Store Rating Bar */}
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xs text-[#6C6C70]">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {['#007AFF', '#34C759', '#5856D6', '#FF9500'].map((col, i) => (
                      <div
                        key={i}
                        className="size-6.5 rounded-full border-2 border-[#F2F2F7] flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: col }}
                      >
                        ✓
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 ml-1 text-[#1C1C1E] font-bold">
                    <Star className="size-3.5 fill-[#FF9500] text-[#FF9500]" />
                    <span>4.9 / 5</span>
                    <span className="text-[#8E8E93] font-normal">(App Store darajasidagi tajriba)</span>
                  </div>
                </div>

                <span className="hidden sm:inline-block text-[#C7C7CC]">•</span>

                <div className="flex items-center gap-1.5 text-[#3A3A3C] font-medium">
                  <CheckCircle2 className="size-4 text-[#34C759] shrink-0" />
                  <span>Karta kiritish talab etilmaydi</span>
                </div>
              </div>

              {/* iOS Control Center Style Quick Modules */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 pt-4 border-t border-black/[0.06]">
                {[
                  { icon: FileCheck2, label: 'Mock Testlar', href: '/tests', color: 'from-[#34C759] to-[#28A745]' },
                  { icon: Bot, label: '24/7 AI Mentor', href: '#imkoniyatlar', color: 'from-[#5856D6] to-[#4644B5]' },
                  { icon: BarChart3, label: 'Zaiflik Tahlili', href: '#imkoniyatlar', color: 'from-[#007AFF] to-[#0062CC]' },
                  { icon: Film, label: 'Bilim Reels', href: '/reels', color: 'from-[#FF2D55] to-[#D70015]' },
                  { icon: Sparkles, label: 'Hamjamiyat', href: '/feed', color: 'from-[#AF52DE] to-[#8E3CBE]' },
                  { icon: Swords, label: '1v1 Arena', href: '/battles', color: 'from-[#FF9500] to-[#E08600]' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="ios-spring flex items-center gap-2.5 rounded-[18px] border border-black/[0.06] bg-white/85 ios-glass p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] group"
                  >
                    <span className={`flex size-7.5 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b ${item.color} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform`}>
                      <item.icon className="size-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-[#1C1C1E] truncate">{item.label}</span>
                  </Link>
                ))}
              </div>

            </div>

            {/* Right: iOS 18 Interactive Quiz Window */}
            <div className="lg:col-span-6">
              <HeroInteractiveQuiz />
            </div>

          </div>
        </section>

        {/* =========================================================
            INFINITE STUDENT RESULTS TICKER (Social Proof Ticker)
            ========================================================= */}
        <ResultsTicker />

        {/* =========================================================
            FANLAR VITRINASI (App Store Today Cards)
            ========================================================= */}
        <RevealOnScroll>
          <SubjectsShowcase />
        </RevealOnScroll>

        {/* =========================================================
            BENTO GRID (Apple Keynote Feature Bento)
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
            NARXLAR BO'LIMI (Apple One Style Subscriptions)
            ========================================================= */}
        <PricingSection plans={plans} />

        {/* =========================================================
            SAVOLLAR (iOS Inset Grouped FAQ)
            ========================================================= */}
        <RevealOnScroll>
          <FaqAccordion items={FAQ} />
        </RevealOnScroll>

        {/* =========================================================
            YAKUNIY CHAQIRIQ (Apple Pro Dark Titanium Showcase Card)
            ========================================================= */}
        <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <RevealOnScroll>
            <div className="relative overflow-hidden rounded-[36px] border border-white/12 bg-[#1C1C1E] p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-14 text-white">
              {/* Apple Intelligence Ambient Glows */}
              <div className="absolute -right-20 -top-20 size-80 rounded-full bg-[#007AFF]/25 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-[#34C759]/20 blur-3xl pointer-events-none" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="inline-flex size-14 items-center justify-center rounded-[18px] bg-gradient-to-b from-[#34C759] to-[#28A745] text-white shadow-[0_8px_20px_rgba(52,199,89,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <Sprout className="size-7 text-white" />
                </span>

                <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl md:text-5xl leading-tight">
                  Bugun bitta test — imtihonda esa{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#64D2FF] via-[#30D158] to-[#5E5CE6]">
                    Grant va Kontrakt
                  </span>{' '}
                  farqi!
                </h2>

                <p className="mt-4 text-sm text-[#AEAEB2] sm:text-base leading-relaxed">
                  O&apos;z bilimingizni hoziroq sinab ko&apos;ring. Hech qanday to&apos;lovsiz, Telegram orqali 10 soniyada kiring va diagnostik testni yeching.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="ios-spring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#007AFF] hover:bg-[#0A84FF] text-white font-semibold h-12 px-8 text-sm sm:text-base shadow-[0_6px_20px_rgba(10,132,255,0.4)]"
                  >
                    Bepul boshlash <ArrowRight className="size-4" />
                  </Link>
                  <a
                    href={BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ios-spring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 text-white font-semibold h-12 px-7 text-sm sm:text-base backdrop-blur-xl"
                  >
                    <Send className="size-4 text-[#64D2FF]" /> Telegram bot
                  </a>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[#8E8E93]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-[#30D158]" />
                    Karta talab etilmaydi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-[#30D158]" />
                    10 soniyada tayyor
                  </span>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* =========================================================
          FOOTER (Apple Cupertino Minimalist Footer)
          ========================================================= */}
      <footer className="border-t border-black/[0.06] bg-white/80 ios-glass py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] overflow-hidden border border-black/[0.08] bg-white shadow-2xs">
                <BrandMark size={28} rounded="rounded-[8px]" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-[#1C1C1E]">
                Ilm<span className="text-[#007AFF]">Ildizi</span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6C6C70] font-medium">
              <a href="#imkoniyatlar" className="transition-colors hover:text-[#1C1C1E]">Imkoniyatlar</a>
              <a href="#qanday" className="transition-colors hover:text-[#1C1C1E]">Qanday ishlaydi</a>
              <a href="#narxlar" className="transition-colors hover:text-[#1C1C1E]">Narxlar</a>
              <a href="#savollar" className="transition-colors hover:text-[#1C1C1E]">Savollar</a>
              <Link href="/login" className="transition-colors hover:text-[#1C1C1E]">Kirish</Link>
              <Link href="/register" className="transition-colors hover:text-[#1C1C1E]">Ro&apos;yxatdan o&apos;tish</Link>
            </nav>

            <div className="flex items-center gap-2 rounded-full bg-[#F2F2F7] px-3 py-1 text-xs text-[#3A3A3C] font-medium">
              <span className="size-2 rounded-full bg-[#34C759] animate-pulse" />
              <span>Barcha tizimlar barqaror</span>
            </div>
          </div>

          <div className="mt-8 border-t border-black/[0.06] pt-6 text-center text-xs text-[#8E8E93]">
            © {new Date().getFullYear()} IlmIldizi. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
