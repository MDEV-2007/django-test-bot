'use client';

import { 
  Target, BrainCircuit, Swords, Flame, Sparkles, 
  CheckCircle, ArrowUpRight, GraduationCap, Users
} from 'lucide-react';
import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section id="imkoniyatlar" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
      {/* Sarlavha */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          <Sparkles className="size-3.5" />
          Yagona mukammal tizim
        </span>
        <h2 className="font-voice mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Oddiy test emas, <span className="text-emerald-600">natijani o&apos;stiruvchi</span> ekotizim
        </h2>
        <p className="mt-4 text-sm text-slate-600 sm:text-base">
          Har bir imkoniyat sizni imtihon kunidagi maksimal ballga yaqinlashtirish uchun o&apos;zaro bog&apos;langan.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
        {/* ── CARD 1: DTM & Sertifikat Bashorati (2 ustun) ── */}
        <div className="group relative col-span-1 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl md:col-span-2 sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Target className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  Sun&apos;iy intellekt tahlili
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  DTM & Milliy sertifikat ball bashorati
                </h3>
              </div>
            </div>
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-800 sm:inline-block">
              Aniqlik: 96%
            </span>
          </div>

          <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-600">
            Yechilgan har bir savol, javob tezligi va xatolar hisobga olinib, real imtihondagi kutilayotgan ballingiz muntazam yangilanadi.
          </p>

          {/* Jonli vizual vidjet */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-5">
            <div className="flex flex-col justify-center border-b border-slate-200 pb-4 sm:col-span-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
              <span className="text-xs text-slate-500">Kutilayotgan umumiy ball</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-extrabold text-slate-900">178.4</span>
                <span className="font-mono text-xs text-slate-500">/ 189.0</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle className="size-3.5" />
                <span>TDYU (Davlat Granti) ehtimoli yuqori</span>
              </div>
            </div>

            <div className="space-y-3 sm:col-span-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Tarix (Asosiy fan)</span>
                  <span className="font-mono text-emerald-700 font-bold">94% · A+</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Ona tili va adabiyot</span>
                  <span className="font-mono text-teal-700 font-bold">88% · A</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: '88%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Majburiy fanlar</span>
                  <span className="font-mono text-amber-700 font-bold">78% · O&apos;rta</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: AI MENTOR 24/7 (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                <BrainCircuit className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  24/7 Shaxsiy repetitor
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">AI Mentor</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Faqat javobni emas, yechim yo&apos;lini va qaysi kitob sahifasini takrorlash kerakligini o&apos;rgatadi.
            </p>
          </div>

          {/* Jonli chat kartochkasi */}
          <div className="mt-6 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
            <div className="flex items-start gap-2">
              <div className="size-6 shrink-0 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">
                Siz
              </div>
              <div className="rounded-xl rounded-tl-none bg-white p-2.5 text-slate-800 shadow-xs border border-slate-100">
                Nega bu savolda javob Buxoro emas?
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="size-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                AI
              </div>
              <div className="rounded-xl rounded-tl-none border border-indigo-100 bg-indigo-50/90 p-2.5 text-indigo-900">
                Chunki 1370-yilda Amir Temur Samarqandni poytaxt etgan. 7-sinf darsligining 48-betiga qarang!
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: 1v1 ARENA & GAMIFIKATSIYA (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
                  <Swords className="size-5" />
                </span>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Jonli bellashuv
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">1v1 Arena</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 border border-orange-200">
                <Flame className="size-3.5" /> 7 kun streak
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Teng kuchli raqib bilan real vaqtda jonli test bellashuvi. Test yechish o&apos;yinga aylanadi.
            </p>
          </div>

          {/* Jonli jang simulyatori */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="text-center">
              <div className="mx-auto size-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-xs font-bold text-emerald-800">
                Siz
              </div>
              <span className="mt-1 block font-mono text-xs font-bold text-emerald-700">4 ball</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-xs font-black text-amber-600 tracking-wider">VS</span>
              <span className="text-[10px] text-slate-400">Jonli raund</span>
            </div>
            <div className="text-center">
              <div className="mx-auto size-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-xs font-bold text-rose-800">
                Jasur
              </div>
              <span className="mt-1 block font-mono text-xs font-bold text-rose-700">2 ball</span>
            </div>
          </div>
        </div>

        {/* ── CARD 4: ZAIF MAVZULAR ILDIZI (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 border border-teal-200">
                <Sparkles className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                  Ildizidan bartaraf etish
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Zaif mavzu tahlili</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Xato qilgan savollaringiz mavzular bo&apos;yicha yig&apos;iladi va aynan zaif joyingiz mashq qildiriladi.
            </p>
          </div>

          {/* Mavzular ro'yxati */}
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="truncate pr-2 text-slate-800 font-medium">Temuriylar davri xronologiyasi</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 shrink-0">
                92% Mustahkam
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="truncate pr-2 text-slate-800 font-medium">Jadidlar harakati va matbuot</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-800 shrink-0">
                44% Zaif nuqta
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD 5: O'QITUVCHI VA SINF PANELI (1 ustun) ── */}
        <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 border border-sky-200">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  Repetitor va maktablar
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">O&apos;qituvchi boshqaruvi</h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bitta taklif havolasi orqali butun sinfni monitoring qiling. Har bir o&apos;quvchi natijasi bitta joyda.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Users className="size-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Tarix 11-sinf guruhi</div>
                <div className="text-[11px] text-slate-500">28 ta o&apos;quvchi faol</div>
              </div>
            </div>
            <Link href="/register" className="flex items-center gap-1 font-semibold text-sky-700 hover:underline">
              Boshlash <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
