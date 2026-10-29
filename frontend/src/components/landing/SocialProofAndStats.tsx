'use client';

import { Star, CheckCircle2, ShieldCheck } from 'lucide-react';

const STATS = [
  { value: 'BMB & Sertifikat', label: 'Rasmiy format', sub: 'Standart mezonlar asosida' },
  { value: '5,000+', label: 'Tahlilli savollar', sub: 'Har hafta yangilanadigan baza' },
  { value: '24/7', label: 'AI Mentor yordami', sub: 'Darslik iqtiboslari bilan' },
  { value: '15 daqiqa', label: 'Kunlik o‘rtacha mashq', sub: 'Uzluksiz o‘sish va streak' },
];

const TESTIMONIALS = [
  {
    name: 'Shahzodbek Qodirov',
    role: 'TDYU talabasi (Davlat Granti)',
    score: 'Tarix: A+ (91.2 ball)',
    text: "Milliy sertifikatga tayyorlanishda AI Mentori va zaif mavzular tahlili menga eng ko'p yordam berdi. DTMda xato qilishi mumkin bo'lgan barcha sanalarni 1v1 arenada takrorlab, mustahkamlab oldim.",
    avatar: 'SQ',
    avatarGradient: 'from-[#34C759] to-[#28A745]',
    verified: 'Milliy Sertifikat A+',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix fani o'qituvchisi",
    score: '32 nafar o‘quvchisi talaba bo‘ldi',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta monitoring jadvalida ko'raman. Darsda aynan o'sha mavzularga urg'u berish juda qulay bo'ldi.",
    avatar: 'DE',
    avatarGradient: 'from-[#007AFF] to-[#0062CC]',
    verified: 'Pedagogik sertifikat',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarGradient: 'from-[#5856D6] to-[#4644B5]',
    verified: 'Davlat Granti',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* 1. Apple Numbers Style Metrics Bar */}
      <div className="rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-black/[0.06]">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center ${
                idx === 0 ? 'md:pr-6' : idx === 3 ? 'md:pl-6' : 'md:px-6'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
                  {stat.value}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-bold text-[#1C1C1E]">
                {stat.label}
              </span>
              <span className="mt-0.5 text-[11px] text-[#8E8E93] font-medium">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. App Store Style Verified Testimonials */}
      <div className="mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#007AFF]">
              Ishonch va Natijalar
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.025em] text-[#1C1C1E] sm:text-3xl lg:text-4xl">
              O&apos;quvchilar va ustozlar nima deydi?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#6C6C70] max-w-md">
            IlmIldizi bilan muntazam tayyorgarlik ko&apos;rayotgan abituriyentlar va repetitorlarning xolis fikrlari.
          </p>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="group relative flex flex-col justify-between rounded-[28px] border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_-6px_rgba(0,0,0,0.08)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-b ${item.avatarGradient} font-bold text-xs text-white shadow-2xs`}
                    >
                      {item.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1C1C1E]">{item.name}</span>
                        <CheckCircle2 className="size-3.5 text-[#007AFF] shrink-0" />
                      </div>
                      <span className="text-xs text-[#6C6C70] font-medium block">{item.role}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/12 px-3 py-1 text-xs font-bold text-[#248A3D]">
                  <ShieldCheck className="size-3.5" />
                  <span>{item.score}</span>
                </div>

                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#3A3A3C]">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-[11px] text-[#8E8E93]">
                <span className="font-semibold text-[#007AFF]">{item.verified}</span>
                <div className="flex text-[#FF9500] gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-[#FF9500]" />
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
