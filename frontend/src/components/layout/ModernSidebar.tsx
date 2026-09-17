'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Headphones,
  BookOpen,
  FileCheck2,
  Bot,
  Sparkles,
  Layers,
  Swords,
  Trophy,
  User,
  BarChart3,
  ShoppingBag,
  Crown,
  LogOut,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ModernSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  user?: {
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    level?: number;
    xp?: number;
    streak?: number;
    is_premium?: boolean;
  } | null;
  onLogout?: () => void;
}

const NAV_GROUPS = [
  {
    label: 'ASOSIY NAVIGATSIYA',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, badge: null },
      { href: '/study', label: 'Fokus Xonasi', icon: Headphones, badge: 'Audio' },
      { href: '/learning', label: 'Darslar & Nazariya', icon: BookOpen, badge: null },
      { href: '/tests', label: 'Sinov Testlari', icon: FileCheck2, badge: 'DTM' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot, badge: 'GPT-4o', highlight: true },
    ],
  },
  {
    label: 'BELLASHUV & AMALIYOT',
    items: [
      { href: '/battles', label: '1v1 Arena', icon: Swords, badge: 'LIVE', glow: true },
      { href: '/reels', label: 'Bilim Reels', icon: Sparkles, badge: 'Yangi' },
      { href: '/flashcards', label: 'Flashcards', icon: Layers, badge: 'Anki' },
      { href: '/leaderboard', label: 'Reyting & Liga', icon: Trophy, badge: null },
    ],
  },
  {
    label: 'SHAXSIY KABINET',
    items: [
      { href: '/profile', label: 'Profil & Yutuqlar', icon: User, badge: null },
      { href: '/analytics', label: "O'sish Analitikasi", icon: BarChart3, badge: null },
      { href: '/shop', label: "Artefakt Do'koni", icon: ShoppingBag, badge: null },
      { href: '/premium', label: 'VIP Pass', icon: Crown, badge: 'PRO', vip: true },
    ],
  },
];

export default function ModernSidebar({
  mobileOpen,
  onMobileClose,
  user,
  onLogout,
}: ModernSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto scrollbar-none px-4 py-5 select-none">
      {/* 1. BRAND LOGO */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onMobileClose} className="group flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/20 group-hover:scale-105 transition-transform">
              <Zap className="size-5 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white">
                  Ilm<span className="text-emerald-400">Ildizi</span>
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">
                  2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 truncate">
                Gamified EdTech Platform
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden flex size-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Yopish"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 2. NAVIGATION GROUPS */}
        <nav className="space-y-6">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {group.label}
              </span>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'group relative flex min-h-[44px] items-center justify-between rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-300 font-bold border-l-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 hover:translate-x-0.5'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                          )}
                        >
                          <Icon className={cn('size-4', item.glow && 'animate-pulse text-rose-400')} />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Pill Badges */}
                      {item.badge && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide shrink-0',
                            item.glow
                              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse'
                              : item.vip
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                              : item.highlight
                              ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                              : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* 3. USER FOOTER CARD */}
      {user && (
        <div className="pt-4 border-t border-slate-800/80">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar className="size-10 border border-emerald-500/40 ring-2 ring-emerald-500/20">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-emerald-950 text-emerald-400 font-bold text-xs">
                    {user.first_name ? user.first_name.slice(0, 2).toUpperCase() : 'IL'}
                  </AvatarFallback>
                </Avatar>
                {user.is_premium && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] text-slate-950 font-black shadow-sm">
                    ★
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-white truncate">
                    {user.first_name || user.username}
                  </p>
                  {user.is_premium && (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[8px] px-1 py-0 h-3.5">
                      VIP
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span className="text-emerald-400 font-mono font-bold">Lvl {user.level || 1}</span>
                  <span>·</span>
                  <span className="text-slate-400 font-mono font-semibold">{(user.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Chiqish"
                >
                  <LogOut className="size-3.5" />
                </button>
              )}
            </div>

            {/* Micro XP Bar */}
            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>Keyingi daraja</span>
                <span className="text-emerald-400 font-bold">75%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: '75%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 xl:w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-2xl lg:block border-t border-white/5">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Framer Motion */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
