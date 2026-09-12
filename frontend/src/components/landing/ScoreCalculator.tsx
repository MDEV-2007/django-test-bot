'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, CheckCircle2, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';

interface UniversityMatch {
  uni: string;
  major: string;
  grantBall: number;
  kontraktBall: number;
  faculty: string;
}

const SAMPLE_DATABASE: Record<string, UniversityMatch[]> = {
  'tarix,ona-tili': [
    { uni: "O'zbekiston Milliy Universiteti (O'zMU)", major: "Tarix (mamlakatlar va yo'nalishlar bo'yicha)", grantBall: 158.4, kontraktBall: 112.5, faculty: "Tarix fakulteti" },
    { uni: "Toshkent Davlat Sharqshunoslik Universiteti", major: "Sharq mamlakatlari tarixi va falsafasi", grantBall: 164.2, kontraktBall: 120.0, faculty: "Sharq sivilizatsiyasi" },
    { uni: "Toshkent Davlat Yuridik Universiteti (TDYU)", major: "Yurisprudensiya (Davlat huquqi)", grantBall: 176.8, kontraktBall: 135.2, faculty: "Ommaviy huquq" },
  ],
  'matematika,fizika': [
    { uni: "Toshkent Axborot Texnologiyalari Universiteti (TATU)", major: "Dasturiy injiniring", grantBall: 162.5, kontraktBall: 118.0, faculty: "Kompyuter injiniringi" },
    { uni: "Toshkent Davlat Texnika Universiteti (TDTU)", major: "Elektronika va asbobsozlik", grantBall: 142.0, kontraktBall: 105.0, faculty: "Muhandislik" },
    { uni: "O'zbekiston Milliy Universiteti (O'zMU)", major: "Amaliy matematika va informatika", grantBall: 155.0, kontraktBall: 110.5, faculty: "Matematika" },
  ],
  'biologiya,kimyo': [
    { uni: "Toshkent Tibbiyot Akademiyasi (TMA)", major: "Davolash ishi", grantBall: 174.5, kontraktBall: 130.0, faculty: "Tibbiyot" },
    { uni: "Toshkent Farmatsevtika Instituti", major: "Farmatsiya", grantBall: 156.0, kontraktBall: 115.0, faculty: "Farmatsevtika" },
    { uni: "O'zbekiston Milliy Universiteti (O'zMU)", major: "Biologiya (fan yo'nalishi)", grantBall: 148.0, kontraktBall: 108.0, faculty: "Biologiya" },
  ],
  'ona-tili,english': [
    { uni: "O'zbekiston Davlat Jahon Tillari Universiteti (O'zDJTU)", major: "Filologiya va tillarni o'qitish (Ingliz tili)", grantBall: 168.0, kontraktBall: 125.0, faculty: "Ingliz tili fakulteti" },
    { uni: "O'zbekiston Milliy Universiteti (O'zMU)", major: "O'zbek filologiyasi", grantBall: 152.0, kontraktBall: 110.0, faculty: "O'zbek filologiyasi" },
    { uni: "Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)", major: "Xalqaro munosabatlar", grantBall: 182.4, kontraktBall: 145.0, faculty: "Xalqaro huquq" },
  ],
};

export default function ScoreCalculator() {
  const [ballInput, setBallInput] = useState('164.5');
  const [selectedBlock, setSelectedBlock] = useState('tarix,ona-tili');

  const ballNum = parseFloat(ballInput.replace(',', '.')) || 0;
  const currentMatches = SAMPLE_DATABASE[selectedBlock] || SAMPLE_DATABASE['tarix,ona-tili'];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-12 shadow-xl">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-80 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-80 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Sparkles className="size-3.5 text-emerald-600" />
            OTM Ball Bashorati
          </span>
          <h2 className="font-voice mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Ballingiz qaysi universitetga yetadi?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            O&apos;tgan yilgi rasmiy o&apos;tish ballari bo&apos;yicha hisoblaymiz. Ro&apos;yxatdan o&apos;tish shart emas.
          </p>
        </div>

        {/* Input Form Controls */}
        <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-12 items-end">
          <div className="sm:col-span-4">
            <label htmlFor="scoreInput" className="block text-xs font-bold text-slate-700 mb-1.5">
              DTM / Mock ballingiz (0 — 189)
            </label>
            <input
              id="scoreInput"
              type="text"
              inputMode="decimal"
              value={ballInput}
              onChange={(e) => setBallInput(e.target.value)}
              placeholder="154.5"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-lg font-black text-slate-900 shadow-xs transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-emerald-100"
            />
          </div>

          <div className="sm:col-span-5">
            <label htmlFor="blockSelect" className="block text-xs font-bold text-slate-700 mb-1.5">
              Fanlar bloki
            </label>
            <select
              id="blockSelect"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xs transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-emerald-100"
            >
              <option value="tarix,ona-tili">Tarix + Ona tili</option>
              <option value="matematika,fizika">Matematika + Fizika</option>
              <option value="biologiya,kimyo">Biologiya + Kimyo</option>
              <option value="ona-tili,english">Ona tili + Ingliz tili</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <Link
              href="/register"
              className="lp-btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-5 text-sm shadow-md transition-all active:scale-[0.98]"
            >
              To&apos;liq tahlil <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Live Matching Results */}
        <div className="relative z-10 mt-10 border-t border-slate-200/80 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <GraduationCap className="size-5" />
              </span>
              <h3 className="font-voice text-lg font-bold text-slate-900">
                Mos keluvchi asosiy yo&apos;nalishlar
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-600" /> Davlat Granti
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-sky-700">
                <span className="size-2 rounded-full bg-sky-600" /> To&apos;lov-Kontrakt
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {currentMatches.map((m, idx) => {
              const isGrant = ballNum >= m.grantBall;
              const isKontrakt = ballNum >= m.kontraktBall && !isGrant;

              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 transition-all hover:bg-white hover:shadow-lg hover:border-emerald-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {m.faculty}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        isGrant 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : isKontrakt
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isGrant ? "Grant" : isKontrakt ? "Kontrakt" : "Harakat qiling"}
                      </span>
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                      {m.major}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      {m.uni}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Grant</span>
                      <span className="font-bold text-emerald-700">{m.grantBall}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kontrakt</span>
                      <span className="font-bold text-sky-700">{m.kontraktBall}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Farq</span>
                      <span className={`font-bold ${ballNum >= m.grantBall ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {ballNum >= m.grantBall ? `+${(ballNum - m.grantBall).toFixed(1)}` : `${(ballNum - m.grantBall).toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-slate-400 text-center">
            Hisob-kitob o&apos;tgan yilgi rasmiy qabul ballariga asoslanadi — bu kafolat emas, balki real mo&apos;ljal.
          </p>
        </div>
      </div>
    </section>
  );
}
