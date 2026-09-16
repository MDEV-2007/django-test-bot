'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Brain, Dna, Microscope, Sparkles, CheckCircle2, Lock,
  ChevronRight, ArrowRight, Zap, Target, BookOpen, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type SkillNode = {
  id: string;
  name: string;
  mastery: number; // 0 - 100
  isLocked?: boolean;
  xpReward: number;
};

export type SkillBranch = {
  id: string;
  name: string;
  icon: any;
  color: string;
  mastery: number;
  skills: SkillNode[];
};

export type SubjectTree = {
  id: string;
  subjectName: string;
  icon: any;
  mastery: number;
  branches: SkillBranch[];
};

const DEFAULT_TREES: SubjectTree[] = [
  {
    id: 'biology',
    subjectName: 'Biologiya',
    icon: Brain,
    mastery: 58,
    branches: [
      {
        id: 'cell',
        name: 'Hujayra Biologiyasi',
        icon: Microscope,
        color: 'emerald',
        mastery: 63,
        skills: [
          { id: 'c1', name: 'Membrana & Hujayra devori', mastery: 65, xpReward: 30 },
          { id: 'c2', name: 'Sitoplazma & Yadro', mastery: 82, xpReward: 40 },
          { id: 'c3', name: 'Organoidlar (Mitoxondriya)', mastery: 41, xpReward: 50 },
        ],
      },
      {
        id: 'genetics',
        name: 'Genetika & Irsiyat',
        icon: Dna,
        color: 'cyan',
        mastery: 65,
        skills: [
          { id: 'g1', name: 'DNK & RNK Strukturasi', mastery: 70, xpReward: 35 },
          { id: 'g2', name: 'Xromosomalar & Mitoz', mastery: 35, xpReward: 45 },
          { id: 'g3', name: 'Mendel Qonunlari', mastery: 91, xpReward: 60 },
        ],
      },
    ],
  },
  {
    id: 'history',
    subjectName: 'Tarix',
    icon: BookOpen,
    mastery: 83,
    branches: [
      {
        id: 'ancient',
        name: 'Qadimgi Dunyo',
        icon: Layers,
        color: 'amber',
        mastery: 85,
        skills: [
          { id: 'h1', name: 'Qadimgi Baqtriya & Sug\'d', mastery: 88, xpReward: 35 },
          { id: 'h2', name: 'Ahamoniylar istilosi', mastery: 82, xpReward: 40 },
          { id: 'h3', name: 'Buyuk Ipak Yo\'li', mastery: 86, xpReward: 50 },
        ],
      },
      {
        id: 'temurids',
        name: 'Temuriylar Davri',
        icon: Sparkles,
        color: 'purple',
        mastery: 81,
        skills: [
          { id: 't1', name: 'Amir Temur harbiy yurishlari', mastery: 90, xpReward: 45 },
          { id: 't2', name: 'Temuriylar madaniyati & ilm', mastery: 76, xpReward: 50 },
          { id: 't3', name: 'Boburiylar sulolasi', mastery: 78, xpReward: 55 },
        ],
      },
    ],
  },
  {
    id: 'math',
    subjectName: 'Matematika',
    icon: Target,
    mastery: 72,
    branches: [
      {
        id: 'algebra',
        name: 'Algebra & Tenglamalar',
        icon: Zap,
        color: 'blue',
        mastery: 74,
        skills: [
          { id: 'm1', name: 'Kvadrat tenglamalar & Viyet', mastery: 80, xpReward: 35 },
          { id: 'm2', name: 'Tengsizliklar & Intervallar', mastery: 68, xpReward: 45 },
          { id: 'm3', name: 'Progressiyalar (Arifmetik/Geom)', mastery: 75, xpReward: 50 },
        ],
      },
      {
        id: 'geometry',
        name: 'Geometriya & Trigonometriya',
        icon: Target,
        color: 'rose',
        mastery: 70,
        skills: [
          { id: 'g_m1', name: 'Uchburchaklar & Pifagor', mastery: 85, xpReward: 40 },
          { id: 'g_m2', name: 'Aylana & Doira xossalari', mastery: 60, xpReward: 50 },
          { id: 'g_m3', name: 'Trigonometrik ayniyatlar', mastery: 65, xpReward: 60 },
        ],
      },
    ],
  },
];

function getMasteryBadgeClass(pct: number) {
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
}

function getMasteryBarGradient(pct: number) {
  if (pct >= 80) return 'from-emerald-500 via-teal-400 to-cyan-400';
  if (pct >= 50) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-orange-400';
}

