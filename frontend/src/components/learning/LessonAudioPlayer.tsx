'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LessonAudioPlayerProps {
  audioUrl: string;
  title: string;
  durationDisplay?: string;
  className?: string;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0, 0.75];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function LessonAudioPlayer({
  audioUrl,
  title,
  durationDisplay,
  className,
}: LessonAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const speed = SPEED_OPTIONS[speedIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = parseFloat(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    const newSpeed = SPEED_OPTIONS[nextIdx];
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-4 transition-all',
        isPlaying && 'border-[var(--accent)]/40 shadow-sm shadow-[var(--accent)]/10',
        className,
      )}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Title and duration */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-[var(--accent-text)]">
            <Volume2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p>
            <p className="text-xs text-muted-foreground">
              {durationDisplay || (duration > 0 ? formatTime(duration) : 'Audio dars')}
            </p>
          </div>
        </div>

        {/* Speed toggle button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={cycleSpeed}
          title="Audio tezligini o'zgartirish"
          className="h-8 shrink-0 rounded-lg border-[var(--border-strong)] px-2.5 font-mono text-xs font-bold text-[var(--accent-text)] hover:bg-[var(--accent-soft)]"
        >
          {speed}x
        </Button>
      </div>

      {/* Progress scrubber */}
      <div className="space-y-1.5 pt-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio vaqtini surish"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-hover)] accent-[var(--accent)] focus:outline-none"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${progressPercent}%, rgba(255,255,255,0.12) ${progressPercent}%, rgba(255,255,255,0.12) 100%)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => seekRelative(-10)}
            title="10 soniya orqaga"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => seekRelative(10)}
            title="10 soniya oldinga"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>

        {/* Central Play/Pause button */}
        <Button
          type="button"
          size="icon"
          onClick={togglePlay}
          title={isPlaying ? "To'xtatish" : 'Ijro etish'}
          className="size-10 rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-md transition-transform hover:scale-105 active:scale-95 hover:bg-[var(--accent-hover)]"
        >
          {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
        </Button>

        {/* Mute button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={toggleMute}
          title={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
