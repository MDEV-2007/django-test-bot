import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Award, CheckCircle2, ArrowRight, Sparkles, BookOpen, Clock,
  ShieldCheck, HelpCircle, ChevronRight, Sprout, BarChart3,
  Flame, Target, Star, Play, Check
} from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=seo_milliy';

export const metadata: Metadata = {
  title: 'Milliy Sertifikat Testlari 2026 — Tarix, Ona tili va Matematika (Rasch Modeli) | IlmIldizi',
  description:
    "Milliy sertifikat rasmiy formati bo'yicha bepul onlayn mock testlar. Rasch modeli hisobi, yozma ochiq savollar, esse tahlili va aniq A+, A, B darajangizni aniqlang.",
  keywords: [
    'milliy sertifikat', 'milliy sertifikat testlari', 'tarix milliy sertifikat',
    'ona tili milliy sertifikat', 'biologiya milliy sertifikat', 'rasch modeli test',
    'milliy sertifikat A+ daraja', 'ochiq savollar milliy sertifikat', 'esse tekshirish milliy sertifikat',
    'bepul milliy sertifikat test yechish', 'abituriyent imtiyozlari',
  ],
  alternates: { canonical: '/milliy-sertifikat' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: `${SITE_URL}/milliy-sertifikat`,
    siteName: 'IlmIldizi',
    title: 'Milliy Sertifikat Testlari 2026 — Tarix, Ona tili, Matematika (Rasch Modeli)',
    description:
      "BMB rasmiy Rasch modeli standarti bo'yicha Milliy sertifikat mock imtihonlari. Ochiq savollar va esselarni AI tekshirib darajangizni hisoblab beradi.",
  },
};

const FAQ_ITEMS = [
  {
    q: "Milliy sertifikatda Rasch modeli qanday ishlaydi?",
    a: "Rasch modeli — xalqaro ilmiy psixometriya algoritmi bo'lib, har bir savolning qiyinchilik darajasini hisobga oladi. Qiyinroq savolga to'g'ri javob bergan abituriyent oson savolga javob bergandan ko'ra yuqoriroq theta va yakuniy shkala balliga ega bo'ladi.",
  },
  {
    q: "Qaysi darajadagi Milliy sertifikat OTMga kirishda 100% ball beradi?",
    a: "A+ va A darajadagi sertifikat egalariga oliy ta'lim muassasalarining bakalavriatiga qabul qilishda ushbu fan bo'yicha maksimal (100%) ball beriladi. B+ va B daraja egalariga esa mos proporsional ball taqdim etiladi.",
  },
  {
    q: "IlmIldizi'da yozma va ochiq savollar qanday baholanadi?",
    a: "Platformamizda BMB standartiga mos gibrid baholash algoritmi va Groq AI (Llama 3.3 70B) modeli integratsiya qilingan. U o'quvchining yozma javoblarini ma'nosiga qarab adolatli va tezkor baholaydi.",
  },
  {
    q: "Test yakunida rasmiy formatdagi sertifikat olsam bo'ladimi?",
    a: "Ha! Testni tugatganingizdan so'ng, IlmIldizi sizga Rasch modeli bo'yicha to'plangan darajangiz (A+, A, B va h.k.) va ballaringiz ko'rsatilgan shaxsiy elektron sertifikatni taqdim etadi.",
  },
];

const GRADES = [
  { grade: "A+", pct: "70 ballik shkalada eng yuqori", perk: "100% Maksimal ball imtiyozi", color: "from-amber-500 to-yellow-400", border: "border-amber-400" },
  { grade: "A", pct: "A'lo daraja", perk: "100% Maksimal ball imtiyozi", color: "from-emerald-600 to-teal-500", border: "border-emerald-500" },
  { grade: "B+", pct: "Juda yaxshi", perk: "Tabaqalashtirilgan yuqori ball", color: "from-sky-600 to-blue-500", border: "border-sky-500" },
  { grade: "B", pct: "Yaxshi", perk: "Proporsional ball imtiyozi", color: "from-indigo-600 to-purple-500", border: "border-indigo-500" },
];

