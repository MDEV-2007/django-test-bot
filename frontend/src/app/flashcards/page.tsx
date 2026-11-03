'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers, ArrowLeft, ArrowRight, RotateCw, Check, X, Sparkles, Trophy,
  Flame, BookOpen, Zap, RefreshCcw, HelpCircle,
  ChevronRight, Brain, Swords, Users, Home, FlaskConical, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import AppShell from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTransliterate } from '@/lib/transliterate';
import { cn } from '@/lib/utils';

interface FlashcardItem {
  id: number;
  front: string;
  back: string;
  hint?: string;
}

interface Deck {
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
}

interface DeckDetail extends Deck {
  cards: FlashcardItem[];
}

const ICON_MAP: Record<string, any> = {
  Users,
  Home,
  Crown: Award,
  BookOpen,
  FlaskConical,
  Sparkles,
  Layers,
  Zap,
};

export default function FlashcardsPage() {
  const { t } = useTransliterate();
  const [subjects, setSubjects] = useState<{ slug: string; name: string }[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);

  // Active study session
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
      .catch((e) => toast.error(e instanceof Error ? e.message : t("Yuklashda xatolik yuz berdi")))
      .finally(() => setLoading(false));
  }, []);

  const openDeck = async (deckId: number) => {
    setLoadingDeck(true);
    soundFX.click();
    tgHaptic('medium');
    try {
      const data = await apiFetch<DeckDetail>(`/api/learning/flashcards/${deckId}/`);
      if (!data || !data.cards || data.cards.length === 0) {
        toast.error(t("Bu kolodada hozircha kartochkalar mavjud emas."));
        return;
      }
      setActiveDeck(data);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredIds([]);
      setReviewIds([]);
      setIsCompleted(false);
      setEarnedReward(null);
    } catch {
      toast.error(t("Kartochkalarni yuklab bo'lmadi"));
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleFlip = () => {
    soundFX.click();
    tgHaptic('light');
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (known: boolean) => {
    if (!activeDeck) return;
    const currentCard = activeDeck.cards[currentIndex];
    if (!currentCard) return;

    if (known) {
      soundFX.correct();
      tgHaptic('success');
      setMasteredIds((prev) => [...prev, currentCard.id]);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
      setReviewIds((prev) => [...prev, currentCard.id]);
    }

    if (currentIndex + 1 < activeDeck.cards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      finishDeck();
    }
  };

  const finishDeck = async () => {
    if (!activeDeck) return;
    setIsCompleted(true);
    soundFX.success();
    tgHaptic('success');
    celebrate();

    const xpEarned = activeDeck.xp_reward || 25;
    const coinsEarned = Math.round(xpEarned / 2);
    setEarnedReward({ xp: xpEarned, coins: coinsEarned });

    try {
      await apiFetch('/api/learning/flashcards/complete/', {
        method: 'POST',
        body: JSON.stringify({
          deck_id: activeDeck.id,
          mastered_count: masteredIds.length + 1,
          total_cards: activeDeck.cards.length,
        }),
      });
    } catch {
      // offline fallback
    }
  };

  const filteredDecks = decks.filter((d) => {
    if (selectedSubject === 'all') return true;
    return d.subject_slug === selectedSubject;
  });

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-20 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* 1. HERO SIKL BANNERI */}
        {!activeDeck && (
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-violet-950/70 via-zinc-900 to-indigo-950/50 border border-violet-500/25 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold uppercase tracking-wider">
                  <Brain className="size-3.5" />
                  <span>{t("Interaktiv Xotira Kartalari (Flashcards)")}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {t("Barcha Fanlar Bo'yicha Lug'at & Qoidalar")} 🧠
                </h1>
                <p className="text-sm text-zinc-300 max-w-xl leading-relaxed">
                  {t("Qisqa muddatli xotiradan uzoq muddatli xotiraga o'tkazuvchi ilmiy intervalli takrorlash. Har bir kartani o'zlashtirib, DTM va CEFR imtihonlariga tayyorlaning.")}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button asChild variant="outline" className="rounded-xl border-white/10 text-white font-bold">
                  <Link href="/tests/mistakes">
                    <Flame className="size-4 text-orange-400 mr-1.5" />
                    <span>{t("Mening xatolarim")}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. FANLAR FILTRI (1-QADAM) */}
        {!activeDeck && (
          <div className="space-y-4">
            <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
              <Button
                size="sm"
                variant="outline"
                className={cn('shrink-0 rounded-full font-bold cursor-pointer', selectedSubject === 'all' && 'chip-active')}
                onClick={() => { tgHaptic('select'); setSelectedSubject('all'); }}
              >
                {t("Barcha Fanlar")} ({decks.length})
              </Button>
              {subjects.map((s) => (
                <Button
                  key={s.slug}
                  size="sm"
                  variant="outline"
                  className={cn('shrink-0 rounded-full font-bold cursor-pointer', selectedSubject === s.slug && 'chip-active')}
                  onClick={() => { tgHaptic('select'); setSelectedSubject(s.slug); }}
                >
                  {t(s.name)}
                </Button>
              ))}
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 rounded-full font-bold border-rose-500/40 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <Link href="/tests/mistakes">
                  🔥 {t("Xatolar Banki")}
                </Link>
              </Button>
            </div>

            {/* 3. BENTO-KOLODALAR (2-QADAM) */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-44 rounded-3xl" />
                ))}
              </div>
            ) : filteredDecks.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-10 text-center space-y-3">
                <Layers className="size-10 text-zinc-500 mx-auto" />
                <p className="text-zinc-300 font-bold">{t("Ushbu fan bo'yicha hozircha kolodalar mavjud emas.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDecks.map((deck) => {
                  const IconComp = ICON_MAP[deck.icon] || Layers;
                  return (
                    <div
                      key={deck.id}
                      onClick={() => openDeck(deck.id)}
                      className="group p-5 rounded-[26px] border border-white/10 bg-zinc-900/80 hover:bg-zinc-850 hover:border-violet-500/50 transition-all cursor-pointer shadow-lg space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="size-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                            <IconComp className="size-5" />
                          </span>
                          <Badge variant="outline" className="text-[12px] font-mono border-white/10 text-zinc-400">
                            {deck.difficulty}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                          {t(deck.title)}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {t(deck.description)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="font-bold text-violet-400 font-mono">
                          {deck.total_cards} {t("ta karta")}
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          +{deck.xp_reward} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. 3D FLIP KARTASI (3-QADAM: ACTIVE STUDY SESSION) */}
        {activeDeck && (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Header: Chiqish va Progress bar */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActiveDeck(null); tgHaptic('medium'); }}
                className="rounded-xl border-white/10 text-zinc-300"
              >
                <ArrowLeft className="size-4 mr-1.5" />
                <span>{t("Kolodalarga qaytish")}</span>
              </Button>
              <div className="text-xs font-mono font-bold text-zinc-400">
                {currentIndex + 1} / {activeDeck.cards.length}
              </div>
            </div>

            <Progress
              value={((currentIndex) / activeDeck.cards.length) * 100}
              className="h-2 rounded-full bg-zinc-800"
            />

            {!isCompleted ? (
              <div className="space-y-5">
                {/* 3D Flip Card */}
                <div
                  onClick={handleFlip}
                  className="min-h-[280px] sm:min-h-[320px] rounded-[32px] border-2 border-violet-500/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-8 shadow-2xl flex flex-col justify-between items-center text-center cursor-pointer transition-all hover:border-violet-500/60 select-none relative overflow-hidden"
                >
                  <div className="w-full flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono uppercase tracking-wider text-violet-400 font-bold">
                      {isFlipped ? t("Orqa tomon (Javob)") : t("Old tomon (Savol / So'z)")}
                    </span>
                    <span className="flex items-center gap-1 text-[12px]">
                      <RotateCw className="size-3" /> {t("Aylantirish")}
                    </span>
                  </div>

                  <div className="my-auto space-y-3 px-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                      {isFlipped
                        ? activeDeck.cards[currentIndex]?.back
                        : activeDeck.cards[currentIndex]?.front}
                    </h2>
                    {showHint && activeDeck.cards[currentIndex]?.hint && (
                      <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl inline-block">
                        💡 {activeDeck.cards[currentIndex]?.hint}
                      </p>
                    )}
                  </div>

                  <div className="w-full flex justify-between items-center pt-2">
                    {activeDeck.cards[currentIndex]?.hint && !showHint ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowHint(true); tgHaptic('light'); }}
                        className="text-[12px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="size-3.5" /> {t("Maslahat olish")}
                      </button>
                    ) : <span />}
                    <span className="text-[12px] text-zinc-500">{t("Kartani bosib aylantiring")}</span>
                  </div>
                </div>

                {/* Javob tugmalari */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => handleAnswer(false)}
                    variant="outline"
                    className="h-14 rounded-2xl border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-sm cursor-pointer"
                  >
                    <X className="size-5 mr-2 text-rose-400" />
                    <span>{t("❌ Bilmadim")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleAnswer(true)}
                    className="h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="size-5 mr-2" />
                    <span>{t("✅ Bildim (+5 XP)")}</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Yakuniy Natija */
              <div className="rounded-[32px] border border-emerald-500/30 bg-zinc-900/80 p-8 text-center space-y-4 shadow-2xl">
                <div className="size-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Trophy className="size-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {t("Ajoyib natija! Koloda yakunlandi")} 🎉
                </h2>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  {t("Siz")} {activeDeck.cards.length} {t("ta kartadan")} {masteredIds.length} {t("tasini to'liq eslab qoldingiz.")}
                </p>
                {earnedReward && (
                  <div className="inline-flex items-center gap-4 p-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-sm">
                    <span className="text-emerald-400 font-bold">+{earnedReward.xp} XP</span>
                    <span className="text-amber-400 font-bold">+{earnedReward.coins} Tanga</span>
                  </div>
                )}
                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => openDeck(activeDeck.id)}
                    variant="outline"
                    className="rounded-xl border-white/10 text-white font-bold"
                  >
                    <RotateCw className="size-4 mr-1.5" />
                    <span>{t("Qayta takrorlash")}</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveDeck(null)}
                    className="rounded-xl bg-primary text-primary-foreground font-bold"
                  >
                    <span>{t("Boshqa kolodalar")}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
