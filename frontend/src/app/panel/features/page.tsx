'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sliders, CheckCircle2, ShieldAlert, Sparkles, RefreshCw,
  ExternalLink, Layers, Swords, BookOpen, Gamepad2, Bot,
  GraduationCap, ShoppingBag, Trophy, FileCheck2, Info,
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api-client';
import PremiumIcon, { PremiumIconTone } from '@/components/ui/premium-icon';
import { toast } from 'sonner';
import { useFeaturesStore } from '@/lib/features';

type FeatureItem = {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  category_display: string;
  is_enabled: boolean;
  admin_only: boolean;
  badge_text: string;
  target_route: string;
  icon_name: string;
  updated_at: string | null;
  updated_by: string | null;
};

type FeaturesData = {
  features: FeatureItem[];
  stats: {
    total: number;
    enabled: number;
    admin_only: number;
    disabled: number;
  };
};

const ICON_MAP: Record<string, any> = {
  Layers,
  Swords,
  BookOpen,
  Gamepad2,
  Bot,
  GraduationCap,
  ShoppingBag,
  Trophy,
  FileCheck2,
  Sparkles,
};

const TONE_MAP: Record<string, PremiumIconTone> = {
  flashcards: 'amber',
  battles: 'rose',
  learning: 'indigo',
  games: 'amber',
  ai_mentor: 'purple',
  otm_predictor: 'emerald',
  shop: 'gold',
  leaderboard: 'gold',
  tests: 'emerald',
};

