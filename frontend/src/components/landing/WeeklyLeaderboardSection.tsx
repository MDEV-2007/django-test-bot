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

const FALLBACK_LEADERBOARD: LeaderboardItem[] = [
  {
    rank: 1,
    name: "Azizbek Yo'ldoshev",
    gradeBadge: 'A+',
    regionAndSubject: "Farg'ona viloyati • Ona tili",
    score: '29 / 30',
    xp: '4 920 XP',
    badgeType: 'gold',
  },
  {
    rank: 2,
    name: 'Zilola Qosimova',
    gradeBadge: 'A+',
    regionAndSubject: 'Toshkent shahri • Matematika',
    score: '30 / 30',
    xp: '4 810 XP',
    badgeType: 'silver',
  },
  {
    rank: 3,
    name: 'Javohirbek Ergashov',
    gradeBadge: 'A',
    regionAndSubject: 'Samarqand viloyati • Tarix',
    score: '28 / 30',
    xp: '4 650 XP',
    badgeType: 'bronze',
  },
  {
    rank: 4,
    name: 'Maftuna Saidova',
    regionAndSubject: 'Buxoro • Biologiya',
    score: '28 / 30',
    xp: '4 380 XP',
    badgeType: 'number',
  },
  {
    rank: 5,
    name: 'Shoxrux Abdullayev',
    regionAndSubject: 'Namangan • DTM Kompleks',
    score: '86 / 90',
    xp: '4 210 XP',
    badgeType: 'number',
  },
];

const FALLBACK_REVIEWS: ReviewItem[] = [
  {
    rating: 5,
    tag: 'Ona tili A+ (92 ball)',
    quote:
      "Ilm Ildizi platformasidagi qat'iy vaqt hisoblagichi va xatolar tahlili bo'lmaganida bunchalik yuqori ololmasdim. Ayniqsa matnli savollarda vaqtni to'g'ri taqsimlashni shu yerda o'rgandim.",
    author: 'Mubina Karimova',
    role: 'Toshkent Davlat Yuridik Universiteti talabasi',
    avatarLetter: 'M',
  },
  {
    rating: 5,
    tag: 'DTM: 184.2 Ball (Grant)',
    quote:
      "Avval repetitorga borib qog'ozda test yechardik, tekshirishga 2 kun ketardi. Ilm Ildizi ilovasida esa tugatishingiz bilanoq qaysi mavzudan oqsayotganingizni ko'rsatib beradi.",
    author: 'Davronbek Qodirov',
    role: "O'zMU Matematika fakulteti 1-kurs",
    avatarLetter: 'D',
  },
];

export default function WeeklyLeaderboardSection() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>(FALLBACK_LEADERBOARD);
  const [reviews, setReviews] = useState<ReviewItem[]>(FALLBACK_REVIEWS);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9500]/14 px-3.5 py-1 text-xs font-bold tracking-wider text-[#C93400] uppercase">
            <Trophy className="size-3.5 text-[#FF9500]" />
            <span>Game Center Peshqadamlari</span>
          </div>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl lg:text-5xl">
            Haftalik Yetakchilar Reytingi
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#6C6C70] font-normal">
            Har hafta eng ko&apos;p test yechgan va yuqori foiz qayd etgan top o&apos;quvchilar
          </p>
        </div>

        {/* Refresh Pill */}
        <button
          onClick={fetchData}
          title="Reytingni yangilash"
          className="ios-spring inline-flex items-center gap-2 text-xs font-semibold text-[#007AFF] bg-white border border-black/[0.08] rounded-full px-4 py-2 self-start md:self-end shadow-2xs cursor-pointer"
        >
          <RotateCw className={`size-3.5 text-[#007AFF] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Jonli yangilanadi</span>
        </button>
      </div>

      {/* Main Grid: Left = iOS Inset Grouped Leaderboard, Right = App Store Reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 rounded-[30px] border border-black/[0.07] bg-white p-5 sm:p-7 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-12 pb-3 border-b border-black/[0.06] text-[11px] font-bold tracking-wider uppercase text-[#8E8E93]">
            <span className="col-span-7">O&apos;QUVCHI &amp; VILOYAT</span>
            <span className="col-span-3 text-right">NATIJA</span>
            <span className="col-span-2 text-right">XP BALL</span>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {leaderboard.map((row) => (
              <div
                key={row.rank}
                className="grid grid-cols-12 items-center py-3.5 hover:bg-[#F2F2F7]/70 rounded-[18px] px-2.5 -mx-2.5 transition-colors group"
              >
                <div className="col-span-7 flex items-center gap-3">
                  <div className="shrink-0 size-9 rounded-full flex items-center justify-center font-bold text-xs">
                    {row.badgeType === 'gold' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#FFCC00]/20 text-base">
                        🥇
                      </span>
                    )}
                    {row.badgeType === 'silver' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#8E8E93]/15 text-base">
                        🥈
                      </span>
                    )}
                    {row.badgeType === 'bronze' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#FF9500]/18 text-base">
                        🥉
                      </span>
                    )}
                    {row.badgeType === 'number' && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#F2F2F7] text-[#3A3A3C] font-mono font-bold">
                        {row.rank}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#1C1C1E] text-xs sm:text-sm truncate group-hover:text-[#007AFF] transition-colors">
                        {row.name}
                      </span>
                      {row.gradeBadge && (
                        <span className="inline-flex items-center rounded-full bg-[#34C759]/14 px-2 py-0.5 text-[10px] font-bold text-[#248A3D]">
                          {row.gradeBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6C6C70] font-medium truncate mt-0.5">
                      {row.regionAndSubject}
                    </p>
                  </div>
                </div>

                <div className="col-span-3 text-right">
                  <span className="text-xs sm:text-sm font-mono font-semibold text-[#3A3A3C]">
                    {row.score}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#007AFF]">
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
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#007AFF] hover:underline group"
            >
              <span>O&apos;z o&apos;rningizni to&apos;liq reytingda ko&apos;ring</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
        </div>

        {/* Right Column: App Store Style Review Cards */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {reviews.slice(0, 2).map((review, i) => (
            <div
              key={i}
              className="rounded-[30px] border border-black/[0.07] bg-white p-6 sm:p-7 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.07)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        className="size-4 fill-[#FF9500] text-[#FF9500]"
                      />
                    ))}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#34C759]/14 px-3 py-1 text-xs font-bold text-[#248A3D]">
                    {review.tag}
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-[#3A3A3C] leading-relaxed font-normal">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 flex items-center gap-3 pt-3.5 border-t border-black/[0.06]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#007AFF] to-[#5856D6] text-white font-bold text-sm shadow-2xs">
                  {review.avatarLetter}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[#1C1C1E] text-xs sm:text-sm">
                    {review.author}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#6C6C70] truncate">
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
