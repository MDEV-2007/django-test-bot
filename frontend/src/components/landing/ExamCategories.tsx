'use client';

import Link from 'next/link';
import { ArrowUpRight, Timer, Award, BookOpen, Swords } from 'lucide-react';

interface ExamCard {
  id: string;
  title: string;
  desc: string;
  tag: string;
  badgeBg: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
  iconEmoji: string;
  href: string;
}

const EXAMS: ExamCard[] = [
  {
    id: 'dtm',
    title: 'DTM (BBA)',
    desc: '5 fan, 90 ta savol, 3 soat — haqiqiy davlat imtihoni formatidagi to\'liq simulyatsiya va aniq ball hisobi.',
    tag: '90 savol · 3 soat',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'from-emerald-500 to-teal-600',
    iconColor: 'text-white',
    icon: Timer,
    iconEmoji: '⏱️',
    href: '/mock',
  },
  {
    id: 'milliy',
    title: 'Milliy Sertifikat',
    desc: 'A+ dan C gacha darajalar, 45 ta savol (A, B, C, D va ochiq yozma), Rasch modeli (IRT) 100 ballik shkala.',
    tag: 'Rasch IRT · A+ shkala',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'from-amber-500 to-orange-600',
    iconColor: 'text-white',
    icon: Award,
    iconEmoji: '🏅',
    href: '/mock',
  },
  {
    id: 'fanlar',
    title: 'Fan & Blok Testlar',
    desc: 'Darsliklar asosida har bir mavzu va bob bo\'yicha testlar, bosqichma-bosqich yechimlar va nazariya.',
    tag: '15 000+ savol',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    iconBg: 'from-sky-500 to-indigo-600',
    iconColor: 'text-white',
    icon: BookOpen,
    iconEmoji: '📚',
    href: '/mock',
  },
  {
    id: 'arena',
    title: '1v1 Arena & Turnir',
    desc: 'Do\'stlar bilan jonli test bellashuvi, haftalik musobaqalar va butun Respublika bo\'yicha jonli reyting.',
    tag: 'Jonli bellashuv',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'from-rose-500 to-red-600',
    iconColor: 'text-white',
    icon: Swords,
    iconEmoji: '⚔️',
    href: '/register',
  },
];

export default function ExamCategories() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Sarlavha */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Yo&apos;nalishlar
        </span>
        <h2 className="font-voice mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Qaysi imtihonga tayyorlanasiz?
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Har bir yo&apos;nalishning o&apos;z rasmiy formati, testlari, vaqt taymeri va AI xatolar tahlili bor.
        </p>
      </div>

      {/* Chipta kartalari panjarasi */}
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6">
        {EXAMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 pt-10 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1.5"
          >
            {/* Top protruding 3D visual badge */}
            <div className="absolute -top-7 left-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <div className={`flex size-full items-center justify-center rounded-2xl bg-gradient-to-br ${item.iconBg} text-white shadow-md`}>
                <item.icon className="size-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="mt-2">
              <h3 className="font-voice text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {item.title}
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.badgeBg}`}>
                {item.tag}
              </span>

              <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-all duration-300 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white group-hover:rotate-45">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
