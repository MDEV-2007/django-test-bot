'use client';

/* Listening partining audio pleeri.

   Imtihon qoidasi: audio cheklangan marta eshittiriladi (odatda 2). Shuning uchun
   "orqaga qaytarish" yo'q — yozuvni qayta qo'yish qolgan urinishlardan birini sarflaydi.

   Hisob SERVERDA yuritiladi: har bir yangi tinglash `onRequestPlay` orqali so'raladi va
   faqat ruxsat kelgach ijro boshlanadi. Ilgari hisob faqat brauzerda edi va sahifani
   yangilash bilan cheklovni aylanib o'tish mumkin edi. */

import { useEffect, useRef, useState } from 'react';
import { Headphones, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PlayPermission = {
  allowed: boolean;
  left: number | null;
  used?: number;
  message?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

type Props = {
  src: string;
  playLimit: number;
  /** Serverda ro'yxatga olingan tinglashlar soni (sahifa ochilganda). */
  playsUsed: number;
  onRequestPlay: () => Promise<PlayPermission>;
};

export default function ExamAudio({ src, playLimit, playsUsed, onRequestPlay }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [used, setUsed] = useState(playsUsed);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const unlimited = playLimit === 0;
  const left = unlimited ? Infinity : Math.max(0, playLimit - used);
  const exhausted = !unlimited && left === 0;
  // Pauzadan davom ettirish yangi tinglash emas — u qolgan urinishni sarflamaydi.
  const paused = progress > 0 && !playing;

  useEffect(() => {
    setUsed(playsUsed);
    setProgress(0);
    setPlaying(false);
    setNotice(null);
  }, [src, playsUsed]);

  async function start(fromBeginning: boolean) {
    const audio = audioRef.current;
    if (!audio || asking) return;

    setAsking(true);
    setNotice(null);
    try {
      const permission = await onRequestPlay();
      if (!permission.allowed) {
        setNotice(permission.message ?? "Bu partni tinglash imkoni tugadi.");
        if (typeof permission.used === 'number') setUsed(permission.used);
        return;
      }
      if (typeof permission.used === 'number') setUsed(permission.used);
      else setUsed((count) => count + 1);

      if (fromBeginning) audio.currentTime = 0;
      void audio.play();
      setPlaying(true);
    } catch {
      setNotice("Tinglashni boshlab bo'lmadi — internetni tekshiring.");
    } finally {
      setAsking(false);
    }
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    if (paused) { void audio.play(); setPlaying(true); return; }
    void start(true);
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={toggle}
          disabled={asking || (exhausted && !playing && !paused)}
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label={playing ? 'Pauza' : 'Tinglash'}
        >
          {asking ? <Loader2 className="h-5 w-5 animate-spin" />
            : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" />
            <span>{formatTime(progress)} / {formatTime(duration)}</span>
            <span className="ml-auto">
              {unlimited
                ? 'Cheksiz tinglash (mashq rejimi)'
                : exhausted
                  ? 'Tinglash imkoni tugadi'
                  : `Yana ${left} marta tinglashingiz mumkin`}
            </span>
          </div>

          {/* Ataylab oddiy chiziq, sudrab o'tkazish yo'q: imtihonda audioni orqaga
              qaytarish mumkin emas. */}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full bg-primary transition-[width] duration-300',
                exhausted && 'bg-muted-foreground/50')}
              style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => start(true)}
          disabled={exhausted || asking}
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Boshidan qo'yish"
          title={exhausted ? 'Tinglash imkoni tugadi' : "Boshidan qo'yish (bitta urinish sanaladi)"}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {notice && <p className="mt-2 text-xs text-amber-400">{notice}</p>}
    </div>
  );
}
