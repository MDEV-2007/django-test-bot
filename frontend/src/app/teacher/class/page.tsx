'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Copy, Check, Send, TrendingDown, ChevronRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Student = {
  student_id: number; name: string; username: string; avatar_url: string | null;
  level: number; xp: number; tests: number; avg_score: number | null;
  last_active: string | null; joined_at: string;
};
type TopicRow = {
  topic_id: number; title: string; avg_score: number; answers: number;
  student_count: number; is_weak: boolean;
};
type ClassData = {
  teacher: { full_name: string; subject: string; institution: string; referral_code: string; telegram_link: string };
  summary: { student_count: number; active_last_week: number; class_avg_score: number | null; total_tests: number };
  students: Student[];
  topics: TopicRow[];
  weak_topics: TopicRow[];
};

function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-[var(--success-text)]';
  if (score >= 60) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

export default function TeacherClassPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<ClassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (!access) return;
    setOrigin(window.location.origin);
    apiFetch<ClassData>('/api/teacher/me/dashboard/')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [access]);

  const inviteLink = data ? `${origin}/register?ref=${data.teacher.referral_code}` : '';

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Havola nusxalandi');
    setTimeout(() => setCopied(false), 1800);
  }

  if (error) {
    return (
      <TeacherShell>
        <Card className="border-[var(--danger)]/30">
          <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
        </Card>
      </TeacherShell>
    );
  }
  if (!data) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  const s = data.summary;
  const subtitle = [data.teacher.full_name, data.teacher.subject, data.teacher.institution]
    .filter(Boolean).join(' · ');

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader title="Mening sinfim" description={subtitle} />

        {/* Taklif havolasi — sinfni yig'ishning yagona yo'li, shuning uchun eng tepada. */}
        <Card className="border-[var(--accent-border)] bg-primary/[0.05]">
          <CardContent className="space-y-3 pt-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="size-4 text-[var(--accent-text)]" /> O&apos;quvchilarni taklif qiling
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Shu havola orqali ro&apos;yxatdan o&apos;tgan har bir o&apos;quvchi avtomatik sizning
              sinfingizga qo&apos;shiladi. Telegram havolasi afzal — o&apos;quvchi botdan chiqmaydi.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value={inviteLink} className="max-w-md flex-1 font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Nusxalash">
                {copied ? <Check className="size-4 text-[var(--success-text)]" /> : <Copy className="size-4" />}
              </Button>
              {data.teacher.telegram_link && (
                <Button asChild>
                  <a href={data.teacher.telegram_link} target="_blank" rel="noopener noreferrer">
                    <Send className="size-4" /> Telegramda ulashish
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {[
            { label: "O'quvchilar", value: s.student_count },
            { label: 'Faol (7 kun)', value: s.active_last_week },
            { label: "O'rtacha ball", value: s.class_avg_score !== null ? `${s.class_avg_score}%` : '—' },
            { label: 'Yechilgan testlar', value: s.total_tests },
          ].map((tile, i) => (
            <Reveal key={tile.label} index={i}>
              <Card className="h-full gap-0 py-4">
                <CardContent className="px-4">
                  <p className="truncate text-xs text-muted-foreground">{tile.label}</p>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">{tile.value}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        {s.student_count === 0 && (
          <Card>
            <CardContent className="py-14 text-center">
              <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Sinfingizda hali o&apos;quvchi yo&apos;q. Yuqoridagi havolani sinf guruhingizga tashlang.
              </p>
            </CardContent>
          </Card>
        )}

        {data.weak_topics.length > 0 && (
          <Card className="border-[var(--danger)]/25 bg-[var(--danger)]/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="size-4 text-[var(--danger-text)]" /> Sinf qiynalayotgan mavzular
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Kamida 3 ta javob bo&apos;lgan va o&apos;rtacha ball 60% dan past mavzular.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.weak_topics.map((t) => (
                <div key={t.topic_id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{t.title}</span>
                    <span className={cn('shrink-0 font-mono font-bold', scoreTone(t.avg_score))}>
                      {t.avg_score}%
                    </span>
                  </div>
                  <Progress value={t.avg_score} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {t.student_count} o&apos;quvchi · {t.answers} ta javob
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.students.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">O&apos;quvchilar</CardTitle></CardHeader>
            <CardContent>
              {data.students.map((st, i) => (
                <div key={st.student_id}>
                  {i > 0 && <Separator />}
                  <Link
                    href={`/teacher/class/${st.student_id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-[var(--accent-text)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={st.avatar_url || undefined} alt={st.name} />
                        <AvatarFallback className="text-xs">{st.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{st.name}</p>
                        <p className="text-xs text-muted-foreground">Lvl {st.level} · {st.tests} ta test</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="outline" className={cn('font-mono', scoreTone(st.avg_score))}>
                        {st.avg_score !== null ? `${st.avg_score}%` : "hali yo'q"}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherShell>
  );
}
