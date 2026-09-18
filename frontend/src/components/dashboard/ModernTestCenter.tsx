'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Play,
  Layers,
  ChevronRight,
  Ticket,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/lib/api-cache';

const SUBJECT_FILTERS = [
  { id: 'all', label: 'Barchasi', icon: '🌟' },
  { id: 'rus-tili', label: 'Rus tili', icon: '🇷🇺' },
  { id: 'biologiya', label: 'Biologiya', icon: '🌿' },
  { id: 'tarix', label: 'Tarix', icon: '🏛' },
  { id: 'ona-tili', label: 'Ona tili', icon: '📖' },
  { id: 'ingliz-tili', label: 'Ingliz tili', icon: '🇬🇧' },
  { id: 'matematika', label: 'Matematika', icon: '📐' },
];

const SAMPLE_TESTS = [
  {
    id: 1,
    subject: 'rus-tili',
    subjectName: 'Rus tili',
    title: "Boshlang'ich Grammatika & Leksika Mock",
    level: 'B1-B2',
    questionsCount: 30,
    timeMinutes: 45,
    tag: 'Tavsiya',
    accent: 'from-sky-500/20 via-slate-900 to-slate-950',
    border: 'hover:border-sky-500/50',
    glow: 'hover:shadow-[0_0_25px_rgba(14,165,233,0.2)]',
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    id: 2,
    subject: 'biologiya',
    subjectName: 'Biologiya',
    title: 'Genetika va Seleksiya Asoslari Mock',
    level: 'Milliy Sertifikat',
    questionsCount: 35,
    timeMinutes: 60,
    tag: 'Ommabop',
    accent: 'from-emerald-500/20 via-slate-900 to-slate-950',
    border: 'hover:border-emerald-500/50',
    glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 3,
    subject: 'tarix',
    subjectName: 'Tarix',
    title: "O'zbekiston Tarixi — Qadimgi Davrdan Bugungacha",
    level: 'DTM 2026',
    questionsCount: 30,
    timeMinutes: 40,
    tag: 'Yangi',
    accent: 'from-amber-500/20 via-slate-900 to-slate-950',
    border: 'hover:border-amber-500/50',
    glow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
];

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

export default function ModernTestCenter() {
  const [activeSubject, setActiveSubject] = useState('all');
  const { data } = useApiQuery<{ tests: RealTestItem[] }>('/api/tests/');

  const realTests = (data?.tests || []).map((t) => {
    const isNew = Boolean(
      t.is_new ||
      (t.created_at && (Date.now() - new Date(t.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000)
    );
    const subSlug = t.subject || 'tarix';
    const subName = subSlug === 'tarix' ? 'Tarix' : subSlug === 'ona-tili' ? 'Ona tili' : subSlug === 'ingliz-tili' ? 'Ingliz tili' : subSlug.toUpperCase();
    return {
      id: t.id,
      subject: subSlug,
      subjectName: subName,
      title: t.title,
      level: t.category === 'certificate' ? 'Milliy Sertifikat' : (t.category === 'cefr' ? 'CEFR' : 'Mavzulashtirilgan'),
      questionsCount: t.questions_count,
      timeMinutes: t.duration_minutes,
      tag: isNew ? 'Yangi Sinov' : 'Rasmiy Test',
      accent: isNew ? 'from-amber-500/20 via-slate-900 to-slate-950' : 'from-emerald-500/20 via-slate-900 to-slate-950',
      border: isNew ? 'border-amber-500/40 hover:border-amber-400' : 'hover:border-emerald-500/50',
      glow: isNew ? 'hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      badgeBg: isNew ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      isNew,
    };
  });

  const allList = realTests.length > 0 ? realTests : SAMPLE_TESTS;
  const filteredTests =
    activeSubject === 'all'
      ? allList
      : allList.filter((t) => t.subject === activeSubject);

  return (
    <div className="space-y-6">
      {/* Header with Title & Catalog Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Sinov &amp; Imtihon Markazi
            </h2>
            <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              VIP FORMAT
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            DTM, Milliy Sertifikat va CEFR standartidagi rasmiy sinovlar
          </p>
        </div>

        <Link
          href="/tests"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
        >
          <span>Barcha testlar katalogi</span>
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 1. VIP BOARDING PASS / VIP EVENT MOCK EXAM CARD              */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 p-6 sm:p-7 backdrop-blur-xl shadow-2xl border-t border-white/10 group">
        <div className="grid lg:grid-cols-12 gap-6 items-center">
          {/* Main Pass Information */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs font-black text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Ticket className="size-3.5" />
                <span>OFFICIAL BOARDING PASS · MOCK EXAM</span>
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                ★ CERTIFIED FORMAT
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                CEFR Multi-Level Mock Imtihoni 2026
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                Listening (Audio &amp; Xarita), Reading (Matching &amp; Gaps), va Writing (Task 1 &amp; 2) to&apos;liq
                3-bosqichli sinov. Haqiqiy imtihon muhiti va AI natijalar sertifikati.
              </p>
            </div>

            {/* Event Specs Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-lg pt-1">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Davomiyligi</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono">2 Soat 30 Daq</span>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Savollar</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono">75 Ta</span>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sertifikat</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-bold">B1 / B2 / C1</span>
              </div>
            </div>
          </div>

          {/* Perforated Stub / Ticket Right Side */}
          <div className="lg:col-span-4 lg:border-l-2 lg:border-dashed lg:border-slate-800 lg:pl-6 flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between lg:justify-start lg:gap-4">
              <div className="size-16 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg">
                <QrCode className="size-full text-slate-950" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Chipta Holati</span>
                <p className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>Ruxsat Berilgan (Faol)</span>
                </p>
                <p className="text-[10px] font-mono text-slate-400">ID: ILM-2026-MOCK</p>
              </div>
            </div>

            <Link
              href="/tests"
              className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-98 transition-all cursor-pointer"
            >
              <Play className="size-4 fill-white" />
              <span>Imtihonni Boshlash</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SHADCN SEGMENTED TABS (SUBJECT FILTER PILLS)              */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
        {SUBJECT_FILTERS.map((sub) => {
          const isActive = activeSubject === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveSubject(sub.id)}
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer select-none active:scale-95',
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-102'
                  : 'border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/80'
              )}
            >
              <span className="text-sm">{sub.icon}</span>
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3. TEST CARDS GRID (ELEVATION & GLOW ON HOVER)               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTests.map((test) => (
          <Link
            key={test.id}
            href={`/tests?subject=${test.subject}`}
            className={cn(
              'group relative rounded-3xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 cursor-pointer',
              test.border,
              test.glow
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {test.isNew && (
                    <Badge className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-[9px] tracking-wider uppercase px-2 py-0.5 gap-1 shadow-sm border-0 animate-pulse">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-200 opacity-80" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                      </span>
                      <Sparkles className="size-2 text-amber-200 fill-amber-200" />
                      Yangi
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', test.badgeBg)}
                  >
                    {test.level}
                  </Badge>
                </div>
                <span className="text-[11px] font-bold text-slate-500">{test.tag}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {test.subjectName}
                </span>
                <h4 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors mt-0.5 leading-snug">
                  {test.title}
                </h4>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="size-3.5 text-slate-400" />
                  <span>{test.questionsCount} savol</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>{test.timeMinutes} daqiqa</span>
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
              <span>Testni boshlash</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
