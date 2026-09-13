'use client';

import { useEffect, useState } from 'react';
import {
  Send, Bot, Radio, CheckCircle2, XCircle, RefreshCw, Plus, Trash2,
  ExternalLink, ShieldCheck, Users, MessageSquare, AlertTriangle, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type BotStatus = {
  has_token: boolean;
  bot_info: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
  } | null;
  webhook_info: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null;
  error: string | null;
  stats: {
    total_users: number;
    tg_connected: number;
    tg_usernames: number;
    tg_pct: number;
  };
  default_channel: string;
};

type RequiredChannel = {
  id: number;
  title: string;
  username_or_id: string;
  invite_url: string;
  is_active: boolean;
  order: number;
  created_at: string | null;
};

export default function TelegramCenterPage() {
  const [statusData, setStatusData] = useState<BotStatus | null>(null);
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingMenu, setResettingMenu] = useState(false);

  // Channel Dialog
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelTitle, setChannelTitle] = useState('');
  const [channelTarget, setChannelTarget] = useState('');
  const [channelUrl, setChannelUrl] = useState('');

  function loadAll() {
    setLoading(true);
    Promise.all([
      apiFetch<BotStatus>('/api/panel/telegram/status/'),
      apiFetch<RequiredChannel[]>('/api/panel/telegram/channels/'),
    ])
      .then(([statusRes, channelsRes]) => {
        setStatusData(statusRes);
        setChannels(channelsRes || []);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Ma'lumotlarni yuklashda xatolik");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleResetMenu() {
    setResettingMenu(true);
    try {
      const res = await apiFetch<{ success: boolean; output?: string }>('/api/panel/telegram/reset-menu/', {
        method: 'POST',
      });
      toast.success(res.output || "Bot menyu tugmasi yangilandi!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Menyuni yangilashda xatolik");
    } finally {
      setResettingMenu(false);
    }
  }

  async function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!channelTitle.trim() || !channelTarget.trim()) {
      toast.error("Kanal nomi va @username kiritilishi shart");
      return;
    }
    setAddingChannel(true);
    try {
      await apiFetch('/api/panel/telegram/channels/', {
        method: 'POST',
        body: JSON.stringify({
          title: channelTitle.trim(),
          username_or_id: channelTarget.trim(),
          invite_url: channelUrl.trim(),
          is_active: true,
        }),
      });
      toast.success("Majburiy kanal qo'shildi!");
      setShowAddChannel(false);
      setChannelTitle('');
      setChannelTarget('');
      setChannelUrl('');
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kanal qo'shishda xatolik");
    } finally {
      setAddingChannel(false);
    }
  }

  async function handleDeleteChannel(id: number, title: string) {
    if (!confirm(`'${title}' kanalini ro'yxatdan o'chirishni xohlaysizmi?`)) return;
    try {
      await apiFetch(`/api/panel/telegram/channels/${id}/`, { method: 'DELETE' });
      toast.success("Kanal o'chirildi");
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  }

  const bot = statusData?.bot_info;
  const webhook = statusData?.webhook_info;
  const stats = statusData?.stats;

  return (
    <PanelShell>
      <div className="space-y-6">
        <PageHeader
          title="Telegram Bot Markazi & Kanallar"
          description="Bot holati, Webhook ulanishi, homiy kanallar va o'quvchilar bilan Telegram aloqasi nazorati."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                disabled={loading}
                className="gap-1.5 text-xs h-9 border-[#262c3d] bg-[#11141c] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Tekshirish
              </Button>
              <Button
                size="sm"
                onClick={handleResetMenu}
                disabled={resettingMenu}
                className="gap-1.5 text-xs h-9 bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-xs"
              >
                <Bot className={`size-3.5 ${resettingMenu ? 'animate-spin' : ''}`} /> Menyu Tugmasini Yangilash
              </Button>
            </div>
          }
        />

        {/* Bot Status & Telegram User Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Bot className="size-4 text-sky-400" />
              <span>Bot Holati</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {statusData?.has_token && bot ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white text-base">Online (Faol)</span>
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-rose-400 shrink-0" />
                  <span className="font-semibold text-rose-300 text-base">Aloqa yo&apos;q</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 truncate">
              {bot ? `@${bot.username} (${bot.first_name})` : (statusData?.error || 'Token tekshirilmoqda')}
            </p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Radio className="size-4 text-emerald-400" />
              <span>Webhook Ulanishi</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {webhook?.url ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white text-base">Ulangan</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-amber-300 text-base">Polling / Ochiq</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 truncate">
              Kutayotgan yangilanishlar: {webhook?.pending_update_count || 0} ta
            </p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="size-4 text-indigo-400" />
              <span>Telegram Ulangan</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {stats?.tg_connected || 0} nafar
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Jami foydalanuvchilarning {stats?.tg_pct || 0}% qismi
            </p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <MessageSquare className="size-4 text-purple-400" />
              <span>Telegram Usernames</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {stats?.tg_usernames || 0} nafar
            </p>
            <p className="mt-1 text-xs text-slate-500">Profilida @username mavjud</p>
          </div>
        </div>

        {/* Webhook Batafsil Ma'lumot */}
        {webhook?.url && (
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-4 text-xs font-mono text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-500">Webhook URL:</span>
              <span className="text-sky-300 truncate">{webhook.url}</span>
            </div>
            {webhook.last_error_message && (
              <span className="text-rose-400 text-[11px] shrink-0 font-sans">
                Oxirgi xatolik: {webhook.last_error_message}
              </span>
            )}
          </div>
        )}

        {/* Majburiy Kanallar Boshqaruvi */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#1e2330] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Majburiy Homiy Kanallar (Channel Gate)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                O&apos;quvchilar bot yoki testlarga kirganda quyidagi kanallarga a&apos;zo bo&apos;lishi talab qilinadi.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddChannel(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Plus className="size-3.5" /> Kanal Qo&apos;shish
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1017] text-slate-400 border-b border-[#1e2330]">
                <tr>
                  <th className="py-3 px-4 font-medium">KANAL NOMI</th>
                  <th className="py-3 px-4 font-medium">USERNAME / ID</th>
                  <th className="py-3 px-4 font-medium">HAVOLA</th>
                  <th className="py-3 px-4 font-medium">HOLATI</th>
                  <th className="py-3 px-4 font-medium text-right">AMALLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2330]">
                {/* Standart tizim kanali */}
                {statusData?.default_channel && (
                  <tr className="bg-sky-950/10">
                    <td className="py-3 px-4 font-medium text-white">
                      Asosiy Tizim Kanali (Sozlamalardan)
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400">
                      {statusData.default_channel}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`https://t.me/${statusData.default_channel.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        Kanalga o&apos;tish <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="border-sky-500/40 text-sky-400 bg-sky-500/10">
                        Doimiy Faol
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      Tizim kanali
                    </td>
                  </tr>
                )}

                {channels.map((c) => (
                  <tr key={c.id} className="hover:bg-[#161a24] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {c.title}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {c.username_or_id}
                    </td>
                    <td className="py-3 px-4">
                      {c.invite_url ? (
                        <a
                          href={c.invite_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          Havola <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={c.is_active ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-slate-600 text-slate-400'}
                      >
                        {c.is_active ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChannel(c.id, c.title)}
                        className="size-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                        title="O'chirish"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {!statusData?.default_channel && channels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Hozircha qo&apos;shimcha majburiy kanallar belgilanmagan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kanal qo'shish modal dialogi */}
        <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
          <DialogContent className="sm:max-w-md bg-[#11141c] border-[#1e2330] text-white">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Yangi Majburiy Kanal Qo&apos;shish</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Bot orqali kirgan o&apos;quvchilar ushbu kanalga a&apos;zo bo&apos;lishi shart qilib belgilanadi.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddChannel} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Kanal nomi</Label>
                <Input
                  value={channelTitle}
                  onChange={(e) => setChannelTitle(e.target.value)}
                  placeholder="Masalan: Ilm Ildizi Rasmiy Kanal"
                  className="bg-[#181d28] border-[#262c3d] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Username yoki Raqamli ID</Label>
                <Input
                  value={channelTarget}
                  onChange={(e) => setChannelTarget(e.target.value)}
                  placeholder="@ilmildizi yoki -100..."
                  className="font-mono bg-[#181d28] border-[#262c3d] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Taklif havolasi (Invite URL)</Label>
                <Input
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://t.me/..."
                  className="bg-[#181d28] border-[#262c3d] text-white"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddChannel(false)}
                  className="border-[#262c3d] text-slate-300 hover:bg-slate-800"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingChannel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {addingChannel ? "Qo'shilmoqda..." : "Saqlash"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PanelShell>
  );
}
