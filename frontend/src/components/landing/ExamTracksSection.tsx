'use client';

import Link from 'next/link';
import { Award, Timer, BookOpen, Swords, ArrowRight, Check } from 'lucide-react';

const TRACKS = [
  {
    id: 'milliy-sertifikat',
    badge: 'Maksimal imtiyoz',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Award,
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Milliy Sertifikat (UzBMB)',
    headline: '45 ta savol · Rasch 100 ballik shkala',
    description: '35 ta test va 10 ta yozma topshiriq. A+ yoki A daraja olib, DTM imtihonida mutaxassislik fanidan 100% maksimal ballga ega bo\'ling.',
    features: [
      'UzBMB rasmiy formatidagi namunaviy savollar',
      'Rasch IRT modeli bo\'yicha ball hisobi (A+, A, B+, B, C)',
      'Yozma savollar va qiyinlik darajalari tahlili',
    ],
    ctaText: 'Sertifikat testini boshlash',
    href: '/mock',
    featured: true,
  },
  {
    id: 'dtm-simulyatsiya',
    badge: 'Real imtihon',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: Timer,
    iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
    title: 'DTM (BBA) To\'liq Simulyatsiya',
    headline: '5 ta fan · 90 ta savol · 3 soat',
    description: '3 ta majburiy va 2 ta mutaxassislik fani. Real imtihon muhiti, vaqt bosimi va rasmiy mezonlarda umumiy ballni aniqlash.',
    features: [
      '5 ta fan jamlangan to\'liq 90 talik blok',
      '3 soatlik rasmiy vaqt taymeri',
      'Universitetlar o\'tish ballari bilan taqqoslash',
    ],
    ctaText: 'DTM simulyatsiyasini ochish',
    href: '/mock',
    featured: false,
  },
  {
    id: 'fan-testlar',
    badge: 'Mavzulashtirilgan',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: BookOpen,
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'Bobma-bob Fan Mashqlari',
    headline: '5–11 sinf darsliklari asosida',
    description: 'Barcha fanlar darsliklaridagi mavzular ketma-ketligi bo\'yicha tuzilgan. Har bir bobni mustahkamlab, zaif qoidalarni ildizidan bartaraf eting.',
    features: [
      'Har bir mavzu uchun 20–30 tadan saralangan savol',
      'Bosqichma-bosqich yechimlar va nazariy izohlar',
      'Xato qilingan savollarga avtomatik qaytish',
    ],
    ctaText: 'Mavzular bo\'yicha mashq',
    href: '/mock',
    featured: false,
  },
  {
    id: 'arena-bellashuv',
    badge: 'Jonli raqobat',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: Swords,
    iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
    title: '1v1 Bilim Bellashuvi',
    headline: 'Tengdoshlar bilan intellektual duel',
    description: 'Do\'stlaringiz yoki tasodifiy raqib bilan real vaqtda 5–10 ta savol yeching. Kunlik streaklar va Respublika reytingida peshqadam bo\'ling.',
    features: [
      'Jonli 1v1 test jangi va ELO reyting tizimi',
      'Haftalik sovrinli turnirlar',
      'Zerikmasdan, o\'yin tarzida o\'rganish',
    ],
    ctaText: 'Bellashuvga kirish',
    href: '/battles',
    featured: false,
  },
];

export default function ExamTracksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Sarlavha */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
          Tayyorgarlik yo&apos;nalishlari
        </span>
        <h2 className="font-voice mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Maqsadingizga mos formatni tanlang
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Har bir imtihonning o&apos;ziga xos talablari, mezonlari va baholash tartibi bor. Ilm Ildizi sizni aynan shu rasmiy formatlarga tayyorlaydi.
        </p>
      </div>

      {/* Kartalar panjarasi */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {TRACKS.map((t) => (
          <div
            key={t.id}
            className={`group relative flex flex-col justify-between rounded-3xl border p-7 sm:p-8 transition-all duration-300 ${
              t.featured
                ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-lg hover:shadow-xl hover:border-emerald-400 ring-1 ring-emerald-200/60'
                : 'border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`flex size-12 items-center justify-center rounded-2xl border shadow-xs ${t.iconBg}`}>
                  <t.icon className="size-6" />
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${t.badgeColor}`}>
                  {t.badge}
                </span>
              </div>

              <h3 className="font-voice mt-6 text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                {t.title}
              </h3>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                {t.headline}
              </p>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.description}
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs sm:text-sm text-slate-700 font-medium">
                {t.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <Link
                href={t.href}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all ${
                  t.featured
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    : 'border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 text-slate-800'
                }`}
              >
                <span>{t.ctaText}</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
