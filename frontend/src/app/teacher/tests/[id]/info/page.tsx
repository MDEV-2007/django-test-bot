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
import { Switch } from '@/components/ui/switch';
import { Flame, Send, CheckCircle2 } from 'lucide-react';

type Subject = { id: number; name: string; slug: string };
type TestInfo = {
  id: number; title: string; subject_id: number | null; category: string;
  duration_minutes: number; description: string;
  is_live_mock?: boolean;
  scheduled_at?: string;
  notify_all?: boolean;
  notified_at?: string | null;
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
  const [broadcasting, setBroadcasting] = useState(false);

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
          is_live_mock: Boolean(info.is_live_mock),
          scheduled_at: info.scheduled_at || null,
          notify_all: info.notify_all !== false,
        }),
      });
      router.push(`/teacher/tests/${id}/build`);
    } catch {
      setError('Saqlashda xatolik yuz berdi.');
      setSaving(false);
    }
  }

  async function broadcastNow() {
    if (!info) return;
    const sendAll = info.notify_all !== false;
    const msg = sendAll
      ? "Diqqat! Telegram xabarnomasi botdagi BARCHA o'quvchilarga yuboriladi. Hozir yuborasizmi?"
      : "Telegram xabarnomasi faqat eslatma so'ragan (ro'yxatdan o'tgan) o'quvchilarga yuboriladi. Hozir yuborasizmi?";

    if (!confirm(msg)) return;

    setBroadcasting(true);
    try {
      const res = await apiFetch<{ ok: boolean; sent_count: number; fail_count: number; total: number; notified_at: string }>(
        `/api/tests/${id}/broadcast/`,
        {
          method: 'POST',
          body: JSON.stringify({ send_all: sendAll }),
        }
      );
      if (res.ok) {
        toast.success(`Telegram xabarnomasi yuborildi! (${res.sent_count} ta o'quvchiga yetdi)`);
        setInfo({ ...info, notified_at: res.notified_at });
      } else {
        toast.error("Xabar yuborishda xatolik yuz berdi");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xabarnoma yuborishda xatolik");
    } finally {
      setBroadcasting(false);
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

            {/* Katta Jonli Mock Imtihon Sozlamasi */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                    <Flame className="size-4 text-amber-500" /> Katta Jonli Mock Imtihon
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Belgilangan vaqtda boshlanadi, unga qadar sahifada taymer (Countdown) ko&apos;rinadi.
                  </p>
                </div>
                <Switch
                  checked={Boolean(info.is_live_mock)}
                  onCheckedChange={(checked) => setInfo({ ...info, is_live_mock: checked })}
                />
              </div>

              {info.is_live_mock && (
                <div className="space-y-4 pt-3 border-t border-amber-500/20">
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduled_at" className="text-xs font-semibold">
                      Boshlanish vaqti (Toshkent vaqti)
                    </Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={info.scheduled_at || ''}
                      onChange={(e) => setInfo({ ...info, scheduled_at: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Masalan: ertaga soat 21:30 uchun <b>2026-09-10T21:30</b> qilib belgilang.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-amber-500/20">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">Barcha bot foydalanuvchilariga e&apos;lon qilish</div>
                      <p className="text-[11px] text-muted-foreground">
                        {info.notify_all !== false
                          ? "Imtihon boshlanganda Telegramdagi barcha o'quvchilarga yuboriladi."
                          : "Faqat sahifada eslatma so'ragan o'quvchilarga yuboriladi."}
                      </p>
                    </div>
                    <Switch
                      checked={info.notify_all !== false}
                      onCheckedChange={(checked) => setInfo({ ...info, notify_all: checked })}
                    />
                  </div>

                  {info.notified_at ? (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="size-4" /> Telegram xabarnomasi yuborilgan
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={broadcasting}
                        onClick={broadcastNow}
                        className="h-7 text-xs"
                      >
                        {broadcasting ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground">
                        ⏳ 21:30 da cron orqali avtomatik jo&apos;natiladi
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={broadcasting}
                        onClick={broadcastNow}
                        className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-8 text-xs font-semibold"
                      >
                        <Send className="size-3 mr-1.5" />
                        {broadcasting ? 'Yuborilmoqda...' : "Hozir Telegramga yuborish"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
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
