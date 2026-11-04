'use client';

import { useEffect, type RefObject } from 'react';
import { apiFetch } from '@/lib/api-client';

export type AdEvent = 'impression' | 'click';

/** Reklama hodisasini yuboradi. Server foydalanuvchi + kampaniya + kun bo'yicha takrorsiz
 *  sanaydi, shuning uchun bu chaqiruv xavfsiz (qayta yuborish hisobni oshirmaydi). */
export function trackAd(campaignId: number | null | undefined, event: AdEvent): void {
  if (!campaignId) return;
  apiFetch('/api/v1/b2b/track/', {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, event }),
  }).catch(() => {
    // Tracking ixtiyoriy — xato foydalanuvchiga ko'rsatilmaydi.
  });
}

/** Impression faqat reklama haqiqatan ekranda ko'ringanda: kamida 50% qismi 1 soniya. */
export function useAdImpression(ref: RefObject<Element | null>, campaignId: number | null | undefined): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !campaignId || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (sent) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            sent = true;
            trackAd(campaignId, 'impression');
            observer.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref, campaignId]);
}
