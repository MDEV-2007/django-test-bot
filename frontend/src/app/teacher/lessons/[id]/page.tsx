'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type Topic = { id: number; title: string };
type LessonDetail = {
  id: number; topic_id: number; title: string; content: string; video_url: string;
  order: number; is_published: boolean;
};

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Topic[] }>('/api/teacher/topics/').then((d) => setTopics(d.results));
    apiFetch<LessonDetail>(`/api/teacher/lessons/${id}/`).then(setLesson);
  }, [access, id]);

  async function submit() {
    if (!lesson) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/teacher/lessons/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          topic: lesson.topic_id, title: lesson.title, content: lesson.content,
          video_url: lesson.video_url, order: lesson.order, publish: lesson.is_published,
        }),
      });
      router.push('/teacher/lessons');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    await apiFetch(`/api/teacher/lessons/${id}/`, { method: 'DELETE' });
    router.push('/teacher/lessons');
  }

  if (!lesson) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Darsni tahrirlash"
          backHref="/teacher/lessons"
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
              <Label>Mavzu</Label>
              <Select
                value={String(lesson.topic_id)}
                onValueChange={(v) => setLesson({ ...lesson, topic_id: Number(v) })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Mavzuni tanlang" /></SelectTrigger>
                <SelectContent>
                  {topics.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Sarlavha</Label>
              <Input id="title" value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Dars matni</Label>
              <Textarea
                id="content" rows={10} value={lesson.content}
                onChange={(e) => setLesson({ ...lesson, content: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video havola</Label>
              <Input
                id="video" value={lesson.video_url} placeholder="https://..."
                onChange={(e) => setLesson({ ...lesson, video_url: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Nashr etilgan</p>
                <p className="text-xs text-muted-foreground">O&apos;chirilsa dars o&apos;quvchilarga ko&apos;rinmaydi.</p>
              </div>
              <Switch
                checked={lesson.is_published}
                onCheckedChange={(v) => setLesson({ ...lesson, is_published: v })}
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
            <DialogTitle>Darsni o&apos;chirasizmi?</DialogTitle>
            <DialogDescription>
              Bu amalni bekor qilib bo&apos;lmaydi — dars butunlay o&apos;chiriladi.
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
