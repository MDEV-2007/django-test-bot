# IlmIldizi Ads Manager — Phase 1: Audit va Implementation Plan

Sana: 2026-11-04. Holat: faqat audit — hech qanday kod o'zgartirilmagan.

## 0. Branch holati

| Branch | Holat | Ads bilan aloqasi |
|---|---|---|
| `main` (= `origin/main`, `d670cfa`) | Stabilization ishi shu yerga merge qilingan (consent, lifecycle, real tracking, b2b_ads 0004/0005 migratsiyalari). **Hali deploy qilinmagan.** | Barcha mavjud b2b_ads kodi shu yerda |
| `origin/fix/ilmildizi-stabilization` | `main` bilan farq: 8 ↔ 14 commit. Alohida parallel Sprint/Blitz ishi | `b2b_ads`, `panel`, `accounts`, `frontend/src/app/panel` ga **tegmaydi** (o'zgargan: growth, sprint, DopamineOnboarding, useNeuralSprint). Konflikt xavfi yo'q |
| `feat/mini-app-landing-perf` | Ads bilan bog'liq emas | — |

Taklif: yangi branch `feat/ads-manager`, `main` (`d670cfa`) dan. `main` ga merge qilinmaydi, deploy qilinmaydi.

**Domen e'tibori:** topshiriqda `ads.ilmildiz.uz` / `ilmildiz.uz` yozilgan, lekin hozirgi jonli domen `ilmildizi.uz` (deploy/DEPLOY_DOCKER.md, `EXTRA_ALLOWED_HOSTS=ilmildizi.uz,...`). Kodda domen yozilmaydi (env orqali), lekin hujjat va env namunalarida qaysi biri ishlatilishi tasdiqlanishi kerak.

Baseline testlar: `tests.test_feed_ads` + `tests.test_rewards_b2b_safety` — **28 test, OK** (SQLite, 2026-11-04). Postgres'da bu sessiyada ishga tushirilmagan.

## 1. EXISTS / PARTIAL / MISSING / BROKEN matritsa

| Modul | Status | Dalil |
|---|---|---|
| `EduCenterCampaign` modeli | EXISTS | `backend/b2b_ads/models.py` — targeting (subject/region/score), starts_at/ends_at, max_leads, impressions/clicks counter |
| Campaign egasi (advertiser ↔ campaign bog'lanishi) | **MISSING** | Modelda owner/center FK yo'q. Faqat `center_name` matn maydoni |
| Lifecycle statuslar | PARTIAL | `lifecycle_status()`: paused/scheduled/ended/exhausted/active. **Draft, pending review, rejected yo'q** |
| `StudentLeadSubmission` | EXISTS | status NEW/CONTACTED/ENROLLED/REJECTED, `consent_at`, `guardian_confirmed`, bitta o'quvchi+kampaniya = bitta lid (servis darajasida, select_for_update) |
| Duplicate lead himoyasi | PARTIAL | Servis darajasida qulf bilan bor; DB `UniqueConstraint` yo'q |
| Lead submit oqimi + coin | EXISTS | `b2b_ads.services.submit_lead` atomik, kampaniya + profil qatori qulflanadi |
| Telegram lead notification | EXISTS | `_notify_center` — `on_commit` + background, `telegram_webhook_or_chat_id` |
| Targeting | EXISTS (oddiy) | `pick_campaign`: region → subject → score fallback. Faqat agregat segmentlar, o'quvchi identifikatsiyasi yo'q |
| Impression/click tracking | PARTIAL | Frontend: IntersectionObserver ≥50% / 1s (`frontend/src/lib/adTracking.ts`). Backend: user+campaign+kun dedup **faqat Redis cache** (`cache.add`) + `F()` counter. Vaqt qatori yo'q ⇒ sana oralig'i bo'yicha analitika va unique reach **imkonsiz**; cache tozalansa dedup yo'qoladi |
| Analytics servisi | PARTIAL | `campaign_metrics`: CTR, lead_rate, conversion — umrbod (lifetime) jami; spent/CPL/reach = `None` (to'g'ri — soxta emas) |
| Budget (pul) | **MISSING** | Byudjet = faqat `max_leads` (lid limiti). So'm/balans/charge modeli yo'q |
| Billing / payment gateway | **MISSING** | `premium.Payment` va `classroom.Payment` — qo'lda karta o'tkazmasi + chek skrinshoti, SA tasdiqlaydi. Click/Payme integratsiyasi yo'q. Advertiser balansi yo'q |
| Super Admin campaign API | EXISTS | `panel/api.py:4986–5232` — list/create/edit/toggle/delete, leads list, lead status (audit log bilan) |
| SA campaign UI | EXISTS | `frontend/src/app/panel/campaigns/page.tsx` (794 qator) |
| SA advertiser approval | **MISSING** | Advertiser tushunchasi yo'q |
| Advertiser API (`/api/v1/advertiser/...`) | **MISSING** | — |
| Advertiser role / permission | **MISSING** | `Profile.ROLE_CHOICES`: superadmin/teacher/student. `accounts/permissions.py`: IsSuperAdmin, IsTeacher |
| Biznes/markaz entity | PARTIAL (legacy, ishlatilmaydi) | `core.EducationCenter` (+ `TargetedCampaign`, `CenterLead`) — hech qaysi endpoint ishlatmaydi (`b2b_ads/services.py` docstring). Owner FK yo'q, `is_verified` default=True |
| Auth (login/register/refresh) | EXISTS | JWT (simplejwt), `/api/auth/login/`, `/register/`, `/refresh/`, `/me/`. Access 60 daqiqa, refresh 30 kun, rotation o'chiq. Login lockout bor |
| Token saqlash | EXISTS (cheklov bilan) | `localStorage` (`ilmildizi_access/refresh`). httpOnly cookie yo'q |
| Password reset | **MISSING** | Email infratuzilmasi (EMAIL_* sozlamalar) yo'q |
| Creative upload | **MISSING** | `logo`, `story_video_url` — faqat URL maydonlar. Media storage: lokal FileSystemStorage (`/media/`, nginx beradi) |
| Frontend hostname routing | **MISSING** | Next 16.3, `src/proxy.ts`/middleware yo'q. API so'rovlari same-origin `/api/*` (nginx/Next rewrite) |
| ALLOWED_HOSTS / CSRF / CORS | EXISTS (env) | `EXTRA_ALLOWED_HOSTS`, `FRONTEND_ORIGINS` env orqali; API JWT header, cookie emas ⇒ CORS credentials kerak emas. Same-origin proxy bo'lgani uchun ads subdomeni uchun CORS ham shart emas |
| nginx / TLS | PARTIAL | `server_name ${SERVER_NAME}` + bitta `CERT_NAME`. Subdomen uchun SERVER_NAME + sertifikat SAN kengaytirilishi kerak (server tomonda, tashqi konfiguratsiya) |
| Hard delete | BROKEN-risk | `panel_campaign_delete_api` kampaniyani butunlay o'chiradi (lidlar `SET_NULL` bo'lib "Umumiy"ga aylanadi) — advertiser uchun bunday API berilmasligi kerak |

## 2. Arxitektura qarori (taklif)

### 2.1 Frontend: bitta Next.js ilova, hostname-based entry point

- `frontend/src/proxy.ts` (Next 16 da middleware nomi): `Host` = `ads.*` bo'lsa so'rov `/ads-manager/*` route group'ga **rewrite** qilinadi; asosiy hostda `/ads-manager/*` to'g'ridan-to'g'ri ochilsa 404.
- Nega alohida ilova emas: Docker/nginx/deploy zanjiri o'zgarmaydi (yangi konteyner, port, build yo'q), dizayn tokenlari va `components/ui` qayta ishlatiladi. Kod `app/ads-manager/` va `components/ads/` ichida izolyatsiya qilinadi, student `AppShell` ishlatilmaydi.
- Sessiya izolyatsiyasi avtomatik: `localStorage` origin bo'yicha ajratilgan ⇒ `ads.` subdomenidagi token asosiy saytdagidan alohida.
- API: same-origin `/api/v1/advertiser/...` (nginx allaqachon `/api` ni Django'ga uzatadi) ⇒ CORS o'zgarishi shart emas.

### 2.2 Advertiser identifikatsiyasi — yangi rol emas, mavjud `core.EducationCenter` ni kengaytirish

- `Profile.role` ga `advertiser` qo'shilmaydi: o'qituvchi yoki o'quvchi ham markaz egasi bo'lishi mumkin, rol esa bitta. Ruxsat = "foydalanuvchi **tasdiqlangan** EducationCenter a'zosi".
- `core.EducationCenter` ga additive maydonlar: `owner` (FK User, null), `status` (`pending`/`approved`/`rejected`/`suspended`, default `pending`), `contact_name`, `contact_phone`, `reviewed_by`, `reviewed_at`, `review_note`. Yangi duplicate "Advertiser" modeli yaratilmaydi.
- `EduCenterCampaign.center` — FK EducationCenter, `null=True` (eski SA kampaniyalari egasiz qoladi va faqat SA boshqaradi).
- Permission: `IsApprovedAdvertiser` (DRF) + har bir querysetda `center__owner=request.user` filtri (object-level, 404 boshqa advertiser uchun).
- Ro'yxatdan o'tish: `POST /api/v1/advertiser/apply/` — yangi user (yoki mavjud login) + EducationCenter(status=pending). SA `/panel/advertisers` da tasdiqlaydi. Tasdiqlanmagan advertiser faqat "kutilmoqda" sahifasini ko'radi.
- Team members: keyingi bosqich (hozir bitta owner).

### 2.3 Kampaniya moderatsiyasi

- `EduCenterCampaign.review_status`: `draft` / `pending_review` / `approved` / `rejected` (+ `review_note`). Data migration: **mavjud barcha qatorlar `approved`** — jonli feed o'zgarmaydi.
- `live_campaigns()` ga qo'shiladi: `review_status='approved'` va (`center IS NULL` yoki `center.status='approved'`).
- Advertiser tomonidan tahrirlangan approved kampaniyaning creative/targeting maydonlari o'zgarsa — qayta `pending_review` (SA tasdiqlamaguncha ko'rsatilmaydi). Pause/resume qayta ko'rib chiqishsiz.
- Statuslar (UI): Draft · In review · Rejected · Scheduled · Active · Paused · Ended · Lead limit reached. Hech biri boshqasiga qo'shib yuborilmaydi.

