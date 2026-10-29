'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileCheck2, AlertCircle, MapPin,
  RotateCcw, TrendingUp, CheckCircle2, ArrowRight,
  Sparkles, BookMarked
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKFLOW_STEPS = [
  {
    step: '01',
    id: 'test',
    title: 'Mock Test topshirish',
    tag: 'Imtihon muhiti',
    desc: 'BMB va Milliy sertifikat rasmiy formati, standart taymer va haqiqiy imtihon qiyinlik darajasidagi testlar.',
    icon: FileCheck2,
    squircle: 'from-[#007AFF] to-[#0062CC]',
    preview: {
      header: "1-Asosiy Fan · O'zbekiston Tarixi",
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
    desc: "Test yakunlanishi bilan har bir javob tahlil qilinadi: qayerda to'g'ri, qayerda adashganingiz soniyalarda ko'rinadi.",
    icon: AlertCircle,
    squircle: 'from-[#FF3B30] to-[#D70015]',
    preview: {
      header: '14-savol natijasi',
      badge: 'Xato javob berildi',
      detailTitle: "Belgilangan: B) 1365-yil · To'g'ri: A) 1370-yil",
      detailSub: "Loy jangi va Balx qurultoyi sanalari o'rtasida chalg'ish aniqlandi.",
      chip: 'Xatolik qayd etildi',
    },
  },
  {
    step: '03',
    id: 'weakness',
    title: 'Zaif mavzuni topish',
    tag: 'Diagnostika',
    desc: "Sun'iy intellekt shunchaki ball chiqarmaydi — aynan qaysi mavzu, davr yoki qoidada bo'shliq borligini xaritalashtiradi.",
    icon: MapPin,
    squircle: 'from-[#FF9500] to-[#E08600]',
    preview: {
      header: 'Zaif mavzular xaritasi',
      badge: "O'zlashtirish: 54%",
      detailTitle: "Bo'shliq: XIV asr ikkinchi yarmi Movarounnahr",
      detailSub: "Mavzu bo'yicha 3 ta savoldan 2 tasida noaniqlik mavjud.",
      chip: 'Diqqat qaratish kerak',
    },
  },
  {
    step: '04',
    id: 'ai-citation',
    title: 'AI Mentor & Darslik',
    tag: 'Noyob imkoniyat',
    desc: "AI Mentor savol xatosini tushuntiradi va rasmiy maktab darsligining aynan qaysi kitob, bob va betida yozilganini ko'rsatadi.",
    icon: BookMarked,
    squircle: 'from-[#5856D6] to-[#4644B5]',
    preview: {
      header: 'AI Mentor tushuntirishi',
      badge: 'Darslikka havola',
      detailTitle: "7-sinf O'zbekiston tarixi, 84-bet (3-paragraf)",
      detailSub: '"Amir Temur 1370-yilda Movarounnahr oliy hukmdori deb e\'lon qilindi va Samarqand poytaxt etib belgilandi."',
      chip: 'Darslikdan tasdiqlangan',
    },
  },
  {
    step: '05',
    id: 'drill',
    title: 'Targetlangan mashq',
    tag: 'Mustahkamlash',
    desc: "Butun fanni qaytadan emas — faqat xato qilingan zaif mavzu bo'yicha adaptiv mini-mashqlar beriladi.",
    icon: RotateCcw,
    squircle: 'from-[#AF52DE] to-[#8E3CBE]',
    preview: {
      header: 'Kuchsiz mavzuni mustahkamlash',
      badge: '3 ta maqsadli savol',
      detailTitle: 'Mavzu: Temuriylar davri sanalari',
      detailSub: "To'g'ri javob berilgandan so'ng tizim bo'shliq yopilganini tasdiqlaydi.",
      chip: 'Qayta tekshiruv',
    },
  },
  {
    step: '06',
    id: 'progress',
    title: 'Progress & Sertifikat',
    tag: 'Natija',
    desc: "Bo'shliqlar yopilgan sari kutilayotgan DTM ballingiz oshadi, streak olovlanadi va rasmiy sertifikatga ega bo'lasiz.",
    icon: TrendingUp,
    squircle: 'from-[#34C759] to-[#28A745]',
    preview: {
      header: 'Imtihonga tayyorgarlik darajasi',
      badge: 'A+ Daraja (184+ ball)',
      detailTitle: "Mavzu o'zlashtirildi: 96%",
      detailSub: "O'rganilgan bilim ildizi mustahkamlandi — imtihonda adashish ehtimoli minimal.",
      chip: 'Tayyorlik tasdiqlandi',
    },
  },
];

export default function ProductWorkflow() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    const el = tabRefs.current[activeIdx];
    const container = tabsContainerRef.current;
    if (el && container) {
      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeIdx]);

  const activeStep = WORKFLOW_STEPS[activeIdx];

  return (
    <section id="qanday" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#007AFF]">
          Natija Beruvchi Tizim
        </div>
        <h2 className="mt-2.5 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl md:text-5xl">
          IlmIldizi qanday qilib{' '}
          <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#34C759] bg-clip-text text-transparent">
            xatoni ildizidan
          </span>{' '}
          yo&apos;qotadi?
        </h2>
        <p className="mt-4 text-sm text-[#6C6C70] sm:text-base leading-relaxed">
          Oddiy test botlarida siz faqat to&apos;g&apos;ri yoki xato javobni ko&apos;rasiz. IlmIldizida esa har bir xato — darslik betigacha tahlil qilinib, to&apos;liq o&apos;zlashtirilmaguncha mustahkamlanadi.
        </p>
      </div>

      {/* iOS Segmented Control Workflow Tabs */}
      <div
        ref={tabsContainerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="mt-10 flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-3 pt-1 scroll-smooth scroll-row"
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = idx === activeIdx;
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'ios-spring relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold shrink-0 cursor-pointer border overflow-hidden',
                isActive
                  ? 'bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-[0_6px_18px_rgba(0,0,0,0.14)]'
                  : 'bg-white text-[#3A3A3C] border-black/[0.07] hover:bg-white/90 hover:text-[#1C1C1E]'
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full font-mono text-[10px] font-bold',
                  isActive ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] text-[#6C6C70]'
                )}
              >
                {step.step}
              </span>
              <Icon className={cn('size-3.5', isActive ? 'text-[#64D2FF]' : 'text-[#8E8E93]')} />
              <span>{step.title}</span>

              {isActive && !isHovered && (
                <span
                  key={`progress-${activeIdx}`}
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#007AFF] animate-step-progress"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main iPadOS Stage Window */}
      <div className="mt-5 rounded-[34px] border border-black/[0.07] bg-white p-6 sm:p-10 shadow-[0_8px_36px_-6px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
          
          {/* Left: Explanation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-full">
                Bosqich {activeStep.step} / 06
              </span>
              <span className="text-[11px] font-semibold text-[#6C6C70] bg-[#F2F2F7] px-3 py-1 rounded-full">
                {activeStep.tag}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1E] tracking-[-0.02em]">
              {activeStep.title}
            </h3>

            <p className="text-sm sm:text-base text-[#6C6C70] leading-relaxed font-normal">
              {activeStep.desc}
            </p>

            <div className="pt-4 border-t border-black/[0.06]">
              <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                Ushbu bosqichdagi asosiy vazifa:
              </p>
              <div className="flex items-start gap-2.5 text-xs text-[#3A3A3C]">
                <CheckCircle2 className="size-4 text-[#34C759] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{activeStep.preview.detailSub}</span>
              </div>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <Link
                href="/register"
                className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,122,255,0.3)]"
              >
                <span>O&apos;zingizda sinab ko&apos;ring</span>
                <ArrowRight className="size-4" />
              </Link>
              <span className="text-xs text-[#8E8E93]">Karta talab etilmaydi</span>
            </div>
          </div>

          {/* Right: macOS / iPadOS Window Preview */}
          <div className="lg:col-span-6">
            <div className="relative rounded-[26px] border border-black/[0.08] bg-[#F2F2F7] p-5 sm:p-6 shadow-inner space-y-4">
              {/* macOS Window Traffic Lights */}
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-3 rounded-full bg-[#FF5F57] border border-black/10" />
                    <span className="size-3 rounded-full bg-[#FEBC2E] border border-black/10" />
                    <span className="size-3 rounded-full bg-[#28C840] border border-black/10" />
                  </div>
                  <span className="text-xs font-mono font-medium text-[#8E8E93] ml-2">
                    ilmildizi.uz/{activeStep.id}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#1C1C1E] shadow-2xs">
                  {activeStep.preview.chip}
                </span>
              </div>

              {/* Inner White iOS Card */}
              <div className="rounded-[20px] bg-white p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#1C1C1E]">{activeStep.preview.header}</p>
                  <span className="text-[11px] font-mono font-bold text-[#248A3D] bg-[#34C759]/12 px-2.5 py-0.5 rounded-full">
                    {activeStep.preview.badge}
                  </span>
                </div>

                <div className="p-3.5 rounded-[16px] bg-[#F2F2F7] space-y-1.5">
                  <p className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#FF9500]" />
                    {activeStep.preview.detailTitle}
                  </p>
                  <p className="text-xs text-[#6C6C70] leading-relaxed">
                    {activeStep.preview.detailSub}
                  </p>
                </div>

                {/* Page Control Dots */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-[#8E8E93]">
                  <span>Sikldagi o&apos;rni:</span>
                  <div className="flex items-center gap-1.5">
                    {WORKFLOW_STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all cursor-pointer',
                          i === activeIdx ? 'w-6 bg-[#007AFF]' : 'w-2 bg-black/15 hover:bg-black/25'
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
    </section>
  );
}
