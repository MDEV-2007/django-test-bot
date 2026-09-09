import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileCheck2, Bot, Swords, BarChart3, ArrowRight,
  Sprout, Send, Sparkles, Clock, CheckCircle2,
  Compass, Award
} from 'lucide-react';
import { AuthRedirect } from '@/components/landing/AuthRedirect';
import LandingNav from '@/components/landing/LandingNav';
import RootsBackground from '@/components/landing/RootsBackground';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import HeroInteractiveTest from '@/components/landing/HeroInteractiveTest';
import BentoGrid from '@/components/landing/BentoGrid';
import SocialProofAndStats from '@/components/landing/SocialProofAndStats';
import PricingSection, { PlanCard } from '@/components/landing/PricingSection';
import FaqAccordion from '@/components/landing/FaqAccordion';
import { Button } from '@/components/ui/button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va BBA'ga onlayn tayyorgarlik",
  description:
    "Rasmiy formatdagi mock testlar, AI mentor, zaif mavzular tahlili va DTM ball bashorati. "
    + "Telegram orqali bir bosishda kiring va bugundanoq tayyorlanishni boshlang.",
  keywords: [
    'milliy sertifikat', 'BBA', 'DTM', 'mock test', 'onlayn test', 'tarix testlari',
    'abituriyent', 'test yechish', 'IlmIldizi', 'AI mentor',
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
      'Mock testlar, AI mentor va real vaqtdagi tahlil. Kuchsiz mavzuni ildizidan yo\'q qiling.',
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
    text: "Telegram yoki Google hisobingiz bilan parolsiz kiring va 10 ta savolli tezkor diagnostikadan o'ting.",
  },
  {
    n: '02',
    icon: Bot,
    title: 'Zaif nuqtangizni aniqlang',
    text: "AI tizimi qaysi mavzu, davr yoki qoidada xato qilganingizni aniqlaydi va sizga shaxsiy reja tuzadi.",
  },
  {
    n: '03',
    icon: Award,
    title: 'Imtihonda eng yuqori ball oling',
    text: "Muntazam 15 daqiqalik mashqlar, rasmiy mock testlar va 1v1 bellashuvlar orqali natijangizni 180+ ballga chiqaring.",
  },
];

const RIBBONS: Record<number, string> = {
  180: 'TAVSIYA ETAMIZ',
  365: 'ENG PAST OYLIK NARX',
};

const FREE_PLAN: PlanCard = {
  name: 'Bepul',
  price: '0',
  unit: "so'm",
  text: "Kundalik mashq testlari, arena, mini o'yinlar, reyting va asosiy tahlil.",
  features: ['Mashq testlari', '1v1 Arena', 'Kunlik missiyalar', 'Reyting va yutuqlar', 'AI Mentor (kuniga 5 ta savol)'],
  cta: 'Bepul boshlash',
  href: '/register',
  highlight: false,
};

