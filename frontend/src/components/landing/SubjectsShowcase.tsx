'use client';

import { Landmark, BookOpen, Calculator, Globe2, ArrowRight, CheckCircle2, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import Link from 'next/link';

const SUBJECTS = [
  {
    icon: Landmark,
    title: "O'zbekiston va Jahon Tarixi",
    shortName: "Tarix",
    count: "1,500+ savol",
    badge: "Milliy Sertifikat A+",
    difficulty: "O'rta & Murakkab",
    syllabus: "Rasmiy DTM 2026",
    desc: "Xronologiya, xaritalar, sulolalar va tarixiy manbalar tahlili bo'yicha to'liq test bazasi.",
    accent: "from-emerald-500/10 to-teal-500/5",
    border: "border-emerald-200/80 hover:border-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: BookOpen,
    title: "Ona Tili va Adabiyot",
    shortName: "Ona tili",
    count: "1,200+ savol",
    badge: "BBA & Sertifikat",
    difficulty: "Barcha darajalar",
    syllabus: "Yangi imlo qoidalari",
    desc: "Morfologiya, sintaktik tahlil, mumtoz adabiyot matnlari va rasmiy formatdagi ochiq savollar.",
    accent: "from-blue-500/10 to-indigo-500/5",
    border: "border-blue-200/80 hover:border-blue-500",
    iconBg: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    icon: Calculator,
    title: "Matematika va Mantiq",
    shortName: "Matematika",
    count: "1,800+ misol",
    badge: "Asosiy & Majburiy",
    difficulty: "Bosqichma-bosqich",
    syllabus: "Standartlashtirilgan",
    desc: "Formulalar qo'llash, mantiqiy misollar va har bir masala uchun bosqichma-bosqich yechim.",
    accent: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-200/80 hover:border-amber-500",
    iconBg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: Globe2,
    title: "Ingliz Tili (CEFR Multi-Level)",
    shortName: "Ingliz tili",
    count: "900+ savol",
    badge: "B2 / C1 Tayyorgarlik",
    difficulty: "Listening & Reading",
    syllabus: "Cambridge & BMB",
    desc: "Audio eshitish, akademik o'qish matnlari va rasmiy ko'p darajali baholash mezonlari.",
    accent: "from-violet-500/10 to-purple-500/5",
    border: "border-violet-200/80 hover:border-violet-500",
    iconBg: "bg-violet-50 text-violet-700 border-violet-200",
  },
];

export default function SubjectsShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      
      {/* Section Header with crisp typographic eyebrow — NO pill badges */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Fanlar Katalogi
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Qaysi fandan imtihonga tayyorlanyapsiz?
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md font-normal">
          Har bir fan bo&apos;yicha Davlat Test Markazi (BMB) va Milliy sertifikat rasmiy dasturi asosida tuzilgan testlar bazasi.
        </p>
      </div>

      {/* Grid of Subject Hub Cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SUBJECTS.map((s) => (
          <Link
            key={s.shortName}
            href="/register"
            className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${s.border}`}
          >
            <div>
              {/* Top Row: Icon + Syllabus Badge */}
              <div className="flex items-center justify-between">
                <span className={`flex size-12 items-center justify-center rounded-xl border ${s.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                  <s.icon className="size-6" />
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/70">
                  {s.syllabus}
                </span>
              </div>

              {/* Title & Level */}
              <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {s.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
                {s.desc}
              </p>

              {/* Subject Mini-metrics */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-100">
                <span className="rounded bg-slate-50 px-2 py-0.5 border border-slate-200/60 font-semibold text-slate-700">
                  {s.count}
                </span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 border border-emerald-200/60 font-semibold text-emerald-800">
                  {s.badge}
                </span>
              </div>
            </div>

            {/* Bottom Action Link */}
            <div className="mt-6 flex items-center justify-between pt-2 text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              <span>Testlarni ko&apos;rish</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

    </section>
  );
}
