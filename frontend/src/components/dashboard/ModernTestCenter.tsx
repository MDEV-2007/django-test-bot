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
import { useApiQuery } from '@/lib/api-cache';
import PremiumIcon from '@/components/ui/premium-icon';

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
}: ModernTestCenterProps) {
  const { data } = useApiQuery<{ tests: RealTestItem[] }>('/api/tests/');

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
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-[-0.02em] text-foreground">
              Tavsiya Etilgan Sinovlar
            </h2>
            <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              DARAJANGA MOS
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            AI tahlili asosida aynan sizning bilim darajangiz uchun saralangan 2 ta sinov
          </p>
        </div>

        <Link
          href="/tests"
          className="inline-flex items-center gap-1 text-xs font-semibold transition shrink-0 group text-primary hover:underline"
        >
          <span>Barcha testlar (50+)</span>
          <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* App Store Style Curated Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {curatedList.map((test) => (
          <div
            key={test.id}
            className="ios-card ios-card-interactive relative rounded-[26px] p-5 sm:p-6 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/12 px-3 py-0.5 text-[11px] font-bold text-primary">
                  {test.level}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  {test.isPriority && <PremiumIcon icon={Sparkles} tone="amber" size="2xs" />}
                  <span>{test.tag}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {test.subjectName}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-foreground mt-0.5 leading-snug line-clamp-2 tracking-[-0.01em]">
                  {test.title}
                </h4>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="size-3.5 text-primary" />
                  <span>{test.questionsCount} savol</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#34C759]" />
                  <span>{test.timeMinutes} daqiqa</span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Haqiqiy imtihon muhiti</span>
              <Link
                href={`/tests?subject=${test.subjectSlug}`}
                className="ios-spring inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,122,255,0.28)] cursor-pointer select-none"
              >
                <span>BOSHLASH</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* iOS Inset Grouped Catalog Row */}
      <Link
        href="/tests"
        className="ios-card ios-card-interactive flex items-center justify-between rounded-[24px] p-4 text-xs group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <PremiumIcon icon={Layers} tone="sky" size="md" solid />
          <div>
            <span className="font-bold block text-foreground text-xs sm:text-sm">
              Barcha fanlar bo&apos;yicha to&apos;liq testlar bazasi
            </span>
            <span className="text-[11px] text-muted-foreground">
              Ona tili, Tarix, Biologiya, Matematika, Ingliz tili va CEFR formatlari
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
          <span className="hidden sm:inline">Katalog</span>
          <ChevronRight className="size-4" />
        </div>
      </Link>
    </div>
  );
}
