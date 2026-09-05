'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type SubjectDetail = { id: number; name: string; slug: string; icon_name: string; color: string; order: number };

export default function PanelSubjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<SubjectDetail>(`/api/panel/subjects/${id}/`).then(setSubject)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  async function submit() {
    if (!subject) return;
    setSaving(true);
    try {
      await apiFetch(`/api/panel/subjects/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          name: subject.name, slug: subject.slug, icon_name: subject.icon_name,
          color: subject.color, order: subject.order,
        }),
      });
      toast.success('Fan saqlandi');
      router.push('/panel/subjects');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/panel/subjects/${id}/`, { method: 'DELETE' });
      toast.success("Fan o'chirildi");
      router.push('/panel/subjects');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
      setShowDelete(false);
    }
  }

  if (!subject) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-xl space-y-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-xl space-y-5">
        <PageHeader
          backHref="/panel/subjects"
          title={subject.name}
          description="Fan sozlamalari"
          actions={
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ma&apos;lumotlar</CardTitle>
            <CardDescription>Ikonka nomi lucide kutubxonasidan olinadi (masalan: book, atom).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-name">Nomi</Label>
              <Input id="f-name" value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-slug">Slug</Label>
              <Input id="f-slug" value={subject.slug} onChange={(e) => setSubject({ ...subject, slug: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-icon">Ikonka nomi</Label>
              <Input id="f-icon" value={subject.icon_name} onChange={(e) => setSubject({ ...subject, icon_name: e.target.value })} placeholder="book" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-color">Rang</Label>
              <div className="flex gap-2">
                <Input
                  id="f-color" type="color" className="h-9 w-14 p-1"
                  value={/^#[0-9a-fA-F]{6}$/.test(subject.color) ? subject.color : '#2d6cff'}
                  onChange={(e) => setSubject({ ...subject, color: e.target.value })}
                />
                <Input value={subject.color} onChange={(e) => setSubject({ ...subject, color: e.target.value })} placeholder="#2d6cff" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-order">Tartib</Label>
              <Input id="f-order" type="number" value={subject.order} onChange={(e) => setSubject({ ...subject, order: Number(e.target.value) })} />
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
            <DialogTitle>Fanni o&apos;chirish</DialogTitle>
            <DialogDescription>
              &laquo;{subject.name}&raquo; o&apos;chiriladi. Bu fanga bog&apos;langan kontent ta&apos;sirlanishi mumkin.
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