### 2.4 Tracking — yangi `AdEvent` modeli (zarurligi)

Mavjud counter'lar quyidagilarni bera olmaydi: (1) sana oralig'i va trend, (2) unique reach, (3) cache yo'qolganda dedup, (4) audit. Shuning uchun:

- `b2b_ads.AdEvent(campaign, user, event, day, created_at)`, `UniqueConstraint(campaign, user, event, day)`.
- `track_event`: `INSERT ... ON CONFLICT DO NOTHING` (Django: `bulk_create(ignore_conflicts=True)` yoki `IntegrityError` ushlash) — dedup DB darajasida, parallel so'rovlar xavfsiz; yozuv yaratilgandagina eski `F()` counter oshiriladi (backward compat).
- Reach = `COUNT(DISTINCT user)` impression hodisalari bo'yicha oraliqda.
- Hajm: 1 qator/user/kampaniya/kun/event — 10k DAU × bir nechta kampaniya uchun maqbul; indeks `(campaign, day)`.

### 2.5 Leadlar va maxfiylik

- Advertiser faqat o'z kampaniyalari lidlarini ko'radi.
- Telefon/telegram faqat `consent_at IS NOT NULL AND guardian_confirmed`; aks holda maskalanadi (`+998 90 *** ** 67`).
- `weakest_topics`, `predicted_dtm_score` — markazga Telegram'da allaqachon yuboriladi; dashboardda ham ko'rsatiladi (rozilik matnida bor). `student_profile` id, username **hech qachon** qaytarilmaydi.
- Status o'zgarishi `AuditLog` ga yoziladi (mavjud panel patterni).
- CSV export: faqat roziligi bor lidlar, har export audit logga yoziladi. (Phase 5, ixtiyoriy.)
- DB: `UniqueConstraint(student_profile, campaign)` — dublikat jadvalda yo'qligi tekshirilgandan keyin.

