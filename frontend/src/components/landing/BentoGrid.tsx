'use client';

import { 
  Target, BrainCircuit, Swords, Flame, Sparkles, 
  CheckCircle, ArrowUpRight, GraduationCap, Users
} from 'lucide-react';
import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section id="imkoniyatlar" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      {/* Sarlavha */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-text)]">
          <Sparkles className="size-3.5" />
          To&apos;liq ekotizim
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Oddiy test emas, <span className="text-[var(--accent-text)]">natijani kafolatlovchi</span> tizim
        </h2>
        <p className="mt-4 text-sm text-[var(--text-secondary)] sm:text-base">
          Har bir funksiya sizni imtihon kunidagi 189 ballga yaqinlashtirish uchun sinxron ishlaydi.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        {/* ── CARD 1: DTM & Sertifikat Bashorati (2 ustun) ── */}
        <div className="group relative col-span-1 overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 transition-all duration-300 hover:border-[var(--accent-border)] hover:shadow-2xl md:col-span-2 sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Target className="size-6" />
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Aniq bashorat
                </span>
                <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                  DTM & Milliy sertifikat balli
                </h3>
              </div>
            </div>
            <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-300 sm:inline-block">
              Aniqlik darajasi 96%
            </span>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Platformadagi har bir yechilgan savol, sarflangan soniyalar va xatolar chuqur tahlil qilinib, real imtihon ballingiz doimiy hisoblab boriladi.
          </p>

          {/* Jonli vizual vidjet */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/70 p-5 sm:grid-cols-5">
            <div className="flex flex-col justify-center border-b border-[var(--border-card)] pb-4 sm:col-span-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
              <span className="text-xs text-[var(--text-muted)]">Kutilayotgan DTM balli</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-emerald-400">178.4</span>
                <span className="font-mono text-xs text-[var(--text-faint)]">/ 189.0</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300">
                <CheckCircle className="size-3.5" />
                <span>TDYU (Davlat Granti) ehtimoli yuqori</span>
              </div>
            </div>

            <div className="space-y-3 sm:col-span-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">Tarix (Asosiy fan)</span>
                  <span className="font-mono text-emerald-400 font-bold">94% · A+</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-input)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-1000" style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">Ona tili va adabiyot</span>
                  <span className="font-mono text-emerald-400 font-bold">88% · A</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-input)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-1000" style={{ width: '88%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">Majburiy 3 ta fan</span>
                  <span className="font-mono text-amber-400 font-bold">78% · O&apos;rtacha</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-input)] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all duration-1000" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: AI MENTOR 24/7 (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 transition-all duration-300 hover:border-[var(--accent-border)] hover:shadow-2xl sm:p-8">
          <div className="absolute left-0 bottom-0 -ml-16 -mb-16 size-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                <BrainCircuit className="size-6" />
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  24/7 Shaxsiy repetitor
                </span>
                <h3 className="text-xl font-bold text-foreground">AI Mentor</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Javobni shunchaki aytib bermaydi. Qayerda xato qilganingizni va kitobning qaysi betini o&apos;qish kerakligini ko&apos;rsatadi.
            </p>
          </div>

          {/* Jonli chat kartochkasi */}
          <div className="mt-6 space-y-2.5 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/70 p-3.5 text-xs">
            <div className="flex items-start gap-2">
              <div className="size-6 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                Siz
              </div>
              <div className="rounded-xl rounded-tl-none bg-[var(--surface-input)] p-2 text-[var(--text-primary)]">
                Nega bu savolda javob Buxoro emas?
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="size-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                AI
              </div>
              <div className="rounded-xl rounded-tl-none border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-200">
                Chunki 1370-yilda Amir Temur Samarqandni poytaxt etgan. 7-sinf darsligining 48-betiga qarang!
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: 1v1 ARENA & GAMIFIKATSIYA (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 transition-all duration-300 hover:border-[var(--accent-border)] hover:shadow-2xl sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                  <Swords className="size-6" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Jonli bellashuv
                  </span>
                  <h3 className="text-xl font-bold text-foreground">1v1 Arena</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">
                <Flame className="size-3.5" /> 7 kun streak
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              O&apos;rtoqlaringiz yoki respublika bo&apos;yicha teng kuchli raqib bilan real vaqtda 1v1 test jangi.
            </p>
          </div>

          {/* Jonli jang simulyatori */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/70 p-4">
            <div className="text-center">
              <div className="mx-auto size-9 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                Siz
              </div>
              <span className="mt-1 block font-mono text-xs font-semibold text-emerald-400">4 ball</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm font-black text-amber-400 tracking-wider">VS</span>
              <span className="text-[10px] text-[var(--text-faint)]">Jonli raund</span>
            </div>
            <div className="text-center">
              <div className="mx-auto size-9 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-xs font-bold text-rose-300">
                Jasur
              </div>
              <span className="mt-1 block font-mono text-xs font-semibold text-rose-400">2 ball</span>
            </div>
          </div>
        </div>

        {/* ── CARD 4: ZAIF MAVZULAR ILDIZI (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 transition-all duration-300 hover:border-[var(--accent-border)] hover:shadow-2xl sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400">
                <Sparkles className="size-6" />
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Ildizidan yo&apos;q qilish
                </span>
                <h3 className="text-xl font-bold text-foreground">Zaif mavzu tahlili</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Xato qilgan savollaringiz mavzular bo&apos;yicha yig&apos;ilib, aynan zaif nuqtalar ustida maqsadli mashq qildiriladi.
            </p>
          </div>

          {/* Mavzular ro'yxati */}
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-card-medium)]/70 p-2.5 border border-[var(--border-card)]">
              <span className="truncate pr-2">Temuriylar davri xronologiyasi</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 shrink-0">
                92% Mustahkam
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-card-medium)]/70 p-2.5 border border-[var(--border-card)]">
              <span className="truncate pr-2">Jadidlar harakati va matbuot</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 shrink-0">
                44% Zaif nuqta
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD 5: O'QITUVCHI VA SINF PANELI (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 transition-all duration-300 hover:border-[var(--accent-border)] hover:shadow-2xl sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
                <GraduationCap className="size-6" />
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Repetitor va maktablar
                </span>
                <h3 className="text-xl font-bold text-foreground">O&apos;qituvchi boshqaruvi</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              O&apos;z havolangiz orqali butun sinfni ulang. Har bir o&apos;quvchining zaif mavzulari va uyga vazifa natijalarini bitta jadvalda ko&apos;ring.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]/70 p-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                <Users className="size-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Tarix 11-sinf guruhi</div>
                <div className="text-[11px] text-[var(--text-faint)]">28 ta o&apos;quvchi faol</div>
              </div>
            </div>
            <Link href="/register" className="flex items-center gap-1 font-semibold text-sky-400 hover:underline">
              Boshlash <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
