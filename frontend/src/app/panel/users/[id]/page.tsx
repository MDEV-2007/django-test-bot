'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Ban, KeyRound, Crown, UserCog, LogIn, Trash2, Save, Loader2,
  Zap, Coins, Trophy, Swords, ShieldCheck, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type UserDetail = {
  user: { id: number; username: string; full_name: string; role: string; role_display: string; is_active: boolean };
  email: string; first_name: string; last_name: string;
  profile: { xp: number; coins: number; level: number; elo_rating: number; is_premium: boolean };
  test_count: number; lesson_count: number;
  attempts: { id: number; test_title: string; score: number | null; started_at: string }[];
  payments: { id: number; plan_name: string; amount: string; status: string; created_at: string }[];
  role_options: { value: string; label: string }[];
};

const ROLE_TONE: Record<string, string> = {
  superadmin: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
  teacher: 'bg-primary/12 text-[var(--accent-text)] border-[var(--accent-border)]',
  student: 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-transparent',
};

const PAYMENT_TONE: Record<string, string> = {
  approved: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
  rejected: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<UserDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [xp, setXp] = useState(''); const [coins, setCoins] = useState(''); const [elo, setElo] = useState('');
  const [username, setUsername] = useState(''); const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => apiFetch<UserDetail>(`/api/panel/users/${id}/`).then((d) => {
    setData(d);
    setUsername(d.user.username); setFirstName(d.first_name); setLastName(d.last_name);
    setEmail(d.email); setRole(d.user.role);
  });
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(key: string, fn: () => Promise<void>, okMsg?: string) {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  const saveProfile = () => run('save', async () => {
    await apiFetch(`/api/panel/users/${id}/edit/`, {
      method: 'PUT',
      body: JSON.stringify({ username, first_name: firstName, last_name: lastName, email, role, is_active: data?.user.is_active }),
    });
    await load();
  }, 'Profil saqlandi');

  const toggleBlock = () => run('block', async () => {
    await apiFetch(`/api/panel/users/${id}/toggle-block/`, { method: 'POST' });
    await load();
  }, data?.user.is_active ? 'Foydalanuvchi bloklandi' : 'Blok olib tashlandi');

  const resetPassword = () => run('pwd', async () => {
    const res = await apiFetch<{ new_password: string }>(`/api/panel/users/${id}/reset-password/`, { method: 'POST' });
    setNewPassword(res.new_password);
    setCopied(false);
  });

  const adjust = () => run('adjust', async () => {
    await apiFetch(`/api/panel/users/${id}/adjust/`, {
      method: 'POST', body: JSON.stringify({ xp, coins, elo_rating: elo }),
    });
    setXp(''); setCoins(''); setElo('');
    await load();
  }, "Ko'rsatkichlar yangilandi");

  const setPremium = (grant: boolean) => run('premium', async () => {
    await apiFetch(`/api/panel/users/${id}/set-premium/`, { method: 'POST', body: JSON.stringify({ grant }) });
    await load();
  }, grant ? 'Premium berildi' : 'Premium bekor qilindi');

  const impersonate = () => run('imp', async () => {
    const res = await apiFetch<{ access: string; refresh: string }>(`/api/panel/users/${id}/impersonate/`, { method: 'POST' });
    useAuthStore.getState().setAccess(res.access);
    const me = await fetchMe();
    useAuthStore.getState().setSession(res.access, res.refresh, me);
    router.push('/dashboard');
  });

  const confirmDelete = () => run('del', async () => {
    await apiFetch(`/api/panel/users/${id}/edit/`, { method: 'DELETE' });
    setShowDelete(false);
    router.push('/panel/users');
  }, "Foydalanuvchi o'chirildi");

  if (!data) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PanelShell>
    );
  }

  const p = data.profile;
  const metrics = [
    { label: 'Daraja', value: p.level, icon: Trophy, tone: 'text-[var(--success-text)]' },
    { label: 'XP', value: p.xp, icon: Zap, tone: 'text-[var(--accent-text)]' },
    { label: 'Tanga', value: p.coins, icon: Coins, tone: 'text-amber-400' },
    { label: 'ELO', value: p.elo_rating, icon: Swords, tone: 'text-rose-300' },
  ];

  return (
    <PanelShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          backHref="/panel/users"
          title={data.user.full_name}
          description={`@${data.user.username}${data.email ? ` · ${data.email}` : ''}`}
          actions={
            <>
              <Badge variant="outline" className={ROLE_TONE[data.user.role] ?? ''}>{data.user.role_display}</Badge>
              {!data.user.is_active && <Badge variant="outline" className={ROLE_TONE.superadmin}>Bloklangan</Badge>}
              {p.is_premium && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/12 text-amber-300">
                  <Crown className="size-3" /> Premium
                </Badge>
              )}
            </>
          }
        />

        {/* Ko'rsatkichlar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="gap-0 py-4">
                <CardContent className="px-4">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`size-3.5 ${m.tone}`} />
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums">{m.value.toLocaleString('uz-UZ')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tezkor amallar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amallar</CardTitle>
            <CardDescription>Bu amallar darhol kuchga kiradi va audit jurnaliga yoziladi.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={toggleBlock} disabled={!!busy}>
              {busy === 'block' ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
              {data.user.is_active ? 'Bloklash' : 'Blokdan chiqarish'}
            </Button>
            <Button variant="outline" onClick={resetPassword} disabled={!!busy}>
              {busy === 'pwd' ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Parolni tiklash
            </Button>
            <Button variant="outline" onClick={() => setPremium(!p.is_premium)} disabled={!!busy}>
              {busy === 'premium' ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
              {p.is_premium ? 'Premiumni bekor qilish' : 'Premium berish'}
            </Button>
            <Button variant="outline" onClick={impersonate} disabled={!!busy}>
              {busy === 'imp' ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sifatida kirish
            </Button>
            <Button variant="ghost" className="text-[var(--danger-text)] hover:text-[var(--danger-text)]" onClick={() => setShowDelete(true)} disabled={!!busy}>
              <Trash2 className="size-4" /> O&apos;chirish
            </Button>
          </CardContent>
        </Card>

        {/* Profil tahriri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserCog className="size-4" /> Profil ma&apos;lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input id="u-username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-first">Ism</Label>
              <Input id="u-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-last">Familiya</Label>
              <Input id="u-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.role_options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={saveProfile} disabled={!!busy} className="w-full sm:w-auto">
                {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Saqlash
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gamifikatsiya ko'rsatkichlari */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ko&apos;rsatkichlarni o&apos;zgartirish</CardTitle>
            <CardDescription>
              Qiymatlar to&apos;g&apos;ridan-to&apos;g&apos;ri o&apos;rnatiladi (qo&apos;shilmaydi).
              Daraja XP dan avtomatik qayta hisoblanadi. Bo&apos;sh qoldirilgan maydon o&apos;zgarmaydi.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="w-28 space-y-1.5">
              <Label htmlFor="a-xp">XP</Label>
              <Input id="a-xp" inputMode="numeric" value={xp} onChange={(e) => setXp(e.target.value)} placeholder={String(p.xp)} />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="a-coins">Tanga</Label>
              <Input id="a-coins" inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} placeholder={String(p.coins)} />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="a-elo">ELO</Label>
              <Input id="a-elo" inputMode="numeric" value={elo} onChange={(e) => setElo(e.target.value)} placeholder={String(p.elo_rating)} />
            </div>
            <Button variant="outline" onClick={adjust} disabled={!!busy || (!xp && !coins && !elo)}>
              {busy === 'adjust' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Qo&apos;llash
            </Button>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          {data.test_count} ta test · {data.lesson_count} ta dars yaratgan
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">So&apos;nggi urinishlar</CardTitle></CardHeader>
            <CardContent>
              {data.attempts.length === 0 && <p className="py-4 text-sm text-muted-foreground">Urinishlar yo&apos;q.</p>}
              {data.attempts.map((a, i) => (
                <div key={a.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.test_title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.started_at).toLocaleDateString('uz-UZ')}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold">
                      {a.score !== null ? `${a.score.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">To&apos;lovlar tarixi</CardTitle></CardHeader>
            <CardContent>
              {data.payments.length === 0 && <p className="py-4 text-sm text-muted-foreground">To&apos;lovlar yo&apos;q.</p>}
              {data.payments.map((pay, i) => (
                <div key={pay.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{pay.plan_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(pay.created_at).toLocaleDateString('uz-UZ')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm">{Number(pay.amount).toLocaleString('uz-UZ')} so&apos;m</p>
                      <Badge variant="outline" className={`mt-0.5 ${PAYMENT_TONE[pay.status] ?? ''}`}>{pay.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Yangi parol — bir marta ko'rsatiladi, shuning uchun nusxalash tugmasi bilan */}
      <Dialog open={!!newPassword} onOpenChange={(o) => !o && setNewPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--success-text)]" /> Yangi parol</DialogTitle>
            <DialogDescription>
              Bu parol faqat hozir ko&apos;rsatiladi — oynani yopgach qayta ko&apos;rsatilmaydi.
              Foydalanuvchiga xavfsiz kanal orqali yetkazing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-muted px-3 py-2 font-mono text-sm">{newPassword}</code>
            <Button
              variant="outline" size="icon"
              onClick={() => { navigator.clipboard.writeText(newPassword ?? ''); setCopied(true); }}
              aria-label="Nusxalash"
            >
              {copied ? <Check className="size-4 text-[var(--success-text)]" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewPassword(null)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foydalanuvchini o&apos;chirish</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">@{data.user.username}</span> butunlay o&apos;chiriladi.
              Uning urinishlari, to&apos;lovlari va yaratgan kontenti ham yo&apos;qoladi. Bu amalni qaytarib bo&apos;lmaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="size-9">
              <AvatarFallback className="text-xs">{data.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{data.user.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{data.user.role_display}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy === 'del'}>
              {busy === 'del' && <Loader2 className="size-4 animate-spin" />}
              Ha, o&apos;chirilsin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
