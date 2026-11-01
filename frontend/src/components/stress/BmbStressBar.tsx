'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Flame, Volume2, VolumeX, Mic, MicOff, AlertTriangle,
  Megaphone, Bell, ShieldAlert, Sparkles, FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="w-full space-y-2 mb-4">
      {/* Top Banner Bar */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border border-rose-500/30 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-600/30 border border-rose-500/50">
            <Flame className="size-4.5 text-rose-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-500 animate-ping" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black tracking-wide text-rose-300 uppercase">
                Real BMB Imtihon Zali
              </span>
              <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-200 py-0 px-1.5 bg-rose-500/10 font-bold">
                STRESS MODE
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 truncate hidden sm:block">
              500 kishilik zal shovqini, parta shitirlashi va nazoratchi ovozi faol
            </p>
          </div>
        </div>

        {/* Audio controls & Mobile Titul drawer button */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenBubbleDrawer && (
            <Button
              size="sm"
              onClick={onOpenBubbleDrawer}
              className="lg:hidden text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3"
            >
              <FileSpreadsheet className="size-3.5 mr-1.5" />
              Titul
              {uncopiedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px]">
                  {uncopiedCount}
                </span>
              )}
            </Button>
          )}

          <div className="flex items-center gap-1 bg-black/40 rounded-xl px-2 py-1 border border-white/10">
            <button
              onClick={handleToggleMute}
              className="size-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
              aria-label="Ovoz"
            >
              {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4 text-emerald-400" />}
            </button>

            <div className="w-14 sm:w-20 hidden xs:block">
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

      {/* Live Loudspeaker Supervisor Announcement Notification */}
      {activeAnnouncement && (
        <div className="animate-in fade-in slide-in-from-top duration-300 rounded-xl border border-rose-500/50 bg-rose-950/90 p-3 text-white shadow-xl flex items-start gap-3">
          <div className="size-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0 animate-bounce">
            <Megaphone className="size-4 text-white" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
              {announcementTitle || "Nazoratchi e'loni"}
            </p>
            <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
              &ldquo;{activeAnnouncement}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
