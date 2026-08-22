'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Topic = { id: number; title: string };

export default function NewLessonPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Topic[] }>('/api/teacher/topics/').then((d) => {
      setTopics(d.results);
      if (d.results[0]) setTopicId(String(d.results[0].id));
    });
  }, [access]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: number }>('/api/teacher/lessons/create/', {
        method: 'POST',
        body: JSON.stringify({ topic: topicId, title, content, video_url: videoUrl, order: 0, publish }),
      });
      router.push(`/teacher/lessons/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  return (
    <TeacherShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Yangi dars" description="Mavzu, matn va ixtiyoriy video havolasi." backHref="/teacher/lessons" />

        {error && (
          <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/[0.06]">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Mavzu</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Mavzuni tanlang" /></SelectTrigger>
                <SelectContent>
                  {topics.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Sarlavha</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Dars matni</Label>
              <Textarea id="content" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video havola (ixtiyoriy)</Label>
              <Input id="video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Darhol nashr etish</p>
                <p className="text-xs text-muted-foreground">Nashr etilmagan dars faqat sizga ko&apos;rinadi.</p>
              </div>
              <Switch checked={publish} onCheckedChange={setPublish} />
            </div>

            <Button onClick={submit} disabled={saving || !title.trim()} size="lg" className="w-full">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