export default function MilliySertifikatLandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Milliy Sertifikat Testlari', item: `${SITE_URL}/milliy-sertifikat` },
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
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-800">
            <Award className="size-4 text-amber-600" />
            <span>Rasch Modeli & Ochiq Savollar Algoritmi</span>
          </div>

          <h1 className="text-3xl font-black sm:text-5xl md:text-6xl text-slate-900 leading-tight tracking-tight">
            Milliy Sertifikat Testlari —{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-600 bg-clip-text text-transparent">
              Rasch Modeli va AI Tahlili
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Tarix, Ona tili va Matematika fanlaridan 45 talik to&apos;liq rasmiy formatdagi sinovlar. 
            Yopiq va yozma (ochiq) savollar, esse tahlili hamda BMB mezonlari bo&apos;yicha prognoz sertifikat darajangizni aniqlang.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-black text-base shadow-lg shadow-amber-600/20 gap-2 w-full sm:w-auto">
              <Link href="/register">
                <Play className="size-5 fill-white" /> Milliy Sertifikat Testini Boshlash
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-13 px-7 rounded-2xl border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-800 w-full sm:w-auto">
              <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                Telegram Botda Sinash 🤖
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Rasmiy 45 talik BMB formati</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Ochiq yozma savollar AI tekshiruvi</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" /> Rasch A+, A, B darajalar hisobi</span>
          </div>
        </div>
      </section>

      {/* SERTIFIKAT DARAJALARI VA IMTIYOZLAR */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-50 text-[11px] font-black uppercase">
              BMB Rasmiy Mezonlari
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Milliy Sertifikat Darajalari va OTM Imtiyozlari
            </h2>
            <p className="text-sm text-slate-500">Qaysi daraja abituriyentga qancha imtiyoz beradi?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GRADES.map((g, idx) => (
              <div
                key={idx}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-500/50 transition-all text-center"
              >
                <div>
                  <div className={`size-14 mx-auto rounded-2xl bg-gradient-to-tr ${g.color} text-white font-black text-2xl flex items-center justify-center shadow-md`}>
                    {g.grade}
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-900">{g.pct}</h3>
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg p-2 mt-2">
                    {g.perk}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Button asChild size="sm" variant="outline" className="w-full text-xs font-bold">
                    <Link href="/register">Ushbu darajani olish</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MILLIY SERTIFIKAT O'ZIGA XOSLIGI */}
      <section className="py-16 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Nega IlmIldizi — Milliy Sertifikat uchun №1 Platforma?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <span className="text-2xl p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 inline-block font-black">
              📊
            </span>
            <h3 className="text-base font-black text-slate-900">Rasch Modeli Algoritmi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Faqat to&apos;g&apos;ri javoblarni sanamaydi. Har bir savolning o&apos;quvchilar orasidagi qiyinlik darajasiga qarab haqiqiy Rasch theta balingizni chiqaradi.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <span className="text-2xl p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block font-black">
              ✍️
            </span>
            <h3 className="text-base font-black text-slate-900">Ochiq & Yozma Savollar AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ona tili esselari va Tarixning 3 qismli yozma topshiriqlarini Groq AI adolatli tekshiradi, imlo va mohiyatiga qarab ball beradi.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <span className="text-2xl p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 inline-block font-black">
              📜
            </span>
            <h3 className="text-base font-black text-slate-900">Elektron Prognoz Sertifikat</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Har bir mock imtihon yakunida rasmiy ko&apos;rinishdagi elektron sertifikat va zaif mavzular xaritasi beriladi.
            </p>
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
              Milliy Sertifikat Bo&apos;yicha Savol-Javoblar
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900 flex items-start gap-2.5">
                  <HelpCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
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
      <section className="py-16 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 text-white text-center px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <Badge className="bg-amber-400 text-slate-950 font-black uppercase text-xs">
            A+ Darajaga Tayyormisiz?
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            IlmIldizi bilan A+ Oltin Sertifikatini qo&apos;lga kiriting!
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Haqiqiy imtihon muhitini sezib ko&apos;ring. Rasch modeli hisobi bilan imtihonga to&apos;liq tayyor holda kiring.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="h-12 px-8 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-lg shadow-amber-400/20">
              <Link href="/register">
                Sinov Testini Yechish 🎯
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
