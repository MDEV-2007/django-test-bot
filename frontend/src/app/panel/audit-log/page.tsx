'use client';

import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';

type LogRow = { id: number; who: string; action_display: string; action_tone: string; model_name: string; object_repr: string; timestamp: string };

const FILTERS: FilterConfig[] = [
  { param: 'action', label: 'Amal', options: [
    { value: 'create', label: 'Yaratildi' }, { value: 'update', label: "O'zgartirildi" }, { value: 'delete', label: "O'chirildi" },
  ] },
];

export default function PanelAuditLogPage() {
  const columns: Column<LogRow>[] = [
    { key: 'who', label: 'Kim', render: (l) => l.who },
    { key: 'action', label: 'Amal', render: (l) => <Badge text={l.action_display} tone={l.action_tone} /> },
    { key: 'model', label: 'Model', render: (l) => l.model_name },
    { key: 'object', label: 'Obyekt', render: (l) => l.object_repr },
    { key: 'time', label: 'Vaqt', render: (l) => new Date(l.timestamp).toLocaleString('uz-UZ') },
  ];
  return (
    <PanelShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Audit jurnali</h1>
        <DataTable endpoint="/api/panel/audit-log/" columns={columns} filters={FILTERS} />
      </div>
    </PanelShell>
  );
}
