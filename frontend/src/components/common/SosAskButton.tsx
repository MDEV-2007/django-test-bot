'use client';

import React from 'react';
import { LifeBuoy, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export type SosSource = 'test' | 'blitz' | 'stress' | 'sprint';

interface SosAskButtonProps {
  questionId: number | string | null | undefined;
  source: SosSource;
  className?: string;
}

/**
 * Test / blitz / stress / sprint yechayotganda qiyin savolni hamjamiyatga SOS so'rovnoma
 * qilib chiqarish. Faqat savol ID yuboriladi — matn, variantlar va to'g'ri javobni server
 * o'zi oladi (test paytida klientda javob kaliti yo'q).
 */
export default function SosAskButton({ questionId, source, className }: SosAskButtonProps) {
  const [sending, setSending] = React.useState(false);
  const [sentFor, setSentFor] = React.useState<Set<string>>(() => new Set());

  const key = questionId == null ? '' : String(questionId);
  const sent = key !== '' && sentFor.has(key);
  const numericId = Number(questionId);
  if (!key || !Number.isFinite(numericId)) return null;

  const send = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      const res = await apiFetch<{ message?: string }>('/api/learning/feed/sos/', {
        method: 'POST',
        body: JSON.stringify({ question_id: numericId, source }),
      });
      setSentFor((prev) => new Set(prev).add(key));
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('stories_updated'));
      toast.success(res?.message || "Savol hamjamiyatga SOS bo'lib chiqdi!");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "SOS yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={sending || sent}
      title="Savolni hamjamiyatga chiqarib, yordam so'rash"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all',
        sent
          ? 'cursor-default bg-[var(--ps-green)] text-white'
          : 'bg-[var(--ps-coral)] text-white hover:-translate-y-0.5 active:scale-95 disabled:opacity-60',
        className,
      )}
    >
      {sending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : sent ? (
        <Check className="size-3.5" />
      ) : (
        <LifeBuoy className="size-3.5" />
      )}
      {sent ? 'SOS yuborildi' : 'SOS'}
    </button>
  );
}
