'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileCheck2, BookOpen, Gamepad2, Users, GraduationCap,
  LogOut, ArrowLeft, Menu, X, ChevronRight, MessageSquareQuote,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/* O'qituvchi panelining karkasi — Super Admin paneldagi `PanelShell` bilan bir xil
   tuzilish: chapda sobit sidebar, tepada breadcrumb, mobilda off-canvas menyu.

   Ilgari o'qituvchi sahifalari o'quvchi `NavBar` ini ishlatardi: 10 ta o'quvchi havolasi
   ustiga bitta "O'qituvchi" havolasi qo'shilgan tekis qator. Natijada o'qituvchi qaysi
   bo'limda turganini bilmasdi va sahifalar orasida ko'chish uzoq edi. */
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Umumiy',
    items: [{ href: '/teacher', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Kontent',
    items: [
      { href: '/teacher/tests', label: 'Testlar', icon: FileCheck2 },
      { href: '/teacher/lessons', label: 'Darslar', icon: BookOpen },
      { href: '/teacher/games', label: "O'yinlar", icon: Gamepad2 },
    ],
  },
  {
    label: 'Tahlil va Natijalar',
    items: [
      { href: '/teacher/surveys', label: 'Sharh va Baholar', icon: MessageSquareQuote },
      { href: '/teacher/class', label: 'Mening sinfim', icon: Users },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  // '/teacher' faqat aniq mos kelganda faol — aks holda hamma sahifada yonib turardi.
  return href === '/teacher' ? pathname === '/teacher' : pathname.startsWith(href);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-[var(--accent-text)]">
          <GraduationCap className="size-5" />
        </div>
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
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/12 font-medium text-[var(--accent-text)]'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
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
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Saytga qaytish</span>
        </Link>

        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          <Avatar className="size-8">
            <AvatarImage src={user?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-xs">
              {(user?.first_name || user?.username || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {user?.first_name || user?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-[var(--danger-text)]"
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

  useEffect(() => {
    const prevTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'dark';
    return () => {
      document.documentElement.dataset.theme = prevTheme || 'light';
    };
  }, []);

  return (
    <div data-panel="teacher" className="dark flex min-h-screen w-full bg-[#08090c] text-[#f0f1f3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/10 bg-[#0f1117] lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 border-r border-white/10 bg-[#0f1117]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-[#08090c]/90 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-300 hover:text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menyu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/teacher" className="shrink-0 text-slate-400 hover:text-slate-200">
              O&apos;qituvchi
            </Link>
            {current && current.href !== '/teacher' && (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-slate-600" />
                <span className="truncate font-medium text-slate-200">{current.label}</span>
              </>
            )}
          </nav>
        </header>

        <main className="flex-1 bg-[#08090c] p-4 sm:p-6 text-slate-100">{children}</main>
      </div>
    </div>
  );
}
