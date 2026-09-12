'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Send, CheckCircle2, Award, 
  Sparkles, BookOpen, AlertCircle, RefreshCw, BarChart2
} from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<'cert' | 'question'>('cert');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24 bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Subtle organic background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 size-[500px] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -top-20 right-1/4 size-[450px] rounded-full bg-teal-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Chap ustun: Aniq, insoniy sarlavha va maqsad */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
              <Sparkles className="size-3.5 text-emerald-600" />
              Milliy sertifikat va DTM imtihoniga professional tayyorgarlik
            </div>

            <h1 className="font-voice mt-6 text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Testlarni shunchaki yodlama.{' '}
              <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2 underline-offset-8">
                Ildizidan tushun
              </span>{' '}
              va yuqori ball ol.
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed mx-auto lg:mx-0">
              Rasmiy UzBMB formati, 15 000+ saralangan topshiriqlar va zaif mavzularingizni topuvchi tahlil tizimi. Imtihondagi har bir xato — tasodif emas, o&apos;rganilmagan mavzu ildizidir.
            </p>

            {/* Asosiy harakat tugmalari */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link
                href="/register"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-13 px-8 text-base shadow-[0_8px_20px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Diagnostik testni boshlash <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/mock"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold h-13 px-6 text-base shadow-xs transition-all hover:border-slate-400 hover:-translate-y-0.5"
              >
                Mock testlar katalogi
              </Link>

              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-800 font-medium h-13 px-5 text-sm transition-all"
              >
                <Send className="size-4 text-sky-600" /> Telegram bot
              </a>
            </div>

            {/* Ishonchli dalillar qatori */}
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> Bepul boshlash, karta talab qilinmaydi
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> Rasmiy 100 ballik Rasch modeli
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> Telegram bilan 5 soniyada kirish
              </span>
            </div>

            {/* Raqamlar va natijalar */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-6 text-left">
              <div>
                <strong className="font-voice text-2xl sm:text-3xl font-black text-slate-900 block tracking-tight">15 000+</strong>
                <span className="text-xs text-slate-500 font-medium">Saralangan savollar</span>
              </div>
              <div className="border-l border-slate-200/80 pl-4">
                <strong className="font-voice text-2xl sm:text-3xl font-black text-slate-900 block tracking-tight">A+ dan C</strong>
                <span className="text-xs text-slate-500 font-medium">Sertifikat darajalari</span>
              </div>
              <div className="border-l border-slate-200/80 pl-4">
                <strong className="font-voice text-2xl sm:text-3xl font-black text-emerald-600 block tracking-tight">96%</strong>
                <span className="text-xs text-slate-500 font-medium">Mavzu aniqligi</span>
              </div>
            </div>
          </div>

          {/* O'ng ustun: Haqiqiy mahsulot namunasi (Real Certificate & Diagnosis Report) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              {/* Tab boshqaruvi */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('cert')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      activeTab === 'cert'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sertifikat hisoboti
                  </button>
                  <button
                    onClick={() => setActiveTab('question')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      activeTab === 'question'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Namuna savol
                  </button>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  <Award className="size-3 text-emerald-600" /> Rasmiy format
                </span>
              </div>

              {/* Tab 1: Haqiqiy sertifikat va zaiflik tahlili */}
              {activeTab === 'cert' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Tarix fani · Milliy Sertifikat
                        </span>
                        <h3 className="font-voice text-lg font-bold text-slate-900 mt-0.5">
                          Namunaviy Mock Imtihon #1
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-voice text-2xl font-black text-emerald-700 block leading-none">
                          84.6
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">100 balldan</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-emerald-100/80 text-xs">
                      <span className="font-semibold text-slate-700">UzBMB Rasch darajasi:</span>
                      <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
                        A Daraja (Maksimal DTM imtiyozi)
                      </span>
                    </div>
                  </div>

                  {/* Mavzular kesimida ildiz tahlili */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
                      <span>Mavzular tahlili</span>
                      <span className="text-slate-400 font-normal">Xatolar ildizi</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-700 font-semibold mb-1">
                          <span>Qadimgi Sharq va O&apos;rta Osiyo</span>
                          <span className="font-mono text-emerald-700">92% · Mustahkam</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-700 font-semibold mb-1">
                          <span>Temuriylar davri va saltanati</span>
                          <span className="font-mono text-emerald-700">85% · Yaxshi</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                        <div className="flex justify-between text-rose-900 font-bold mb-1">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="size-3.5 text-rose-600" />
                            Xonliklar davri va mustamlakachilik
                          </span>
                          <span className="font-mono text-rose-700">38% · Zaif ildiz</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-rose-200 overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '38%' }} />
                        </div>
                        <p className="mt-2 text-[11px] text-rose-800 leading-tight">
                          Tavsiya: 8-sinf O&apos;zbekiston tarixi darsligining 14–19 mavzularini takrorlash tavsiya etiladi.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/register"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs sm:text-sm transition-all"
                    >
                      O&apos;z bilimingizni tekshiring <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Tab 2: Haqiqiy savol namunasi */}
              {activeTab === 'question' && (
                <div className="mt-5 space-y-4 text-left">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Tarix · 45 talik Milliy Sertifikat</span>
                    <span className="text-emerald-700 font-bold font-mono">1.8 ball</span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 leading-relaxed">
                    Miloddan avvalgi VI asr oxirida Doro I ning O&apos;rta Osiyoga yurishi paytida skif (sak) qabilalariga boshchilik qilgan qahramon cho&apos;pon kim edi?
                  </p>

                  <div className="space-y-2">
                    {[
                      { id: 'A', text: "Spitamen", isCorrect: false },
                      { id: 'B', text: "Shiroq", isCorrect: true },
                      { id: 'C', text: "Frada", isCorrect: false },
                      { id: 'D', text: "To'maris", isCorrect: false },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedOption(opt.id)}
                        className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                          selectedOption === opt.id
                            ? opt.isCorrect
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500'
                              : 'border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-400'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`flex size-6 items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                            selectedOption === opt.id && opt.isCorrect
                              ? 'bg-emerald-600 text-white'
                              : selectedOption === opt.id && !opt.isCorrect
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {selectedOption === opt.id && opt.isCorrect && (
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedOption && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      {selectedOption === 'B' ? (
                        <p className="text-emerald-800 font-medium">
                          ✓ To&apos;g&apos;ri! Shiroq o&apos;z tanasini tilkalab, Doro I qo&apos;shinini aldab qizg&apos;in cho&apos;lga olib kirgan va o&apos;z vatanini qutqargan.
                        </p>
                      ) : (
                        <p className="text-rose-800 font-medium">
                          ✗ Noto&apos;g&apos;ri. To&apos;g&apos;ri javob — Shiroq. Spitamen esa makedoniyalik Iskandarga qarshi kurashgan so&apos;g&apos;d qahramoni bo&apos;lgan.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
