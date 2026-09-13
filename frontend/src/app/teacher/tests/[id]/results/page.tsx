'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList, PenLine, Download, ShieldAlert, Award, MessageSquare,
  BarChart3, CheckCircle2, AlertTriangle, Zap, Radio, Calendar, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import CertificateModal from '@/components/student/CertificateModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AttemptRow = {
  id: number;
  student: string;
  username: string;
  telegram_username?: string;
  score: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  skipped_answers: number | null;
  total_questions: number;
  tab_switch_count: number;
  is_speed_flagged: boolean;
  started_at: string;
  completed_at?: string;
};

type SurveyRow = {
  id: number;
  user_name: string;
  username: string;
  score: number | null;
  difficulty: string;
  difficulty_label: string;
  platform_rating: number;
  comment: string;
  created_at: string;
};

type ResultsData = {
  test: {
    id: number;
    title: string;
    is_live_mock: boolean;
    scheduled_at: string | null;
    subject: string | null;
    category: string;
  };
  summary: {
    total_attempts: number;
    average_score: number;
    cheater_count: number;
    speed_flagged_count: number;
    reviews_count: number;
  };
  attempts: AttemptRow[];
  stats: { question_id: number; body: string; total: number; correct: number; pct: number }[];
  surveys: SurveyRow[];
};

function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-[var(--success-text)]';
  if (score >= 60) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

