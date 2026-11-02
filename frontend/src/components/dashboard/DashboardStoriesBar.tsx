'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Trophy, Sparkles, X, ChevronRight, CheckCircle2, Building2, Coins, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AutoShareModal from '@/components/feed/AutoShareModal';

export type DashboardStory = {
  id: string | number;
  name: string;
  avatar: string;
  tagline: string;
  badge: string;
  isVip?: boolean;
  storyTitle: string;
  storyBody: string;
  ctaText?: string;
  ctaLink?: string;
};

export default function DashboardStoriesBar() {
  const router = useRouter();
  const [activeStory, setActiveStory] = useState<DashboardStory | null>(null);
  const [progress, setProgress] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [stories, setStories] = useState<DashboardStory[]>([]);

  const loadStories = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ stories: any[] }>('/api/learning/stories/');
      if (res?.stories && res.stories.length > 0) {
        const mapped: DashboardStory[] = res.stories.map((s) => ({
          id: s.id,
          name: s.author_name,
          avatar: s.avatar,
          tagline: s.badge || "Story",
          badge: s.badge || "Yutuq",
          isVip: s.story_type === 'promo',
          storyTitle: s.title,
          storyBody: s.caption,
          ctaText: s.cta_text,
          ctaLink: s.cta_link,
        }));
        setStories(mapped);
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
  }, [loadStories]);

  // Story timer
  useEffect(() => {
    if (!activeStory) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStory(null);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStory]);

  function handleOpenStory(story: DashboardStory) {
    tgHaptic('select');
    setActiveStory(story);
    setProgress(0);
    setLeadSuccess(false);
  }

  async function handleStoryAction(story: DashboardStory) {
    const wa = (window as any).Telegram?.WebApp;

    if (story.isVip) {
      setSubmittingLead(true);
      tgHaptic('medium');
      try {
        const res = await apiFetch<{ success: boolean; message: string; coins_earned: number }>(
          '/api/v1/b2b/submit-lead/',
          {
            method: 'POST',
            body: JSON.stringify({
              campaign_id: 1,
              source: 'vip_story',
            }),
          }
        );
        setLeadSuccess(true);
        toast.success(res.message || "Arizangiz qabul qilindi! +50 🪙 berildi.");
        
        setTimeout(() => {
          setActiveStory(null);
          if (story.ctaLink) {
            if (story.ctaLink.startsWith('http')) {
              if (wa?.openLink) { wa.openLink(story.ctaLink); } else { window.open(story.ctaLink, '_blank'); }
            } else {
              router.push(story.ctaLink);
            }
          }
        }, 1200);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
      } finally {
        setSubmittingLead(false);
      }
      return;
    }

    tgHaptic('select');
    if (story.id === 3) {
      toast.success("Do'stingizni tabrikladingiz! (+10 XP) 🎉");
    } else if (story.id === 2) {
      toast.success("1v1 Duel Arenaga yo'naltirilmoqda! ⚔️");
    } else {
      toast.success("Tezkor Mashqqa o'tilmoqda! ⚡");
    }

    setActiveStory(null);
    if (story.ctaLink) {
      if (story.ctaLink.startsWith('http')) {
        if (wa?.openLink) { wa.openLink(story.ctaLink); } else { window.open(story.ctaLink, '_blank'); }
      } else {
        router.push(story.ctaLink);
      }
    }
  }

  return (
    <>
      <div className="w-full select-none mb-4 sm:mb-5">
        <div className="flex items-center gap-3 overflow-x-auto py-1 px-0.5 scrollbar-none no-scrollbar">
          {/* 1. + Yutuq Ulashish Tugmasi (Strava Auto-Post) */}
          <button
            onClick={() => {
              tgHaptic('select');
              setShareModalOpen(true);
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
          >
            <div className="relative p-0.5 rounded-full border-2 border-dashed border-primary/60 dark:border-primary/50 group-hover:border-primary transition-all active:scale-95">
              <div className="size-14 sm:size-15 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Plus className="size-6 stroke-[2.5]" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-foreground max-w-[68px] truncate text-center">
              + Ulashish
            </span>
          </button>

          {/* Stories List */}
          {stories.map((s) => (
            <button
              key={s.id}
              onClick={() => handleOpenStory(s)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div
                className={cn(
                  'relative p-[2.5px] rounded-full transition-transform active:scale-95 group-hover:scale-105',
                  s.isVip
                    ? 'bg-gradient-to-tr from-amber-400 via-emerald-500 to-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.45)] animate-pulse'
                    : 'bg-gradient-to-tr from-primary via-indigo-500 to-emerald-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                )}
              >
                <div className="p-0.5 bg-background rounded-full">
                  <Avatar className="size-14 sm:size-15 rounded-full border border-border">
                    <AvatarImage src={s.avatar} alt={s.name} className="object-cover" />
                    <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                      {s.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Sub-badge */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black leading-none border shadow-xs',
                    s.isVip
                      ? 'bg-amber-500 text-black border-amber-300'
                      : 'bg-zinc-900 text-white border-white/20'
                  )}
                >
                  {s.isVip ? '👑 HOMIY' : s.tagline}
                </div>
              </div>

              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground max-w-[68px] truncate text-center transition-colors">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Story Modal */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-[400px] h-[540px] bg-gradient-to-b from-zinc-900 via-[#0B0D14] to-black rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col justify-between p-5"
            >
              {/* Progress bar */}
              <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Story Header */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 rounded-full border border-white/20">
                    <AvatarImage src={activeStory.avatar} />
                    <AvatarFallback>{activeStory.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                      {activeStory.name}
                      {activeStory.isVip && (
                        <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 font-black rounded-full">
                          HOMIY
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-zinc-400">{activeStory.badge}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveStory(null)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Center Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center px-4 my-auto">
                <div className="size-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-lg shadow-amber-500/20">
                  {activeStory.isVip ? (
                    <Building2 className="size-10" />
                  ) : (
                    <Sparkles className="size-10" />
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">
                  {activeStory.storyTitle}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xs">
                  {activeStory.storyBody}
                </p>
              </div>

              {/* Bottom CTA Action */}
              <div className="pt-2">
                {!leadSuccess ? (
                  <Button
                    onClick={() => handleStoryAction(activeStory)}
                    disabled={submittingLead}
                    className={cn(
                      'w-full py-3.5 text-sm font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2',
                      activeStory.isVip
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black hover:brightness-110 shadow-amber-500/25'
                        : 'bg-primary text-white hover:bg-primary/90'
                    )}
                  >
                    <span>{submittingLead ? "Yuborilmoqda..." : activeStory.ctaText}</span>
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Arizangiz yetkazildi! +50 🪙 hisobingizga qo'shildi.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1-Click Auto Share Modal */}
      <AutoShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShared={() => {
          loadStories();
        }}
        title="Bugungi DTM Natijam! 🎯"
        subjectName="Tarix"
        correctCount={28}
        totalQuestions={30}
        score={93}
      />
    </>
  );
}
