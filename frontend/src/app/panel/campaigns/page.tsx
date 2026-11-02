'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, Plus, Trash2, Edit2, Phone, Send, Copy, Check,
  ExternalLink, RefreshCw, Eye, Star, MapPin, BookOpen, Users,
  CheckCircle2, XCircle, AlertCircle, Building2
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type CampaignItem = {
  id: number;
  center_name: string;
  logo: string;
  title: string;
  description: string;
  offer_badge: string;
  target_subject: string;
  target_region: string;
  max_score_threshold: number;
  rating: number;
  story_video_url?: string;
  telegram_webhook_or_chat_id?: string;
  is_active: boolean;
  leads_count: number;
  created_at: string;
};

type LeadItem = {
  id: number;
  full_name: string;
  phone_number: string;
  telegram_username: string;
  predicted_dtm_score: string;
  weakest_topics: string;
  campaign_id?: number;
  campaign_name: string;
  coins_rewarded: number;
  created_at: string;
};

export default function PanelCampaignsPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'leads'>('campaigns');

  // Campaigns state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Leads state
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [centerName, setCenterName] = useState('');
  const [logo, setLogo] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [offerBadge, setOfferBadge] = useState('1-dars BEPUL + 20% chegirma');
  const [targetSubject, setTargetSubject] = useState('Tarix');
  const [targetRegion, setTargetRegion] = useState('Toshkent');
  const [maxScoreThreshold, setMaxScoreThreshold] = useState('65');
  const [rating, setRating] = useState('4.9');
  const [storyVideoUrl, setStoryVideoUrl] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Load Campaigns
  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await apiFetch<{ campaigns: CampaignItem[]; total: number; active_count: number }>(
        '/api/panel/campaigns/'
      );
      if (res?.campaigns) {
        setCampaigns(res.campaigns);
      }
    } catch (e) {
      toast.error("Kampaniyalarni yuklashda xatolik");
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  // Load Leads
  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await apiFetch<{ leads: LeadItem[]; total: number }>('/api/panel/campaigns/leads/');
      if (res?.leads) {
        setLeads(res.leads);
      }
    } catch (e) {
      toast.error("Lidlarni yuklashda xatolik");
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function handleOpenCreate() {
    setEditingCampaign(null);
    setCenterName('');
    setLogo('');
    setTitle('');
    setDescription('');
    setOfferBadge('1-dars BEPUL + 20% chegirma');
    setTargetSubject('Tarix');
    setTargetRegion('Toshkent');
    setMaxScoreThreshold('65');
    setRating('4.9');
    setStoryVideoUrl('');
    setTelegramChatId('');
    setIsActive(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(c: CampaignItem) {
    setEditingCampaign(c);
    setCenterName(c.center_name);
    setLogo(c.logo || '');
    setTitle(c.title);
    setDescription(c.description || '');
    setOfferBadge(c.offer_badge);
    setTargetSubject(c.target_subject);
    setTargetRegion(c.target_region);
    setMaxScoreThreshold(String(c.max_score_threshold));
    setRating(String(c.rating));
    setStoryVideoUrl(c.story_video_url || '');
    setTelegramChatId(c.telegram_webhook_or_chat_id || '');
    setIsActive(c.is_active);
    setIsModalOpen(true);
  }

  async function handleToggleActive(id: number) {
    try {
      const res = await apiFetch<{ success: boolean; is_active: boolean; message: string }>(
        `/api/panel/campaigns/${id}/toggle/`,
        { method: 'POST' }
      );
      toast.success(res.message);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: res.is_active } : c))
      );
    } catch (e) {
      toast.error("Holatni o'zgartirishda xatolik");
    }
  }

  async function handleDeleteCampaign(id: number) {
    if (!confirm("Haqiqatan ham ushbu reklama kampaniyasini o'chirmoqchimisiz?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/panel/campaigns/${id}/delete/`, { method: 'POST' });
      toast.success("Kampaniya o'chirildi");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast.error("O'chirishda xatolik");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!centerName.trim() || !title.trim()) {
      toast.error("Markaz nomi va sarlavhani kiriting");
      return;
    }
    setSaving(true);
    try {
      if (editingCampaign) {
        await apiFetch(`/api/panel/campaigns/${editingCampaign.id}/edit/`, {
          method: 'POST',
          body: JSON.stringify({
            center_name: centerName.trim(),
            logo: logo.trim(),
            title: title.trim(),
            description: description.trim(),
            offer_badge: offerBadge.trim(),
            target_subject: targetSubject.trim(),
            target_region: targetRegion.trim(),
            max_score_threshold: parseInt(maxScoreThreshold, 10) || 65,
            rating: parseFloat(rating) || 4.9,
            story_video_url: storyVideoUrl.trim(),
            telegram_webhook_or_chat_id: telegramChatId.trim(),
            is_active: isActive,
          }),
        });
        toast.success("Kampaniya ma'lumotlari yangilandi!");
      } else {
        await apiFetch('/api/panel/campaigns/create/', {
          method: 'POST',
          body: JSON.stringify({
            center_name: centerName.trim(),
            logo: logo.trim(),
            title: title.trim(),
            description: description.trim(),
            offer_badge: offerBadge.trim(),
            target_subject: targetSubject.trim(),
            target_region: targetRegion.trim(),
            max_score_threshold: parseInt(maxScoreThreshold, 10) || 65,
            rating: parseFloat(rating) || 4.9,
            story_video_url: storyVideoUrl.trim(),
            telegram_webhook_or_chat_id: telegramChatId.trim(),
            is_active: isActive,
          }),
        });
        toast.success("Yangi o'quv markaz kampaniyasi yaratildi!");
      }
      setIsModalOpen(false);
      loadCampaigns();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success("Telefon raqami nusxalandi!");
    setTimeout(() => setCopiedPhone(null), 2000);
  }

  return (
    <PanelShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Building2 className="size-6 text-amber-500" />
              <span>O&apos;quv Markazlari (B2B Ads) Boshqaruvi</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Registon, Cambridge LC va hamkor o&apos;quv markazlari reklamalari, maqsadli takliflar va kelib tushgan lidlar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs"
            >
              <Plus className="size-4 mr-1.5" />
              + Yangi Kampaniya Yaratish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'campaigns') loadCampaigns();
                else loadLeads();
              }}
              className="rounded-xl text-xs"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'campaigns'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span>Reklama Kampaniyalari</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
              {campaigns.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span>Kelib tushgan Lidlar</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
              {leads.length}
            </Badge>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: KAMPANIYALAR */}
        {/* ========================================================================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {loadingCampaigns ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Kampaniyalar yuklanmoqda...
              </div>
            ) : campaigns.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Hozircha reklama kampaniyasi yaratilmagan.</p>
                  <Button
                    onClick={handleOpenCreate}
                    className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs"
                  >
                    <Plus className="size-4 mr-1.5" /> Yangi Kampaniya Yaratish
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((camp) => (
                  <Card
                    key={camp.id}
                    className={cn(
                      'rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden',
                      camp.is_active ? 'border-amber-500/40 bg-card ring-1 ring-amber-500/20' : 'opacity-60 bg-muted/20 border-border/60'
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {camp.logo ? (
                            <img
                              src={camp.logo}
                              alt={camp.center_name}
                              className="size-9 rounded-xl object-contain border bg-white p-1"
                            />
                          ) : (
                            <div className="size-9 rounded-xl bg-amber-500/15 text-amber-500 font-black flex items-center justify-center text-xs">
                              {camp.center_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-foreground truncate">
                              {camp.center_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <span>{camp.rating}</span>
                              <span>• {camp.target_region}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={camp.is_active}
                            onCheckedChange={() => handleToggleActive(camp.id)}
                            title={camp.is_active ? "To'xtatish" : "Faollashtirish"}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-2.5 flex-1">
                      <h4 className="font-extrabold text-sm text-foreground leading-snug">
                        {camp.title}
                      </h4>

                      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-bold block truncate max-w-full text-center">
                        🎁 {camp.offer_badge}
                      </Badge>

                      {camp.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {camp.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block font-bold">Maqsadli Fan</span>
                          <span className="font-bold text-foreground truncate block">{camp.target_subject}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block font-bold">Chegara Ball</span>
                          <span className="font-bold text-rose-500 truncate block">&lt; {camp.max_score_threshold}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 text-blue-500" /> <b>{camp.leads_count}</b> ta lid
                        </span>
                        <span>{camp.created_at}</span>
                      </div>
                    </CardContent>

                    <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(camp)}
                        className="h-8 text-xs font-bold"
                      >
                        <Edit2 className="size-3 mr-1" /> Tahrirlash
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === camp.id}
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="h-8 text-xs font-bold"
                      >
                        <Trash2 className="size-3 mr-1" /> O&apos;chirish
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KELIB TUSHGAN LIDLAR */}
        {/* ========================================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {loadingLeads ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Lidlar yuklanmoqda...
              </div>
            ) : leads.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Hozircha o&apos;quvchilardan lidlar tushmagan.
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3.5">O&apos;quvchi</th>
                        <th className="p-3.5">Telefon Raqami</th>
                        <th className="p-3.5">Telegram</th>
                        <th className="p-3.5">Markaz</th>
                        <th className="p-3.5">Prognoz Ball</th>
                        <th className="p-3.5">Zaif Mavzular</th>
                        <th className="p-3.5">Sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3.5 font-bold text-foreground">
                            {lead.full_name}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground">{lead.phone_number}</span>
                              <button
                                onClick={() => copyPhone(lead.phone_number)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Nusxalash"
                              >
                                {copiedPhone === lead.phone_number ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                              <a
                                href={`tel:${lead.phone_number.replace(/\s+/g, '')}`}
                                className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500"
                                title="Qo'ng'iroq qilish"
                              >
                                <Phone className="size-3" />
                              </a>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {lead.telegram_username ? (
                              <a
                                href={`https://t.me/${lead.telegram_username.replace('@', '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-500 hover:underline flex items-center gap-1"
                              >
                                <Send className="size-2.5" /> @{lead.telegram_username.replace('@', '')}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-amber-500">
                            {lead.campaign_name}
                          </td>
                          <td className="p-3.5">
                            <Badge className="bg-primary/10 text-primary border-primary/25 font-bold">
                              {lead.predicted_dtm_score || '165.4'}
                            </Badge>
                          </td>
                          <td className="p-3.5 max-w-xs text-muted-foreground truncate">
                            {lead.weakest_topics || "O'rta asrlar, Rim tarixi"}
                          </td>
                          <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                            {lead.created_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Campaign Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg rounded-3xl bg-card border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Building2 className="size-5 text-amber-500" />
                <span>{editingCampaign ? "Kampaniyani Tahrirlash" : "Yangi Reklama Kampaniyasi"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Imtihondan past ball olgan o&apos;quvchilar Lenta va Natija sahifasida ushbu taklifni ko&apos;rishadi.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Markaz Nomi *</label>
                  <Input
                    required
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="Registon O'quv Markazi"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Logotip URL</label>
                  <Input
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Aksiya Sarlavhasi *</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tarix va Ona tili intensiv DTM kursi"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Aksiya Nishoni (Badge)</label>
                <Input
                  value={offerBadge}
                  onChange={(e) => setOfferBadge(e.target.value)}
                  placeholder="1-dars BEPUL + 20% chegirma"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Batafsil Tavsif / Shartlar</label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kuchsiz mavzularingizni 1 oyda noldan tiklab, DTM imtihonida 180+ ball oling..."
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Maqsadli Fan</label>
                  <Input
                    value={targetSubject}
                    onChange={(e) => setTargetSubject(e.target.value)}
                    placeholder="Tarix"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Hudud</label>
                  <Input
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    placeholder="Toshkent"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Chegara Ball (%)</label>
                  <Input
                    type="number"
                    value={maxScoreThreshold}
                    onChange={(e) => setMaxScoreThreshold(e.target.value)}
                    placeholder="65"
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Reyting</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="4.9"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Telegram Chat ID / Webhook</label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-100123456789"
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Promo Story Video URL (ixtiyoriy)</label>
                <Input
                  value={storyVideoUrl}
                  onChange={(e) => setStoryVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-xs font-bold text-foreground">Kampaniya holati</p>
                  <p className="text-[11px] text-muted-foreground">O&apos;quvchilarga ko&apos;rsatilsinmi?</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs"
                >
                  {saving ? "Saqlanmoqda..." : editingCampaign ? "Yangilash" : "Yaratish 🚀"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PanelShell>
  );
}
