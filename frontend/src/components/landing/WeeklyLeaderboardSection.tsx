'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, Star } from 'lucide-react';

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
      "\"Ilm Ildizi botidagi qat'iy vaqt hisoblagichi va xatolar tahlili bo'lmaganida bunchalik yuqori ololmasdim. Ayniqsa matnli savollarda vaqtni to'g'ri taqsimlashni shu bot orqali o'rgandim.\"",
    author: 'Mubina Karimova',
    role: 'Toshkent Davlat Yuridik Universiteti talabasi',
    avatarLetter: 'M',
  },
  {
    rating: 5,
    tag: 'DTM: 184.2 Ball (Grant)',
    quote:
      "\"Avval repetitorga borib qog'ozda test yechardik, tekshirishga 2 kun ketardi. Ilm Ildizi botida esa tugatishingiz bilanoq qaysi mavzudan oqsayotganingizni ko'rsatib beradi. Tavsiya qilaman!\"",
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
      // Fallback ma'lumotlar saqlanadi
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Har 15 daqiqada yangilanadi (15 * 60 * 1000 ms)
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold tracking-wider text-emerald-800 uppercase">
            JONLI PESHTOQ
          </div>
          {/* Title */}
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Haftalik Yetakchilar Reytingi
          </h2>
          {/* Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-slate-500 font-normal">
            Har hafta eng ko&apos;p test yechgan va yuqori foiz qayd etgan top o&apos;quvchilar
          </p>
        </div>

        {/* Refresh Badge */}
        <button
          onClick={fetchData}
          title="Reytingni yangilash"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-full px-3.5 py-1.5 self-start md:self-end transition-all active:scale-95 cursor-pointer"
        >
          <RotateCw className={`size-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : 'animate-[spin_8s_linear_infinite]'}`} />
          <span>Har 15 daqiqada yangilanadi</span>
        </button>
      </div>

      {/* Main Grid: Left = Leaderboard, Right = Reviews */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Leaderboard Card */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_4px_25px_rgba(15,23,42,0.04)]">
          {/* Table Header */}
          <div className="grid grid-cols-12 pb-3.5 border-b border-slate-100 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-400">
            <span className="col-span-7">O&apos;QUVCHI &amp; VILOYAT</span>
            <span className="col-span-3 text-right">TO&apos;G&apos;RI / JAMI</span>
            <span className="col-span-2 text-right">XP BALL</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {leaderboard.map((row) => (
              <div
                key={row.rank}
                className="grid grid-cols-12 items-center py-4 hover:bg-slate-50/80 rounded-2xl px-2 sm:px-3 -mx-2 sm:-mx-3 transition-colors group"
              >
                {/* Left: Rank + Info */}
                <div className="col-span-7 flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 size-8 sm:size-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                    {row.badgeType === 'gold' && (
                      <span className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-amber-100/80 text-amber-700 shadow-2xs text-base">
                        🥇
                      </span>
                    )}
                    {row.badgeType === 'silver' && (
                      <span className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-2xs text-base">
                        🥈
                      </span>
                    )}
                    {row.badgeType === 'bronze' && (
                      <span className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-amber-200/50 text-amber-800 shadow-2xs text-base">
                        🥉
                      </span>
                    )}
                    {row.badgeType === 'number' && (
                      <span className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">
                        {row.rank}
                      </span>
                    )}
                  </div>

                  {/* Name + Subject */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                        {row.name}
                      </span>
                      {row.gradeBadge && (
                        <span className="inline-flex items-center rounded-md bg-[#e6f7ef] px-1.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#059669]">
                          {row.gradeBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                      {row.regionAndSubject}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-3 text-right">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    {row.score}
                  </span>
                </div>

                {/* XP */}
                <div className="col-span-2 text-right">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {row.xp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Link */}
          <div className="pt-5 border-t border-slate-100 text-center">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors group"
            >
              <span>O&apos;z o&apos;rningizni botdagi to&apos;liq reytingda ko&apos;ring</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>

        {/* Right Column: Review Cards */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {reviews.slice(0, 2).map((review, i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_4px_25px_rgba(15,23,42,0.04)] flex flex-col justify-between transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div>
                {/* Top: Stars + Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: review.rating }).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        className="size-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#15803d]">
                    {review.tag}
                  </span>
                </div>

                {/* Quote */}
                <p className="mt-4 text-xs sm:text-sm text-slate-700 leading-relaxed italic font-normal">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#064e3b] text-white font-extrabold text-sm shadow-xs">
                  {review.avatarLetter}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {review.author}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
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
