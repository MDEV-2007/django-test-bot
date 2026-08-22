'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[80vh] flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="size-8" />
          </div>

          <span className="mb-1 bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-5xl font-black text-transparent">500</span>

          <h2 className="font-voice mb-2 text-xl font-bold">Serverda kutilmagan xatolik</h2>

          <p className="mb-6 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Tizim so&apos;rovingizni qayta ishlashda vaqtinchalik uzilishga duch keldi. Bir necha daqiqadan so&apos;ng qayta urinib ko&apos;ring.
          </p>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/dashboard"><Home className="size-4" /> Bosh sahifaga</Link>
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={reset}>
              <RefreshCw className="size-4" /> Qayta urinish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
