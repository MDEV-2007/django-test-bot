'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tgHaptic } from '@/lib/telegram';
import { toast } from 'sonner';

interface VoiceExplanationButtonProps {
  text?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'outline' | 'ghost' | 'secondary' | 'default';
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function VoiceExplanationButton({
  text = '',
  label = "Ovozli tahlil",
  className,
  size = 'sm',
  variant = 'outline',
}: VoiceExplanationButtonProps) {
  const [status, setStatus] = useState<'idle' | 'playing'>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggle = () => {
    tgHaptic('select');

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info("Qurilmangizda nutq sintezi (TTS) qo'llab-quvvatlanmadi.");
      return;
    }

    if (status === 'playing') {
      window.speechSynthesis.cancel();
      setStatus('idle');
      return;
    }

    window.speechSynthesis.cancel();

    const plainText = cleanHtml(text) || "Savol yuzasidan tushuntirish: To'g'ri javobni tanlashda savol shartiga va qoidalariga diqqat qiling.";

    const utterance = new SpeechSynthesisUtterance(plainText);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith('uz')) ||
      voices.find((v) => v.lang.startsWith('tr')) ||
      voices.find((v) => v.lang.startsWith('ru')) ||
      voices.find((v) => v.default) ||
      voices[0];

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setStatus('playing');
    };

    utterance.onend = () => {
      setStatus('idle');
    };

    utterance.onerror = () => {
      setStatus('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleToggle}
      className={cn(
        'group relative inline-flex items-center gap-1.5 transition-all font-semibold rounded-xl',
        status === 'playing'
          ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-500 shadow-md shadow-indigo-500/20'
          : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20',
        className,
      )}
      title={status === 'playing' ? "Ovozni to'xtatish" : "Tushuntirishni ovozli eshitish"}
    >
      {status === 'playing' ? (
        <>
          <Square className="size-3 fill-current text-indigo-500 animate-pulse" />
          <span className="text-[11px] font-bold text-indigo-500">To&apos;xtatish</span>
          <span className="flex items-center gap-0.5 ml-1">
            <span className="h-2.5 w-0.5 rounded-full bg-indigo-500 animate-[pulse_0.6s_ease-in-out_infinite]" />
            <span className="h-4 w-0.5 rounded-full bg-indigo-500 animate-[pulse_0.4s_ease-in-out_infinite]" />
            <span className="h-2 w-0.5 rounded-full bg-indigo-500 animate-[pulse_0.8s_ease-in-out_infinite]" />
          </span>
        </>
      ) : (
        <>
          <Volume2 className="size-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-medium">{label}</span>
        </>
      )}
    </Button>
  );
}
