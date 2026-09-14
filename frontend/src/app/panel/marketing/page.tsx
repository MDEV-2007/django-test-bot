'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Users, Target, Flame, Sparkles, Send, Copy, Check, RefreshCw,
  ArrowRight, Award, AlertTriangle, CheckCircle2, ChevronRight, BarChart3,
  PieChart, Activity, DollarSign, CreditCard, HelpCircle, Share2, Eye,
  Layers, Zap, Clock, ShieldAlert, BookOpen, ThumbsDown, BookMarked
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';

type AcquisitionSource = {
  source: string;
  label: string;
  count: number;
  pct: number;
  color: string;
};

type TrendPoint = {
  date: string;
  users: number;
};

type FunnelStep = {
  step: number;
  title: string;
  count: number;
  pct_of_total: number;
  conversion_from_prev: number;
  color: string;
};

type HardQuestion = {
  id: number;
  text: string;
  subject: string;
  topic: string | null;
  total_answered: number;
  correct_pct: number;
  error_pct: number;
};

type WeakTopic = {
  id: number;
  title: string;
  subject: string;
  total_answers: number;
  accuracy_pct: number;
  error_pct: number;
};

type TopTest = {
  id: number;
  title: string;
  subject: string;
  attempts: number;
  avg_score: number;
};

type TopSubject = {
  id: number;
  name: string;
  attempts: number;
  students: number;
  avg_score: number;
};

type MarketingData = {
  acquisition: {
    today_new_users: number;
    new_users_growth: number;
    total_users: number;
    sources: AcquisitionSource[];
    trend: TrendPoint[];
  };
  activation: {
    funnel: FunnelStep[];
    first_test_dropoff_pct: number;
    completion_dropoff_pct: number;
  };
  retention: {
    dau: number;
    wau: number;
    mau: number;
    stickiness_pct: number;
    d1_pct: number;
    d7_pct: number;
    d30_pct: number;
  };
  conversion: {
    funnel: { stage: string; count: number; color: string }[];
    total_revenue: string;
    today_revenue: string;
    total_payments_approved: number;
    total_payments_started: number;
    pending_payments: number;
    aov: number;
    checkout_conversion_pct: number;
    overall_conversion_pct: number;
  };
  content: {
    top_tests: TopTest[];
    top_subjects: TopSubject[];
    hardest_questions: HardQuestion[];
    weakest_topics: WeakTopic[];
  };
  viral_generator: {
    default_channel: string;
    templates: {
      daily_digest: string;
      hardest_question: string;
      weekly_leaderboard: string;
    };
    stats_preview: {
      active_students: number;
      questions_solved: number;
      avg_score: number;
      top_subject: string;
      weakest_topic: string;
    };
  };
};

const chartConfig = {
  users: { label: 'Yangi o\'quvchilar', color: '#6366f1' },
} satisfies ChartConfig;

function formatMoney(amount: number | string) {
  const n = Number(amount) || 0;
  return n.toLocaleString('uz-UZ') + " so'm";
}

