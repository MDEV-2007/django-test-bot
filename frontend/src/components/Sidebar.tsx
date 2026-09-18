'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import VerifiedBadge from '@/components/ui/verified-badge';
import { BrandMark } from '@/components/BrandMark';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  user?: any;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | null;
  matchPrefixes?: string[];
  featureKey?: string;
  api?: string;
  glow?: boolean;
  vip?: boolean;
  highlight?: boolean;
  tone?: PremiumIconTone;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ASOSIY NAVIGATSIYA',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, badge: null, api: '/api/dashboard/home/', tone: 'emerald' },
      { href: '/study', label: 'Fokus Xonasi', icon: Headphones, badge: 'Audio', featureKey: 'study', tone: 'purple' },
      { href: '/tests', label: 'Sinov Testlari', icon: FileCheck2, badge: 'DTM', featureKey: 'tests', matchPrefixes: ['/tests'], api: '/api/tests/', tone: 'sky' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot, badge: 'GPT-4o', highlight: true, featureKey: 'ai_mentor', tone: 'cyan' },
    ],
  },
  {
    label: 'BELLASHUV & AMALIYOT',
    items: [
      { href: '/battles', label: '1v1 Arena', icon: Swords, badge: 'LIVE', glow: true, featureKey: 'battles', matchPrefixes: ['/games'], tone: 'rose' },
      { href: '/reels', label: 'Bilim Reels', icon: Sparkles, badge: 'Yangi', featureKey: 'reels', api: '/api/learning/reels/', tone: 'amber' },
      { href: '/flashcards', label: 'Flashcards', icon: Layers, badge: 'Anki', featureKey: 'flashcards', api: '/api/learning/flashcards/', tone: 'indigo' },
      { href: '/leaderboard', label: 'Hamjamiyat va liga', icon: Trophy, badge: null, matchPrefixes: ['/feed', '/leaderboard'], tone: 'gold' },
    ],
  },
  {
    label: 'SHAXSIY KABINET',
    items: [
      { href: '/profile', label: 'Profilim', icon: User, badge: null, matchPrefixes: ['/profile'], tone: 'emerald' },
      { href: '/analytics', label: "O'sish Analitikasi", icon: BarChart3, badge: null, api: '/api/analytics/', tone: 'cyan' },
      { href: '/shop', label: "Artefakt Do'koni", icon: ShoppingBag, badge: null, featureKey: 'shop', matchPrefixes: ['/shop'], tone: 'amber' },
      { href: '/premium', label: 'VIP Pass', icon: Crown, badge: 'PRO', vip: true, tone: 'gold' },
    ],
  },
];

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  user: propUser,
  onLogout: propLogout,
  theme = 'dark',
}: SidebarProps) {
  const isLight = theme === 'light';
  const pathname = usePathname();
  const router = useRouter();
  const { user: storeUser, logout } = useAuthStore();
  const user = propUser || storeUser;
  const handleLogout = propLogout || logout;
  const { isEnabled, refresh } = useFeatureFlags();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isTeacher = pathname.startsWith('/teacher');
  const isAdmin = pathname.startsWith('/panel');

  if (isTeacher || isAdmin) return null; // teacher/panel keep their own shells

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto scrollbar-none px-4 py-5 select-none">
      {/* 1. BRAND LOGO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Link href="/dashboard" onClick={onMobileClose} className="group flex items-center gap-3">
            <div className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden group-hover:scale-105 transition-transform",
              isLight ? "shadow-sm ring-2 ring-blue-500/20 bg-blue-50" : "shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/20 bg-slate-900"
            )}>
              <BrandMark size={40} rounded="rounded-2xl" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-base font-black tracking-tight", isLight ? "text-slate-900" : "text-white")}>
                  Ilm<span className={isLight ? "text-blue-600" : "text-emerald-400"}>Ildizi</span>
                </span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-widest border",
                  isLight ? "bg-blue-50 border-blue-200 text-blue-700 font-black" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                )}>
                  2.0
                </span>
              </div>
              <p className={cn("text-[11px] font-medium truncate", isLight ? "text-slate-500 font-semibold" : "text-slate-400")}>
                Gamified EdTech Platform
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className={cn(
                "lg:hidden flex size-8 items-center justify-center rounded-xl border cursor-pointer",
                isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-950" : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white"
              )}
              aria-label="Yopish"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Rol panellari — faqat tegishli foydalanuvchiga ko'rinadi */}
        {(user?.is_teacher || user?.is_superadmin) && (
          <div className="space-y-1.5 pt-1">
            {user.is_teacher && (
              <Link
                href="/teacher"
                onClick={onMobileClose}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
              >
                <PremiumIcon icon={GraduationCap} tone="emerald" size="xs" glow />
                <span>O&apos;qituvchi paneli</span>
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                onClick={onMobileClose}
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
              >
                <PremiumIcon icon={ShieldCheck} tone="rose" size="xs" glow />
                <span>Super Admin paneli</span>
              </Link>
            )}
          </div>
        )}

        {/* 2. NAVIGATION GROUPS */}
        <nav className="space-y-5 pt-2">
          {NAV_GROUPS.map((group, gIdx) => {
            const visibleItems = group.items.filter((it) => !it.featureKey || isEnabled(it.featureKey));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <span className={cn(
                  "px-3 text-[10px] font-black uppercase tracking-wider",
                  isLight ? "text-slate-400" : "text-slate-500"
                )}>
                  {group.label}
                </span>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        onMouseEnter={() => item.api && prefetchApi(item.api)}
                        onTouchStart={() => item.api && prefetchApi(item.api)}
                        className={cn(
                          'group relative flex min-h-[44px] items-center justify-between rounded-2xl px-3 py-2 text-xs font-semibold transition-all duration-200',
                          active
                            ? (isLight
                                ? 'bg-blue-50/90 text-blue-700 font-black border-l-4 border-blue-600 shadow-xs'
                                : 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-300 font-bold border-l-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.12)]')
                            : (isLight
                                ? 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-950 hover:translate-x-0.5 font-medium'
                                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 hover:translate-x-0.5')
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PremiumIcon
                            icon={Icon as any}
                            tone={active ? (isLight ? 'sky' : (item.tone || 'emerald')) : 'zinc'}
                            size="sm"
                            glow={!isLight && (active || item.glow)}
                            className={cn('transition-transform duration-200 group-hover:scale-110')}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {/* Badges */}
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
                                : 'bg-slate-800 border border-slate-700/60 text-slate-400'
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
            );
          })}
        </nav>
      </div>

      {/* 3. USER FOOTER CARD */}
      {user && (
        <div className={cn("pt-4 border-t", isLight ? "border-slate-200" : "border-slate-800/80")}>
          <div className={cn(
            "rounded-2xl border p-3 backdrop-blur-md space-y-2.5",
            isLight ? "border-slate-200 bg-white/90 shadow-sm" : "border-slate-800/80 bg-slate-900/50 shadow-lg"
          )}>
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => { onMobileClose?.(); router.push('/profile'); }}
                className="relative shrink-0 cursor-pointer"
              >
                <CosmeticAvatar
                  className={cn(
                    "size-9 border ring-2",
                    isLight ? "border-blue-500/30 ring-blue-500/10" : "border-emerald-500/40 ring-emerald-500/20"
                  )}
                  src={user.avatar_url}
                  name={user.first_name || user.username}
                  cosmetics={user.cosmetics}
                  fallbackClassName={cn("text-xs font-bold", isLight ? "text-blue-600" : "text-emerald-400")}
                />
                {user.is_premium && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] text-slate-950 font-black shadow-sm">
                    ★
                  </span>
                )}
              </div>

              <div
                onClick={() => { onMobileClose?.(); router.push('/profile'); }}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <p className={cn("text-xs font-bold truncate transition-colors", isLight ? "text-slate-900 hover:text-blue-600" : "text-white hover:text-emerald-300")}>
                    {user.first_name || user.username}
                  </p>
                  <VerifiedBadge role={user.role} isSuperadmin={user.is_superadmin} isTeacher={user.is_teacher} size="xs" />
                </div>
                <div className={cn("flex items-center gap-1 text-[10px] font-medium", isLight ? "text-slate-500" : "text-slate-400")}>
                  <span className={cn("font-mono font-bold", isLight ? "text-blue-600" : "text-emerald-400")}>Lvl {user.level || 1}</span>
                  <span>·</span>
                  <span className="font-mono font-semibold">{(user.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  router.push('/login');
                }}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer",
                  isLight ? "border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600" : "border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                )}
                title="Tizimdan chiqish"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Micro XP Bar */}
            <div className="space-y-1 pt-0.5">
              <div className={cn("flex justify-between text-[9px] font-mono", isLight ? "text-slate-500" : "text-slate-400")}>
                <span>Daraja progressi</span>
                <span className={cn("font-bold", isLight ? "text-blue-600" : "text-emerald-400")}>
                  {Math.min(100, Math.round(((user.xp || 0) % 1000) / 10))}%
                </span>
              </div>
              <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isLight ? "bg-slate-100" : "bg-slate-800")}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isLight ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  )}
                  style={{ width: `${Math.max(5, Math.min(100, Math.round(((user.xp || 0) % 1000) / 10)))}%` }}
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
      <aside className={cn(
        "ilm-sidebar fixed left-0 top-0 z-30 hidden h-screen w-64 select-none flex-col border-r backdrop-blur-2xl lg:flex",
        isLight ? "border-slate-200/90 bg-white/95 shadow-xs text-slate-900" : "border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 text-white"
      )}>
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r shadow-2xl backdrop-blur-2xl lg:hidden",
                isLight ? "bg-white/98 border-slate-200 text-slate-900" : "bg-slate-950/95 border-slate-800 text-white"
              )}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
