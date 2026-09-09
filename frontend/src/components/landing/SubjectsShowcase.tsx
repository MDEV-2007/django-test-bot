'use client';

import { Landmark, BookOpen, Calculator, Globe2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const SUBJECTS = [
  {
    icon: Landmark,
    title: "Tarix",
    sub: "O'zbekiston va Jahon tarixi",
    count: "1,500+ test",
    badge: "Milliy sertifikat A+",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "Xronologiya, xaritalar, tarixiy sanalar va rasmiy formatdagi qiyinlik darajalari.",
  },
  {
    icon: BookOpen,
    title: "Ona tili va Adabiyot",
    sub: "Grammatika va Badiiy tahlil",
    count: "1,200+ test",
    badge: "BBA & Sertifikat",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "Morfologiya, sintaksis, mumtoz matnlar tahlili va yangi formatdagi savollar.",
  },
  {
    icon: Calculator,
    title: "Matematika",
    sub: "Asosiy va Majburiy blok",
    count: "1,800+ test",
    badge: "BBA 2026",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "Formula qo'llash, mantiqiy misollar va har bir savol uchun bosqichma-bosqich yechim.",
  },
  {
    icon: Globe2,
    title: "Ingliz tili",
    sub: "Grammar & Reading",
    count: "900+ test",
    badge: "CEFR / B2",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    desc: "Leksika, kontekstual matnlar va sertifikat talablariga mos tuzilgan test bazasi.",
  },
];

export default function SubjectsShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          Imtihon fanlari
        </span>
        <h2 className="font-voice mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Qaysi fandan tayyorlanyapsiz?
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
          Har bir fanning rasmiy DTM va Milliy sertifikat andozasiga mos tuzilgan keng qamrovli test bazasi.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBJECTS.map((s) => (
          <Link
            key={s.title}
            href="/register"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-800 border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                  <s.icon className="size-5" />
                </span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${s.badgeColor}`}>
                  {s.badge}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {s.title}
              </h3>
              <p className="text-xs font-medium text-emerald-700 mt-0.5">{s.sub}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.desc}</p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="font-mono font-semibold text-slate-500">{s.count}</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                Test yechish <ArrowRight className="size-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
