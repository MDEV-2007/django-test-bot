'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers, ArrowLeft, ArrowRight, RotateCw, Check, X, Sparkles, Trophy,
  Flame, BookOpen, Zap, RefreshCcw, HelpCircle,
  ChevronRight, Brain, Swords
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import { useFeatureFlags } from '@/lib/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FlashcardItem = {
  id: number;
  front: string;
  back: string;
  hint?: string;
};

type Deck = {
  id: number;
  title: string;
  subject: string;
  subject_slug: string;
  icon: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  total_cards: number;
  is_custom?: boolean;
};

type DeckDetail = Deck & {
  cards: FlashcardItem[];
};

const SUBJECT_ACCENT: Record<string, { bg: string; text: string; badge: string }> = {
  'tarix': { bg: 'bg-[#FF9500]', text: 'text-[#FF9500]', badge: 'bg-[#FF9500]/12 text-[#FF9500] border-[#FF9500]/20' },
  'ona-tili': { bg: 'bg-[#34C759]', text: 'text-[#34C759]', badge: 'bg-[#34C759]/12 text-[#34C759] border-[#34C759]/20' },
  'matematika': { bg: 'bg-[#007AFF]', text: 'text-[#007AFF]', badge: 'bg-[#007AFF]/12 text-[#007AFF] border-[#007AFF]/20' },
  'biologiya': { bg: 'bg-[#30B0C7]', text: 'text-[#30B0C7]', badge: 'bg-[#30B0C7]/12 text-[#30B0C7] border-[#30B0C7]/20' },
  'ingliz-tili': { bg: 'bg-[#5856D6]', text: 'text-[#5856D6]', badge: 'bg-[#5856D6]/12 text-[#5856D6] border-[#5856D6]/20' },
};

