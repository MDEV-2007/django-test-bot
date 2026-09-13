'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Radio, Calendar, Bell, Sparkles } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = { id: number; name: string; slug: string };

const CATEGORIES = [
  { value: 'history', label: 'Mavzulashtirilgan (Standart fan testi)' },
  { value: 'certificate', label: 'Milliy Sertifikat formati' },
  { value: 'bba', label: 'BBA (DTM) imtihon formati' },
  { value: 'cefr', label: 'CEFR (Ingliz tili / Til partlari)' },
];

export default function NewTestPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [category, setCategory] = useState('certificate');
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [isLiveMock, setIsLiveMock] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notifyAll, setNotifyAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ subjects: Subject[] }>('/api/tests/').then((d) => {
      setSubjects(d.subjects);
      if (d.subjects[0]) setSubjectId(String(d.subjects[0].id));
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  function handleLiveMockToggle(checked: boolean) {
    setIsLiveMock(checked);
    if (checked) {
      if (category === 'history') setCategory('certificate');
      if (duration < 30) setDuration(60);
      if (!scheduledAt) {
        // Default qilib bugun yoki ertaga soat 20:00 ni belgilash
        const d = new Date();
        d.setHours(20, 0, 0, 0);
        if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledAt(iso);
      }
    }
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Test sarlavhasini kiriting");
      return;
    }
    if (!subjectId) {
      toast.error("Fanni tanlang");
      return;
    }
    if (isLiveMock && !scheduledAt) {
      toast.error("Jonli mock uchun boshlanish vaqtini belgilang");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: number }>('/api/teacher/tests/create/', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          subject: subjectId,
          category,
          duration_minutes: duration,
          description: description.trim(),
          is_live_mock: isLiveMock,
          scheduled_at: isLiveMock ? (scheduledAt || null) : null,
          notify_all: isLiveMock ? notifyAll : false,
        }),
      });
      toast.success(isLiveMock ? "Jonli Mock imtihon yaratildi!" : "Yangi test yaratildi!");
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
          title="Yangi test yoki Jonli Mock"
          description="Avval asosiy ma'lumotlar va rejalashtirish, keyin savollar qo'shiladi."
          backHref="/teacher/tests"
        />

        {error && (
          <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/[0.06]">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-5 pt-6">
            {/* Live Mock switch kartasi */}
            <div className={`p-4 rounded-xl border transition-all ${
              isLiveMock
                ? 'border-rose-500/50 bg-rose-500/10 shadow-sm'
                : 'border-border/60 bg-muted/20 hover:bg-muted/40'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`size-8 rounded-lg flex items-center justify-center ${
                    isLiveMock ? 'bg-rose-500 text-white animate-pulse' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Radio className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="live-mock-toggle" className="text-sm font-semibold cursor-pointer">
                        Jonli Mock Imtihon (Live Mock)
                      </Label>
                      {isLiveMock && (
                        <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 font-bold uppercase">
                          Jonli
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Belgilangan vaqtda barcha o&apos;quvchilar bilan bir vaqtda boshlanadigan rasmiy mock imtihon.
                    </p>
                  </div>
                </div>
                <Switch
                  id="live-mock-toggle"
                  checked={isLiveMock}
                  onCheckedChange={handleLiveMockToggle}
                />
              </div>

              {/* Live Mock qo'shimcha parametrlari */}
              {isLiveMock && (
                <div className="mt-4 pt-3 border-t border-rose-500/20 space-y-3.5 animate-in fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="sched-time" className="text-xs font-semibold flex items-center gap-1.5 text-rose-300">
                      <Calendar className="size-3.5" /> Boshlanish sanasi va vaqti:
                    </Label>
                    <Input
                      id="sched-time"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required={isLiveMock}
                      className="border-rose-500/30 bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      O&apos;quvchilar sahifasida ushbu vaqtga qadar kutilma taymer ko&apos;rsatiladi.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-all" className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                        <Bell className="size-3 text-amber-400" /> Telegram xabarnoma yuborish
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Barcha o&apos;quvchilarga bot orqali imtihon haqida e&apos;lon boradi
                      </p>
                    </div>
                    <Switch
                      id="notif-all"
                      checked={notifyAll}
                      onCheckedChange={setNotifyAll}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test nomi */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Sarlavha <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isLiveMock ? "Masalan: Ona tili – Milliy Sertifikat Katta Jonli Mock" : "Masalan: Amir Temur davri — 20 savol"}
                required
              />
            </div>

            {/* Fan va Kategoriya */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fan <span className="text-rose-500">*</span></Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format / Kategoriya</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Davomiyligi */}
            <div className="space-y-2">
              <Label htmlFor="duration">Ajratilgan vaqt (daqiqa)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            {/* Tavsif */}
            <div className="space-y-2">
              <Label htmlFor="description">Tavsif yoki o&apos;quvchilarga ko&apos;rsatma (ixtiyoriy)</Label>
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Imtihon tartibi yoki tavsiyalar..."
              />
            </div>

            <Button
              onClick={submit}
              disabled={saving || !title.trim()}
              size="lg"
              className={`w-full font-semibold gap-2 ${isLiveMock ? 'bg-rose-600 hover:bg-rose-500 text-white' : ''}`}
            >
              {saving ? 'Yaratilmoqda...' : isLiveMock ? "Jonli Mockni yaratish va savollar kiritish" : "Yaratish va savol qo'shish"}
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
