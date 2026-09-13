'use client';

import {
  Target, Swords, Bot, CheckCircle, ArrowRight,
  TrendingUp, BookOpen, Sparkles, AlertTriangle,
  Zap, Flame, Award, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section id="imkoniyatlar" className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
      
      {/* Section Header (No rounded-full badges, crisp high-end editorial typography) */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          Mukammal Ekotizim
        </div>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Oddiy test emas, <span className="text-emerald-600">natijani ildizidan o&apos;stiruvchi</span> texnologiya
        </h2>
        <p className="mt-4 text-sm text-slate-600 sm:text-base leading-relaxed">
          Har bir imkoniyat sizni imtihondagi eng yuqori ball va Davlat Grantiga yaqinlashtirish uchun o&apos;zaro bog&apos;langan.
        </p>
      </div>

      {/* Bento Grid: 4 High-Performance Product Widgets */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* =========================================================
            WIDGET 1: LIVE DIAGNOSTIC HEATMAP (7 Columns)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Target className="size-5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Syllabus Tahlili
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Mavzular kesimidagi diagnostik Heatmap
                  </h3>
                </div>
              </div>
              <span className="hidden sm:inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11px] font-bold text-emerald-800">
                Jonli monitoring
              </span>
            </div>

            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600">
              Qaysi asr, sulola yoki qoidada adashganingizni aniq ko&apos;rsatadi. Vaqtingizni barcha kitobni boshidan o&apos;qishga emas, aynan o&apos;sha zaif bo&apos;g&apos;inga yo&apos;naltirasiz.
            </p>

            {/* Diagnostic Heatmap Bars */}
            <div className="mt-6 space-y-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              
              {/* Topic 1 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-800 font-bold">Amir Temur va Temuriylar davri</span>
                  <span className="font-mono text-emerald-700 font-bold">92% o&apos;zlashtirilgan · A+</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: '92%' }} />
                </div>
              </div>

              {/* Topic 2 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-800 font-bold">Qadimgi Baqtriya va So&apos;g&apos;diyona</span>
                  <span className="font-mono text-teal-700 font-bold">86% o&apos;zlashtirilgan · A</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: '86%' }} />
                </div>
              </div>

              {/* Topic 3 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-800 font-bold">Turk xoqonligi va Somoniylar</span>
                  <span className="font-mono text-blue-700 font-bold">74% o&apos;zlashtirilgan · B+</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: '74%' }} />
                </div>
              </div>

              {/* Topic 4: WEAK POINT */}
              <div className="pt-1">
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-rose-900 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-rose-500" />
                    Jadidchilik harakati va ma&apos;rifatparvarlik
                  </span>
                  <span className="font-mono text-rose-600 font-bold">44% · Kuchsiz nuqta ⚠️</span>
                </div>
                <div className="h-2 w-full rounded-full bg-rose-100 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: '44%' }} />
                </div>
              </div>

            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-500 font-medium">
              💡 AI tavsiyasi: 15 daqiqalik intensiv mashq tayyor
            </span>
            <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Mashqni boshlash <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            WIDGET 2: REAL-TIME 1v1 BATTLE ARENA (5 Columns)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <Swords className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  Jonli Raqobat
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Real-vaqtdagi 1v1 Battle Arena
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
              Tengdoshlaringiz bilan tezkorlik va aniqlik ustida bellashing. Raqobat bosimida test yechish imtihon hayajonini yo&apos;q qiladi.
            </p>

            {/* 1v1 Arena Interactive Simulation Card */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-900 p-4 text-white space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Flame className="size-3.5" /> Tarix bo&apos;yicha duel
                </span>
                <span className="font-mono text-amber-400 font-bold">00:14 qoldi</span>
              </div>

              {/* Opponents Split */}
              <div className="flex items-center justify-between gap-3">
                {/* Player 1 */}
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-300">
                    Siz
                  </div>
                  <div>
                    <div className="text-xs font-bold">Siz</div>
                    <div className="text-[11px] font-mono text-emerald-400 font-bold">6/7 to&apos;g&apos;ri</div>
                  </div>
                </div>

                {/* VS Badge */}
                <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-black text-rose-400">
                  VS
                </span>

                {/* Player 2 */}
                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-xs font-bold">Jasurbek M.</div>
                    <div className="text-[11px] font-mono text-slate-400 font-bold">5/7 to&apos;g&apos;ri</div>
                  </div>
                  <div className="size-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                    JM
                  </div>
                </div>
              </div>

              {/* Live Battle Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: '60%' }} />
                  <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: '40%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>+45 XP yutuqda</span>
                  <span>Reyting: Top 5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Kunlik turnirda 1,420+ o&apos;quvchi</span>
            <Link href="/register" className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Jangga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            WIDGET 3: AI MENTOR WITH TEXTBOOK CITATIONS (5 Columns)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Bot className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Darslik Asosida
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  AI Mentor va Kitob Sahifasi Havolasi
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
              Shunchaki javob aytmaydi — rasmiy maktab darsligidagi bet va paragrafni ilova qilib, tushuntiradi.
            </p>

            {/* Chat Snippet Simulation */}
            <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              {/* User question */}
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-none bg-slate-900 text-white px-3.5 py-2 text-xs max-w-[85%] font-medium">
                  Nega javob 1370-yil? 1365-yil emasmi?
                </div>
              </div>

              {/* AI Mentor Answer with Citation */}
              <div className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-[10px] font-bold mt-1">
                  AI
                </div>
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200/80 p-3 text-xs text-slate-800 space-y-2 shadow-xs">
                  <p className="leading-relaxed">
                    1365-yilda Ilyosxo&apos;jaga qarshi mashhur <strong>&quot;Loy jangi&quot;</strong> bo&apos;lgan. Amir Temur esa 1370-yil Balxdagi qurultoyda Movarounnahr amiri deb e&apos;lon qilinadi.
                  </p>
                  <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                    <BookOpen className="size-3.5" />
                    <span>7-sinf O&apos;zbekiston tarixi, 84-bet (3-paragraf)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">24/7 savollarga javob</span>
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              AI bilan sinab ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            WIDGET 4: DTM & MILLIY SERTIFIKAT SCORE PREDICTOR GAUGE (7 Columns)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-emerald-300 hover:shadow-xl flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 -mr-16 -mb-16 size-64 rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                    Grant Ehtimoli
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    DTM va Milliy Sertifikat Ball Bashorati
                  </h3>
                </div>
              </div>
              <span className="hidden sm:inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-mono text-[11px] font-bold text-teal-800">
                Aniqlik: 96%
              </span>
            </div>

            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600">
              Yechilgan har bir mock test natijasidan kelib chiqib, qaysi OTMga grant yoki kontraktga kirish imkoniyatingiz yuqoriligini hisoblab beradi.
            </p>

            {/* Gauge / Score Predictor Display */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="sm:col-span-2 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-slate-200 pb-4 sm:pb-0 sm:pr-4">
                <span className="text-xs text-slate-500 font-medium">Kutilayotgan DTM ball:</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900">178.4</span>
                  <span className="font-mono text-xs text-slate-500">/ 189.0</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle className="size-3.5 shrink-0" />
                  <span>TDYU Davlat Granti (94% ehtimol)</span>
                </div>
              </div>

              <div className="sm:col-span-3 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-800 font-bold">1-Asosiy fan (Tarix)</span>
                    <span className="font-mono text-emerald-700 font-bold">94% · A+ Sertifikat</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: '94%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-800 font-bold">2-Asosiy fan (Ona tili)</span>
                    <span className="font-mono text-teal-700 font-bold">88% · A Sertifikat</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-600" style={{ width: '88%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-800 font-bold">Majburiy 3 ta fan</span>
                    <span className="font-mono text-blue-700 font-bold">82% · O&apos;tish</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: '82%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Real imtihon algoritmi asosida</span>
            <Link href="/register" className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              O&apos;z ballingizni bilish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