### 2.6 Billing

To'lov infratuzilmasi advertiser uchun **tayyor emas** (faqat qo'lda karta o'tkazmasi, balans/charge/refund/reconciliation modeli yo'q). Shuning uchun:
- Billing sahifasi: "Hozircha mavjud emas" + byudjet = lid limiti (`max_leads`) tushuntiriladi.
- Spend, CPL, remaining budget (so'm) — `N/A`. CPC/CPM qo'shilmaydi.
- Kampaniyani faollashtirish uchun pul talab qilinmaydi, lekin **SA approval** majburiy.

### 2.7 Auth cheklovlari (hujjatlashtiriladi, o'zgartirilmaydi)

- JWT `localStorage` da — butun platforma arxitekturasi; httpOnly cookie'ga o'tish student loginini ham o'zgartiradi ⇒ bu topshiriq doirasidan tashqari. Ads subdomeni alohida origin bo'lgani uchun tokenlar ajratilgan.
- Password reset: email yo'q ⇒ amalga oshirilmaydi; SA panel orqali parol tiklash (mavjud bo'lsa) yoki Telegram orqali — keyingi ish.

## 3. API dizayni (yangi, faqat yo'q bo'lganlar)

Hammasi `backend/b2b_ads/advertiser_api.py`, prefix `/api/v1/advertiser/`:

