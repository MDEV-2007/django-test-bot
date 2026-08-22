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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type LessonDetail = {
  id: number; topic_id: number; title: string; content: string; video_url: string;
  created_by_id: number | null; is_published: boolean; order: number;
};

export default function PanelLessonEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<LessonDetail>(`/api/panel/lessons/${id}/`).then(setLesson);
  }, [access, id]);

  async function submit() {
    if (!lesson) return;
    setSaving(true);
    try {
      await apiFetch(`/api/panel/lessons/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          topic: lesson.topic_id, title: lesson.title, content: lesson.content,
          video_url: lesson.video_url, created_by: lesson.created_by_id,
          is_published: lesson.is_published, order: lesson.order,
        }),
      });
      toast.success('Dars saqlandi');
      router.push('/panel/lessons');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/panel/lessons/${id}/`, { method: 'DELETE' });
      toast.success("Dars o'chirildi");
      router.push('/panel/lessons');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
      setShowDelete(false);
    }
  }

  if (!lesson) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-9 w-64" /><Skeleton className="h-80 w-full" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          backHref="/panel/lessons"
          title={lesson.title || 'Dars'}
          description="Darsni tahrirlash"
          actions={
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Mazmun</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="l-title">Sarlavha</Label>
              <Input id="l-title" value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-content">Dars matni</Label>
              <Textarea id="l-content" rows={10} value={lesson.content} onChange={(e) => setLesson({ ...lesson, content: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="l-video">YouTube havolasi</Label>
                <Input id="l-video" type="url" value={lesson.video_url} onChange={(e) => setLesson({ ...lesson, video_url: e.target.value })} placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-order">Tartib</Label>
                <Input id="l-order" type="number" value={lesson.order} onChange={(e) => setLesson({ ...lesson, order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="l-pub" className="text-sm font-medium">Nashr etilgan</Label>
                <p className="text-xs text-muted-foreground">Faqat nashr etilgan darslar o&apos;quvchilarga ko&apos;rinadi.</p>
              </div>
              <Switch id="l-pub" checked={lesson.is_published} onCheckedChange={(v) => setLesson({ ...lesson, is_published: v })} />
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
            <DialogTitle>Darsni o&apos;chirish</DialogTitle>
            <DialogDescription>&laquo;{lesson.title}&raquo; butunlay o&apos;chiriladi.</DialogDescription>
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
