# Ads Manager — amalga oshirilgan ish va deploy talablari

Branch: `feat/ads-manager`. `main` ga merge qilinmagan, deploy qilinmagan.

## API (yangi)

Prefix `/api/v1/advertiser/` (`backend/b2b_ads/advertiser_api.py`, `advertiser_urls.py`):

| Method | Path | Ruxsat |
|---|---|---|
| POST | `apply/` | AllowAny, IP bo'yicha 5/soat |
| GET | `me/` | Kirgan foydalanuvchi |
| GET/PATCH | `profile/` | Markaz egasi (suspended — faqat GET) |
| GET | `dashboard/?from&to` | Tasdiqlangan advertiser |
| GET/POST | `campaigns/` | 〃 |
| GET/PATCH | `campaigns/{id}/` | 〃 + egalik (boshqasiniki — 404) |
| POST | `campaigns/{id}/submit|pause|resume|end|duplicate/` | 〃 |
| GET/POST | `creatives/`, DELETE `creatives/{id}/` | 〃 |
| GET | `audiences/` | 〃 |
| GET | `leads/`, `leads/{id}/`, `leads/export/?confirm=1` | 〃 |
| POST | `leads/{id}/status/` | 〃 |
| GET | `analytics/?from&to&campaign` | 〃 |
| GET | `billing/` | 〃 (`available: false`) |

Super Admin (`/api/panel/`): `advertisers/`, `advertisers/{id}/review/` (approve/reject/suspend),
`campaigns/{id}/review/` (approve/reject). `campaigns/` javobiga `review_status`, `advertiser`,
`banner_url`, `submitted_at` qo'shildi (mavjud maydonlar o'zgarmagan).

O'zgargan xulq (student tomoni):
- `live_campaigns()` endi `review_status='approved'`, `ended_manually_at IS NULL` va
  (`center IS NULL` yoki `center.status='approved'`) shartlarini ham tekshiradi. Mavjud SA
  kampaniyalari migratsiyada `approved` bo'ladi — jonli feed o'zgarmaydi.
- `track_event`: dedup endi DB'da (`AdEvent` UniqueConstraint); counter'lar avvalgidek oshadi.
- Feed payload: `banner_url` = advertiser banneri (bo'lmasa avvalgidek logo), `cta_text` — advertiser matni (bo'lmasa avvalgi matn).
- Telegram lid xabari: advertiser markazi `notify_new_leads=False` bo'lsa yuborilmaydi; kampaniyada chat bo'lmasa markaz chati ishlatiladi.

## Migratsiyalar (hammasi additive, ma'lumot o'chirilmaydi)

- `core/0008_ads_manager` — EducationCenter: owner, status (default `pending`), contact_*, website, description, review_note, reviewed_by/at, notify_new_leads, updated_at.
- `b2b_ads/0006_ads_manager` — EduCenterCampaign: center (FK, PROTECT, null), review_status (default `approved`), review_note, reviewed_at, submitted_at, objective, banner_url, cta_text, ended_manually_at, updated_at; StudentLeadSubmission: note, status_changed_at; yangi `AdEvent`, `AdCreative` jadvallari.

Lid uchun DB `UniqueConstraint(student_profile, campaign)` **qo'shilmadi**: prod'da dublikat bor-yo'qligi tekshirilmagan, migratsiya yiqilishi mumkin. Dublikat servis darajasida qulf bilan to'siladi (Postgres concurrency testi bor).

## Frontend

- `frontend/src/proxy.ts` — `ads.*` host → `/ads-manager/*` rewrite; asosiy hostda `/ads-manager` 404; `X-Robots-Tag: noindex`.
- `frontend/src/app/ads-manager/` — login, apply, status, dashboard, campaigns (+ new, [id], [id]/edit), creatives, audiences, leads, analytics, billing, settings.
- `frontend/src/components/ads/`, `frontend/src/lib/ads-api.ts`.
- SA: `frontend/src/app/panel/advertisers/page.tsx` + PanelShell menyusi.
- Lokal sinov: `http://ads.localhost:3500`.

## Production deploy talablari (foydalanuvchi bajaradi)

1. **DNS (Ahost):** `ads.ilmildizi.uz` A-record → VPS IP.
2. **Sertifikat:** mavjud sertifikatga SAN qo'shish, masalan
   `certbot certonly --webroot -w /var/www/certbot -d ilmildizi.uz -d www.ilmildizi.uz -d ads.ilmildizi.uz --expand`
   (certbot konteyner/volume orqali — `deploy/DEPLOY_DOCKER.md` dagi tartibda).
3. **Root `.env`:** `SERVER_NAME=ilmildizi.uz www.ilmildizi.uz ads.ilmildizi.uz` (CERT_NAME o'zgarmaydi).
4. **`backend/.env`:** `EXTRA_ALLOWED_HOSTS` ga `ads.ilmildizi.uz` qo'shish (nginx `/api` so'rovini shu Host bilan uzatadi). `FRONTEND_ORIGINS` o'zgarishi shart emas — API same-origin.
5. nginx `www → apex` qoidasi `ads.` ga tegmaydi (faqat `www.` prefiks).
6. Deploy (faqat `main` ga merge qilingandan keyin): `web` va `frontend` birga, keyin nginx'ni qayta yaratish (`SERVER_NAME` env o'zgargani uchun `reload` yetmaydi):

```bash
cd /opt/ilmildizi && \
git pull origin main && \
docker compose up -d --build --no-deps web frontend && \
docker compose up -d --force-recreate --no-deps nginx
```

7. Birinchi advertiserni tasdiqlash: `/panel/advertisers`.

## Amalga oshirilmagan / cheklovlar

- Billing, spend, CPL, CPC/CPM — to'lov infratuzilmasi yo'q (UI va API `N/A` / `available:false`).
- Password reset — email infratuzilmasi yo'q; SA orqali.
- Jamoa a'zolari (team members) — bitta owner.
- JWT `localStorage` da (butun platforma arxitekturasi); ads subdomeni alohida origin bo'lgani uchun tokenlar asosiy saytdan ajratilgan.
- `AdEvent` statistikasi deploy kunidan boshlanadi; undan oldingi umrbod counter'lar faqat jami sifatida ko'rinadi.
- Kunlik pul byudjeti yo'q; byudjet = lid limiti.
- Click — foydalanuvchi+kampaniya+kun bo'yicha noyob bosish (bot/takror bosishdan himoya).
