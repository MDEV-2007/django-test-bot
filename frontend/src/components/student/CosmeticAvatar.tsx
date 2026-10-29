'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Cosmetics } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

/* Do'kondan olingan bezaklar bilan avatar.
 *
 * Ramka taqilganda (oltin, kumush, olmos) avatar atrofida yorqin va jozibali
 * gradientli halqa (glowing ring frame) chiziladi. */
export default function CosmeticAvatar({
  src,
  name,
  cosmetics,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name?: string | null;
  cosmetics?: Cosmetics;
  className?: string;
  fallbackClassName?: string;
}) {
  const ring = cosmetics?.frame?.payload?.ring;
  const initials = (name || '?').slice(0, 2).toUpperCase();

  if (ring) {
    return (
      <div
        className="relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px] transition-all duration-300 select-none"
        style={{
          background: `linear-gradient(135deg, ${ring}, #ffffff 48%, ${ring})`,
          boxShadow: `0 0 16px ${ring}88, 0 0 6px ${ring}`,
        }}
      >
        <Avatar className={cn(className, 'border-0 after:hidden ring-0 shadow-none')}>
          <AvatarImage src={src || undefined} alt={name || ''} className="object-cover" />
          <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <Avatar className={cn(className)}>
      <AvatarImage src={src || undefined} alt={name || ''} className="object-cover" />
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
