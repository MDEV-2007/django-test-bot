'use client';

import { Star, CheckCircle2, Quote, ShieldCheck } from 'lucide-react';

const STATS = [
  { value: 'BMB & Sertifikat', label: 'Rasmiy format', sub: 'Standart mezonlar asosida' },
  { value: '5,000+', label: 'Tahlilli savollar', sub: 'Har hafta yangilanadigan baza' },
  { value: '24/7', label: 'AI Mentor yordami', sub: 'Darslik iqtiboslari bilan' },
  { value: '15 daqiqa', label: 'Kunlik o‘rtacha mashq', sub: 'Uzluksiz o‘sish va streak' },
];

const TESTIMONIALS = [
  {
    name: 'Shahzodbek Qodirov',
    role: "TDYU talabasi (Davlat Granti)",
    score: 'Tarix: A+ (91.2 ball)',
    text: "Milliy sertifikatga tayyorlanishda AI Mentori va zaif mavzular tahlili menga eng ko'p yordam berdi. DTMda xato qilishi mumkin bo'lgan barcha sanalarni 1v1 arenada takrorlab, mustahkamlab oldim.",
    avatar: 'SQ',
    avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    verified: 'Milliy Sertifikat A+',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix fani o'qituvchisi",
    score: '32 nafar o‘quvchisi talaba bo‘ldi',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta monitoring jadvalida ko'raman. Darsda aynan o'sha mavzularga urg'u berish juda qulay bo'ldi.",
    avatar: 'DE',
    avatarBg: 'bg-sky-100 text-sky-800 border-sky-200',
    verified: 'Pedagogik sertifikat',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarBg: 'bg-amber-100 text-amber-800 border-amber-200',
    verified: 'Davlat Granti',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      
      {/* 1. Trust Metrics Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-slate-100">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center ${
                idx === 0 ? 'md:pr-6' : idx === 3 ? 'md:pl-6' : 'md:px-6'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {stat.value}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-bold text-slate-800">
                {stat.label}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500 font-medium">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Testimonials (No pill badge on top) */}
      <div className="mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Ishonch va Natijalar
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              O&apos;quvchilar va ustozlar nima deydi?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md">
            IlmIldizi bilan muntazam tayyorgarlik ko&apos;rayotgan abituriyentlar va repetitorlarning xolis fikrlari.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300"
            >
              <div>
                {/* Header: Avatar, Name, Verified */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-10 items-center justify-center rounded-xl border font-bold text-xs ${item.avatarBg}`}>
                      {item.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{item.name}</span>
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <span className="text-xs text-slate-500 font-medium block">{item.role}</span>
                    </div>
                  </div>
                </div>

                {/* Score badge */}
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                  <ShieldCheck className="size-3.5" />
                  <span>{item.score}</span>
                </div>

                {/* Text */}
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-emerald-700">{item.verified}</span>
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3 fill-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
