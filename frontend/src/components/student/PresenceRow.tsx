'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type OnlinePeer = {
  name: string;
  username?: string;
  avatar_url: string | null;
  is_me?: boolean;
};

/* "Yolg'iz emassiz" qatlami: hozir onlayn bo'lgan o'quvchilar (username va avatar bilan)
   va bugungi umumiy test faolligi. */
export default function PresenceRow({
  count,
  peers,
  solvedToday,
}: {
  count: number;
  peers: OnlinePeer[];
  solvedToday: number;
}) {
  if (count === 0 && solvedToday === 0 && (!peers || peers.length === 0)) return null;

  return (
    <div className="space-y-3">
      {/* Top summary row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-emerald-400" />
            Hozir <strong className="text-emerald-400 font-black">{Math.max(count, peers?.length || 0)}</strong> nafar o&apos;quvchi onlayn
          </span>
        </div>

        {solvedToday > 0 && (
          <span className="text-[11px] text-muted-foreground font-medium">
            Bugun <strong className="text-foreground font-bold">{solvedToday}</strong> nafar abituriyent test yechdi
          </span>
        )}
      </div>

      {/* Active Users with Usernames list */}
      {peers && peers.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none min-w-0 max-w-full">
          {peers.map((peer, i) => {
            const displayName = peer.username ? `@${peer.username}` : peer.name;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-xs transition-all shrink-0 select-none shadow-sm',
                  peer.is_me
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                    : 'border-[var(--border-card)] bg-[var(--surface-hover)]/40 hover:border-slate-700 text-slate-200'
                )}
                title={`${peer.name} (${displayName})`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-6 border border-white/10">
                    <AvatarImage src={peer.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-[9px] font-bold bg-slate-800 text-slate-200">
                      {displayName.replace('@', '').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-slate-950 bg-emerald-500" />
                </div>

                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-bold text-[11px] truncate max-w-[120px]">
                    {displayName}
                  </span>
                  {peer.is_me && (
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded-md">
                      Siz
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
