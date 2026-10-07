'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Headphones,
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
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import VerifiedBadge from '@/components/ui/verified-badge';
import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

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
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, badge: null, api: '/api/dashboard/home/' },
      { href: '/study', label: 'Fokus Xonasi', icon: Headphones, badge: null, featureKey: 'study' },
      { href: '/tests', label: 'Sinov Testlari', icon: FileCheck2, badge: null, featureKey: 'tests', matchPrefixes: ['/tests'], api: '/api/tests/' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot, badge: 'AI', highlight: true, featureKey: 'ai_mentor' },
    ],
  },
  {
    label: 'Amaliyot & Bellashuv',
    items: [
      { href: '/battles', label: '1v1 Arena', icon: Swords, badge: 'LIVE', glow: true, featureKey: 'battles', matchPrefixes: ['/games'] },
      { href: '/reels', label: 'Bilim Reels', icon: Sparkles, badge: 'Yangi', featureKey: 'reels', api: '/api/learning/reels/' },
      { href: '/flashcards', label: 'Flashcards', icon: Layers, badge: null, featureKey: 'flashcards', api: '/api/learning/flashcards/' },
      { href: '/leaderboard', label: 'Liga & Reyting', icon: Trophy, badge: null, matchPrefixes: ['/feed', '/leaderboard'] },
    ],
  },
  {
    label: 'Kabinet',
    items: [
      { href: '/profile', label: 'Profilim', icon: User, badge: null, matchPrefixes: ['/profile'] },
      { href: '/analytics', label: "O'sish Analitikasi", icon: BarChart3, badge: null, api: '/api/analytics/' },
      { href: '/shop', label: "Artefakt Do'koni", icon: ShoppingBag, badge: null, featureKey: 'shop', matchPrefixes: ['/shop'] },
      { href: '/premium', label: 'VIP Obuna', icon: Crown, badge: 'PRO', vip: true },
    ],
  },
];

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  user: propUser,
  onLogout: propLogout,
}: SidebarProps) {
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

  if (isTeacher || isAdmin) return null; // Teacher & Admin panellari o'z layoutiga ega

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto scrollbar-none px-4 py-5 select-none bg-card text-card-foreground">
      {/* 1. BRAND HEADER */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onMobileClose} className="group flex items-center gap-2.5">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border bg-background transition-transform group-hover:scale-105">
              <BrandMark size={36} rounded="rounded-xl" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Ilm<span className="text-primary">Ildizi</span>
                </span>
                <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground uppercase">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Ta&apos;lim Platformasi
              </p>
            </div>
          </Link>

          {/* Mobil yopish tugmasi */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition cursor-pointer"
              aria-label="Yopish"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Rol panellari tezkor havolasi */}
        {(user?.is_teacher || user?.is_superadmin) && (
          <div className="space-y-1.5 px-1">
            {user.is_teacher && (
              <Link
                href="/teacher"
                onClick={onMobileClose}
                className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <GraduationCap className="size-4 shrink-0" />
                <span className="truncate">O&apos;qituvchi paneli</span>
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                onClick={onMobileClose}
                className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span className="truncate">Super Admin paneli</span>
              </Link>
            )}
          </div>
        )}

        {/* 2. NAVIGATION GROUPS */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group, gIdx) => {
            const visibleItems = group.items.filter((it) => !it.featureKey || isEnabled(it.featureKey));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <div className="space-y-0.5">
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
                          'group relative flex min-h-[38px] items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors duration-150',
                          active
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              'size-4 shrink-0 transition-colors',
                              active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {/* Monoxrom / Minimalist Badges */}
                        {item.badge && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-tight shrink-0 transition-all select-none border',
                              item.glow
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : item.vip
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : item.highlight
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-muted text-muted-foreground border-border'
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

      {/* 3. USER PROFILE FOOTER */}
      {user && (
        <div className="pt-4 border-t border-border mt-4">
          <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => { onMobileClose?.(); router.push('/profile'); }}
                className="relative shrink-0 cursor-pointer"
              >
                <CosmeticAvatar
                  className="size-8 border border-border"
                  src={user.avatar_url}
                  name={user.first_name || user.username}
                  cosmetics={user.cosmetics}
                  fallbackClassName="text-xs font-semibold text-primary"
                />
                {user.is_premium && (
                  <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-slate-950 font-black">
                    ★
                  </span>
                )}
              </div>

              <div
                onClick={() => { onMobileClose?.(); router.push('/profile'); }}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold truncate text-foreground hover:text-primary transition-colors">
                    {user.first_name || user.username}
                  </p>
                  <VerifiedBadge role={user.role} isSuperadmin={user.is_superadmin} isTeacher={user.is_teacher} size="xs" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <span className="font-mono font-bold text-primary">Lvl {user.level || 1}</span>
                  <span>·</span>
                  <span className="font-mono">{(user.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  router.push('/login');
                }}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition cursor-pointer"
                title="Tizimdan chiqish"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Level XP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>Daraja</span>
                <span className="font-semibold text-primary">
                  {Math.min(100, Math.round(((user.xp || 0) % 1000) / 10))}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
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
      <aside className="ilm-sidebar fixed left-0 top-0 z-40 hidden h-screen w-64 select-none flex-col border-r border-border bg-card text-card-foreground lg:flex">
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
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-[80] w-72 max-w-[85vw] border-r border-border bg-card shadow-lg lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