function difficultyTone(diff: string) {
  switch (diff) {
    case 'easy':
      return { tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Oson' };
    case 'hard':
      return { tone: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Qiyin' };
    case 'very_hard':
      return { tone: 'text-rose-400 bg-rose-500/10 border-rose-500/30', label: 'Juda murakkab' };
    default:
      return { tone: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: "O'rtacha" };
  }
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<ResultsData | null>(null);
  const [tab, setTab] = useState<'attempts' | 'surveys' | 'stats'>('attempts');

  // Sertifikat modali holati
  const [certModal, setCertModal] = useState<{
    open: boolean;
    studentName: string;
    testTitle: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    date: string;
    attemptId: number;
  }>({
    open: false,
    studentName: '',
    testTitle: '',
    score: 0,
    correctCount: 0,
    totalQuestions: 0,
    date: '',
    attemptId: 0,
  });

  useEffect(() => {
    if (!access) return;
    apiFetch<ResultsData>(`/api/teacher/tests/${id}/results/`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  function exportResults() {
    if (!data || data.attempts.length === 0) {
      toast.error("Eksport qilish uchun urinishlar mavjud emas");
      return;
    }
    const headers = [
      "#", "O'quvchi", "Username", "Ball (%)", "To'g'ri", "Xato", "Qoldirilgan",
      "Tab almashtirishlar (Anti-cheat)", "Shubhali tezlik", "Topshirilgan vaqt"
    ];
    const rows = data.attempts.map((a, idx) => [
      idx + 1,
      `"${(a.student || '').replace(/"/g, '""')}"`,
      `"@${a.username}"`,
      a.score !== null ? `${a.score.toFixed(0)}%` : '—',
      a.correct_answers ?? '—',
      a.wrong_answers ?? '—',
      a.skipped_answers ?? '—',
      a.tab_switch_count || 0,
      a.is_speed_flagged ? "HA (Shubhali)" : "YO'Q",
      `"${new Date(a.started_at).toLocaleString('uz-UZ')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.test.title}_natijalar.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Natijalar Excel (.csv) formatida yuklab olindi");
  }

  function openCertificate(a: AttemptRow) {
    if (!data) return;
    setCertModal({
      open: true,
      studentName: a.student || a.username,
      testTitle: data.test.title,
      score: a.score || 0,
      correctCount: a.correct_answers || 0,
      totalQuestions: a.total_questions || 30,
      date: a.completed_at || a.started_at,
      attemptId: a.id,
    });
  }

  if (!data) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title={data.test.title}
          description={
            <span className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              {data.test.is_live_mock && (
                <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold gap-1 py-0.5">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                  Jonli Mock
                </Badge>
              )}
              <span>{data.test.subject || 'Fan'}</span>
              <span>·</span>
              <span>{data.summary.total_attempts} ta urinish</span>
              <span>·</span>
              <span>O&apos;rtacha: {data.summary.average_score}%</span>
            </span>
          }
          backHref={`/teacher/tests/${id}/build`}
          actions={
            data.attempts.length > 0 ? (
              <Button variant="outline" size="sm" onClick={exportResults} className="gap-1.5">
                <Download className="size-4" /> Excel (.csv) yuklab olish
              </Button>
            ) : undefined
          }
        />

        {/* 4 ta umumiy statistika kartalari */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Card className="gap-0 py-3.5">
            <CardContent className="px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5 text-primary" /> Qatnashuvchilar
              </div>
              <p className="mt-1 font-mono text-xl font-bold">{data.summary.total_attempts}</p>
            </CardContent>
          </Card>

          <Card className="gap-0 py-3.5">
            <CardContent className="px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BarChart3 className="size-3.5 text-emerald-400" /> O&apos;rtacha ball
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-400">{data.summary.average_score}%</p>
            </CardContent>
          </Card>

          <Card className={`gap-0 py-3.5 border ${data.summary.cheater_count > 0 ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
            <CardContent className="px-4">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <ShieldAlert className="size-3.5" /> Anti-Cheat (Tab almashtirish)
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-amber-400">
                {data.summary.cheater_count} <span className="text-xs font-normal text-muted-foreground">o&apos;quvchi</span>
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 py-3.5">
            <CardContent className="px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5 text-sky-400" /> Sharh va baholar
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-sky-400">{data.summary.reviews_count}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab tugmalari */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <Button
            variant={tab === 'attempts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('attempts')}
            className="text-xs h-8 gap-1.5"
          >
            <ClipboardList className="size-3.5" /> O&apos;quvchilar natijalari ({data.attempts.length})
          </Button>
          <Button
            variant={tab === 'surveys' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('surveys')}
            className="text-xs h-8 gap-1.5"
          >
            <MessageSquare className="size-3.5" /> Sharhlar ({data.surveys.length})
          </Button>
          <Button
            variant={tab === 'stats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('stats')}
            className="text-xs h-8 gap-1.5"
          >
            <BarChart3 className="size-3.5" /> Savollar tahlili ({data.stats.length})
          </Button>
        </div>

        {/* 1-TAB: O'quvchilar natijalari va Anti-Cheat */}
        {tab === 'attempts' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Topshirgan o&apos;quvchilar ro&apos;yxati</CardTitle>
              <CardDescription>
                O&apos;quvchilar natijalari, Anti-Cheat ogohlantirishlari va sertifikatlari.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.attempts.length === 0 ? (
                <div className="py-10 text-center">
                  <ClipboardList className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Bu testni hali hech kim yechmagan.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {data.attempts.map((a) => {
                    const isCheater = a.tab_switch_count >= 3;
                    return (
                      <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">{a.student}</p>
                            <span className="text-xs text-muted-foreground font-mono">@{a.username}</span>

                            {/* Anti-cheat indikatorlari */}
                            {isCheater && (
                              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-semibold gap-1 px-1.5 py-0">
                                <AlertTriangle className="size-3" /> {a.tab_switch_count}x tab almashtirgan
                              </Badge>
                            )}
                            {a.is_speed_flagged && (
                              <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px] font-semibold gap-1 px-1.5 py-0">
                                <Zap className="size-3" /> Shubhali tezlik
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>To&apos;g&apos;ri: <b className="text-emerald-400">{a.correct_answers ?? 0}</b></span>
                            <span>·</span>
                            <span>Xato: <b className="text-rose-400">{a.wrong_answers ?? 0}</b></span>
                            <span>·</span>
                            <span>{new Date(a.started_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Ball ko'rsatkichi */}
                          <span className={cn('font-mono text-base font-bold px-2 py-0.5 rounded bg-muted/30', scoreTone(a.score))}>
                            {a.score !== null ? `${a.score.toFixed(0)}%` : '—'}
                          </span>

                          {/* Sertifikat ko'rish/yuklash tugmasi */}
                          {a.score !== null && a.score >= 40 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCertificate(a)}
                              className="h-8 text-xs gap-1 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                            >
                              <Award className="size-3.5 text-amber-400" /> Sertifikat
                            </Button>
                          )}

                          {/* Yozma baholash */}
                          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <Link href={`/teacher/tests/${id}/attempts/${a.id}/grade`}>
                              <PenLine className="size-3" /> Baholash
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2-TAB: O'quvchilar fikrlari va sharhlari */}
        {tab === 'surveys' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">O&apos;quvchilar qoldirgan sharhlar</CardTitle>
              <CardDescription>
                Testni topshirgan o&apos;quvchilar uning qiyinligi va sifati haqida qoldirgan mulohazalari.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.surveys.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  Hozircha hech qanday sharh qoldirilmagan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {data.surveys.map((s) => {
                    const diff = difficultyTone(s.difficulty);
                    return (
                      <div key={s.id} className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{s.user_name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">@{s.username}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${diff.tone}`}>
                              {diff.label}
                            </Badge>
                            {s.score !== null && (
                              <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                {s.score.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {s.comment ? (
                          <p className="text-xs text-foreground/90 italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                            &ldquo;{s.comment}&rdquo;
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            (Faqat qiyinlik darajasi belgilangan, matn yozilmagan)
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                          <span>{new Date(s.created_at).toLocaleDateString('uz-UZ')}</span>
                          <span className="text-amber-400 font-bold">★ {s.platform_rating}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3-TAB: Savollar tahlili */}
        {tab === 'stats' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Savollar bo&apos;yicha statistika</CardTitle>
              <CardDescription>
                Har bir savolga to&apos;g&apos;ri javob berganlar foizi. Past foizli savollar o&apos;quvchilarga qiyinchilik tug&apos;dirgan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {data.stats.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Hali javob berilmagan.</p>
              ) : (
                data.stats.map((s, idx) => (
                  <div key={s.question_id} className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-xs text-muted-foreground mr-1">#{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-xs" dangerouslySetInnerHTML={{ __html: s.body }} />
                      <span className={cn('shrink-0 font-mono font-bold text-xs', scoreTone(s.pct))}>
                        {s.pct}% <span className="font-normal text-muted-foreground">({s.correct}/{s.total})</span>
                      </span>
                    </div>
                    <Progress value={s.pct} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Sertifikat Modali */}
        <CertificateModal
          open={certModal.open}
          onOpenChange={(open) => setCertModal({ ...certModal, open })}
          studentName={certModal.studentName}
          testTitle={certModal.testTitle}
          score={certModal.score}
          correctCount={certModal.correctCount}
          totalQuestions={certModal.totalQuestions}
          date={certModal.date}
          attemptId={certModal.attemptId}
        />
      </div>
    </TeacherShell>
  );
}
