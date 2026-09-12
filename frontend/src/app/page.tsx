import type { Metadata } from 'next';
import Link from 'next/link';
import { Sprout } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import SubjectsTicker from '@/components/landing/SubjectsTicker';
import ExamCategories from '@/components/landing/ExamCategories';
import TestmakonBentoGrid from '@/components/landing/TestmakonBentoGrid';
import ScoreCalculator from '@/components/landing/ScoreCalculator';
import ThreeStepsSection from '@/components/landing/ThreeStepsSection';
import PricingSection, { PlanCard, FALLBACK_PLANS, FREE_PLAN } from '@/components/landing/PricingSection';
import FaqAccordion from '@/components/landing/FaqAccordion';
import FinalCtaSection from '@/components/landing/FinalCtaSection';
import MobileStickyCta from '@/components/landing/MobileStickyCta';
import LiveActivityToast from '@/components/landing/LiveActivityToast';
import LandingAiChatWidget from '@/components/landing/LandingAiChatWidget';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va DTM'ga onlayn tayyorgarlik",
  description:
    "O'zbekiston abituriyentlari uchun AI quvvatli zamonaviy ta'lim platformasi. "
    + "Rasmiy formatdagi mock testlar, AI mentor, zaif mavzular tahlili va DTM ball bashorati.",
  keywords: [
    'milliy sertifikat', 'DTM', 'BBA', 'mock test', 'onlayn test', 'tarix testlari',
    'ona tili test', 'abituriyent', 'test yechish', 'IlmIldizi', 'AI mentor', 'Rasch modeli',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: SITE_URL,
    siteName: 'IlmIldizi',
    title: "IlmIldizi — Milliy sertifikat va DTM'ga onlayn tayyorgarlik",
    description:
      "15 000+ savol, AI mentor va real vaqtdagi tahlil. Kuchsiz mavzuni ildizidan yo'q qiling.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IlmIldizi',
    description: "Milliy sertifikat va DTM'ga onlayn tayyorgarlik platformasi.",
  },
};

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
    a: "Milliy sertifikat (A+ dan C gacha) va DTM (Bakalavr bosqichiga ariza) formatidagi testlarga. Savol turlari, vaqt taymeri va UzBMB Rasch modeli bo'yicha ball hisobi rasmiy davlat imtihonlari bilan 100% bir xil.",
  },
  {
    q: "Platformadan bepul foydalansa bo'ladimi?",
    a: "Ha! Kundalik mashq testlari, 1v1 arena bellashuvlari, mini o'yinlar, kunlik missiyalar, reyting, asosiy tahlil va AI Mentor (kuniga 5 savol) mutlaqo bepul. To'lov faqat rasmiy to'liq mock imtihonlar va cheklovsiz AI repetitor uchun.",
  },
  {
    q: "Telegram orqali kirish qanday ishlaydi?",
    a: "Telegram orqali kirganingizda rasmiy Telegram bot kaliti bilan bir zumda tizimga ulanasiz. Parol o'ylab topish, kod kutish yoki bank kartasi kiritish talab etilmaydi.",
  },
  {
    q: "DTM va Sertifikat ball bashorati qanday hisoblanadi?",
    a: "Hisob yechilgan savollar soni, ularning Rasch modeli bo'yicha qiyinlik darajasi, fanlar kesimidagi xatolar va so'nggi natijalarga asoslanadi. Test yechganingiz sayin bashorat aniqligi 96% gacha oshadi.",
  },
  {
    q: "O'qituvchilar va repetitorlar uchun qanday imkoniyatlar bor?",
    a: "O'qituvchi o'z taklif havolasi orqali butun sinfini bitta umumiy monitoring paneliga jamlay oladi. Barcha o'quvchilarning zaif mavzulari, yechgan testlari va ko'rsatkichlari bitta ekranda tahlil qilinadi.",
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
      description: "O'zbekiston abituriyentlari uchun AI quvvatli onlayn test platformasi. Milliy sertifikat va DTM tayyorgarligi.",
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
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Floating Pill Navbar */}
      <LandingNav />
      <LiveActivityToast />
      <MobileStickyCta />
      <LandingAiChatWidget />

      <main className="flex-1">
        {/* 1. HERO SECTION (Aurora, Lit Grid, Rotating Headline, Interactive 3D Mock Preview) */}
        <HeroSection />

        {/* 2. FANLAR LENTASI (Infinite Marquee Ticker) */}
        <SubjectsTicker />

        {/* 3. IMTIHONLAR: "Chipta" kartalari */}
        <ExamCategories />

        {/* 4. ASIMMETRIK BENTO GRID (Har bir xatoyingiz keyingi mashqqa aylanadi) */}
        <TestmakonBentoGrid />

        {/* 5. BALL KALKULYATORI & OTM BASHORATI */}
        <ScoreCalculator />

        {/* 6. UCH QADAMDA BOSHLAYSIZ */}
        <ThreeStepsSection />

        {/* 7. TARIFLAR (NARXLAR) */}
        <PricingSection plans={plans} />

        {/* 8. KO'P SO'RALADIGAN SAVOLLAR (FAQ) */}
        <FaqAccordion items={FAQ} />

        {/* 9. YAKUNIY CHAQIRIQ (High-contrast dark card) */}
        <FinalCtaSection />
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Sprout className="size-5 text-emerald-600" />
                </span>
                <span className="font-voice text-lg font-black tracking-tight text-slate-900">
                  Ilm<span className="text-emerald-600">Ildizi</span>
                </span>
              </Link>

              <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
                O&apos;zbekiston abituriyentlari uchun AI quvvatli zamonaviy ta&apos;lim platformasi. Rasmiy formatdagi mock testlar va individual zaiflik tahlili.
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Barcha tizimlar barqaror ishlamoqda</span>
              </div>
            </div>

            {/* Links 1 */}
            <div>
              <h4 className="font-voice text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5">
                Platforma
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><Link href="/mock" className="hover:text-emerald-700 transition-colors">Mock Testlar</Link></li>
                <li><Link href="/battles" className="hover:text-emerald-700 transition-colors">1v1 Arena</Link></li>
                <li><Link href="/leaderboard" className="hover:text-emerald-700 transition-colors">Respublika Reytingi</Link></li>
                <li><Link href="/premium" className="hover:text-emerald-700 transition-colors">Tariflar & Obuna</Link></li>
              </ul>
            </div>

            {/* Links 2 */}
            <div>
              <h4 className="font-voice text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5">
                Imtihonlar
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><Link href="/mock" className="hover:text-emerald-700 transition-colors">DTM Simulyatsiya</Link></li>
                <li><Link href="/mock" className="hover:text-emerald-700 transition-colors">Milliy Sertifikat</Link></li>
                <li><Link href="/mock" className="hover:text-emerald-700 transition-colors">Tarix Fani Testlari</Link></li>
                <li><Link href="/mock" className="hover:text-emerald-700 transition-colors">Ona Tili va Adabiyot</Link></li>
              </ul>
            </div>

            {/* Links 3 */}
            <div>
              <h4 className="font-voice text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5">
                Yordam & Aloqa
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><a href="#savollar" className="hover:text-emerald-700 transition-colors">Ko&apos;p so&apos;raladigan savollar</a></li>
                <li><a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 transition-colors">Telegram Bot</a></li>
                <li><Link href="/login" className="hover:text-emerald-700 transition-colors">Tizimga kirish</Link></li>
                <li><Link href="/register" className="hover:text-emerald-700 transition-colors">Ro&apos;yxatdan o&apos;tish</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} IlmIldizi. Barcha huquqlar himoyalangan.</p>
            <p className="flex items-center gap-1">
              O&apos;zbekistonda mehr bilan yaratilgan 🇺🇿
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
