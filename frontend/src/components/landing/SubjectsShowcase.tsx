'use client';

import { Landmark, BookOpen, Calculator, Globe2, Dna, Library, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const SUBJECTS = [
  {
    icon: Landmark,
    title: "O'zbekiston va Jahon Tarixi",
    shortName: 'Tarix',
    count: '1,500+ savol',
    badge: 'Milliy Sertifikat A+',
    syllabus: 'BMB 2026',
    desc: "Xronologiya, xaritalar, sulolalar va tarixiy manbalar tahlili bo'yicha to'liq test va flashcardlar bazasi.",
    squircle: 'from-[#FFB82E] to-[#E89B10] shadow-[0_6px_16px_rgba(255,149,0,0.32)]',
    pillTone: 'bg-[#FFB82E]/14 text-[#9A5A00]',
    href: '/tests?subject=tarix',
  },
  {
    icon: BookOpen,
    title: 'Ona Tili va Adabiyot',
    shortName: 'Ona tili',
    count: '1,200+ savol',
    badge: 'BBA & Sertifikat',
    syllabus: 'Yangi imlo',
    desc: "Morfologiya, sintaktik tahlil, mumtoz adabiyot matnlari, g'azallar tahlili va ochiq savollar.",
    squircle: 'from-[#4C806B] to-[#3A6654] shadow-[0_6px_16px_rgba(76,128,107,0.32)]',
    pillTone: 'bg-[#4C806B]/12 text-[#3A6654]',
    href: '/tests?subject=ona-tili',
  },
  {
    icon: Calculator,
    title: 'Matematika va Mantiq',
    shortName: 'Matematika',
    count: '1,800+ misol',
    badge: 'Asosiy & Majburiy',
    syllabus: 'Standart',
    desc: "Algebra, planimetriya, stereometriya, mantiqiy misollar va har bir masala uchun bosqichma-bosqich yechim.",
    squircle: 'from-[#7659C7] to-[#5E45A8] shadow-[0_6px_16px_rgba(118,89,199,0.32)]',
    pillTone: 'bg-[#7659C7]/12 text-[#0066CC]',
    href: '/tests?subject=matematika',
  },
  {
    icon: Dna,
    title: 'Biologiya va Genetika',
    shortName: 'Biologiya',
    count: '1,100+ savol',
    badge: 'Tibbiyot & Sertifikat',
    syllabus: '5–11-sinf',
    desc: "Sitologiya, genetika masalalari, botanika, zoologiya va odam anatomiyasi bo'yicha rasmiy baza.",
    squircle: 'from-[#70B5D5] to-[#3E7F9C] shadow-[0_6px_16px_rgba(48,176,199,0.32)]',
    pillTone: 'bg-[#70B5D5]/12 text-[#3E7F9C]',
    href: '/tests?subject=biologiya',
  },
  {
    icon: Globe2,
    title: 'Ingliz Tili (CEFR Multi-Level)',
    shortName: 'Ingliz tili',
    count: '900+ savol',
    badge: 'B2 / C1 Tayyorgarlik',
    syllabus: 'Multi-Level',
    desc: "Listening audio partlar, Reading matnlari, gap-fill hamda TRUE/FALSE/NOT GIVEN imtihon simulyatori.",
    squircle: 'from-[#7659C7] to-[#5E45A8] shadow-[0_6px_16px_rgba(88,86,214,0.32)]',
    pillTone: 'bg-[#7659C7]/12 text-[#3634A3]',
    href: '/tests?subject=ingliz-tili',
  },
  {
    icon: Library,
    title: '5–11-sinf Elektron Kutubxona',
    shortName: 'Kutubxona',
    count: '120+ darslik',
    badge: 'Raqamli darslik',
    syllabus: 'PDF & Online',
    desc: "Maktab darsliklari, Milliy sertifikat qo'llanmalari, xronologiya jadvallari va spravochniklar jamlanmasi.",
    squircle: 'from-[#F0523D] to-[#C93A28] shadow-[0_6px_16px_rgba(255,45,85,0.32)]',
    pillTone: 'bg-[#F0523D]/12 text-[#C93A28]',
    href: '/library',
  },
];

export default function SubjectsShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
            Fanlar va Manbalar Katalogi
          </div>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.025em] text-[#080808] sm:text-3xl lg:text-4xl">
            Qaysi yo&apos;nalishda imtihonga tayyorlanyapsiz?
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#6B6577] max-w-md font-normal">
          Har bir fan bo&apos;yicha BMB va Milliy sertifikat rasmiy dasturi asosida tuzilgan testlar, flashcardlar va darsliklar bazasi.
        </p>
      </div>

      {/* App Store Style Subject Cards (3x2 Grid) */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBJECTS.map((s) => (
          <Link
            key={s.shortName}
            href={s.href}
            className="ios-spring group relative flex flex-col justify-between rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_34px_-6px_rgba(0,0,0,0.08)]"
          >
            <div>
              {/* Top Row: iOS App Icon Squircle + Syllabus Pill */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-13 items-center justify-center rounded-lg bg-gradient-to-b ${s.squircle} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform duration-200 group-hover:scale-105`}
                >
                  <s.icon className="size-6 stroke-[2.2]" />
                </span>
                <span className="rounded-full bg-[#F7F4EF] px-3 py-1 text-[12px] font-semibold text-[#3D3846]">
                  {s.syllabus}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="mt-5 text-[18px] font-bold tracking-[-0.015em] text-[#080808] group-hover:text-[#7659C7] transition-colors">
                {s.title}
              </h3>

              <p className="mt-2 text-[13px] leading-relaxed text-[#6B6577] line-clamp-2">
                {s.desc}
              </p>

              {/* Subject Mini-metrics */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold pt-3.5 border-t border-black/[0.06]">
                <span className="rounded-full bg-[#F7F4EF] px-2.5 py-0.5 text-[#3D3846]">
                  {s.count}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 ${s.pillTone}`}>
                  {s.badge}
                </span>
              </div>
            </div>

            {/* App Store Style Bottom Action Row */}
            <div className="mt-5 flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-[#8A8494]">Rasmiy baza</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F4EF] group-hover:bg-[#7659C7] px-3.5 py-1.5 text-xs font-bold text-[#7659C7] group-hover:text-white transition-colors">
                <span>OCHISH</span>
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
