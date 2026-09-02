'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = { id: number; name: string; slug: string };
type TestInfo = {
  id: number; title: string; subject_id: number | null; category: string;
  duration_minutes: number; description: string;
};

// Backenddagi `Question.CATEGORY_CHOICES` bilan mos bo'lishi shart.
const CATEGORIES = [
  { value: 'history', label: 'Mavzulashtirilgan' },
  { value: 'certificate', label: 'Milliy Sertifikat' },
  { value: 'bba', label: 'BBA Imtihoni' },
  { value: 'cefr', label: 'CEFR (Ingliz tili)' },
];

export default function TeacherTestInfoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<TestInfo>(`/api/teacher/tests/${id}/info/`).then(setInfo)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
    apiFetch<{ subjects: Subject[] }>('/api/tests/').then((d) => setSubjects(d.subjects))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  async function submit() {
    if (!info) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/teacher/tests/${id}/info/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: info.title, subject: info.subject_id, category: info.category,
          duration_minutes: info.duration_minutes, description: info.description,
        }),
      });
      router.push(`/teacher/tests/${id}/build`);
    } catch {
      setError('Saqlashda xatolik yuz berdi.');
      setSaving(false);
    }
  }

  if (!info) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Test ma'lumotlari"
          description="Sarlavha, fan, kategoriya va davomiylik."
          backHref={`/teacher/tests/${id}/build`}
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
              <Input id="title" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fan</Label>
                <Select
                  value={info.subject_id ? String(info.subject_id) : ''}
                  onValueChange={(v) => setInfo({ ...info, subject_id: Number(v) })}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kategoriya</Label>
                <Select value={info.category} onValueChange={(v) => setInfo({ ...info, category: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Davomiyligi (daqiqa)</Label>
              <Input
                id="duration" type="number" min={1} value={info.duration_minutes}
                onChange={(e) => setInfo({ ...info, duration_minutes: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description" rows={3} value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
              />
            </div>

            <Button onClick={submit} disabled={saving} size="lg" className="w-full">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
