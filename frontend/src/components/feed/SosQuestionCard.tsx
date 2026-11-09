'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, MessageCircle, Sparkles, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn, formatRichText } from '@/lib/utils';

export type SosPollData = {
  question_text: string;
  options: string[];
  /** Faqat ovoz bergandan keyin (yoki muallifga) keladi. */
  correct_option?: string;
  explanation?: string;
  votes: Record<string, number>;
  /** Joriy foydalanuvchining tanlovi (server beradi; boshqalarning ovozlari yashirin). */
  user_choice?: string | null;
};

interface SosQuestionCardProps {
  postId: number;
  author: {
    name: string;
    username: string;
    avatar: string;
    role?: string;
  };
  subjectName: string;
  title: string;
  caption?: string;
  pollData: SosPollData;
  commentsCount: number;
  onOpenComments: () => void;
  currentUserId?: number;
}

export default function SosQuestionCard({
  postId,
  author,
  subjectName,
  title,
  caption,
  pollData: initialPollData,
  commentsCount,
  onOpenComments,
  currentUserId,
}: SosQuestionCardProps) {
  const [poll, setPoll] = useState<SosPollData>(initialPollData);
  const [userChoice, setUserChoice] = useState<string | null>(
    initialPollData.user_choice || null
  );
  const [voting, setVoting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(Boolean(userChoice));

  const hasVoted = Boolean(userChoice);
  const totalVotes = Object.values(poll.votes || {}).reduce((acc, v) => acc + v, 0);

  async function handleVote(optionLetter: string) {
    if (hasVoted || voting) return;
    setVoting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<{
        success: boolean;
        is_correct: boolean;
        correct_option: string;
        explanation: string;
        votes: Record<string, number>;
        percentages: Record<string, number>;
        user_choice: string;
      }>(`/api/learning/feed/${postId}/vote-poll/`, {
        method: 'POST',
        body: JSON.stringify({ selected_option: optionLetter }),
      });

      setUserChoice(res.user_choice || optionLetter);
      setPoll((prev) => ({
        ...prev,
        votes: res.votes,
        correct_option: res.correct_option,
        explanation: res.explanation || prev.explanation,
      }));
      setShowExplanation(true);

      if (res.is_correct) {
        toast.success("To'g'ri javob topildi! (+5 XP) 🎯");
      } else {
        toast.error("Xato variant! To'g'ri javob va tushuntirish ochildi.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ovoz berishda xatolik yuz berdi");
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[32px] bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[var(--ds-panel-shadow)]">
      {/* SOS lentasi */}
      <div className="relative flex items-center justify-between gap-3 overflow-hidden bg-[var(--ps-orange)] px-5 py-3 text-[#080808]">
        <span aria-hidden className="ps-stripes absolute inset-0 opacity-15" />
        <span className="relative inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wider">
          <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#080808] opacity-20" />
            <HelpCircle className="relative size-3.5" />
          </span>
          SOS · Yordam so&apos;rovi
        </span>
        <span className="relative truncate rounded-full bg-[#080808]/10 px-3 py-1 text-[11.5px] font-bold">{subjectName}</span>
      </div>

      <div className="p-5 sm:p-6">
        {/* Muallif */}
        <div className="flex items-center gap-3">
          <Avatar className="size-11 rounded-full ring-2 ring-[var(--ps-orange)] ring-offset-2 ring-offset-[var(--ps-paper)]">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-[var(--ps-neutral)] text-xs font-bold">
              {author.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-bold leading-tight">{author.name}</p>
            <p className="truncate text-[12px] font-semibold text-[var(--text-muted)]">@{author.username} · yordam so&apos;ramoqda</p>
          </div>
        </div>

        {/* Sarlavha va izoh */}
        <h3 className="mt-4 text-[18px] font-bold leading-snug sm:text-[20px]">{title}</h3>
        {caption && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">{caption}</p>}

        {/* Savol */}
        <div className="relative mt-4 overflow-hidden rounded-[24px] bg-[#080808] p-5 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
          <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-[var(--ps-purple)] opacity-50" />
          <span className="relative text-[11px] font-black uppercase tracking-wider text-[var(--ps-orange)]">Savol</span>
          <p className="relative mt-1.5 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed sm:text-[16px]">
            {poll.question_text || 'Savol matni yuklanmoqda...'}
          </p>
        </div>

        {/* Variantlar */}
        <div className="mt-4 space-y-2.5">
          {(poll.options || ['A', 'B', 'C', 'D']).map((optText, index) => {
            const letter = String.fromCharCode(65 + index);
            const voteCount = poll.votes?.[letter] || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userChoice === letter;
            const isCorrect = poll.correct_option === letter;
            const fill = isCorrect ? 'bg-[var(--ps-green)]' : isSelected ? 'bg-[var(--ps-coral)]' : 'bg-[var(--ps-lilac)]';

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleVote(letter)}
                disabled={hasVoted || voting}
                className={cn(
                  'group relative w-full overflow-hidden rounded-full p-2 pr-5 text-left transition-all',
                  hasVoted
                    ? 'cursor-default bg-[var(--ps-neutral)]'
                    : 'cursor-pointer bg-[var(--ps-neutral)] hover:-translate-y-0.5 hover:bg-[var(--ps-lilac)] active:scale-[0.99]'
                )}
              >
                {hasVoted && (
                  <span
                    aria-hidden
                    className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', fill, isCorrect || isSelected ? 'opacity-90' : 'opacity-35')}
                    style={{ width: `${Math.max(percentage, isCorrect || isSelected ? 12 : 0)}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-black transition-colors',
                        hasVoted
                          ? isCorrect
                            ? 'bg-white text-[var(--ps-green)]'
                            : isSelected
                              ? 'bg-white text-[var(--ps-coral)]'
                              : 'bg-[var(--ps-paper)] text-[var(--text-muted)]'
                          : 'bg-[var(--ps-paper)] text-[var(--text-primary)] group-hover:bg-[#080808] group-hover:text-[var(--ps-orange)]'
                      )}
                    >
                      {letter}
                    </span>
                    <span
                      className={cn(
                        'text-[14.5px] font-semibold',
                        hasVoted && (isCorrect || isSelected) && percentage >= 40 ? 'text-white' : 'text-[var(--text-primary)]',
                        hasVoted && !isCorrect && !isSelected && 'text-[var(--text-muted)]'
                      )}
                    >
                      {optText}
                    </span>
                  </span>
                  {hasVoted && (
                    <span className="flex shrink-0 items-center gap-1.5">
                      {isCorrect && <CheckCircle2 className="size-5 text-[var(--ps-green)]" />}
                      {!isCorrect && isSelected && <XCircle className="size-5 text-[var(--ps-coral)]" />}
                      <span className="rounded-full bg-[var(--ps-paper)] px-2.5 py-0.5 font-mono text-[12px] font-black">{percentage}%</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* AI tushuntirishi */}
        <AnimatePresence>
          {showExplanation && poll.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="relative mt-4 overflow-hidden rounded-[24px] bg-[var(--ps-purple)] p-5 text-white">
                <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/15" />
                <span aria-hidden className="ps-dots absolute bottom-0 right-0 h-12 w-24 opacity-25" />
                <div className="relative flex items-center gap-2 text-[11.5px] font-black uppercase tracking-wider text-white/85">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/20">
                    <Sparkles className="size-3.5" />
                  </span>
                  AI tushuntirishi · Oltin qoida
                </div>
                <div
                  className="relative mt-2.5 text-[14px] leading-relaxed [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: formatRichText(poll.explanation) }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pastki qism */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ps-neutral)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--text-secondary)]">
            <Users className="size-4 text-[var(--ps-purple)]" />
            {totalVotes} nafar javob berdi
          </span>
          <button
            type="button"
            onClick={onOpenComments}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#080808] px-4 py-2 text-[12.5px] font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5 dark:bg-[#FFFCF7] dark:text-[#080808]"
          >
            <MessageCircle className="size-4 text-[var(--ps-orange)]" />
            {commentsCount} ta izoh
          </button>
        </div>
      </div>
    </div>
  );
}
