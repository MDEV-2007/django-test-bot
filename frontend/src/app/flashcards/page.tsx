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
import { Skeleton } from '@/components/ui/skeleton';
import { useTransliterate } from '@/lib/transliterate';
import { SubjectCard, TONE_CYCLE } from '@/components/tests/PastelCatalog';
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

    // Mukofot faqat server javobidan (kunlik limit / takroriy to'plamda 0 bo'ladi).
    setEarnedReward({ xp: 0, coins: 0 });

    try {
      const res = await apiFetch<{ xp_earned?: number; coins_earned?: number }>('/api/learning/flashcards/complete/', {
        method: 'POST',
        body: JSON.stringify({
          deck_id: activeDeck.id,
          mastered_count: masteredIds.length + 1,
          total_cards: activeDeck.cards.length,
        }),
      });
      setEarnedReward({ xp: res?.xp_earned ?? 0, coins: res?.coins_earned ?? 0 });
    } catch {
      // offline fallback
    }
  };

  const filteredDecks = decks.filter((d) => {
    if (selectedSubject === 'all') return true;
    return d.subject_slug === selectedSubject;
  });

  const card = activeDeck?.cards[currentIndex];
  const total = activeDeck?.cards.length ?? 0;

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-8 p-4 pb-24 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-x-clip">
        {!activeDeck && (
          <>
            {/* ── Hero ── */}
            <section className="relative grid items-center gap-8 pt-2 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="min-w-0">
                <span className="ps-chip">
                  <Brain className="size-3.5 text-[var(--ps-purple)]" /> {t("Interaktiv xotira kartalari")}
                </span>
                <h1 className="ps-display mt-5 text-[46px] sm:text-[68px] xl:text-[80px]">
                  Flash
                  <span className="relative inline-block text-[var(--ps-purple)]">
                    cards
                    <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                      <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                    </svg>
                  </span>
                  <span className="text-[var(--ps-coral)]">.</span>
                </h1>
                <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  {t("Qisqa muddatli xotiradan uzoq muddatli xotiraga o'tkazuvchi intervalli takrorlash. Har bir kartani o'zlashtirib, DTM va CEFR imtihonlariga tayyorlaning.")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/tests/revision" className="ps-btn ps-btn-ink">
                    <Flame className="size-4 text-[var(--ps-orange)]" /> {t("Mening xatolarim")}
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </Link>
                </div>
              </div>

              {/* Kartalar to'plami kompozitsiyasi */}
              <div className="relative mx-auto h-[220px] w-[220px] sm:h-[280px] sm:w-[280px]" aria-hidden>
                <div className="absolute inset-[6%] rounded-full bg-[var(--ps-orange)]" />
                <div className="absolute left-[14%] top-[16%] h-[58%] w-[48%] -rotate-12 rounded-[22px] bg-[var(--ps-green)] shadow-xl" />
                <div className="absolute left-[28%] top-[12%] h-[62%] w-[50%] rotate-6 rounded-[22px] bg-[var(--ps-purple)] shadow-xl" />
                <div className="absolute left-[24%] top-[20%] flex h-[60%] w-[50%] flex-col items-center justify-center rounded-[22px] bg-[#FFFCF7] text-[#080808] shadow-2xl">
                  <Layers className="size-7 text-[var(--ps-purple)]" />
                  <span className="ps-num mt-2 text-[40px]">{decks.length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/50">koloda</span>
                </div>
                <div className="ps-spin absolute -right-1 bottom-[6%] size-14 text-[var(--ps-ink)]">
                  <svg viewBox="0 0 100 100" className="size-full"><path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" /></svg>
                </div>
              </div>
            </section>

            {/* ── Fanlar filtri ── */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="ps-eyebrow text-[var(--text-muted)]">Kolodani tanlang</p>
                <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">Fanlar bo&apos;yicha <span className="text-[var(--ps-purple)]">kolodalar</span></h2>
              </div>
              <span className="ps-chip">{filteredDecks.length} ta koloda</span>
            </div>
            <div className="ds-seg flex max-w-full gap-1 overflow-x-auto no-scrollbar sm:w-fit">
              <button
                type="button"
                data-active={selectedSubject === 'all' ? 'true' : undefined}
                onClick={() => { tgHaptic('select'); setSelectedSubject('all'); }}
                className="ds-seg-item shrink-0 cursor-pointer font-bold"
              >
                {t("Barcha fanlar")} ({decks.length})
              </button>
              {subjects.filter((s) => s.slug !== 'all').map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  data-active={selectedSubject === s.slug ? 'true' : undefined}
                  onClick={() => { tgHaptic('select'); setSelectedSubject(s.slug); }}
                  className="ds-seg-item shrink-0 cursor-pointer font-bold"
                >
                  {t(s.name)}
                </button>
              ))}
              <Link href="/tests/revision" className="ds-seg-item shrink-0 font-bold !text-[var(--ps-coral)]">
                🔥 {t("Xatolar banki")}
              </Link>
            </div>

            {/* ── Kolodalar ── */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-[28px] bg-white/40" />
                ))}
              </div>
            ) : filteredDecks.length === 0 ? (
              <div className="ps-card flex flex-col items-center px-6 py-14 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                  <Layers className="size-7" />
                </span>
                <p className="ps-display mt-4 text-[24px]">{t("Ushbu fan bo'yicha hozircha kolodalar yo'q")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {filteredDecks.map((deck, i) => (
                  <SubjectCard
                    key={deck.id}
                    index={i}
                    tone={TONE_CYCLE[i % TONE_CYCLE.length]}
                    icon={ICON_MAP[deck.icon] || Layers}
                    title={t(deck.title)}
                    subtitle={deck.subject}
                    desc={t(deck.description)}
                    badges={[deck.difficulty]}
                    meta={[
                      { label: t('Kartalar'), value: `${deck.total_cards} ta` },
                      { label: t('Mukofot'), value: `+${deck.xp_reward} XP` },
                    ]}
                    cta={loadingDeck ? t('Ochilmoqda…') : t('Kolodani ochish')}
                    busy={loadingDeck}
                    disabled={loadingDeck}
                    wholeCardClick
                    onClick={() => openDeck(deck.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Faol mashg'ulot ── */}
        {activeDeck && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Yuqori panel — test ekrani bilan bir xil */}
            <div className="ps-runner-bar sticky top-2 z-30 rounded-[28px] p-2.5 sm:top-3 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={t("Kolodalarga qaytish")}
                    title={t("Kolodalarga qaytish")}
                    onClick={() => { setActiveDeck(null); tgHaptic('medium'); }}
                    className="ps-runner-icon flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:rotate-90"
                  >
                    <X className="size-4" />
                  </button>
                  <span className="ps-runner-count flex h-10 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-sm font-bold">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                      <Layers className="size-3.5" />
                    </span>
                    <span className="tabular-nums">
                      {Math.min(currentIndex + 1, total)}<span className="opacity-50">/{total}</span>
                    </span>
                  </span>
                  <span className="ps-runner-chip hidden h-10 min-w-0 items-center rounded-full px-3 text-xs font-bold sm:flex">
                    <span className="truncate">{t(activeDeck.title)}</span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="flex h-10 items-center gap-1 rounded-full bg-[var(--ps-green)] px-3 text-sm font-bold text-white">
                    <Check className="size-4" /> {masteredIds.length}
                  </span>
                  <span className="flex h-10 items-center gap-1 rounded-full bg-[var(--ps-coral)] px-3 text-sm font-bold text-white">
                    <X className="size-4" /> {reviewIds.length}
                  </span>
                </div>
              </div>
              <div className="mt-2.5 px-1">
                <div className="ps-runner-track h-2 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--ps-purple)] to-[var(--ps-coral)] transition-[width] duration-500"
                    style={{ width: `${Math.max(2, (currentIndex / Math.max(1, total)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {!isCompleted ? (
              <div className="space-y-4">
                {/* Aylanuvchi karta */}
                <AnimatePresence mode="wait">
                  <motion.button
                    type="button"
                    key={`${card?.id}-${isFlipped ? 'b' : 'f'}`}
                    onClick={handleFlip}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className={cn(
                      'relative flex min-h-[300px] w-full cursor-pointer select-none flex-col items-center justify-between overflow-hidden rounded-[32px] p-6 text-center shadow-[0_30px_60px_-34px_rgba(60,30,110,0.7)] sm:min-h-[340px] sm:p-9',
                      isFlipped ? 'bg-[var(--ps-purple)] text-white' : 'bg-[var(--ps-paper)] text-[var(--text-primary)]',
                    )}
                  >
                    <span aria-hidden className={cn('absolute -right-14 -top-14 size-44 rounded-full', isFlipped ? 'bg-white/15' : 'bg-[var(--ps-purple)] opacity-15')} />
                    <span className="relative flex w-full items-center justify-between text-xs">
                      <span className={cn('rounded-full px-3 py-1 font-bold', isFlipped ? 'bg-white/20' : 'bg-[var(--ps-neutral)]')}>
                        {isFlipped ? t("Orqa tomon · javob") : t("Old tomon · savol")}
                      </span>
                      <span className={cn('flex items-center gap-1 font-semibold', isFlipped ? 'text-white/75' : 'text-[var(--text-muted)]')}>
                        <RotateCw className="size-3.5" /> {t("Aylantirish")}
                      </span>
                    </span>

                    <span className="relative my-auto block space-y-4 px-2">
                      <span className="ps-display block text-[26px] !leading-[1.15] sm:text-[34px]">
                        {isFlipped ? card?.back : card?.front}
                      </span>
                      {showHint && card?.hint && (
                        <span className="inline-block rounded-full bg-[var(--ps-orange)] px-4 py-1.5 text-xs font-bold text-[#080808]">
                          💡 {card.hint}
                        </span>
                      )}
                    </span>

                    <span className="relative flex w-full items-center justify-between">
                      {card?.hint && !showHint ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setShowHint(true); tgHaptic('light'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowHint(true); } }}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[12px] font-bold text-[#080808]"
                        >
                          <HelpCircle className="size-3.5" /> {t("Maslahat olish")}
                        </span>
                      ) : <span />}
                      <span className={cn('text-[12px]', isFlipped ? 'text-white/65' : 'text-[var(--text-faint)]')}>{t("Kartani bosib aylantiring")}</span>
                    </span>
                  </motion.button>
                </AnimatePresence>

                {/* Javob tugmalari */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAnswer(false)}
                    className="ps-btn h-14 justify-center bg-[var(--ps-coral)] text-white shadow-[0_14px_28px_-16px_rgba(240,82,61,0.9)]"
                  >
                    <X className="size-5" /> {t("Bilmadim")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(true)}
                    className="ps-btn h-14 justify-center bg-[var(--ps-green)] text-white shadow-[0_14px_28px_-16px_rgba(76,128,107,0.9)]"
                  >
                    <Check className="size-5" /> {t("Bildim (+5 XP)")}
                  </button>
                </div>
              </div>
            ) : (
              /* Yakuniy natija */
              <section className="ps-card relative flex flex-col items-center gap-5 overflow-hidden !rounded-[32px] p-8 text-center sm:p-10">
                <span aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-[var(--ps-purple)] opacity-20" />
                <div className="relative size-40">
                  <div className="absolute inset-0 rounded-full bg-[var(--ps-orange)]" />
                  <div className="absolute inset-[12%] flex flex-col items-center justify-center rounded-full border-[5px] border-[#FFFCF7] bg-[#080808] text-[#FFFCF7]">
                    <Trophy className="size-5 text-[var(--ps-orange)]" />
                    <span className="ps-num mt-1 text-[38px]">
                      {masteredIds.length}<span className="text-[0.5em] text-[var(--ps-orange)]">/{total}</span>
                    </span>
                  </div>
                </div>
                <h2 className="ps-display relative text-[32px] sm:text-[40px]">
                  {t("Koloda yakunlandi")}<span className="text-[var(--ps-coral)]">!</span>
                </h2>
                <p className="relative max-w-sm text-sm text-[var(--text-muted)]">
                  {t("Siz")} {total} {t("ta kartadan")} {masteredIds.length} {t("tasini to'liq eslab qoldingiz.")}
                </p>
                {earnedReward && (
                  <div className="relative flex gap-2">
                    <span className="rounded-full bg-[var(--ps-green)] px-4 py-2 text-sm font-bold text-white">+{earnedReward.xp} XP</span>
                    <span className="rounded-full bg-[var(--ps-orange)] px-4 py-2 text-sm font-bold text-[#080808]">+{earnedReward.coins} {t("tanga")}</span>
                  </div>
                )}
                <div className="relative flex flex-wrap justify-center gap-3 pt-2">
                  <button type="button" onClick={() => openDeck(activeDeck.id)} className="ps-btn ps-btn-ghost">
                    <RotateCw className="size-4" /> {t("Qayta takrorlash")}
                  </button>
                  <button type="button" onClick={() => setActiveDeck(null)} className="ps-btn ps-btn-ink">
                    {t("Boshqa kolodalar")}
                    <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
