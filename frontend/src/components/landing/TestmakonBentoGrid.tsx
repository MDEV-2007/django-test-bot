'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, Bot, Timer, Swords, Trophy, 
  ArrowRight, Sparkles, CheckCircle2, TrendingUp 
} from 'lucide-react';

export default function TestmakonBentoGrid() {
  // Live ticking timer simulation for Card 3
  const [secondsLeft, setSecondsLeft] = useState(3 * 3600 - 120);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 3 * 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section id="imkoniyatlar" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 scroll-mt-24">
      {/* Sarlavha */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <Sparkles className="size-3.5" />
          Aqlli tizim
        </span>
        <h2 className="font-voice mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Har bir xatoyingiz keyingi mashqqa aylanadi
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Qaysi mavzu zaif, nimani takrorlash kerak, ballingiz qaysi yo&apos;nalishga yetadi — hammasi testlaringiz natijasidan hisoblanadi.
        </p>
      </div>

      {/* Asimmetrik Bento Panjara */}
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-6 pt-6">
        
        {/* ── CARD 1 (XL: spans 3 cols, 2 rows on desktop) ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl md:col-span-3 md:row-span-2">
          {/* Top elevated icon */}
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-xs">
              <BarChart3 className="size-6" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Avtomatlashtirilgan tahlil
              </span>
              <h3 className="font-voice text-xl font-bold text-slate-900">
                Xatolarni AI tahlil qiladi
              </h3>
            </div>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Har bir testdan keyin AI zaif mavzularingizni topadi. Qayerda ko&apos;p xato qilasiz, aynan nimani takrorlashingiz kerak — aniq foizlarda ko&apos;rsatadi.
          </p>

          {/* Real Bar Chart Preview */}
          <div className="mt-6 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 text-xs font-semibold text-slate-600">
              <span className="text-slate-900 font-bold">Mavzular bo&apos;yicha tahlil</span>
              <span className="rounded-md bg-emerald-100/70 px-2 py-0.5 text-emerald-800 text-[11px]">Tarix</span>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Amir Temur davri</span>
                  <span className="font-mono text-emerald-700">86%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600 transition-all duration-1000" style={{ width: '86%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Qadimgi Sharq madaniyati</span>
                  <span className="font-mono text-emerald-700">71%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600 transition-all duration-1000" style={{ width: '71%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>O&apos;zbekiston hududidagi ilk davlatlar</span>
                  <span className="font-mono text-teal-700">63%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-600 transition-all duration-1000" style={{ width: '63%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Mesopotamiya va Old Osiyo</span>
                  <span className="font-mono text-amber-700">52%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: '52%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-rose-800 mb-1">
                  <span>Xonliklar davri (Zaif)</span>
                  <span className="font-mono text-rose-700 font-bold">34%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500 transition-all duration-1000" style={{ width: '34%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-rose-800 mb-1">
                  <span>Jadidchilik va matbuot (Zaif)</span>
                  <span className="font-mono text-rose-700 font-bold">28%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500 transition-all duration-1000" style={{ width: '28%' }} />
                </div>
              </div>
            </div>

            {/* AI Note Box */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 border border-emerald-100 text-xs text-emerald-900 leading-relaxed font-medium">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>AI tavsiyasi: bu hafta Xonliklar davridan kuniga 15 ta misol. Shaxsiy reja tayyor.</span>
            </div>
          </div>

          <div className="mt-5">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
              Batafsil ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* ── CARD 2 (LG: spans 3 cols) - AI MENTOR ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl md:col-span-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs">
                <Bot className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  24/7 Shaxsiy repetitor
                </span>
                <h3 className="font-voice text-lg sm:text-xl font-bold text-slate-900">
                  AI Mentor — 24/7 o&apos;qituvchi
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tushunmagan mavzuni yozing — AI darhol tushuntiradi. Formulalar, misollar, qadam-baqadam yechimlar. Hech qachon charchamaydi.
            </p>
          </div>

          {/* Interactive Chat Mockup */}
          <div className="mt-5 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-emerald-600 p-2.5 text-white shadow-xs font-medium">
                Tengsizlikda ishorani qachon almashtiraman?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-3 text-slate-800 shadow-xs leading-relaxed">
                <span className="block font-bold text-indigo-600 text-[11px] mb-1">AI Mentor</span>
                Ikkala tomonni manfiy songa ko&apos;paytirsangiz yoki bo&apos;lsangiz, tengsizlik ishorasi teskarisiga o&apos;zgaradi.
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
              Sinab ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* ── CARD 3 (LG: spans 3 cols) - REAL DTM FORMATI ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl md:col-span-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-xs">
                <Timer className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Real muhit
                </span>
                <h3 className="font-voice text-lg sm:text-xl font-bold text-slate-900">
                  Real DTM & Sertifikat formati
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              5 fan, 90 ta savol, 3 soat — haqiqiy imtihon sharoitida mashq qiling: vaqt cheklovi va DTM tartibidagi ball.
            </p>
          </div>

          {/* Live Timer Widget */}
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatTimer(secondsLeft)}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                Savol 37 / 90
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: '41%' }} />
            </div>
          </div>

          <div className="mt-4">
            <Link href="/mock" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
              Test boshlash <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* ── CARD 4 (LG: spans 3 cols) - 1v1 DUEL ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl md:col-span-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 border border-rose-200 shadow-xs">
                <Swords className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Jonli bellashuv
                </span>
                <h3 className="font-voice text-lg sm:text-xl font-bold text-slate-900">
                  Do&apos;stlar bilan bellashing
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              1v1 duel, haftalik turnirlar va umumiy reyting. Raqobat motivatsiya beradi — g&apos;oliblarga maxsus sovrinlar.
            </p>
          </div>

          {/* Live Duel Widget */}
          <div className="mt-5 flex items-center justify-center gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="text-center">
              <span className="font-voice text-3xl font-black text-emerald-600 block">7</span>
              <span className="text-xs font-bold text-slate-700">Siz</span>
            </div>
            <span className="font-voice text-lg font-black text-slate-400">:</span>
            <div className="text-center">
              <span className="font-voice text-3xl font-black text-slate-700 block">5</span>
              <span className="text-xs font-bold text-slate-500">Raqib</span>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-600 group-hover:translate-x-0.5 transition-all">
              Musobaqaga kirish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* ── CARD 5 (LG: spans 3 cols) - RESPUBLIKA REYTINGI ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-emerald-400 hover:shadow-xl md:col-span-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 shadow-xs">
                <Trophy className="size-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Global peshqadamlik
                </span>
                <h3 className="font-voice text-lg sm:text-xl font-bold text-slate-900">
                  O&apos;zbekiston bo&apos;ylab reyting
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Butun mamlakat bo&apos;ylab nechanchi o&apos;rindaligingizni bilib oling. Maktab, tuman va viloyat reytingida ko&apos;rining.
            </p>
          </div>

          {/* Leaderboard Climb Preview */}
          <div className="mt-5 space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
            <div className="flex items-center justify-between p-2 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">11</span>
                <span>Madina R.</span>
              </div>
              <span className="font-mono">176.2 ball</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-emerald-500 text-white p-2.5 font-bold shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono">12</span>
                <span>Siz</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-emerald-100">
                <TrendingUp className="size-3.5" /> +3 o&apos;rin
              </div>
            </div>

            <div className="flex items-center justify-between p-2 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">13</span>
                <span>Sardor K.</span>
              </div>
              <span className="font-mono">172.8 ball</span>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-600 group-hover:translate-x-0.5 transition-all">
              Reytingni ko&apos;rish <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
