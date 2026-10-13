'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Eye,
  Bookmark,
  Sparkles,
  GraduationCap,
  Calendar,
  Layers,
  Crown,
  Share2,
  X,
  ExternalLink,
  ChevronRight,
  Check,
  FileText,
  Clock,
  BookMarked,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BookItem {
  id: number;
  title: string;
  description: string;
  author: string;
  subject_name: string;
  subject_slug: string;
  subject_color: string;
  category: string;
  category_display: string;
  grade: string;
  grade_display: string;
  file_url: string;
  file_size: string;
  page_count: number;
  year: number | null;
  cover_image: string;
  cover_color: string;
  is_premium: boolean;
  coin_price: number;
  views_count: number;
  downloads_count: number;
  is_bookmarked: boolean;
  created_at: string;
}

interface SubjectItem {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon_name: string;
  books_count: number;
}

interface CategoryItem {
  id: string;
  name: string;
  count: number;
}

interface GradeItem {
  id: string;
  name: string;
}

interface LibraryResponse {
  books: BookItem[];
  subjects: SubjectItem[];
  categories: CategoryItem[];
  grades: GradeItem[];
  stats: {
    total_books: number;
    total_reads: number;
    total_downloads: number;
  };
}

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { isLight } = useTheme();

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState<boolean>(false);

  // Active book modal for reading
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);

  // Build query URL
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSubject !== 'all') params.set('subject', selectedSubject);
    if (selectedGrade !== 'all') params.set('grade', selectedGrade);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (bookmarkedOnly) params.set('bookmarked', '1');
    const qs = params.toString();
    return `/api/learning/library/${qs ? `?${qs}` : ''}`;
  }, [selectedSubject, selectedGrade, selectedCategory, searchQuery, bookmarkedOnly]);

  const { data, loading, refresh } = useApiQuery<LibraryResponse>(queryUrl);

  const books = data?.books || [];
  const subjects = data?.subjects || [];
  const categories = data?.categories || [];
  const grades = data?.grades || [];
  const stats = data?.stats;

  // Handle bookmark toggle
  const handleToggleBookmark = async (e: React.MouseEvent, book: BookItem) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Kitobni saqlash uchun profilingizga kiring!");
      return;
    }
    try {
      const res: any = await apiFetch(`/api/learning/library/${book.id}/bookmark/`, { method: 'POST' });
      if (res?.success) {
        toast.success(res.message);
        refresh();
        if (activeBook && activeBook.id === book.id) {
          setActiveBook({ ...activeBook, is_bookmarked: res.is_bookmarked });
        }
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // Handle download
  const handleDownload = async (e: React.MouseEvent, book: BookItem) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/learning/library/${book.id}/download/`, { method: 'POST' });
      refresh();
    } catch {
      // ignore
    }
    if (book.file_url) {
      window.open(book.file_url, '_blank');
      toast.success("Yuklab olish boshlandi...");
    } else {
      toast.info(`«${book.title}» darsligi online ko'rish uchun faol`);
    }
  };

  // Open Reader
  const handleOpenReader = (book: BookItem) => {
    setActiveBook(book);
    apiFetch(`/api/learning/library/${book.id}/`).catch(() => {});
  };

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-20 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ── 1. HERO HEADER BANNER ─────────────────────────────────────────── */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 sm:p-10 border transition-all shadow-xl",
          isLight
            ? "bg-gradient-to-br from-white via-blue-50/60 to-indigo-50/40 border-blue-100/80 shadow-blue-500/5"
            : "bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/40 border-slate-800 shadow-black/40"
        )}>
          {/* Background decorative glows */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>IlmIldizi Elektron Kutubxonasi</span>
              </div>
              <h1 className={cn(
                "text-2xl sm:text-4xl font-extrabold tracking-tight",
                isLight ? "text-slate-900" : "text-white"
              )}>
                Darsliklar va Spravochniklar
              </h1>
              <p className={cn(
                "text-sm sm:text-base leading-relaxed",
                isLight ? "text-slate-600" : "text-slate-300"
              )}>
                5–11-sinf maktab darsliklari, Milliy sertifikat va BBA tayyorgarlik qo‘llanmalari, xronologiya jadvallari va test tahlillari bitta qulay platformada.
              </p>
            </div>

            {/* Quick stats pills */}
            {stats && (
              <div className="grid grid-cols-3 gap-3 self-stretch md:self-auto shrink-0">
                <div className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all",
                  isLight ? "bg-white/90 border-slate-200/80 shadow-sm" : "bg-slate-800/60 border-slate-700/80"
                )}>
                  <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                    {stats.total_books}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Kitob & Manba
                  </div>
                </div>

                <div className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all",
                  isLight ? "bg-white/90 border-slate-200/80 shadow-sm" : "bg-slate-800/60 border-slate-700/80"
                )}>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.total_reads.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    O‘qishlar
                  </div>
                </div>

                <div className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all",
                  isLight ? "bg-white/90 border-slate-200/80 shadow-sm" : "bg-slate-800/60 border-slate-700/80"
                )}>
                  <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                    {stats.total_downloads.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Yuklab olish
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SEARCH BAR ─────────────────────────────────────────────────── */}
          <div className="mt-8 relative max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kitob, muallif yoki mavzu nomini qidiring (masalan: 7-sinf tarixi, xronologiya)..."
                className={cn(
                  "w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                  isLight
                    ? "bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm"
                    : "bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 shadow-inner"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. FILTERS SECTION ────────────────────────────────────────────── */}
        <div className="space-y-4">
          
          {/* FANLAR (SUBJECTS) TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedSubject('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all border",
                selectedSubject === 'all'
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : isLight
                    ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
              )}
            >
              Barcha fanlar ({stats?.total_books ?? 0})
            </button>

            {subjects.map((s) => (
              <button
                key={s.slug}
                onClick={() => setSelectedSubject(s.slug)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all border flex items-center gap-2",
                  selectedSubject === s.slug
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : isLight
                      ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                )}
              >
                <span>{s.name}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px]",
                  selectedSubject === s.slug ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {s.books_count}
                </span>
              </button>
            ))}
          </div>

          {/* SINFLAR VA KATEGORIYALAR FILTRI */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            
            {/* Sinf pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Sinf:
              </span>
              {grades.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGrade(g.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    selectedGrade === g.id
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                      : isLight
                        ? "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200/70"
                        : "bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Qo'shimcha filter: Turi va Sevimlilar */}
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Kategoriya bo'yicha saralash"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all focus:outline-none",
                  isLight
                    ? "bg-white border-slate-200 text-slate-700"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                )}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>

              {user && (
                <button
                  onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all",
                    bookmarkedOnly
                      ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400"
                      : isLight
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  <Bookmark className={cn("w-3.5 h-3.5", bookmarkedOnly ? "fill-current" : "")} />
                  <span>Sevimlilar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. BOOKS GRID ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-96 rounded-2xl animate-pulse border",
                  isLight ? "bg-slate-100 border-slate-200" : "bg-slate-800/50 border-slate-800"
                )}
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className={cn(
            "text-center py-20 rounded-3xl border border-dashed",
            isLight ? "bg-white border-slate-300" : "bg-slate-900/40 border-slate-800"
          )}>
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className={cn("text-lg font-bold", isLight ? "text-slate-800" : "text-white")}>
              Hech qanday kitob topilmadi
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalab ko‘ring.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSelectedSubject('all');
                setSelectedGrade('all');
                setSelectedCategory('all');
                setSearchQuery('');
                setBookmarkedOnly(false);
              }}
            >
              Barcha filtrlarni tozalash
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleOpenReader(book)}
                className={cn(
                  "group relative flex flex-col rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden",
                  isLight
                    ? "bg-white border-slate-200/80 shadow-slate-200/50 hover:border-blue-300"
                    : "bg-slate-800/80 border-slate-700/80 hover:border-blue-500/50 shadow-black/20"
                )}
              >
                {/* ── 3D BOOK COVER HEADER ───────────────────────────── */}
                <div className={cn(
                  "relative h-56 p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br",
                  book.cover_color
                )}>
                  {/* Subtle book textures / spine effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/20 backdrop-blur-xs border-r border-white/10" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/10" />
                  
                  {/* Top badges */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/20 text-white backdrop-blur-md shadow-xs">
                      {book.grade_display}
                    </span>

                    <button
                      onClick={(e) => handleToggleBookmark(e, book)}
                      title="Saqlab qo'yish"
                      className={cn(
                        "p-1.5 rounded-full backdrop-blur-md transition-all shadow-xs",
                        book.is_bookmarked
                          ? "bg-white text-rose-600"
                          : "bg-black/20 text-white hover:bg-black/40"
                      )}
                    >
                      <Bookmark className={cn("w-4 h-4", book.is_bookmarked ? "fill-current" : "")} />
                    </button>
                  </div>

                  {/* Center Book Title Preview */}
                  <div className="relative z-10 my-auto text-center px-3">
                    <div className="text-white/80 text-[11px] font-semibold tracking-wider uppercase mb-1">
                      {book.subject_name}
                    </div>
                    <div className="text-white font-extrabold text-base leading-snug line-clamp-2 drop-shadow-sm">
                      {book.title}
                    </div>
                    {book.author && (
                      <div className="text-white/70 text-[11px] mt-1 font-medium italic line-clamp-1">
                        {book.author}
                      </div>
                    )}
                  </div>

                  {/* Bottom meta in cover */}
                  <div className="relative z-10 flex items-center justify-between text-white/80 text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <FileText className="w-3.5 h-3.5" />
                      {book.page_count > 0 ? `${book.page_count} bet` : book.file_size}
                    </span>
                    {book.year && (
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {book.year}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── CARD BODY ────────────────────────────────────────── */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold">
                        {book.category_display}
                      </Badge>
                      {book.is_premium && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          <Crown className="w-3 h-3" /> VIP
                        </span>
                      )}
                    </div>

                    <h4 className={cn(
                      "font-bold text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors",
                      isLight ? "text-slate-900" : "text-white"
                    )}>
                      {book.title}
                    </h4>

                    {book.description && (
                      <p className={cn(
                        "text-xs line-clamp-2 mt-1.5 leading-relaxed",
                        isLight ? "text-slate-500" : "text-slate-400"
                      )}>
                        {book.description}
                      </p>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1" title="Ko'rishlar">
                        <Eye className="w-3.5 h-3.5" />
                        {book.views_count}
                      </span>
                      <span className="flex items-center gap-1" title="Yuklab olishlar">
                        <Download className="w-3.5 h-3.5" />
                        {book.downloads_count}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDownload(e, book)}
                        title="Yuklab olish"
                        className={cn(
                          "p-2 rounded-xl text-xs font-semibold transition-all border",
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
                        )}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenReader(book)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-600/30 flex items-center gap-1"
                      >
                        <span>O‘qish</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── 4. READER MODAL (ONLINE VIEWER) ───────────────────────────────── */}
        <AnimatePresence>
          {activeBook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
              onClick={() => setActiveBook(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden",
                  isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}
              >
                {/* Modal Header */}
                <div className={cn(
                  "p-5 border-b flex items-center justify-between gap-4 shrink-0",
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-800/80 border-slate-700"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 bg-gradient-to-br shadow-sm",
                      activeBook.cover_color
                    )}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn(
                        "text-base sm:text-lg font-bold truncate",
                        isLight ? "text-slate-900" : "text-white"
                      )}>
                        {activeBook.title}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{activeBook.subject_name}</span>
                        <span>•</span>
                        <span>{activeBook.grade_display}</span>
                        <span>•</span>
                        <span>{activeBook.category_display}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleBookmark(e, activeBook)}
                      title="Saqlash"
                      className={cn(
                        "p-2 rounded-xl border transition-all",
                        activeBook.is_bookmarked
                          ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400"
                          : isLight ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      <Bookmark className={cn("w-4 h-4", activeBook.is_bookmarked ? "fill-current" : "")} />
                    </button>

                    <button
                      onClick={(e) => handleDownload(e, activeBook)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Yuklab olish</span>
                    </button>

                    <button
                      onClick={() => setActiveBook(null)}
                      className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content / Viewer */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Detailed Description Card */}
                  <div className={cn(
                    "p-6 rounded-2xl border space-y-4",
                    isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-800/40 border-slate-800"
                  )}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          Muallif(lar)
                        </div>
                        <div className={cn("text-base font-bold mt-0.5", isLight ? "text-slate-800" : "text-white")}>
                          {activeBook.author || "Noma'lum"}
                        </div>
                      </div>

                      {activeBook.year && (
                        <div>
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            Nashr yili
                          </div>
                          <div className={cn("text-base font-bold mt-0.5", isLight ? "text-slate-800" : "text-white")}>
                            {activeBook.year}-yil
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          Hajmi va Sahifalar
                        </div>
                        <div className={cn("text-base font-bold mt-0.5", isLight ? "text-slate-800" : "text-white")}>
                          {activeBook.page_count > 0 ? `${activeBook.page_count} bet (${activeBook.file_size})` : activeBook.file_size}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                        Kitob haqida
                      </div>
                      <p className={cn("text-sm leading-relaxed", isLight ? "text-slate-700" : "text-slate-300")}>
                        {activeBook.description || "Ushbu darslik Milliy sertifikat va maktab dasturiga to'liq mos holda tayyorlangan."}
                      </p>
                    </div>
                  </div>

                  {/* Embedded PDF Viewer or Preview notice */}
                  {activeBook.file_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          PDF ko‘rish oynasi
                        </span>
                        <a
                          href={activeBook.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Alohida oynada ochish <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="w-full h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                        <iframe
                          src={activeBook.file_url}
                          title={activeBook.title}
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "p-8 rounded-2xl border border-dashed text-center space-y-3",
                      isLight ? "bg-blue-50/40 border-blue-200" : "bg-blue-950/20 border-blue-900/60"
                    )}>
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h4 className={cn("text-base font-bold", isLight ? "text-slate-900" : "text-white")}>
                        Elektron manba bazaga biriktirilgan
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Ushbu darslikning barcha bo‘limlari platformamizning testlari va mavzulashtirilgan konspektlariga integratsiya qilingan.
                      </p>
                      <div className="pt-2 flex justify-center gap-3">
                        <Link
                          href={`/tests?subject=${activeBook.subject_slug}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                        >
                          Ushbu fandan test yechish
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>
      </main>
    </>
  );
}
