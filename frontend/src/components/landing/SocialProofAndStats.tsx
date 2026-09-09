'use client';

import { Star, ShieldCheck, CheckCircle, Quote } from 'lucide-react';

const STATS = [
  { value: '94.8%', label: 'Sertifikat natijadorligi', sub: 'A va A+ daraja olganlar' },
  { value: '45,000+', label: 'Yechilgan testlar', sub: 'Har kuni 1,200+ yangi urinish' },
  { value: '24/7', label: 'AI Mentor tayyorgarligi', sub: 'Sekundlarda aniq yechim' },
  { value: '15 daqiqa', label: 'Kunlik o‘rtacha mashq', sub: 'Doimiy streak va progress' },
];

const TESTIMONIALS = [
  {
    name: 'Shahzodbek Qodirov',
    role: "TDYU (Davlat Granti) talabasi",
    score: 'Tarix: A+ daraja (91.2 ball)',
    text: "Milliy sertifikatga tayyorlanishda IlmIldizining AI Mentori va zaif mavzular tahlili menga eng ko'p yordam berdi. DTMda xato qilishi mumkin bo'lgan barcha sanalarni 1v1 arenada takrorlab yodlab oldim.",
    avatar: 'SQ',
    avatarBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    name: 'Dilshod Ergashov',
    role: "Oliy toifali tarix o'qituvchisi, repetitor",
    score: '32 nafar o‘quvchisi talaba',
    text: "O'qituvchi paneli orqali 3 ta guruhimdagi 40 dan ortiq o'quvchining qaysi mavzudan oqsayotganini bitta jadvalda ko'raman. Darsda qaysi mavzuni ko'proq tushuntirish kerakligini aniq bilaman.",
    avatar: 'DE',
    avatarBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    name: 'Madinabonu Saidova',
    role: "O'zMU Jahon iqtisodiyoti talabasi",
    score: 'DTM 184.2 ball',
    text: "Oldin test yechish zerikarli edi. IlmIldizida har kuni o'yin shaklida, kunlik streakni yo'qotmaslik uchun test yechdim va natijada imtihonda deyarli adashmadim!",
    avatar: 'MS',
    avatarBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

export default function SocialProofAndStats() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--border-card)] bg-[var(--surface-card-soft)]/50 py-20 backdrop-blur-md sm:py-24">
      {/* Orqa fon yorug'ligi */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Metrikalar paneli */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/60 p-6 text-center shadow-lg"
            >
              <span className="font-mono text-3xl font-extrabold tracking-tight text-emerald-400 sm:text-4xl">
                {stat.value}
              </span>
              <span className="mt-2 text-sm font-semibold text-foreground">
                {stat.label}
              </span>
              <span className="mt-1 text-xs text-[var(--text-faint)]">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Fikrlar bo'limi (Testimonials) */}
        <div className="mt-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="size-3.5" />
              Tasdiqlangan natijalar
            </div>
            <h3 className="font-voice mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Abituriyent va o&apos;qituvchilar nima deydi?
            </h3>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <div
                key={item.name}
                className="relative flex flex-col justify-between rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/60 p-6 shadow-xl transition-all duration-300 hover:border-[var(--accent-border)] hover:bg-[var(--surface-card-medium)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                    <Quote className="size-5 text-[var(--text-faint)]" />
                  </div>

                  <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] italic">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-[var(--border-card)]/70 pt-4">
                  <div className={`flex size-10 items-center justify-center rounded-xl border font-mono text-xs font-bold ${item.avatarBg}`}>
                    {item.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                    <p className="text-xs text-[var(--text-faint)]">{item.role}</p>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <CheckCircle className="size-3" /> {item.score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
