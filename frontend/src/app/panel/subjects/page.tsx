'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import DataTable, { type Column } from '@/components/panel/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type SubjectRow = { id: number; name: string; slug: string; testsets_count: number };

export default function PanelSubjectsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column<SubjectRow>[] = [
    { key: 'name', label: 'Nomi', render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'slug', label: 'Slug', render: (s) => <code className="text-xs text-muted-foreground">{s.slug}</code> },
    { key: 'tests', label: 'Testlar', render: (s) => <Badge variant="secondary">{s.testsets_count}</Badge> },
  ];

  async function create() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nomi va slug to'ldirilishi shart.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/panel/subjects/', {
        method: 'POST',
        body: JSON.stringify({ name, slug, icon_name: 'book', color: '#2d6cff', order: 0 }),
      });
      toast.success('Fan qo’shildi');
      setOpen(false); setName(''); setSlug('');
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="space-y-5">
        <PageHeader
          title="Fanlar"
          description="Testlar, darslar va o'yinlar shu fanlarga biriktiriladi."
          actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Yangi fan</Button>}
        />
        <DataTable
          key={refreshKey}
          endpoint="/api/panel/subjects/"
          columns={columns}
          onRowClick={(s) => router.push(`/panel/subjects/${s.id}`)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi fan</DialogTitle>
            <DialogDescription>Slug havolalarda ishlatiladi — lotin harflari va chiziqcha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nomi</Label>
              <Input
                id="s-name" value={name} placeholder="Masalan: Geografiya"
                onChange={(e) => {
                  setName(e.target.value);
                  // slug qo'lda tegilmagan bo'lsa nomdan avtomatik hosil qilinadi
                  setSlug((prev) => (prev === '' || prev === slugify(name) ? slugify(e.target.value) : prev));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-slug">Slug</Label>
              <Input id="s-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="geografiya" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}

function slugify(v: string) {
  return v.toLowerCase().trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
