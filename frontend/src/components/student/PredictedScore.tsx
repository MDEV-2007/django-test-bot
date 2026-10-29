'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, Info, TrendingDown, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import StatNumber from '@/components/motion/StatNumber';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PremiumIcon from '@/components/ui/premium-icon';
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
  low: { label: 'Past ishonch', tone: 'border-[#FF3B30]/25 bg-[#FF3B30]/10 text-[#FF3B30]' },
  medium: { label: "O'rtacha ishonch", tone: 'border-[#FF9500]/25 bg-[#FF9500]/12 text-[#FF9500]' },
  high: { label: 'Yuqori ishonch', tone: 'border-[#34C759]/25 bg-[#34C759]/12 text-[#34C759]' },
};

/* Apple Health Style DTM Score Prediction Card */
export default function PredictedScore() {
  const { access } = useAuthStore();
  const [data, setData] = useState<Prediction | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<Prediction>('/api/analytics/predicted-score/').then(setData).catch(() => setData(null));
  }, [access]);

  if (!data) return <Skeleton className="h-36 w-full rounded-[24px]" />;

  if (!data.ready) {
    const pct = Math.min(100, Math.round((data.sample_size / data.needed) * 100));
    const left = Math.max(0, data.needed - data.sample_size);
    return (
      <div className="ios-card rounded-[24px] p-5 sm:p-6 space-y-3.5">
        <div className="flex items-center gap-2.5">
          <PremiumIcon icon={Target} tone="sky" size="xs" solid />
          <p className="text-[15px] font-bold text-foreground">DTM ball bashorati</p>
        </div>
        <p className="text-[13.5px] text-[#8E8E93] leading-relaxed">
          Aniq bashorat uchun yana{' '}
          <strong className="text-foreground font-semibold">{left} ta savol</strong> yeching — shundan so&apos;ng
          AI tizimi real imtihondagi taxminiy ballingizni hisoblab beradi.
        </p>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between pt-1 text-[12px] text-[#8E8E93]">
          <span className="font-mono font-semibold">{data.sample_size} / {data.needed} javob</span>
          <Link
            href="/tests"
            className="inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0071EB] transition-all"
          >
            <span>Test yechish</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const conf = CONFIDENCE_UZ[data.confidence_label] ?? CONFIDENCE_UZ.low;
  const weak = data.topic_breakdown.filter((t) => t.score < 60).slice(0, 3);

  return (
    <div className="ios-card rounded-[26px] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PremiumIcon icon={Target} tone="sky" size="xs" solid />
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Taxminiy DTM balli
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8E8E93]"><Info className="size-3.5" /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                {data.sample_size} ta javob va {data.topics_covered} ta mavzu asosida hisoblangan.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-[38px] font-black tracking-tight text-[#007AFF] leading-none">
              <StatNumber value={data.predicted_dtm ?? 0} />
            </span>
            <span className="text-[14px] font-semibold text-[#8E8E93]">/ {data.dtm_max ?? 189} ball</span>
          </p>
          <p className="mt-1 font-mono text-[12px] font-medium text-[#34C759]">
            O&apos;zlashtirish ko&apos;rsatkichi: {data.predicted_percent}%
          </p>
        </div>

        <div className="space-y-1.5 text-right">
          <Badge variant="outline" className={cn('font-semibold', conf.tone)}>{conf.label}</Badge>
          <p className="font-mono text-[11.5px] text-[#8E8E93]">
            {Math.round((data.confidence ?? 0) * 100)}% aniqlik · {data.sample_size} javob
          </p>
        </div>
      </div>

      {weak.length > 0 && (
        <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-3.5">
          <p className="flex items-center gap-2 text-[12px] font-bold text-[#FF3B30]">
            <PremiumIcon icon={TrendingDown} tone="rose" size="2xs" solid /> Ballni pasaytirayotgan mavzular
          </p>
          <div className="grid gap-1.5">
            {weak.map((t) => (
              <div key={t.title} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#FF3B30]/[0.05] px-3 py-1.5 text-[12.5px]">
                <span className="min-w-0 truncate font-medium text-foreground">{t.title}</span>
                <span className="shrink-0 font-mono font-bold text-[#FF3B30]">{t.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
