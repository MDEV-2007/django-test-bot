'use client';

import {
  Target, Swords, Bot, CheckCircle, ArrowRight,
  BookOpen, AlertTriangle,
  Flame, ShieldCheck, Users,
  Film, Play, Heart, MessageCircle, Award, Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section id="imkoniyatlar" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      {/* Apple Keynote Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#007AFF]">
          Mukammal Ekotizim
        </div>
        <h2 className="mt-2.5 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl md:text-5xl">
          Oddiy test emas,{' '}
          <span className="bg-gradient-to-r from-[#007AFF] to-[#34C759] bg-clip-text text-transparent">
            natijani ildizidan o&apos;stiruvchi
          </span>{' '}
          texnologiya.
        </h2>
        <p className="mt-4 text-sm text-[#6C6C70] sm:text-base leading-relaxed">
          Har bir imkoniyat sizni imtihondagi eng yuqori ball va Davlat Grantiga yaqinlashtirish uchun yagona iOS uslubidagi ekotizimga birlashtirilgan.
        </p>
      </div>

      {/* Apple Keynote Bento Grid */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* =========================================================
            TILE 1: DTM & MILLIY SERTIFIKAT SCORE PREDICTOR (7 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-[#34C759]/10 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#34C759] to-[#28A745] text-white shadow-[0_4px_12px_rgba(52,199,89,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <ShieldCheck className="size-5.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#248A3D]">
                    Apple Health Usulida Tahlil
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                    DTM va Milliy Sertifikat Ball Bashorati
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#34C759]/12 px-3 py-1 font-mono text-[11px] font-bold text-[#248A3D]">
                96% Aniqlik
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Yechilgan har bir mock test natijasidan kelib chiqib, qaysi OTMga grant yoki kontraktga kirish imkoniyatingiz yuqoriligini hisoblab beradi.
            </p>

            {/* iOS Inset Grouped Score Widget */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-4 rounded-[22px] border border-black/[0.05] bg-[#F2F2F7] p-4 sm:p-5">
              <div className="sm:col-span-2 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-black/[0.08] pb-3 sm:pb-0 sm:pr-4">
                <span className="text-xs text-[#6C6C70] font-medium">Kutilayotgan ball:</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-[#1C1C1E]">178.4</span>
                  <span className="font-mono text-xs text-[#8E8E93]">/ 189.0</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#248A3D]">
                  <CheckCircle className="size-3.5 shrink-0 text-[#34C759]" />
                  <span>Davlat Granti kvotasi</span>
                </div>
              </div>

              <div className="sm:col-span-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#1C1C1E] font-semibold">1-Asosiy fan (Tarix)</span>
                    <span className="font-mono text-[#248A3D] font-bold">94% · A+</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#34C759]" style={{ width: '94%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#1C1C1E] font-semibold">2-Asosiy fan (Ona tili)</span>
                    <span className="font-mono text-[#007AFF] font-bold">88% · A</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#007AFF]" style={{ width: '88%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-[#1C1C1E] font-semibold">Majburiy 3 ta fan</span>
                    <span className="font-mono text-[#5856D6] font-bold">82% · Yuqori</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[#5856D6]" style={{ width: '82%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">Rasch modeli va DTM algoritmi</span>
            <Link href="/register" className="font-bold text-[#007AFF] hover:underline flex items-center gap-1">
              O&apos;z ballingizni hisoblash <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 2: AI MENTOR WITH IMESSAGE CHAT BUBBLES (5 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#5856D6] to-[#4644B5] text-white shadow-[0_4px_12px_rgba(88,86,214,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Bot className="size-5.5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5856D6]">
                  Darslik Sahifasi Bilan
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                  24/7 AI Mentor va Manba Iqtibosi
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Xato qilganda shunchaki javob aytmaydi — rasmiy maktab darsligidagi bet va paragrafni ko&apos;rsatib tushuntiradi.
            </p>

            {/* iOS iMessage Style Chat Simulation */}
            <div className="mt-4 space-y-2.5 rounded-[22px] border border-black/[0.05] bg-[#F2F2F7] p-4">
              <div className="flex justify-end">
                <div className="rounded-[18px] rounded-br-[4px] bg-[#007AFF] text-white px-3.5 py-2 text-xs max-w-[85%] font-medium shadow-2xs">
                  Nega javob 1370-yil? 1365-yil emasmi?
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#5856D6] to-[#007AFF] text-white text-[10px] font-bold">
                  AI
                </div>
                <div className="rounded-[18px] rounded-bl-[4px] bg-white border border-black/[0.06] p-3 text-xs text-[#1C1C1E] space-y-2 shadow-2xs">
                  <p className="leading-relaxed">
                    1365-yilda Ilyosxo&apos;jaga qarshi <strong>&quot;Loy jangi&quot;</strong> bo&apos;lgan. Amir Temur esa 1370-yil Balx qurultoyida Movarounnahr amiri deb e&apos;lon qilinadi.
                  </p>
                  <div className="flex items-center gap-1.5 rounded-[10px] bg-[#5856D6]/10 px-2.5 py-1 text-[11px] font-bold text-[#5856D6]">
                    <BookOpen className="size-3.5 shrink-0" />
                    <span>7-sinf O&apos;zbekiston tarixi, 84-bet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">Cheklovsiz savol-javob</span>
            <Link href="/register" className="font-bold text-[#5856D6] hover:underline flex items-center gap-1">
              AI bilan mashq qilish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 3: REAL-TIME 1v1 BATTLE ARENA (5 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-5 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#FF9500] to-[#E08600] text-white shadow-[0_4px_12px_rgba(255,149,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Swords className="size-5.5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C93400]">
                  Game Center Duel
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                  Real-Vaqtdagi 1v1 Battle Arena
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Tengdoshlaringiz bilan tezkorlik va aniqlik ustida bellashing. Raqobat bosimida test yechish imtihon hayajonini yo&apos;q qiladi.
            </p>

            {/* iOS Dark Live Activity Duel Card */}
            <div className="mt-4 rounded-[22px] border border-white/10 bg-[#1C1C1E] p-4 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#30D158] font-bold flex items-center gap-1">
                  <Flame className="size-3.5 fill-[#FF9F0A] text-[#FF9F0A]" /> Tarix bo&apos;yicha duel
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-[#FFD60A] font-bold">
                  00:14 qoldi
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-[#30D158]/20 border border-[#30D158] flex items-center justify-center font-bold text-xs text-[#30D158]">
                    Siz
                  </div>
                  <div>
                    <div className="text-xs font-bold">Siz</div>
                    <div className="text-[10px] font-mono text-[#30D158] font-bold">6/7 to&apos;g&apos;ri</div>
                  </div>
                </div>

                <span className="rounded-full bg-[#FF453A]/20 border border-[#FF453A]/40 px-2.5 py-0.5 text-[10px] font-black text-[#FF6961]">
                  VS
                </span>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-xs font-bold">Jasurbek M.</div>
                    <div className="text-[10px] font-mono text-[#8E8E93] font-bold">5/7 to&apos;g&apos;ri</div>
                  </div>
                  <div className="size-9 rounded-full bg-[#2C2C2E] border border-white/15 flex items-center justify-center font-bold text-xs text-white">
                    JM
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-[#2C2C2E] overflow-hidden flex">
                  <div className="h-full bg-[#30D158]" style={{ width: '60%' }} />
                  <div className="h-full bg-[#FF453A]" style={{ width: '40%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#8E8E93] font-mono">
                  <span>+45 XP yutuqda</span>
                  <span>ELO: 1,450</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">Jonli intellektual duel</span>
            <Link href="/register" className="font-bold text-[#C93400] hover:underline flex items-center gap-1">
              Jangga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 4: LIVE DIAGNOSTIC HEATMAP (7 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-7 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#007AFF] to-[#0062CC] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Target className="size-5.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF]">
                    Syllabus Diagnostikasi
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                    Mavzular Kesimidagi Diagnostik Heatmap
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#007AFF]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#007AFF]">
                Jonli
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Qaysi asr yoki mavzuda xato qilganingizni aniq ko&apos;rsatadi. Vaqtingizni barcha kitobni boshidan o&apos;qishga emas, aynan zaif nuqtangizga yo&apos;naltirasiz.
            </p>

            {/* Diagnostic Heatmap Bars */}
            <div className="mt-4 space-y-3 rounded-[22px] border border-black/[0.05] bg-[#F2F2F7] p-4 sm:p-5">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#1C1C1E] font-semibold">Amir Temur va Temuriylar davri</span>
                  <span className="font-mono text-[#248A3D] font-bold">92% · Mustahkam</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#34C759]" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#1C1C1E] font-semibold">Qadimgi Baqtriya va So&apos;g&apos;diyona</span>
                  <span className="font-mono text-[#007AFF] font-bold">86% · A</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#007AFF]" style={{ width: '86%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#D70015] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-[#FF3B30]" />
                    Jadidchilik harakati va ma&apos;rifatparvarlik
                  </span>
                  <span className="font-mono text-[#D70015] font-bold">44% · Zaif nuqta</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#FF3B30]/15 overflow-hidden">
                  <div className="h-full rounded-full bg-[#FF3B30]" style={{ width: '44%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">AI 15 daqiqalik ekspress mashq tuzdi</span>
            <Link href="/register" className="font-bold text-[#007AFF] hover:underline flex items-center gap-1">
              Mashqni boshlash <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 5: BILIM REELS (6 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-6 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#FF2D55] to-[#D70015] text-white shadow-[0_4px_12px_rgba(255,45,85,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Film className="size-5.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D70015]">
                    Qisqa Video Format
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                    Bilim Reels: 30 Soniyalik Darslar
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#FF2D55]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#D70015]">
                Reels
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Qisqa video-darslarni ko&apos;ring va videodan keyin darhol tezkor mini-testni yechib, bilimingizni mustahkamlang va XP ishlang.
            </p>

            {/* iOS Media Player Card */}
            <div className="mt-4 rounded-[22px] border border-white/10 bg-[#1C1C1E] p-4 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-[#FF375F] animate-pulse" />
                  <span className="font-semibold text-[#E5E5EA]">Tarix: 6-sinf · Mil.avv. VI asr</span>
                </div>
                <span className="font-mono text-[11px] text-[#FF375F] font-bold bg-[#FF375F]/15 px-2.5 py-0.5 rounded-full">
                  00:24
                </span>
              </div>

              <div className="p-3 rounded-[16px] bg-[#2C2C2E] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#FF2D55] flex items-center justify-center text-white shadow-sm">
                    <Play className="size-4 fill-white ml-0.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Kir II va Tomaris to&apos;qnashuvi</p>
                    <p className="text-[10px] text-[#8E8E93]">Asosiy sanalar va darslik fokuslari</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono text-[#30D158] bg-[#30D158]/15 px-2.5 py-1 rounded-full">
                  +15 XP
                </span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                <p className="text-[11px] font-semibold text-[#D1D1D6]">
                  ❓ Videodan savol: Kir II qaysi jangda halok bo&apos;lgan?
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-[12px] bg-[#30D158]/20 border border-[#30D158]/40 text-[#30D158] font-bold flex items-center justify-between">
                    <span>A) Massagetlar bilan</span>
                    <CheckCircle className="size-3.5 text-[#30D158]" />
                  </div>
                  <div className="p-2 rounded-[12px] bg-[#2C2C2E] text-[#8E8E93]">
                    B) Marafon jangi
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">100+ saralangan darslik videolari</span>
            <Link href="/reels" className="font-bold text-[#D70015] hover:underline flex items-center gap-1">
              Reelslarni ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 6: HAMJAMIYAT & YUTUQLAR LENTASI (6 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-6 overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#AF52DE] to-[#8E3CBE] text-white shadow-[0_4px_12px_rgba(175,82,222,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Sparkles className="size-5.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8944AB]">
                    Ijtimoiy Ta&apos;lim Tarmog&apos;i
                  </span>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1C1E]">
                    Hamjamiyat va Yutuqlar Lentasi
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-[#AF52DE]/12 px-3 py-1 font-mono text-[11px] font-bold text-[#8944AB]">
                Jonli Feed
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Butun O&apos;zbekiston bo&apos;ylab minglab intiluvchan abituriyentlar bilan birga o&apos;sing. Milliy sertifikat va rekordlaringizni ulashing.
            </p>

            {/* iOS Notification / Social Card Mockup */}
            <div className="mt-4 rounded-[22px] border border-black/[0.05] bg-[#F2F2F7] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-gradient-to-b from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    MS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                      Madinabonu S.
                      <span className="text-[#8E8E93] font-normal">· 2 daq oldin</span>
                    </div>
                    <div className="text-[10px] text-[#007AFF] font-semibold">TDYU Davlat Granti maqsadi</div>
                  </div>
                </div>
                <span className="rounded-full bg-[#FF9500]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#C93400] flex items-center gap-1">
                  <Award className="size-3 text-[#FF9500]" /> A+ Sertifikat
                </span>
              </div>

              <div className="rounded-[16px] bg-white border border-black/[0.05] p-3 text-xs text-[#1C1C1E] shadow-2xs">
                <p className="leading-relaxed">
                  &quot;Tarixdan Milliy Sertifikat imtihonida <strong>96.2 ball</strong> bilan A+ oldim! 🎉 AI Mentor zaif mavzularimni topib bergani juda asqatdi!&quot;
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6C6C70] pt-1 font-medium">
                <div className="flex items-center gap-3.5">
                  <span className="flex items-center gap-1 text-[#FF2D55] font-bold">
                    <Heart className="size-3.5 fill-[#FF2D55] text-[#FF2D55]" /> 148
                  </span>
                  <span className="flex items-center gap-1 text-[#6C6C70]">
                    <MessageCircle className="size-3.5 text-[#8E8E93]" /> 32 ta fikr
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#248A3D] bg-[#34C759]/12 px-2.5 py-0.5 rounded-full">
                  +100 XP Bonus
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-black/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">15,000+ faol abituriyentlar safi</span>
            <Link href="/feed" className="font-bold text-[#8944AB] hover:underline flex items-center gap-1">
              Hamjamiyatga qo&apos;shilish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================
            TILE 7: TEACHER & COHORT MONITORING (Full 12 Cols)
            ========================================================= */}
        <div className="group relative col-span-1 md:col-span-12 overflow-hidden rounded-[32px] border border-white/12 bg-[#1C1C1E] p-6 sm:p-9 text-white shadow-[0_20px_50px_rgba(0,0,0,0.14)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[#64D2FF] text-xs font-semibold">
              <Users className="size-3.5" />
              <span>O&apos;qituvchilar va Repetitorlar uchun iPadOS / macOS Panel</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Butun sinf yoki guruh o&apos;quvchilarini bitta paneldan nazorat qiling
            </h3>
            <p className="text-xs sm:text-sm text-[#AEAEB2] leading-relaxed">
              O&apos;quvchilaringizning zaif mavzulari, yechgan testlari va ball dinamikasi bitta monitoring jadvalida. Kim dars tayyorlamaganini bir soniyada bilib olasiz.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <div className="rounded-[20px] border border-white/12 bg-[#2C2C2E] px-4 py-3 text-center sm:text-left w-full sm:w-auto">
              <span className="text-[10px] text-[#8E8E93] block font-bold uppercase">Guruh o&apos;rtacha bali</span>
              <span className="text-xl font-mono font-black text-[#30D158]">172.6 ball (+18.4)</span>
            </div>
            <Link
              href="/register"
              className="ios-spring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#007AFF] hover:bg-[#0A84FF] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_20px_rgba(10,132,255,0.4)]"
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
