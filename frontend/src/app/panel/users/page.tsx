'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';

const FILTERS: FilterConfig[] = [
  { param: 'role', label: 'Rol', options: [
    { value: 'superadmin', label: 'Super Admin' }, { value: 'teacher', label: "O'qituvchi" }, { value: 'student', label: "O'quvchi" },
  ] },
  { param: 'active', label: 'Holat', options: [{ value: 'True', label: 'Faol' }, { value: 'False', label: 'Bloklangan' }] },
  { param: 'tg', label: 'Telegram', options: [{ value: 'False', label: 'Ulangan' }, { value: 'True', label: 'Ulanmagan' }] },
];

type UserRow = {
  id: number; username: string; full_name: string; telegram_username: string;
  role_display: string; role_tone: string; is_active: boolean; date_joined: string;
};

export default function PanelUsersPage() {
  const router = useRouter();

  const columns: Column<UserRow>[] = [
    { key: 'name', label: 'Foydalanuvchi', render: (u) => u.full_name },
    {
      key: 'username',
      label: 'Username',
      // Telegram orqali kelgan hisobning Django ichki nomi `tg_<raqam>` bo'ladi — bu
      // ustunda uni ko'rsatishdan foyda yo'q. @nom bo'lsa shuni, bo'lmasa (Telegram'da
      // @nom qo'ymagan foydalanuvchilar) buni ochiq aytamiz.
      render: (u) => (u.telegram_username
        ? <span>@{u.telegram_username}</span>
        : u.username.startsWith('tg_')
          ? <span className="text-[var(--text-secondary)]">Telegram @nomi yo&apos;q</span>
          : <span>{u.username}</span>),
    },
    { key: 'role', label: 'Rol', render: (u) => <Badge text={u.role_display} tone={u.role_tone} /> },
    { key: 'status', label: 'Holat', render: (u) => <Badge text={u.is_active ? 'Faol' : 'Bloklangan'} tone={u.is_active ? 'green' : 'rose'} /> },
    { key: 'date', label: "Ro'yxatdan o'tgan", render: (u) => new Date(u.date_joined).toLocaleDateString('uz-UZ') },
  ];

  return (
    <PanelShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Foydalanuvchilar</h1>
          <Link href="/panel/broadcast" className="text-sm text-[var(--accent-text)]">Xabar yuborish</Link>
        </div>
        <DataTable
          endpoint="/api/panel/users/" columns={columns}
          onRowClick={(u) => router.push(`/panel/users/${u.id}`)}
          filters={FILTERS}
          bulkActions={[{ value: 'block', label: 'Bloklash' }, { value: 'unblock', label: 'Blokdan chiqarish' }]}
        />
      </div>
    </PanelShell>
  );
}
