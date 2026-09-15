'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Plus, Trash2, Eye, ExternalLink, RefreshCw,
  Flame, CheckCircle2, XCircle, AlertCircle, Send, Heart,
  BookOpen, Swords, Dna, Globe, Sliders, Layers, HelpCircle
} from 'lucide-react';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import PremiumIcon, { PremiumIconTone } from '@/components/ui/premium-icon';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ReelQuiz = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type PanelReelItem = {
  id: number;
  subject_name: string;
  subject_slug: string;
  category_badge: string;
  tagline: string;
  hook: string;
  fact: string;
  takeaway: string;
  gradient_theme: string;
  gradient: string;
  quiz: ReelQuiz;
  is_published: boolean;
  likes: number;
  shares: number;
  views: number;
  created_at: string | null;
};

type HardestQuestion = {
  question_id: number;
  subject_name: string;
  subject_slug: string;
  difficulty: string;
  clean_body: string;
  options: string[];
  correct_index: number;
  explanation: string;
  fail_rate: number;
  wrong_count: number;
  total_count: number;
  suggested_hook: string;
  suggested_tagline: string;
};

const THEMES = [
  { id: 'purple', name: 'Binafsharang Neon', tone: 'purple' as PremiumIconTone },
  { id: 'rose', name: 'Qizil Otash', tone: 'rose' as PremiumIconTone },
  { id: 'sky', name: 'Moviy Osmon', tone: 'sky' as PremiumIconTone },
  { id: 'emerald', name: 'Zumrad Yashil', tone: 'emerald' as PremiumIconTone },
  { id: 'amber', name: 'Oltin Quyosh', tone: 'amber' as PremiumIconTone },
];

