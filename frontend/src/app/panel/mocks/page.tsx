'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award, Trophy, Search, Download, RefreshCw, Clock, CheckCircle2,
  XCircle, ArrowUpDown, Flame, Sparkles, Filter, ChevronRight,
  ExternalLink, UserCheck, Layers, HelpCircle, Phone, Send, Loader2,
  BookOpen, Calendar, FileText, X
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import CertificateModal from '@/components/student/CertificateModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface MockItem {
  id: number;
  rank: number;
  student_name: string;
  username: string;
  telegram_id: number | string | null;
  phone: string;
  test_id: number;
  test_title: string;
  subject_name: string;
  score: number | null;
  grade: string;
  grade_tone: string;
  correct_answers: number;
  wrong_answers: number;
  skipped_answers: number;
  total_questions?: number;
  duration_str: string;
  is_completed: boolean;
  completed_at: string | null;
  raw_completed_at?: string | null;
  started_at: string | null;
}

interface MockData {
  total_count: number;
  completed_count: number;
  avg_score: number;
  max_score: number;
  gold_count: number;
  available_subjects?: { id: number; name: string }[];
  available_mocks: { id: number; title: string }[];
  items: MockItem[];
}

const GRADE_BADGE_STYLES: Record<string, string> = {
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  teal: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400',
  sky: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  orange: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  yellow: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400',
  slate: 'border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

export default function PanelMocksPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<MockData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Filtrlar
  const [search, setSearch] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<'score' | 'date'>('score');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Sertifikat modali holati
  const [certModalOpen, setCertModalOpen] = useState<boolean>(false);
  const [selectedAttemptForCert, setSelectedAttemptForCert] = useState<MockItem | null>(null);

  function handleOpenCertificate(item: MockItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedAttemptForCert(item);
    setCertModalOpen(true);
  }

  function loadMocks() {
    if (!access) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (selectedSubjectId) params.set('subject_id', selectedSubjectId);
    if (selectedTestId) params.set('test_id', selectedTestId);
    if (selectedDate) params.set('date', selectedDate);
    if (selectedSort) params.set('sort', selectedSort);
    if (selectedStatus) params.set('completed', selectedStatus);

    apiFetch<MockData>(`/api/panel/mocks/?${params.toString()}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        const msg = (e instanceof Error && e.message && e.message.trim()) ? e.message : 'Mock natijalarini yuklashda xatolik yuz berdi';
        toast.error(msg);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadMocks();
  }, [access, selectedSubjectId, selectedTestId, selectedDate, selectedSort, selectedStatus]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadMocks();
  }

  async function handleExportCsv() {
    if (!access) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set('subject_id', selectedSubjectId);
      if (selectedTestId) params.set('test_id', selectedTestId);
      if (selectedDate) params.set('date', selectedDate);
      if (selectedStatus) params.set('completed', selectedStatus);
      if (search.trim()) params.set('q', search.trim());
      if (selectedSort) params.set('sort', selectedSort);

      const res = await fetch(`${API_URL}/api/panel/mocks/export/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) {
        let errText = `Server ${res.status} xato qaytardi`;
        try {
          const body = await res.json();
          if (body && typeof body === 'object') {
            errText = body.error || body.detail || body.message || errText;
          }
        } catch {
          // ignore
        }
        throw new Error(errText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const subjName = data?.available_subjects?.find(s => String(s.id) === selectedSubjectId)?.name || 'barcha_fanlar';
      const dateSuffix = selectedDate || new Date().toISOString().slice(0, 10);
      link.download = `mock_natijalari_${subjName}_${dateSuffix}.csv`.replace(/\s+/g, '_');
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Mock natijalari CSV formatida yuklab olindi!');
    } catch (e) {
      const msg = (e instanceof Error && e.message && e.message.trim()) ? e.message : 'CSV yuklashda xatolik yuz berdi';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    if (!access) return;
    setExportingPdf(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set('subject_id', selectedSubjectId);
      if (selectedTestId) params.set('test_id', selectedTestId);
      if (selectedDate) params.set('date', selectedDate);
      if (selectedStatus) params.set('completed', selectedStatus);
      if (search.trim()) params.set('q', search.trim());
      if (selectedSort) params.set('sort', selectedSort);

      const res = await fetch(`${API_URL}/api/panel/mocks/export-pdf/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) {
        let errText = `Server ${res.status} xato qaytardi`;
        try {
          const body = await res.json();
          if (body && typeof body === 'object') {
            errText = body.error || body.detail || body.message || errText;
          }
        } catch {
          // ignore
        }
        throw new Error(errText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const subjName = data?.available_subjects?.find(s => String(s.id) === selectedSubjectId)?.name || 'barcha_fanlar';
      const dateSuffix = selectedDate || new Date().toISOString().slice(0, 10);
      link.download = `mock_hisoboti_${subjName}_${dateSuffix}.pdf`.replace(/\s+/g, '_');
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Mock natijalari PDF hisoboti muvaffaqiyatli yuklab olindi!');
    } catch (e) {
      const msg = (e instanceof Error && e.message && e.message.trim()) ? e.message : 'PDF hisobot yuklashda xatolik yuz berdi';
      toast.error(msg);
    } finally {
      setExportingPdf(false);
    }
  }

  const items = data?.items || [];

  return (
    <PanelShell>
      <div className="space-y-6">

        {/* Sarlavha & Asosiy tugmalar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Award className="size-6 text-amber-500" /> Mock Imtihon Natijalari
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mock testlarini topshirgan barcha o&apos;quvchilar ro&apos;yxati, ballari, sertifikat darajalari va reytingi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMocks}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </Button>
            
            {/* PDF Hisobot Yuklash */}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-sm"
              title="Tanlangan filtrlar bo'yicha rasmiy PDF hisobot yuklab olish"
            >
              {exportingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              PDF hisobot yuklash
            </Button>

            {/* CSV Yuklash */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="gap-1.5 border-border/80 hover:bg-surface-hover text-xs"
            >
              {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              CSV (Excel)
            </Button>
          </div>
        </div>

        {/* KPI Tezkor Statistika */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="border border-border/60 shadow-xs bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                <UserCheck className="size-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Jami qatnashchilar</p>
                <div className="text-xl font-bold text-foreground truncate">
                  {loading ? <Skeleton className="h-6 w-16" /> : `${data?.total_count || 0} nafar`}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <Flame className="size-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">O&apos;rtacha ko&apos;rsatkich</p>
                <div className="text-xl font-bold text-foreground truncate">
                  {loading ? <Skeleton className="h-6 w-16" /> : `${data?.avg_score || 0}%`}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="size-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Eng yuqori ball</p>
                <div className="text-xl font-bold text-foreground truncate">
                  {loading ? <Skeleton className="h-6 w-16" /> : `${data?.max_score || 0}%`}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <Sparkles className="size-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Oltin daraja (A+)</p>
                <div className="text-xl font-bold text-foreground truncate">
                  {loading ? <Skeleton className="h-6 w-16" /> : `${data?.gold_count || 0} ta`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtr va Qidiruv qatori */}
        <Card className="border border-border/60 shadow-xs bg-card/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              
              {/* Qidiruv */}
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ism, familiya, @username yoki telefon..."
                  className="pl-9 h-9.5 text-sm bg-background/80"
                />
              </form>

              {/* Filtr dropdownlari */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Fan tanlash (Subject) */}
                <div className="relative">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setSelectedTestId('');
                    }}
                    className="h-9.5 rounded-lg border border-input bg-background/80 px-3 pr-7 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                    title="Fanni tanlang"
                  >
                    <option value="">Barcha fanlar</option>
                    {data?.available_subjects?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Mock test tanlash */}
                {data?.available_mocks && data.available_mocks.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="h-9.5 rounded-lg border border-input bg-background/80 px-3 pr-7 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring max-w-[190px] truncate"
                      title="Aniq mock testni tanlang"
                    >
                      <option value="">Barcha Mock testlar</option>
                      {data.available_mocks.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Topshirilgan kun (Sana) filtri */}
                <div
                  className="flex items-center gap-1.5 h-9.5 rounded-lg border border-input bg-background/80 px-2.5"
                  title="Topshirilgan kun bo'yicha saralash"
                >
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs font-medium text-foreground focus:outline-hidden cursor-pointer"
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      title="Sanani tozalash"
                      className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* 4. Saralash */}
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value as 'score' | 'date')}
                  className="h-9.5 rounded-lg border border-input bg-background/80 px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="score">🏆 Reyting (Ball bo&apos;yicha)</option>
                  <option value="date">🕒 Oxirgi topshirganlar</option>
                </select>

                {/* 5. Holat */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9.5 rounded-lg border border-input bg-background/80 px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="">Barcha urinishlar</option>
                  <option value="True">Faqat yakunlanganlar</option>
                  <option value="False">Davom etayotganlar</option>
                </select>

                {(search || selectedSubjectId || selectedTestId || selectedDate || selectedStatus) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSelectedSubjectId('');
                      setSelectedTestId('');
                      setSelectedDate('');
                      setSelectedStatus('');
                    }}
                    className="text-xs h-9.5 text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="size-3.5" /> Tozalash
                  </Button>
                )}
              </div>
            </div>

            {/* Faol filtrlar ko'rinishi */}
            {(selectedSubjectId || selectedDate || selectedTestId || selectedStatus) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Filter className="size-3 text-amber-500" /> Faol filtrlar:
                </span>
                {selectedSubjectId && (
                  <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    Fan: {data?.available_subjects?.find((s) => String(s.id) === selectedSubjectId)?.name || 'Fan'}
                    <button type="button" onClick={() => setSelectedSubjectId('')} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedTestId && (
                  <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                    Test: {data?.available_mocks?.find((m) => String(m.id) === selectedTestId)?.title || 'Test'}
                    <button type="button" onClick={() => setSelectedTestId('')} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedDate && (
                  <Badge variant="outline" className="gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Sana: {selectedDate}
                    <button type="button" onClick={() => setSelectedDate('')} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedStatus && (
                  <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                    Holat: {selectedStatus === 'True' ? 'Faqat yakunlanganlar' : 'Davom etayotganlar'}
                    <button type="button" onClick={() => setSelectedStatus('')} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Natijalar Jadvali */}
        <Card className="border border-border/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">O&apos;rin</th>
                  <th className="py-3.5 px-4">O&apos;quvchi</th>
                  <th className="py-3.5 px-4">Test &amp; Fan</th>
                  <th className="py-3.5 px-4 text-center">Natija &amp; Daraja</th>
                  <th className="py-3.5 px-4 text-center">To&apos;g&apos;ri / Xato / Bo&apos;sh</th>
                  <th className="py-3.5 px-4">Ketgan vaqt</th>
                  <th className="py-3.5 px-4">Sana</th>
                  <th className="py-3.5 px-4 text-right">Tahlil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3.5 px-4 text-center"><Skeleton className="size-6 rounded-full mx-auto" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-44 mb-1" /><Skeleton className="h-3 w-16" /></td>
                      <td className="py-3.5 px-4 text-center"><Skeleton className="h-6 w-20 mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Skeleton className="h-5 w-24 mx-auto" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-muted-foreground">
                        <Award className="size-12 stroke-1 text-muted-foreground/40 mb-3" />
                        <p className="font-semibold text-foreground text-sm">Mock natijalari topilmadi</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qidiruv yoki filtr parametrlarini o&apos;zgartirib ko&apos;ring.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isTop1 = item.rank === 1 && selectedSort === 'score';
                    const isTop2 = item.rank === 2 && selectedSort === 'score';
                    const isTop3 = item.rank === 3 && selectedSort === 'score';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/panel/attempts/${item.id}`)}
                      >
                        {/* O'rin */}
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-black text-sm shadow-xs ring-1 ring-amber-500/40">
                              🥇
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-400/20 text-slate-400 font-black text-sm shadow-xs ring-1 ring-slate-400/40">
                              🥈
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-600 font-black text-sm shadow-xs ring-1 ring-amber-700/40">
                              🥉
                            </span>
                          ) : (
                            <span className="inline-flex size-6 items-center justify-center rounded-md font-mono text-xs text-muted-foreground font-semibold bg-muted/60">
                              {item.rank}
                            </span>
                          )}
                        </td>

                        {/* O'quvchi */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenCertificate(item, e)}
                              className="size-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 ring-1 ring-amber-500/30 hover:scale-105 hover:bg-amber-500/20 transition-all cursor-pointer"
                              title="Sertifikatni ko'rish"
                            >
                              {item.student_name.slice(0, 2)}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenCertificate(item, e)}
                                  className="font-semibold text-foreground truncate hover:text-amber-500 text-left transition-colors flex items-center gap-1.5 group/name"
                                  title="Sertifikatni ko'rish uchun bosing"
                                >
                                  <span className="underline decoration-dotted underline-offset-3 decoration-amber-500/50 group-hover/name:decoration-amber-500">
                                    {item.student_name}
                                  </span>
                                  <Award className="size-3.5 text-amber-500 shrink-0 opacity-80 group-hover/name:opacity-100 group-hover/name:scale-110 transition-transform" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {(() => {
                                  const u = item.username || '';
                                  const isTech = u.startsWith('tg_') || u.startsWith('id_') || /^\d+$/.test(u);
                                  const displayU = isTech ? '' : (u.includes('@') ? u : `@${u}`);
                                  return (
                                    <>
                                      {displayU && <span className="truncate">{displayU}</span>}
                                      {item.phone && (
                                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/80">
                                          <Phone className="size-2.5" /> {item.phone}
                                        </span>
                                      )}
                                      {!displayU && !item.phone && (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Test & Fan */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-foreground line-clamp-1 max-w-xs text-xs sm:text-sm">
                            {item.test_title}
                          </p>
                          <span className="inline-block mt-0.5 text-[11px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
                            {item.subject_name}
                          </span>
                        </td>

                        {/* Ball & Daraja */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-sm tracking-tight text-foreground">
                              {item.score !== null ? `${item.score}%` : '—'}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold px-2 py-0.5 ${GRADE_BADGE_STYLES[item.grade_tone] || GRADE_BADGE_STYLES.slate}`}
                            >
                              {item.grade}
                            </Badge>
                          </div>
                        </td>

                        {/* To'g'ri / Xato / Bo'sh */}
                        <td className="py-3.5 px-4 text-center">
                          {(() => {
                            const totalQ = item.total_questions || (item.correct_answers + item.wrong_answers + item.skipped_answers) || 45;
                            const emptyQ = Math.max(0, totalQ - item.correct_answers - item.wrong_answers);
                            return (
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="To'g'ri">
                                  ✓ {item.correct_answers}
                                </span>
                                <span className="text-muted-foreground/40">/</span>
                                <span className="text-rose-600 dark:text-rose-400 font-semibold" title="Xato">
                                  ✗ {item.wrong_answers}
                                </span>
                                <span className="text-muted-foreground/40">/</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold" title="Bo'sh">
                                  ○ {emptyQ}
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Ketgan vaqt */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3 text-muted-foreground/70" />
                            <span>{item.duration_str}</span>
                          </div>
                        </td>

                        {/* Sana */}
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {item.completed_at || item.started_at || '—'}
                        </td>

                        {/* Tahlil va Sertifikat tugmalari */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                              onClick={(e) => handleOpenCertificate(item, e)}
                              title="Sertifikatni ochish va yuklab olish"
                            >
                              <Award className="size-3.5 text-amber-500" /> Sertifikat
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/panel/attempts/${item.id}`);
                              }}
                              title="Javoblar tahlilini ko'rish"
                            >
                              Tahlil <ChevronRight className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pastki qism */}
          {items.length > 0 && (
            <div className="border-t border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>Ko&apos;rsatildi: <b>{items.length}</b> ta natija</span>
              <span className="text-[11px] text-muted-foreground/80">
                Ism yoki &ldquo;Sertifikat&rdquo; ustiga bosib sertifikatni ko&apos;rishingiz mumkin
              </span>
            </div>
          )}
        </Card>

        {/* Tanlangan o'quvchi sertifikati modali */}
        {selectedAttemptForCert && (
          <CertificateModal
            open={certModalOpen}
            onOpenChange={setCertModalOpen}
            studentName={selectedAttemptForCert.student_name}
            testTitle={selectedAttemptForCert.test_title}
            score={selectedAttemptForCert.score ?? 0}
            correctCount={selectedAttemptForCert.correct_answers || 0}
            totalQuestions={
              selectedAttemptForCert.total_questions ||
              ((selectedAttemptForCert.correct_answers || 0) +
                (selectedAttemptForCert.wrong_answers || 0) +
                (selectedAttemptForCert.skipped_answers || 0)) ||
              45
            }
            date={selectedAttemptForCert.raw_completed_at || selectedAttemptForCert.completed_at || undefined}
            attemptId={selectedAttemptForCert.id}
          />
        )}

      </div>
    </PanelShell>
  );
}
