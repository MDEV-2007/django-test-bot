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
    avatarBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix o'qituvchisi",
    score: '32 nafar o‘quvchisi talaba bo‘ldi',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta jadvalda ko'raman. Darsda aynan o'sha mavzularga urg'u berish juda osonlashdi.",
    avatar: 'DE',
    avatarBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* 1. Nafis va Ixcham Trust Bar (Bahaybat qutilar o'rniga) */}
      <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c0e14]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-white/[0.08]">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center ${
                idx === 0 ? 'md:pr-6' : idx === 3 ? 'md:pl-6' : 'md:px-6'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {stat.value}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-zinc-200">
                {stat.label}
              </span>
              <span className="mt-1 text-[11px] text-zinc-400">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. O'quvchilar fikrlari (Testimonials) */}
      <div className="mt-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="size-3.5" />
            Tasdiqlangan natijalar
          </span>
          <h3 className="font-voice mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Abituriyent va repetitorlar nima deydi?
          </h3>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c0e14]/70 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30 hover:bg-[#0f121a]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <Quote className="size-4 text-zinc-500" />
                </div>

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-zinc-300 italic">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                <div className={`flex size-10 items-center justify-center rounded-full border font-mono text-xs font-bold ${item.avatarBg}`}>
                  {item.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                  <p className="text-[11px] text-zinc-400">{item.role}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
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
