'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileCheck2,
  Bot,
  Layers,
  Swords,
  Trophy,
  User,
  BarChart3,
  Crown,
  LogOut,
  X,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Film,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { tgHaptic } from '@/lib/telegram';
import { useFeatureFlags } from '@/lib/features';
import { prefetchApi } from '@/lib/api-cache';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import VerifiedBadge from '@/components/ui/verified-badge';
import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/lib/utils';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';

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
  tone?: PremiumIconTone;
  badge: string | null;
  matchPrefixes?: string[];
  featureKey?: string;
  api?: string;
  glow?: boolean;
  vip?: boolean;
  highlight?: boolean;
  teacherOrAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, badge: null, tone: 'sky', api: '/api/dashboard/home/' },
      { href: '/tests', label: 'Sinov Testlari', icon: FileCheck2, badge: 'BMB', tone: 'emerald', featureKey: 'tests', matchPrefixes: ['/tests'], api: '/api/tests/' },
      { href: '/teacher', label: 'Sinfxona (Ustozlar)', icon: GraduationCap, badge: 'Sinf', tone: 'amber', matchPrefixes: ['/teacher'], teacherOrAdminOnly: true },
      { href: '/library', label: 'Kutubxona', icon: BookOpen, badge: null, tone: 'indigo', matchPrefixes: ['/library'], api: '/api/learning/library/' },
      { href: '/mentor', label: 'AI Mentor', icon: Bot, badge: 'AI', highlight: true, tone: 'purple', featureKey: 'ai_mentor' },
    ],
  },
  {
    label: 'Bellashuv & Amaliyot',
    items: [
      { href: '/reels', label: 'Bilim Reels', icon: Film, badge: '60s', glow: true, tone: 'rose', matchPrefixes: ['/reels'], api: '/api/learning/reels/' },
      { href: '/battles', label: '1v1 Arena (Jang)', icon: Swords, badge: 'LIVE', glow: true, tone: 'amber', featureKey: 'battles', matchPrefixes: ['/games'] },
      { href: '/leaderboard', label: 'Liga & Reyting', icon: Trophy, badge: null, tone: 'gold', matchPrefixes: ['/feed', '/leaderboard'] },
      { href: '/flashcards', label: 'Flashcards', icon: Layers, badge: null, tone: 'cyan', featureKey: 'flashcards', api: '/api/learning/flashcards/' },
    ],
  },
  {
    label: 'Kabinet',
    items: [
      { href: '/profile', label: 'Profilim', icon: User, badge: null, tone: 'sky', matchPrefixes: ['/profile'] },
      { href: '/analytics', label: "O'sish Analitikasi", icon: BarChart3, badge: null, tone: 'emerald', api: '/api/analytics/' },
      { href: '/premium', label: 'VIP Obuna', icon: Crown, badge: 'PRO', tone: 'gold', vip: true },
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
  const { isDark, toggleTheme } = useTheme();
  const user = propUser || storeUser;
  const handleLogout = propLogout || logout;
  const { isEnabled, refresh } = useFeatureFlags();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isTeacher = pathname.startsWith('/teacher');
  const isAdmin = pathname.startsWith('/panel');

  if (isTeacher || isAdmin) return null;

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto scrollbar-none px-3.5 py-5 select-none bg-card/85 ios-glass text-card-foreground">
      {/* 1. iPadOS BRAND HEADER */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onMobileClose} className="group flex items-center gap-2.5">
            <div className="relative flex size-9.5 shrink-0 items-center justify-center rounded-[12px] overflow-hidden border border-border bg-background shadow-2xs transition-transform group-hover:scale-105">
              <BrandMark size={36} rounded="rounded-[11px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
                  Ilm<span className="text-primary">Ildizi</span>
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                  iOS
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Intellektual Ta&apos;lim
              </p>
            </div>
          </Link>

          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden ios-spring flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="ios-spring flex items-center justify-between rounded-[14px] border border-primary/20 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/14"
              >
                <span className="flex items-center gap-2 truncate">
                  <GraduationCap className="size-4 shrink-0" />
                  <span className="truncate">O&apos;qituvchi paneli</span>
                </span>
                <ChevronRight className="size-3.5 opacity-70" />
              </Link>
            )}
            {user.is_superadmin && (
              <Link
                href="/panel"
                onClick={onMobileClose}
                className="ios-spring flex items-center justify-between rounded-[14px] border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/14"
              >
                <span className="flex items-center gap-2 truncate">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span className="truncate">Super Admin paneli</span>
                </span>
                <ChevronRight className="size-3.5 opacity-70" />
              </Link>
            )}
          </div>
        )}

        {/* 2. iOS SETTINGS-STYLE NAVIGATION GROUPS */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group, gIdx) => {
            const isTeacherOrAdmin = Boolean(
              user?.is_teacher ||
              user?.is_superadmin ||
              user?.role === 'teacher' ||
              user?.role === 'superadmin'
            );
            const visibleItems = group.items.filter((it) => {
              if (it.teacherOrAdminOnly && !isTeacherOrAdmin) return false;
              return !it.featureKey || isEnabled(it.featureKey);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1.5">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                          'ios-spring group relative flex min-h-[42px] items-center justify-between rounded-[14px] px-2.5 py-1.5 text-[13px] transition-all',
                          active
                            ? 'bg-primary text-white font-semibold shadow-[0_4px_14px_rgba(0,122,255,0.28)]'
                            : 'text-foreground/85 hover:bg-muted/70 hover:text-foreground font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PremiumIcon
                            icon={Icon as any}
                            tone={item.tone || 'primary'}
                            size="xs"
                            solid={!active}
                            className={cn(
                              active && 'bg-white/20 border-white/30 text-white shadow-none'
                            )}
                          />
                          <span className="truncate tracking-[-0.01em]">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold tracking-tight shrink-0 select-none',
                              active
                                ? 'bg-white/20 text-white'
                                : item.glow
                                ? 'bg-[#FF3B30]/12 text-[#FF3B30]'
                                : item.vip
                                ? 'bg-[#FF9500]/15 text-[#C93400] dark:text-[#FFD60A]'
                                : item.highlight
                                ? 'bg-primary/12 text-primary'
                                : 'bg-muted text-muted-foreground'
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

      {/* 3. APPLE ID / ICLOUD STYLE USER PROFILE FOOTER */}
      <div className="pt-3 border-t border-border mt-4 space-y-2.5">
        {/* iOS Control Center Quick Theme Switch inside Sidebar / Mobile Drawer */}
        <button
          type="button"
          onClick={() => {
            tgHaptic('select');
            toggleTheme();
          }}
          className="ios-spring flex w-full items-center justify-between rounded-[16px] border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/70 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-[#5856D6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
              {isDark ? <Sun className="size-4 text-[#FFD60A]" /> : <Moon className="size-4" />}
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Tungi rejim (Dark Mode)</p>
              <p className="text-[10px] font-medium text-muted-foreground">
                {isDark ? 'iOS Dark OLED faol' : "iOS Light faol"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200',
              isDark ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#39393D]'
            )}
          >
            <span
              className={cn(
                'size-[20px] rounded-full bg-white shadow-xs transition-transform duration-200',
                isDark ? 'translate-x-[18px]' : 'translate-x-0'
              )}
            />
          </span>
        </button>

      {user && (
        <div>
          <div className="rounded-[20px] border border-border bg-background/60 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => {
                  onMobileClose?.();
                  router.push('/profile');
                }}
                className="relative shrink-0 cursor-pointer"
              >
                <CosmeticAvatar
                  className="size-9 border border-border shadow-2xs"
                  src={user.avatar_url}
                  name={user.first_name || user.username}
                  cosmetics={user.cosmetics}
                  fallbackClassName="text-xs font-bold text-primary"
                />
                {user.is_premium && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-[#FF9500] flex items-center justify-center text-[8px] text-white font-black shadow-2xs">
                    ★
                  </span>
                )}
              </div>

              <div
                onClick={() => {
                  onMobileClose?.();
                  router.push('/profile');
                }}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold truncate text-foreground hover:text-primary transition-colors">
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
                className="ios-spring flex size-7.5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/12 transition cursor-pointer"
                title="Tizimdan chiqish"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Level XP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>Keyingi daraja</span>
                <span className="font-bold text-primary">
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
    </div>
  );

  return (
    <>
      {/* Desktop Fixed iPadOS Sidebar */}
      <aside className="ilm-sidebar fixed left-0 top-0 z-40 hidden h-screen w-64 select-none flex-col border-r border-border bg-card/85 ios-glass text-card-foreground lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Spring Physics */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-[80] w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
