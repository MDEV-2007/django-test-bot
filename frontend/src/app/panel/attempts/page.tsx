'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';
import { Button } from '@/components/ui/button';

const FILTERS: FilterConfig[] = [
  { param: 'completed', label: 'Holat', options: [{ value: 'True', label: 'Yakunlangan' }, { value: 'False', label: 'Yakunlanmagan' }] },
];

type AttemptRow = {
  id: number; student: string; test_title: string; score: number | null;
  correct_answers: number; started_at: string;
};

function scoreTone(score: number) {
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'rose';
}

export default function PanelAttemptsPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const columns: Column<AttemptRow>[] = [
    { key: 'student', label: "O'quvchi", render: (a) => <span className="font-medium">{a.student}</span> },
    { key: 'test', label: 'Test', render: (a) => a.test_title },
    {
      key: 'score', label: 'Ball',
      render: (a) => a.score !== null
        ? <Badge text={`${a.score.toFixed(0)}%`} tone={scoreTone(a.score)} />
        : <span className="text-muted-foreground">—</span>,
    },
    { key: 'correct', label: "To'g'ri", render: (a) => <span className="font-mono tabular-nums">{a.correct_answers}</span> },
    { key: 'date', label: 'Sana', render: (a) => <span className="text-muted-foreground">{new Date(a.started_at).toLocaleString('uz-UZ')}</span> },
  ];

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/panel/attempts/export/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) throw new Error(`Server ${res.status} qaytardi`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'natijalar.csv';
      link.click();
      // Blob URL'ni bo'shatamiz — aks holda xotirada qolib ketadi.
      URL.revokeObjectURL(url);
      toast.success('CSV yuklab olindi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setExporting(false);
    }
  }

  return (
    <PanelShell>
      <div className="space-y-5">
        <PageHeader
          title="Natijalar"
          description="Barcha test urinishlari. Qatorni bosib to'liq javoblarni ko'rish mumkin."
          actions={
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              CSV yuklash
            </Button>
          }
        />
        <DataTable
          endpoint="/api/panel/attempts/"
          columns={columns}
          onRowClick={(a) => router.push(`/panel/attempts/${a.id}`)}
          filters={FILTERS}
        />
      </div>
    </PanelShell>
  );
}