export default function FeaturesManagementPage() {
  const [data, setData] = useState<FeaturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<FeaturesData>('/api/panel/features/');
      setData(res);
    } catch {
      toast.error("Modullar ro'yxatini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleToggle = async (
    key: string,
    field: 'is_enabled' | 'admin_only',
    currentVal: boolean,
  ) => {
    try {
      setTogglingKey(key);
      const newVal = !currentVal;
      const res = await apiFetch<{ success: boolean; feature: FeatureItem }>(
        `/api/panel/features/${key}/toggle/`,
        {
          method: 'POST',
          body: JSON.stringify({ [field]: newVal }),
        },
      );

      if (res.success) {
        setData((prev) => {
          if (!prev) return prev;
          const updated = prev.features.map((f) => (f.key === key ? res.feature : f));
          const enabled = updated.filter((f) => f.is_enabled && !f.admin_only).length;
          const adminOnly = updated.filter((f) => f.admin_only).length;
          const disabled = updated.filter((f) => !f.is_enabled && !f.admin_only).length;
          return {
            features: updated,
            stats: { total: updated.length, enabled, admin_only: adminOnly, disabled },
          };
        });

        toast.success(
          field === 'is_enabled'
            ? newVal
              ? `${res.feature.name} barcha o'quvchilar uchun yoqildi!`
              : `${res.feature.name} o'chirildi (yashirildi)`
            : newVal
              ? `${res.feature.name} faqat Super Adminlar uchun o'tkazildi (Beta)`
              : `${res.feature.name} Beta rejimidan chiqarildi`,
        );

        // Sidebar va ilova menyularini bir zumda yangilash
        useFeaturesStore.getState().fetchFeatures();
      }
    } catch {
      toast.error("Holatni o'zgartirishda xatolik yuz berdi");
    } finally {
      setTogglingKey(null);
    }
  };

  const handleBulkAction = async (action: 'enable_all' | 'disable_all' | 'reset_defaults') => {
    const confirmMsg =
      action === 'enable_all'
        ? "Barcha modullar barcha foydalanuvchilar uchun yoqilsinmi?"
        : action === 'disable_all'
          ? "Asosiy testlardan boshqa barcha qo'shimcha modullar o'chirilsinmi (Minimal xavfsiz rejim)?"
          : "Barcha standart modullar qayta tiklansinmi?";

    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const res = await apiFetch<{ message: string }>('/api/panel/features/', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      toast.success(res.message || 'Muvaffaqiyatli bajarildi');
      await loadFeatures();
      useFeaturesStore.getState().fetchFeatures();
    } catch {
      toast.error('Amalni bajarishda xatolik');
      setLoading(false);
    }
  };

  const filteredFeatures = data?.features.filter((f) => {
    if (activeCategory === 'all') return true;
    return f.category === activeCategory;
  }) ?? [];

  return (
    <PanelShell>
      <div className="space-y-6 pb-12">
        {/* Sarlavha & Boshqaruv tugmalari */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-voice text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Funksiyalar &amp; 2.0 Boshqaruvi
              </h1>
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary font-semibold">
                <Sparkles className="size-3" /> Feature Flags
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Saytdagi har bir sahifani serverni qayta deploy qilmasdan 1 soniyada yoqing, o&apos;chiring yoki faqat Adminlar uchun Beta qilib qo&apos;ying.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFeatures()}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('enable_all')}
              className="gap-1.5 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50"
            >
              <CheckCircle2 className="size-3.5" />
              Barchasini yoqish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('disable_all')}
              className="gap-1.5 text-amber-600 dark:text-amber-400 hover:border-amber-500/50"
            >
              <ShieldAlert className="size-3.5" />
              Minimal Rejim
            </Button>
          </div>
        </div>

        {/* Statistika ko'rsatkichlari */}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="py-3 px-4">
              <p className="text-xs text-muted-foreground">Jami Modullar</p>
              <p className="font-mono text-2xl font-extrabold text-foreground">{data.stats.total}</p>
            </Card>
            <Card className="py-3 px-4 border-emerald-500/30 bg-emerald-500/[0.04]">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Barchaga Ochiq</p>
              <p className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {data.stats.enabled}
              </p>
            </Card>
            <Card className="py-3 px-4 border-amber-500/30 bg-amber-500/[0.04]">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Beta (Faqat Admin)</p>
              <p className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {data.stats.admin_only}
              </p>
            </Card>
            <Card className="py-3 px-4 border-rose-500/30 bg-rose-500/[0.04]">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Vaqtincha O&apos;chiq</p>
              <p className="font-mono text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {data.stats.disabled}
              </p>
            </Card>
          </div>
        )}

        {/* Eslatma / Info */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Qanday ishlaydi? (IlmIldizi 2.0 reliz xavfsizligi)
            </p>
            <p>
              Agar modul o&apos;chirilsa (yoki &quot;Faqat Admin&quot; qilinsa), u darhol barcha o&apos;quvchilarning chap menyusi, mobil panel va bosh sahifasidan yashirinadi. Agar o&apos;quvchi to&apos;g&apos;ridan-to&apos;g&apos;ri manzilga kirsa, <strong>&quot;IlmIldizi 2.0: Tez Kunda&quot;</strong> ajiotaj reliz xabari chiqadi. Siz esa Super Admin sifatida har qanday holatda ham modulni bemalol ochib sinovdan o&apos;tkaza olasiz.
            </p>
          </div>
        </div>

        {/* Kategoriya filter tablari */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Barchasi' },
            { key: 'learning', label: "Ta'lim & O'rganish" },
            { key: 'gamification', label: 'Geymifikatsiya & Arena' },
            { key: 'analytics', label: 'Analitika' },
            { key: 'core', label: 'Asosiy' },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeCategory === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(tab.key)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Modullar kartochkalari */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeatures.map((feat) => {
            const Icon = ICON_MAP[feat.icon_name] || Sparkles;
            const tone = TONE_MAP[feat.key] || 'primary';
            const isBusy = togglingKey === feat.key;

            return (
              <Card
                key={feat.key}
                className={`relative flex flex-col justify-between overflow-hidden transition-all ${
                  feat.is_enabled && !feat.admin_only
                    ? 'border-border/80 hover:border-primary/50'
                    : feat.admin_only
                      ? 'border-amber-500/40 bg-amber-500/[0.02]'
                      : 'border-rose-500/30 bg-muted/20 opacity-75'
                }`}
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <PremiumIcon icon={Icon} tone={tone} size="md" glow={feat.is_enabled} />
                      <div className="flex items-center gap-1.5">
                        {feat.badge_text && (
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {feat.badge_text}
                          </Badge>
                        )}
                        {feat.target_route && (
                          <Button asChild variant="ghost" size="icon" className="size-7">
                            <Link href={feat.target_route} target="_blank" title="Sahifani ko'rish">
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardTitle className="mt-2 text-base font-bold">{feat.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {feat.description || feat.target_route}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5 font-mono text-[11px] text-muted-foreground">
                      <span>Yo&apos;l: </span>
                      <strong className="text-foreground">{feat.target_route || '—'}</strong>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Asosiy Yoqish/O'chirish Switch */}
                      <div className="flex items-center justify-between rounded-xl border border-border/40 p-2.5">
                        <div>
                          <p className="text-xs font-semibold">O&apos;quvchilarga ochiq</p>
                          <p className="text-[11px] text-muted-foreground">
                            {feat.is_enabled && !feat.admin_only
                              ? 'Hozir barchaga ko‘rinadi'
                              : 'O‘quvchilardan yashirilgan'}
                          </p>
                        </div>
                        <Switch
                          checked={feat.is_enabled}
                          disabled={isBusy}
                          onCheckedChange={() => handleToggle(feat.key, 'is_enabled', feat.is_enabled)}
                        />
                      </div>

                      {/* Beta / Faqat Super Admin Switch */}
                      <div className="flex items-center justify-between rounded-xl border border-border/40 p-2.5">
                        <div>
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            Faqat Admin (Beta test)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Oddiylarga yopiq, sizga ochiq
                          </p>
                        </div>
                        <Switch
                          checked={feat.admin_only}
                          disabled={isBusy}
                          onCheckedChange={() => handleToggle(feat.key, 'admin_only', feat.admin_only)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="border-t border-border/40 px-6 py-2.5 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Kalit: <code className="font-mono font-bold">{feat.key}</code></span>
                  <span>{feat.updated_by ? `O'zgartirdi: ${feat.updated_by}` : 'Standart'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
}
