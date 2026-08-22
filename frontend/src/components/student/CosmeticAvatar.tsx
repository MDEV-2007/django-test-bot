'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Cosmetics } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

/* Do'kondan olingan bezaklar bilan avatar.
 *
 * Ilgari do'kondagi kosmetika (avatar, ramka) hech qayerda ko'rinmasdi: server ularni
 * saqlardi, lekin API javobida umuman qaytarmasdi — ya'ni sotib olish va "taqish"
 * tanga sarflashdan boshqa hech narsani o'zgartirmasdi. Endi avatar rasmi server
 * tomonda almashtiriladi, ramka esa shu komponentda halqa sifatida chiziladi. */
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

  return (
    <Avatar
      className={cn(className)}
      // Ramka rangi mahsulot ma'lumotidan keladi (masalan oltin uchun #f7c948), shuning
      // uchun u Tailwind klassi emas, inline uslub bo'lishi shart.
      style={ring ? { boxShadow: `0 0 0 2px ${ring}, 0 0 12px -2px ${ring}` } : undefined}
    >
      <AvatarImage src={src || undefined} alt="" />
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
