'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column } from '@/components/panel/DataTable';

type GameRow = { id: number; title: string; game_type_display: string; items_count: number; author: string; is_published: boolean };

export default function PanelGamesPage() {
  const router = useRouter();
  const columns: Column<GameRow>[] = [
    { key: 'title', label: 'Nomi', render: (g) => g.title },
    { key: 'type', label: 'Turi', render: (g) => g.game_type_display },
    { key: 'items', label: 'Elementlar', render: (g) => g.items_count },
    { key: 'author', label: 'Muallif', render: (g) => g.author },
    { key: 'status', label: 'Holat', render: (g) => <Badge text={g.is_published ? 'Nashr etilgan' : 'Qoralama'} tone={g.is_published ? 'green' : 'amber'} /> },
  ];
  return (
    <PanelShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">O&apos;yinlar</h1>
          <Link href="/panel/games/new" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">+ Yangi o&apos;yin</Link>
        </div>
        <DataTable
          endpoint="/api/panel/games/" columns={columns}
          onRowClick={(g) => router.push(`/panel/games/${g.id}`)}
          bulkActions={[{ value: 'delete', label: "O'chirish" }]}
        />
      </div>
    </PanelShell>
  );
}
