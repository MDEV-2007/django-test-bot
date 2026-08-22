'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, Info, TrendingDown } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import StatNumber from '@/components/motion/StatNumber';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Prediction = {
  ready: boolean;
  sample_size: number;
  needed: number;
  topics_covered: number;
  predicted_percent: number | null;
  predicted_dtm: number | null;
  dtm_max?: number;
  confidence: number | null;
  confidence_label: 'insufficient' | 'low' | 'medium' | 'high';
  topic_breakdown: { topic_id: number | null; title: string; answers: number; score: number }[];
};

const CONFIDENCE_UZ: Record<string, { label: string; tone: string }> = {
  low: { label: 'Past ishonch', tone: 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger-text)]' },
  medium: { label: "O'rtacha ishonch", tone: 'border-amber-500/25 bg-amber-500/12 text-amber-300' },
  high: { label: 'Yuqori ishonch', tone: 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]' },
};

/* DTM ball bashorati (Feature 2).

   Ikkita qoida:
   1. Yetarli ma'lumot bo'lmasa — RAQAM KO'RSATILMAYDI. Noto'g'ri bashorat ishonchni
      yo'qotadi, shuning uchun o'rniga "yana N ta savol" progress bari chiqadi.
   2. Raqam yonida doim ishonch darajasi turadi va "taxminiy" deb yoziladi — bu
      kafolatlangan ball emas. */
export default function PredictedScore() {
  const { access } = useAuthStore();
  const [data, setData] = useState<Prediction | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<Prediction>('/api/analytics/predicted-score/').then(setData).catch(() => setData(null));
  }, [access]);

  if (!data) return <Skeleton className="h-36 w-full" />;

  if (!data.ready) {
    const pct = Math.min(100, Math.round((data.sample_size / data.needed) * 100));
    const left = Math.max(0, data.needed - data.sample_size);
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-[var(--accent-text)]" /> DTM ball bashorati
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Bashorat uchun yetarli ma&apos;lumot yo&apos;q. Yana{' '}
            <strong className="text-foreground">{left} ta savol</strong> yeching — shundan so&apos;ng
            tizim taxminiy ballingizni hisoblaydi.
          </p>
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">{data.sample_size} / {data.needed} javob</span>
            <Button asChild size="sm" variant="outline"><Link href="/tests">Test yechish</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const conf = CONFIDENCE_UZ[data.confidence_label] ?? CONFIDENCE_UZ.low;
  const weak = data.topic_breakdown.filter((t) => t.score < 60).slice(0, 3);

  return (
    <Card className="border-[var(--accent-border)] bg-primary/[0.04]">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-[var(--accent-text)]" /> Taxminiy DTM balli
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-muted-foreground"><Info className="size-3.5" /></span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  {data.sample_size} ta javob, {data.topics_covered} ta mavzu asosida hisoblangan.
                  Qiyin savollar ko&apos;proq og&apos;irlikka ega, mavzular teng hisobga olinadi.
                  Bu kafolatlangan natija emas — o&apos;sishni kuzatish uchun mo&apos;ljallangan.
                </TooltipContent>
              </Tooltip>
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black text-[var(--accent-text)]">
                <StatNumber value={data.predicted_dtm ?? 0} />
              </span>
              <span className="text-sm text-muted-foreground">/ {data.dtm_max ?? 189} ball</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              o&apos;zlashtirish: {data.predicted_percent}%
            </p>
          </div>

          <div className="space-y-1.5 text-right">
            <Badge variant="outline" className={cn('font-medium', conf.tone)}>{conf.label}</Badge>
            <p className="font-mono text-xs text-muted-foreground">
              {Math.round((data.confidence ?? 0) * 100)}% · {data.sample_size} javob
            </p>
          </div>
        </div>

        {weak.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--danger-text)]">
              <TrendingDown className="size-3.5" /> Ballni eng ko&apos;p pasaytirayotgan mavzular
            </p>
            {weak.map((t) => (
              <div key={t.title} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">{t.title}</span>
                <span className="shrink-0 font-mono text-[var(--danger-text)]">{t.score}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