export default function SkillTreeGraph({
  activeSubjectName,
}: {
  activeSubjectName?: string;
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (activeSubjectName) {
      const found = DEFAULT_TREES.find(
        (t) => t.subjectName.toLowerCase() === activeSubjectName.toLowerCase()
      );
      if (found) return found.id;
    }
    return 'biology';
  });

  const activeTree = DEFAULT_TREES.find((t) => t.id === selectedSubjectId) || DEFAULT_TREES[0];
  const RootIcon = activeTree.icon;

  return (
    <div className="space-y-6">
      {/* Fanlar bo'yicha navigatsiya / switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
          {DEFAULT_TREES.map((tree) => {
            const Icon = tree.icon;
            const isSelected = tree.id === selectedSubjectId;
            return (
              <button
                key={tree.id}
                type="button"
                onClick={() => setSelectedSubjectId(tree.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  isSelected
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <Icon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span>{tree.subjectName}</span>
                <span className={cn(
                  "ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                  isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {tree.mastery}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> &gt;80% Mastered
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> 50-79% Jarayonda
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" /> &lt;50% Boshlang&apos;ich
          </span>
        </div>
      </div>

      {/* RPG Skill Tree Vizual Grafi */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/[0.03] p-5 sm:p-7 shadow-xs">
        {/* Dekorativ orqa fon chiziqlari */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07]" />

        <div className="relative flex flex-col items-center space-y-8">
          {/* ============================================================ */}
          {/* 1. ROOT NODE: ASOSIY FAN                                      */}
          {/* ============================================================ */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 to-emerald-500/30 blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col items-center justify-center px-6 py-4 rounded-2xl bg-card border-2 border-primary/40 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <RootIcon className="size-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                      Asosiy Skill Tree
                    </p>
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      {activeTree.subjectName.toUpperCase()}
                    </h3>
                  </div>
                </div>

                <div className="mt-2.5 w-44 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">Umumiy Mastery:</span>
                    <span className="text-primary font-mono">{activeTree.mastery}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                      style={{ width: `${activeTree.mastery}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vertikal magistral chizig'i */}
            <div className="w-0.5 h-7 bg-gradient-to-b from-primary/50 to-border" />
          </div>

          {/* ============================================================ */}
          {/* 2. BRANCHES: HUJAYRA & GENETIKA (Ikki yo'nalish)              */}
          {/* ============================================================ */}
          <div className="w-full relative">
            {/* Gorizontal ulash chizig'i (Desktop) */}
            <div className="hidden sm:block absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-500/40 via-primary/50 to-cyan-500/40 -translate-y-4" />

            <div className="grid gap-6 sm:grid-cols-2">
              {activeTree.branches.map((branch, bIdx) => {
                const BranchIcon = branch.icon;
                return (
                  <div
                    key={branch.id}
                    className="relative flex flex-col items-center rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xs p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40"
                  >
                    {/* Boshlanish indikatori chizig'i */}
                    <div className="hidden sm:block absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-primary/40" />

                    {/* Branch Header */}
                    <div className="w-full flex items-center justify-between pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <BranchIcon className="size-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-foreground">
                            {branch.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            {branch.skills.length} ta asosiy ko&apos;nikma
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn("font-mono font-bold text-xs px-2 py-0.5 rounded-lg border", getMasteryBadgeClass(branch.mastery))}
                      >
                        {branch.mastery}%
                      </Badge>
                    </div>

                    {/* Vertikal bog'lanish chizig'i */}
                    <div className="w-0.5 h-4 bg-border my-1" />

                    {/* Skill Leaves: 3 ta pastki mavzular */}
                    <div className="w-full space-y-2.5">
                      {branch.skills.map((skill, sIdx) => {
                        const isMastered = skill.mastery >= 80;
                        return (
                          <div
                            key={skill.id}
                            className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono border",
                                isMastered
                                  ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/40"
                                  : "bg-muted text-muted-foreground border-border"
                              )}>
                                {isMastered ? <CheckCircle2 className="size-4" /> : `${sIdx + 1}`}
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                  {skill.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-20 sm:w-28 h-1.5 overflow-hidden rounded-full bg-muted p-0.2">
                                    <div
                                      className={cn("h-full rounded-full bg-gradient-to-r", getMasteryBarGradient(skill.mastery))}
                                      style={{ width: `${skill.mastery}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] font-extrabold text-foreground">
                                    {skill.mastery}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] font-bold text-amber-500 hidden sm:inline-block">
                                +{skill.xpReward} XP
                              </span>
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-bold rounded-lg group-hover:bg-primary group-hover:text-primary-foreground">
                                <Link href="/tests">
                                  <span>Mashq</span>
                                  <ChevronRight className="size-3 ml-0.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skill Tree Pastki xulosa va progressga undov */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>
                <strong>Skill Mastery qonuni:</strong> Skill ochiladi → Mashq qilinadi → Mastery oshadi → XP beriladi → Yangi Arena ochiladi!
              </span>
            </div>

            <Button asChild size="sm" className="rounded-xl font-bold gap-1 text-xs shrink-0">
              <Link href="/analytics">
                <span>To&apos;liq Skill Analitikasi</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
