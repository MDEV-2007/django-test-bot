'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { celebrate } from '@/lib/confetti';
import CertificateCard from './CertificateCard';

interface ShareToCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptId: string | number;
  testTitle: string;
  /** Natija kartasidagi bilan bir xil ball (70 ballik Rasch) */
  score: number;
  percentage?: number | null;
  grade?: string | null;
  studentName?: string;
  date?: string | null;
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
  percentage,
  grade,
  studentName,
  date,
  correctCount,
  totalQuestions,
  postType = 'test_result',
  onSuccess,
}: ShareToCommunityModalProps) {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const isCert = postType === 'certificate';

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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('stories_updated'));
        }
        toast.success(res.message || "Natijangiz Lenta va Story'ga muvaffaqiyatli joylandi! (+15 XP)");
        onOpenChange(false);
        if (onSuccess) onSuccess();
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
      <DialogContent
        showCloseButton={false}
        className="ps-shell max-h-[94svh] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)] sm:w-full sm:max-w-md sm:p-0 dark:bg-[var(--ps-paper)]"
      >
        {/* Sarlavha */}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-orange)] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#080808]">
              <Sparkles className="size-3" /> +15 XP
            </span>
            <DialogTitle className="ps-display mt-2.5 text-[24px] sm:text-[28px]">Hamjamiyatga ulashish</DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Natijangiz bilan boshqa abituriyentlarni ilhomlantiring.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Yopish"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-secondary)] transition-colors hover:bg-[#080808] hover:text-[#FFFCF7] dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-5 sm:px-6">
          {/* Lentada ko'rinadigan karta — natija sahifasidagi bilan bir xil */}
          <CertificateCard
            compact
            attemptId={attemptId}
            studentName={studentName || "O'quvchi"}
            testTitle={testTitle}
            score={score}
            correctCount={correctCount}
            totalQuestions={totalQuestions}
            percentage={percentage}
            grade={grade}
            date={date}
          />

          <label className="block rounded-[22px] bg-[var(--ps-neutral)] px-5 pb-3 pt-2.5 ring-2 ring-transparent transition focus-within:ring-[var(--ps-purple)]">
            <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Taassurotingiz · ixtiyoriy</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Qanday tayyorlandingiz? Boshqa abituriyentlarga maslahatingiz..."
              className="mt-1 min-h-[72px] w-full resize-none bg-transparent text-[14px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
              maxLength={1000}
            />
          </label>

          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} disabled={loading} className="ps-btn ps-btn-ghost">
              Bekor qilish
            </button>
            <button type="button" onClick={handleShare} disabled={loading} className="ps-btn ps-btn-ink">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Ulashilmoqda...
                </>
              ) : (
                <>
                  Lentaga chiqarish
                  <span className="ps-btn-arrow"><Send className="size-4" /></span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
