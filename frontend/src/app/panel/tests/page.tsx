'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';

type TestRow = {
  id: number; title: string; subject: string; questions_count: number;
  author: string; status: { display: string; tone: string }; attempts_count: number;
};

const STATUS_FILTER: FilterConfig = {
  param: 'status', label: 'Holat', options: [{ value: 'True', label: 'Nashr etilgan' }, { value: 'False', label: 'Qoralama' }],
};

export default function PanelTestsPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: { id: number; name: string }[] }>('/api/panel/subjects/?page=1').then((d) => setSubjects(d.results));
  }, [access]);

  const filters: FilterConfig[] = [
    { param: 'subject', label: 'Fan', options: subjects.map((s) => ({ value: String(s.id), label: s.name })) },
    STATUS_FILTER,
  ];
  const columns: Column<TestRow>[] = [
    { key: 'title', label: 'Sarlavha', render: (t) => t.title },
    { key: 'subject', label: 'Fan', render: (t) => t.subject },
    { key: 'q', label: 'Savollar', render: (t) => t.questions_count },
    { key: 'author', label: 'Muallif', render: (t) => t.author },
    { key: 'status', label: 'Holat', render: (t) => <Badge text={t.status.display} tone={t.status.tone} /> },
    { key: 'attempts', label: 'Urinishlar', render: (t) => t.attempts_count },
  ];

  return (
    <PanelShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Testlar</h1>
        <DataTable
          endpoint="/api/panel/testsets/" columns={columns}
          onRowClick={(t) => router.push(`/panel/tests/${t.id}`)}
          filters={filters}
          bulkActions={[
            { value: 'publish', label: 'Nashr qilish' }, { value: 'unpublish', label: 'Qoralamaga o\'tkazish' }, { value: 'archive', label: 'Arxivlash' },
          ]}
          bulkEndpoint="/api/panel/testsets/bulk/"
        />
      </div>
    </PanelShell>
  );
}
