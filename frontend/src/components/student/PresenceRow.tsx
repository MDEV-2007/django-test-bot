'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* "Yolg'iz emassiz" qatlami: hozir onlayn bo'lgan o'quvchilar va bugungi umumiy faollik.
   Raqobat emas — hamrohlik: reyting yoki o'rin ko'rsatilmaydi. */
export default function PresenceRow({
  count, peers, solvedToday,
}: {
  count: number;
  peers: { name: string; avatar_url: string | null }[];
  solvedToday: number;
}) {
  if (count <= 1 && solvedToday === 0) return null;
  const extra = Math.max(0, count - 1 - peers.length);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
      {peers.length > 0 && (
        <div className="flex -space-x-2">
          {peers.map((p, i) => (
            <Avatar key={i} className="size-6 border-2 border-[var(--bg-page)]" title={p.name}>
              <AvatarImage src={p.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-[9px]">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 && (
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-[var(--bg-page)] bg-[var(--surface-input)] font-mono text-[9px] font-bold">
              +{extra}
            </span>
          )}
        </div>
      )}

      {count > 1 && (
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--success)]" />
          <Users className="size-3.5" />
          Hozir <strong className="text-foreground">{count}</strong> nafar o&apos;quvchi shu yerda
        </span>
      )}

      {solvedToday > 0 && (
        <span>
          {count > 1 && '· '}
          Bugun <strong className="text-foreground">{solvedToday}</strong> nafar abituriyent test yechdi
        </span>
      )}
    </div>
  );
}
