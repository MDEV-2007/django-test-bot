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
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type Option = { value: string | number; label: string };

type TestSetEdit = {
  id: number; title: string; subject_id: number | null; description: string; category: string;
  duration_minutes: number; created_by_id: number | null;
  is_premium: boolean; is_published: boolean; is_archived: boolean;
  category_options: Option[]; subject_options: Option[];
};

const NO_SUBJECT = '__none__';

const TOGGLES: { key: 'is_premium' | 'is_published' | 'is_archived'; label: string; hint: string }[] = [
  { key: 'is_premium', label: 'Premium', hint: 'Faqat mock-test obunasi bor o‘quvchilarga ochiladi.' },
  { key: 'is_published', label: 'Nashr etilgan', hint: "O'chirilgan bo'lsa test markazida ko'rinmaydi." },
  { key: 'is_archived', label: 'Arxivlangan', hint: 'Arxivlangan test yangi urinishlar uchun yopiladi.' },
];

export default function PanelTestSetEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [ts, setTs] = useState<TestSetEdit | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<TestSetEdit>(`/api/panel/testsets/${id}/edit/`).then(setTs);
  }, [access, id]);

  async function submit() {
    if (!ts) return;
    setSaving(true);
    try {
      await apiFetch(`/api/panel/testsets/${id}/edit/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: ts.title, subject: ts.subject_id, description: ts.description, category: ts.category,
          duration_minutes: ts.duration_minutes, created_by: ts.created_by_id,
          is_premium: ts.is_premium, is_published: ts.is_published, is_archived: ts.is_archived,
        }),
      });
      toast.success('Test saqlandi');
      router.push(`/panel/tests/${id}`);
    } catch {
      toast.error('Saqlashda xatolik', { description: 'Maydonlarni tekshirib ko‘ring.' });
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/panel/testsets/${id}/edit/`, { method: 'DELETE' });
      toast.success("Test o'chirildi");
      router.push('/panel/tests');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
      setShowDelete(false);
    }
  }

  if (!ts) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-9 w-64" /><Skeleton className="h-96 w-full" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          backHref={`/panel/tests/${id}`}
          title="Testni tahrirlash"
          description={ts.title}
          actions={
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Asosiy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ts-title">Sarlavha</Label>
              <Input id="ts-title" value={ts.title} onChange={(e) => setTs({ ...ts, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-desc">Tavsif</Label>
              <Textarea id="ts-desc" rows={3} value={ts.description} onChange={(e) => setTs({ ...ts, description: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Fan</Label>
                <Select
                  value={ts.subject_id ? String(ts.subject_id) : NO_SUBJECT}
                  onValueChange={(v) => setTs({ ...ts, subject_id: v === NO_SUBJECT ? null : Number(v) })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUBJECT}>—</SelectItem>
                    {ts.subject_options.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kategoriya</Label>
                <Select value={ts.category} onValueChange={(v) => setTs({ ...ts, category: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ts.category_options.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-dur">Davomiyligi (daq)</Label>
                <Input id="ts-dur" type="number" value={ts.duration_minutes} onChange={(e) => setTs({ ...ts, duration_minutes: Number(e.target.value) })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Holat</CardTitle></CardHeader>
          <CardContent>
            {TOGGLES.map((t, i) => (
              <div key={t.key}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor={t.key} className="text-sm font-medium">{t.label}</Label>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </div>
                  <Switch id={t.key} checked={ts[t.key]} onCheckedChange={(v) => setTs({ ...ts, [t.key]: v })} />
                </div>
              </div>
            ))}
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
            <DialogTitle>Testni o&apos;chirish</DialogTitle>
            <DialogDescription>
              &laquo;{ts.title}&raquo; va uning savollari o&apos;chiriladi. O&apos;quvchilarning
              shu testdagi urinishlari ham yo&apos;qoladi.
            </DialogDescription>
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