export default function FlashcardsPage() {
  const { isEnabled } = useFeatureFlags();
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);

  // Active study session state
  const [activeDeck, setActiveDeck] = useState<DeckDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredIds, setMasteredIds] = useState<number[]>([]);
  const [reviewIds, setReviewIds] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedReward, setEarnedReward] = useState<{ xp: number; coins: number } | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(false);

  useEffect(() => {
    apiFetch<{ subjects: { slug: string; name: string }[]; decks: Deck[] }>('/api/learning/flashcards/')
      .then((res) => {
        setSubjects(res.subjects || []);
        setDecks(res.decks || []);
      })
      .catch(() => toast.error("To'plamlarni yuklashda xatolik yuz berdi"))
      .finally(() => setLoading(false));
  }, []);

  // Keyboard navigation for power users
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!activeDeck || isCompleted) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleAnswer(true);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handleAnswer(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDeck, isCompleted, isFlipped, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startDeck(deckId: number) {
    setLoadingDeck(true);
    try {
      soundFX.click();
      const res = await apiFetch<DeckDetail>(`/api/learning/flashcards/${deckId}/`);
      setActiveDeck(res);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredIds([]);
      setReviewIds([]);
      setIsCompleted(false);
      setEarnedReward(null);
    } catch {
      toast.error("To'plamni ochishda xatolik");
    } finally {
      setLoadingDeck(false);
    }
  }

  function handleFlip() {
    soundFX.click();
    setIsFlipped((prev) => !prev);
  }

  async function handleAnswer(knows: boolean) {
    if (!activeDeck) return;
    const currentCard = activeDeck.cards[currentIndex];

    if (knows) {
      soundFX.correct();
      setMasteredIds((prev) => [...prev, currentCard.id]);
    } else {
      soundFX.click();
      setReviewIds((prev) => [...prev, currentCard.id]);
    }

    if (currentIndex + 1 < activeDeck.cards.length) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      celebrate();
      soundFX.correct();

      try {
        const res = await apiFetch<{ xp_earned: number; coins_earned: number; message: string }>(
          '/api/learning/flashcards/complete/',
          {
            method: 'POST',
            body: JSON.stringify({
              deck_id: activeDeck.id,
              learned_count: masteredIds.length + (knows ? 1 : 0),
            }),
          }
        );
        setEarnedReward({ xp: res.xp_earned, coins: res.coins_earned });
        toast.success(res.message);
      } catch {
        setEarnedReward({ xp: 25, coins: 10 });
      }
    }
  }

  function restartDeck() {
    if (!activeDeck) return;
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setMasteredIds([]);
    setReviewIds([]);
    setIsCompleted(false);
    setEarnedReward(null);
  }

  const filteredDecks = selectedSubject === 'all'
    ? decks
    : decks.filter((d) => d.subject_slug === selectedSubject);

  if (!isEnabled('flashcards')) {
    return (
      <ComingSoonFeature
        title="Smart Flashcardlar"
        badge="2.0 Beta"
        description="Sanalar, qoidalar va faktlarni Anki uslubida 3D xotira kartalari bilan yodlash moduli tez kunda IlmIldizi 2.0 relizida taqdim etiladi."
      />
    );
  }

  const currentCard = activeDeck?.cards[currentIndex];
  const progressPct = activeDeck
    ? Math.round(((currentIndex + (isCompleted ? 1 : 0)) / Math.max(1, activeDeck.cards.length)) * 100)
    : 0;

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[#F2F2F7] dark:bg-[#000000] p-4 pb-20 sm:p-6">
        
        {/* ============================================================ */}
        {/* REJIM 1: FOCUS STUDY SESSION (iOS 18 WALLET / FLIP CARD)     */}
        {/* ============================================================ */}
        {activeDeck ? (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* iOS Navigation Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDeck(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] px-3.5 py-2 text-[13px] font-semibold text-[#007AFF] shadow-xs transition-all active:scale-95"
              >
                <ArrowLeft className="size-4" /> Barcha to&apos;plamlar
              </button>
              <Badge variant="outline" className="bg-[#5856D6]/12 text-[#5856D6] border-[#5856D6]/20 text-[12px] font-bold px-3 py-1">
                {activeDeck.subject}
              </Badge>
            </div>

            {/* Deck Header & iOS Progress Bar */}
            <div className="rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white truncate">
                  {activeDeck.title}
                </h2>
                <span className="shrink-0 rounded-full bg-[#767680]/[0.12] px-3 py-1 font-mono text-[12px] font-bold text-slate-700 dark:text-slate-200">
                  {currentIndex + 1} / {activeDeck.cards.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-[12px] font-medium text-[#8E8E93]">
                <span>Yodlash jarayoni ({progressPct}%)</span>
                <span>
                  Bilganlaringiz: <strong className="font-mono font-bold text-[#34C759]">{masteredIds.length} ta</strong>
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#767680]/[0.12]">
                <div
                  className="h-full rounded-full bg-[#007AFF] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* NATIJA VA YAKUNLASH EKRANI (iOS Achievement Sheet)           */}
            {/* ============================================================ */}
            {isCompleted ? (
              <div className="rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10 text-center space-y-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                <div className="mx-auto flex size-16 items-center justify-center rounded-[20px] bg-gradient-to-b from-[#FF9500] to-[#FF7A00] text-white shadow-[0_8px_24px_rgba(255,149,0,0.3)]">
                  <Trophy className="size-8" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    Ajoyib Natija! To&apos;plam Yakunlandi!
                  </h3>
                  <p className="text-[14px] text-[#8E8E93] max-w-md mx-auto">
                    Siz ushbu mavzu bo&apos;yicha barcha muhim savol va sanalarni to&apos;liq takrorladingiz.
                  </p>
                </div>

                {earnedReward && (
                  <div className="flex items-center justify-center gap-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9500]/12 border border-[#FF9500]/25 px-4 py-1.5 font-mono text-[13px] font-bold text-[#FF9500]">
                      <Zap className="size-4 fill-[#FF9500]" /> +{earnedReward.xp} XP
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/12 border border-[#007AFF]/25 px-4 py-1.5 font-mono text-[13px] font-bold text-[#007AFF]">
                      <Sparkles className="size-4" /> +{earnedReward.coins} Tanga
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  <div className="rounded-[20px] bg-[#34C759]/[0.08] border border-[#34C759]/20 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#34C759]">Mustahkamlandi</span>
                    <p className="mt-1 font-mono text-[22px] font-extrabold text-[#34C759]">{masteredIds.length} ta</p>
                  </div>
                  <div className="rounded-[20px] bg-[#FF3B30]/[0.08] border border-[#FF3B30]/20 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF3B30]">Takrorlanadi</span>
                    <p className="mt-1 font-mono text-[22px] font-extrabold text-[#FF3B30]">{reviewIds.length} ta</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={restartDeck}
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto rounded-full gap-2"
                  >
                    <RefreshCcw className="size-4" /> Qaytadan boshlash
                  </Button>
                  <Button
                    onClick={() => setActiveDeck(null)}
                    size="lg"
                    className="w-full sm:w-auto rounded-full gap-2"
                  >
                    Keyingi to&apos;plamga o&apos;tish <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* 3D INTERAKTIV iOS WALLET FLIP CARD                           */
              /* ============================================================ */
              <div className="space-y-5">
                <div
                  onClick={handleFlip}
                  className={cn(
                    "relative min-h-[20rem] sm:min-h-[23rem] w-full cursor-pointer select-none rounded-[32px] p-6 sm:p-9 flex flex-col justify-between border transition-all duration-300 group active:scale-[0.985]",
                    isFlipped
                      ? "bg-gradient-to-br from-[#007AFF]/[0.08] via-white to-[#5856D6]/[0.06] dark:from-[#007AFF]/[0.16] dark:via-[#1C1C1E] dark:to-[#5856D6]/[0.12] border-[#007AFF]/40 shadow-[0_14px_40px_rgba(0,122,255,0.12)]"
                      : "bg-white dark:bg-[#1C1C1E] border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/35 shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
                      isFlipped
                        ? "bg-[#34C759]/12 text-[#34C759]"
                        : "bg-[#007AFF]/12 text-[#007AFF]"
                    )}>
                      <Sparkles className="size-3.5" />
                      {isFlipped ? 'Javob / Izoh' : 'Savol / Fakt'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#767680]/[0.08] px-3 py-1 text-[12px] font-semibold text-[#8E8E93]">
                      <RotateCw className="size-3.5 group-hover:rotate-180 transition-transform duration-500 text-[#007AFF]" />
                      Aylantirish (Space)
                    </span>
                  </div>

                  <div className="my-auto py-6 text-center space-y-4">
                    <p className={cn(
                      "text-[20px] sm:text-[26px] font-extrabold leading-snug tracking-[-0.02em] transition-colors",
                      isFlipped ? "text-[#007AFF] dark:text-[#5AC8FA]" : "text-slate-900 dark:text-white"
                    )}>
                      {isFlipped ? currentCard?.back : currentCard?.front}
                    </p>

                    {showHint && currentCard?.hint && (
                      <div className="rounded-[16px] bg-[#FF9500]/10 border border-[#FF9500]/25 px-4 py-2.5 text-[13px] font-medium text-[#FF9500] max-w-md mx-auto">
                        💡 Maslahat: {currentCard.hint}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.07] text-[12px]">
                    {currentCard?.hint && !showHint ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(true);
                        }}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#FF9500] hover:underline"
                      >
                        <HelpCircle className="size-4" /> Maslahatni ko&apos;rish
                      </button>
                    ) : <div />}

                    <span className="font-mono text-[11px] font-semibold text-[#8E8E93]">
                      {isFlipped ? "To'g'ri bildingizmi?" : "Javobni ko'rish uchun kartani bosing"}
                    </span>
                  </div>
                </div>

                {/* iOS Action Pill Buttons */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleAnswer(false)}
                    className="flex h-13 items-center justify-center gap-2 rounded-[18px] bg-[#FF3B30]/12 hover:bg-[#FF3B30]/18 border border-[#FF3B30]/25 text-[#FF3B30] font-bold text-[14px] transition-all active:scale-[0.97]"
                  >
                    <X className="size-4.5 stroke-[2.5]" />
                    <span>Qaytarish kerak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(true)}
                    className="flex h-13 items-center justify-center gap-2 rounded-[18px] bg-[#34C759] hover:bg-[#2DB84E] text-white font-bold text-[14px] shadow-[0_6px_20px_rgba(52,199,89,0.28)] transition-all active:scale-[0.97]"
                  >
                    <Check className="size-4.5 stroke-[2.5]" />
                    <span>Yaxshi bilaman</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ============================================================ */
          /* REJIM 2: BARCHA TO'PLAMLAR RO'YXATI (APPLE WALLET DECKS)      */
          /* ============================================================ */
          <div className="max-w-7xl mx-auto space-y-6">
            <PageHero
              tone="indigo"
              eyebrow="Smart Flashcards · Spaced Repetition"
              eyebrowIcon={Brain}
              title="Xotira Kartalari bilan Dars Qilish"
              description="Test yechishdan oldin sanalar, atamalar, imlo qoidalari va faktlarni 3 daqiqalik interaktiv 3D kartalar yordamida mustahkamlab oling."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button asChild variant="secondary" size="sm" className="rounded-full px-4">
                    <Link href="/battles">
                      <Swords className="size-3.5 text-[#FF9500]" /> 1v1 Arena
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-full px-4">
                    <Link href="/tests">
                      <BookOpen className="size-3.5" /> Testlarga o&apos;tish
                    </Link>
                  </Button>
                </div>
              }
            />

            {/* iOS Segmented Subject Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="inline-flex items-center gap-1 rounded-[14px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] p-1">
                {subjects.map((s) => {
                  const active = selectedSubject === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setSelectedSubject(s.slug)}
                      className={cn(
                        "rounded-[10px] px-4 py-1.5 text-[13px] font-semibold transition-all whitespace-nowrap",
                        active
                          ? "bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                          : "text-[#8E8E93] hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TO'PLAMLAR RO'YXATI (DECKS GRID) */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-[24px] w-full" />
                ))}
              </div>
            ) : filteredDecks.length === 0 ? (
              <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-12 text-center space-y-2">
                <div className="mx-auto flex size-12 items-center justify-center rounded-[14px] bg-[#5856D6]/12 text-[#5856D6]">
                  <Brain className="size-6" />
                </div>
                <p className="text-[16px] font-bold text-slate-900 dark:text-white">Bu fanda hozircha to&apos;plamlar yo&apos;q</p>
                <p className="text-[13px] text-[#8E8E93]">Yuqoridan boshqa fanni tanlab ko&apos;ring.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDecks.map((deck) => {
                  const accent = SUBJECT_ACCENT[deck.subject_slug] || SUBJECT_ACCENT['matematika'];
                  return (
                    <div
                      key={deck.id}
                      onClick={() => startDeck(deck.id)}
                      className="group cursor-pointer rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40 p-5 sm:p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,122,255,0.08)] transition-all duration-200 active:scale-[0.985]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("flex size-9 items-center justify-center rounded-[11px] text-white shadow-xs", accent.bg)}>
                              <Layers className="size-4.5" />
                            </div>
                            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", accent.badge)}>
                              {deck.subject}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9500]/12 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#FF9500]">
                            <Zap className="size-3 fill-[#FF9500]" /> +{deck.xp_reward} XP
                          </span>
                        </div>

                        <h3 className="text-[17px] font-bold tracking-[-0.015em] text-slate-900 dark:text-white group-hover:text-[#007AFF] transition-colors leading-snug">
                          {deck.title}
                        </h3>

                        <p className="text-[13px] text-[#8E8E93] line-clamp-2 leading-relaxed">
                          {deck.description}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between">
                        <span className="font-mono text-[12px] font-semibold text-[#8E8E93]">
                          {deck.total_cards} ta xotira kartasi
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#007AFF]/12 group-hover:bg-[#007AFF] px-3.5 py-1.5 text-[12px] font-bold text-[#007AFF] group-hover:text-white transition-all">
                          BOSHLASH <ChevronRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* iOS Smart Banner */}
            <div className="rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FF9500] text-white shadow-xs">
                  <Flame className="size-5 fill-white" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">
                    Ilmiy qoida: Har kuni 5 daqiqa Flashcard!
                  </p>
                  <p className="text-[13px] text-[#8E8E93] leading-relaxed">
                    Interval takrorlash (Spaced Repetition) orqali sanalar, formulalar va qoidalar xotirada 3 barobar uzoqroq saqlanadi.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="rounded-full px-4 shrink-0">
                <Link href="/battles">
                  <Swords className="size-3.5" /> 1v1 Arenada Bellashuv
                </Link>
              </Button>
            </div>

          </div>
        )}
      </main>
    </>
  );
}
