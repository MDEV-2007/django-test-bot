'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2, AlertCircle, MapPin, Bot, BookOpen,
  RotateCcw, TrendingUp, CheckCircle2, ArrowRight,
  Sparkles, ChevronRight, BookMarked
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const WORKFLOW_STEPS = [
  {
    step: '01',
    id: 'test',
    title: 'Mock Test topshirish',
    tag: 'Imtihon muhiti',
    desc: 'BMB va Milliy sertifikat rasmiy formati, standart taymer va haqiqiy imtihon qiyinlik darajasidagi testlar.',
    icon: FileCheck2,
    accent: 'emerald',
    preview: {
      header: '1-Asosiy Fan · O\'zbekiston Tarixi',
      badge: '30 ta savol · 60 daqiqa',
      detailTitle: 'Rasmiy DTM standarti',
      detailSub: 'Haqiqiy imtihonda tushadigan formatdagi yopiq va moslashtirish savollari.',
      chip: 'Imtihon rejimi faol',
    },
  },
  {
    step: '02',
    id: 'mistake',
    title: 'Xatoni aniqlash',
    tag: 'Tezkor natija',
    desc: 'Test yakunlanishi bilan har bir javob tahlil qilinadi: qayerda to\'g\'ri, qayerda adashganingiz soniyalarda ko\'rinadi.',
    icon: AlertCircle,
    accent: 'rose',
    preview: {
      header: '14-savol natijasi',
      badge: 'Xato javob berildi',
      detailTitle: 'Belgilangan: B) 1365-yil · To\'g\'ri: A) 1370-yil',
      detailSub: 'Loy jangi va Balx qurultoyi sanalari o\'rtasida chalg\'ish aniqlandi.',
      chip: 'Xatolik qayd etildi',
    },
  },
  {
    step: '03',
    id: 'weakness',
    title: 'Zaif mavzuni topish',
    tag: 'Diagnostika',
    desc: 'Sun\'iy intellekt shunchaki ball chiqarmaydi — aynan qaysi mavzu, davr yoki qoidada bo\'shliq borligini xaritalashtiradi.',
    icon: MapPin,
    accent: 'amber',
    preview: {
      header: 'Zaif mavzular xaritasi',
      badge: 'O\'zlashtirish: 54%',
      detailTitle: 'Bo\'shliq: XIV asr ikkinchi yarmi Movarounnahr',
      detailSub: 'Mavzu bo\'yicha 3 ta savoldan 2 tasida noaniqlik mavjud.',
      chip: 'Diqqat qaratish kerak',
    },
  },
  {
    step: '04',
    id: 'ai-citation',
    title: 'AI Mentor & Darslik iqtibosi',
    tag: 'Noyob imkoniyat',
    desc: 'AI Mentor savol xatosini tushuntiradi va rasmiy maktab darsligining aynan qaysi kitob, bob va betida yozilganini ko\'rsatadi.',
    icon: BookMarked,
    accent: 'sky',
    preview: {
      header: 'AI Mentor tushuntirishi',
      badge: 'Darslikka havola',
      detailTitle: '7-sinf O\'zbekiston tarixi, 84-bet (3-paragraf)',
      detailSub: '"Amir Temur 1370-yilda Movarounnahr oliy hukmdori deb e\'lon qilindi va Samarqand poytaxt etib belgilandi."',
      chip: 'Darslikdan tasdiqlangan',
    },
  },
  {
    step: '05',
    id: 'drill',
    title: 'Targetlangan qayta mashq',
    tag: 'Mustahkamlash',
    desc: 'Butun fanni qaytadan emas — faqat xato qilingan zaif mavzu bo\'yicha adaptiv mini-mashqlar beriladi.',
    icon: RotateCcw,
    accent: 'purple',
    preview: {
      header: 'Kuchsiz mavzuni mustahkamlash',
      badge: '3 ta maqsadli savol',
      detailTitle: 'Mavzu: Temuriylar davri sanalari',
      detailSub: 'To\'g\'ri javob berilgandan so\'ng tizim bo\'shliq yopilganini tasdiqlaydi.',
      chip: 'Qayta tekshiruv',
    },
  },
  {
    step: '06',
    id: 'progress',
    title: 'Haqiqiy Progress & Sertifikat',
    tag: 'Natija',
    desc: 'Bo\'shliqlar yopilgan sari kutilayotgan DTM ballingiz oshadi, streak olovlanadi va rasmiy sertifikatga ega bo\'lasiz.',
    icon: TrendingUp,
    accent: 'emerald',
    preview: {
      header: 'Imtihonga tayyorgarlik darajasi',
      badge: 'A+ Daraja (184+ ball)',
      detailTitle: 'Mavzu o\'zlashtirildi: 96%',
      detailSub: 'O\'rganilgan bilim ildizi mustahkamlandi — imtihonda adashish ehtimoli minimal.',
      chip: 'Tayyorlik tasdiqlandi',
    },
  },
];

