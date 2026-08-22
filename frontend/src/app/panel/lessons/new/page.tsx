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

type Topic = { id: number; title: string };

export default function PanelNewLessonPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState({
    topic: '', title: '', content: '', video_url: '', is_published: false, order: 0,
  });
  const [saving, setSaving] = useState(false);

  // Mavzular /api/teacher/topics/ dan olinadi — IsTeacher ruxsati super adminni ham
  // o'tkazadi, shuning uchun panel uchun alohida endpoint kerak emas.
  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Topic[] }>('/api/teacher/topics/').then((d) => {
      setTopics(d.results);
      setForm((f) => (f.topic ? f : { ...f, topic: String(d.results[0]?.id ?? '') }));
    });
  }, [access]);

  async function submit() {
    if (!form.topic || !form.title.trim() || !form.content.trim()) {
      toast.error("Mavzu, sarlavha va matn to'ldirilishi shart.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/panel/lessons/', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Dars yaratildi');
      router.push('/panel/lessons');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader backHref="/panel/lessons" title="Yangi dars" description="Dars o'quv markazida shu mavzu ostida ko'rinadi." />

        <Card>
          <CardHeader><CardTitle className="text-base">Mazmun</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mavzu</Label>
              <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={topics.length ? 'Mavzuni tanlang' : 'Yuklanmoqda...'} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="n-title">Sarlavha</Label>
              <Input id="n-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Masalan: Amir Temur davlati" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="n-content">Dars matni</Label>
              <Textarea id="n-content" rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="HTML yoki Markdown" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="n-video">YouTube havolasi</Label>
                <Input id="n-video" type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="ixtiyoriy" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-order">Tartib</Label>
                <Input id="n-order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="n-pub" className="text-sm font-medium">Nashr etilgan</Label>
                <p className="text-xs text-muted-foreground">O&apos;chirilgan bo&apos;lsa dars qoralama sifatida saqlanadi.</p>
              </div>
              <Switch id="n-pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/panel/lessons')}>Bekor qilish</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Yaratish
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
