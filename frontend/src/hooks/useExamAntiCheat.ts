'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';

interface TabSwitchResponse {
  enabled: boolean;
  tab_switches: number;
  limit: number;
  is_cheating_flagged: boolean;
}

/* Imtihon oynasidan chiqishni kuzatadi — faqat jonli mock va Stress Zali'da
   (`enabled` ni server `anti_cheat` maydoni orqali aytadi).

   Hisob SERVERDA yuritiladi (/tab-switch/): sahifani yangilash yoki klientni aldash
   bilan uni nolga tushirib bo'lmaydi. Limitga yetgan urinish chetlatiladi — natija
   saqlanadi, lekin mock reytingida o'rin olmaydi.

   Faqat `visibilitychange` tinglanadi: `blur` Telegram WebView'da klaviatura yoki tizim
   oynasi ochilganda ham ishga tushib, o'quvchini nohaq jazolardi. */
export function useExamAntiCheat(attemptId: number | string, enabled: boolean) {
  const [isDisqualified, setIsDisqualified] = useState(false);
  const lastReportAt = useRef(0);

  useEffect(() => {
    if (!enabled || isDisqualified) return;

    const onVisibilityChange = async () => {
      if (!document.hidden) return;
      // Bitta chiqish bir nechta hodisa berishi mumkin — 1.5s ichidagilari bitta sanaladi.
      const now = Date.now();
      if (now - lastReportAt.current < 1500) return;
      lastReportAt.current = now;

      let res: TabSwitchResponse;
      try {
        res = await apiFetch<TabSwitchResponse>(`/api/tests/attempts/${attemptId}/tab-switch/`, { method: 'POST' });
      } catch {
        return;
      }
      if (!res.enabled) return;

      soundFX.incorrect?.();
      tgHaptic('error');
      if (res.is_cheating_flagged) {
        setIsDisqualified(true);
        toast.error(
          `Siz imtihon oynasidan ${res.tab_switches} marta chiqdingiz. Natijangiz saqlanadi, lekin mock reytingidan chetlatildingiz.`,
          { duration: 8000 },
        );
      } else {
        toast.warning(
          `Ogohlantirish (${res.tab_switches}/${res.limit}): imtihon paytida boshqa ilova yoki oynaga o'tmang. ` +
          `Yana ${res.limit - res.tab_switches} marta takrorlansa, reytingdan chetlatilasiz.`,
          { duration: 6000 },
        );
      }
    };

    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Imtihon paytida matnni nusxalash taqiqlanadi!");
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
    };
  }, [attemptId, enabled, isDisqualified]);

  return { isDisqualified };
}
