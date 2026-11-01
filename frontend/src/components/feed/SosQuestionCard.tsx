'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, MessageCircle, Share2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type SosPollData = {
  question_text: string;
  options: string[];
  correct_option: string;
  explanation: string;
  votes: Record<string, number>;
  voted_users?: Record<string, string>;
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
    (currentUserId && initialPollData.voted_users?.[String(currentUserId)]) || null
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
    <div className="w-full rounded-3xl bg-zinc-900/65 border border-white/[0.08] backdrop-blur-xl p-5 shadow-xl transition-all hover:border-white/[0.14]">
      {/* Post Author Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 rounded-full border border-white/10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white">
              {author.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white leading-none">{author.name}</span>
              <span className="text-xs text-zinc-400">@{author.username}</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">{subjectName} • SOS Savol</span>
          </div>
        </div>

        <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
          <HelpCircle className="size-3.5" />
          Yordam so'rovi
        </Badge>
      </div>

      {/* Title & Caption */}
      <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
        {title}
      </h3>
      {caption && (
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          {caption}
        </p>
      )}

      {/* The Question Text in stylized box */}
      <div className="rounded-2xl bg-black/40 border border-white/[0.06] p-4 mb-4">
        <p className="text-sm sm:text-base font-semibold text-zinc-100 whitespace-pre-wrap leading-relaxed">
          {poll.question_text || "Savol matni yuklanmoqda..."}
        </p>
      </div>

      {/* Interactive Poll Options (A/B/C/D) */}
      <div className="space-y-2.5 mb-4">
        {(poll.options || ['A', 'B', 'C', 'D']).map((optText, index) => {
          const letter = String.fromCharCode(65 + index); // 'A', 'B', 'C', 'D'
          const voteCount = poll.votes?.[letter] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userChoice === letter;
          const isCorrect = poll.correct_option === letter;

          return (
            <button
              key={letter}
              onClick={() => handleVote(letter)}
              disabled={hasVoted || voting}
              className={cn(
                'group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-all',
                hasVoted
                  ? isCorrect
                    ? 'border-emerald-500/50 bg-emerald-950/25'
                    : isSelected
                    ? 'border-red-500/50 bg-red-950/25'
                    : 'border-white/[0.06] bg-white/[0.02]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.99]'
              )}
            >
              {/* Progress bar background when voted */}
              {hasVoted && (
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-700 opacity-25 rounded-2xl',
                    isCorrect ? 'bg-emerald-500' : isSelected ? 'bg-red-500' : 'bg-zinc-600'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'size-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-colors',
                      hasVoted
                        ? isCorrect
                          ? 'bg-emerald-500 text-black'
                          : isSelected
                          ? 'bg-red-500 text-white'
                          : 'bg-zinc-800 text-zinc-300'
                        : 'bg-zinc-800 text-zinc-300 group-hover:bg-amber-500 group-hover:text-black'
                    )}
                  >
                    {letter}
                  </div>
                  <span className="text-sm font-medium text-zinc-200">
                    {optText}
                  </span>
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isCorrect && <CheckCircle2 className="size-4 text-emerald-400" />}
                    {!isCorrect && isSelected && <XCircle className="size-4 text-red-400" />}
                    <span className="text-xs font-bold text-zinc-300">
                      {percentage}%
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Post-Vote AI Explanation Card */}
      <AnimatePresence>
        {showExplanation && poll.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-900 border border-indigo-500/20 p-4 mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              <Sparkles className="size-4" />
              IlmIldizi AI Tushuntirishi & Oltin Qoida
            </div>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {poll.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Footer: Total votes & comments */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs text-zinc-400">
        <span className="font-medium">
          {totalVotes} nafar o'quvchi javob berdi
        </span>

        <button
          onClick={onOpenComments}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
        >
          <MessageCircle className="size-4" />
          <span>{commentsCount} ta izoh</span>
        </button>
      </div>
    </div>
  );
}
