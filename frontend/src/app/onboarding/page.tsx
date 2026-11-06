'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, Sprout, Swords, Target, Sparkles, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { apiFetch } from '@/lib/api-client';
import { BrandMark } from '@/components/BrandMark';
import type { SprintSubject } from '@/types/sprint';
import { cn } from '@/lib/utils';
import DopamineOnboarding from '@/components/growth/DopamineOnboarding';

const STEPS: { badge: string; icon: LucideIcon; title: string; description: string; points: string[] }[] = [
  {
    badge: 'ILMIY GAMIFIKATSIYA',
    icon: Sprout,
    title: "Har bir to'g'ri javob — bilim ildizingizni mustahkamlaydi",
    description:
      "Tarix, Milliy Sertifikat va BBA imtihonlariga tayyorlanishda XP to'plang, darajalarni oching, streak (ketma-ketlik) saqlang va do'stlar bilan bellashing.",
    points: [
      'Haqiqiy Milliy Sertifikat formatidagi savollar',
      "AI xatolar tahlili va shaxsiy o'rganish yo'l xaritasi",
    ],
  },
  {
    badge: 'BATTLE ARENA & MENTOR',
    icon: Swords,
    title: 'Jonli duellar va 24/7 shaxsiy AI Mentor',
    description:
      "Boshqa abituriyentlar bilan 1v1 intellektual janglarda kuch sinashing, tangalar yuting va avatar ramkalarini kolleksiya qiling.",
    points: [
      "Mini-o'yinlar: Xronologiya, Xarita va Tarixiy Shaxsni topish",
      'Imtihon topshirish uchun eng aniq prognoz sertifikat balli',
    ],
  },
  {
    badge: '3 DAQIQALIK ILK SINOV',
    icon: Target,
    title: 'Fanni tanlang va darajangizni aniqlang',
    description:
      "Qaysi fandan imtihon topshirasiz? Tanlang — o'sha fan bo'yicha 7 ta savollik ekspress diagnostikadan o'tib, qaysi mavzularni takrorlash kerakligini bilib oling.",
    points: [
      "7 ta adaptiv savol (Oson -> O'rtacha -> Qiyin)",
      "Natija darhol: to'g'ri javoblar soni va daraja",
      'Kuchli va zaif mavzularingizning lahzalik tahlili',
    ],
  },
];

