'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column } from '@/components/panel/DataTable';

type LessonRow = { id: number; title: string; topic: string; author: string; is_published: boolean };

export default function PanelLessonsPage() {
  const router = useRouter();
  const columns: Column<LessonRow>[] = [
    { key: 'title', label: 'Sarlavha', render: (l) => l.title },
    { key: 'topic', label: 'Mavzu', render: (l) => l.topic },
    { key: 'author', label: 'Muallif', render: (l) => l.author },
    { key: 'status', label: 'Holat', render: (l) => <Badge text={l.is_published ? 'Nashr etilgan' : 'Qoralama'} tone={l.is_published ? 'green' : 'amber'} /> },
  ];
  return (
    <PanelShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Darslar</h1>
          <Link href="/panel/lessons/new" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">+ Yangi dars</Link>
        </div>
        <DataTable
          endpoint="/api/panel/lessons/" columns={columns}
          onRowClick={(l) => router.push(`/panel/lessons/${l.id}`)}
          bulkActions={[{ value: 'publish', label: 'Nashr qilish' }, { value: 'delete', label: "O'chirish" }]}
        />
      </div>
    </PanelShell>
  );
}
