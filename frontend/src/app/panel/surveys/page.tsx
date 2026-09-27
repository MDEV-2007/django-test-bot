'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquareHeart, Star, Search, Filter, Sparkles, Award,
  Calendar, CheckCircle2, Flame, ThumbsUp, RefreshCw, Plus,
  Trash2, Edit3, Globe, Check, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

interface SurveyItem {
  id: number;
  author_name?: string;
  user_name: string;
  username: string;
  test_title: string;
  subject_name?: string;
  score: number | null;
  correct_answers: number | null;
  difficulty: string;
  platform_rating: number;
  comment: string;
  is_featured?: boolean;
  featured_badge?: string;
  custom_role?: string;
  created_at: string;
}

interface SurveysData {
  count: number;
  items: SurveyItem[];
}

const DIFFICULTY_MAP: Record<string, { label: string; tone: string; emoji: string }> = {
  easy: { label: 'Oson', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', emoji: '🟢' },
  medium: { label: "O'rtacha", tone: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400', emoji: '🟡' },
  hard: { label: 'Qiyin', tone: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400', emoji: '🔴' },
  very_hard: { label: 'Juda murakkab', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400', emoji: '🔥' },
};

export default function PanelSurveysPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<SurveysData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterFeatured, setFilterFeatured] = useState<string>('');

  // Feature Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
  const [editBadge, setEditBadge] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newBadge, setNewBadge] = useState('A+ (92 ball)');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newIsFeatured, setNewIsFeatured] = useState(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  function loadSurveys() {
    if (!access) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (filterRating) params.set('rating', filterRating);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);
    if (filterFeatured) params.set('featured', filterFeatured);

    apiFetch<SurveysData>(`/api/panel/surveys/?${params.toString()}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Sharhlarni yuklashda xatolik');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSurveys();
  }, [access, filterRating, filterDifficulty, filterFeatured]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadSurveys();
  }

  // Quick 1-click Toggle Featured
  async function handleQuickToggleFeatured(item: SurveyItem) {
    const nextVal = !item.is_featured;
    try {
      const res = await apiFetch<any>(`/api/panel/surveys/${item.id}/toggle-featured/`, {
        method: 'POST',
        body: JSON.stringify({ is_featured: nextVal }),
      });
      toast.success(
        nextVal
          ? 'Sharh Landing sahifasiga muvaffaqiyatli chiqarildi!'
          : 'Sharh Landing sahifasidan olib tashlandi.'
      );
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === item.id ? { ...it, is_featured: nextVal } : it
          ),
        };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Amal bajarilmadi');
    }
  }

  // Open Edit Modal
  function openEditModal(item: SurveyItem) {
    setEditingItem(item);
    setEditAuthor(item.author_name || item.user_name || '');
    setEditBadge(item.featured_badge || 'A+ (92 ball)');
    setEditRole(item.custom_role || 'Abituriyent');
    setEditIsFeatured(Boolean(item.is_featured));
    setEditModalOpen(true);
  }

  // Save Edit
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmittingEdit(true);

    try {
      await apiFetch(`/api/panel/surveys/${editingItem.id}/toggle-featured/`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: editAuthor,
          featured_badge: editBadge,
          custom_role: editRole,
          is_featured: editIsFeatured,
        }),
      });

      toast.success("Sharh ma'lumotlari saqlandi!");
      setEditModalOpen(false);
      loadSurveys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik yuz berdi');
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  // Create New Review
  async function handleCreateSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Sharh matnini kiriting!');
      return;
    }
    setIsSubmittingCreate(true);

    try {
      await apiFetch(`/api/panel/surveys/create/`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: newAuthor,
          custom_role: newRole,
          featured_badge: newBadge,
          comment: newComment,
          platform_rating: newRating,
          is_featured: newIsFeatured,
        }),
      });

      toast.success("Yangi sharh qo'shildi va landingga belgilandi!");
      setCreateModalOpen(false);
      setNewAuthor('');
      setNewRole('');
      setNewComment('');
      loadSurveys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Qo‘shishda xatolik yuz berdi');
    } finally {
      setIsSubmittingCreate(false);
    }
  }

  // Delete Review
  async function handleDeleteSurvey(id: number) {
    if (!confirm("Haqiqatan ham ushbu sharhni o'chirmoqchimisiz?")) return;
    try {
      await apiFetch(`/api/panel/surveys/${id}/delete/`, { method: 'DELETE' });
      toast.success("Sharh o'chirildi");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((it) => it.id !== id),
          count: Math.max(0, prev.count - 1),
        };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  }

  const items = data?.items || [];
  const totalCount = data?.count || 0;
  const featuredCount = items.filter((i) => i.is_featured).length;
  const avgRating = items.length
    ? (items.reduce((acc, curr) => acc + curr.platform_rating, 0) / items.length).toFixed(1)
    : '5.0';
  const withComments = items.filter((i) => i.comment && i.comment.trim().length > 0);

  return (
    <PanelShell>
      <div className="space-y-6">
        {/* Sarlavha & Boshqaruv tugmalari */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquareHeart className="size-6 text-amber-500" /> O&apos;quvchilar Sharhlari &amp; So&apos;rovnomalar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mock imtihonlarni topshirgan o&apos;quvchilarning baholari. O&apos;zingiz xohlagan sharhlarni to&apos;g&apos;ridan-to&apos;g&apos;ri <strong>Landing sahifasiga</strong> chiqaring.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              <Plus className="size-4" /> Yangi sharh qo&apos;shish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSurveys}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </Button>
          </div>
        </div>

        {/* Statistika Kartalari */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jami Sharhlar</p>
                <p className="text-2xl font-black text-foreground mt-1">{totalCount}</p>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <MessageSquareHeart className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-card)] bg-emerald-500/5 border-emerald-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Landingda Ko&apos;rinmoqda</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{featuredCount}</p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <Globe className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O&apos;rtacha Baho</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-2xl font-black text-foreground">{avgRating}</span>
                  <div className="flex items-center text-amber-400">
                    <Star className="size-4 fill-amber-400" />
                  </div>
                </div>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Star className="size-5 fill-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-card)] bg-[var(--surface-card)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matnli Fikrlar</p>
                <p className="text-2xl font-black text-foreground mt-1">{withComments.length}</p>
              </div>
              <div className="size-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtr va Qidiruv */}
        <Card className="border-[var(--border-card)] bg-[var(--surface-card-soft)]">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="O'quvchi ismi, username, test nomi yoki sharh bo'yicha qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl bg-[var(--surface-card)] border-[var(--border-strong)] text-sm"
                />
              </div>

              {/* Landing Filtr */}
              <select
                value={filterFeatured}
                onChange={(e) => setFilterFeatured(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
              >
                <option value="">Barcha sharhlar</option>
                <option value="true">⭐ Faqat Landingdagilar</option>
                <option value="false">Oddiy sharhlar</option>
              </select>

              {/* Yulduz bo'yicha filtr */}
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-auto"
              >
                <option value="">Barcha baholar</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 yulduz)</option>
                <option value="4">⭐⭐⭐⭐ (4 yulduz)</option>
                <option value="3">⭐⭐⭐ (3 yulduz)</option>
                <option value="2">⭐⭐ (2 yulduz)</option>
                <option value="1">⭐ (1 yulduz)</option>
              </select>

              {/* Qiyinlik bo'yicha filtr */}
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-auto"
              >
                <option value="">Barcha qiyinliklar</option>
                <option value="easy">🟢 Oson</option>
                <option value="medium">🟡 O&apos;rtacha</option>
                <option value="hard">🔴 Qiyin</option>
                <option value="very_hard">🔥 Juda murakkab</option>
              </select>

              <Button type="submit" size="sm" className="rounded-xl px-5 font-bold w-full sm:w-auto">
                Qidirish
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sharhlar Ro'yxati */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="py-16 text-center border-dashed">
            <CardContent className="space-y-3">
              <MessageSquareHeart className="size-12 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Sharhlar topilmadi</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Qidiruv shartlarini o&apos;zgartirib ko&apos;ring yoki yangi sharh qo&apos;shing.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => {
              const diff = DIFFICULTY_MAP[item.difficulty] || DIFFICULTY_MAP.medium;
              const displayName = item.author_name || item.user_name || 'O‘quvchi';
              const initials = displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card
                  key={item.id}
                  className={`relative overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
                    item.is_featured
                      ? 'border-emerald-500/60 bg-gradient-to-br from-emerald-500/5 via-[var(--surface-card)] to-[var(--surface-card)] shadow-lg ring-1 ring-emerald-500/30'
                      : 'border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-card-soft)] shadow-md hover:shadow-xl'
                  }`}
                >
                  {/* Top Header: Foydalanuvchi ma'lumotlari & Landing Badge */}
                  <CardHeader className="p-4 pb-3">
                    {/* Featured Ribbon */}
                    {item.is_featured && (
                      <div className="mb-2.5 flex items-center justify-between bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl">
                        <span className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1.5">
                          <Globe className="size-3.5" /> Landing sahifasida ko&apos;rinmoqda
                        </span>
                        {item.featured_badge && (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md">
                            {item.featured_badge}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">{displayName}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.custom_role || (item.username ? `@${item.username}` : "Abituriyent")}
                          </p>
                        </div>
                      </div>

                      {/* Yulduzchalar */}
                      <div className="flex items-center gap-0.5 shrink-0 bg-[var(--surface-hover)]/70 px-2 py-1 rounded-lg border border-[var(--border-card)]">
                        {Array.from({ length: 5 }).map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            className={`size-3.5 ${
                              sIdx < item.platform_rating
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]'
                                : 'text-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Body: Sharh matni */}
                  <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Test nomi va O'quvchi natijasi */}
                      <div className="space-y-1.5 mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.subject_name && (
                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-amber-500/40 bg-amber-500/10 text-amber-400 shrink-0">
                              {item.subject_name}
                            </Badge>
                          )}
                          {item.score !== null && (
                            <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                              Natija: {item.score.toFixed(0)}%
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] font-semibold gap-1 shrink-0 ${diff.tone}`}>
                            <span>{diff.emoji}</span> {diff.label}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground/90 line-clamp-2 leading-snug" title={item.test_title}>
                          {item.test_title}
                        </p>
                      </div>

                      {/* Sharh matni */}
                      {item.comment ? (
                        <div className="relative rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-3 text-xs leading-relaxed text-foreground italic shadow-inner">
                          <span className="text-amber-500 font-serif font-black text-sm mr-1">&ldquo;</span>
                          {item.comment}
                          <span className="text-amber-500 font-serif font-black text-sm ml-1">&rdquo;</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic py-1">
                          (Faqat baho va qiyinlik darajasi belgilangan, matn yozilmagan)
                        </p>
                      )}
                    </div>

                    {/* Pastki boshqaruv qismi (Landingga tanlash & Tahrirlash) */}
                    <div className="pt-3 border-t border-[var(--border-card)] space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" /> {item.created_at}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Tahrirlash"
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSurvey(item.id)}
                            title="O'chirish"
                            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleQuickToggleFeatured(item)}
                          size="sm"
                          variant={item.is_featured ? 'outline' : 'default'}
                          className={`w-full text-xs font-bold rounded-xl h-8.5 ${
                            item.is_featured
                              ? 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {item.is_featured ? (
                            'Landingdan olish'
                          ) : (
                            <>
                              <Globe className="size-3.5 mr-1" /> Landingga chiqarish
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Sharhni Landing uchun sozlash / tahrirlash */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Globe className="size-5 text-emerald-600" /> Landing sahifasida ko&apos;rsatish
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ushbu sharh Landing sahifasidagi sharhlar blokida qanday ko&apos;rinishini sozlang.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground">Muallif ismi</label>
                <Input
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="Masalan: Mubina Karimova"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Kasbi yoki OTM</label>
                <Input
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Masalan: Toshkent Davlat Yuridik Universiteti talabasi"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Nishon (Badge)</label>
                <Input
                  value={editBadge}
                  onChange={(e) => setEditBadge(e.target.value)}
                  placeholder="Masalan: Ona tili A+ (92 ball) yoki DTM 184.2 Ball (Grant)"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalIsFeatured"
                  checked={editIsFeatured}
                  onChange={(e) => setEditIsFeatured(e.target.checked)}
                  className="size-4 text-emerald-600 rounded"
                />
                <label htmlFor="modalIsFeatured" className="text-xs font-bold text-foreground cursor-pointer">
                  Landing sahifasiga chiqarilsin (Faol)
                </label>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={isSubmittingEdit} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                  {isSubmittingEdit ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Yangi Sharh Qo'shish */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="size-5 text-emerald-600" /> Yangi Sharh Qo&apos;shish
              </DialogTitle>
              <DialogDescription className="text-xs">
                O&apos;quvchi yoki abituriyent nomidan yangi sharh yarating va darhol Landingga qo&apos;shing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSurvey} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground">Muallif ismi *</label>
                <Input
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Masalan: Davronbek Qodirov"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Kasbi yoki OTM</label>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Masalan: O'zMU Matematika fakulteti 1-kurs"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground">Nishon (Badge)</label>
                  <Input
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="Masalan: DTM: 184.2 Ball (Grant)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground">Baho (Yulduz)</label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="mt-1 w-full h-9 rounded-md border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-semibold"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4)</option>
                    <option value={3}>⭐⭐⭐ (3)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Sharh matni *</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  placeholder="O'quvchining fikrlari va taassurotlari..."
                  className="mt-1 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-card)] p-2.5 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newIsFeatured"
                  checked={newIsFeatured}
                  onChange={(e) => setNewIsFeatured(e.target.checked)}
                  className="size-4 text-emerald-600 rounded"
                />
                <label htmlFor="newIsFeatured" className="text-xs font-bold text-foreground cursor-pointer">
                  To&apos;g&apos;ridan-to&apos;g&apos;ri Landing sahifasiga chiqarilsin
                </label>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={isSubmittingCreate} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                  {isSubmittingCreate ? 'Qo‘shilmoqda...' : 'Qo‘shish'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PanelShell>
  );
}
