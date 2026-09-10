'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquareHeart, CheckCircle2, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExamSurveyCardProps {
  attemptId: string | number;
  testTitle?: string;
}

const DIFFICULTIES = [
  { id: 'easy', label: 'Oson', emoji: '🟢', desc: 'Kutilgandan ancha oson' },
  { id: 'medium', label: "O'rtacha", emoji: '🟡', desc: 'Standart Milliy sertifikat darajasi' },
  { id: 'hard', label: 'Qiyin', emoji: '🔴', desc: 'Murakkab savollar ko\'p' },
  { id: 'very_hard', label: 'Juda qiyin', emoji: '🔥', desc: 'Haddan tashqari og\'ir' },
];

export default function ExamSurveyCard({ attemptId, testTitle }: ExamSurveyCardProps) {
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Tekshirish: o'quvchi avval ushbu test uchun fikr bildirganmi?
    apiFetch<{ submitted: boolean; difficulty?: string; platform_rating?: number; comment?: string }>(
      `/api/tests/attempts/${attemptId}/survey/`
    )
      .then((res) => {
        if (res.submitted) {
          setSubmitted(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [attemptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/survey/`, {
        method: 'POST',
        body: JSON.stringify({
          difficulty,
          platform_rating: rating,
          comment,
        }),
      });

      setSubmitted(true);
      toast.success("Fikringiz uchun tashakkur! 🎉");
    } catch {
      toast.error("Fikrni yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || dismissed) return null;

  if (submitted) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10 shadow-sm transition-all duration-300">
        <CardContent className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Fikringiz qabul qilindi! <Sparkles className="size-3.5 text-amber-500" />
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Imtihonni yanada mukammallashtirishimizga yordam berganingiz uchun rahmat!
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Yopish
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-[var(--border-strong)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-card-medium)] to-[var(--surface-hover)] shadow-lg transition-all duration-300">
      {/* Background Subtle Glow */}
      <div className="absolute -top-16 -right-16 size-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 size-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shrink-0 shadow-sm">
              <MessageSquareHeart className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Imtihon qanday o&apos;tdi? (Tezkor so&apos;rovnoma)
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Fikringiz biz uchun juda muhim — 10 soniyada o&apos;z bahoyingizni bering
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="size-7 text-muted-foreground hover:text-foreground rounded-lg -mr-1"
            title="O'tkazib yuborish"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Savollar qiyinlik darajasi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>1. Savollar qiyinlik darajasi qanday bo&apos;ldi?</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => {
                const isSelected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-sm ring-1 ring-amber-500'
                        : 'border-[var(--border-card)] bg-[var(--surface-hover)]/40 text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground'
                    }`}
                  >
                    <span className="text-base">{d.emoji}</span>
                    <span className="text-xs font-bold mt-1">{d.label}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Platforma va test qulayligi bahosi */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                2. Test tizimi va qulaylikka necha ball berasiz?
              </label>
              <span className="text-xs font-mono font-bold text-amber-500">
                {rating === 5 ? '🤩 A\'lo (5/5)' : rating === 4 ? '😊 Yaxshi (4/5)' : rating === 3 ? '😐 O\'rtacha (3/5)' : '😕 Yaxshilash kerak'}
              </span>
            </div>
            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`size-6 sm:size-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-muted-foreground/30 hover:text-muted-foreground/60'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 3. Izoh yoki taklif (ixtiyoriy) */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="survey-comment" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>3. Fikr yoki taklifingiz (ixtiyoriy):</span>
              <span className="text-[10px] text-muted-foreground">savollarda xato yoki takliflar</span>
            </label>
            <textarea
              id="survey-comment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Masalan: Test ajoyib bo'ldi, keyingi safar Ona tilidan ham bo'lsin..."
              className="w-full rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)]/40 p-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Yuborish tugmasi */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Keyinroq
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 shadow-md"
            >
              {submitting ? 'Yuborilmoqda...' : (
                <>
                  <Send className="size-3.5" /> Fikrni yuborish
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
