'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type ShopItem = {
  id: number; category: string; slug: string; name: string; description: string;
  icon_name: string; price_coins: number; rarity: string; payload: object;
  is_consumable: boolean; required_level: number; is_active: boolean; order: number;
};

const CATEGORIES = [
  { value: 'avatar', label: 'Avatar' }, { value: 'frame', label: 'Ramka' },
  { value: 'theme', label: 'Mavzu' }, { value: 'title', label: 'Unvon' },
  { value: 'badge', label: 'Nishon' }, { value: 'consumable', label: 'Sarflanadigan' },
];
const RARITIES = [
  { value: 'common', label: 'Oddiy' }, { value: 'rare', label: 'Noyob' },
  { value: 'epic', label: 'Epik' }, { value: 'legendary', label: 'Afsonaviy' },
];

export default function EditShopItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [payloadText, setPayloadText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<ShopItem>(`/api/panel/shop/${id}/`).then((d) => {
      setItem(d);
      // Bo'shliqli formatlash — JSON qo'lda tahrirlanadigan bo'lgani uchun o'qishga qulayroq.
      setPayloadText(JSON.stringify(d.payload, null, 2));
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  async function submit() {
    if (!item) return;
    try {
      JSON.parse(payloadText);
    } catch {
      toast.error("Payload noto'g'ri JSON formatida.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/panel/shop/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, payload: payloadText }),
      });
      toast.success('Mahsulot saqlandi');
      router.push('/panel/shop');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/panel/shop/${id}/`, { method: 'DELETE' });
      toast.success("Mahsulot o'chirildi");
      router.push('/panel/shop');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
      setShowDelete(false);
    }
  }

  if (!item) {
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
          backHref="/panel/shop"
          title={item.name}
          description="Do'kon mahsulotini tahrirlash"
          actions={
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Asosiy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Nomi</Label>
                <Input id="e-name" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-slug">Slug</Label>
                <Input id="e-slug" value={item.slug} onChange={(e) => setItem({ ...item, slug: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Turkum</Label>
                <Select value={item.category} onValueChange={(v) => setItem({ ...item, category: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nodirlik</Label>
                <Select value={item.rarity} onValueChange={(v) => setItem({ ...item, rarity: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-price">Narx (tanga)</Label>
                <Input id="e-price" type="number" value={item.price_coins} onChange={(e) => setItem({ ...item, price_coins: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-level">Kerakli daraja</Label>
                <Input id="e-level" type="number" value={item.required_level} onChange={(e) => setItem({ ...item, required_level: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Tavsif</Label>
              <Textarea id="e-desc" rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-payload">Payload (JSON)</Label>
              <Textarea id="e-payload" rows={4} className="font-mono text-xs" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sozlamalar</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="e-cons" className="text-sm font-medium">Sarflanadigan</Label>
              <Switch id="e-cons" checked={item.is_consumable} onCheckedChange={(v) => setItem({ ...item, is_consumable: v })} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="e-active" className="text-sm font-medium">Faol</Label>
              <Switch id="e-active" checked={item.is_active} onCheckedChange={(v) => setItem({ ...item, is_active: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Saqlash
          </Button>
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mahsulotni o&apos;chirish</DialogTitle>
            <DialogDescription>
              &laquo;{item.name}&raquo; o&apos;chiriladi. Uni sotib olgan o&apos;quvchilarning
              inventaridagi yozuvlar ham yo&apos;qoladi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={remove}>O&apos;chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
