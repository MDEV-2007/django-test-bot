'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame, Volume2, VolumeX, Mic, MicOff, FileSpreadsheet, ShieldAlert,
  Clock, Award, Users, AlertTriangle, Save, Plus, Trash2, Play, RefreshCw,
  TrendingDown, CheckCircle2, ChevronRight, Sparkles, Sliders,
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import PremiumIcon from '@/components/ui/premium-icon';

type SupervisorMsg = {
  time_sec: number;
  title: string;
  text: string;
};

type StressConfig = {
  ambient_sound_enabled: boolean;
  ambient_volume: number;
  supervisor_voice_enabled: boolean;
  require_bubble_sheet: boolean;
  warning_time_minutes: number;
  bonus_xp_multiplier: number;
  supervisor_messages: SupervisorMsg[];
  updated_at?: string | null;
};

type StressStats = {
  total_attempts: number;
  avg_score: number;
  total_unfilled_bubbles: number;
  total_misaligned_bubbles: number;
  avg_lost_points: number;
};

type RecentAttempt = {
  id: number;
  user: string;
  username: string;
  avatar?: string | null;
  test_title: string;
  score: number | null;
  draft_score: number | null;
  lost_points: number;
  unfilled_count: number;
  misaligned_count: number;
  dtm_ball: number;
  completed_at: string | null;
  time_spent: string;
};

type ApiResponse = {
  config: StressConfig;
  stats: StressStats;
  recent_attempts: RecentAttempt[];
};

