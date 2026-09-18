'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/lib/api-cache';

type RealTestItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  subject: string | null;
  duration_minutes: number;
  questions_count: number;
  is_premium: boolean;
  is_new?: boolean;
  created_at?: string | null;
};

interface ModernTestCenterProps {
  activeSubject?: string;
  weakReviewTopic?: string | null;
  theme?: 'dark' | 'light';
}

export default function ModernTestCenter({
  activeSubject = 'Rus tili',
  weakReviewTopic,
  theme = 'dark',
}: ModernTestCenterProps) {
  const isLight = theme === 'light';
  const { data } = useApiQuery<{ tests: RealTestItem[] }>('/api/tests/');

  // Curated fallback tests matching the user's primary learning track
  const defaultCurated = [
    {
      id: 1,
      subjectSlug: 'rus-tili',
      subjectName: activeSubject || 'Rus tili',
      title: weakReviewTopic
        ? `${weakReviewTopic} — Qayta mustahkamlash testi`
        : `${activeSubject} — Boshlang'ich Grammatika & Leksika Mock`,
      level: 'Abituriyent / B1-B2',
      questionsCount: 30,
      timeMinutes: 45,
      tag: weakReviewTopic ? 'Zaif mavzu' : 'Tavsiya etilgan',
      isPriority: true,
    },
    {
      id: 2,
      subjectSlug: 'cefr',
      subjectName: 'Rasmiy Imtihon',
      title: 'CEFR Multi-Level Mock Imtihoni (Listening & Reading)',
      level: 'Milliy Standart',
      questionsCount: 50,
      timeMinutes: 90,
      tag: 'Haqiqiy format',
      isPriority: false,
    },
  ];

  let curatedList = defaultCurated;
  if (data?.tests && data.tests.length > 0) {
    const rawTests = data.tests;
    const subjectMatch =
      rawTests.find(
        (t) =>
          t.subject?.toLowerCase().includes(activeSubject.toLowerCase()) ||
          activeSubject.toLowerCase().includes((t.subject || '').toLowerCase())
      ) || rawTests[0];

    const secondTest =
      rawTests.find((t) => t.id !== subjectMatch.id && (t.category === 'certificate' || t.category === 'cefr')) ||
      rawTests.find((t) => t.id !== subjectMatch.id) ||
      rawTests[0];

    curatedList = [
      {
        id: subjectMatch.id,
        subjectSlug: subjectMatch.subject || 'tarix',
        subjectName: subjectMatch.subject ? subjectMatch.subject.toUpperCase() : activeSubject,
        title: subjectMatch.title,
        level: subjectMatch.category === 'certificate' ? 'Milliy Sertifikat' : 'Mavzulashtirilgan',
        questionsCount: subjectMatch.questions_count || 30,
        timeMinutes: subjectMatch.duration_minutes || 40,
        tag: 'Shaxsiy Tavsiya',
        isPriority: true,
      },
      {
        id: secondTest.id,
        subjectSlug: secondTest.subject || 'umumiy',
        subjectName: secondTest.category === 'cefr' ? 'CEFR' : 'Milliy Standart',
        title: secondTest.title,
        level: 'Sertifikat Sinovi',
        questionsCount: secondTest.questions_count || 35,
        timeMinutes: secondTest.duration_minutes || 60,
        tag: 'Rasmiy Mock',
        isPriority: false,
      },
    ];
  }

  return (
    <div className="space-y-4">
      {/* Header with Progressive Disclosure Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cn('text-lg sm:text-xl font-black tracking-tight', isLight ? 'text-slate-900' : 'text-white')}>
              Tavsiya Etilgan Sinovlar
            </h2>
            <Badge
              className={cn(
                'text-[10px] font-bold border',
                isLight
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              )}
            >
              DARAJANGA MOS
            </Badge>
          </div>
          <p className={cn('text-xs font-medium', isLight ? 'text-slate-500' : 'text-slate-400')}>
            AI tahlili asosida aynan sizning bilim darajangiz uchun saralangan 2 ta sinov
          </p>
        </div>

        <Link
          href="/tests"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold transition shrink-0 group',
            isLight ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-400 hover:text-emerald-300'
          )}
        >
          <span>Barcha testlar katalogi (50+)</span>
          <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Progressive Disclosure: Only 2 Curated Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {curatedList.map((test) => (
          <div
            key={test.id}
            className={cn(
              'relative rounded-3xl p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between shadow-lg',
              isLight
                ? 'border border-slate-200/90 bg-white hover:border-slate-300 shadow-[0_4px_20px_rgba(15,23,42,0.05)]'
                : 'border border-slate-800/80 bg-gradient-to-br from-emerald-500/15 via-slate-900/60 to-slate-950 hover:border-slate-700'
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-black px-2.5 py-0.5 rounded-full border',
                    isLight
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  )}
                >
                  {test.level}
                </Badge>
                <span className={cn('text-[11px] font-bold flex items-center gap-1', isLight ? 'text-slate-500' : 'text-slate-400')}>
                  {test.isPriority && <Sparkles className="size-3 text-amber-500" />}
                  <span>{test.tag}</span>
                </span>
              </div>

              <div>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', isLight ? 'text-slate-400' : 'text-slate-400')}>
                  {test.subjectName}
                </span>
                <h4
                  className={cn(
                    'text-sm sm:text-base font-black mt-0.5 leading-snug line-clamp-2',
                    isLight ? 'text-slate-900' : 'text-white'
                  )}
                >
                  {test.title}
                </h4>
              </div>

              <div className={cn('flex items-center gap-4 text-xs font-mono pt-1', isLight ? 'text-slate-500' : 'text-slate-400')}>
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="size-3.5" />
                  <span>{test.questionsCount} savol</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{test.timeMinutes} daqiqa</span>
                </span>
              </div>
            </div>

            <div className={cn('mt-5 pt-3.5 border-t flex items-center justify-between', isLight ? 'border-slate-100' : 'border-slate-800/80')}>
              <span className={cn('text-xs', isLight ? 'text-slate-500' : 'text-slate-400')}>Haqiqiy imtihon muhiti</span>
              <Link
                href={`/tests?subject=${test.subjectSlug}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer select-none active:scale-95',
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300'
                )}
              >
                <span>Boshlash</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Progressive Disclosure Link Strip: Invites to Full Catalog */}
      <Link
        href="/tests"
        className={cn(
          'flex items-center justify-between rounded-2xl p-3.5 text-xs transition-all group cursor-pointer border',
          isLight
            ? 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.03)]'
            : 'border-slate-800/70 bg-slate-900/40 hover:bg-slate-800/40 text-slate-300'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-xl',
              isLight ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-800 text-slate-300'
            )}
          >
            <Layers className="size-4" />
          </div>
          <div>
            <span className={cn('font-bold block', isLight ? 'text-slate-900' : 'text-white')}>
              Barcha fanlar bo&apos;yicha to&apos;liq testlar bazasi
            </span>
            <span className={cn('text-[11px]', isLight ? 'text-slate-500' : 'text-slate-400')}>
              Ona tili, Tarix, Biologiya, Matematika, Ingliz tili va CEFR formatlari
            </span>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform',
            isLight ? 'text-blue-600' : 'text-emerald-400'
          )}
        >
          <span>Katalogga o&apos;tish</span>
          <ChevronRight className="size-4" />
        </div>
      </Link>
    </div>
  );
}
