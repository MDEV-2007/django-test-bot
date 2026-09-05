'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Settings = {
  site_name: string; logo_url: string; contact_email: string; contact_phone: string;
  telegram_channel: string; announcement: string; maintenance_mode: boolean;
};

const FIELDS: { key: keyof Settings; label: string; type?: string; placeholder?: string; hint?: string }[] = [
  { key: 'site_name', label: 'Sayt nomi', placeholder: 'IlmIldizi' },
  { key: 'logo_url', label: 'Logotip havolasi', type: 'url', placeholder: 'https://...' },
  { key: 'contact_email', label: 'Aloqa email', type: 'email', placeholder: 'info@ilmildizi.uz' },
  { key: 'contact_phone', label: 'Aloqa telefon', placeholder: '+998 ...' },
  { key: 'telegram_channel', label: 'Telegram kanal', placeholder: '@ilmildizi' },
];

export default function PanelSettingsPage() {
  const { access } = useAuthStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<Settings>('/api/panel/settings/').then(setSettings)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch('/api/panel/settings/', { method: 'PUT', body: JSON.stringify(settings) });
      toast.success('Sozlamalar saqlandi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title="Sayt sozlamalari"
          description="Brend ma'lumotlari, aloqa kanallari va tizim rejimi."
          actions={settings && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Saqlash
            </Button>
          )}
        />

        {!settings && (
          <Card><CardContent className="space-y-4 pt-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </CardContent></Card>
        )}

        {settings && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Umumiy</CardTitle>
                <CardDescription>Saytning nomi va aloqa ma&apos;lumotlari.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    <Input
                      id={f.key}
                      type={f.type ?? 'text'}
                      placeholder={f.placeholder}
                      value={settings[f.key] as string}
                      onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saytdagi e&apos;lon</CardTitle>
                <CardDescription>Barcha foydalanuvchilarga ko&apos;rsatiladi. Bo&apos;sh qoldirilsa — chiqmaydi.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={3}
                  placeholder="Masalan: 25-avgust kuni yangi mock testlar qo'shiladi."
                  value={settings.announcement}
                  onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                />
              </CardContent>
            </Card>

            <Card className={settings.maintenance_mode ? 'border-[var(--warning)]/40' : undefined}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TriangleAlert className={`size-4 ${settings.maintenance_mode ? 'text-[var(--warning-text)]' : 'text-muted-foreground'}`} />
                    <Label htmlFor="maintenance" className="text-sm font-medium">Texnik ishlar rejimi</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Yoqilganda super admindan boshqa hamma texnik sahifani ko&apos;radi. Panel va kirish
                    sahifasi ochiq qoladi — rejimni qaytarib o&apos;chira olasiz.
                  </p>
                </div>
                <Switch
                  id="maintenance"
                  checked={settings.maintenance_mode}
                  onCheckedChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PanelShell>
  );
}
