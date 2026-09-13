'use client';

import { useEffect, useState } from 'react';
import { TicketPercent, Plus, Trash2, Power, Check, Copy, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type PromoCode = {
  id: number;
  code: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  plan_id: number | null;
  plan_name: string;
  max_uses: number;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_valid: boolean;
  total_revenue: number;
  created_at: string | null;
};

type PlanOption = { id: number; name: string; price: number };

export default function PromocodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('20');
  const [planId, setPlanId] = useState<string>('');
  const [maxUses, setMaxUses] = useState('100');
  const [validUntil, setValidUntil] = useState('');

  function loadPromos() {
    setLoading(true);
    apiFetch<{ results: PromoCode[]; plans: PlanOption[] }>('/api/panel/promocodes/')
      .then((res) => {
        setPromos(res.results || []);
        setPlans(res.plans || []);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Promokodlarni yuklashda xatolik");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPromos();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Promokod kodini kiriting');
      return;
    }
    setCreating(true);
    try {
      await apiFetch('/api/panel/promocodes/', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim(),
          description: description.trim(),
          discount_type: discountType,
          discount_value: parseFloat(discountValue) || 0,
          plan_id: planId ? parseInt(planId) : null,
          max_uses: parseInt(maxUses) || 0,
          valid_until: validUntil || null,
        }),
      });
      toast.success("Promokod muvaffaqiyatli yaratildi!");
      setShowCreate(false);
      setCode('');
      setDescription('');
      loadPromos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yaratishda xatolik");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: number) {
    try {
      await apiFetch(`/api/panel/promocodes/${id}/toggle/`, { method: 'POST' });
      toast.success("Holati o'zgartirildi");
      loadPromos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  async function deletePromo(id: number, codeName: string) {
    if (!confirm(`'${codeName}' promokodini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await apiFetch(`/api/panel/promocodes/${id}/`, { method: 'DELETE' });
      toast.success("Promokod o'chirildi");
      loadPromos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(`'${text}' nusxalandi!`);
  }

  const totalUsed = promos.reduce((sum, p) => sum + p.current_uses, 0);
  const totalRev = promos.reduce((sum, p) => sum + p.total_revenue, 0);
  const activeCount = promos.filter((p) => p.is_active).length;

  return (
    <PanelShell>
      <div className="space-y-6">
        <PageHeader
          title="Promokodlar va Chegirmalar"
          description="Marketing aksiyalari, maxsus chegirmalar va promo kuponlar boshqaruvi."
          actions={
            <Button
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-sm"
            >
              <Plus className="size-4" /> Yangi Promokod
            </Button>
          }
        />

        {/* 3 ta yuqori KPI kartochka */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <TicketPercent className="size-4 text-emerald-400" />
              <span>Jami Promokodlar</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">{promos.length} ta</p>
            <p className="mt-1 text-xs text-slate-500">{activeCount} tasi ayni paytda faol</p>
          </div>
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="size-4 text-sky-400" />
              <span>Foydalanildi</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">{totalUsed} marta</p>
            <p className="mt-1 text-xs text-slate-500">O&apos;quvchilar tomonidan qo&apos;llandi</p>
          </div>
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <TrendingUp className="size-4 text-amber-400" />
              <span>Keltirilgan Tushum</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">{totalRev.toLocaleString('uz-UZ')} so&apos;m</p>
            <p className="mt-1 text-xs text-slate-500">Tasdiqlangan to&apos;lovlar orqali</p>
          </div>
        </div>

        {/* Promokodlar ro'yxati */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#1e2330] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Mavjud Promokodlar</h3>
            <span className="text-xs text-slate-400">Jami: {promos.length} ta</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Yuklanmoqda...</div>
          ) : promos.length === 0 ? (
            <div className="p-12 text-center">
              <TicketPercent className="mx-auto size-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">Hozircha promokodlar yo&apos;q</p>
              <p className="text-xs text-slate-500 mt-1">Yangi aksiya yaratish uchun yuqoridagi tugmani bosing</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e1017] text-slate-400 border-b border-[#1e2330]">
                  <tr>
                    <th className="py-3 px-4 font-medium">KOD</th>
                    <th className="py-3 px-4 font-medium">CHEGIRMA</th>
                    <th className="py-3 px-4 font-medium">TARIF</th>
                    <th className="py-3 px-4 font-medium">ISHLATILISHI</th>
                    <th className="py-3 px-4 font-medium">TUSHUM</th>
                    <th className="py-3 px-4 font-medium">MUDDATI</th>
                    <th className="py-3 px-4 font-medium">HOLATI</th>
                    <th className="py-3 px-4 font-medium text-right">AMALLAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330]">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#161a24] transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                            {p.code}
                          </span>
                          <button
                            onClick={() => copyCode(p.code)}
                            title="Nusxalash"
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        {p.description && <p className="text-[11px] text-slate-400 mt-0.5">{p.description}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">
                          {p.discount_type === 'percent' ? `-${p.discount_value}%` : `-${p.discount_value.toLocaleString()} so'm`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.plan_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-200">
                          {p.current_uses} / {p.max_uses === 0 ? '∞' : p.max_uses}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {p.total_revenue.toLocaleString()} so&apos;m
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {p.valid_until ? new Date(p.valid_until).toLocaleDateString('uz-UZ') : 'Muddatsiz'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={p.is_active ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-slate-600 text-slate-400 bg-slate-800/20'}
                        >
                          {p.is_active ? 'Faol' : 'To\'xtatilgan'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(p.id)}
                            className="size-8 p-0 text-slate-400 hover:text-white"
                            title={p.is_active ? "To'xtatish" : "Faollashtirish"}
                          >
                            <Power className={`size-4 ${p.is_active ? 'text-amber-400' : 'text-emerald-400'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePromo(p.id, p.code)}
                            className="size-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                            title="O'chirish"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Yangi Promokod Yaratish Dialogi */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md bg-[#11141c] border-[#1e2330] text-white">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Yangi Promokod Yaratish</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Aksiya, bayram yoki maxsus hamkorlar uchun chegirma kodi kiriting.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Promokod kodi (masalan: BAHOR2026)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="KOD..."
                  className="font-mono uppercase bg-[#181d28] border-[#262c3d] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Tavsif (ixtiyoriy)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masalan: Telegram kanal a'zolari uchun 20% chegirma"
                  className="bg-[#181d28] border-[#262c3d] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Chegirma turi</Label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                    className="w-full rounded-md border border-[#262c3d] bg-[#181d28] p-2 text-xs text-white"
                  >
                    <option value="percent">Foiz (%)</option>
                    <option value="fixed">Qat&apos;iy summa (so&apos;m)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Chegirma miqdori</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '20' : '15000'}
                    className="bg-[#181d28] border-[#262c3d] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Foydalanish limiti (0 = cheksiz)</Label>
                  <Input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="100"
                    className="bg-[#181d28] border-[#262c3d] text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Amal qilish muddati</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="bg-[#181d28] border-[#262c3d] text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Muayyan tarif (ixtiyoriy)</Label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full rounded-md border border-[#262c3d] bg-[#181d28] p-2 text-xs text-white"
                >
                  <option value="">Barcha tariflar uchun amal qiladi</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString()} so&apos;m)
                    </option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="border-[#262c3d] text-slate-300 hover:bg-slate-800"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {creating ? "Yaratilmoqda..." : "Yaratish"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PanelShell>
  );
}
