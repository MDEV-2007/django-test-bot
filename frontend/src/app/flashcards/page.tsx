'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers, ArrowLeft, ArrowRight, RotateCw, Check, X, Sparkles, Trophy,
  Flame, BookOpen, Crown, Zap, RefreshCcw, Volume2, HelpCircle, CheckCircle2,
  ChevronRight, Brain, Swords, Dna
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import ComingSoonFeature from '@/components/ui/coming-soon-feature';
import PremiumIcon from '@/components/ui/premium-icon';
import { useFeatureFlags } from '@/lib/features';
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
              <Card className="border border-border bg-card shadow-card p-6 sm:p-8 text-center space-y-6">
                <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <Trophy className="size-6 text-amber-500" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Ajoyib Natija! To&apos;plam Yakunlandi!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Siz ushbu mavzu bo&apos;yicha barcha muhim savol va sanalarni to&apos;liq takrorladingiz.
                  </p>
                </div>

                {earnedReward && (
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs font-mono">
                      <Zap className="size-3.5 fill-amber-500" /> +{earnedReward.xp} XP
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs font-mono">
                      <Sparkles className="size-3.5" /> +{earnedReward.coins} Tanga
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <span className="text-muted-foreground">Xotirada mustahkamlandi</span>
                    <p className="text-lg font-bold text-emerald-500 mt-0.5">{masteredIds.length} ta</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <span className="text-muted-foreground">Qayta takrorlanadi</span>
                    <p className="text-lg font-bold text-destructive mt-0.5">{reviewIds.length} ta</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <Button
                    onClick={restartDeck}
                    variant="outline"
                    className="w-full sm:w-auto rounded-lg gap-2 font-medium"
                  >
                    <RefreshCcw className="size-3.5" /> Qaytadan boshlash
                  </Button>
                  <Button
                    onClick={() => setActiveDeck(null)}
                    className="w-full sm:w-auto rounded-lg gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                  >
                    Keyingi to&apos;plamga o&apos;tish <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>
            ) : (
              /* ============================================================ */
              /* 3D INTERAKTIV FLIP CARD                                      */
              /* ============================================================ */
              <div className="space-y-6">
                {/* 3D Flip Flashcard */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="relative min-h-[18rem] sm:min-h-[22rem] w-full cursor-pointer select-none rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-border bg-card hover:border-primary/50 transition-colors shadow-card group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider text-[11px] text-primary">
                      <Sparkles className="size-3.5" />
                      {isFlipped ? 'Javob / Izoh' : 'Savol / Fakt'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md text-muted-foreground">
                      <RotateCw className="size-3 group-hover:rotate-180 transition-transform duration-500" />
                      Aylantirish uchun bosing
                    </span>
                  </div>

                  <div className="my-auto py-4 text-center space-y-3">
                    <p className={cn(
                      "text-xl sm:text-2xl font-bold leading-snug tracking-tight text-foreground transition-colors",
                      isFlipped && "text-primary"
                    )}>
                      {isFlipped ? currentCard?.back : currentCard?.front}
                    </p>

                    {showHint && currentCard?.hint && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg max-w-md mx-auto">
                        💡 Maslahat: {currentCard.hint}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
                    {currentCard?.hint && !showHint ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(true);
                        }}
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <HelpCircle className="size-3.5" /> Maslahatni ko&apos;rish
                      </button>
                    ) : <div />}

                    <span className="text-muted-foreground text-[11px] font-mono">
                      {isFlipped ? 'To\'g\'ri bildingizmi?' : 'O\'ylab ko\'ring'}
                    </span>
                  </div>
                </div>

                {/* Javob berish tugmalari */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAnswer(false)}
                    className="h-11 border-border hover:bg-destructive/10 text-destructive font-semibold gap-2 text-xs sm:text-sm rounded-lg"
                  >
                    <X className="size-4" /> Qaytarish kerak (Qiyin)
                  </Button>
                  <Button
                    onClick={() => handleAnswer(true)}
                    className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 text-xs sm:text-sm rounded-lg shadow-xs"
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1.5 rounded-md">
                    <Brain className="size-3.5" />
                    <span>Smart Flashcards</span>
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-normal">Anki & Quizlet uslubi</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1.5">
                  Xotira Kartalari bilan Dars Qilish
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                  Test yechishdan oldin sanalar, atamalar, imlo qoidalari va faktlarni 3 daqiqalik interaktiv kartalar yordamida mustahkamlab oling.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href="/battles">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium rounded-lg">
                    <Swords className="size-3.5 text-primary" /> 1v1 Arena
                  </Button>
                </Link>
                <Link href="/tests">
                  <Button size="sm" className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-xs">
                    <BookOpen className="size-3.5" /> Testlarga o&apos;tish
                  </Button>
                </Link>
              </div>
            </div>

            {/* FANLAR BO'YICHA FILTR TABLARI */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
              <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                <TabsList className="bg-muted/50 p-1 border border-border rounded-lg">
                  {subjects.map((s) => (
                    <TabsTrigger key={s.slug} value={s.slug} className="text-xs font-medium rounded-md">
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
                  <Skeleton key={i} className="h-44 rounded-xl w-full" />
                ))}
              </div>
            ) : filteredDecks.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-border rounded-xl">
                <Brain className="size-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Bu fanda hozircha to&apos;plamlar yo&apos;q</p>
                <p className="text-xs text-muted-foreground mt-1">Boshqa fanni tanlab ko&apos;ring.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDecks.map((deck) => {
                  return (
                    <Card
                      key={deck.id}
                      onClick={() => startDeck(deck.id)}
                      className="cursor-pointer border border-border hover:border-primary/50 transition-colors bg-card rounded-xl p-5 flex flex-col justify-between shadow-card group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[11px] font-medium border-border">
                            <span>{deck.subject}</span>
                          </Badge>
                          <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1 font-mono">
                            <Zap className="size-3 fill-amber-500" /> +{deck.xp_reward} XP
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {deck.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {deck.description}
                        </p>
                      </div>

                      <div className="pt-4 mt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-muted-foreground">
                          {deck.total_cards} ta karta
                        </span>
                        <Button
                          size="sm"
                          disabled={loadingDeck}
                          className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
                        >
                          Yodlash <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* MOTIVATSION BANNER */}
            <div className="p-4 sm:p-5 rounded-xl bg-card border border-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Flame className="size-4 text-amber-500 fill-amber-500" />
                  <span>Ilmiy Qoidalar: Har kuni 5 daqiqa flashcard!</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tadqiqotlarga ko&apos;ra, interval takrorlash (Spaced Repetition) orqali sanalar va atamalar xotirada 3 barobar uzoqroq saqlanib qoladi.
                </p>
              </div>
              <Link href="/battles">
                <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-xs">
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
