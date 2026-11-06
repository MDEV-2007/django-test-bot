'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, Star, Trophy } from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=leaderboard';

interface LeaderboardItem {
  rank: number;
  name: string;
  gradeBadge?: string;
  regionAndSubject: string;
  score: string;
  xp: string;
  badgeType: 'gold' | 'silver' | 'bronze' | 'number' | string;
}

interface ReviewItem {
  rating: number;
  tag: string;
  quote: string;
  author: string;
  role: string;
  avatarLetter: string;
}

// Zaxira (to'qima ism va XP'li) reyting va sharhlar olib tashlandi: ma'lumot bo'lmasa
// bo'sh holat ko'rsatiladi — soxta "Azizbek Yo'ldoshev 4 920 XP" emas.
export default function WeeklyLeaderboardSection() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [lbRes, revRes] = await Promise.all([
        fetch('/api/dashboard/landing-leaderboard/').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/dashboard/landing-reviews/').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (lbRes?.leaderboard?.length) {
        setLeaderboard(
          lbRes.leaderboard.map((r: any) => ({
            rank: r.rank,
            name: r.name,
            gradeBadge: r.grade_badge,
            regionAndSubject: r.region_and_subject,
            score: r.score,
            xp: r.xp,
            badgeType: r.badge_type,
          }))
        );
      }

      if (revRes?.reviews?.length) {
        setReviews(
          revRes.reviews.map((rv: any) => ({
            rating: rv.rating || 5,
            tag: rv.tag || "A'lo baho",
            quote: rv.quote,
            author: rv.author,
            role: rv.role,
            avatarLetter: rv.avatar_letter || rv.author?.[0] || 'U',
          }))
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFB82E]/14 px-3.5 py-1 text-xs font-bold tracking-wider text-[#9A5A00] uppercase">
            <Trophy className="size-3.5 text-[#FFB82E]" />
            <span>Game Center Peshqadamlari</span>
          </div>
          <h2 className="mt-2.5 text-3xl font-bold tracking-[-0.03em] text-[#080808] sm:text-4xl lg:text-5xl">
            Haftalik Yetakchilar Reytingi
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#6B6577] font-normal">
            Har hafta eng ko&apos;p test yechgan va yuqori foiz qayd etgan top o&apos;quvchilar
          </p>
        </div>

        {/* Refresh Pill */}
        <button
          onClick={fetchData}
          title="Reytingni yangilash"
          className="ios-spring inline-flex items-center gap-2 text-xs font-semibold text-[#7659C7] bg-white border border-black/[0.08] rounded-full px-4 py-2 self-start md:self-end shadow-2xs cursor-pointer"
        >
          <RotateCw className={`size-3.5 text-[#7659C7] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Jonli yangilanadi</span>
        </button>
      </div>

      {/* Main Grid: Left = iOS Inset Grouped Leaderboard, Right = App Store Reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-7 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-12 pb-3 border-b border-black/[0.06] text-[12px] font-bold tracking-wider uppercase text-[#8A8494]">
            <span className="col-span-7">O&apos;QUVCHI &amp; VILOYAT</span>
            <span className="col-span-3 text-right">NATIJA</span>
            <span className="col-span-2 text-right">XP BALL</span>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {loaded && leaderboard.length === 0 && (
              <p className="py-6 text-center text-xs text-[#6B6577]">
                Bu hafta hali natija yo&apos;q — birinchi bo&apos;lib test yeching!
              </p>
            )}
            {!loaded && leaderboard.length === 0 && (
              <p className="py-6 text-center text-xs text-[#8A8494]" aria-busy="true">Yuklanmoqda...</p>
            )}
            {leaderboard.map((row) => (
              <div
                key={row.rank}
                className="grid grid-cols-12 items-center py-3.5 hover:bg-[#F7F4EF]/70 rounded-xl px-2.5 -mx-2.5 transition-colors group"
              >
                <div className="col-span-7 flex items-center gap-3">
                  <div className="shrink-0 size-9 rounded-full flex items-center justify-center font-bold text-xs">
                    {row.badgeType === 'gold' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#FFB82E]/20 text-base">
                        🥇
                      </span>
                    )}
                    {row.badgeType === 'silver' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#8A8494]/15 text-base">
                        🥈
                      </span>
                    )}
                    {row.badgeType === 'bronze' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#FFB82E]/18 text-base">
                        🥉
                      </span>
                    )}
                    {row.badgeType === 'number' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#F7F4EF] text-[#3D3846] font-mono font-bold">
                        {row.rank}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#080808] text-xs sm:text-sm truncate group-hover:text-[#7659C7] transition-colors">
                        {row.name}
                      </span>
                      {row.gradeBadge && (
                        <span className="inline-flex items-center rounded-full bg-[#4C806B]/14 px-2 py-0.5 text-[12px] font-bold text-[#3A6654]">
                          {row.gradeBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6B6577] font-medium truncate mt-0.5">
                      {row.regionAndSubject}
                    </p>
                  </div>
                </div>

                <div className="col-span-3 text-right">
                  <span className="text-xs sm:text-sm font-mono font-semibold text-[#3D3846]">
                    {row.score}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#7659C7]">
                    {row.xp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-black/[0.06] text-center">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#7659C7] hover:underline group"
            >
              <span>O&apos;z o&apos;rningizni to&apos;liq reytingda ko&apos;ring</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
        </div>

        {/* Right Column: App Store Style Review Cards */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Sharhlar hali yo'q bo'lsa — o'ng ustun bo'sh qolmasin: reytingga chorlovchi karta */}
          {reviews.length === 0 && (
            <div className="relative overflow-hidden rounded-[32px] bg-[#7659C7] p-7 text-white">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/15" />
              <span aria-hidden className="absolute -bottom-10 -left-8 size-28 rounded-full bg-[#FFB82E] opacity-80" />
              <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-white text-[#7659C7]">
                <Trophy className="size-6" />
              </span>
              <h3 className="relative mt-5 font-[family-name:var(--font-grotesk)] text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">
                Keyingi hafta jadvalda siz bo&apos;ling
              </h3>
              <p className="relative mt-3 text-[14px] leading-relaxed text-white/85">
                Har yechilgan test va arena g&apos;alabasi XP beradi. Reyting har hafta yangilanadi.
              </p>
              <a
                href="/register"
                className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFFCF7] py-2 pl-5 pr-2 text-[14px] font-bold text-[#080808] transition-transform hover:-translate-y-0.5"
              >
                Bepul boshlash
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#FFB82E]">→</span>
              </a>
            </div>
          )}
          {reviews.slice(0, 2).map((review, i) => (
            <div
              key={i}
              className="rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-7 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.07)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        className="size-4 fill-[#FFB82E] text-[#FFB82E]"
                      />
                    ))}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#4C806B]/14 px-3 py-1 text-xs font-bold text-[#3A6654]">
                    {review.tag}
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-[#3D3846] leading-relaxed font-normal">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 flex items-center gap-3 pt-3.5 border-t border-black/[0.06]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#7659C7] to-[#7659C7] text-white font-bold text-sm shadow-2xs">
                  {review.avatarLetter}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[#080808] text-xs sm:text-sm">
                    {review.author}
                  </h4>
                  <p className="text-[12px] sm:text-xs text-[#6B6577] truncate">
                    {review.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
