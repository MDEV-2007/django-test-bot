'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, Megaphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';
import { Button } from '@/components/ui/button';

const FILTERS: FilterConfig[] = [
  {
    param: 'role', label: 'Rol', options: [
      { value: 'superadmin', label: 'Super Admin' }, { value: 'teacher', label: "O'qituvchi" }, { value: 'student', label: "O'quvchi" },
    ]
  },
  { param: 'active', label: 'Holat', options: [{ value: 'True', label: 'Faol' }, { value: 'False', label: 'Bloklangan' }] },
  { param: 'tg', label: 'Telegram', options: [{ value: 'False', label: 'Ulangan' }, { value: 'True', label: 'Ulanmagan' }] },
];

type UserRow = {
  id: number; username: string; full_name: string; telegram_username: string;
  role_display: string; role_tone: string; is_active: boolean; date_joined: string;
};

export default function PanelUsersPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  async function handleExportCsv() {
    setDownloading(true);
    try {
      const res = await fetch('/api/panel/users/export/', {
        headers: access ? { Authorization: `Bearer ${access}` } : {},
      });
      if (!res.ok) throw new Error("CSV yuklab olishda xatolik yuz berdi");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ilmildizi_students_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("O'quvchilar bazasi CSV formatida yuklab olindi!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eksportda xatolik");
    } finally {
      setDownloading(false);
    }
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Foydalanuvchilar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Platformadagi barcha ro&apos;yxatdan o&apos;tgan o&apos;quvchi va o&apos;qituvchilar.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={downloading}
              className="gap-1.5 text-xs h-9 border-[#262c3d] bg-[#11141c] text-slate-200 hover:text-white"
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 text-emerald-400" />}
              Excel/CSV Yuklash
            </Button>
            <Link href="/panel/broadcast">
              <Button size="sm" className="gap-1.5 text-xs h-9 bg-primary/15 text-[var(--accent-text)] hover:bg-primary/25 border border-[var(--accent-border)]">
                <Megaphone className="size-3.5" /> Xabar yuborish
              </Button>
            </Link>
          </div>
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
