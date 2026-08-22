import Link from 'next/link';
import { Sprout, LayoutDashboard, FileCheck2, BookOpen, Trophy, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QUICK_LINKS = [
  { href: '/dashboard', label: 'Asosiy Dashboard', icon: LayoutDashboard },
  { href: '/tests', label: 'Test Markazi', icon: FileCheck2 },
  { href: '/learning', label: "Darslar & O'qish", icon: BookOpen },
  { href: '/leaderboard', label: 'Reyting Jadvali', icon: Trophy },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <div className="relative mb-2 select-none">
          <span className="inline-block bg-gradient-to-b from-[var(--accent-text)] via-[var(--accent)] to-[var(--accent-hover)] bg-clip-text text-8xl font-black leading-none tracking-tighter text-transparent sm:text-[140px]">
            404
          </span>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 animate-bounce rounded-full border-4 border-[var(--bg-page)] bg-[var(--accent)] p-3 text-[var(--on-accent)] shadow-xl">
            <Sprout className="size-8" />
          </div>
        </div>

        <h2 className="font-voice mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Bu yo&apos;l hali ildiz otmagan
        </h2>

        <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
          Siz qidirayotgan sahifa ko&apos;chirilgan, o&apos;chirilgan yoki hali yaratilmagan bo&apos;lishi mumkin. Quyidagi asosiy bo&apos;limlarga o&apos;ting:
        </p>

        <div className="mb-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full transition-all group-hover:scale-105 group-hover:border-[var(--accent)]">
                  <CardContent className="flex flex-col items-center gap-2.5 p-4 text-center">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)]">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-foreground">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Button asChild size="lg">
          <Link href="/dashboard"><ArrowLeft className="size-4" /> Bosh sahifaga qaytish</Link>
        </Button>
      </div>
    </div>
  );
}
