'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, BookMarked, ShoppingBag, FileCheck2,
  BookOpen, Gamepad2, ClipboardList, CreditCard, Megaphone, ScrollText, Settings,
  LogOut, ArrowLeft, ShieldCheck, ShieldAlert, HardDrive, Bot, Menu, X, ChevronRight, MessageSquareHeart, Award,
  TrendingUp, TicketPercent, Send, Activity, Server, Flame, Sliders, Sparkles, Lock, KeyRound, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; tone?: PremiumIconTone };

/* Bo'limlar guruhlangan: ilgari 13 ta havola bitta tekis qatorda turardi va qaysi biri
   qayerga tegishli ekani ko'rinmasdi. Guruhlash admin uchun skanerlashni tezlashtiradi. */
// Rejadagi 6 guruh. Hech bir sahifa olib tashlanmagan — faqat qayta guruhlangan.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Dashboard',
    items: [
      { href: '/panel', label: 'Dashboard', icon: LayoutDashboard, tone: 'indigo' },
    ],
  },
  {
    label: 'Foydalanuvchilar va rollar',
    items: [
      { href: '/panel/users', label: 'Foydalanuvchilar', icon: Users, tone: 'indigo' },
      { href: '/panel/teachers', label: "O'qituvchilar", icon: GraduationCap, tone: 'emerald' },
    ],
  },
  {
    label: "Ta'lim kontenti",
    items: [
      { href: '/panel/subjects', label: 'Fanlar', icon: BookMarked, tone: 'purple' },
      { href: '/panel/tests', label: 'Testlar', icon: FileCheck2, tone: 'emerald' },
      { href: '/panel/stress-exam', label: 'BMB Stress Simulyatori', icon: Flame, tone: 'rose' },
      { href: '/panel/lessons', label: 'Darslar', icon: BookOpen, tone: 'sky' },
      { href: '/panel/games', label: "O'yinlar", icon: Gamepad2, tone: 'amber' },
      { href: '/panel/reels', label: 'Bilim Reels', icon: Sparkles, tone: 'purple' },
      { href: '/panel/community', label: 'Hamjamiyat & Stories', icon: MessageSquareHeart, tone: 'rose' },
      { href: '/panel/mocks', label: 'Mock Natijalari', icon: Award, tone: 'gold' },
      { href: '/panel/attempts', label: 'Barcha Natijalar', icon: ClipboardList, tone: 'indigo' },
      { href: '/panel/surveys', label: 'Sharhlar & Fikrlar', icon: MessageSquareHeart, tone: 'rose' },
    ],
  },
  {
    label: 'Growth va marketing',
    items: [
      { href: '/panel/marketing', label: 'Marketing & Voronka', icon: Flame, tone: 'rose' },
      { href: '/panel/growth', label: "O'sish metrikalari", icon: Activity, tone: 'indigo' },
      { href: '/panel/campaigns', label: "O'quv Markazlari (B2B Ads)", icon: Megaphone, tone: 'amber' },
      { href: '/panel/broadcast', label: 'Xabarlar & Rejalashtirish', icon: Megaphone, tone: 'sky' },
      { href: '/panel/promocodes', label: 'Promokodlar', icon: TicketPercent, tone: 'cyan' },
      { href: '/panel/shop', label: "Do'kon", icon: ShoppingBag, tone: 'purple' },
    ],
  },
  {
    label: 'Moliya',
    items: [
      { href: '/panel/finance', label: 'Moliya & Tushum', icon: TrendingUp, tone: 'emerald' },
      { href: '/panel/payments', label: "To'lovlar", icon: CreditCard, tone: 'amber' },
    ],
  },
  {
    label: 'Tizim va xavfsizlik',
    items: [
      { href: '/panel/system?tab=anticheat', label: 'Anti-Cheat Nazorati', icon: ShieldAlert, tone: 'amber' },
      { href: '/panel/system?tab=backup', label: 'Baza Zaxirasi (Backup)', icon: HardDrive, tone: 'emerald' },
      { href: '/panel/system?tab=ai', label: 'AI Token Monitor', icon: Bot, tone: 'purple' },
      { href: '/panel/system?tab=health', label: 'Server & Logs', icon: Server, tone: 'cyan' },
      { href: '/panel/telegram', label: 'Telegram Bot', icon: Send, tone: 'sky' },
      { href: '/panel/audit-log', label: 'Audit', icon: ScrollText, tone: 'zinc' },
      { href: '/panel/features', label: 'Funksiyalar (2.0)', icon: Sliders, tone: 'purple' },
      { href: '/panel/settings', label: 'Sozlamalar', icon: Settings, tone: 'zinc' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  if (href === '/panel') return pathname === '/panel';
  const baseHref = href.split('?')[0];
  return pathname === baseHref || pathname.startsWith(baseHref + '/');
}

function SidebarContent({ onNavigate, onLockMfa }: { onNavigate?: () => void; onLockMfa?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">Super Admin</p>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              2FA
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">IlmIldizi boshqaruvi</p>
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
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PremiumIcon icon={ArrowLeft} tone="zinc" size="xs" />
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
          {onLockMfa && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-emerald-400/80 hover:text-emerald-300"
              title="MFA ni qayta qulflash (2FA)"
              onClick={onLockMfa}
            >
              <Lock className="size-4" />
            </Button>
          )}
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

type MfaState = {
  loading: boolean;
  enrolled: boolean;
  verified: boolean;
  secret?: string;
  otpauth_uri?: string;
  recovery_codes?: string[];
};

export default function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mfa, setMfa] = useState<MfaState>({ loading: true, enrolled: false, verified: false });
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));

  const fetchMfaStatus = async (reset = false) => {
    try {
      setMfa((prev) => ({ ...prev, loading: true }));
      setErrorMsg('');
      setCode('');
      const data = await apiFetch<{
        enrolled: boolean;
        verified: boolean;
        secret?: string;
        otpauth_uri?: string;
      }>(reset ? '/api/panel/mfa/status/?reset=1' : '/api/panel/mfa/status/');
      setMfa({
        loading: false,
        enrolled: data.enrolled,
        verified: data.verified,
        secret: data.secret,
        otpauth_uri: data.otpauth_uri,
      });
      if (reset) {
        toast.info('Yangi QR kod va maxfiy kalit yaratildi');
      }
    } catch {
      setMfa({ loading: false, enrolled: false, verified: false });
    }
  };

  useEffect(() => {
    const prevTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'dark';
    fetchMfaStatus();
    return () => {
      document.documentElement.dataset.theme = prevTheme || 'light';
    };
  }, []);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiFetch<{ ok: boolean; recovery_codes?: string[]; error?: string }>(
        '/api/panel/mfa/enroll/',
        { method: 'POST', body: JSON.stringify({ code: code.trim() }) }
      );
      if (res.ok) {
        toast.success('2-bosqichli MFA himoyasi faollashtirildi!');
        setCode('');
        setMfa((prev) => ({
          ...prev,
          enrolled: true,
          verified: false,
          recovery_codes: res.recovery_codes || [],
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tasdiqlash kodi noto'g'ri.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiFetch<{ ok: boolean; used_recovery_code?: boolean }>(
        '/api/panel/mfa/verify/',
        { method: 'POST', body: JSON.stringify({ code: code.trim() }) }
      );
      if (res.ok) {
        toast.success(
          res.used_recovery_code
            ? 'Zaxira kodi orqali tasdiqlandi!'
            : 'MFA muvaffaqiyatli tasdiqlandi!'
        );
        setCode('');
        setMfa((prev) => ({ ...prev, verified: true, recovery_codes: undefined }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kod noto'g'ri yoki muddati o'tgan.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockMfa = async () => {
    try {
      await apiFetch('/api/panel/mfa/lock/', { method: 'POST' });
      setCode('');
      setErrorMsg('');
      setMfa((prev) => ({ ...prev, verified: false }));
      toast.info('Admin MFA qulflandi.');
    } catch {
      // ignore
    }
  };

  if (mfa.loading) {
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-[#08090c] text-[#f0f1f3]">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <ShieldCheck className="size-5 animate-pulse text-emerald-400" />
          <span>2-bosqichli MFA xavfsizlik holati tekshirilmoqda...</span>
        </div>
      </div>
    );
  }

  // Show recovery codes right after initial enrollment before entering panel
  if (mfa.recovery_codes && mfa.recovery_codes.length > 0) {
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-[#08090c] p-4 text-[#f0f1f3]">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0f1117] p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Zaxira Kodlari (Recovery Codes)</h2>
              <p className="text-xs text-slate-400">Faqat bir marta ko&apos;rsatiladi — xavfsiz joyga saqlang</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-emerald-300">
            {mfa.recovery_codes.map((rc) => (
              <div key={rc} className="rounded bg-white/5 px-2.5 py-1.5 text-center tracking-wider">
                {rc}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              onClick={() => {
                navigator.clipboard.writeText(mfa.recovery_codes?.join('\n') || '');
                setCopiedRecovery(true);
                toast.success('Zaxira kodlari nusxalandi!');
              }}
            >
              {copiedRecovery ? <Check className="mr-1.5 size-4 text-emerald-400" /> : <Copy className="mr-1.5 size-4" />}
              Nusxa olish
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => setMfa((prev) => ({ ...prev, verified: true, recovery_codes: undefined }))}
            >
              Panelga o&apos;tish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Enrollment screen if admin hasn't configured TOTP MFA yet
  if (!mfa.enrolled) {
    const qrUrl = mfa.otpauth_uri
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfa.otpauth_uri)}`
      : '';
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-[#08090c] p-4 text-[#f0f1f3]">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin — 2-Bosqichli MFA</h1>
              <p className="text-xs text-slate-400">Google Authenticator yoki 1Password ilovasini ulang</p>
            </div>
          </div>

          {qrUrl && (
            <div className="mb-4 flex flex-col items-center rounded-xl border border-white/10 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="TOTP QR Code" width={180} height={180} className="rounded-lg" />
            </div>
          )}

          {mfa.secret && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs text-slate-400">Yoki maxfiy kalitni qo&apos;lda kiriting:</p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm tracking-widest text-emerald-300">
                <span className="truncate">{mfa.secret}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mfa.secret || '');
                    setCopiedSecret(true);
                    toast.success('Maxfiy kalit nusxalandi');
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Nusxa olish"
                >
                  {copiedSecret ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300 space-y-1">
              <p>{errorMsg}</p>
              <p className="text-[11px] text-rose-200/80">
                💡 Maslahat: Telefoningiz soati to&apos;g&apos;riligini tekshiring yoki Google Authenticator sozlamalaridan &quot;Vaqtni sinxronlash&quot; (Sync now) tugmasini bosing.
              </p>
            </div>
          )}

          <form onSubmit={handleEnrollSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Authenticator ilovasidagi 6 xonali kodni kiriting:
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-white outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <button
                type="button"
                onClick={() => fetchMfaStatus(true)}
                className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                title="Yangi QR kod yaratish"
              >
                🔄 Yangi QR kod olish
              </button>
              <span className="text-[11px] opacity-70">30 soniyada yangilanadi</span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                onClick={() => router.push('/dashboard')}
              >
                Orqaga
              </Button>
              <Button
                type="submit"
                disabled={submitting || !code.trim()}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {submitting ? 'Tekshirilmoqda...' : 'MFA ni faollashtirish'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Verification screen when enrolled but current session is not verified
  if (!mfa.verified) {
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-[#08090c] p-4 text-[#f0f1f3]">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Lock className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin MFA Tasdiqlash</h1>
              <p className="text-xs text-slate-400">
                Google Authenticator 6 xonali kodini yoki zaxira kodni kiriting
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <input
                type="text"
                autoComplete="one-time-code"
                placeholder="6 xonali TOTP yoki zaxira kod"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-center font-mono text-lg tracking-widest text-white outline-none focus:border-emerald-500"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                onClick={() => router.push('/dashboard')}
              >
                Orqaga
              </Button>
              <Button
                type="submit"
                disabled={submitting || !code.trim()}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {submitting ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div data-panel="superadmin" className="dark flex min-h-screen w-full bg-[#08090c] text-[#f0f1f3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/10 bg-[#0f1117] lg:block">
        <SidebarContent onLockMfa={handleLockMfa} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 border-r border-white/10 bg-[#0f1117]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} onLockMfa={handleLockMfa} />
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
            <Link href="/panel" className="shrink-0 text-slate-400 hover:text-slate-200">Panel</Link>
            {current && current.href !== '/panel' && (
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
