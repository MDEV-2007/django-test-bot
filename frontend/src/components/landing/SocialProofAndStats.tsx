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
    avatarGradient: 'from-[#4C806B] to-[#3A6654]',
    verified: 'Milliy Sertifikat A+',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix fani o'qituvchisi",
    score: '32 nafar o‘quvchisi talaba bo‘ldi',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta monitoring jadvalida ko'raman. Darsda aynan o'sha mavzularga urg'u berish juda qulay bo'ldi.",
    avatar: 'DE',
    avatarGradient: 'from-[#7659C7] to-[#5E45A8]',
    verified: 'Pedagogik sertifikat',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarGradient: 'from-[#7659C7] to-[#5E45A8]',
    verified: 'Davlat Granti',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* 1. Ko'rsatkichlar — rangli plitkalar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STATS.map((stat, idx) => {
          const tone = [
            'bg-[#7659C7] text-white',
            'bg-[#FFB82E] text-[#080808]',
            'bg-[#4C806B] text-white',
            'bg-[#70B5D5] text-[#080808]',
          ][idx % 4];
          return (
            <div key={stat.label} className={`relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:p-6 ${tone}`}>
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
              <span className="relative font-[family-name:var(--font-grotesk)] text-[28px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[36px]">
                {stat.value}
              </span>
              <div className="relative mt-4">
                <p className="text-[14px] font-bold">{stat.label}</p>
                <p className="mt-0.5 text-[12px] font-semibold opacity-75">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. App Store Style Verified Testimonials */}
      <div className="mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
              Ishonch va Natijalar
            </div>
            <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.025em] text-[#080808] sm:text-3xl lg:text-4xl">
              O&apos;quvchilar va ustozlar nima deydi?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6577] max-w-md">
            IlmIldizi bilan muntazam tayyorgarlik ko&apos;rayotgan abituriyentlar va repetitorlarning xolis fikrlari.
          </p>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="group relative flex flex-col justify-between rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_-6px_rgba(0,0,0,0.08)]"
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
                        <span className="text-sm font-bold text-[#080808]">{item.name}</span>
                        <CheckCircle2 className="size-3.5 text-[#7659C7] shrink-0" />
                      </div>
                      <span className="text-xs text-[#6B6577] font-medium block">{item.role}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#4C806B]/12 px-3 py-1 text-xs font-bold text-[#3A6654]">
                  <ShieldCheck className="size-3.5" />
                  <span>{item.score}</span>
                </div>

                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#3D3846]">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-[12px] text-[#8A8494]">
                <span className="font-semibold text-[#7659C7]">{item.verified}</span>
                <div className="flex text-[#FFB82E] gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-[#FFB82E]" />
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
