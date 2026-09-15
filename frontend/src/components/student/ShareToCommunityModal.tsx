'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Trophy, Award, CheckCircle2, ArrowRight, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';

interface ShareToCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptId: string | number;
  testTitle: string;
  score: number;
  grade?: string;
  correctCount?: number;
  totalQuestions?: number;
  postType?: 'test_result' | 'certificate';
  onSuccess?: () => void;
}

export default function ShareToCommunityModal({
  open,
  onOpenChange,
  attemptId,
  testTitle,
  score,
  grade,
  correctCount,
  totalQuestions,
  postType = 'test_result',
  onSuccess,
}: ShareToCommunityModalProps) {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const isCert = postType === 'certificate' || score >= 60;

  async function handleShare() {
    setLoading(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        post: unknown;
        xp_earned: number;
      }>('/api/learning/feed/create/', {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: Number(attemptId),
          caption: caption.trim(),
          post_type: isCert ? 'certificate' : 'test_result',
        }),
      });

      if (res.success) {
        soundFX.fanfare();
        celebrate();
        toast.success(res.message || "Natijangiz Hamjamiyat lentasiga joylandi!");
        onOpenChange(false);
        if (onSuccess) onSuccess();
        // Hamjamiyat sahifasiga o'tish taklifi
        router.push('/feed');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ulashishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/25 mb-1">
            <Sparkles className="size-6" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground">
            Hamjamiyatga ulashish
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            O&apos;z natijangiz bilan boshqa abituriyentlarni ilhomlantiring va <b>+15 XP</b> oling!
          </DialogDescription>
        </DialogHeader>

        {/* Natija kartochkasi preview */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-[var(--surface-hover)] to-teal-500/10 p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
              {isCert ? '🏆 Milliy Sertifikat' : '📝 Test Natijasi'}
            </Badge>
            <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="size-3" /> +15 XP Bonus
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-foreground text-sm leading-snug line-clamp-1">
              {testTitle}
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">
                {score.toFixed(0)}%
              </span>
              {grade && (
                <span className="text-xs font-bold text-foreground/80 px-2 py-0.5 rounded-md bg-white/10 border border-white/10">
                  {grade}
                </span>
              )}
            </div>
            {totalQuestions && (
              <p className="text-[11px] text-muted-foreground">
                To&apos;g&apos;ri javoblar: <b>{correctCount}</b> / {totalQuestions} ta
              </p>
            )}
          </div>
        </div>

        {/* Fikr / Izoh matni */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Taassurotingiz yoki fikringiz:</span>
            <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
          </label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Qanday tayyorlandingiz? Boshqa abituriyentlarga maslahatingiz yoki taassurotingiz..."
            className="rounded-xl border-[var(--border-strong)] bg-[var(--surface-hover)]/40 text-xs sm:text-sm min-h-[85px] resize-none"
            maxLength={1000}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl text-xs"
          >
            Bekor qilish
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleShare}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 px-4"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Ulashilmoqda...
              </>
            ) : (
              <>
                <Send className="size-3.5 mr-1.5" />
                Hamjamiyatga chiqarish 🚀
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
