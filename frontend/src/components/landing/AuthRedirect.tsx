'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Bosh sahifa (`/`) ataylab har doim reklama sahifasi sifatida serverda to'liq chiziladi
// — qidiruv robotlari indekslaydigan narsaga ega bo'lishi uchun (page.tsx dagi izohga
// qarang). Lekin allaqachon kirgan foydalanuvchi domenni qayta ochsa (yorliqdan, qo'lda
// yozib), reklama emas, o'z boshqaruv paneli kerak.
//
// Shuning uchun bu tekshiruv mijoz tomonida, sahifa render bo'lgandan KEYIN ishlaydi:
// robot (tokensiz) to'liq matnni ko'radi, haqiqiy kirgan foydalanuvchi esa bir zumda
// /dashboard'ga o'tkaziladi. `localStorage`ni to'g'ridan-to'g'ri o'qiymiz — auth-store
// hali gidratsiya bo'lmagan bo'lishi mumkin, token esa shundoq ham faqat shu yerda
// saqlanadi (accounts/utils.ts dagi REFRESH_KEY bilan bir xil bo'lishi shart).
const REFRESH_KEY = 'ilmildizi_refresh';

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem(REFRESH_KEY)) {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
