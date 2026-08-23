'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, Users, Image as ImageIcon, Megaphone } from 'lucide-react';
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
  id: number; title: string; audience: string; recipients_count: number;
  telegram_sent_count: number; sent_at: string; image: string | null;
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

  const load = () => apiFetch<BroadcastData>('/api/panel/broadcast/').then(setData);
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipients = data?.audience_counts[audience];

  async function send() {
    if (!title.trim() || !message.trim()) {
      toast.error("Sarlavha va xabar matni to'ldirilishi shart.");
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
      const res = await apiUpload<{ recipients_count: number; telegram_sent_count: number; photo_failed_count: number }>('/api/panel/broadcast/', form);
      toast.success(
        `${res.recipients_count} foydalanuvchiga yuborildi`,
        viaTelegram ? { description: `${res.telegram_sent_count} tasiga Telegram orqali yetkazildi.` } : undefined,
      );
      // Rasm Telegram'da tushib qolsa, xabar matn holida yetib boradi. Buni ochiq aytamiz —
      // aks holda admin rasm ketdi deb o'ylab qolaveradi.
      if (res.photo_failed_count > 0) {
        toast.warning(`${res.photo_failed_count} ta yuborishda rasm o'tmadi — xabar matn holida ketdi.`, {
          description: 'Sabab server logida: docker compose logs web | grep sendPhoto',
        });
      }
      setTitle(''); setMessage(''); setImage(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuborishda xatolik');
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
          title="Xabar yuborish"
          description="Sayt ichidagi bildirishnoma, ixtiyoriy ravishda Telegram orqali ham."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yangi xabar</CardTitle>
            <CardDescription>Yuborilgach bekor qilib bo&apos;lmaydi — matnni tekshirib chiqing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bc-title">Sarlavha</Label>
              <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Yangi mock testlar" />
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
            <Button onClick={send} disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Yuborish
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yuborilgan xabarlar</CardTitle>
          </CardHeader>
          <CardContent>
            {!data && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-12 w-full" />)}
            {data?.history.length === 0 && (
              <div className="py-8 text-center">
                <Megaphone className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Hali xabar yuborilmagan.</p>
              </div>
            )}
            {data?.history.map((b, i) => (
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
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="secondary">{AUDIENCE_LABEL[b.audience] ?? b.audience}</Badge>
                      <span>{b.recipients_count} qabul qiluvchi</span>
                      {b.telegram_sent_count > 0 && <span>· {b.telegram_sent_count} Telegram</span>}
                      <span>· {new Date(b.sent_at).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-[var(--danger-text)]"
                    onClick={() => setPendingDelete(b)}
                    aria-label="O'chirish"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* confirm() o'rniga — brauzer dialogi panel dizayniga mos kelmasdi. */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xabarni tarixdan o&apos;chirish</DialogTitle>
            <DialogDescription>
              &laquo;{pendingDelete?.title}&raquo; tarixdan o&apos;chiriladi. Foydalanuvchilarga
              allaqachon yuborilgan bildirishnomalar qaytarilmaydi.
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
