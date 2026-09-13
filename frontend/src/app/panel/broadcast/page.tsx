'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, Users, Image as ImageIcon, Megaphone, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiUpload, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type HistoryRow = {
  id: number;
  title: string;
  audience: string;
  recipients_count: number;
  telegram_sent_count: number;
  sent_at: string;
  image: string | null;
  scheduled_at?: string | null;
  is_sent?: boolean;
};

type BroadcastData = { history: HistoryRow[]; audience_counts: Record<string, number> };

const AUDIENCES = [
  { value: 'all', label: 'Barchasi' },
  { value: 'students', label: "O'quvchilar" },
  { value: 'teachers', label: "O'qituvchilar" },
  { value: 'premium', label: 'Premium' },
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));

export default function PanelBroadcastPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<BroadcastData | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [viaTelegram, setViaTelegram] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HistoryRow | null>(null);

  // Broadcast Scheduler
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  const load = () => apiFetch<BroadcastData>('/api/panel/broadcast/').then(setData)
    .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipients = data?.audience_counts[audience];

  async function handleSendOrSchedule() {
    if (!title.trim() || !message.trim()) {
      toast.error("Sarlavha va xabar matni to'ldirilishi shart.");
      return;
    }

    if (isScheduled && !scheduledDateTime) {
      toast.error("Rejalashtirish vaqtini tanlang.");
      return;
    }

    setSending(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('message', message);
      form.append('audience', audience);
      form.append('via_telegram', viaTelegram ? 'true' : '');
      if (image) form.append('image', image);

      if (isScheduled) {
        form.append('scheduled_at', scheduledDateTime);
        const res = await apiUpload<{ id: number; message: string }>('/api/panel/broadcast/schedule/', form);
        toast.success(res.message || "Xabar belgilangan vaqtga rejalashtirildi!");
      } else {
        const res = await apiUpload<{ recipients_count: number; telegram_sent_count: number; photo_failed_count: number }>('/api/panel/broadcast/', form);
        toast.success(
          `${res.recipients_count} foydalanuvchiga yuborildi`,
          viaTelegram ? { description: `${res.telegram_sent_count} tasiga Telegram orqali yetkazildi.` } : undefined,
        );
        if (res.photo_failed_count > 0) {
          toast.warning(`${res.photo_failed_count} ta yuborishda rasm o'tmadi — xabar matn holida ketdi.`);
        }
      }

      setTitle('');
      setMessage('');
      setImage(null);
      setIsScheduled(false);
      setScheduledDateTime('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isScheduled ? 'Rejalashtirishda xatolik' : 'Yuborishda xatolik'));
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await apiFetch(`/api/panel/broadcast/${pendingDelete.id}/delete/`, { method: 'DELETE' });
      toast.success("Xabar tarixdan o'chirildi");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title="Xabar yuborish & Rejalashtirish"
          description="Sayt ichidagi bildirishnoma, ixtiyoriy ravishda Telegram orqali ham darhol yoki kelajakda avtomatik yuborish."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Yangi xabar</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={!isScheduled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsScheduled(false)}
                  className="h-8 text-xs font-medium"
                >
                  <Send className="size-3.5 mr-1" /> Hozir yuborish
                </Button>
                <Button
                  type="button"
                  variant={isScheduled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsScheduled(true)}
                  className="h-8 text-xs font-medium"
                >
                  <Calendar className="size-3.5 mr-1" /> Rejalashtirish (Scheduler)
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {isScheduled
                ? "Xabar belgilangan sana va soatda avtomatik ravishda barcha o'quvchilarga yetkaziladi."
                : "Yuborilgach bekor qilib bo'lmaydi — matnni tekshirib chiqing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bc-title">Sarlavha</Label>
              <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Yangi mock testlar e'lon qilindi" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bc-msg">Xabar matni</Label>
              <Textarea id="bc-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Xabar mazmuni..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kimga</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                        {data && <span className="ml-1.5 text-muted-foreground">({data.audience_counts[a.value] ?? 0})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bc-img">Rasm (ixtiyoriy)</Label>
                <Input id="bc-img" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Rejalashtirilgan vaqt tanlash */}
            {isScheduled && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <Clock className="size-4" />
                  <span>Xabarni yuborish vaqti</span>
                </div>
                <Input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="bg-background border-amber-500/30 text-xs h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Belgilangan paytda server xabarni avtomatik ravishda jo&apos;natadi.
                </p>
              </div>
            )}

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="bc-tg" className="text-sm font-medium">Telegram orqali ham yuborish</Label>
                <p className="text-xs text-muted-foreground">
                  Faqat Telegram akkaunti ulangan foydalanuvchilarga yetadi.
                </p>
              </div>
              <Switch id="bc-tg" checked={viaTelegram} onCheckedChange={setViaTelegram} />
            </div>
          </CardContent>

          <Separator />

          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" />
              {recipients === undefined
                ? 'Hisoblanmoqda...'
                : <>Taxminan <span className="font-medium text-foreground">{recipients}</span> ta qabul qiluvchi</>}
            </p>
            <Button
              onClick={handleSendOrSchedule}
              disabled={sending}
              className={isScheduled ? 'bg-amber-600 hover:bg-amber-500 text-white font-medium' : ''}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : isScheduled ? (
                <Calendar className="size-4 mr-1.5" />
              ) : (
                <Send className="size-4 mr-1.5" />
              )}
              {isScheduled ? "Rejalashtirish" : "Yuborish"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yuborilgan va Rejalashtirilgan xabarlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-12 w-full" />)}
            {data?.history.length === 0 && (
              <div className="py-8 text-center">
                <Megaphone className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Hali xabar yuborilmagan.</p>
              </div>
            )}
            {data?.history.map((b, i) => {
              const isPendingSchedule = b.scheduled_at && !b.is_sent;
              return (
                <div key={b.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-3 py-3">
                    {b.image ? (
                      <img src={`${API_URL}${b.image}`} alt="" className="size-12 shrink-0 rounded-lg border object-cover" />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground text-sm truncate">{b.title}</p>
                        {isPendingSchedule ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0">
                            🕒 Rejalashtirilgan: {new Date(b.scheduled_at!).toLocaleString('uz-UZ')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0">
                            ✓ Yuborilgan
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {AUDIENCE_LABEL[b.audience] || b.audience} · {b.recipients_count} ta qabul qiluvchi
                        {b.telegram_sent_count > 0 && ` · TG: ${b.telegram_sent_count}`}
                        {' · '}
                        {new Date(b.sent_at).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDelete(b)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xabarni o&apos;chirish</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; xabari tarixdan o&apos;chiriladi. Bu foydalanuvchilarga yetkazilgan xabarlarni qaytarmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={confirmDelete}>O&apos;chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
