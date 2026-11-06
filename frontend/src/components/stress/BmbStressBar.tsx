'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Flame, Volume2, VolumeX, Mic, MicOff, AlertTriangle,
  Megaphone, Bell, ShieldAlert, Sparkles, FileSpreadsheet,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { stressAudio } from '@/lib/stressAudio';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SupervisorMsg = {
  time_sec: number;
  title: string;
  text: string;
};

type BmbStressBarProps = {
  secondsLeft: number | null;
  onOpenBubbleDrawer?: () => void;
  uncopiedCount?: number;
  supervisorMessages?: SupervisorMsg[];
};

export default function BmbStressBar({
  secondsLeft,
  onOpenBubbleDrawer,
  uncopiedCount = 0,
  supervisorMessages = [],
}: BmbStressBarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeAnnouncement, setActiveAnnouncement] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState<string | null>(null);
  const announcedSet = useRef<Set<number>>(new Set());

  // Auto start audio engine on mount
  useEffect(() => {
    stressAudio.start(volume);

    // Initial greeting after 1.5 seconds
    const timer = setTimeout(() => {
      triggerAnnouncement(
        "Diqqat, barcha abituriyentlar!",
        "Imtihon boshlandi. Begona buyumlar va telefonlar taqiqlanadi. Javoblarni Titul varaqasiga o'z vaqtida ko'chirishni unutmang!"
      );
    }, 1500);

    return () => {
      clearTimeout(timer);
      stressAudio.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Monitor secondsLeft for supervisor triggers
  useEffect(() => {
    if (secondsLeft === null || secondsLeft === undefined) return;

    // Check pre-configured announcements
    supervisorMessages.forEach((msg) => {
      if (msg.time_sec > 0 && Math.abs(secondsLeft - msg.time_sec) <= 2 && !announcedSet.current.has(msg.time_sec)) {
        announcedSet.current.add(msg.time_sec);
        triggerAnnouncement(msg.title, msg.text);
      }
    });

    // Hardcoded safety triggers: 10 min (600s), 5 min (300s), 1 min (60s)
    if (secondsLeft === 600 && !announcedSet.current.has(600)) {
      announcedSet.current.add(600);
      triggerAnnouncement(
        "🚨 OXIRGI 10 DAQIQA!",
        "Diqqat! Imtihon tugashiga 10 daqiqa qoldi! Titul varaqasiga ko'chirilmagan javoblar KUYADI va baholanmaydi!"
      );
    } else if (secondsLeft === 300 && !announcedSet.current.has(300)) {
      announcedSet.current.add(300);
      triggerAnnouncement(
        "🚨 OXIRGI 5 DAQIQA!",
        "Oxirgi 5 daqiqa! Hech kim joyidan qo'zg'almasin, barcha e'tiborni Titul varaqasiga qarating!"
      );
    } else if (secondsLeft === 60 && !announcedSet.current.has(60)) {
      announcedSet.current.add(60);
      triggerAnnouncement(
        "⏰ SO'NGGI 1 DAQIQA!",
        "1 daqiqa qoldi! Ruchkalarni qo'yishga tayyorlaning!"
      );
    }
  }, [secondsLeft, supervisorMessages]);

  function triggerAnnouncement(title: string, text: string) {
    setAnnouncementTitle(title);
    setActiveAnnouncement(text);
    stressAudio.speakAnnouncement(text, () => {
      setTimeout(() => {
        setActiveAnnouncement(null);
        setAnnouncementTitle(null);
      }, 4000);
    });
  }

  function handleToggleMute() {
    const muted = stressAudio.toggleMute();
    setIsMuted(muted);
    if (muted) {
      toast.info("Audio-bosim ovozi o'chirildi");
    } else {
      toast.success("Audio-bosim yoqildi");
    }
  }

  function handleVolumeChange(val: number[]) {
    const v = val[0] / 100;
    setVolume(v);
    stressAudio.setVolume(v);
  }

  return (
    <div className="w-full space-y-2">
      {/* Stress zali paneli — marjon pill (pastel tema bilan bir xil) */}
      <div className="relative flex items-center justify-between gap-2 overflow-hidden rounded-[28px] bg-[#F0523D] p-2.5 pl-3 text-white shadow-[0_18px_36px_-22px_rgba(240,82,61,0.9)] sm:gap-3 sm:p-3 sm:pl-4">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-white/15" />
        <div className="relative flex min-w-0 items-center gap-2.5">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[#080808] text-[#FFB82E]">
            <Flame className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-[#FFB82E]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-bold sm:text-sm">Real BMB imtihon zali</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Stress</span>
            </div>
            <p className="hidden truncate text-[12px] text-white/75 md:block">
              500 kishilik zal shovqini, parta shitirlashi va nazoratchi ovozi faol
            </p>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
          {onOpenBubbleDrawer && (
            <button
              type="button"
              onClick={onOpenBubbleDrawer}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#FFFCF7] px-3.5 text-xs font-bold text-[#080808] lg:hidden"
            >
              <FileSpreadsheet className="size-3.5" />
              Titul
              {uncopiedCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#F0523D] text-[11px] font-bold text-white">
                  {uncopiedCount}
                </span>
              )}
            </button>
          )}

          <div className="flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-1.5 sm:pr-3">
            <button
              onClick={handleToggleMute}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
              aria-label="Ovoz"
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <div className="hidden w-16 sm:block sm:w-20">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={5}
                onValueChange={handleVolumeChange}
                disabled={isMuted}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nazoratchi e'loni */}
      {activeAnnouncement && (
        <div className="animate-in fade-in slide-in-from-top flex items-start gap-3 rounded-[24px] bg-[#080808] p-3.5 text-[#FFFCF7] shadow-xl duration-300">
          <span className="flex size-9 shrink-0 animate-bounce items-center justify-center rounded-full bg-[#F0523D]">
            <Megaphone className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#FFB82E]">
              {announcementTitle || "Nazoratchi e'loni"}
            </p>
            <p className="text-xs font-medium leading-relaxed sm:text-sm">&ldquo;{activeAnnouncement}&rdquo;</p>
          </div>
        </div>
      )}
    </div>
  );
}
