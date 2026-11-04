import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* Ads Manager — alohida subdomen (ads.ilmildizi.uz), lekin shu Next ilovasi ichida.
 *
 * `ads.*` hostiga kelgan har bir sahifa so'rovi `/ads-manager/*` ga REWRITE qilinadi
 * (brauzer manzili o'zgarmaydi: ads.ilmildizi.uz/campaigns). Asosiy domenda
 * `/ads-manager/*` ochilmaydi (404) — student platformasi va advertiser kabineti
 * aralashmasin. `/api`, `/media`, `/_next` va statik fayllar matcher'dan tashqarida:
 * API so'rovlari avvalgidek nginx / next.config rewrite orqali Django'ga boradi.
 *
 * Bu faqat marshrutlash. Ruxsat backendda tekshiriladi (IsApprovedAdvertiser).
 * Lokal sinov: http://ads.localhost:3000 */
const ADS_PREFIX = '/ads-manager';

function requestHost(req: NextRequest): string {
  const raw = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return raw.split(',')[0].trim().toLowerCase();
}

export function proxy(req: NextRequest) {
  const isAdsHost = requestHost(req).startsWith('ads.');
  const { pathname } = req.nextUrl;
  const underPrefix = pathname === ADS_PREFIX || pathname.startsWith(`${ADS_PREFIX}/`);

  if (isAdsHost) {
    if (underPrefix) {
      // Ichki prefiks tashqariga ko'rinmasin: /ads-manager/x -> /x. Manzil so'rovdagi
      // host'dan quriladi (nginx ortida nextUrl ichki manzilni ko'rsatishi mumkin).
      const proto = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')).split(',')[0].trim();
      const target = new URL(`${proto}://${requestHost(req)}`);
      target.pathname = pathname.slice(ADS_PREFIX.length) || '/';
      target.search = req.nextUrl.search;
      return NextResponse.redirect(target);
    }
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/' ? ADS_PREFIX : `${ADS_PREFIX}${pathname}`;
    const res = NextResponse.rewrite(url);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  if (underPrefix) {
    const url = req.nextUrl.clone();
    url.pathname = '/__ads_not_found';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|media/|telegram/|ws/|_next/|healthz|favicon\\.ico|icon|apple-icon|manifest|robots\\.txt|sitemap\\.xml|sw\\.js|offline\\.html|brand/|images/|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|txt|js|css|map)$).*)',
  ],
};
