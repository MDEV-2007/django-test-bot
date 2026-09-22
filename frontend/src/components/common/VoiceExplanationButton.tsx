'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tgHaptic } from '@/lib/telegram';

interface VoiceExplanationButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'outline' | 'ghost' | 'secondary' | 'default';
}

// Strip HTML tags for clean text-to-speech reading
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
  text,
  label = "Ovozli tahlil",
  className,
  size = 'sm',
  variant = 'outline',
}: VoiceExplanationButtonProps) {
  const [status, setStatus] = useState<'idle' | 'playing'>('idle');
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
    }

    return () => {
      // Component unmount bo'lganda ovozni to'xtatish
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggle = () => {
    if (!supported || !text.trim()) return;

    tgHaptic('select');

    if (status === 'playing') {
      window.speechSynthesis.cancel();
      setStatus('idle');
      return;
    }

    // Oldingi barcha ovozlarni to'xtatish
    window.speechSynthesis.cancel();

    const plainText = cleanHtml(text);
    if (!plainText) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utteranceRef.current = utterance;

    // Mavjud ovozlardan mos keladiganini tanlash
    const voices = window.speechSynthesis.getVoices();
    // O'zbek, turkiy yoki tabiiy ovozlar ustuvor
    const voice =
      voices.find((v) => v.lang.startsWith('uz')) ||
      voices.find((v) => v.lang.startsWith('tr')) ||
      voices.find((v) => v.lang.startsWith('ru')) ||
      voices.find((v) => v.default) ||
      voices[0];

    if (voice) {
      utterance.voice = voice;
    }

    // Nutq tezligi va ohangi — aniq va tushunarli eshitilishi uchun
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

  if (!supported || !text.trim()) return null;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleToggle}
      className={cn(
        'group relative inline-flex items-center gap-1.5 transition-all',
        status === 'playing'
          ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-500 shadow-sm shadow-indigo-500/20'
          : 'text-[var(--text-secondary)] hover:text-foreground',
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
