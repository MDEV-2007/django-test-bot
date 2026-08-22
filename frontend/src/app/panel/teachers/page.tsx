'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import DataTable, { type Column } from '@/components/panel/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type TeacherRow = {
  id: number; full_name: string; username: string;
  testsets_count: number; lessons_count: number; games_count: number;
};

export default function PanelTeachersPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column<TeacherRow>[] = [
    { key: 'name', label: "O'qituvchi", render: (t) => <span className="font-medium">{t.full_name}</span> },
    { key: 'username', label: 'Username', render: (t) => <code className="text-xs text-muted-foreground">@{t.username}</code> },
    { key: 'tests', label: 'Testlar', render: (t) => <Badge variant="secondary">{t.testsets_count}</Badge> },
    { key: 'lessons', label: 'Darslar', render: (t) => <Badge variant="secondary">{t.lessons_count}</Badge> },
    { key: 'games', label: "O'yinlar", render: (t) => <Badge variant="secondary">{t.games_count}</Badge> },
  ];

  async function createTeacher() {
    if (!username.trim() || !password.trim()) {
      toast.error('Username va parol kiritilishi shart.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ id: number }>('/api/panel/teachers/create/', {
        method: 'POST',
        body: JSON.stringify({ username, first_name: firstName, password }),
      });
      toast.success("O'qituvchi yaratildi");
      setOpen(false); setUsername(''); setFirstName(''); setPassword('');
      setRefreshKey((k) => k + 1);
      router.push(`/panel/users/${res.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell>
      <div className="space-y-5">
        <PageHeader
          title="O'qituvchilar"
          description="O'qituvchi o'z testlari, darslari va o'yinlarini /teacher panelida boshqaradi."
          actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Yangi o&apos;qituvchi</Button>}
        />
        <DataTable
          key={refreshKey}
          endpoint="/api/panel/teachers/"
          columns={columns}
          onRowClick={(t) => router.push(`/panel/users/${t.id}`)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi o&apos;qituvchi</DialogTitle>
            <DialogDescription>
              Hisob darhol yaratiladi. Parolni o&apos;qituvchiga xavfsiz kanal orqali yetkazing —
              keyinchalik uni profil sahifasidan tiklash mumkin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-username">Username</Label>
              <Input id="t-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ustoz_ali" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-first">Ism</Label>
              <Input id="t-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ali" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pwd">Parol</Label>
              <Input id="t-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={createTeacher} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
