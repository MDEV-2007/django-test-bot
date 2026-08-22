'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  { value: 'avatar', label: 'Avatar' }, { value: 'frame', label: 'Ramka' },
  { value: 'theme', label: 'Mavzu' }, { value: 'title', label: 'Unvon' },
  { value: 'badge', label: 'Nishon' }, { value: 'consumable', label: 'Sarflanadigan' },
];
const RARITIES = [
  { value: 'common', label: 'Oddiy' }, { value: 'rare', label: 'Noyob' },
  { value: 'epic', label: 'Epik' }, { value: 'legendary', label: 'Afsonaviy' },
];

// Har bir turkum o'ziga xos JSON kutadi — admin qo'lda eslab qolmasligi uchun namuna beriladi.
const PAYLOAD_HINT: Record<string, string> = {
  title: '{"title": "Bilimdon"}',
  frame: '{"ring": "#f7c948"}',
  avatar: '{"avatar_url": "https://..."}',
  theme: '{"theme": "samarqand"}',
  badge: '{"badge": "star"}',
  consumable: '{}',
};

export default function NewShopItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    category: 'title', slug: '', name: '', description: '', icon_name: 'sparkles',
    price_coins: 100, rarity: 'common', payload: PAYLOAD_HINT.title, is_consumable: false,
    required_level: 0, is_active: true, order: 0,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nomi va slug to'ldirilishi shart.");
      return;
    }
    try {
      JSON.parse(form.payload);
    } catch {
      toast.error("Payload noto'g'ri JSON formatida.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/panel/shop/', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Mahsulot yaratildi');
      router.push('/panel/shop');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader backHref="/panel/shop" title="Yangi mahsulot" description="Do'konda tangaga sotiladigan artefakt." />

        <Card>
          <CardHeader><CardTitle className="text-base">Asosiy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sh-name">Nomi</Label>
                <Input id="sh-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zarhal ramka" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sh-slug">Slug</Label>
                <Input id="sh-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="zarhal-ramka" />
              </div>
              <div className="space-y-1.5">
                <Label>Turkum</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v, payload: PAYLOAD_HINT[v] ?? '{}' })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nodirlik</Label>
                <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sh-price">Narx (tanga)</Label>
                <Input id="sh-price" type="number" value={form.price_coins} onChange={(e) => setForm({ ...form, price_coins: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sh-level">Kerakli daraja</Label>
                <Input id="sh-level" type="number" value={form.required_level} onChange={(e) => setForm({ ...form, required_level: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sh-desc">Tavsif</Label>
              <Textarea id="sh-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sh-payload">Payload (JSON)</Label>
              <Textarea
                id="sh-payload" rows={2} className="font-mono text-xs"
                value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Turkumga xos ma&apos;lumot. Namuna: <code>{PAYLOAD_HINT[form.category] ?? '{}'}</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sozlamalar</CardTitle>
            <CardDescription>Sarflanadigan mahsulot ishlatilgach inventardan yo&apos;qoladi.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="sh-cons" className="text-sm font-medium">Sarflanadigan</Label>
              <Switch id="sh-cons" checked={form.is_consumable} onCheckedChange={(v) => setForm({ ...form, is_consumable: v })} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="sh-active" className="text-sm font-medium">Faol (do&apos;konda ko&apos;rinadi)</Label>
              <Switch id="sh-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/panel/shop')}>Bekor qilish</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Yaratish
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
