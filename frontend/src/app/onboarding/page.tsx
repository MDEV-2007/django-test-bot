'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ArrowRight, Sprout, Swords, Target, Sparkles, type LucideIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    title: 'Jonli duellar va 24/7 shaxsiy AI Tarix Mentor',
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
    title: 'Darajangizni aniqlang va B+ potensialini kashf qiling',
    description:
      "Hech qanday murakkabliksiz — hoziroq 7 ta savollik ekspress diagnostikadan o'ting, bilim darajangizni aniqlang va +100 Tanga bonusga ega bo'ling!",
    points: [
      "7 ta adaptiv savol (Oson -> O'rtacha -> Qiyin)",
      'B+ Milliy Sertifikat daraja potensiali nishoni',
      'Kuchli va zaif mavzularingizning lahzalik tahlili',
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showBlitz, setShowBlitz] = useState(() => searchParams.get('mode') === 'blitz');

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

  // 7-Savollik Dofamin Onboarding
  if (showBlitz) {
    return (
      <div className="relative flex min-h-[85vh] flex-1 flex-col items-center justify-center p-4">
        <DopamineOnboarding
          onComplete={async () => {
            await apiFetch('/api/auth/onboarding-complete/', { method: 'POST' }).catch(() => {});
            router.push('/sprint?subject=tarix&count=10');
          }}
        />
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="relative flex min-h-[85vh] flex-1 flex-col items-center justify-center p-4">
      <div className="mb-6 flex w-full max-w-lg items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-[var(--border-strong)]'
              )}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={complete}>
          O&apos;tkazib yuborish
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-2xl">
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <div className="mb-5 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 text-[var(--accent-text)]">
            <step.icon className="size-10" />
          </div>

          <Badge
            variant="outline"
            className="mb-3 border-[var(--accent-border)] bg-[var(--accent-soft)] uppercase tracking-widest text-[var(--accent-text)]"
          >
            {step.badge}
          </Badge>

          <h1 className="font-voice mb-3 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            {step.title}
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            {step.description}
          </p>

          <div className="mb-8 w-full space-y-2 text-left">
            {step.points.map((pt, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border bg-[var(--surface-hover)] p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Check className="size-3 text-[var(--accent-text)]" />
                </span>
                <span className="text-xs font-medium">{pt}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleNext} size="lg" className="w-full font-bold cursor-pointer">
            {currentStep === STEPS.length - 1 ? '🚀 7 ta savollik Dofamin Blitsni boshlash' : 'Keyingisi'}
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
