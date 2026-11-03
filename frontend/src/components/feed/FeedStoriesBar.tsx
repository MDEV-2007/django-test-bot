'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Award, Sparkles, X, ChevronRight, ChevronLeft, ExternalLink, PhoneCall, Swords } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type StoryItem = {
  id: number;
  author_name: string;
  avatar: string;
  story_type: 'streak' | 'certificate' | 'promo';
  title: string;
  caption: string;
  media_url?: string;
  badge: string;
  cta_text?: string;
  cta_link?: string;
  views_count: number;
  created_at: string;
};

interface FeedStoriesBarProps {
  examTrack?: string;
  onOpenTargetModal?: (centerName: string, campaignId?: number) => void;
}

export default function FeedStoriesBar({ examTrack = 'DTM_SERTIFIKAT', onOpenTargetModal }: FeedStoriesBarProps) {
  const router = useRouter();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const loadStories = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ stories: StoryItem[] }>('/api/learning/stories/');
      if (res && res.stories) {
        setStories(res.stories);
      } else {
        setStories([]);
      }
    } catch (e) {
      setStories([]);
    }
  }, []);

  useEffect(() => {
    loadStories();

    const handleStoriesUpdated = () => {
      loadStories();
    };
    window.addEventListener('stories_updated', handleStoriesUpdated);
    return () => {
      window.removeEventListener('stories_updated', handleStoriesUpdated);
    };
  }, [examTrack, loadStories]);

  // Story progress timer
  useEffect(() => {
    if (activeStoryIndex === null) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Keyingi storyga o'tish
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2.5; // ~4 soniyada 100%
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories.length]);

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  function openStory(index: number) {
    tgHaptic('select');
    setActiveStoryIndex(index);
    setProgress(0);
  }

  function nextStory() {
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      setActiveStoryIndex(null);
    }
  }

  function prevStory() {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    }
  }

  function handleActionClick(story: StoryItem) {
    tgHaptic('medium');
    const wa = (window as any).Telegram?.WebApp;

    if (story.story_type === 'promo') {
      if (onOpenTargetModal) {
        setActiveStoryIndex(null);
        onOpenTargetModal(story.author_name, story.id);
        return;
      }
      if (story.cta_link?.startsWith('http')) {
        setActiveStoryIndex(null);
        if (wa?.openLink) { wa.openLink(story.cta_link); } else { window.open(story.cta_link, '_blank'); }
        return;
      }
    }

    if (story.story_type === 'certificate') {
      toast.success("Do'stingizni tabrikladingiz! (+10 XP) 🎉");
    }

    setActiveStoryIndex(null);
    if (story.cta_link) {
      if (story.cta_link.startsWith('http')) {
        if (wa?.openLink) { wa.openLink(story.cta_link); } else { window.open(story.cta_link, '_blank'); }
      } else {
        router.push(story.cta_link);
      }
    }
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <div className="w-full select-none">
      {/* Story Bubbles Horizontal Scroll */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar">
        {stories.map((s, idx) => {
          const isPromo = s.story_type === 'promo';
          const isCert = s.story_type === 'certificate';

          return (
            <button
              key={s.id}
              onClick={() => openStory(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div
                className={cn(
                  'relative p-[2.5px] rounded-full transition-transform active:scale-95 group-hover:scale-105',
                  isPromo
                    ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : isCert
                    ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-gradient-to-tr from-orange-500 via-red-500 to-amber-400 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                )}
              >
                <div className="p-0.5 bg-[#0F1117] rounded-full">
                  <Avatar className="size-14 sm:size-15 rounded-full border border-white/10">
                    <AvatarImage src={s.avatar} alt={s.author_name} className="object-cover" />
                    <AvatarFallback className="text-xs font-bold bg-zinc-800 text-white">
                      {s.author_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Badge icon */}
                <div className="absolute -bottom-1 -right-0.5 rounded-full bg-zinc-950 p-1 border border-white/15">
                  {isPromo ? (
                    <Sparkles className="size-3 text-amber-400" />
                  ) : isCert ? (
                    <Trophy className="size-3 text-emerald-400" />
                  ) : (
                    <Flame className="size-3 text-orange-500" />
                  )}
                </div>
              </div>

              <span className="text-[12px] font-medium text-zinc-300 max-w-[68px] truncate text-center">
                {s.author_name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story Full Screen Modal */}
      <AnimatePresence>
        {currentStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-[420px] h-[580px] bg-gradient-to-b from-zinc-900 via-[#0B0D14] to-black rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col justify-between p-5"
            >
              {/* Progress bars header */}
              <div className="flex gap-1.5 w-full">
                {stories.map((st, i) => (
                  <div key={st.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-100 rounded-full"
                      style={{
                        width:
                          i < (activeStoryIndex ?? 0)
                            ? '100%'
                            : i === activeStoryIndex
                            ? `${progress}%`
                            : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 rounded-full border border-white/20">
                    <AvatarImage src={currentStory.avatar} />
                    <AvatarFallback>{currentStory.author_name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {currentStory.author_name}
                    </h4>
                    <span className="text-[12px] text-zinc-400">{currentStory.created_at}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-white/10 text-white border-white/15 text-[12px]">
                    {currentStory.badge}
                  </Badge>
                  <button
                    onClick={() => setActiveStoryIndex(null)}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Story Content Card */}
              <div className="flex-1 flex flex-col justify-center items-center text-center px-4 my-auto relative">
                {/* Click areas for previous and next */}
                <div
                  onClick={prevStory}
                  className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10"
                />
                <div
                  onClick={nextStory}
                  className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10"
                />

                <div className="mb-4">
                  {currentStory.story_type === 'promo' ? (
                    <div className="size-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-2">
                      <Sparkles className="size-10" />
                    </div>
                  ) : currentStory.story_type === 'certificate' ? (
                    <div className="size-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 mb-2">
                      <Trophy className="size-10" />
                    </div>
                  ) : (
                    <div className="size-20 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-500 mb-2">
                      <Flame className="size-10" />
                    </div>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                  {currentStory.title}
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-sm">
                  {currentStory.caption}
                </p>
              </div>

              {/* Story Footer Action */}
              <div className="pt-2 z-20">
                <Button
                  onClick={() => handleActionClick(currentStory)}
                  className={cn(
                    'w-full py-3.5 text-sm font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2',
                    currentStory.story_type === 'promo'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold'
                      : currentStory.story_type === 'certificate'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                  )}
                >
                  {currentStory.cta_text || "Batafsil ko'rish"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
