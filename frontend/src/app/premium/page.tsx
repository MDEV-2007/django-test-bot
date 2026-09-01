'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, CheckCircle2, ArrowRight, Lock, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Plan = { id: number; plan_type: string; name: string; description: string; price: string; duration_days: number; features: string[] };
type PlansData = {
  plans: Plan[]; is_premium: boolean;
  has_active_premium_lessons: boolean; premium_mock_test_unlocked: boolean; premium_expires_at: string | null;
};

// "ENG OMMABOP" lentasi shu muddatga tegishli — sariq CTA ham aynan shu tarifda
// turishi kerak, aks holda ikkita karta ikki xil urg'u berib bir-birini yeydi.
const RECOMMENDED_DURATION = 180;

export default function PremiumPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<PlansData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<PlansData>('/api/premium/plans/').then((d) => {
      setData(d);
      const recommended = d.plans.find((p) => p.duration_days === RECOMMENDED_DURATION);
      setSelectedPlanId((prev) => prev ?? recommended?.id ?? d.plans[0]?.id ?? null);
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  /* Ustunlar soni tariflar soniga moslashadi. Ilgari qattiq `xl:grid-cols-4` yozilgan edi —
     tariflar soni 4 dan 3 ga tushgach, kartalar ekranning 1/4 qismiga siqilib, bitta
     uyacha bo'sh qolgan va matnlar noqulay tarzda ko'chib ketgan edi. */
  const planCount = data?.plans.length ?? 0;
  const planGridCols =
    planCount <= 1 ? 'max-w-md mx-auto'
    : planCount === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto'
    : planCount === 3 ? 'sm:grid-cols-2 lg:grid-cols-3'
    : 'sm:grid-cols-2 xl:grid-cols-4';

  function isPlanActive(plan: Plan) {
    if (!data) return false;
    if (plan.plan_type === 'lessons') return data.has_active_premium_lessons;
    if (plan.plan_type === 'mock_test') return data.premium_mock_test_unlocked;
    return false;
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="amber"
          eyebrow="ILMILDIZI PRO"
          eyebrowIcon={Crown}
          title="Tarixdan 100% Natija va Milliy Sertifikatni Kafolatlang"
          description="Cheksiz mock testlar, barcha audio/video darslar, AI Mentorning 24/7 yordami va shaxsiy xatolar ustida ishlash xaritasi."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/premium/payments"><Receipt className="size-4" /> To&apos;lovlarim</Link>
            </Button>
          }
        />

        {/* Holat kartalari faqat kamida bittasi FAOL bo'lganda ko'rsatiladi (muddat sanasi
            shu yerda beriladi). Hammasi qulflangan bo'lsa, bu kartalar pastdagi narx
            kartalari aytayotgan gapni takrorlagan bo'lardi — shuning uchun yashiriladi. */}
        {data && (data.has_active_premium_lessons || data.premium_mock_test_unlocked) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Video/Audio darslar',
                on: data.has_active_premium_lessons,
                note: data.has_active_premium_lessons
                  ? `Faol${data.premium_expires_at ? ` — ${new Date(data.premium_expires_at).toLocaleDateString('uz-UZ')} gacha` : ''}`
                  : 'Qulflangan',
              },
              {
                label: 'Mock test tizimi',
                on: data.premium_mock_test_unlocked,
                note: data.premium_mock_test_unlocked ? 'Ochilgan (muddatsiz)' : 'Qulflangan',
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    s.on ? 'bg-[var(--success)]/20 text-[var(--success-text)]' : 'bg-[var(--surface-input)] text-[var(--text-faint)]',
                  )}>
                    {s.on ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{s.label}</h4>
                    <p className={cn('mt-0.5 text-xs', s.on ? 'text-[var(--success-text)]' : 'text-[var(--text-faint)]')}>{s.note}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!data && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-96 w-full" />)}
          </div>
        )}

        <div className={cn('grid grid-cols-1 gap-5', planGridCols)}>
          {data?.plans.map((p) => {
            const isSelected = selectedPlanId === p.id;
            const active = isPlanActive(p);
            const perDay = p.duration_days > 0 ? Number(p.price) / p.duration_days : null;
            const ribbon = p.duration_days === RECOMMENDED_DURATION ? 'ENG OMMABOP' : p.duration_days === 365 ? 'ENG FOYDALI' : null;
            return (
              <Card
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={cn(
                  'tactile-btn relative cursor-pointer justify-between transition-all',
                  isSelected
                    ? 'border-amber-400 bg-gradient-to-b from-amber-500/10 to-card shadow-xl shadow-amber-500/10'
                    : 'hover:border-[var(--border-strong)]',
                )}
              >
                {/* Karta `overflow-hidden` bo'lgani uchun lenta karta ICHIDA, yuqori
                    chetiga yopishtiriladi — ilgari `-top-3` bilan tashqariga chiqib,
                    yarmi kesilib qolar edi. */}
                {ribbon && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-3 py-1 font-mono text-xs font-bold text-black shadow-md">
                    {ribbon}
                  </span>
                )}
                <CardContent className={cn('space-y-3 pt-6', ribbon && 'pt-9')}>
                  <p className="text-xs font-bold uppercase text-[var(--text-faint)]">
                    {p.plan_type === 'lessons' ? 'Darslar' : 'Mock test'}
                  </p>
                  <h3 className="text-base font-bold">{p.name}</h3>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{p.description}</p>
                  <div className="pt-1">
                    <span className="font-mono text-2xl font-black">{Number(p.price).toLocaleString()}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      so&apos;m{p.duration_days > 0 ? ` / ${p.duration_days} kun` : ' (bir martalik)'}
                    </span>
                    {perDay && <p className="mt-0.5 font-mono text-xs text-[var(--text-faint)]">≈ {Math.round(perDay).toLocaleString()} so&apos;m/kun</p>}
                  </div>
                  <Separator />
                  <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-text)]" />{f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardContent className="pb-6">
                  {active ? (
                    <Button disabled className="w-full bg-[var(--success)]/20 text-[var(--success-text)]">
                      <CheckCircle2 className="size-4" /> Faol
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant={isSelected ? 'default' : 'secondary'}
                      className={cn('w-full', isSelected && 'bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:bg-amber-500')}
                    >
                      <Link href={`/premium/checkout/${p.id}`}>Obunani Boshlash <ArrowRight className="size-4" /></Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
