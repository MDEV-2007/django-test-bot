'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type GameRow = { id: number; title: string; game_type: string; is_published: boolean; items_count: number };

export default function TeacherGamesPage() {
  const { access } = useAuthStore();
  const [games, setGames] = useState<GameRow[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: GameRow[] }>('/api/teacher/games/').then((d) => setGames(d.results))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="O'yinlarim"
          description="Flesh-kartalar va boshqa mashq o'yinlari."
          actions={<Button asChild><Link href="/teacher/games/new"><Plus className="size-4" /> Yangi o&apos;yin</Link></Button>}
        />

        {!games && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[66px] w-full" />)}
          </div>
        )}

        {games?.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center">
              <Gamepad2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hali o&apos;yin yaratilmagan.</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/teacher/games/new">Birinchi o&apos;yinni yaratish</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {games?.map((g, i) => (
            <Reveal key={g.id} index={i}>
              <Link href={`/teacher/games/${g.id}`} className="group block">
                <Card className="gap-0 py-0 transition-colors group-hover:border-[var(--accent-border)]">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">
                        {g.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {g.game_type} · {g.items_count} ta element
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={g.is_published ? 'outline' : 'secondary'}
                        className={g.is_published ? 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]' : ''}
                      >
                        {g.is_published ? 'Nashr etilgan' : 'Qoralama'}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </TeacherShell>
  );
}