| Method | Path | Izoh |
|---|---|---|
| POST | `apply/` | Ariza: user + EducationCenter(pending). AllowAny + throttle |
| GET/PATCH | `profile/` | Markaz profili, status |
| GET | `dashboard/?from=&to=` | Real metrikalar (AdEvent + leads) |
| GET/POST | `campaigns/` | Ro'yxat (search, status filter) / yaratish (draft) |
| GET/PATCH | `campaigns/{id}/` | Detal / tahrir |
| POST | `campaigns/{id}/submit/` | draft → pending_review |
| POST | `campaigns/{id}/pause/`, `resume/`, `end/`, `duplicate/` | Lifecycle |
| POST | `creatives/upload/` | Rasm/video, hajm + format validatsiyasi, MEDIA storage |
| GET | `audiences/` | Mavjud segmentlar: fanlar, hududlar (agregat; o'quvchi soni < k bo'lsa ko'rsatilmaydi) |
| GET | `leads/` , `leads/{id}/` | Faqat o'z lidlari, PII consent gate |
| POST | `leads/{id}/status/` | CRM status + audit |
| GET | `analytics/?from=&to=&campaign=` | Kunlik trend, taqqoslash |
| GET | `billing/` | `{available: false, reason}` |

SA uchun (`panel/api.py` ga qo'shimcha): `advertisers/` list, `advertisers/{id}/review/` (approve/reject/suspend), `campaigns/{id}/review/` (approve/reject). Mavjud SA campaign endpointlari o'zgarmaydi (faqat yangi maydonlar response'ga qo'shiladi).

## 4. Migratsiyalar (hammasi additive)

1. `core`: EducationCenter + `owner`, `status`, `contact_*`, `reviewed_*`. Mavjud qatorlar → `status='approved'` (data migration; jadval amalda bo'sh).
2. `b2b_ads`: EduCenterCampaign + `center` FK null, `review_status` (mavjudlar → `approved`), `review_note`, `objective`, `cta_text`, `banner` (FileField, null).
3. `b2b_ads`: `AdEvent` jadvali.
4. `b2b_ads`: lead `UniqueConstraint` — oldin dublikatlar tekshiriladi; bor bo'lsa migratsiya to'xtaydi (o'chirmaydi).

## 5. Bosqichlar

| Phase | Mazmuni | Asosiy fayllar |
|---|---|---|
| 2 | Migratsiya 1–2, `IsApprovedAdvertiser`, apply/profile API, SA advertiser review API+UI, `proxy.ts`, ads login/apply/pending sahifalari, ads shell | `core/models.py`, `b2b_ads/models.py`, `b2b_ads/advertiser_api.py`, `accounts/permissions.py`, `panel/api.py`, `frontend/src/proxy.ts`, `frontend/src/app/ads-manager/*` |
| 3 | Campaign CRUD + lifecycle + 7 qadamli wizard, SA campaign review | `advertiser_api.py`, `services.py` (`live_campaigns`), `app/ads-manager/campaigns/*` |
| 4 | Creative upload/preview, audiences | `advertiser_api.py`, `app/ads-manager/creatives`, `audiences` |
| 5 | Lead CRM, PII gate, audit, unique constraint | `advertiser_api.py`, `app/ads-manager/leads` |
| 6 | `AdEvent`, `track_event` qayta yozish, dashboard/analytics | `services.py`, `app/ads-manager/dashboard`, `analytics` |
| 7 | Billing "unavailable" sahifasi + hujjat | `app/ads-manager/billing`, `docs/ads-manager/` |
| 8 | Responsive, security testlar, Postgres'da to'liq suite, `next build`, deploy hujjati | testlar, `docs/ads-manager/DEPLOY.md` |

Har bosqichdan keyin: test, `tsc --noEmit`, regressiya (`test_feed_ads`, `test_rewards_b2b_safety`, `test_roles_permissions`), alohida commit.

## 6. Tashqi konfiguratsiya (kod emas — foydalanuvchi bajaradi)

- DNS (Ahost): `ads` A-record → VPS IP.
- Sertifikat: `certbot ... -d <apex> -d www.<apex> -d ads.<apex>` (SAN kengaytirish).
- Server `.env`: `SERVER_NAME` ga `ads.<apex>`; `backend/.env`: `EXTRA_ALLOWED_HOSTS` ga `ads.<apex>`.
- Deploy: `web` + `frontend` birga, migratsiyalar `web` start'da.

## 7. Qabul qilingan qarorlar (2026-11-04)

1. Branch: `feat/ads-manager` (`main` d670cfa dan).
2. Domen: `ads.ilmildizi.uz` (jonli `ilmildizi.uz` bilan bir xil apex).
3. Advertiser: `core.EducationCenter` kengaytiriladi, `Profile.role` o'zgarmaydi.
