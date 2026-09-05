'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type GameDetail = {
  id: number; title: string; game_type: string; subject_id: number | null;
  description: string; is_published: boolean; items: { front: string; back: string }[];
};

export default function EditGamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<GameDetail>(`/api/teacher/games/${id}/`).then(setGame)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  async function submit() {
    if (!game) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/teacher/games/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: game.title, game_type: game.game_type, subject: game.subject_id,
          description: game.description, publish: game.is_published, items: game.items,
        }),
      });
      router.push('/teacher/games');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    await apiFetch(`/api/teacher/games/${id}/`, { method: 'DELETE' });
    router.push('/teacher/games');
  }

  if (!game) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  const setItem = (i: number, patch: Partial<{ front: string; back: string }>) => {
    const items = [...game.items];
    items[i] = { ...items[i], ...patch };
    setGame({ ...game, items });
  };

  return (
    <TeacherShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title={game.title}
          description={`${game.items.length} ta karta`}
          backHref="/teacher/games"
          actions={
            <Button
              variant="outline"
              className="border-[var(--danger)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-soft)]"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        {error && (
          <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/[0.06]">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Sarlavha</Label>
              <Input id="title" value={game.title} onChange={(e) => setGame({ ...game, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Flesh-kartalar</Label>
              <p className="text-xs text-muted-foreground">
                Bo&apos;sh qatorlar saqlashda o&apos;tkazib yuboriladi.
              </p>
              <div className="space-y-2">
                {game.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={it.front}
                      onChange={(e) => setItem(i, { front: e.target.value })}
                      placeholder="Old tomon (savol)"
                    />
                    <Input
                      value={it.back}
                      onChange={(e) => setItem(i, { back: e.target.value })}
                      placeholder="Orqa tomon (javob)"
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="size-9 shrink-0 text-muted-foreground hover:text-[var(--danger-text)]"
                      aria-label="Qatorni olib tashlash"
                      onClick={() => setGame({ ...game, items: game.items.filter((_, idx) => idx !== i) })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setGame({ ...game, items: [...game.items, { front: '', back: '' }] })}
              >
                <Plus className="size-4" /> Karta qo&apos;shish
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Nashr etilgan</p>
                <p className="text-xs text-muted-foreground">O&apos;chirilsa o&apos;yin o&apos;quvchilarga ko&apos;rinmaydi.</p>
              </div>
              <Switch
                checked={game.is_published}
                onCheckedChange={(v) => setGame({ ...game, is_published: v })}
              />
            </div>

            <Button onClick={submit} disabled={saving} size="lg" className="w-full">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>O&apos;yinni o&apos;chirasizmi?</DialogTitle>
            <DialogDescription>
              Bu amalni bekor qilib bo&apos;lmaydi — o&apos;yin va uning barcha kartalari o&apos;chiriladi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>Bekor qilish</Button>
            <Button variant="destructive" className="flex-1" onClick={remove}>O&apos;chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeacherShell>
  );
}