export default function StressExamAdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [config, setConfig] = useState<StressConfig | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch<ApiResponse>('/api/panel/stress-exam/');
      setData(res);
      setConfig(res.config);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await apiFetch('/api/panel/stress-exam/', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      toast.success("BMB Stress Simulyatori sozlamalari muvaffaqiyatli saqlandi!");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  function testVoice(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error("Brauzeringiz ovozli sintezni qo'llab-quvvatlamaydi.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
    toast.info("Ovoz yangramoqda...");
  }

  function addMessage() {
    if (!config) return;
    const newMsg: SupervisorMsg = {
      time_sec: 900,
      title: "15 daqiqa qoldi",
      text: "Diqqat! Imtihon tugashiga 15 daqiqa qoldi. Javoblarni zudlik bilan Titul varaqasiga ko'chiring!",
    };
    setConfig({
      ...config,
      supervisor_messages: [...config.supervisor_messages, newMsg],
    });
  }

  function removeMessage(index: number) {
    if (!config) return;
    const updated = config.supervisor_messages.filter((_, i) => i !== index);
    setConfig({ ...config, supervisor_messages: updated });
  }

  function updateMessage(index: number, field: keyof SupervisorMsg, val: string | number) {
    if (!config) return;
    const updated = [...config.supervisor_messages];
    updated[index] = { ...updated[index], [field]: val };
    setConfig({ ...config, supervisor_messages: updated });
  }

  return (
    <PanelShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <PageHeader
          title="🔥 BMB Real Imtihon Zali (Stress Mode)"
          description="Haqiqiy DTM/BMB zali muhiti, parta shitirlashi, nazoratchi ovozi va rasmiy Titul varaqasi (Bubble Sheet) simulyatori sozlamalari"
          actions={
            <Button
              onClick={handleSave}
              disabled={saving || !config}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 font-semibold"
            >
              {saving ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Sozlamalarni Saqlash
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jami Stress Testlar</CardTitle>
              <PremiumIcon icon={Flame} tone="rose" size="sm" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-20" /> : `${data?.stats.total_attempts || 0} ta`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ekstremal sharoitda topshirilgan</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">O&apos;rtacha Natija</CardTitle>
              <PremiumIcon icon={Award} tone="amber" size="sm" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-20" /> : `${data?.stats.avg_score || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Stress bosimidagi o&apos;rtacha ko&apos;rsatkich</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Titul Xatolari</CardTitle>
              <PremiumIcon icon={FileSpreadsheet} tone="purple" size="sm" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">
                {loading ? <Skeleton className="h-8 w-20" /> : `${(data?.stats.total_unfilled_bubbles || 0) + (data?.stats.total_misaligned_bubbles || 0)} ta`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bo&apos;yalmagan: {data?.stats.total_unfilled_bubbles || 0} | Adashgan: {data?.stats.total_misaligned_bubbles || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Yo&apos;qotilgan Ballar</CardTitle>
              <PremiumIcon icon={TrendingDown} tone="emerald" size="sm" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {loading ? <Skeleton className="h-8 w-20" /> : `-${data?.stats.avg_lost_points || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Titulga o&apos;z vaqtida ko&apos;chirmaslik tufayli</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panels */}
        {config && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audio Bosim Sozlamalari */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={Volume2} tone="rose" size="sm" />
                  <div>
                    <CardTitle className="text-base font-semibold">Audio-bosim (Imtihon Zali Akustikasi)</CardTitle>
                    <CardDescription className="text-xs">
                      500 kishilik zal shovqini, parta g&apos;ichirlashi, qog&apos;oz shitirlashi va yo&apos;talish ovozlari
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Zal Fon Shovqini (Ambient Sound)</p>
                    <p className="text-xs text-muted-foreground">Test boshlanishi bilan orqa fonda avtomatik chalinadi</p>
                  </div>
                  <Switch
                    checked={config.ambient_sound_enabled}
                    onCheckedChange={(v) => setConfig({ ...config, ambient_sound_enabled: v })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Boshlang&apos;ich Fon Balandligi</span>
                    <span className="font-semibold text-foreground">{Math.round(config.ambient_volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.ambient_volume * 100]}
                    max={100}
                    step={5}
                    onValueChange={(val) => setConfig({ ...config, ambient_volume: val[0] / 100 })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Nazoratchi Sovuq Ovozi (Speech Announcements)</p>
                    <p className="text-xs text-muted-foreground">Imtihon davomida audio-xabarlar berib turadi</p>
                  </div>
                  <Switch
                    checked={config.supervisor_voice_enabled}
                    onCheckedChange={(v) => setConfig({ ...config, supervisor_voice_enabled: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Titul Varaqasi (Bubble Sheet) Qoidalari */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={FileSpreadsheet} tone="purple" size="sm" />
                  <div>
                    <CardTitle className="text-base font-semibold">Titul Varaqasi (Bubble Sheet) Tuzog&apos;i</CardTitle>
                    <CardDescription className="text-xs">
                      BMB DTM rasmiy javoblar varaqasini to&apos;ldirish qoidalari va qat&apos;iyligi
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Qat&apos;iy BMB Titul Qoidasi</p>
                    <p className="text-xs text-muted-foreground">
                      Faqat Titul varaqasiga bo&apos;yalgan javoblar rasmiy ball sifatida qabul qilinadi
                    </p>
                  </div>
                  <Switch
                    checked={config.require_bubble_sheet}
                    onCheckedChange={(v) => setConfig({ ...config, require_bubble_sheet: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Shoshilinch Signal (Daqiqa)</label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={config.warning_time_minutes}
                      onChange={(e) => setConfig({ ...config, warning_time_minutes: parseInt(e.target.value) || 10 })}
                      className="bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground">Qolgan vaqtda qizil signal va titul shoshi beraladi</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Bonus XP Multiplikatori</label>
                    <Input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={5.0}
                      value={config.bonus_xp_multiplier}
                      onChange={(e) => setConfig({ ...config, bonus_xp_multiplier: parseFloat(e.target.value) || 1.5 })}
                      className="bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground">Stress rejimida topshirgan abituriyentga bonus</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Nazoratchi E'lonlari Muharriri */}
        {config && (
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Nazoratchi Sovuq E&apos;lonlari (Ovozli Xabarlar)</CardTitle>
                <CardDescription className="text-xs">
                  Imtihon davomida abituriyentlarga yangraydigan ogohlantirishlar
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addMessage} className="text-xs">
                <Plus className="size-3.5 mr-1.5" />
                Yangi E&apos;lon Qo&apos;shish
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.supervisor_messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{idx + 1}
                      </Badge>
                      <Input
                        value={msg.title}
                        onChange={(e) => updateMessage(idx, 'title', e.target.value)}
                        placeholder="Sarlavha (masalan: 10 daqiqa qoldi)"
                        className="h-8 text-xs font-semibold w-48 bg-background"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>Vaqt chegarasi:</span>
                        <Input
                          type="number"
                          value={msg.time_sec}
                          onChange={(e) => updateMessage(idx, 'time_sec', parseInt(e.target.value) || 0)}
                          placeholder="soniya (-1 boshida, 0 oxirida)"
                          className="h-8 text-xs font-mono w-28 bg-background"
                        />
                        <span className="text-[11px] text-muted-foreground/80">soniya</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => testVoice(msg.text)}
                        title="Ovozni sinab ko'rish"
                        className="h-8 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Play className="size-3.5 mr-1" />
                        Eshitish
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMessage(idx)}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        aria-label="O'chirish"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={msg.text}
                    onChange={(e) => updateMessage(idx, 'text', e.target.value)}
                    rows={2}
                    placeholder="Nazoratchining sovuq ovozli xabari..."
                    className="text-xs bg-background resize-none"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* So'nggi Stress Urinishlari Jadvali */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">So&apos;nggi Stress Urinishlari</CardTitle>
                <CardDescription className="text-xs">
                  Abituriyentlarning Titul varaqasi va audio-bosim ostidagi so&apos;nggi natijalari
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={loadData} className="size-8 p-0">
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : !data?.recent_attempts?.length ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Hozircha Stress rejimida topshirilgan testlar yo&apos;q.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="pb-3 font-semibold">Abituriyent</th>
                      <th className="pb-3 font-semibold">Test Nomi</th>
                      <th className="pb-3 font-semibold">Titul Balli</th>
                      <th className="pb-3 font-semibold">Qoralama Balli</th>
                      <th className="pb-3 font-semibold">Yo&apos;qotilgan Ball</th>
                      <th className="pb-3 font-semibold">Xatolar (Titul)</th>
                      <th className="pb-3 font-semibold">Vaqt</th>
                      <th className="pb-3 font-semibold text-right">Topshirilgan Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recent_attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7">
                              <AvatarImage src={att.avatar || undefined} />
                              <AvatarFallback className="text-[10px] uppercase">
                                {att.username.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{att.user}</p>
                              <p className="text-[11px] text-muted-foreground">@{att.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground max-w-[180px] truncate">
                          {att.test_title}
                        </td>
                        <td className="py-3 font-bold text-foreground">
                          {att.score !== null ? `${att.score}%` : '—'}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            ~{att.dtm_ball} DTM ball
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground font-medium">
                          {att.draft_score !== null ? `${att.draft_score}%` : '—'}
                        </td>
                        <td className="py-3">
                          {att.lost_points > 0 ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono">
                              -{att.lost_points}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-500 border-emerald-500/30">
                              0%
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {att.unfilled_count > 0 || att.misaligned_count > 0 ? (
                            <span className="text-rose-500 font-medium">
                              {att.unfilled_count} ta bo&apos;sh, {att.misaligned_count} ta adashgan
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-medium">To&apos;liq mos</span>
                          )}
                        </td>
                        <td className="py-3 font-mono text-muted-foreground">{att.time_spent}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          {att.completed_at ? new Date(att.completed_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}
