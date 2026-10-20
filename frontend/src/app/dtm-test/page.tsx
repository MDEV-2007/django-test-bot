import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileCheck2, CheckCircle2, ArrowRight, Sparkles, BookOpen, Clock,
  Award, ShieldCheck, HelpCircle, ChevronRight, Sprout, BarChart3,
  Flame, Target, Star, Play
} from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=seo_dtm';

export const metadata: Metadata = {
  title: 'DTM Test Yechish Onlayn 2026 — BMB Bepul Mock Imtihon | IlmIldizi',
  description:
    "DTM (BMB) testlarini onlayn bepul yeching. 2026-yilgi yangi standart bo'yicha Tarix, Ona tili, Matematika va barcha fanlardan namunaviy testlar, to'g'ri javoblari va AI tahlili.",
  keywords: [
    'DTM test', 'DTM test yechish', 'DTM testlari onlayn', 'BMB testlar',
    'DTM 2026', 'majburiy fanlar test yechish', 'bepul mock test', 'tarix dtm test',
    'ona tili dtm test', 'matematika dtm', 'abituriyent test yechish', 'onlayn test bmb',
  ],
  alternates: { canonical: '/dtm-test' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: `${SITE_URL}/dtm-test`,
    siteName: 'IlmIldizi',
    title: 'DTM Test Yechish Onlayn 2026 — BMB Bepul Mock Imtihon',
    description:
      "BMB rasmiy talablari asosidagi DTM testlari. Natijangizni darhol bilib oling, zaif mavzularni AI bilan aniqlang va OTM talabasi bo'ling.",
  },
};

const FAQ_ITEMS = [
  {
    q: "DTM (BMB) testlarini bepul yechsa bo'ladimi?",
    a: "Ha! IlmIldizi platformasida ro'yxatdan o'tib, asosiy va majburiy fanlardan bepul mock testlarni real vaqt rejimida yechishingiz mumkin.",
  },
  {
    q: "Test savollari 2026-yilgi rasmiy BMB standartiga mosmi?",
    a: "Ha, platformadagi barcha savollar Bilim va malakalarni baholash agentligi (sobiq DTM) tasdiqlagan darsliklar va imtihon spetsifikatsiyalari asosida tuzilgan.",
  },
  {
    q: "DTM imtihonida jami necha ball to'plash mumkin?",
    a: "Maksimal ball 189 ballni tashkil etadi: 3 ta majburiy fan (Ona tili, Matematika, O'zbekiston tarixi) 33 ball, hamda 2 ta asosiy mutaxassislik fani (har biri 30 tadan, jami 60 ta savol) 156 ball beradi.",
  },
  {
    q: "Test natijasida qaysi savollarda xato qilganim ko'rinadimi?",
    a: "Albatta. Test yakunida IlmIldizi AI tizimi har bir xato savolingizning to'g'ri yechimini, tushuntirishini va qaysi darslik mavzusidan ekanini ko'rsatib beradi.",
  },
];

const DTM_SUBJECTS = [
  { name: "O'zbekiston Tarixi", badge: "Majburiy & Asosiy", count: "1,200+ savol", href: "/register?subject=tarix", icon: "🏛" },
  { name: "Ona tili va Adabiyot", badge: "Majburiy & Asosiy", count: "950+ savol", href: "/register?subject=ona-tili", icon: "📖" },
  { name: "Matematika", badge: "Majburiy & Asosiy", count: "1,100+ savol", href: "/register?subject=matematika", icon: "📐" },
  { name: "Biologiya", badge: "Asosiy mutaxassislik", count: "800+ savol", href: "/register?subject=biologiya", icon: "🧬" },
  { name: "Ingliz tili (Chet tili)", badge: "Asosiy mutaxassislik", count: "850+ savol", href: "/register?subject=ingliz-tili", icon: "🇬🇧" },
  { name: "Kimyo", badge: "Asosiy mutaxassislik", count: "650+ savol", href: "/register?subject=kimyo", icon: "🧪" },
];

