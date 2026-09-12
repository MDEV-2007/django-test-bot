'use client';

import { CheckCircle2, Target, GitCommit, Sparkles, BookCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    step: '01',
    title: 'Zaif mavzularni aniqlash',
    desc: '15 daqiqalik diagnostik test yoki to\'liq mock imtihon yechasiz. Tizim qaysi davr, qoida yoki mavzuda xato qilganingizni ajratib beradi.',
    visual: {
      type: 'bar',
      label: 'Aniqlangan zaif mavzular:',
      items: [
        { name: 'Xonliklar davri diplomatiyasi', score: '38%', weak: true },
        { name: 'Temuriylar madaniyati', score: '82%', weak: false },
        { name: 'Jadid matbuoti va nashrlari', score: '44%', weak: true },
      ],
    },
  },
  {
    step: '02',
    title: 'Ildiziga qaratilgan shaxsiy mashq',
    desc: 'Butun darslikni qaytadan o\'qib vaqt yo\'qotmaysiz. Tizim sizga aynan xato qilgan mavzularingiz bo\'yicha tushuntirish va maqsadli mashqlar to\'plamini beradi.',
    visual: {
      type: 'task',
      label: 'Shaxsiy kunlik vazifa:',
      items: [
        '8-sinf O\'zbekiston tarixi: 14–19-mavzular nazariyasi',
        'Xonliklar davri bo\'yicha 15 ta maqsadli test',
        'Jadidlar faoliyatiga oid xronologiya jadvali',
      ],
    },
  },
  {
    step: '03',
    title: 'Haqiqiy sinov va kafolatlangan o\'sish',
    desc: 'Takrorlashdan so\'ng rasmiy formatdagi to\'liq mock imtihonni qayta topshirasiz va o\'zlashtirish ko\'rsatkichingiz A darajaga yetganiga ishonch hosil qilasiz.',
    visual: {
      type: 'result',
      label: 'Natija o\'zgarishi:',
      before: '62.4 ball (Daraja: B)',
      after: '86.8 ball (Daraja: A+)',
      status: 'Maksimal imtiyozga ega bo\'lindi',
    },
  },
];

export default function DiagnosisMethodSection() {
  return (
    <section className="border-y border-slate-200/90 bg-slate-50/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Sarlavha */}
        <div className="max-w-2xl text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <Target className="size-3.5" />
            Ildiz Tamoyili
          </span>
          <h2 className="font-voice mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Nega shunchaki test yechish yetarli emas?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Ko&apos;p abituriyentlar minglab test yechadi, lekin nimada adashganini tahlil qilmaydi. Biz o&apos;quvchining xatosini topib, uni mustahkamlashgacha bo&apos;lgan 3 bosqichli tizimni qurdik.
          </p>
        </div>

        {/* 3 ta bosqich kartalari */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              <div>
                <span className="font-mono text-3xl font-black text-emerald-600 block">
                  {s.step}
                </span>
                <h3 className="font-voice mt-3 text-xl font-bold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              {/* Vizual namuna qutisi */}
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  {s.visual.label}
                </span>

                {s.visual.type === 'bar' && (
                  <div className="space-y-2">
                    {s.visual.items.map((item: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between font-semibold text-slate-800 mb-1">
                          <span className="truncate pr-2">{item.name}</span>
                          <span className={item.weak ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                            {item.score}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.weak ? 'bg-rose-500' : 'bg-emerald-600'}`}
                            style={{ width: item.score }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {s.visual.type === 'task' && (
                  <ul className="space-y-2 font-medium text-slate-700">
                    {s.visual.items.map((item: any, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.visual.type === 'result' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Boshlang&apos;ich:</span>
                      <span className="font-mono font-bold line-through">{s.visual.before}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-800 font-bold">
                      <span>Takrorlashdan so&apos;ng:</span>
                      <span className="font-mono text-sm text-emerald-600">{s.visual.after}</span>
                    </div>
                    <div className="mt-2 text-center rounded-lg bg-emerald-100/70 py-1 text-[11px] font-bold text-emerald-800">
                      ✓ {s.visual.status}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
