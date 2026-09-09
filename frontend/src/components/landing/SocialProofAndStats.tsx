'use client';

import { Star, CheckCircle, Quote, Sparkles } from 'lucide-react';

const STATS = [
  { value: '94.8%', label: 'Sertifikat natijasi', sub: 'A va A+ darajaga erishganlar' },
  { value: '45,000+', label: 'Yechilgan savollar', sub: 'Har kuni yangi testlar' },
  { value: '24/7', label: 'AI Mentor', sub: 'Darhol qadamma-qadam yechim' },
  { value: '15 daq', label: 'Kunlik o‘rtacha vaqt', sub: 'Uzluksiz o‘sish va streak' },
];

const TESTIMONIALS = [
  {
    name: 'Shahzodbek Qodirov',
    role: "TDYU talabasi (Davlat Granti)",
    score: 'Tarix: A+ daraja (91.2 ball)',
    text: "Milliy sertifikatga tayyorlanishda AI Mentori va zaif mavzular tahlili menga eng ko'p yordam berdi. DTMda xato qilishi mumkin bo'lgan barcha sanalarni 1v1 arenada takrorlab yodlab oldim.",
    avatar: 'SQ',
    avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix o'qituvchisi",
    score: '32 nafar o‘quvchisi talaba bo‘ldi',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta jadvalda ko'raman. Darsda aynan o'sha mavzularga urg'u berish juda osonlashdi.",
    avatar: 'DE',
    avatarBg: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* 1. Oq rangli nafis va ixcham Trust Bar */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-slate-100">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center ${
                idx === 0 ? 'md:pr-6' : idx === 3 ? 'md:pl-6' : 'md:px-6'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {stat.value}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-slate-800">
                {stat.label}
              </span>
              <span className="mt-1 text-[11px] text-slate-500">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. O'quvchilar fikrlari (Testimonials) */}
      <div className="mt-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <Sparkles className="size-3.5" />
            Tasdiqlangan natijalar
          </span>
          <h3 className="font-voice mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Abituriyent va repetitorlar nima deydi?
          </h3>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <Quote className="size-4 text-slate-400" />
                </div>

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-700 italic">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className={`flex size-10 items-center justify-center rounded-full border font-mono text-xs font-bold ${item.avatarBg}`}>
                  {item.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                  <p className="text-[11px] text-slate-500">{item.role}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle className="size-3" /> {item.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
