'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileCheck2, BookOpen, Gamepad2, Users, GraduationCap,
  LogOut, ArrowLeft, Menu, X, ChevronRight, MessageSquareQuote, Sun, Moon, Swords,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';

/* O'qituvchi panelining karkasi — chapda sobit sidebar, tepada breadcrumb & mavzu tugmasi, mobilda drawer menyu. */
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; tone?: PremiumIconTone };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Umumiy',
    items: [{ href: '/teacher', label: 'Dashboard', icon: LayoutDashboard, tone: 'indigo' }],
  },
  {
    label: 'Kontent',
    items: [
      { href: '/teacher/tests', label: 'Testlar', icon: FileCheck2, tone: 'emerald' },
      { href: '/teacher/lessons', label: 'Darslar', icon: BookOpen, tone: 'sky' },
      { href: '/teacher/games', label: "O'yinlar", icon: Gamepad2, tone: 'amber' },
    ],
  },
  {
    label: 'Jonli Janglar & Sinf',
    items: [
      { href: '/teacher/battles', label: 'Sinf Janglari (Live Quiz)', icon: Swords, tone: 'amber' },
      { href: '/teacher/class', label: 'Mening sinfim', icon: Users, tone: 'purple' },
      { href: '/teacher/surveys', label: 'Sharh va Baholar', icon: MessageSquareQuote, tone: 'rose' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === '/teacher' ? pathname === '/teacher' : pathname.startsWith(href);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <PremiumIcon icon={GraduationCap} tone="emerald" size="sm" glow />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">O&apos;qituvchi</p>
          <p className="truncate text-xs text-muted-foreground">Kontent va sinf boshqaruvi</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/12 font-medium text-primary shadow-xs'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <PremiumIcon
                    icon={Icon}
                    tone={item.tone || 'primary'}
                    size="xs"
                    glow={active}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Separator />

      <div className="space-y-1 p-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Saytga qaytish</span>
        </Link>

        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 bg-accent/40">
          <Avatar className="size-8">
            <AvatarImage src={user?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-xs">
              {(user?.first_name || user?.username || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {user?.first_name || user?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
            title="Tizimdan chiqish"
            onClick={() => { logout(); router.push('/login'); }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const { isDark, toggleTheme } = useTheme();

  return (
    <div data-panel="teacher" className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-200">
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 border-r border-border bg-card shadow-2xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menyu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link href="/teacher" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                O&apos;qituvchi
              </Link>
              {current && current.href !== '/teacher' && (
                <>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate font-semibold text-foreground">{current.label}</span>
                </>
              )}
            </nav>
          </div>

          {/* Theme Toggle Sun / Moon Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              title={isDark ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
              aria-label="Mavzuni almashtirish"
            >
              {isDark ? (
                <Sun className="size-4.5 text-amber-400" />
              ) : (
                <Moon className="size-4.5 text-slate-700" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-background p-4 sm:p-6 text-foreground min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
