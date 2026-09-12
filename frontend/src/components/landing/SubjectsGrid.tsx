'use client';

import Link from 'next/link';
import { Landmark, BookOpen, Calculator, Dna, FlaskConical, Globe, ArrowRight } from 'lucide-react';

const SUBJECTS = [
  {
    id: 'tarix',
    name: 'Tarix',
    topics: "O'zbekiston va Jahon tarixi, sanalar xaritasi",
    count: '1,500+ savol',
    badge: 'Milliy Sertifikat A+',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Landmark,
    href: '/mock',
  },
  {
    id: 'ona-tili',
    name: 'Ona tili va Adabiyot',
    topics: 'Grammatika, morfologiya, mumtoz matnlar tahlili',
    count: '1,200+ savol',
    badge: 'BBA & Sertifikat',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: BookOpen,
    href: '/mock',
  },
  {
    id: 'matematika',
    name: 'Matematika',
    topics: 'Algebra, geometriya va mantiqiy misollar',
    count: '1,800+ savol',
    badge: 'Asosiy va Majburiy',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Calculator,
    href: '/mock',
  },
  {
    id: 'biologiya',
    name: 'Biologiya',
    topics: 'Botanika, zoologiya, odam anatomiyasi va genetika',
    count: '1,100+ savol',
    badge: 'Tibbiyot yo\'nalishi',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
    icon: Dna,
    href: '/mock',
  },
  {
    id: 'kimyo',
    name: 'Kimyo',
    topics: 'Anorganik, organik kimyo va hisobiy masalalar',
    count: '950+ savol',
    badge: 'DTM Masalalar',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: FlaskConical,
    href: '/mock',
  },
  {
    id: 'ingliz-tili',
    name: 'Ingliz tili (CEFR)',
    topics: 'Grammar, vocabulary, reading va test strategiyasi',
    count: '900+ savol',
    badge: 'B2 / Multilevel',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Globe,
    href: '/mock',
  },
];

export default function SubjectsGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            Fanlar katalogi
          </span>
          <h2 className="font-voice mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Imtihon topshiradigan faningizni tanlang
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Har bir fanning rasmiy Davlat test markazi andozasiga mos tuzilgan keng qamrovli savollar bazasi.
          </p>
        </div>

        <Link
          href="/mock"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-600 transition-colors"
        >
          Barcha fanlarni ko&apos;rish <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Grid */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBJECTS.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                  <s.icon className="size-5" />
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${s.badgeColor}`}>
                  {s.badge}
                </span>
              </div>

              <h3 className="font-voice mt-4 text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {s.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {s.topics}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="font-mono font-bold text-slate-400">{s.count}</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                Test yechish <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
