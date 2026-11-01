'use client';

import React from 'react';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type ExamTrackType = 'DTM_SERTIFIKAT' | 'IELTS_SAT' | 'TOPIK_KOREAN' | 'ARABIC_CEFR';

interface ExamTrackSwitcherProps {
  currentTrack: ExamTrackType;
  onChange: (track: ExamTrackType) => void;
  className?: string;
}

const TRACKS: { id: ExamTrackType; label: string; icon: string; badge?: string }[] = [
  { id: 'DTM_SERTIFIKAT', label: 'Milliy Sertifikat / DTM', icon: '🏛️' },
  { id: 'IELTS_SAT', label: 'IELTS & SAT', icon: '🇬🇧' },
  { id: 'TOPIK_KOREAN', label: 'TOPIK (Koreys)', icon: '🇰🇷' },
  { id: 'ARABIC_CEFR', label: 'Arab tili (CEFR)', icon: '🇸🇦' },
];

export default function ExamTrackSwitcher({
  currentTrack,
  onChange,
  className,
}: ExamTrackSwitcherProps) {
  async function handleSelect(trackId: ExamTrackType) {
    if (trackId === currentTrack) return;
    tgHaptic('select');
    onChange(trackId);

    try {
      await apiFetch('/api/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ exam_track: trackId }),
      });
      toast.success(`Yo'nalish "${TRACKS.find((t) => t.id === trackId)?.label}" ga o'zgartirildi`);
    } catch {
      // Background sync, no disruption if offline
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] backdrop-blur-xl scrollbar-none no-scrollbar',
        className
      )}
    >
      {TRACKS.map((track) => {
        const isActive = currentTrack === track.id;
        return (
          <button
            key={track.id}
            onClick={() => handleSelect(track.id)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95',
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            )}
          >
            <span>{track.icon}</span>
            <span>{track.label}</span>
          </button>
        );
      })}
    </div>
  );
}
