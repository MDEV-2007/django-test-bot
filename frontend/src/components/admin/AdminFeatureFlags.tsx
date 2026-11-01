'use client';

import React, { useState } from 'react';
import {
  Flame, Zap, Users, Swords, Sliders, CheckCircle2,
  CircleOff, RefreshCw, ShieldCheck, Sparkles, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFeatureFlags, type FeatureFlags } from '@/context/FeatureFlagContext';
import { cn } from '@/lib/utils';

type ModuleConfigItem = {
  key: keyof FeatureFlags;
  title: string;
  badge: string;
  description: string;
  icon: typeof Flame;
  tone: 'rose' | 'amber' | 'emerald' | 'blue';
  impact: string;
  defaultOn: boolean;
};

const MODULES: ModuleConfigItem[] = [
  {
    key: 'enable_stress_simulator',
    title: '1-MODUL: Imtihon Kuni Shoki (BMB Stress Simulyatori)',
    badge: 'BMB & DTM HARDCORE',
    description: "500 kishilik zal shovqini (audio-bosim), qalam shitirlashi, nazoratchi ovozi va interaktiv Titul Varaqasi (Bubble Sheet Grid).",
    icon: Flame,
    tone: 'rose',
    impact: 'Psixologik qatlam va virusli TikTok/Telegram kontent',
    defaultOn: true,
  },
  {
    key: 'enable_cheat_sheet_maps',
    title: '2-MODUL: Anti-Darslik (60 Soniyalik Shpargalka Xaritasi)',
    badge: '60s MIKRO-SHPARGALKA',
    description: "800 betlik kitob o'rniga 10 ta Oltin Fakt, 3 ta BMB qopqoni va vizual xronologiya. Lazy AI bilan avtomatik to'ldiriladi.",
    icon: Zap,
    tone: 'amber',
    impact: "Retention o'sishi va sprint testlarga konversiya",
    defaultOn: true,
  },
  {
    key: 'enable_parent_radar',
    title: '3-MODUL: Ota-Ona Radari & VIP To\'lov Invoysi',
    badge: 'OTA-ONA PAYWALL (B2C)',
    description: "O'quvchi ota-onasining Telegramini ulaydi (+100 tanga). Har yakshanba rasmiy 'Faxr va Nazorat' hisoboti va 1-click VIP Click/Payme invoysi yuboriladi.",
    icon: Users,
    tone: 'emerald',
    impact: "Ota-onalar hisobidan to'g'ridan-to'g'ri VIP to'lovlar oqimi",
    defaultOn: false,
  },
  {
    key: 'enable_teacher_class_battles',
    title: '4-MODUL: B2B2C Sinf Janglari (Teacher Live Room)',
    badge: 'REPETITOR KAHOOT',
    description: "O'qituvchilar 6 xonali PIN-kod orqali 30-100 nafar o'quvchisini jonli guruh jangiga olib kiradi. Top-3 podest va doska diagnostikasi.",
    icon: Swords,
    tone: 'blue',
    impact: "Har bir repetitor orqali 50-100 nafar yangi o'quvchi oqimi",
    defaultOn: false,
  },
];

export default function AdminFeatureFlags() {
  const { flags, loading, refreshFlags, updateFlag } = useFeatureFlags();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  async function handleToggle(key: keyof FeatureFlags, checked: boolean) {
    setUpdatingKey(key);
    const ok = await updateFlag(key, checked);
    setUpdatingKey(null);
    if (ok) {
      toast.success(
        checked
          ? "Modul muvaffaqiyatli yoqildi va darhol barcha foydalanuvchilarda paydo bo'ldi!"
          : "Modul o'chirildi va foydalanuvchilar interfeysidan yashirildi."
      );
    } else {
      toast.error("Holatni yangilashda xatolik yuz berdi.");
    }
  }

  return (
    <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl shadow-2xl text-white">
      <CardHeader className="border-b border-white/[0.08] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sliders className="size-4 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-tight">
                Super Admin: Dynamic Module Toggles (Feature Flags)
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Kodni qayta deploy qilmasdan, yangi o&apos;sish drayverlarini real vaqtda yoqib-o&apos;chirish
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={refreshFlags}
            disabled={loading}
            className="size-8 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {MODULES.map((mod) => {
          const isEnabled = Boolean(flags[mod.key]);
          const isChanging = updatingKey === mod.key;

          const toneColors = {
            rose: "border-rose-500/30 text-rose-400 bg-rose-500/10",
            amber: "border-amber-500/30 text-amber-400 bg-amber-500/10",
            emerald: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
            blue: "border-blue-500/30 text-blue-400 bg-blue-500/10",
          }[mod.tone];

          const IconComponent = mod.icon;

          return (
            <div
              key={mod.key}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                isEnabled
                  ? "bg-zinc-900/65 border-white/[0.12] shadow-lg shadow-black/40"
                  : "bg-zinc-950/40 border-white/[0.04] opacity-75"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                    toneColors
                  )}>
                    <IconComponent className="size-4.5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-100 tracking-tight">
                        {mod.title}
                      </h4>
                      <Badge variant="outline" className={cn("text-[9px] font-mono py-0 px-1.5", toneColors)}>
                        {mod.badge}
                      </Badge>
                      {isEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                          <span className="size-1.5 rounded-full bg-zinc-600" />
                          O&apos;chirilgan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {mod.description}
                    </p>

                    <div className="pt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>🎯 <strong>O&apos;sish kuchi:</strong> {mod.impact}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <Switch
                    checked={isEnabled}
                    disabled={isChanging || loading}
                    onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
