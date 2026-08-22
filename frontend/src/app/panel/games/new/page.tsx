'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Subject = { id: number; name: string };

const GAME_TYPES = [
  { value: 'flashcards', label: 'Flesh-kartalar' },
  { value: 'match_pairs', label: 'Juftlikni top' },
  { value: 'quiz_race', label: 'Tezkor viktorina' },
];
const NO_SUBJECT = '__none__';

export default function PanelNewGamePage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({
    title: '', game_type: 'flashcards', subject: '', description: '', is_published: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Subject[] }>('/api/panel/subjects/').then((d) => setSubjects(d.results));
  }, [access]);

  async function submit() {
    if (!form.title.trim()) {
      toast.error('Sarlavha kiritilishi shart.');
      return;
    }
    setSaving(true);
    try {
      // subject ixtiyoriy (modelda null=True) — tanlanmagan bo'lsa bo'sh qator yuboriladi.
      await apiFetch('/api/panel/games/', { method: 'POST', body: JSON.stringify(form) });
      toast.success("O'yin yaratildi");
      router.push('/panel/games');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader backHref="/panel/games" title="Yangi o'yin" description="Elementlar (kartalar/savollar) keyin qo'shiladi." />

        <Card>
          <CardHeader><CardTitle className="text-base">Ma&apos;lumotlar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ng-title">Sarlavha</Label>
              <Input id="ng-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Masalan: Temuriylar davri kartalari" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>O&apos;yin turi</Label>
                <Select value={form.game_type} onValueChange={(v) => setForm({ ...form, game_type: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fan (ixtiyoriy)</Label>
                <Select
                  value={form.subject || NO_SUBJECT}
                  onValueChange={(v) => setForm({ ...form, subject: v === NO_SUBJECT ? '' : v })}
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
              <Label htmlFor="ng-desc">Tavsif</Label>
              <Textarea id="ng-desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ng-pub" className="text-sm font-medium">Nashr etilgan</Label>
                <p className="text-xs text-muted-foreground">Elementlar qo&apos;shilgunicha qoralama qoldirish tavsiya etiladi.</p>
              </div>
              <Switch id="ng-pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/panel/games')}>Bekor qilish</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Yaratish
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
