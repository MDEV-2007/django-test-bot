'use client';

import {
  Target, Swords, Bot, CheckCircle, ArrowRight,
  BookOpen, AlertTriangle,
  Flame, ShieldCheck, Users,
  Film, Play, Heart, MessageCircle, Award, Sparkles,
  Layers, Headphones, Library
} from 'lucide-react';
import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section id="imkoniyatlar" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      {/* Apple Keynote Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#7659C7]">
          Mukammal Ta&apos;lim Ekotizimi
        </div>
        <h2 className="mt-2.5 text-3xl font-bold tracking-[-0.03em] text-[#080808] sm:text-4xl md:text-5xl">
          Oddiy test emas,{' '}
          <span className="bg-gradient-to-r from-[#7659C7] to-[#4C806B] bg-clip-text text-transparent">
            natijani ildizidan o&apos;stiruvchi
          </span>{' '}
          texnologiya.
        </h2>
        <p className="mt-4 text-sm text-[#6B6577] sm:text-base leading-relaxed">
          Har bir modul sizni imtihondagi eng yuqori ball, A+ Milliy sertifikat va Davlat Grantiga yaqinlashtirish uchun yagona Cupertino uslubidagi ekotizimga birlashtirilgan.
        </p>
      </div>

      {/* Apple Keynote Bento Grid */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* =========================================================
            TILE 1: DTM & MILLIY SERTIFIKAT SCORE PREDICTOR (7 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-[#4C806B]/10 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#4C806B] to-[#3A6654] text-white shadow-[0_4px_12px_rgba(76,128,107,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <ShieldCheck className="size-5.5" />
                </span>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#3A6654]">
                    Intellektual Natijalar Analitikasi
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                    DTM 189 Ball va OTM 2026 Qabul Bashorati
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#4C806B]/12 px-3 py-1 font-mono text-[12px] font-bold text-[#3A6654]">
                96% Aniqlik
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Yechilgan har bir mock test natijasidan kelib chiqib, O&apos;zbekistondagi OTM yo&apos;nalishlariga Davlat Granti yoki Kontrakt asosida kirish imkoniyatingizni avtomatik hisoblab beradi.
            </p>

            {/* iOS Inset Grouped Score Widget */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-4 rounded-xl border border-black/[0.05] bg-[#F7F4EF] p-4 sm:p-5">
              <div className="sm:col-span-2 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-black/[0.08] pb-3 sm:pb-0 sm:pr-4">
                {/* Landing namoyishi: haqiqiy foydalanuvchi natijasi emasligi aniq yozilgan. */}
                <span className="text-xs text-[#6B6577] font-medium">Kutilayotgan ball (namuna):</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-[#080808]">178.4</span>
                  <span className="font-mono text-xs text-[#8A8494]">/ 189.0</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#3A6654]">
                  <CheckCircle className="size-3.5 shrink-0 text-[#4C806B]" />
                  <span>TDYU · Davlat Granti</span>
                </div>
              </div>

              <div className="sm:col-span-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#080808] font-semibold">1-Asosiy fan (Tarix)</span>
                    <span className="font-mono text-[#3A6654] font-bold">94% · A+</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#4C806B]" style={{ width: '94%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#080808] font-semibold">2-Asosiy fan (Ona tili)</span>
                    <span className="font-mono text-[#7659C7] font-bold">88% · A</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7659C7]" style={{ width: '88%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#080808] font-semibold">Majburiy 3 ta fan</span>
                    <span className="font-mono text-[#7659C7] font-bold">82% · Yuqori</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7659C7]" style={{ width: '82%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Rasch modeli va OTM 2026 kvotalari</span>
            <Link href="/profile" className="font-bold text-[#7659C7] hover:underline flex items-center gap-1">
              OTM kalkulyatorini ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 2: AI MENTOR WITH IMESSAGE CHAT BUBBLES (5 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#7659C7] to-[#5E45A8] text-white shadow-[0_4px_12px_rgba(88,86,214,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Bot className="size-5.5" />
              </span>
              <div>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#7659C7]">
                  Darslik Sahifasi Bilan
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                  24/7 AI Mentor va Manba Iqtibosi
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Xato qilganda shunchaki javob aytmaydi — rasmiy maktab darsligidagi bet va paragrafni ko&apos;rsatib tushuntiradi.
            </p>

            {/* iOS iMessage Style Chat Simulation */}
            <div className="mt-4 space-y-2.5 rounded-xl border border-black/[0.05] bg-[#F7F4EF] p-4">
              <div className="flex justify-end">
                <div className="rounded-xl rounded-br-[4px] bg-[#7659C7] text-white px-3.5 py-2 text-xs max-w-[85%] font-medium shadow-2xs">
                  Nega javob 1370-yil? 1365-yil emasmi?
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#7659C7] to-[#7659C7] text-white text-[12px] font-bold">
                  AI
                </div>
                <div className="rounded-xl rounded-bl-[4px] bg-white border border-black/[0.06] p-3 text-xs text-[#080808] space-y-2 shadow-2xs">
                  <p className="leading-relaxed">
                    1365-yilda Ilyosxo&apos;jaga qarshi <strong>&quot;Loy jangi&quot;</strong> bo&apos;lgan. Amir Temur esa 1370-yil Balx qurultoyida Movarounnahr amiri deb e&apos;lon qilinadi.
                  </p>
                  <div className="flex items-center gap-1.5 rounded-md bg-[#7659C7]/10 px-2.5 py-1 text-[12px] font-bold text-[#7659C7]">
                    <BookOpen className="size-3.5 shrink-0" />
                    <span>7-sinf O&apos;zbekiston tarixi, 84-bet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Cheklovsiz savol-javob</span>
            <Link href="/register" className="font-bold text-[#7659C7] hover:underline flex items-center gap-1">
              AI bilan mashq qilish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 3: REAL-TIME 1v1 BATTLE ARENA (5 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#FFB82E] to-[#E89B10] text-white shadow-[0_4px_12px_rgba(255,149,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Swords className="size-5.5" />
              </span>
              <div>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#9A5A00]">
                  Game Center Duel
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                  Real-Vaqtdagi 1v1 Battle Arena
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Tengdoshlaringiz bilan tezkorlik va aniqlik ustida bellashing. Raqobat bosimida test yechish imtihon hayajonini yo&apos;q qiladi.
            </p>

            {/* iOS Dark Live Activity Duel Card */}
            <div className="mt-4 rounded-xl border border-white/10 bg-[#080808] p-4 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4C806B] font-bold flex items-center gap-1">
                  <Flame className="size-3.5 fill-[#FFB82E] text-[#FFB82E]" /> Tarix bo&apos;yicha duel
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[12px] text-[#FFB82E] font-bold">
                  00:14 qoldi
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-[#4C806B]/20 border border-[#4C806B] flex items-center justify-center font-bold text-xs text-[#4C806B]">
                    Siz
                  </div>
                  <div>
                    <div className="text-xs font-bold">Siz</div>
                    <div className="text-[12px] font-mono text-[#4C806B] font-bold">6/7 to&apos;g&apos;ri</div>
                  </div>
                </div>

                <span className="rounded-full bg-[#FF453A]/20 border border-[#FF453A]/40 px-2.5 py-0.5 text-[12px] font-bold text-[#FF6961]">
                  VS
                </span>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-xs font-bold">Jasurbek M.</div>
                    <div className="text-[12px] font-mono text-[#8A8494] font-bold">5/7 to&apos;g&apos;ri</div>
                  </div>
                  <div className="size-9 rounded-full bg-[#1F1B26] border border-white/15 flex items-center justify-center font-bold text-xs text-white">
                    JM
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-[#1F1B26] overflow-hidden flex">
                  <div className="h-full bg-[#4C806B]" style={{ width: '60%' }} />
                  <div className="h-full bg-[#FF453A]" style={{ width: '40%' }} />
                </div>
                <div className="flex justify-between text-[12px] text-[#8A8494] font-mono">
                  <span>+45 XP yutuqda</span>
                  <span>ELO: 1,450</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Jonli intellektual duel</span>
            <Link href="/battles" className="font-bold text-[#9A5A00] hover:underline flex items-center gap-1">
              Jangga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 4: LIVE DIAGNOSTIC HEATMAP & REVISION (7 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#7659C7] to-[#5E45A8] text-white shadow-[0_4px_12px_rgba(118,89,199,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Target className="size-5.5" />
                </span>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#7659C7]">
                    Syllabus Diagnostikasi & Spaced Repetition
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                    Aqlli Xatolar Daftari va Diagnostik Heatmap
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#7659C7]/10 px-3 py-1 font-mono text-[12px] font-bold text-[#7659C7]">
                Avto-tahlil
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Imtihonlarda adashgan savollaringiz avtomatik &quot;Xatolar ustida ishlash&quot; dastasiga tushadi va siz ularni 100% o&apos;zlashtirmaguningizcha interval bilan takrorlatadi.
            </p>

            {/* Diagnostic Heatmap Bars */}
            <div className="mt-4 space-y-3 rounded-xl border border-black/[0.05] bg-[#F7F4EF] p-4 sm:p-5">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#080808] font-semibold">Amir Temur va Temuriylar davri</span>
                  <span className="font-mono text-[#3A6654] font-bold">92% · Mustahkam</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#4C806B]" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#080808] font-semibold">Qadimgi Baqtriya va So&apos;g&apos;diyona</span>
                  <span className="font-mono text-[#7659C7] font-bold">86% · A</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#7659C7]" style={{ width: '86%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#C93A28] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-[#F0523D]" />
                    Jadidchilik harakati va ma&apos;rifatparvarlik
                  </span>
                  <span className="font-mono text-[#C93A28] font-bold">44% · Zaif nuqta</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F0523D]/15 overflow-hidden">
                  <div className="h-full rounded-full bg-[#F0523D]" style={{ width: '44%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Xatolarni ildizidan tozalash algoritmi</span>
            <Link href="/tests/revision" className="font-bold text-[#7659C7] hover:underline flex items-center gap-1">
              Xatolar ustida ishlash <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 5: BILIM REELS (6 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-6 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#F0523D] to-[#C93A28] text-white shadow-[0_4px_12px_rgba(255,45,85,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Film className="size-5.5" />
                </span>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#C93A28]">
                    15 Soniyalik Blits Viktorina
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                    Bilim Reels: Qiyin Savollar Lentasi
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#F0523D]/10 px-3 py-1 font-mono text-[12px] font-bold text-[#C93A28]">
                Reels 2.0
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Vertikal lentada eng ko&apos;p abituriyent yiqiladigan qiyin savollarni 15 soniya ichida yeching, do&apos;stlaringizga Telegram orqali chaqiriq yuboring va Combo XP to&apos;plang.
            </p>

            {/* iOS Media Player Card */}
            <div className="mt-4 rounded-xl border border-white/10 bg-[#080808] p-4 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-[#F0523D] animate-pulse" />
                  <span className="font-semibold text-[#F2EADF]">Tarix · 68% abituriyent adashgan savol</span>
                </div>
                <span className="font-mono text-[12px] text-[#F0523D] font-bold bg-[#F0523D]/15 px-2.5 py-0.5 rounded-full">
                  15s
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#1F1B26] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#F0523D] flex items-center justify-center text-white shadow-sm">
                    <Play className="size-4 fill-white ml-0.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Kir II va Tomaris to&apos;qnashuvi</p>
                    <p className="text-[12px] text-[#8A8494]">Asosiy sanalar va darslik fokuslari</p>
                  </div>
                </div>
                <span className="text-[12px] font-bold font-mono text-[#4C806B] bg-[#4C806B]/15 px-2.5 py-1 rounded-full">
                  +15 XP
                </span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                <p className="text-[12px] font-semibold text-[#D6CFDF]">
                  ❓ Savol: Kir II qaysi jangda halok bo&apos;lgan?
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-md bg-[#4C806B]/20 border border-[#4C806B]/40 text-[#4C806B] font-bold flex items-center justify-between">
                    <span>A) Massagetlar bilan</span>
                    <CheckCircle className="size-3.5 text-[#4C806B]" />
                  </div>
                  <div className="p-2 rounded-md bg-[#1F1B26] text-[#8A8494]">
                    B) Marafon jangi
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">O&apos;z qiyin savolingizni qo&apos;shib +20 XP oling</span>
            <Link href="/reels" className="font-bold text-[#C93A28] hover:underline flex items-center gap-1">
              Reelslarni ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 6: HAMJAMIYAT & YUTUQLAR LENTASI (6 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-6 overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#9B7FE0] to-[#7659C7] text-white shadow-[0_4px_12px_rgba(175,82,222,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Sparkles className="size-5.5" />
                </span>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#5E45A8]">
                    Ijtimoiy Ta&apos;lim Tarmog&apos;i
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#080808]">
                    Hamjamiyat va Yutuqlar Lentasi
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#9B7FE0]/12 px-3 py-1 font-mono text-[12px] font-bold text-[#5E45A8]">
                Jonli Feed
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6B6577]">
              Butun O&apos;zbekiston bo&apos;ylab minglab intiluvchan abituriyentlar bilan birga o&apos;sing. Milliy sertifikat va rekordlaringizni ulashing.
            </p>

            {/* iOS Notification / Social Card Mockup */}
            <div className="mt-4 rounded-xl border border-black/[0.05] bg-[#F7F4EF] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-gradient-to-b from-[#7659C7] to-[#7659C7] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    MS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#080808] flex items-center gap-1">
                      Madinabonu S.
                      <span className="text-[#8A8494] font-normal">· 2 daq oldin</span>
                    </div>
                    <div className="text-[12px] text-[#7659C7] font-semibold">TDYU Davlat Granti maqsadi</div>
                  </div>
                </div>
                <span className="rounded-full bg-[#FFB82E]/15 px-2.5 py-0.5 text-[12px] font-bold text-[#9A5A00] flex items-center gap-1">
                  <Award className="size-3 text-[#FFB82E]" /> A+ Sertifikat
                </span>
              </div>

              <div className="rounded-lg bg-white border border-black/[0.05] p-3 text-xs text-[#080808] shadow-2xs">
                <p className="leading-relaxed">
                  &quot;Tarixdan Milliy Sertifikat imtihonida <strong>96.2 ball</strong> bilan A+ oldim! 🎉 AI Mentor zaif mavzularimni topib bergani juda asqatdi!&quot;
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B6577] pt-1 font-medium">
                <div className="flex items-center gap-3.5">
                  <span className="flex items-center gap-1 text-[#F0523D] font-bold">
                    <Heart className="size-3.5 fill-[#F0523D] text-[#F0523D]" /> 148
                  </span>
                  <span className="flex items-center gap-1 text-[#6B6577]">
                    <MessageCircle className="size-3.5 text-[#8A8494]" /> 32 ta fikr
                  </span>
                </div>
                <span className="text-[12px] font-bold text-[#3A6654] bg-[#4C806B]/12 px-2.5 py-0.5 rounded-full">
                  +100 XP Bonus
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">15,000+ faol abituriyentlar safi</span>
            <Link href="/feed" className="font-bold text-[#5E45A8] hover:underline flex items-center gap-1">
              Hamjamiyatga qo&apos;shilish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 7, 8, 9: SMART STACK (FLASHCARDS, KUTUBXONA, FOKUS XONASI)
            ========================================================= */}
        <div className="col-span-1 md:col-span-4 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#7659C7] to-[#5E45A8] text-white shadow-[0_4px_12px_rgba(88,86,214,0.28)]">
                <Layers className="size-5.5" />
              </span>
              <span className="rounded-full bg-[#7659C7]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#7659C7]">
                3D Xotira Kartalari
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#080808]">
              Smart Flashcardlar
            </h3>
            <p className="text-xs leading-relaxed text-[#6B6577]">
              Tarixiy sanalar, ona tili qoidalari, matematik formulalar va biologik atamalarni Anki & Quizlet uslubidagi 3D kartalar bilan 3 barobar tezroq yodlang.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Spaced Repetition</span>
            <Link href="/flashcards" className="font-bold text-[#7659C7] hover:underline flex items-center gap-1">
              Kartalarni ochish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#FFB82E] to-[#E89B10] text-white shadow-[0_4px_12px_rgba(255,149,0,0.28)]">
                <Library className="size-5.5" />
              </span>
              <span className="rounded-full bg-[#FFB82E]/12 px-2.5 py-0.5 text-[12px] font-bold text-[#9A5A00]">
                Elektron qo&apos;llanmalar
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#080808]">
              5–11-sinf Elektron Kutubxona
            </h3>
            <p className="text-xs leading-relaxed text-[#6B6577]">
              Rasmiy maktab darsliklari, Milliy sertifikat qo&apos;llanmalari va xronologik spravochniklarni bevosita sayt ichida o&apos;qing yoki yuklab oling.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">120+ darslik va manba</span>
            <Link href="/library" className="font-bold text-[#9A5A00] hover:underline flex items-center gap-1">
              Kutubxonaga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#70B5D5] to-[#3E7F9C] text-white shadow-[0_4px_12px_rgba(48,176,199,0.28)]">
                <Headphones className="size-5.5" />
              </span>
              <span className="rounded-full bg-[#70B5D5]/12 px-2.5 py-0.5 text-[12px] font-bold text-[#3E7F9C]">
                Pomodoro & Ambient
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#080808]">
              Virtual Fokus Xonasi
            </h3>
            <p className="text-xs leading-relaxed text-[#6B6577]">
              Yomg&apos;ir, kutubxona yoki gulxan sokin ovozlari ostida 25 daqiqalik Pomodoro taymeri bilan chalg&apos;imasdan dars qiling va kunlik missiyalarni bajaring.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8A8494] font-medium">Zen o&apos;qish muhiti</span>
            <Link href="/study" className="font-bold text-[#3E7F9C] hover:underline flex items-center gap-1">
              Fokus xonasiga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 10: TEACHER & COHORT MONITORING (Full 12 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-12 overflow-hidden rounded-3xl border border-white/12 bg-[#080808] p-6 sm:p-9 text-white shadow-[0_20px_50px_rgba(0,0,0,0.14)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[#70B5D5] text-xs font-semibold">
              <Users className="size-3.5" />
              <span>O&apos;qituvchilar va Repetitorlar uchun iPadOS / macOS Panel</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Butun sinf yoki guruh o&apos;quvchilarini bitta paneldan nazorat qiling
            </h3>
            <p className="text-xs sm:text-sm text-[#A79FB8] leading-relaxed">
              O&apos;quvchilaringizning zaif mavzulari, yechgan testlari va ball dinamikasi bitta monitoring jadvalida. Kim dars tayyorlamaganini bir soniyada bilib olasiz.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <div className="rounded-xl border border-white/12 bg-[#1F1B26] px-4 py-3 text-center sm:text-left w-full sm:w-auto">
              <span className="text-[12px] text-[#8A8494] block font-bold uppercase">Guruh o&apos;rtacha bali</span>
              <span className="text-xl font-mono font-bold text-[#4C806B]">172.6 ball (+18.4)</span>
            </div>
            <Link
              href="/register"
              className="ios-spring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#7659C7] hover:bg-[#7659C7] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_20px_rgba(118,89,199,0.4)]"
            >
              <span>O&apos;qituvchi profilini ochish</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