export default function DtmTestLandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'DTM Test Yechish', item: `${SITE_URL}/dtm-test` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 font-sans antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />

      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800">
            <Flame className="size-3.5 text-emerald-600 animate-pulse" />
            <span>DTM / BMB 2026 Yangi Standarti Bo&apos;yicha Testlar</span>
          </div>

          <h1 className="text-3xl font-black sm:text-5xl md:text-6xl text-slate-900 leading-tight tracking-tight">
            DTM Test Yechish Onlayn —{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Bepul Mock Imtihonlar
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Barcha majburiy va asosiy mutaxassislik fanlaridan rasmiy formatdagi testlarni yeching. 
            Haqiqiy DTM ballingizni oldindan hisoblang va AI xatolar tahlili bilan 189 ball sari ildamlang.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg shadow-emerald-600/20 gap-2 w-full sm:w-auto">
              <Link href="/register">
                <Play className="size-5 fill-white" /> Testni Hoziroq Boshlash (Bepul)
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-13 px-7 rounded-2xl border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-800 w-full sm:w-auto">
              <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                Telegram Botda Yechish 🤖
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Bepul ro&apos;yxatdan o&apos;tish</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Rasmiy 2026 savollar bazasi</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Lahzalik AI hisobot</span>
          </div>
        </div>
      </section>

      {/* DTM FANLARI KATALOGI */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-50 text-[11px] font-black uppercase">
              Fanlar Kesimida Testlar
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Qaysi fandan DTM test topshirmoqchisiz?
            </h2>
            <p className="text-sm text-slate-500">O&apos;zingizga kerakli fanni tanlang va sinovni boshlang.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DTM_SUBJECTS.map((s, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-slate-200 bg-slate-50/50 p-5 hover:bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl p-2 rounded-xl bg-white border border-slate-100 shadow-xs">{s.icon}</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">{s.badge}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.count}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    Testni yechish <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <Link href="/register" className="absolute inset-0" aria-label={s.name} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DTM IMTIHON STRUKTURASI */}
      <section className="py-16 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <Badge className="bg-slate-900 text-white text-[11px] font-black uppercase">
            Ballar Tasimoti
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            DTM 2026 Test Tuzilishi va Maksimal 189 Ball
          </h2>
          <p className="text-sm text-slate-500">Har bir savol uchun ajratilgan ballar shkalasi.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Fan turi</th>
                  <th className="px-5 py-3.5">Fanlar nomi</th>
                  <th className="px-5 py-3.5 text-center">Savollar</th>
                  <th className="px-5 py-3.5 text-center">Har bir savol</th>
                  <th className="px-5 py-3.5 text-right">Jami ball</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr>
                  <td className="px-5 py-3 font-bold text-slate-900">Majburiy 1</td>
                  <td className="px-5 py-3">Ona tili (o&apos;zbek, rus, qoraqalpoq)</td>
                  <td className="px-5 py-3 text-center">10 ta</td>
                  <td className="px-5 py-3 text-center">1.1 ball</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">11 ball</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-bold text-slate-900">Majburiy 2</td>
                  <td className="px-5 py-3">Matematika (boshlang&apos;ich)</td>
                  <td className="px-5 py-3 text-center">10 ta</td>
                  <td className="px-5 py-3 text-center">1.1 ball</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">11 ball</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-bold text-slate-900">Majburiy 3</td>
                  <td className="px-5 py-3">O&apos;zbekiston Tarixi</td>
                  <td className="px-5 py-3 text-center">10 ta</td>
                  <td className="px-5 py-3 text-center">1.1 ball</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">11 ball</td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="px-5 py-3 font-bold text-emerald-900">Asosiy Fan 1</td>
                  <td className="px-5 py-3 font-bold text-slate-900">1-mutaxassislik fani</td>
                  <td className="px-5 py-3 text-center font-bold">30 ta</td>
                  <td className="px-5 py-3 text-center">3.1 ball</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">93 ball</td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="px-5 py-3 font-bold text-emerald-900">Asosiy Fan 2</td>
                  <td className="px-5 py-3 font-bold text-slate-900">2-mutaxassislik fani</td>
                  <td className="px-5 py-3 text-center font-bold">30 ta</td>
                  <td className="px-5 py-3 text-center">2.1 ball</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">63 ball</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-sm">
                <tr>
                  <td colSpan={2} className="px-5 py-3.5">UMUMIY NATIJA</td>
                  <td className="px-5 py-3.5 text-center">90 ta savol</td>
                  <td className="px-5 py-3.5 text-center">—</td>
                  <td className="px-5 py-3.5 text-right text-emerald-400">189.0 BALL</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <Badge variant="outline" className="border-slate-300 text-slate-700 text-[11px] font-black uppercase">
              Ko&apos;p Beriladigan Savollar
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              DTM Testlar Bo&apos;yicha Savol-Javoblar
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900 flex items-start gap-2.5">
                  <HelpCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item.q}</span>
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed pl-7.5">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white text-center px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <Badge className="bg-emerald-500 text-slate-950 font-black uppercase text-xs">
            Kelajagingizni bugun quring
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            OTM talabasi bo&apos;lish sari ilk qadamni qo&apos;ying!
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            IlmIldizi bilan har kuni 15 daqiqa test yeching, o&apos;z zaif mavzularingizni yo&apos;qoting va imtihonda 100% ishonch bilan qatnashing.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="h-12 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">
              <Link href="/register">
                Bepul Boshlash 🚀
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
