'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

const REFRESH_KEY = 'ilmildizi_refresh';

export function AuthRedirect() {
  const router = useRouter();
  const { access, user, authReady } = useAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasRefresh = !!localStorage.getItem(REFRESH_KEY);
    if (!hasRefresh) return;

    // Foydalanuvchi tizimga kirgan bo'lsa, rolga mos bosh sahifasiga yo'naltirish
    if (user) {
      if (user.role === 'superadmin') {
        router.replace('/panel');
      } else if (user.role === 'teacher') {
        router.replace('/teacher');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // Token bor, lekin profil hali kelmagan bo'lsa — kutmasdan dashboardga
    router.replace('/dashboard');
  }, [router, user]);

  useEffect(() => {
    if (authReady && (access || user)) {
      if (user?.role === 'superadmin') {
        router.replace('/panel');
      } else if (user?.role === 'teacher') {
        router.replace('/teacher');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [authReady, access, user, router]);

  return null;
}
