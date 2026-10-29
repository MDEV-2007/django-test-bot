'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  Download,
  Eye,
  Bookmark,
  Sparkles,
  GraduationCap,
  Calendar,
  Crown,
  X,
  ExternalLink,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      <main className="page-shell flex-1 space-y-6 bg-[#F2F2F7] dark:bg-[#000000] p-4 pb-20 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ── 1. APPLE BOOKS HERO CARD ──────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-[0_6px_28px_rgba(0,0,0,0.04)]">
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#FF9500]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#007AFF]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="inline-flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-[8px] bg-[#FF9500] text-white shadow-xs">
                  <BookOpen className="size-3.5" />
                </span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#FF9500]">
                  Apple Books uslubidagi Raqamli Kutubxona
                </span>
              </div>
              <h1 className="text-[24px] sm:text-[32px] font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white leading-tight">
                Darsliklar va Spravochniklar
              </h1>
              <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#8E8E93]">
                5–11-sinf maktab darsliklari, Milliy sertifikat va BBA tayyorgarlik qo‘llanmalari, xronologiya jadvallari va test tahlillari bitta qulay platformada.
              </p>
            </div>

            {/* Quick stats widgets */}
            {stats && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 self-stretch lg:self-auto shrink-0">
                <div className="rounded-[20px] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 text-center">
                  <div className="font-mono text-[20px] sm:text-[22px] font-extrabold text-[#007AFF]">
                    {stats.total_books}
                  </div>
                  <div className="text-[11px] font-semibold text-[#8E8E93]">
                    Kitoblar
                  </div>
                </div>

                <div className="rounded-[20px] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 text-center">
                  <div className="font-mono text-[20px] sm:text-[22px] font-extrabold text-[#34C759]">
                    {stats.total_reads.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-semibold text-[#8E8E93]">
                    O‘qishlar
                  </div>
                </div>

                <div className="rounded-[20px] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 text-center">
                  <div className="font-mono text-[20px] sm:text-[22px] font-extrabold text-[#5856D6]">
                    {stats.total_downloads.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-semibold text-[#8E8E93]">
                    Yuklamalar
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── iOS SPOTLIGHT SEARCH BAR ────────────────────────────────────── */}
          <div className="mt-6 relative max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 size-4.5 text-[#8E8E93] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kitob, muallif yoki mavzu nomini qidiring (masalan: 7-sinf tarixi, xronologiya)..."
                className="w-full pl-11 pr-10 h-12 rounded-full text-[14px] font-medium bg-[#767680]/[0.08] dark:bg-[#767680]/[0.20] border border-transparent focus:border-[#007AFF] focus:bg-white dark:focus:bg-[#2C2C2E] text-slate-900 dark:text-white placeholder:text-[#8E8E93] transition-all focus:outline-none focus:ring-3 focus:ring-[#007AFF]/15"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 rounded-full bg-[#8E8E93]/20 hover:bg-[#8E8E93]/30 text-[#8E8E93]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. iOS CAPSULE FILTERS SECTION ────────────────────────────────── */}
        <div className="space-y-3.5">
          
          {/* FANLAR (SUBJECTS) CAPSULES */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedSubject('all')}
              className={cn(
                "px-4 py-2 rounded-full text-[13px] font-semibold shrink-0 transition-all border active:scale-95",
                selectedSubject === 'all'
                  ? "bg-[#007AFF] text-white border-[#007AFF] shadow-[0_4px_12px_rgba(0,122,255,0.28)]"
                  : "bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40"
              )}
            >
              Barcha fanlar ({stats?.total_books ?? 0})
            </button>

            {subjects.map((s) => {
              const active = selectedSubject === s.slug;
              return (
                <button
                  key={s.slug}
                  onClick={() => setSelectedSubject(s.slug)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[13px] font-semibold shrink-0 transition-all border flex items-center gap-2 active:scale-95",
                    active
                      ? "bg-[#007AFF] text-white border-[#007AFF] shadow-[0_4px_12px_rgba(0,122,255,0.28)]"
                      : "bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40"
                  )}
                >
                  <span>{s.name}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full font-mono text-[11px] font-bold",
                    active ? "bg-white/25 text-white" : "bg-[#767680]/[0.12] text-[#8E8E93]"
                  )}>
                    {s.books_count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SINFLAR VA KATEGORIYALAR FILTRI */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Sinf Segmented Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <span className="text-[12px] font-bold text-[#8E8E93] mr-1 flex items-center gap-1 shrink-0">
                <GraduationCap className="size-4 text-[#007AFF]" /> Sinf:
              </span>
              {grades.map((g) => {
                const active = selectedGrade === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGrade(g.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 active:scale-95",
                      active
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-white dark:bg-[#1C1C1E] text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>

            {/* Qo'shimcha filter: Turi va Sevimlilar */}
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Kategoriya bo'yicha saralash"
                className="px-3.5 py-2 rounded-full text-[12px] font-semibold bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007AFF]"
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
                    "px-3.5 py-2 rounded-full text-[12px] font-semibold border flex items-center gap-1.5 transition-all active:scale-95",
                    bookmarkedOnly
                      ? "bg-[#FF2D55]/12 border-[#FF2D55]/30 text-[#FF2D55]"
                      : "bg-white dark:bg-[#1C1C1E] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200"
                  )}
                >
                  <Bookmark className={cn("size-3.5", bookmarkedOnly ? "fill-current" : "")} />
                  <span>Saqlanganlar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. APPLE BOOKS GRID ───────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 py-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-96 rounded-[26px] animate-pulse bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16 rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-[18px] bg-[#007AFF]/12 text-[#007AFF]">
              <BookOpen className="size-7" />
            </div>
            <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">
              Hech qanday kitob topilmadi
            </h3>
            <p className="text-[13px] text-[#8E8E93] max-w-md mx-auto">
              Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalab ko‘ring.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full mt-2"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {books.map((book) => (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => handleOpenReader(book)}
                className="group relative flex flex-col rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_14px_34px_rgba(0,122,255,0.09)] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
              >
                {/* ── 3D APPLE BOOKS COVER HEADER ────────────────────── */}
                <div className={cn(
                  "relative h-56 p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br",
                  book.cover_color
                )}>
                  {/* Realistic book spine & sheen */}
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/20 backdrop-blur-xs border-r border-white/15" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/15" />
                  
                  {/* Top badges */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/25 text-white backdrop-blur-md">
                      {book.grade_display}
                    </span>

                    <button
                      onClick={(e) => handleToggleBookmark(e, book)}
                      title="Saqlab qo'yish"
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs active:scale-90",
                        book.is_bookmarked
                          ? "bg-white text-[#FF2D55]"
                          : "bg-black/25 text-white hover:bg-black/40"
                      )}
                    >
                      <Bookmark className={cn("size-4", book.is_bookmarked ? "fill-current" : "")} />
                    </button>
                  </div>

                  {/* Center Book Title Preview */}
                  <div className="relative z-10 my-auto text-center px-3">
                    <div className="text-white/85 text-[10px] font-bold tracking-widest uppercase mb-1">
                      {book.subject_name}
                    </div>
                    <div className="text-white font-extrabold text-[16px] leading-snug line-clamp-2 drop-shadow-xs">
                      {book.title}
                    </div>
                    {book.author && (
                      <div className="text-white/75 text-[11px] mt-1 font-medium line-clamp-1">
                        {book.author}
                      </div>
                    )}
                  </div>

                  {/* Bottom meta in cover */}
                  <div className="relative z-10 flex items-center justify-between text-white/85 text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold">
                      <FileText className="size-3.5" />
                      {book.page_count > 0 ? `${book.page_count} bet` : book.file_size}
                    </span>
                    {book.year && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="size-3.5" />
                        {book.year}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── CARD BODY ────────────────────────────────────────── */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="rounded-full bg-[#767680]/[0.12] px-2.5 py-0.5 text-[10px] font-bold text-[#8E8E93]">
                        {book.category_display}
                      </span>
                      {book.is_premium && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9500]/12 px-2 py-0.5 text-[10px] font-bold text-[#FF9500]">
                          <Crown className="size-3" /> PRO
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-[15px] leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-[#007AFF] transition-colors">
                      {book.title}
                    </h4>

                    {book.description && (
                      <p className="text-[12px] text-[#8E8E93] line-clamp-2 mt-1 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between">
                    <div className="flex items-center gap-3 font-mono text-[11px] font-semibold text-[#8E8E93]">
                      <span className="flex items-center gap-1" title="Ko'rishlar">
                        <Eye className="size-3.5" />
                        {book.views_count}
                      </span>
                      <span className="flex items-center gap-1" title="Yuklab olishlar">
                        <Download className="size-3.5" />
                        {book.downloads_count}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDownload(e, book)}
                        title="Yuklab olish"
                        className="size-8 rounded-full flex items-center justify-center bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] text-slate-700 dark:text-slate-200 transition-all active:scale-90"
                      >
                        <Download className="size-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenReader(book)}
                        className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#007AFF]/12 group-hover:bg-[#007AFF] text-[#007AFF] group-hover:text-white transition-all flex items-center gap-1"
                      >
                        <span>O‘QISH</span>
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── 4. iPadOS QUICK LOOK / APPLE BOOKS MODAL VIEWER ───────────────── */}
        <AnimatePresence>
          {activeBook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md"
              onClick={() => setActiveBook(null)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 16 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.10] shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "size-10 rounded-[12px] flex items-center justify-center font-bold text-white shrink-0 bg-gradient-to-br shadow-xs",
                      activeBook.cover_color
                    )}>
                      <BookOpen className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 dark:text-white truncate">
                        {activeBook.title}
                      </h3>
                      <p className="text-[12px] text-[#8E8E93] flex items-center gap-1.5 truncate">
                        <span>{activeBook.subject_name}</span>
                        <span>•</span>
                        <span>{activeBook.grade_display}</span>
                        <span>•</span>
                        <span>{activeBook.category_display}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleToggleBookmark(e, activeBook)}
                      title="Saqlash"
                      className={cn(
                        "size-9 rounded-full flex items-center justify-center border transition-all active:scale-90",
                        activeBook.is_bookmarked
                          ? "bg-[#FF2D55]/12 text-[#FF2D55] border-[#FF2D55]/30"
                          : "bg-white dark:bg-[#2C2C2E] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <Bookmark className={cn("size-4", activeBook.is_bookmarked ? "fill-current" : "")} />
                    </button>

                    <button
                      onClick={(e) => handleDownload(e, activeBook)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold bg-[#007AFF] hover:bg-[#0066D6] text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                    >
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">Yuklab olish</span>
                    </button>

                    <button
                      onClick={() => setActiveBook(null)}
                      className="size-9 rounded-full flex items-center justify-center bg-[#767680]/[0.12] hover:bg-[#767680]/[0.20] text-[#8E8E93] hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <X className="size-4.5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content / Viewer */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {/* Detailed Description Inset Grouped Card */}
                  <div className="p-5 rounded-[24px] bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 border border-black/[0.05] dark:border-white/[0.07] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
                          Muallif(lar)
                        </div>
                        <div className="text-[15px] font-bold mt-0.5 text-slate-900 dark:text-white">
                          {activeBook.author || "Rasmiy nashr"}
                        </div>
                      </div>

                      {activeBook.year && (
                        <div>
                          <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
                            Nashr yili
                          </div>
                          <div className="text-[15px] font-bold mt-0.5 text-slate-900 dark:text-white font-mono">
                            {activeBook.year}-yil
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
                          Hajmi va Sahifalar
                        </div>
                        <div className="text-[15px] font-bold mt-0.5 text-slate-900 dark:text-white font-mono">
                          {activeBook.page_count > 0 ? `${activeBook.page_count} bet (${activeBook.file_size})` : activeBook.file_size}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                      <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider mb-1">
                        Kitob haqida
                      </div>
                      <p className="text-[13px] sm:text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                        {activeBook.description || "Ushbu darslik Milliy sertifikat va maktab dasturiga to'liq mos holda tayyorlangan."}
                      </p>
                    </div>
                  </div>

                  {/* Embedded PDF Viewer or Preview notice */}
                  {activeBook.file_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
                          PDF ko‘rish oynasi
                        </span>
                        <a
                          href={activeBook.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-[#007AFF] hover:underline flex items-center gap-1 font-semibold"
                        >
                          Alohida oynada ochish <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                      <div className="w-full h-96 rounded-[20px] overflow-hidden border border-black/[0.08] dark:border-white/[0.10] bg-slate-950">
                        <iframe
                          src={activeBook.file_url}
                          title={activeBook.title}
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-[24px] bg-[#007AFF]/[0.06] border border-[#007AFF]/20 text-center space-y-3">
                      <div className="size-12 rounded-[14px] bg-[#007AFF] text-white flex items-center justify-center mx-auto shadow-xs">
                        <Sparkles className="size-6" />
                      </div>
                      <h4 className="text-[16px] font-bold text-slate-900 dark:text-white">
                        Elektron manba bazaga biriktirilgan
                      </h4>
                      <p className="text-[13px] text-[#8E8E93] max-w-md mx-auto leading-relaxed">
                        Ushbu darslikning barcha bo‘limlari platformamizning testlari va mavzulashtirilgan konspektlariga integratsiya qilingan.
                      </p>
                      <div className="pt-2 flex justify-center gap-3">
                        <Link
                          href={`/tests?subject=${activeBook.subject_slug}`}
                          className="px-5 py-2.5 rounded-full text-[13px] font-bold bg-[#007AFF] hover:bg-[#0066D6] text-white transition-all shadow-xs"
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
