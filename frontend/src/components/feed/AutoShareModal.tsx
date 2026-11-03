'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Share2, Sparkles, X, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface AutoShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subjectName: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  onShared?: () => void;
}

export default function AutoShareModal({
  open,
  onClose,
  title,
  subjectName,
  score,
  correctCount,
  totalQuestions,
  onShared,
}: AutoShareModalProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        '/api/learning/feed/auto-post/',
        {
          method: 'POST',
          body: JSON.stringify({
            post_type: 'achievement',
            title: title || `${subjectName} bo'yicha ajoyib natija! 🔥`,
            subject_name: subjectName,
            score: score,
            correct_count: correctCount,
            total_questions: totalQuestions,
            caption: `Bugun ${subjectName} bo'yicha ${correctCount}/${totalQuestions} ta to'g'ri bajardim. Kim 1v1 Arena dueliga tayyor? ⚔️`,
          }),
        }
      );

      toast.success(res.message);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stories_updated'));
      }
      if (onShared) onShared();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ulashishda xatolik yuz berdi");
    } finally {
      setSharing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-white/15 p-6 shadow-2xl overflow-hidden text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Glow icon */}
        <div className="size-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 mx-auto mb-4 shadow-xl shadow-orange-500/25">
          <div className="size-full bg-zinc-950 rounded-2xl flex items-center justify-center text-orange-500">
            <Flame className="size-9" />
          </div>
        </div>

        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-bold mb-2">
          🔥 Ajoyib Yutuq!
        </Badge>

        <h3 className="text-xl font-bold text-white mb-2 leading-tight">
          {title}
        </h3>

        <p className="text-xs text-zinc-300 leading-relaxed mb-6">
          Ushbu natijangizni 1-bosishda platforma Lentasi va Story'siga ulashing hamda <b>+15 XP</b> bonus oling! Do'stlaringiz sizni ko'rib 1v1 duelga chorlaydi.
        </p>

        {/* Preview mini card */}
        <div className="rounded-2xl bg-black/40 border border-white/[0.08] p-3.5 mb-6 text-left flex items-center justify-between">
          <div>
            <span className="text-[12px] text-zinc-500 block uppercase font-bold">{subjectName}</span>
            <span className="text-sm font-bold text-white">
              {correctCount} / {totalQuestions} to'g'ri ({score ?? Math.round(((correctCount ?? 0) / (totalQuestions || 1)) * 100)}%)
            </span>
          </div>
          <Swords className="size-5 text-amber-400" />
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-12 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-2xl text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Share2 className="size-4" />
            <span>{sharing ? "Ulashilmoqda..." : "🔥 Lenta va Story'ga ulashish (+15 XP)"}</span>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-zinc-400 hover:text-white text-xs"
          >
            Keyinroq
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