const FALLBACK_PLANS: PlanCard[] = [
  FREE_PLAN,
  {
    name: 'PRO — Oylik',
    price: '25 000', unit: "so'm / 30 kun", perDay: "≈ 833 so'm/kun",
    text: "Barcha mock testlar va kengaytirilgan AI Mentor. Istalgan vaqtda to'xtatasiz.",
    features: ['Barcha mock testlar — cheklovsiz kirish', 'AI Mentor: kuniga 50 savol', '30 kun amal qiladi'],
    cta: 'Obunani boshlash', href: '/premium', highlight: false,
  },
  {
    name: 'PRO — 6 oylik',
    price: '90 000', unit: "so'm / 180 kun", perDay: "≈ 500 so'm/kun",
    ribbon: RIBBONS[180],
    text: "Milliy sertifikat imtihoniga to'liq tayyorgarlik davri uchun.",
    features: ['Barcha mock testlar — cheklovsiz kirish', 'AI Mentor: kuniga 50 savol',
               "15 000 so'm/oy — oylikka nisbatan 40% arzon"],
    cta: 'Obunani boshlash', href: '/premium', highlight: true,
  },
  {
    name: 'PRO — 12 oylik',
    price: '150 000', unit: "so'm / 365 kun", perDay: "≈ 411 so'm/kun",
    ribbon: RIBBONS[365],
    text: "Eng past oylik narx. Butun o'quv yili davomida amal qiladi.",
    features: ['Barcha mock testlar — cheklovsiz kirish', 'AI Mentor: kuniga 50 savol',
               "12 500 so'm/oy — eng past oylik narx"],
    cta: 'Obunani boshlash', href: '/premium', highlight: false,
  },
  {
    name: 'Mock test — bir martalik',
    price: '15 000', unit: "so'm (bir martalik)",
    text: "Bitta to'lov, muddatsiz kirish. AI Mentor chegarasi obunasiz darajada qoladi.",
    features: ['Barcha rasmiy mock testlar', 'Muddatsiz kirish', 'AI natija tahlili'],
    cta: 'Mock testni ochish', href: '/premium', highlight: false,
  },
];

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
    a: "Milliy sertifikat va BBA (Bakalavr Bosqichiga Ariza) formatidagi testlarga. Savol turlari, taymer va ball hisobi rasmiy davlat imtihoni bilan bir xil tuzilgan.",
  },
  {
    q: "Platformadan bepul foydalansa bo'ladimi?",
    a: "Ha! Kundalik mashq testlari, 1v1 arena, mini o'yinlar, kunlik missiyalar, reyting, asosiy tahlil va AI Mentor (kuniga 5 savol) mutlaqo bepul. To'lov faqat rasmiy to'liq mock testlar va cheklovsiz AI Mentor uchun.",
  },
  {
    q: "Telegram orqali kirish xavfsizmi?",
    a: "Ha, 100% xavfsiz. Telegram orqali kirganingizda ma'lumotlar rasmiy Telegram bot kaliti bilan kriptografik tekshiriladi. Parol o'ylab topish yoki karta kiritish talab etilmaydi.",
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <AuthRedirect />
      <RootsBackground />
      <LandingNav />

      <main className="flex-1">
        {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Chap tomon: Sarlavha, afzalliklar va CTA */}
            <RevealOnScroll className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
                <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
                <Sparkles className="size-3.5" />
                Milliy sertifikat va BBA&apos;ga tayyorgarlik 2026
              </div>

              <h1 className="font-voice mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-foreground">
                Kuchsiz mavzuni top,{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                  ildizidan
                </span>{' '}
                yo&apos;q qil
              </h1>

              <p className="mt-5 max-w-xl text-base text-[var(--text-secondary)] sm:text-lg leading-relaxed mx-auto lg:mx-0">
                Rasmiy formatdagi mock testlar, 24/7 AI mentor va har bir javobdan o&apos;sadigan tahlil. Kuniga 15 daqiqa — natija taxminda emas, ballda ko&apos;rinadi.
              </p>

              {/* Asosiy harakat tugmalari */}
              <div className="mt-8 flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center lg:justify-start">
                <Button asChild size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/25 h-12 px-6 text-base">
                  <Link href="/register">
                    Bepul boshlash <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-[var(--border-card)] hover:bg-[var(--surface-card-medium)] h-12 px-6 text-base">
                  <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                    <Send className="size-4 mr-1.5 text-sky-400" /> Telegram botda ochish
                  </a>
                </Button>
              </div>

              {/* Ishonch nishonlari */}
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[var(--text-faint)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> Karta kiritish shart emas
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> Telegram yoki Google bilan 1 bosishda
                </span>
              </div>

              {/* Tezkor xususiyatlar ikonkalari */}
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: FileCheck2, label: 'Rasmiy format' },
                  { icon: Clock, label: 'Imtihon taymeri' },
                  { icon: Bot, label: 'AI mentor' },
                  { icon: BarChart3, label: 'Mavzular tahlili' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/50 p-2.5 backdrop-blur-sm"
                  >
                    <item.icon className="size-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </RevealOnScroll>

            {/* O'ng tomon: Jonli interaktiv test simulyatori */}
            <RevealOnScroll index={1} className="lg:col-span-5">
              <HeroInteractiveTest />
            </RevealOnScroll>
          </div>
        </section>

        {/* ── ISHONCH VA JONLI METRIKALAR ───────────────────────────────────── */}
        <RevealOnScroll>
          <SocialProofAndStats />
        </RevealOnScroll>

        {/* ── BENTO GRID (IMKONIYATLAR) ────────────────────────────────────── */}
        <RevealOnScroll>
          <BentoGrid />
        </RevealOnScroll>

        {/* ── QANDAY ISHLAYDI (3 QADAM) ────────────────────────────────────── */}
        <section id="qanday" className="scroll-mt-24 border-y border-[var(--border-card)] bg-[var(--surface-card-soft)]/40 py-20 backdrop-blur-sm sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <RevealOnScroll className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-text)]">
                Tez va oson
              </span>
              <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Muvaffaqiyatga 3 oddiy qadam
              </h2>
              <p className="mt-4 text-sm text-[var(--text-secondary)] sm:text-base">
                Ro&apos;yxatdan o&apos;tishdan birinchi shaxsiy tahlilgacha bor-yo&apos;g&apos;i 5 daqiqa.
              </p>
            </RevealOnScroll>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <RevealOnScroll key={s.n} index={i} className="relative">
                  <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/60 p-7 transition-all duration-300 hover:border-[var(--accent-border)] hover:bg-[var(--surface-card-medium)]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-3xl font-black text-emerald-400/30 group-hover:text-emerald-400 transition-colors">
                          {s.n}
                        </span>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <s.icon className="size-5" />
                        </div>
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-foreground sm:text-xl">{s.title}</h3>
                      <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">{s.text}</p>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <span>Batafsil</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ── NARXLAR BO'LIMI ──────────────────────────────────────────────── */}
        <RevealOnScroll>
          <PricingSection plans={plans} />
        </RevealOnScroll>

        {/* ── SAVOLLAR (FAQ) ───────────────────────────────────────────────── */}
        <RevealOnScroll>
          <FaqAccordion items={FAQ} />
        </RevealOnScroll>

        {/* ── YAKUNIY CHAQIRIQ (FINAL CTA) ─────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <RevealOnScroll>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 via-[var(--surface-card-soft)] to-teal-950/40 p-8 text-center shadow-2xl sm:p-14">
              {/* Ichki porlash effekti */}
              <div className="absolute -right-20 -top-20 size-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg">
                  <Sprout className="size-7 text-emerald-400" />
                </span>

                <h2 className="font-voice mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Bugun bitta test — imtihonda esa{' '}
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    Grant va Kontrakt
                  </span>{' '}
                  farqi!
                </h2>

                <p className="mt-4 text-sm text-[var(--text-secondary)] sm:text-base leading-relaxed">
                  O&apos;z kuchingizni sinab ko&apos;ring. Hech qanday to&apos;lovsiz, Telegram orqali 10 soniyada kiring va ilk diagnostik testni yeching.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-black font-bold h-12 px-7 text-base shadow-xl shadow-emerald-500/25">
                    <Link href="/register">
                      Bepul boshlash <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-[var(--border-card)] hover:bg-[var(--surface-card-medium)] h-12 px-7 text-base">
                    <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                      <Send className="size-4 mr-1.5 text-sky-400" /> Telegram bot
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-card)] bg-[var(--surface-card-soft)]/60 py-12 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Sprout className="size-5" />
              </span>
              <span className="font-voice text-lg font-bold text-foreground">
                Ilm<span className="text-emerald-400">Ildizi</span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
              <a href="#imkoniyatlar" className="transition-colors hover:text-foreground">Imkoniyatlar</a>
              <a href="#qanday" className="transition-colors hover:text-foreground">Qanday ishlaydi</a>
              <a href="#narxlar" className="transition-colors hover:text-foreground">Narxlar</a>
              <a href="#savollar" className="transition-colors hover:text-foreground">Savollar</a>
              <Link href="/login" className="transition-colors hover:text-foreground">Kirish</Link>
              <Link href="/register" className="transition-colors hover:text-foreground">Ro&apos;yxatdan o&apos;tish</Link>
            </nav>

            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>Barcha tizimlar faol</span>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--border-card)]/50 pt-6 text-center text-xs text-[var(--text-faint)]">
            © {new Date().getFullYear()} IlmIldizi. Milliy sertifikat va BBA tayyorgarlik platformasi. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </>
  );
}
