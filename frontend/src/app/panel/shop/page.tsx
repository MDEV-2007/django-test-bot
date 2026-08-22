'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';

const FILTERS: FilterConfig[] = [
  { param: 'category', label: 'Turkum', options: [
    { value: 'avatar', label: 'Avatar' }, { value: 'frame', label: 'Ramka' }, { value: 'theme', label: 'Mavzu' },
    { value: 'title', label: 'Unvon' }, { value: 'badge', label: 'Nishon' }, { value: 'consumable', label: 'Sarflanadigan' },
  ] },
  { param: 'active', label: 'Holat', options: [{ value: 'True', label: 'Faol' }, { value: 'False', label: 'Nofaol' }] },
];

type ItemRow = {
  id: number; name: string; category_display: string; price_coins: number;
  rarity_display: string; rarity_tone: string; is_consumable: boolean;
  owned_by_count: number; is_active: boolean;
};

export default function PanelShopPage() {
  const router = useRouter();
  const columns: Column<ItemRow>[] = [
    { key: 'name', label: 'Nomi', render: (i) => i.name },
    { key: 'cat', label: 'Turkum', render: (i) => <Badge text={i.category_display} tone="blue" /> },
    { key: 'price', label: 'Narx', render: (i) => `${i.price_coins} 🪙` },
    { key: 'rarity', label: 'Nodirlik', render: (i) => <Badge text={i.rarity_display} tone={i.rarity_tone} /> },
    { key: 'owners', label: 'Egalari', render: (i) => i.owned_by_count },
    { key: 'status', label: 'Holat', render: (i) => <Badge text={i.is_active ? 'Faol' : 'Nofaol'} tone={i.is_active ? 'green' : 'gray'} /> },
  ];

  return (
    <PanelShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Coin do&apos;kon</h1>
          <Link href="/panel/shop/new" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">+ Yangi mahsulot</Link>
        </div>
        <DataTable
          endpoint="/api/panel/shop/" columns={columns}
          onRowClick={(i) => router.push(`/panel/shop/${i.id}`)}
          filters={FILTERS}
          bulkActions={[{ value: 'delete', label: "O'chirish" }]}
        />
      </div>
    </PanelShell>
  );
}
