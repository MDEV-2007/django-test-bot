'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type GameDetail = {
  id: number; title: string; game_type: string; subject_id: number | null;
  description: string; is_published: boolean; created_by_id: number | null;
};
type Subject = { id: number; name: string };

const GAME_TYPES = [
  { value: 'flashcards', label: 'Flesh-kartalar' },
  { value: 'match_pairs', label: 'Juftlikni top' },
  { value: 'quiz_race', label: 'Tezkor viktorina' },
];
const NO_SUBJECT = '__none__';

export default function PanelGameEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<GameDetail>(`/api/panel/games/${id}/`).then(setGame);
    apiFetch<{ results: Subject[] }>('/api/panel/subjects/').then((d) => setSubjects(d.results));
  }, [access, id]);

  async function submit() {
    if (!game) return;
    setSaving(true);
    try {
      await apiFetch(`/api/panel/games/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: game.title, game_type: game.game_type, subject: game.subject_id,
          description: game.description, created_by: game.created_by_id, is_published: game.is_published,
        }),
      });
      toast.success("O'yin saqlandi");
      router.push('/panel/games');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/panel/games/${id}/`, { method: 'DELETE' });
      toast.success("O'yin o'chirildi");
      router.push('/panel/games');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
      setShowDelete(false);
    }
  }

  if (!game) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-9 w-64" /><Skeleton className="h-72 w-full" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          backHref="/panel/games"
          title={game.title || "O'yin"}
          description="O'yinni tahrirlash"
          actions={
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Ma&apos;lumotlar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-title">Sarlavha</Label>
              <Input id="g-title" value={game.title} onChange={(e) => setGame({ ...game, title: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>O&apos;yin turi</Label>
                <Select value={game.game_type} onValueChange={(v) => setGame({ ...game, game_type: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fan</Label>
                <Select
                  value={game.subject_id ? String(game.subject_id) : NO_SUBJECT}
                  onValueChange={(v) => setGame({ ...game, subject_id: v === NO_SUBJECT ? null : Number(v) })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUBJECT}>— Tanlanmagan —</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Tavsif</Label>
              <Textarea id="g-desc" rows={4} value={game.description} onChange={(e) => setGame({ ...game, description: e.target.value })} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="g-pub" className="text-sm font-medium">Nashr etilgan</Label>
                <p className="text-xs text-muted-foreground">Faqat nashr etilgan o&apos;yinlar o&apos;quvchilarga ko&apos;rinadi.</p>
              </div>
              <Switch id="g-pub" checked={game.is_published} onCheckedChange={(v) => setGame({ ...game, is_published: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Saqlash
          </Button>
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>O&apos;yinni o&apos;chirish</DialogTitle>
            <DialogDescription>&laquo;{game.title}&raquo; va uning barcha elementlari o&apos;chiriladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={remove}>O&apos;chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
