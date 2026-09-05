'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Copy, Pencil, Eye, EyeOff, Loader2, ListChecks, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type TestSetDetail = {
  id: number; title: string; description: string; subject: string | null; author: string;
  status: { display: string; tone: string }; attempt_count: number;
  questions: { id: number; body: string; question_type: string }[];
};

const TONE: Record<string, string> = {
  green: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
  amber: 'bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25',
  rose: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
};

const QUESTION_TYPE: Record<string, string> = {
  single_choice: 'Variantli', image_based: 'Rasmli', table_based: 'Jadvalli',
  matching: 'Moslashtirish', grouped_item: 'Guruhlangan', open_written: 'Yozma',
};

export default function PanelTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<TestSetDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => apiFetch<TestSetDetail>(`/api/panel/testsets/${id}/`).then(setData)
    .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  async function duplicate() {
    setBusy('dup');
    try {
      const res = await apiFetch<{ id: number }>(`/api/panel/testsets/${id}/duplicate/`, { method: 'POST' });
      toast.success('Nusxa yaratildi', { description: `Yangi test #${res.id}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  async function togglePublish() {
    setBusy('pub');
    try {
      await apiFetch(`/api/panel/testsets/${id}/toggle-publish/`, { method: 'POST' });
      await load();
      toast.success('Nashr holati o’zgartirildi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-9 w-72" /><Skeleton className="h-96 w-full" />
        </div>
      </PanelShell>
    );
  }

  const published = data.status.tone === 'green';

  return (
    <PanelShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          backHref="/panel/tests"
          title={data.title}
          description={[data.subject, data.author, `${data.attempt_count} urinish`].filter(Boolean).join(' · ')}
          actions={<Badge variant="outline" className={TONE[data.status.tone] ?? ''}>{data.status.display}</Badge>}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={togglePublish} disabled={!!busy}>
            {busy === 'pub' ? <Loader2 className="size-4 animate-spin" /> : published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {published ? 'Qoralamaga qaytarish' : 'Nashr etish'}
          </Button>
          <Button variant="outline" onClick={duplicate} disabled={!!busy}>
            {busy === 'dup' ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            Nusxalash
          </Button>
          <Button asChild variant="outline">
            <Link href={`/panel/tests/${id}/edit`}><Pencil className="size-4" /> Tahrirlash</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/panel/tests/${id}/review`}><ClipboardCheck className="size-4" /> Javoblarni tekshirish</Link>
          </Button>
        </div>

        {data.description && (
          <Card>
            <CardHeader><CardTitle className="text-base">Tavsif</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-[var(--text-secondary)]">{data.description}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" /> Savollar
              <Badge variant="secondary">{data.questions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.questions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Savollar qo&apos;shilmagan.</p>
            )}
            {data.questions.map((q, i) => (
              <div key={q.id}>
                {i > 0 && <Separator />}
                <div className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <div
                    className="min-w-0 flex-1 text-sm text-[var(--text-secondary)] [&_p]:m-0"
                    dangerouslySetInnerHTML={{ __html: q.body }}
                  />
                  <Badge variant="secondary" className="shrink-0">
                    {QUESTION_TYPE[q.question_type] ?? q.question_type}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}
