'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = { id: number; name: string; slug: string };

// Backenddagi `Question.CATEGORY_CHOICES` bilan mos bo'lishi shart.
const CATEGORIES = [
  { value: 'history', label: 'Mavzulashtirilgan' },
  { value: 'certificate', label: 'Milliy Sertifikat' },
  { value: 'bba', label: 'BBA Imtihoni' },
  { value: 'cefr', label: 'CEFR (Ingliz tili)' },
];

export default function NewTestPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [category, setCategory] = useState('history');
  const [duration, setDuration] = useState(15);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ subjects: Subject[] }>('/api/tests/').then((d) => {
      setSubjects(d.subjects);
      if (d.subjects[0]) setSubjectId(String(d.subjects[0].id));
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: number }>('/api/teacher/tests/create/', {
        method: 'POST',
        body: JSON.stringify({ title, subject: subjectId, category, duration_minutes: duration, description }),
      });
      router.push(`/teacher/tests/${res.id}/build`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  return (
    <TeacherShell>
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Yangi test"
          description="Avval asosiy ma'lumotlar, keyin savollar qo'shiladi."
          backHref="/teacher/tests"
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
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Amir Temur davri — 20 savol" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fan</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kategoriya</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Davomiyligi (daqiqa)</Label>
              <Input id="duration" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <Button onClick={submit} disabled={saving || !title.trim()} size="lg" className="w-full">
              {saving ? 'Yaratilmoqda...' : "Yaratish va savol qo'shish"} <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
