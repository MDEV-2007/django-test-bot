'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquareHeart, Star, Search, Filter, Sparkles, Award,
  Calendar, CheckCircle2, Flame, ThumbsUp, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface SurveyItem {
  id: number;
  user_name: string;
  username: string;
  test_title: string;
  score: number | null;
  correct_answers: number | null;
  difficulty: string;
  platform_rating: number;
  comment: string;
  created_at: string;
}

interface SurveysData {
  count: number;
  items: SurveyItem[];
}

const DIFFICULTY_MAP: Record<string, { label: string; tone: string; emoji: string }> = {
  easy: { label: 'Oson', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', emoji: '🟢' },
  medium: { label: "O'rtacha", tone: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400', emoji: '🟡' },
  hard: { label: 'Qiyin', tone: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400', emoji: '🔴' },
  very_hard: { label: 'Juda murakkab', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400', emoji: '🔥' },
};

export default function PanelSurveysPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<SurveysData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  function loadSurveys() {
    if (!access) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (filterRating) params.set('rating', filterRating);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);

    apiFetch<SurveysData>(`/api/panel/surveys/?${params.toString()}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Sharhlarni yuklashda xatolik');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSurveys();
  }, [access, filterRating, filterDifficulty]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadSurveys();
  }

  // Hisob-kitoblar
  const items = data?.items || [];
  const totalCount = data?.count || 0;
  const avgRating = items.length
    ? (items.reduce((acc, curr) => acc + curr.platform_rating, 0) / items.length).toFixed(1)
    : '5.0';
  const withComments = items.filter((i) => i.comment && i.comment.trim().length > 0);

  return (
    <PanelShell>
      <div className="space-y-6">
        
        {/* Sarlavha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquareHeart className="size-6 text-amber-500" /> O&apos;quvchilar Sharhlari &amp; So&apos;rovnomalar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mock imtihonlarni topshirgan o&apos;quvchilarning baholari, sharhlari va ijtimoiy dalillar (skrinshot uchun tayyor kartalar).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSurveys}
            className="gap-2 self-start sm:self-auto rounded-xl"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
          </Button>
        </div>

        {/* Statistika Kartalari */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jami Sharhlar</p>
                <p className="text-2xl font-black text-foreground mt-1">{totalCount}</p>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <MessageSquareHeart className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O&apos;rtacha Baho</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-2xl font-black text-foreground">{avgRating}</span>
                  <div className="flex items-center text-amber-400">
                    <Star className="size-4 fill-amber-400" />
                  </div>
                </div>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Star className="size-5 fill-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matnli Fikrlar</p>
                <p className="text-2xl font-black text-foreground mt-1">{withComments.length}</p>
              </div>
              <div className="size-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtr va Qidiruv */}
        <Card className="border-[var(--border-card)] bg-[var(--surface-card-soft)]">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="O'quvchi ismi, username, test nomi yoki sharh bo'yicha qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl bg-[var(--surface-card)] border-[var(--border-strong)] text-sm"
                />
              </div>

              {/* Yulduz bo'yicha filtr */}
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-auto"
              >
                <option value="">Barcha baholar</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 yulduz)</option>
                <option value="4">⭐⭐⭐⭐ (4 yulduz)</option>
                <option value="3">⭐⭐⭐ (3 yulduz)</option>
                <option value="2">⭐⭐ (2 yulduz)</option>
                <option value="1">⭐ (1 yulduz)</option>
              </select>

              {/* Qiyinlik bo'yicha filtr */}
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-auto"
              >
                <option value="">Barcha qiyinliklar</option>
                <option value="easy">🟢 Oson</option>
                <option value="medium">🟡 O&apos;rtacha</option>
                <option value="hard">🔴 Qiyin</option>
                <option value="very_hard">🔥 Juda murakkab</option>
              </select>

              <Button type="submit" size="sm" className="rounded-xl px-5 font-bold w-full sm:w-auto">
                Qidirish
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sharhlar Ro'yxati (Skrinshot olish uchun mukammal karta dizayni) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="py-16 text-center border-dashed">
            <CardContent className="space-y-3">
              <MessageSquareHeart className="size-12 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Hozircha sharhlar yo&apos;q</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                O&apos;quvchilar imtihonni topshirib bo&apos;lgach, ularning fikrlari va baholari avtomatik tarzda shu yerda paydo bo&apos;ladi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => {
              const diff = DIFFICULTY_MAP[item.difficulty] || DIFFICULTY_MAP.medium;
              const initials = (item.user_name || item.username || 'O')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card
                  key={item.id}
                  className="relative overflow-hidden border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-card-soft)] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Top Header: Foydalanuvchi ma'lumotlari */}
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">{item.user_name}</h4>
                          <p className="text-[11px] text-muted-foreground font-mono">@{item.username}</p>
                        </div>
                      </div>

                      {/* Yulduzchalar */}
                      <div className="flex items-center gap-0.5 shrink-0 bg-[var(--surface-hover)]/70 px-2 py-1 rounded-lg border border-[var(--border-card)]">
                        {Array.from({ length: 5 }).map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            className={`size-3.5 ${
                              sIdx < item.platform_rating
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]'
                                : 'text-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Body: Sharh matni */}
                  <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Test nomi va O'quvchi natijasi */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <Badge variant="outline" className="text-[10px] font-semibold truncate max-w-[200px] border-[var(--border-strong)]">
                          {item.test_title}
                        </Badge>
                        {item.score !== null && (
                          <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            Natija: {item.score.toFixed(0)}%
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${diff.tone}`}>
                          <span>{diff.emoji}</span> {diff.label}
                        </Badge>
                      </div>

                      {/* Sharh matni (Iqtibos uslubida) */}
                      {item.comment ? (
                        <div className="relative rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-3 text-xs leading-relaxed text-foreground italic shadow-inner">
                          <span className="text-amber-500 font-serif font-black text-sm mr-1">&ldquo;</span>
                          {item.comment}
                          <span className="text-amber-500 font-serif font-black text-sm ml-1">&rdquo;</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic py-1">
                          (Faqat baho va qiyinlik darajasi belgilangan, matn yozilmagan)
                        </p>
                      )}
                    </div>

                    {/* Sana */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-card)] text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {item.created_at}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Tasdiqlangan o&apos;quvchi
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