export default function MarketingPage() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Viral Post Generator state
  const [activeTemplate, setActiveTemplate] = useState<'daily_digest' | 'hardest_question' | 'weekly_leaderboard'>('daily_digest');
  const [postText, setPostText] = useState('');
  const [targetChannel, setTargetChannel] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingToTg, setSendingToTg] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const url = `/api/panel/marketing/analytics/${isRefresh ? '?refresh=1' : ''}`;
      const res = await apiFetch<MarketingData>(url);
      setData(res);
      if (!postText && res.viral_generator?.templates) {
        setPostText(res.viral_generator.templates[activeTemplate]);
      }
      if (!targetChannel && res.viral_generator?.default_channel) {
        setTargetChannel(res.viral_generator.default_channel);
      }
    } catch (e: any) {
      toast.error("Marketing tahlillarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // When switching templates, update post text
  function handleSelectTemplate(tmpl: 'daily_digest' | 'hardest_question' | 'weekly_leaderboard') {
    setActiveTemplate(tmpl);
    if (data?.viral_generator?.templates[tmpl]) {
      setPostText(data.viral_generator.templates[tmpl]);
    }
  }

  function handleCopyPost() {
    if (!postText) return;
    navigator.clipboard.writeText(postText);
    setCopied(true);
    toast.success("Post matni nusxalandi! Telegramga joylashingiz mumkin.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendToTelegram() {
    if (!postText.trim()) {
      toast.error("Post matni bo'sh bo'lishi mumkin emas");
      return;
    }
    setSendingToTg(true);
    try {
      const res = await apiFetch<{ success?: boolean; message?: string; error?: string }>(
        '/api/panel/marketing/telegram-post/',
        {
          method: 'POST',
          body: JSON.stringify({
            text: postText,
            channel_id: targetChannel.trim() || undefined,
          }),
        }
      );
      if (res.success) {
        toast.success(res.message || "Xabar kanalga muvaffaqiyatli yuborildi!");
        setShowSendModal(false);
      } else {
        toast.error(res.error || "Yuborishda xatolik yuz berdi");
      }
    } catch (err: any) {
      toast.error(err.message || "Telegramga yuborishda xatolik");
    } finally {
      setSendingToTg(false);
    }
  }

  return (
    <PanelShell>
      <div className="space-y-6">
        
        {/* HERO / SALLAVHA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs font-bold gap-1">
                <Flame className="size-3 text-rose-500" /> Growth & Marketing
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">Data-driven Engine</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1.5">
              Marketing & Voronka Analitikasi
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Trafik manbalari, foydalanuvchi aktivatsiyasi, sadoqat (retention), to&apos;lovlar voronkasi hamda real ma&apos;lumotlardan avtomatik virusli Telegram kontent yaratish markazi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Yangilash
            </Button>
            <a href="#viral-generator">
              <Button size="sm" className="gap-1.5 text-xs font-semibold bg-primary shadow-sm hover:opacity-90">
                <Send className="size-3.5" /> Telegram Post Yaratish
              </Button>
            </a>
          </div>
        </div>

        {/* 1. YUQORI STATISTIKA KPI KARTALARI */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Bugun yangi userlar */}
          <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Bugun yangi userlar</span>
                <div className="size-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Users className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {loading ? <Skeleton className="h-7 w-12" /> : data?.acquisition.today_new_users ?? 0}
                </span>
                {!loading && (data?.acquisition.new_users_growth ?? 0) !== 0 && (
                  <span className={`text-[11px] font-bold ${
                    (data?.acquisition.new_users_growth ?? 0) > 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {(data?.acquisition.new_users_growth ?? 0) > 0 ? '+' : ''}
                    {data?.acquisition.new_users_growth} kechagidan
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Jami o&apos;quvchilar: {loading ? '...' : (data?.acquisition.total_users ?? 0).toLocaleString()} nafar
              </p>
            </CardContent>
          </Card>

          {/* Faol o'quvchilar (DAU) */}
          <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Bugun faol (DAU)</span>
                <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <Activity className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {loading ? <Skeleton className="h-7 w-12" /> : data?.retention.dau ?? 0}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ({data?.retention.stickiness_pct ?? 0}% Stickiness)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Oylik faol (MAU): {loading ? '...' : (data?.retention.mau ?? 0).toLocaleString()} nafar
              </p>
            </CardContent>
          </Card>

          {/* Aktivatsiya stavkasi */}
          <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">1-testni tugatdi</span>
                <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <Target className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {loading ? <Skeleton className="h-7 w-12" /> : `${data?.activation.funnel[2]?.pct_of_total ?? 0}%`}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  ({data?.activation.funnel[2]?.count ?? 0} o&apos;quvchi)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ro&apos;yxatdan o&apos;tgandan so&apos;ng 1-testni tugatganlar
              </p>
            </CardContent>
          </Card>

          {/* Pullik konversiya */}
          <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Konversiya (To&apos;lov)</span>
                <div className="size-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <CreditCard className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {loading ? <Skeleton className="h-7 w-12" /> : `${data?.conversion.overall_conversion_pct ?? 0}%`}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  ({data?.conversion.total_payments_approved ?? 0} to&apos;lov)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Jami tushum: {loading ? '...' : formatMoney(data?.conversion.total_revenue ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ASOSIY BO'LIMLAR TABLARI */}
        <Tabs defaultValue="funnels" className="space-y-6">
          <TabsList className="bg-muted/60 p-1 border">
            <TabsTrigger value="funnels" className="gap-1.5 text-xs font-semibold">
              <Layers className="size-3.5" /> Aktivatsiya & Voronkalar
            </TabsTrigger>
            <TabsTrigger value="acquisition" className="gap-1.5 text-xs font-semibold">
              <Share2 className="size-3.5" /> Manbalar & Sadoqat (Retention)
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 text-xs font-semibold">
              <BookOpen className="size-3.5" /> Kontent Diagnostikasi
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Flame className="size-3.5 text-rose-500" /> Telegram Post Generator
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FUNNELS & ACTIVATION */}
          <TabsContent value="funnels" className="space-y-6">
            
            {/* ACTIVATION FUNNEL (5 QADAM) */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      Foydalanuvchi Aktivatsiya Voronkasi (Activation Funnel)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ro&apos;yxatdan o&apos;tishdan boshlab doimiy faol o&apos;quvchiga aylanishgacha bo&apos;lgan bosqichlar va uzilishlar.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs w-fit">
                    1-testni boshlamaganlar: {data?.activation.first_test_dropoff_pct ?? 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {data?.activation.funnel.map((step, idx) => (
                      <div key={step.step} className="relative">
                        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                              {step.step}
                            </span>
                            <span className="text-foreground font-semibold">{step.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">{step.count.toLocaleString()} ta</span>
                            <span className="text-muted-foreground w-12 text-right">({step.pct_of_total}%)</span>
                            {idx > 0 && (
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                step.conversion_from_prev >= 60
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}>
                                {step.conversion_from_prev}% qadam o&apos;tishi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar with funnel look */}
                        <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(step.pct_of_total, 3)}%`,
                              backgroundColor: step.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 p-3 bg-muted/40 rounded-xl border border-border/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        💡 <strong>Marketing Xulosasi:</strong> Eng katta uzilish 1-testni boshlash va tugatish orasida yuz beradi ({data?.activation.completion_dropoff_pct ?? 0}% tugatmay chiqib ketgan).
                      </span>
                      <Link href="/panel/tests">
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold">
                          Testlarni soddalashtirish <ChevronRight className="size-3 ml-0.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CONVERSION FUNNEL & REVENUE */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* To'lovlar Voronkasi */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-500" />
                    Monetizatsiya Voronkasi (Premium Checkout)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Premium qiziqishdan to muvaffaqiyatli to&apos;lovgacha bo&apos;lgan yo&apos;l.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : (
                    <div className="space-y-4">
                      {data?.conversion.funnel.map((item, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{item.stage}</span>
                            <span className="font-bold text-foreground">{item.count.toLocaleString()} ta</span>
                          </div>
                          <Progress
                            value={idx === 0 ? 100 : idx === 1 ? (data.conversion.checkout_conversion_pct) : data.conversion.overall_conversion_pct * 10}
                            className="h-2.5"
                          />
                        </div>
                      ))}

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div className="p-2.5 bg-muted/40 rounded-lg">
                          <p className="text-[11px] text-muted-foreground">Checkoutdan to&apos;lovga</p>
                          <p className="text-base font-bold text-foreground mt-0.5">
                            {data?.conversion.checkout_conversion_pct}%
                          </p>
                        </div>
                        <div className="p-2.5 bg-muted/40 rounded-lg">
                          <p className="text-[11px] text-muted-foreground">O&apos;rtacha chek (AOV)</p>
                          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatMoney(data?.conversion.aov ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tushum & To'lovlar xulosasi */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    Moliya & To&apos;lovlar Natijasi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tasdiqlangan to&apos;lovlar va kutilayotgan arizalar holati.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Jami tasdiqlangan</p>
                          <p className="text-xl font-black text-foreground mt-1">
                            {formatMoney(data?.conversion.total_revenue ?? 0)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {data?.conversion.total_payments_approved} ta xarid
                          </p>
                        </div>
                        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Bugungi tushum</p>
                          <p className="text-xl font-black text-foreground mt-1">
                            {formatMoney(data?.conversion.today_revenue ?? 0)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Kutilayotgan: {data?.conversion.pending_payments} ta ariza
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/60">
                        <div>
                          <p className="text-xs font-semibold text-foreground">To&apos;lov arizalarini tekshirish</p>
                          <p className="text-[11px] text-muted-foreground">Admin panelidan to&apos;lov skrinshotlarini tasdiqlash</p>
                        </div>
                        <Link href="/panel/payments">
                          <Button size="sm" variant="outline" className="text-xs font-semibold">
                            Ko&apos;rish <ArrowRight className="size-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: ACQUISITION & RETENTION */}
          <TabsContent value="acquisition" className="space-y-6">
            
            {/* Manbalar taqsimoti */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    Foydalanuvchilar Qayerdan Kelmoqda? (Acquisition)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Telegram bot, Referral do&apos;stlar, sayt va qidiruv tizimlari bo&apos;yicha taqsimot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-44 w-full" />
                  ) : (
                    <div className="space-y-3.5">
                      {data?.acquisition.sources.map((item) => (
                        <div key={item.source} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.label}
                            </span>
                            <span className="text-muted-foreground">
                              <strong>{item.count.toLocaleString()}</strong> nafar ({item.pct}%)
                            </span>
                          </div>
                          <Progress value={item.pct} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 14 Kunlik Ro'yxatdan O'tish Dinamikasi */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-indigo-500" />
                    So&apos;nggi 14 Kunlik O&apos;sish Grafigi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Har kungi yangi ro&apos;yxatdan o&apos;tgan o&apos;quvchilar soni dinamikasi.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-44 w-full" />
                  ) : (
                    <div className="h-44 w-full">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                        <AreaChart data={data?.acquisition.trend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#userGrad)" />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RETENTION COHORTS (D1, D7, D30) */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" />
                  O&apos;quvchilar Sadoqati va Qaytishi (Retention Cohorts)
                </CardTitle>
                <CardDescription className="text-xs">
                  Ro&apos;yxatdan o&apos;tgan foydalanuvchilar qancha vaqt o&apos;tgach yana test ishlashga qaytmoqda?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-muted/40 rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">D1 Retention</span>
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                          1 kundan so&apos;ng
                        </Badge>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">{data?.retention.d1_pct}%</p>
                      <Progress value={data?.retention.d1_pct ?? 0} className="h-1.5 mt-2" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">Ertasi kuni kirib test ishlaganlar</p>
                    </div>

                    <div className="p-4 bg-muted/40 rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">D7 Retention</span>
                        <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          1 haftadan so&apos;ng
                        </Badge>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">{data?.retention.d7_pct}%</p>
                      <Progress value={data?.retention.d7_pct ?? 0} className="h-1.5 mt-2" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">7-14 kundan so&apos;ng faol bo&apos;lganlar</p>
                    </div>

                    <div className="p-4 bg-muted/40 rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">D30 Retention</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          1 oydan so&apos;ng
                        </Badge>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">{data?.retention.d30_pct}%</p>
                      <Progress value={data?.retention.d30_pct ?? 0} className="h-1.5 mt-2" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">30 kundan keyin ham o&apos;qiyotganlar</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CONTENT DIAGNOSTICS */}
          <TabsContent value="content" className="space-y-6">
            
            {/* ENG KO'P ISHLANGAN TESTLAR & FANLAR */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top Testlar */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="size-4 text-amber-500" />
                    Eng Ko&apos;p Ishlanayotgan Testlar
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O&apos;quvchilar orasida eng yuqori talabga ega test to&apos;plamlari.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="divide-y text-xs">
                      {data?.content.top_tests.map((t, idx) => (
                        <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{t.title}</p>
                              <p className="text-[11px] text-muted-foreground">{t.subject}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-foreground">{t.attempts} ta urinish</span>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {t.avg_score}% o&apos;rtacha
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fanlar reytingi */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BookMarked className="size-4 text-primary" />
                    Ommabop Fanlar Reytingi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Platformada eng faol o&apos;rganilayotgan yo&apos;nalishlar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="divide-y text-xs">
                      {data?.content.top_subjects.map((s, idx) => (
                        <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                            <div>
                              <p className="font-semibold text-foreground">{s.name}</p>
                              <p className="text-[11px] text-muted-foreground">{s.students} nafar faol o&apos;quvchi</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-foreground">{s.attempts} ta test</span>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                              {s.avg_score}% natija
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ENG QIYIN SAVOLLAR & ZAIF MAVZULAR */}
            <div className="grid gap-4 lg:grid-cols-2">
              
              {/* Eng Qiyin Savollar */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <HelpCircle className="size-4 text-rose-500" />
                    Eng Ko&apos;p Xato Qilingan Savollar (Top 5)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O&apos;quvchilar eng ko&apos;p xato qilgan savollar — marketing va tahlil uchun ajoyib material!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="space-y-3">
                      {data?.content.hardest_questions.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 border-rose-500/20">
                              {q.error_pct}% xato ({q.total_answered} javob)
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{q.subject}</span>
                          </div>
                          <p className="text-foreground font-medium line-clamp-2 italic">
                            &ldquo;{q.text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Eng Zaif Mavzular */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ThumbsDown className="size-4 text-amber-500" />
                    O&apos;quvchilarning Eng Zaif Mavzulari
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O&apos;rtacha o&apos;zlashtirish foizi eng past bo&apos;lgan mavzular.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="space-y-3">
                      {data?.content.weakest_topics.map((wt) => (
                        <div key={wt.id} className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground truncate max-w-[200px]">{wt.title}</span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold">{wt.accuracy_pct}% to&apos;g&apos;ri</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Fan: {wt.subject}</span>
                            <span>{wt.total_answers} ta savol ishlangan</span>
                          </div>
                          <Progress value={wt.accuracy_pct} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: VIRAL TELEGRAM POST GENERATOR */}
          <TabsContent value="generator" className="space-y-6">
            <div id="viral-generator">
              <Card className="border-2 border-rose-500/30 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-rose-500 text-white font-bold text-xs gap-1">
                          <Sparkles className="size-3" /> Viral Product-Led Growth
                        </Badge>
                        <Badge variant="outline" className="text-xs">Real Data Loop</Badge>
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground">
                        Avtomatik Telegram Kontent Generatori
                      </CardTitle>
                      <CardDescription className="text-xs max-w-xl">
                        Saytdagi real ma&apos;lumotlar asosida avtomatik virusli post matnlari yaratiladi. Bir tugma bilan nusxalang yoki bevosita rasmiy Telegram kanalga chiqaring.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPost}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                        {copied ? "Nusxalandi!" : "Nusxa olish"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowSendModal(true)}
                        className="gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                      >
                        <Send className="size-3.5" /> Kanalga Yuborish
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Shablon tanlash tugmalari */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={activeTemplate === 'daily_digest' ? 'default' : 'outline'}
                      onClick={() => handleSelectTemplate('daily_digest')}
                      className="text-xs font-semibold gap-1.5"
                    >
                      🔥 1. Kunlik Xulosa (Daily Snapshot)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeTemplate === 'hardest_question' ? 'default' : 'outline'}
                      onClick={() => handleSelectTemplate('hardest_question')}
                      className="text-xs font-semibold gap-1.5"
                    >
                      🧠 2. Kunning Eng Qiyin Savoli
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeTemplate === 'weekly_leaderboard' ? 'default' : 'outline'}
                      onClick={() => handleSelectTemplate('weekly_leaderboard')}
                      className="text-xs font-semibold gap-1.5"
                    >
                      🏆 3. Hafta Peshqadamlari
                    </Button>
                  </div>

                  {/* Interaktiv Tahrirlovchi Matn */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">Post matni (Telegram uchun tayyor, tahrirlash mumkin):</span>
                      <span>{postText.length} ta belgi</span>
                    </div>
                    <Textarea
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      rows={11}
                      className="font-mono text-xs sm:text-sm leading-relaxed p-3.5 bg-background border-border/80 focus:border-rose-500 rounded-xl"
                      placeholder="Post matni generatsiya qilinmoqda..."
                    />
                  </div>

                  {/* Qisqacha ko'rsatkichlar minikartalari */}
                  <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60">
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-500" />
                      Post ichidagi real ko&apos;rsatkichlar manbasi:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground">O&apos;quvchilar:</span>
                        <p className="font-bold text-foreground mt-0.5">
                          {data?.viral_generator.stats_preview.active_students} nafar
                        </p>
                      </div>
                      <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground">Yechilgan savollar:</span>
                        <p className="font-bold text-foreground mt-0.5">
                          {data?.viral_generator.stats_preview.questions_solved} ta
                        </p>
                      </div>
                      <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground">O&apos;rtacha natija:</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {data?.viral_generator.stats_preview.avg_score}%
                        </p>
                      </div>
                      <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground">Zaif mavzu:</span>
                        <p className="font-bold text-foreground mt-0.5 truncate">
                          {data?.viral_generator.stats_preview.weakest_topic}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Growth Loop izohi */}
                  <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 rounded-xl border border-rose-500/20 text-xs space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      🔁 IlmIldizi Viral Marketing Tsikli qanday ishlaydi?
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      117 nafar o&apos;quvchi test yechadi ➔ Real qiyin savol va natija postga aylanadi ➔ Telegram kanaldagi obunachilar o&apos;z bilimini sinash uchun saytga kiradi ➔ Yangi o&apos;quvchilar qo&apos;shiladi ➔ Yana yangi kontent generatsiya qilinadi!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* TELEGRAM KANALGA YUBORISH DIALOGI */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="size-4 text-rose-500" />
                Telegram Kanalga Post Chiqarish
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ushbu post to&apos;g&apos;ridan-to&apos;g&apos;ri rasmiy Telegram kanalga e&apos;lon qilinadi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Kanal manzili yoki ID</label>
                <Input
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value)}
                  placeholder="@ilmildizi"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bot ushbu kanalda administrator (post qo&apos;yish huquqi bilan) bo&apos;lishi lozim.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Post Ko&apos;rinishi</label>
                <div className="mt-1 max-h-40 overflow-y-auto p-2.5 bg-muted/60 rounded-lg text-xs font-mono whitespace-pre-wrap border">
                  {postText}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSendModal(false)}
                disabled={sendingToTg}
                className="text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                size="sm"
                onClick={handleSendToTelegram}
                disabled={sendingToTg || !postText.trim()}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {sendingToTg ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" /> Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" /> Tasdiqlash va Yuborish
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PanelShell>
  );
}
