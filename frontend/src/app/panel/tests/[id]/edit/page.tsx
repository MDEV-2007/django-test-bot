'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Flame, Send, CheckCircle2 } from 'lucide-react';
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
  is_live_mock?: boolean; scheduled_at?: string;
  notify_all?: boolean; notified_at?: string | null;
  /* Urinishlar soni — o'chirish mumkinmi yoki yo'qligini shu belgilaydi (server
     urinishlari bor testni o'chirmaydi, o'quvchilar natijasi yo'qolmasligi uchun). */
  attempt_count: number;
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
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<TestSetEdit>(`/api/panel/testsets/${id}/edit/`).then(setTs)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
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
          is_live_mock: Boolean(ts.is_live_mock),
          scheduled_at: ts.scheduled_at || null,
          notify_all: ts.notify_all !== false,
        }),
      });
      toast.success('Test saqlandi');
      router.push(`/panel/tests/${id}`);
    } catch {
      toast.error('Saqlashda xatolik', { description: 'Maydonlarni tekshirib ko‘ring.' });
      setSaving(false);
    }
  }

  async function broadcastNow() {
    if (!ts) return;
    const sendAll = ts.notify_all !== false;
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
        setTs({ ...ts, notified_at: res.notified_at });
      } else {
        toast.error("Xabar yuborishda xatolik yuz berdi");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xabarnoma yuborishda xatolik");
    } finally {
      setBroadcasting(false);
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

  async function archive() {
    if (!ts) return;
    try {
      await apiFetch(`/api/panel/testsets/${id}/edit/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: ts.title, subject: ts.subject_id ?? '', description: ts.description,
          category: ts.category, duration_minutes: ts.duration_minutes,
          created_by: ts.created_by_id ?? '',
          is_premium: ts.is_premium, is_published: false, is_archived: true,
        }),
      });
      toast.success('Test arxivlandi');
      router.push('/panel/tests');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Arxivlashda xatolik');
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
                    <SelectItem value={NO_SUBJECT}>Biriktirilmagan</SelectItem>
                    {ts.subject_options.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kategoriya</Label>
                <Select value={ts.category} onValueChange={(v) => setTs({ ...ts, category: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ts.category_options.map((c) => (
                      <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-dur">Davomiyligi (daq.)</Label>
                <Input
                  id="ts-dur" type="number" min={1} value={ts.duration_minutes}
                  onChange={(e) => setTs({ ...ts, duration_minutes: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Katta Jonli Mock Imtihon */}
        <Card className="border-amber-500/30 bg-amber-500/[0.04]">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Flame className="size-4 text-amber-500" /> Katta Jonli Mock Imtihon
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Belgilangan aniq vaqtda o&apos;tkaziladi, unga qadar sahifada taymer (Countdown) yuradi.
                </p>
              </div>
              <Switch
                checked={Boolean(ts.is_live_mock)}
                onCheckedChange={(v) => setTs({ ...ts, is_live_mock: v })}
              />
            </div>
          </CardHeader>

          {ts.is_live_mock && (
            <CardContent className="space-y-4 pt-0 border-t border-amber-500/20">
              <div className="space-y-1.5 pt-4">
                <Label htmlFor="scheduled_at" className="text-xs font-semibold">
                  Boshlanish vaqti (Toshkent vaqti)
                </Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={ts.scheduled_at || ''}
                  onChange={(e) => setTs({ ...ts, scheduled_at: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Masalan: <b>2026-09-10T21:30</b> (Ertaga soat 21:30)
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-amber-500/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">Barcha bot foydalanuvchilariga e&apos;lon qilish</div>
                  <p className="text-[11px] text-muted-foreground">
                    {ts.notify_all !== false
                      ? "Imtihon boshlanganda Telegramdagi barcha o'quvchilarga yuboriladi."
                      : "Faqat sahifada eslatma so'ragan o'quvchilarga yuboriladi."}
                  </p>
                </div>
                <Switch
                  checked={ts.notify_all !== false}
                  onCheckedChange={(v) => setTs({ ...ts, notify_all: v })}
                />
              </div>

              {ts.notified_at ? (
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
            </CardContent>
          )}
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

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push(`/panel/tests/${id}`)}>Bekor qilish</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Saqlash
          </Button>
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testni o&apos;chirish</DialogTitle>
            <DialogDescription>
              {ts.attempt_count > 0 ? (
                <>
                  Bu testda <b>{ts.attempt_count} ta urinish</b> bor. O&apos;quvchilar
                  natijasi yo&apos;qolmasligi uchun uni o&apos;chirish mumkin emas.
                  O&apos;rniga <b>arxivlash</b> tavsiya etiladi: test katalogdan
                  yo&apos;qoladi, yangi urinishlar yopiladi, ammo eski natijalar saqlanadi.
                </>
              ) : (
                "Haqiqatan ham ushbu testni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Bekor qilish</Button>
            {ts.attempt_count > 0 ? (
              <Button onClick={archive}>Arxivlash</Button>
            ) : (
              <Button variant="destructive" onClick={remove}>Ha, o&apos;chirish</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
