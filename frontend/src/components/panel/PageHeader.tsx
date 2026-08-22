'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Panel sahifalarining yagona sarlavha bloki — ilgari har bir sahifa o'z <h1> ini
   turlicha o'lchamda yozardi. */
export default function PageHeader({
  title, description, backHref, actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {backHref && (
          <Button asChild variant="ghost" size="icon" className="mt-0.5 size-8 shrink-0">
            <Link href={backHref} aria-label="Orqaga"><ArrowLeft className="size-4" /></Link>
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