export default function ProductWorkflow() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeStep = WORKFLOW_STEPS[activeIdx];

  return (
    <section id="qanday" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Natija Beruvchi Tizim
        </div>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          IlmIldizi qanday qilib{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
            xatoni ildizidan
          </span>{' '}
          yo&apos;qotadi?
        </h2>
        <p className="mt-4 text-sm text-slate-600 sm:text-base leading-relaxed">
          Oddiy test botlarida siz faqat to&apos;g&apos;ri yoki xato javobni ko&apos;rasiz. IlmIldizida esa har bir xato — darslik betigacha tahlil qilinib, to&apos;liq o&apos;zlashtirilmaguncha mustahkamlanadi.
        </p>
      </div>

      {/* Interactive Workflow Tabs Bar */}
      <div className="mt-12 flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = idx === activeIdx;
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer border',
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-md font-mono text-[10px] font-black',
                  isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                )}
              >
                {step.step}
              </span>
              <Icon className={cn('size-3.5', isActive ? 'text-emerald-400' : 'text-slate-400')} />
              <span>{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage Display */}
      <div className="mt-6 rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 p-6 sm:p-10 shadow-[0_4px_25px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
          
          {/* Left Column: Stage Explanation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                Bosqich {activeStep.step} / 06
              </span>
              <Badge variant="outline" className="text-[11px] font-semibold text-slate-600 border-slate-200 bg-white">
                {activeStep.tag}
              </Badge>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {activeStep.title}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              {activeStep.desc}
            </p>

            {/* Workflow steps visual pipeline */}
            <div className="pt-4 border-t border-slate-200/60">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ushbu bosqichdagi asosiy vazifa:
              </p>
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{activeStep.preview.detailSub}</span>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <Button asChild className="rounded-xl font-bold text-xs h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                <Link href="/register">
                  O&apos;zingizda sinab ko&apos;ring <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <span className="text-xs text-slate-500">Karta talab etilmaydi</span>
            </div>
          </div>

          {/* Right Column: Live Product Preview Mockup */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl space-y-4">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-400 ml-2">
                    ilmildizi.uz/{activeStep.id}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  {activeStep.preview.chip}
                </Badge>
              </div>

              {/* Mockup Card Body */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">{activeStep.preview.header}</p>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {activeStep.preview.badge}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 space-y-1.5">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    {activeStep.preview.detailTitle}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeStep.preview.detailSub}
                  </p>
                </div>

                {/* Micro-interactive workflow indicator */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Sikldagi o&apos;rni:</span>
                  <div className="flex items-center gap-1">
                    {WORKFLOW_STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all cursor-pointer',
                          i === activeIdx ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                        )}
                        aria-label={`Bosqich ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 6-Stage Grid Quick Summary for Mobile / Fast Reading */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {WORKFLOW_STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isCurrent = idx === activeIdx;
          return (
            <button
              key={s.id}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                isCurrent
                  ? 'border-emerald-500/60 bg-emerald-50/40 shadow-xs'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-mono text-[10px] font-black text-slate-400">
                  {s.step}
                </span>
                <Icon className={cn('size-3.5', isCurrent ? 'text-emerald-600' : 'text-slate-400')} />
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {s.title}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