/* Har bir qadam — o'z rangi */
const STEP_TONES = [
  { bg: 'bg-[var(--ps-purple)]', onBg: 'text-white', accent: 'bg-[var(--ps-orange)]', icon: 'text-[var(--ps-purple)]' },
  { bg: 'bg-[var(--ps-coral)]', onBg: 'text-white', accent: 'bg-[var(--ps-purple)]', icon: 'text-[var(--ps-coral)]' },
  { bg: 'bg-[var(--ps-orange)]', onBg: 'text-[#080808]', accent: 'bg-[var(--ps-green)]', icon: 'text-[#B87A00]' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showBlitz, setShowBlitz] = useState(() => searchParams.get('mode') === 'blitz');
  // Diagnostika qaysi fandan bo'lishi — foydalanuvchi o'zi tanlaydi (hamma ham Tarixdan emas).
  const [subjects, setSubjects] = useState<SprintSubject[]>([]);
  const [chosenSubject, setChosenSubject] = useState<string>(searchParams.get('subject') || '');

  useEffect(() => {
    apiFetch<{ ok: boolean; subjects: SprintSubject[] }>('/api/v1/sprint/subjects/')
      .then((res) => {
        const list = (res?.subjects || []).filter((s) => s.slug && s.slug !== 'all');
        setSubjects(list);
        setChosenSubject((prev) => prev || list.find((s) => s.is_available)?.slug || list[0]?.slug || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('mode') === 'blitz') {
      setShowBlitz(true);
    }
  }, [searchParams]);

  async function complete() {
    await apiFetch('/api/auth/onboarding-complete/', { method: 'POST' }).catch(() => {});
    router.push('/dashboard');
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowBlitz(true);
    }
  }

  const urlSubject = chosenSubject || searchParams.get('subject') || undefined;

  // 7-Savollik Dofamin Onboarding
  if (showBlitz) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <main className="page-shell-focus mx-auto w-full space-y-5 p-3 pb-14 sm:p-5 lg:p-6">
        <DopamineOnboarding
          subject={urlSubject}
          onComplete={async () => {
            await apiFetch('/api/auth/onboarding-complete/', { method: 'POST' }).catch(() => {});
            router.push(urlSubject ? `/sprint?subject=${urlSubject}&count=10` : '/sprint?subject=tarix&count=10');
          }}
        />
        </main>
      </div>
    );
  }

  const step = STEPS[currentStep];
  const tone = STEP_TONES[currentStep % STEP_TONES.length];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="theme-pastel relative flex min-h-[100svh] w-full flex-col overflow-x-clip p-4 sm:p-6">
      {/* Yuqori qator */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <span className="ps-chip">
          <BrandMark size={22} rounded="rounded-full" />
          <span data-no-translit>Ilm<span className="text-[var(--ps-purple)]">Ildizi</span></span>
        </span>
        <button type="button" onClick={complete} className="ps-chip cursor-pointer transition-transform hover:-translate-y-0.5">
          O&apos;tkazib yuborish <ArrowRight className="size-3.5" />
        </button>
      </header>

      <div className="mx-auto my-auto grid w-full max-w-6xl items-center gap-8 py-8 lg:grid-cols-2 lg:gap-14">
        {/* Chap: rangli kompozitsiya */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`art-${currentStep}`}
            initial={{ opacity: 0, x: -24, rotate: -2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 24, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[420px]"
          >
            <div aria-hidden className={cn('absolute inset-[6%] rounded-full', tone.bg)} />
            <div aria-hidden className={cn('absolute -left-2 bottom-[4%] size-[32%] rounded-tl-full', tone.accent)} />
            <div aria-hidden className="ps-dots absolute right-[2%] top-[2%] size-[26%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
            <svg aria-hidden viewBox="0 0 100 100" className="ps-spin absolute right-[8%] bottom-[10%] size-[16%] text-[#080808] dark:text-[#FFFCF7]">
              <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" />
            </svg>
            <div className="absolute inset-[22%] grid place-items-center rounded-full border-[8px] border-[#FFFCF7] bg-[#FFFCF7] shadow-[0_30px_60px_-30px_rgba(40,20,80,0.7)]">
              <step.icon className={cn('size-[42%]', tone.icon)} strokeWidth={1.6} />
            </div>
            <span className="ps-display absolute left-[2%] top-[4%] text-[64px] leading-none text-[#080808]/90 dark:text-[#FFFCF7]/90 sm:text-[84px]">
              0{currentStep + 1}
            </span>
            <span className="ps-chip ps-float absolute bottom-[14%] left-0">
              <Sparkles className="size-3.5 text-[var(--ps-orange)]" /> {step.badge.toLowerCase()}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* O'ng: matn kartasi */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`card-${currentStep}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-9"
          >
            <span aria-hidden className={cn('pointer-events-none absolute -right-14 -top-14 size-44 rounded-full opacity-20', tone.bg)} />

            {/* Progress */}
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`${idx + 1}-qadam`}
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      'h-2.5 cursor-pointer rounded-full transition-all duration-300',
                      idx === currentStep ? 'w-10 bg-[#080808] dark:bg-[#FFFCF7]' : idx < currentStep ? 'w-2.5 bg-[var(--ps-purple)]' : 'w-2.5 bg-[var(--ds-track)]'
                    )}
                  />
                ))}
              </div>
              <span className="text-[12px] font-bold text-[var(--text-muted)]">{currentStep + 1} / {STEPS.length}</span>
            </div>

            <p className="ps-eyebrow relative mt-6 text-[var(--text-muted)]">{step.badge}</p>
            <h1 className="ps-display relative mt-3 text-[32px] sm:text-[42px]">{step.title}</h1>
            <p className="relative mt-4 text-[14.5px] leading-relaxed text-[var(--text-secondary)]">{step.description}</p>

            <ul className="relative mt-6 space-y-2">
              {step.points.map((pt) => (
                <li key={pt} className="flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2.5 pr-4">
                  <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', tone.bg, tone.onBg)}>
                    <Check className="size-4 stroke-[3]" />
                  </span>
                  <span className="text-[13.5px] font-semibold">{pt}</span>
                </li>
              ))}
            </ul>

            {isLast && (
              <div className="relative mt-6">
                <p className="text-[12px] font-black uppercase tracking-wider text-[var(--text-muted)]">Qaysi fandan boshlaysiz?</p>
                {subjects.length === 0 ? (
                  <p className="mt-3 rounded-[18px] bg-[var(--ps-neutral)] px-4 py-3 text-[13px] text-[var(--text-muted)]">Fanlar yuklanmoqda…</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjects.map((sub) => {
                      const active = chosenSubject === sub.slug;
                      const disabled = !sub.is_available;
                      return (
                        <button
                          key={sub.slug}
                          type="button"
                          disabled={disabled}
                          onClick={() => setChosenSubject(sub.slug)}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-full py-2 pl-4 pr-2 text-[13.5px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40',
                            active
                              ? 'bg-[var(--ps-purple)] text-white shadow-[0_10px_22px_-12px_rgba(118,89,199,0.9)]'
                              : 'bg-[var(--ps-neutral)] text-[var(--text-primary)] hover:-translate-y-0.5'
                          )}
                        >
                          {sub.name}
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] tabular-nums', active ? 'bg-white/25' : 'bg-[var(--ps-paper)] text-[var(--text-muted)]')}>
                            {active ? <Check className="inline size-3 stroke-[3]" /> : sub.questions_count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="relative mt-8 flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  aria-label="Orqaga"
                  className="ps-btn ps-btn-ghost !min-h-12 !px-4"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <button type="button" onClick={handleNext} disabled={isLast && !chosenSubject} className="ps-btn ps-btn-ink flex-1">
                {isLast
                  ? `${subjects.find((x) => x.slug === chosenSubject)?.name ?? ''} bo'yicha diagnostikani boshlash`.trim()
                  : 'Keyingisi'}
                <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
              </button>
            </div>
            {isLast && (
              <p className="relative mt-3 text-center text-[12px] font-semibold text-[var(--text-muted)]">
                Taxminan 3 daqiqa · natija darhol chiqadi
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
