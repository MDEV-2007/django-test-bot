'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Send, CheckCircle2, Clock, 
  Sparkles, Layers, Award, Bot, RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

const ROTATING_WORDS = [
  { text: "DTMga", sub: "90 savol, 3 soat", badge: "5 fan, DTM tartibida" },
  { text: "Milliy Sertifikatga", sub: "A+ dan C gacha", badge: "Rasch modeli (IRT)" },
  { text: "Tarixga", sub: "Xronologiya & xaritalar", badge: "1,500+ mock savol" },
  { text: "Ona tiliga", sub: "Grammatika & matn", badge: "Yangi imtihon formati" },
];

const SAMPLE_QUESTION = {
  subject: "Tarix · Milliy Sertifikat",
  time: "00:45",
  text: "Amir Temur markazlashgan davlat tuzish jarayonida qaysi shaharni poytaxt etib belgilagan va bu voqea qaysi yili yuz bergan?",
  options: [
    { id: 'A', text: "Buxoro — 1365-yil", isCorrect: false },
    { id: 'B', text: "Samarqand — 1370-yil", isCorrect: true },
    { id: 'C', text: "Kesh (Shahrisabz) — 1380-yil", isCorrect: false },
    { id: 'D', text: "Hirot — 1405-yil", isCorrect: false },
  ],
  explanation: {
    correct: "Barakalla! 1370-yilda Balx qurultoyida Amir Temur Movarounnahrning yagona hukmdori deb e'lon qilindi va Samarqand poytaxt etildi.",
    incorrect: "E'tibor bering: To'g'ri javob — Samarqand (1370-yil). Buxoro keyinroq Shayboniylar davrida poytaxt bo'lgan. Zaif nuqta aniqlandi!",
  }
};

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const litGridRef = useRef<HTMLDivElement>(null);

  // Rotate headline words smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Spotlight lit grid follow mouse
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!heroRef.current || !litGridRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    heroRef.current.classList.add('is-lit');
    litGridRef.current.style.setProperty('--mx', `${mx}px`);
    litGridRef.current.style.setProperty('--my', `${my}px`);
  };

  const handlePointerLeave = () => {
    if (heroRef.current) {
      heroRef.current.classList.remove('is-lit');
    }
  };

  const handleSelectOption = (id: string, isCorrect: boolean) => {
    if (hasAnswered) return;
    setSelectedOpt(id);
    setHasAnswered(true);

    if (isCorrect) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#059669', '#10b981', '#34d399', '#f59e0b'],
        });
      } catch {
        // no-op
      }
    }
  };

  const handleReset = () => {
    setSelectedOpt(null);
    setHasAnswered(false);
  };

  const activeWord = ROTATING_WORDS[wordIndex];
  const isSelectedCorrect = selectedOpt === 'B';

  return (
    <section 
      ref={heroRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="lp-hero relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24"
    >
      {/* Aurora glowing floating blobs */}
      <div className="lp-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      {/* Grid patterns */}
      <div className="lp-grid" aria-hidden="true" />
      <div ref={litGridRef} className="lp-grid lp-grid--lit" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Chap ustun: Display typography va Call to actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
              <span className="flex size-2 rounded-full bg-emerald-600 animate-pulse" />
              <Sparkles className="size-3.5 text-emerald-600" />
              Milliy sertifikat va DTM onlayn platformasi
            </div>

            {/* Display H1 */}
            <h1 className="font-voice mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.08]">
              <span className="block">
                <span className="inline-block min-w-[200px] text-emerald-600 transition-all duration-300">
                  {activeWord.text}
                </span>
              </span>
              <span className="block text-slate-900">
                tizimli tayyorgarlik va
              </span>
              <span className="block mt-1">
                <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy decoration-2 underline-offset-8">
                  zaif mavzular
                </span>{' '}
                <span className="text-slate-900">tahlili</span>
              </span>
            </h1>

            {/* Subtitle / Lead */}
            <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed mx-auto lg:mx-0">
              Shaxsiy AI mentor zaif mavzularingizni topadi, xatolaringizni tahlil qiladi va kunlik mashq rejasini tuzadi. Natija taxminda emas, imtihondagi ballda ko&apos;rinadi.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link
                href="/register"
                className="lp-btn-primary inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-13 px-8 text-base shadow-[0_8px_24px_rgba(5,150,105,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Bepul boshlash <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/mock"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-300/90 bg-white/90 hover:bg-slate-50 text-slate-800 font-semibold h-13 px-6 text-base shadow-xs backdrop-blur-sm transition-all hover:border-slate-400 hover:-translate-y-0.5"
              >
                Testlarni ko&apos;rish
              </Link>

              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50/70 hover:bg-sky-100/80 text-sky-800 font-medium h-13 px-5 text-sm transition-all"
              >
                <Send className="size-4 text-sky-600" /> Telegram bot
              </a>
            </div>

            {/* Facts bar */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-8 text-left border-t border-slate-200/80 pt-6">
              <div>
                <strong className="font-voice text-2xl font-black text-slate-900 block tracking-tight">15 000+</strong>
                <span className="text-xs text-slate-500 font-medium">savol bazada</span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div>
                <strong className="font-voice text-2xl font-black text-slate-900 block tracking-tight">90 / 3 soat</strong>
                <span className="text-xs text-slate-500 font-medium">savol va vaqt formati</span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div>
                <strong className="font-voice text-2xl font-black text-emerald-600 block tracking-tight">0 so&apos;m</strong>
                <span className="text-xs text-slate-500 font-medium">boshlash uchun</span>
              </div>
            </div>
          </div>

          {/* O'ng ustun: Interaktiv 3D Stage va Mock Test Simulyatsiyasi */}
          <div className="lg:col-span-5 relative">
            {/* Glowing stage disc */}
            <div 
              className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-emerald-300/20 blur-2xl pointer-events-none" 
              style={{ animation: 'lp-breathe 6s ease-in-out infinite' }}
            />

            {/* Stage floating tags */}
            <div className="absolute -top-4 -left-3 sm:-left-6 z-20 hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md animate-bounce" style={{ animationDuration: '4s' }}>
              <Clock className="size-3.5 text-emerald-600" />
              <span>90 savol, 3 soat</span>
            </div>

            <div className="absolute -bottom-4 -right-2 sm:-right-4 z-20 hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md">
              <Award className="size-3.5 text-amber-500" />
              <span>Rasch modeli (IRT) A+</span>
            </div>

            {/* Interactive Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-rose-500" />
                  <span className="flex size-2 rounded-full bg-amber-500" />
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                  <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {SAMPLE_QUESTION.subject}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  <Clock className="size-3" /> {SAMPLE_QUESTION.time}
                </div>
              </div>

              {/* Question content */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Savol #1 · Mock Sinovi</span>
                  <span className="text-emerald-600 font-bold">+1.5 ball</span>
                </div>
                <p className="mt-2 text-sm sm:text-base font-bold leading-relaxed text-slate-900">
                  {SAMPLE_QUESTION.text}
                </p>
              </div>

              {/* Options */}
              <div className="mt-5 space-y-2.5">
                {SAMPLE_QUESTION.options.map((opt) => {
                  const isSelected = selectedOpt === opt.id;
                  let optStyle = "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/80 text-slate-800";

                  if (hasAnswered) {
                    if (opt.isCorrect) {
                      optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500";
                    } else if (isSelected && !opt.isCorrect) {
                      optStyle = "border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-400";
                    } else {
                      optStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id, opt.isCorrect)}
                      disabled={hasAnswered}
                      className={`w-full flex items-center justify-between rounded-xl border p-3 text-left text-xs sm:text-sm font-medium transition-all ${optStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                          hasAnswered && opt.isCorrect
                            ? 'bg-emerald-600 text-white'
                            : hasAnswered && isSelected && !opt.isCorrect
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {hasAnswered && opt.isCorrect && (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* AI Explanation feedback banner */}
              {hasAnswered && (
                <div className={`mt-4 rounded-xl p-3.5 text-xs transition-all ${
                  isSelectedCorrect 
                    ? 'border border-emerald-200 bg-emerald-50/90 text-emerald-900' 
                    : 'border border-rose-200 bg-rose-50/90 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Bot className="size-3.5 text-emerald-700" />
                      AI Mentor tahlili
                    </span>
                    <button 
                      onClick={handleReset}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      <RotateCcw className="size-3" /> Qayta urinish
                    </button>
                  </div>
                  <p className="leading-relaxed">
                    {isSelectedCorrect 
                      ? SAMPLE_QUESTION.explanation.correct 
                      : SAMPLE_QUESTION.explanation.incorrect}
                  </p>
                </div>
              )}

              {/* Bottom live stats pill */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Karta kiritish shart emas
                </span>
                <span className="font-semibold text-emerald-700">
                  Telegram orqali 1-bosishda
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
