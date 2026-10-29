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

/* iOS Live Activity Peers Strip */
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
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-[#34C759]" />
          </span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-[#34C759]" />
            Hozir <strong className="text-[#34C759] font-bold">{Math.max(count, peers?.length || 0)}</strong> nafar o&apos;quvchi onlayn
          </span>
        </div>

        {solvedToday > 0 && (
          <span className="text-[11px] text-[#8E8E93] font-medium">
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
                  'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-all shrink-0 select-none',
                  peer.is_me
                    ? 'border-[#007AFF]/30 bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.05] text-foreground'
                )}
                title={`${peer.name} (${displayName})`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-5 border border-black/10 dark:border-white/10">
                    <AvatarImage src={peer.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-[9px] font-bold bg-[#007AFF]/15 text-[#007AFF]">
                      {displayName.replace('@', '').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white dark:border-[#1C1C1E] bg-[#34C759]" />
                </div>

                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-semibold text-[11px] truncate max-w-[120px]">
                    {displayName}
                  </span>
                  {peer.is_me && (
                    <span className="text-[9px] font-bold uppercase bg-[#007AFF] text-white px-1.5 py-0.5 rounded-full leading-none">
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
