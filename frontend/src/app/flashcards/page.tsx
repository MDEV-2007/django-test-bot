'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers, ArrowLeft, ArrowRight, RotateCw, Check, X, Sparkles, Trophy,
  Flame, BookOpen, Crown, Zap, RefreshCcw, Volume2, HelpCircle, CheckCircle2,
  ChevronRight, Brain, Swords
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function FlashcardsPage() {
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
  }, [activeDeck, isCompleted, isFlipped, currentIndex]);

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
      // Completed all cards in the deck!
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
        // Fallback local display
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

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        
        {/* ============================================================ */}
        {/* REJIM 1: FOCUS STUDY SESSION (DARS / YODLASH JARAYONI)       */}
        {/* ============================================================ */}
        {activeDeck ? (
          <div className="max-w-2xl mx-auto space-y-5">
            
            {/* Navigatsiya boshqaruvi */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveDeck(null)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Barcha to&apos;plamlar
              </Button>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                {activeDeck.subject}
              </Badge>
            </div>

            {/* Sarlavha & Progress */}
            <div className="space-y-2 text-center">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{activeDeck.title}</h2>
              <div className="flex items-center justify-between text-xs text-muted-foreground max-w-md mx-auto">
                <span>Karta: <strong>{currentIndex + 1}</strong> / {activeDeck.cards.length}</span>
                <span>Bilganlaringiz: <strong className="text-emerald-500">{masteredIds.length}</strong></span>
              </div>
              <Progress
                value={((currentIndex + (isCompleted ? 1 : 0)) / activeDeck.cards.length) * 100}
                className="h-2 max-w-md mx-auto"
              />
            </div>

            {/* ============================================================ */}
            {/* NATIJA VA YAKUNLASH EKRANI                                  */}
            {/* ============================================================ */}
            {isCompleted ? (
              <Card className="border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 shadow-xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="size-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="size-8 animate-bounce" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black tracking-tight text-foreground">
                    Ajoyib Natija! To&apos;plam Yakunlandi!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Siz ushbu mavzu bo&apos;yicha barcha muhim savol va sanalarni to&apos;liq takrorladingiz.
                  </p>
                </div>

                {earnedReward && (
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-sm">
                      <Zap className="size-4" /> +{earnedReward.xp} XP
                    </div>
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      <Sparkles className="size-4" /> +{earnedReward.coins} Tanga
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl border">
                    <span className="text-muted-foreground">Xotirada mustahkamlandi</span>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {masteredIds.length} ta
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border">
                    <span className="text-muted-foreground">Qaytarish tavsiya etiladi</span>
                    <p className="text-xl font-bold text-amber-500 mt-0.5">
                      {reviewIds.length} ta
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={restartDeck}
                    variant="outline"
                    className="w-full sm:w-auto gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCcw className="size-3.5" /> Qayta takrorlash
                  </Button>
                  <Button
                    onClick={() => setActiveDeck(null)}
                    className="w-full sm:w-auto gap-1.5 text-xs font-semibold bg-primary hover:opacity-90"
                  >
                    Boshqa to&apos;plam tanlash <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>
            ) : (
              /* ============================================================ */
              /* 3D INTERAKTIV FLIP CARD                                      */
              /* ============================================================ */
              <div className="space-y-4">
                <div
                  onClick={handleFlip}
                  className="relative min-h-[280px] sm:min-h-[320px] w-full cursor-pointer rounded-2xl border-2 border-border/80 bg-gradient-to-br from-card to-card/60 p-6 sm:p-8 shadow-lg transition-all duration-300 hover:border-primary/50 flex flex-col justify-between select-none group"
                  style={{ perspective: '1000px' }}
                >
                  {/* Karta boshi */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {isFlipped ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-primary" /> Javob / Tushuntirish
                        </>
                      ) : (
                        <>
                          <HelpCircle className="size-3.5 text-amber-500" /> Savol / Fakt
                        </>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                      <RotateCw className="size-3 group-hover:rotate-180 transition-transform duration-500" />
                      Aylantirish uchun bosing
                    </span>
                  </div>

                  {/* Karta matni */}
                  <div className="my-auto py-4 text-center">
                    <p className={cn(
                      "text-lg sm:text-2xl font-bold leading-relaxed transition-colors",
                      isFlipped ? "text-primary dark:text-primary-foreground font-semibold text-base sm:text-xl" : "text-foreground"
                    )}>
                      {isFlipped
                        ? activeDeck.cards[currentIndex]?.back
                        : activeDeck.cards[currentIndex]?.front
                      }
                    </p>

                    {/* Maslahat (Hint) */}
                    {!isFlipped && activeDeck.cards[currentIndex]?.hint && (
                      <div className="mt-4">
                        {showHint ? (
                          <p className="text-xs text-amber-500 font-medium italic">
                            💡 Maslahat: {activeDeck.cards[currentIndex].hint}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                            className="text-[11px] text-muted-foreground hover:text-amber-500 underline transition-colors"
                          >
                            💡 Maslahatni ko&apos;rish
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Karta osti */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <span>Bo&apos;shliq (Space) — aylantirish</span>
                    <span className="font-mono">Kartalar: {currentIndex + 1} / {activeDeck.cards.length}</span>
                  </div>
                </div>

                {/* Javob berish tugmalari */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAnswer(false)}
                    className="h-12 border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold gap-2 text-xs sm:text-sm"
                  >
                    <X className="size-4 text-rose-500" /> Qaytarish kerak (Qiyin)
                  </Button>
                  <Button
                    onClick={() => handleAnswer(true)}
                    className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs sm:text-sm shadow-md"
                  >
                    <Check className="size-4" /> Yaxshi bilaman (Oson)
                  </Button>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ============================================================ */
          /* REJIM 2: BARCHA TO'PLAMLAR RO'YXATI (DECK SELECTION)         */
          /* ============================================================ */
          <>
            {/* HERO BLOKI */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold gap-1">
                    <Brain className="size-3 text-amber-500" /> Smart Flashcards
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-medium">Anki & Quizlet uslubi</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1.5">
                  Xotira Kartalari bilan Dars Qilish
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                  Test yechishdan oldin sanalar, atamalar, imlo qoidalari va faktlarni 3 daqiqalik interaktiv kartalar yordamida mustahkamlab oling.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href="/battles">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    <Swords className="size-3.5 text-rose-500" /> 1v1 Arena
                  </Button>
                </Link>
                <Link href="/tests">
                  <Button size="sm" className="gap-1.5 text-xs font-semibold bg-primary">
                    <BookOpen className="size-3.5" /> Testlarga o&apos;tish
                  </Button>
                </Link>
              </div>
            </div>

            {/* FANLAR BO'YICHA FILTR TABLARI */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
              <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                <TabsList className="bg-muted/60 p-1 border">
                  {subjects.map((s) => (
                    <TabsTrigger key={s.slug} value={s.slug} className="text-xs font-semibold">
                      {s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* TO'PLAMLAR RO'YXATI (DECKS GRID) */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl w-full" />
                ))}
              </div>
            ) : filteredDecks.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Brain className="size-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Bu fanda hozircha to&apos;plamlar yo&apos;q</p>
                <p className="text-xs text-muted-foreground mt-1">Boshqa fanni tanlab ko&apos;ring.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDecks.map((deck) => (
                  <Card
                    key={deck.id}
                    onClick={() => startDeck(deck.id)}
                    className="cursor-pointer border border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-card to-card/60 rounded-2xl p-5 flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {deck.subject}
                        </Badge>
                        <span className="text-[11px] text-amber-500 font-bold flex items-center gap-1">
                          <Zap className="size-3" /> +{deck.xp_reward} XP
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {deck.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {deck.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-muted-foreground">
                        {deck.total_cards} ta karta
                      </span>
                      <Button
                        size="sm"
                        disabled={loadingDeck}
                        className="h-8 text-xs font-semibold gap-1 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      >
                        Yodlash <ChevronRight className="size-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* VIRAL MOTIVATSION BANNER */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-rose-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-4 text-rose-500" /> Ilmiy Qoidalar: Har kuni 5 daqiqa flashcard!
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tadqiqotlarga ko&apos;ra, interval takrorlash (Spaced Repetition) orqali sanalar va atamalar xotirada 3 barobar uzoqroq saqlanib qoladi.
                </p>
              </div>
              <Link href="/battles">
                <Button size="sm" className="gap-1.5 text-xs font-bold shrink-0 bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm">
                  <Swords className="size-3.5" /> 1v1 Arenada Do&apos;st bilan Bellashuv
                </Button>
              </Link>
            </div>

          </>
        )}
      </main>
    </>
  );
}