export default function PanelReelsPage() {
  const [reels, setReels] = useState<PanelReelItem[]>([]);
  const [hardestQuestions, setHardestQuestions] = useState<HardestQuestion[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewReel, setPreviewReel] = useState<PanelReelItem | null>(null);

  // Form inputs
  const [subjectName, setSubjectName] = useState('Tarix');
  const [subjectSlug, setSubjectSlug] = useState('tarix');
  const [categoryBadge, setCategoryBadge] = useState('');
  const [tagline, setTagline] = useState('Bilasizmi?');
  const [hook, setHook] = useState('');
  const [fact, setFact] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [gradientTheme, setGradientTheme] = useState('purple');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Load reels
  const loadReels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reels: PanelReelItem[]; stats: { total: number; published: number; drafts: number } }>('/api/panel/reels/');
      if (data && data.reels) {
        setReels(data.reels);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error("Reels ro'yxatini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load hardest questions
  const loadHardestQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const data = await apiFetch<{ questions: HardestQuestion[]; count: number }>('/api/panel/reels/hardest-questions/');
      if (data && data.questions) {
        setHardestQuestions(data.questions);
      }
    } catch {
      // ignore
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReels();
    loadHardestQuestions();
  }, [loadReels, loadHardestQuestions]);

  // Toggle publish status
  const handleTogglePublish = async (reel: PanelReelItem) => {
    const newStatus = !reel.is_published;
    try {
      await apiFetch(`/api/panel/reels/${reel.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: newStatus }),
      });
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, is_published: newStatus } : r))
      );
      setStats((prev) => ({
        ...prev,
        published: prev.published + (newStatus ? 1 : -1),
        drafts: prev.drafts + (newStatus ? -1 : 1),
      }));
      toast.success(newStatus ? "Reel chop etildi! O'quvchilar ko'ra oladi 🚀" : "Reel qoralamaga olindi 🟡");
    } catch {
      toast.error("Holatni o'zgartirishda xatolik");
    }
  };

  // Delete Reel
  const handleDeleteReel = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu Reelni o'chirmoqchimisiz?")) return;
    try {
      await apiFetch(`/api/panel/reels/${id}/`, { method: 'DELETE' });
      setReels((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reel muvaffaqiyatli o'chirildi!");
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  // Auto-fill from hardest question
  const handleUseHardestQuestion = (q: HardestQuestion) => {
    setSubjectName(q.subject_name);
    setSubjectSlug(q.subject_slug);
    setCategoryBadge(`Eng Qiyin Savol (${q.difficulty})`);
    setTagline(q.suggested_tagline);
    setHook(q.suggested_hook);
    setFact(q.clean_body);
    setTakeaway(q.explanation || "Rasmiy dastur va testlar bo'yicha muhim qoida!");
    setQuizQuestion(q.clean_body);

    setOptionA(q.options[0] || 'Variant A');
    setOptionB(q.options[1] || 'Variant B');
    setOptionC(q.options[2] || 'Variant C');
    setOptionD(q.options[3] || 'Variant D');
    setCorrectIndex(q.correct_index || 0);
    setQuizExplanation(q.explanation || '');
    setGradientTheme('rose');
    setIsPublished(true);

    setIsModalOpen(true);
    toast.info("Savol ma'lumotlari avtomatik yuklandi! O'zgartirib darhol chop etishingiz mumkin.");
  };

  // Submit new Reel
  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hook.trim() || !fact.trim()) {
      toast.error("Iltimos, sarlavha va tushuntirishni kiriting!");
      return;
    }

    const options = [optionA, optionB, optionC, optionD].filter((o) => o.trim().length > 0);
    if (options.length < 2) {
      toast.error("Kamida 2 ta test varianti kiriting!");
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/panel/reels/', {
        method: 'POST',
        body: JSON.stringify({
          subject_name: subjectName,
          subject_slug: subjectSlug,
          category_badge: categoryBadge || `${subjectName} Fani`,
          tagline: tagline || 'Bilasizmi?',
          hook: hook.trim(),
          fact: fact.trim(),
          takeaway: takeaway.trim(),
          gradient_theme: gradientTheme,
          quiz_question: quizQuestion.trim() || hook.trim(),
          quiz_options: options,
          quiz_correct_index: correctIndex,
          quiz_explanation: quizExplanation.trim(),
          is_published: isPublished,
        }),
      });

      toast.success(isPublished ? "Reel yaratildi va chop etildi! 🚀" : "Reel qoralama sifatida saqlandi 🟡");
      setIsModalOpen(false);
      loadReels();

      // Reset form
      setHook('');
      setFact('');
      setTakeaway('');
      setQuizQuestion('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setQuizExplanation('');
    } catch {
      toast.error("Reelni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PremiumIcon icon={Sparkles} tone="rose" size="md" glow />
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Bilim Reels Boshqaruvi
              </h1>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                Viral 2.0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              TikTok/Instagram formatidagi mini-darslar, qiyin savollar tahlili va bir bosishda chop etish (Publish)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reels"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lentani ko&apos;rish</span>
            </Link>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-2xl gap-1.5 shadow-md font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Reel Yaratish</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Jami Reelslar</p>
                <p className="text-2xl font-black text-foreground mt-0.5">{stats.total}</p>
              </div>
              <PremiumIcon icon={Layers} tone="indigo" size="md" />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">O&apos;quvchilarga Ochiq (Chop etilgan)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.published}</p>
              </div>
              <PremiumIcon icon={CheckCircle2} tone="emerald" size="md" />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Qoralamalar (Yashirin)</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.drafts}</p>
              </div>
              <PremiumIcon icon={Sliders} tone="amber" size="md" />
            </CardContent>
          </Card>
        </div>

        {/* Hardest Questions Recommendation Carousel / Grid */}
        <Card className="rounded-3xl border-border/80 bg-gradient-to-br from-rose-500/5 via-card to-card shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PremiumIcon icon={Flame} tone="rose" size="sm" glow />
                <CardTitle className="text-base font-bold">
                  🔥 Trend: O&apos;quvchilar Eng Ko&apos;p Xato Qilgan Savollar
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHardestQuestions}
                disabled={questionsLoading}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={cn("w-3 h-3", questionsLoading && "animate-spin")} />
                Yangilash
              </Button>
            </div>
            <CardDescription className="text-xs">
              Ushbu savollarda o&apos;quvchilarning katta qismi yiqilgan. Bitta tugma orqali ulardan tayyor Reel yarating va e&apos;lon qiling!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {questionsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Qiyin savollar tahlil qilinmoqda...
              </div>
            ) : hardestQuestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Hozircha test urinishlari tahlili yetarli emas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {hardestQuestions.slice(0, 6).map((q) => (
                  <div
                    key={q.question_id}
                    className="p-4 rounded-2xl bg-card/80 border border-border hover:border-rose-500/40 transition-all flex flex-col justify-between space-y-3 shadow-sm group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          {q.fail_rate}% xato
                        </span>
                        <span className="text-muted-foreground font-medium">
                          {q.subject_name}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {q.clean_body}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUseHardestQuestion(q)}
                      className="w-full text-xs font-bold rounded-xl gap-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-500/25 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Reels Yasash</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Reels List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight text-foreground">
              Barcha Reelslar ({reels.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={loadReels} className="h-8 text-xs gap-1">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Ro&apos;yxatni yangilash
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Reels ma&apos;lumotlari yuklanmoqda...
            </div>
          ) : reels.length === 0 ? (
            <div className="p-8 text-center rounded-3xl border border-border bg-card">
              <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="font-bold text-foreground">Hozircha Reels yo&apos;q</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                Yuqoridagi &quot;Yangi Reel Yaratish&quot; yoki trenddagi qiyin savollardan birini tanlab birinchi postni e&apos;lon qiling!
              </p>
              <Button onClick={() => setIsModalOpen(true)} size="sm" className="rounded-xl">
                Birinchi Reelni yaratish
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {reels.map((reel) => (
                <Card
                  key={reel.id}
                  className="rounded-3xl border-border/80 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                        {reel.subject_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          reel.is_published
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                        )}>
                          {reel.is_published ? "🟢 Chop etilgan" : "🟡 Qoralama"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-amber-500">
                        {reel.tagline || 'Bilasizmi?'}
                      </span>
                      <h3 className="text-sm font-extrabold text-foreground line-clamp-2 leading-snug mt-0.5">
                        {reel.hook}
                      </h3>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {reel.fact}
                    </p>

                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 text-[11px] space-y-1">
                      <span className="font-bold text-foreground">❓ Savol: </span>
                      <span className="text-muted-foreground">{reel.quiz.question}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" />
                          {reel.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3 text-sky-500" />
                          {reel.shares}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTogglePublish(reel)}
                          className="h-7 px-2 text-[11px] font-bold"
                          title={reel.is_published ? "Qoralamaga olish" : "Lentada chop etish"}
                        >
                          {reel.is_published ? "Yashirish" : "Chop etish 🚀"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteReel(reel.id)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Reel Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 no-scrollbar">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={Sparkles} tone="rose" size="sm" glow />
                  <h3 className="text-lg font-black text-foreground">
                    Yangi Bilim Reel Yaratish
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveReel} className="space-y-4 pt-4 text-xs">
                {/* Subject & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Fan</label>
                    <select
                      value={subjectSlug}
                      onChange={(e) => {
                        setSubjectSlug(e.target.value);
                        const names: Record<string, string> = {
                          'tarix': 'Tarix',
                          'ona-tili': 'Ona tili',
                          'biologiya': 'Biologiya',
                          'ingliz-tili': 'Ingliz tili',
                        };
                        setSubjectName(names[e.target.value] || 'Tarix');
                      }}
                      className="w-full h-9 rounded-xl px-3 bg-muted/60 border border-border text-foreground font-medium"
                    >
                      <option value="tarix">Tarix</option>
                      <option value="ona-tili">Ona tili</option>
                      <option value="biologiya">Biologiya</option>
                      <option value="ingliz-tili">Ingliz tili</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Mavzu / Voqea nishoni</label>
                    <Input
                      placeholder="Masalan: Amir Temur & Anqara jangi"
                      value={categoryBadge}
                      onChange={(e) => setCategoryBadge(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>
                </div>

                {/* Tagline & Hook */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Qisqa tag (Tagline)</label>
                    <Input
                      placeholder="Bilasizmi?, Oltin Qoida, Eng ko'p xato qilingan!"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Ta&apos;sirchan Sarlavha (Hook) *
                    </label>
                    <Input
                      placeholder="Masalan: O'quvchilarning 85% i bu savolda adashgan! Sababi nima?"
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      required
                      className="h-9 rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* Fact body & Takeaway */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Fakt va Jonli Tushuntirish (2-3 qisqa gap) *
                    </label>
                    <Textarea
                      placeholder="1402-yil Anqara jangidan oldin Temur daryo o'zanini burib yuborgan..."
                      value={fact}
                      onChange={(e) => setFact(e.target.value)}
                      required
                      rows={3}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Oltin Xulosa / Imtihon Qoidasi (Takeaway)
                    </label>
                    <Input
                      placeholder="Strategik resurslarni boshqarish — quroldan ham muhimroq bo'lgan."
                      value={takeaway}
                      onChange={(e) => setTakeaway(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>
                </div>

                {/* Micro Quiz */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                  <span className="font-extrabold text-foreground flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    Tezkor Mikrokvest Savoli va Variantlari
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Savol matni</label>
                    <Input
                      placeholder="Savolni kiriting..."
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant A</label>
                      <Input
                        placeholder="Variant A"
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant B</label>
                      <Input
                        placeholder="Variant B"
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant C</label>
                      <Input
                        placeholder="Variant C"
                        value={optionC}
                        onChange={(e) => setOptionC(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-foreground block mb-0.5">Variant D</label>
                      <Input
                        placeholder="Variant D"
                        value={optionD}
                        onChange={(e) => setOptionD(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-foreground block mb-1">To&apos;g&apos;ri variant</label>
                      <select
                        value={correctIndex}
                        onChange={(e) => setCorrectIndex(Number(e.target.value))}
                        className="w-full h-8 rounded-lg px-2 bg-card border border-border text-foreground text-xs font-bold"
                      >
                        <option value={0}>Variant A (1-variant)</option>
                        <option value={1}>Variant B (2-variant)</option>
                        <option value={2}>Variant C (3-variant)</option>
                        <option value={3}>Variant D (4-variant)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-foreground block mb-1">Javob izohi (Explanation)</label>
                      <Input
                        placeholder="Nega aynan shu to'g'ri..."
                        value={quizExplanation}
                        onChange={(e) => setQuizExplanation(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme & Publish Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-bold text-foreground">Neon mavzusi:</span>
                    <div className="flex items-center gap-1.5">
                      {THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setGradientTheme(th.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                            gradientTheme === th.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {th.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="font-bold text-foreground">Darhol chop etish:</span>
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl font-bold gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{saving ? "Saqlanmoqda..." : isPublished ? "🚀 Chop Etish (Publish)" : "Qoralama sifatida saqlash"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
