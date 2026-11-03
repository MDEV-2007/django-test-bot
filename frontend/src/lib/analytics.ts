import { apiFetch } from '@/lib/api-client';

/** Monetizatsiya voronkasi hodisalari. Backend faqat shu nomlarni qabul qiladi
 *  (backend/analytics/tracking.py → CLIENT_EVENTS). */
export type ProductEventName = 'paywall_view' | 'premium_view' | 'checkout_view';

export type ProductEventProps = {
  feature?: string;
  plan_id?: string | number;
  source?: string;
};

/** Fire-and-forget: analitika hech qachon sahifani to'xtatmasligi yoki xato ko'rsatmasligi kerak. */
export function trackEvent(name: ProductEventName, props: ProductEventProps = {}): void {
  apiFetch('/api/analytics/event/', {
    method: 'POST',
    body: JSON.stringify({ name, props }),
  }).catch(() => {});
}
