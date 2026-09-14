'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Star, Search, Filter, Radio, Award,
  Calendar, ArrowUpRight, TrendingUp, Sparkles, MessageCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SurveyItem = {
  id: number;
  user_name: string;
  username: string;
  test_id: number;
  test_title: string;
  is_live_mock: boolean;
  score: number | null;
  difficulty: string;
  difficulty_label: string;
  platform_rating: number;
  comment: string;
  created_at: string;
};

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

export default function TeacherSurveysPage() {
  const { access } = useAuthStore();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTestId, setSelectedTestId] = useState<string>('all');

  useEffect(() => {
    if (!access) return;
    (async () => {
      try {
        const res = await apiFetch<{ results: SurveyItem[]; count: number }>('/api/teacher/surveys/');
        setSurveys(res.results || []);
      } catch (err) {
        console.error('Surveys load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [access]);

  // Unique tests list for filtering
  const uniqueTests = useMemo(() => {
    const map = new Map<number, string>();
    surveys.forEach((s) => {
      if (!map.has(s.test_id)) {
        map.set(s.test_id, s.test_title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [surveys]);

  // Metrics
  const metrics = useMemo(() => {
    if (surveys.length === 0) {
      return { total: 0, avgRating: 0, withComments: 0 };
    }
    const total = surveys.length;
    const ratings = surveys.filter((s) => s.platform_rating > 0);
    const avgRating = ratings.length
      ? ratings.reduce((acc, s) => acc + s.platform_rating, 0) / ratings.length
      : 0;
    const withComments = surveys.filter((s) => s.comment && s.comment.trim().length > 0).length;

    return {
      total,
      avgRating: avgRating.toFixed(1),
      withComments,
    };
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (selectedDifficulty !== 'all' && s.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedTestId !== 'all' && String(s.test_id) !== selectedTestId) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = s.user_name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
        const matchTest = s.test_title.toLowerCase().includes(q);
        const matchComment = s.comment.toLowerCase().includes(q);
        if (!matchName && !matchTest && !matchComment) return false;
      }
      return true;
    });
  }, [surveys, selectedDifficulty, selectedTestId, query]);

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="O'quvchilar fikr va sharhlari"
          description="Siz tuzgan barcha oddiy va Live Mock testlar bo'yicha o'quvchilar qoldirgan baholar va izohlar"
        />

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Jami sharhlar</p>
                <p className="text-xl font-bold">{metrics.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Star className="size-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">O&apos;rtacha baho</p>
                <p className="text-xl font-bold">{metrics.avgRating} / 5.0</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
                <MessageCircle className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Yozma fikrlar</p>
                <p className="text-xl font-bold">{metrics.withComments}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="O'quvchi, test yoki sharh izlash..."
                className="pl-9 h-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                aria-label="Test bo'yicha saralash"
                className="h-9 px-3 text-xs rounded-md border border-input bg-background/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px] truncate"
              >
                <option value="all">Barcha testlar</option>
                {uniqueTests.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                aria-label="Qiyinchilik darajasi bo'yicha saralash"
                className="h-9 px-3 text-xs rounded-md border border-input bg-background/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Barcha qiyinchiliklar</option>
                <option value="easy">Oson</option>
                <option value="medium">O&apos;rtacha</option>
                <option value="hard">Qiyin</option>
                <option value="very_hard">Juda murakkab</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Review list */}
        {loading ? (
          <div className="py-16">
            <BrandLoader label="Sharhlar yuklanmoqda..." />
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card className="border-border/60 bg-card/40 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-muted/30 text-muted-foreground">
                <MessageSquare className="size-8" />
              </div>
              <p className="font-semibold text-foreground">Hech qanday sharh topilmadi</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                O&apos;quvchilar testlarni yakunlagandan so&apos;ng ularning fikrlari va baholari shu yerda aks etadi.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSurveys.map((survey) => {
              const diff = difficultyTone(survey.difficulty);
              return (
                <Card
                  key={survey.id}
                  className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{survey.user_name}</p>
                        <p className="text-xs text-muted-foreground">@{survey.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn('text-[11px] font-medium', diff.tone)}>
                          {diff.label}
                        </Badge>
                        {survey.score !== null && (
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {survey.score} ball
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Rating stars */}
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'size-3.5',
                              star <= survey.platform_rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                          {survey.platform_rating}/5
                        </span>
                      </div>

                      {/* Comment text */}
                      {survey.comment ? (
                        <div className="p-3 rounded-lg bg-background/70 border border-border/40 text-sm text-foreground leading-relaxed italic">
                          &ldquo;{survey.comment}&rdquo;
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">Yozma izoh qoldirilmagan</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/teacher/tests/${survey.test_id}/results`}
                        className="font-medium text-primary hover:underline flex items-center gap-1 truncate max-w-[240px]"
                        title={survey.test_title}
                      >
                        {survey.is_live_mock && (
                          <Radio className="size-3 text-rose-500 animate-pulse shrink-0" />
                        )}
                        <span className="truncate">{survey.test_title}</span>
                        <ArrowUpRight className="size-3 shrink-0" />
                      </Link>

                      <span className="text-muted-foreground shrink-0">
                        {new Date(survey.created_at).toLocaleDateString('uz-UZ', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
