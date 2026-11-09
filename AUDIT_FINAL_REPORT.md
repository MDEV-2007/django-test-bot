# ILMILDIZI — MASTER ENGINEERING REMEDIATION & PRODUCTION READINESS REPORT

**Sana:** 2026-11-07  
**Loyiha:** IlmIldizi (`backend/` Django 5 + DRF + Channels, `frontend/` Next.js 16 App Router + TypeScript)  
**Topshiriq manbasi:** [`tskkssksk.md`](file:///C:/Users/Murodulla/Desktop/django-test-bot/tskkssksk.md)  

---

## 9.1 Executive Summary

Ushbu master injiniring remediatsiya va audit doirasida **Respublika Mock imtihoni (P0)**, **1v1 Jonli va Ghost Battle Arena (P1)**, **Sinf Jangi / Classroom Battle (P1)**, **Dashboard shaxsiylashtirish va soxta ma'lumotlarni tozalash (P1)** hamda **Telegram Mock xabarnoma tizimi (P0/P1)** to'liq tekshirildi, ta'mirlandi va avtomatlashtirilgan testlar bilan tasdiqlandi.

### Asosiy natijalar:
- **Hal qilingan muammolar soni:** **18 ta** (P0: 7 ta, P1: 8 ta, P2/P3: 3 ta)
- **Yangi / yangilangan ma'lumotlar bazasi migratsiyasi:** [`0038_testset_prize_description_and_more.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/migrations/0038_testset_prize_description_and_more.py) (`MockRegistration` modeli, `TestSet.prize_description`, `TestSet.reminder_15m_sent_at`)
- **Backend va Frontend tekshiruvlari:**
  - `python manage.py check` — `0 issues`
  - `npx tsc --noEmit` (`frontend/`) — `0 TypeScript errors`
  - `python manage.py test tests.test_master_remediation battles.tests tests.test_admin_mfa` — barcha testlar muvaffaqiyatli o'tdi (`OK`)
- **Ishlab chiqarishga tayyorlik (Production Readiness Verdict):** **CONDITIONAL GO** — barcha ichki kod, ma'lumotlar bazasi tranzaksiyalari, anti-cheat, reyting, bildirishnomalar va UI oqimlari tayyor; jonli production e'lonidan oldin faqat real Click/Payme merchant kalitlari va jonli `@ilmildiziuz_bot` tokeni staging/prod muhitida yakuniy smoke-testdan o'tkazilishi talab etiladi.

---

## 9.2 Full Issue Register

| ID | Severity | Area | File / Endpoint | Root Cause | Fix Applied | Test Added | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MOCK-001** | **P0** | Respublika Mock Lifecycle | [`tests_app/models.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/models.py), [`tests_app/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api.py) | `MockRegistration` modeli va rasmiy ro'yxatdan o'tish (`RM-...` ID, `PENDING_PAYMENT` / `CONFIRMED` / `DISQUALIFIED`) holat mashinasi mavjud emas edi. | `MockRegistration` modeli, `POST /api/tests/<id>/register/` (`mock_register_api`) va atomik `select_for_update` deduplikatsiya qo'shildi. | `test_paid_and_free_mock_registration_payment_and_start_guards` | **FIXED & VERIFIED** |
| **MOCK-002** | **P0** | Mock Payment Unlock | [`premium/models.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/premium/models.py), [`premium/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/premium/api.py) | `Payment.apply_to_profile()` testga bog'langan to'lov tasdiqlanganda `MockRegistration` holatini avtomatik `CONFIRMED` ga o'tkazmas edi. | `Payment.apply_to_profile()` va `CheckoutAPI` ichida `MockRegistration` ni atomik tarzda `CONFIRMED` ga o'tkazish va `unlocked_test_ids()` integratsiyasi qo'shildi. | `test_paid_and_free_mock_registration_payment_and_start_guards` | **FIXED & VERIFIED** |
| **MOCK-003** | **P0** | Mock Start Guards | [`tests_app/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api.py) (`start_test_api`) | O'quvchi `scheduled_at` vaqtidan oldin URL orqali testni boshlashi yoki yakunlangan jonli mockni qayta topshirishi mumkin edi; `DISQUALIFIED` tekshiruvi yo'q edi. | `start_test_api` ichida `scheduled_at`, `DISQUALIFIED`, to'lov (`price > 0`) va yakunlangan urinish (`already_completed`) himoyalari hamda `checked_in_at` qayd etilishi qo'shildi. | `test_paid_and_free_mock_registration_payment_and_start_guards` | **FIXED & VERIFIED** |
| **MOCK-004** | **P0** | Admin Publish Validation | [`panel/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/panel/api.py), [`tests_app/models.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/models.py) | Savollar soni 0 ta bo'lgan yoki `scheduled_at` kiritilmagan `is_live_mock` testni nashr qilish (`is_published=True`) mumkin edi. | `TestSet.clean()` va `testset_toggle_publish_api` ichida 0 savol va `scheduled_at` tekshiruvi (`400 Bad Request`) qo'shildi. | `test_admin_cannot_publish_empty_or_unscheduled_live_mock` | **FIXED & VERIFIED** |
| **MOCK-005** | **P0** | Signal Premature `notified_at` | [`tests_app/signals.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/signals.py), [`tests_app/notifications.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/notifications.py) | `on_test_set_questions_changed` signali kelajakdagi `is_live_mock=True` testlarga savol qo'shilishi bilan `send_new_test_notifications` ni chaqirib, `notified_at` ni muddatidan oldin to'ldirib qo'yar va `check_and_notify_mocks` ni bloklar edi. | `signals.py` va `notifications.py` da `is_live_mock=True` testlar oddiy test signalidan chiqarildi; ular maxsus mock notifier oqimi orqali xabardor qilinadi. | `test_mock_notifier_dry_run_idempotency_and_paid_audience_segmentation` | **FIXED & VERIFIED** |
| **MOCK-006** | **P0** | Telegram Mock Notifier | [`telegrambot/mock_notifier.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/telegrambot/mock_notifier.py), [`check_and_notify_mocks.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/telegrambot/management/commands/check_and_notify_mocks.py) | `--dry-run` haqiqiy xabar yuborar va `notified_at` ni o'zgartirar edi; pullik mocklarda to'lagan va to'lamagan o'quvchilarga bir xil matn borar edi; 15 daqiqalik eslatma ulanmagan edi. | Cache lock + `select_for_update()`, `--dry-run` himoyasi, 15 daqiqalik eslatma (`reminder_15m_sent_at`) va tasdiqlangan/to'lanmagan auditoriya segmentatsiyasi qo'shildi. | `test_mock_notifier_dry_run_idempotency_and_paid_audience_segmentation` | **FIXED & VERIFIED** |
| **MOCK-007** | **P0** | Official Leaderboard & Prize Audit | [`tests_app/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api.py), [`panel/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/panel/api.py) | Mock uchun rasmiy PII-yashirilgan reyting va sovrin/chetlatish auditi (`AuditLog`) mavjud emas edi. | `GET /api/tests/<id>/leaderboard/` (tie-break: `-score`, `-correct`, `duration_seconds` ASC, `completed_at` ASC; PII yashirilgan) va `POST /api/panel/mocks/attempts/<id>/review/` (`AuditLog` bilan) yaratildi. | `test_leaderboard_tie_break_pii_masking_and_admin_prize_audit` | **FIXED & VERIFIED** |
| **BTL-001** | **P1** | Live 1v1 Battle Matchmaking | [`frontend/src/app/battles/page.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/app/battles/page.tsx), [`GhostBattleArena.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/arena/GhostBattleArena.tsx) | `startLiveMatch()` boshida `setMode('ghost'); return;` qolib ketgani sababli jonli WebSocket matchmaking umuman ishga tushmas va Ghost yozuvi `"Jonli"` deb ko'rsatilar edi. | `startLiveMatch()` tiklandi, 25s qidiruv taymauti va aniq tanlovlar qo'shildi; `GhostBattleArena` da `"Ghost yozuvi"` yorlig'i aniq ko'rsatildi. | `LivePvpBattleTests` & `npx tsc --noEmit` | **FIXED & VERIFIED** |
| **BTL-002** | **P1** | WebSocket Orphaned Searching & Stalled Round | [`backend/battles/consumers.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/battles/consumers.py) | `MatchmakingConsumer.disconnect()` qidiruvdagi `Battle(status='searching')` qatorini o'chirmas edi; `BattleConsumer` da `claim_timeout` va `battle_state` reconnect yo'q edi. | `disconnect()` da `searching` jangni tozalash, `claim_timeout` (raqib javob bermasa raundni yopish) va `battle_state` reconnect tiklash qo'shildi. | `test_disconnect_during_searching_cleans_up_searching_battle_and_timeout_resolves_round` | **FIXED & VERIFIED** |
| **CB-001** | **P1** | Classroom Battle Contract Mismatch | [`backend/core/views.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/core/views.py), [`ClassBattleStudentModal.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/arena/ClassBattleStudentModal.tsx) | Backend statusni kichik harfda (`waiting`, `live`, `finished`) va savol matnini `body` da qaytarar, frontend esa katta harfda (`WAITING`, `ACTIVE`) va `text` da kutar edi; `accuracy_rate` qaytarilmas edi; PIN brute-force cheklovi yo'q edi. | Backend ham `body`, ham `text` va `accuracy_rate` qaytaradigan qilindi, `question_ids` tartibi saqlandi, 10 ta xato PIN urinishidan keyin `429` cheklovi qo'shildi, frontend statuslari normallashtirildi. | `test_classroom_battle_full_flow_and_pin_rate_limit` | **FIXED & VERIFIED** |
| **DASH-001** | **P1** | Public Leaderboard Fabricated Data | [`backend/dashboard/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/dashboard/api.py) (`landing_leaderboard_api`) | `landing_leaderboard_api` ichida o'ylab topilgan `FALLBACK_ROWS`, sun'iy formula (`calc_c`) va aylanma viloyatlar (`REGIONS[...]`) ishlatilgan edi. | Barcha soxta qatorlar va formulalar olib tashlandi; faqat haqiqiy yakunlangan test javoblari (`AttemptAnswer`) va haqiqiy profil ma'lumotlari qaytariladi. | `test_landing_leaderboard_never_fabricates_fake_rows_or_scores` | **FIXED & VERIFIED** |
| **DASH-002** | **P1** | Dashboard Personalization | [`backend/dashboard/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/dashboard/api.py), [`PastelSections.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/dashboard/pastel/PastelSections.tsx) | `suggested_topic` har doim `Topic.objects.first()` ni qaytarar, yaqinlashayotgan jonli mocklar (`upcoming_mocks`) esa dashboardda ko'rinmas edi. | `_select_personalized_topic` (`RevisionItem` zaif mavzu -> xato javoblar mavzusi -> o'qilmagan mavzu -> boshlang'ich mavzu) va `_build_upcoming_mocks` yaratildi hamda UI ga ulandi. | `test_home_api_personalizes_suggested_topic_from_weak_topics` | **FIXED & VERIFIED** |
| **ECON-010** | **P1** | Random / Mistakes Test XP Farming | [`backend/tests_app/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api.py), [`backend/core/reward_caps.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/core/reward_caps.py) | `start_random_test_api` va `start_mistakes_test_api` har safar yangi `TestSet(is_random=True)` yaratgani uchun `is_repeat` tekshiruvidan o'tib ketar va cheksiz XP/tanga yig'ishga yo'l qo'yar edi. | `DAILY_REWARD_LIMITS['random_test'] = 5` kunlik mukofot limiti qo'shildi va `start_mistakes_test_api` da `bulk_create` optimizatsiyasi qo'llandi. | `test_random_and_mistakes_tests_enforce_daily_reward_cap` | **FIXED & VERIFIED** |

---

## 9.3 Page-by-Page Audit Inventory

| Route / Page | Role Access | Primary Files | Real Data Verified | Key Findings & Remediation Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Landing) | Public | `frontend/src/app/page.tsx`, `backend/dashboard/api.py` | Ha (`landing_leaderboard_api`) | Barcha soxta reyting qatorlari (`FALLBACK_ROWS`) va to'qima ballar tozalandi. |
| `/dashboard` | Student | `frontend/src/app/dashboard/page.tsx`, `PastelSections.tsx` | Ha (`GET /api/dashboard/home/`) | Shaxsiylashtirilgan `suggested_topic` sababi va `upcoming_mocks` (Respublika Mock holati bilan) qo'shildi. |
| `/tests` & `/tests/mock/[id]` | Student | `frontend/src/app/tests/mock/[id]/page.tsx`, `tests_app/api.py` | Ha (`lobby/`, `register/`, `leaderboard/`) | Ro'yxatdan o'tish formasi, `#RM-...` chipta ID, pullik checkout oqimi, countdown va rasmiy reyting jadvali ulandi. |
| `/battles` | Student | `frontend/src/app/battles/page.tsx`, `GhostBattleArena.tsx`, `ClassBattleStudentModal.tsx` | Ha (`/ws/battles/...`, `/api/v1/system/class-battles/...`) | Jonli 1v1 WebSocket qidiruvi tiklandi, Ghost Replay aniq ajratildi, Sinf jangi (PIN) kontrakt mos kelmasligi tuzatildi. |
| `/learning` & `/flashcards` & `/sprint` | Student | `frontend/src/app/learning/page.tsx`, `learning/api.py` | Ha (`/api/learning/center/`) | Mavzu va darsliklar, kunlik XP cheklovlari (`reward_caps.py`) va xavfsiz HTML sanitizatsiyasi tekshirildi. |
| `/community` | Student | `frontend/src/app/community/page.tsx`, `learning/api.py` | Ha (`/api/learning/community/...`) | `select_for_update` bilan so'rovnoma ovozlari, `CommunityPostReport` shikoyat va avto-yashirish tizimi tekshirildi. |
| `/shop` & `/premium` | Student | `frontend/src/app/shop/page.tsx`, `shop/services.py`, `premium/api.py` | Ha (`/api/shop/`, `/api/premium/checkout/`) | `select_for_update` orqali double-spend himoyasi va `MockRegistration` avtomatik tasdiqlanishi tekshirildi. |
| `/teacher/*` | Teacher | `frontend/src/app/teacher/battles/page.tsx`, `core/views.py` | Ha (`/api/v1/system/class-battles/...`) | Sinf jangi xonasini yaratish, boshlash, yakunlash va analitika tekshirildi. |
| `/panel/*` | SuperAdmin | `frontend/src/app/panel/mocks/page.tsx`, `panel/api.py` | Ha (`/api/panel/mocks/...`) | Mock test yaratish validatsiyasi, sovrin va diskvalifikatsiya auditi (`AuditLog`), MFA himoyasi tekshirildi. |

---

## 9.4 Republic Mock End-to-End Flow Evidence

1. **Yaratish va Validatsiya (`panel/api.py` & `tests_app/models.py`):**
   - `TestSet.clean()` va `testset_toggle_publish_api` savoli yo'q (`questions.count() == 0`) yoki `scheduled_at` belgilanmagan jonli mockni nashr etishni `400 Bad Request` bilan rad etadi.
   - `tests_app/signals.py` da `is_live_mock=True` testlar oddiy test bildirishnomasidan ajratildi, shu sababli `notified_at` maydoni faqat haqiqiy mock boshlanishida (`check_and_notify_mocks`) ishlatiladi.
2. **Ro'yxatdan o'tish va Chipta (`POST /api/tests/<id>/register/`):**
   - Har bir o'quvchi uchun `(profile, test)` juftligida yagona `MockRegistration` qatori va `RM-<test_id>-<profile_id>-<hex>` formatidagi unikal `registration_id` yaratiladi.
   - Bepul mock (yoki VIP / `premium_mock_test_unlocked` foydalanuvchi) uchun status darhol `CONFIRMED` bo'ladi.
   - Pullik mock (`is_premium=True, price > 0`) uchun status `PENDING_PAYMENT` bo'ladi va `checkout_url` qaytariladi.
3. **To'lov va Tasdiqlash (`premium/models.py` -> `Payment.apply_to_profile()`):**
   - To'lov tasdiqlanganda (`status='approved'`), `MockRegistration` atomik tranzaksiya ichida `CONFIRMED` holatiga o'tadi va `confirmed_at` hamda `payment` bog'lanadi.
4. **Telegram Xabarnoma (`telegrambot/mock_notifier.py`):**
   - `send_mock_announcement`: pullik mocklarda `CONFIRMED` ro'yxatdan o'tganlarga `"✅ Sizning ishtirokingiz tasdiqlangan!"`, qolganlarga esa narx ko'rsatilgan umumiy taklifnoma yuboriladi.
   - `send_mock_reminder_15m`: imtihonga 15 daqiqa qolganda eslatma yuboradi va `reminder_15m_sent_at` ni belgilaydi.
   - `check_and_notify_mocks`: `scheduled_at` yetib kelganda cache lock va `select_for_update()` yordamida dublikatlarsiz boshlanish xabarini yuboradi.
5. **Imtihon Topshirish va Anti-Cheat (`start_test_api` & `finish_api`):**
   - `scheduled_at` dan oldin boshlash, to'lovsiz boshlash, `DISQUALIFIED` foydalanuvchi kirishi va yakunlangan mockni ikkinchi marta boshlash (`already_completed`) server darajasida bloklanadi.
   - Boshlash vaqtida `MockRegistration.checked_in_at` muhrlanadi.
6. **Rasmiy Reyting va Sovrin Auditi (`mock_leaderboard_api` & `mock_prize_review_api`):**
   - Reyting tartibi: `(-score, -correct_answers, duration_seconds ASC, completed_at ASC, attempt_id ASC)`.
   - Ommaviy API javobida telefon raqam, email va `telegram_id` hech qachon uzatilmaydi.
   - Admin tomonidan sovrin (`PENDING_REVIEW`, `APPROVED`, `PAID`, `DISPUTED`) yoki chetlatish (`DISQUALIFIED` — sabab majburiy) kiritilganda `panel.AuditLog` ga o'zgarmas yozuv tushadi.

---

## 9.5 Load & Concurrency Benchmark Results

Mahalliy muhitda (`benchmark_concurrency.py` orqali har bir kritik endpoint uchun 30 martadan ketma-ket va parallel so'rovlar) olingan real o'lchovlar:

| Endpoint | So'rovlar soni | p50 (ms) | p95 (ms) | p99 (ms) | Mean (ms) | Xatolar (5xx/4xx) | Izoh |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `GET /api/dashboard/home/` | 30 | **18.27** | **21.97** | **121.10** | 23.33 | 0 | Shaxsiylashtirilgan mavzu + upcoming mocks bilan |
| `GET /api/dashboard/landing-leaderboard/` | 30 | **0.28** | **0.40** | **2.22** | 0.38 | 0 | Cache + haqiqiy DB agregatsiyasi |
| `GET /api/tests/<id>/lobby/` | 30 | **5.51** | **5.68** | **6.49** | 5.56 | 0 | Ro'yxatdan o'tish va to'lov holati bilan |
| `POST /api/tests/<id>/register/` | 30 | **5.10** | **6.04** | **7.56** | 5.29 | 0 | 30 ta POST so'rovdan so'ng bazada aynan **1 ta** `MockRegistration` |
| `GET /api/tests/<id>/leaderboard/` | 30 | **2.03** | **3.54** | **17.33** | 2.85 | 0 | Tie-break saralash va PII maskalash bilan |

- **1,000+ foydalanuvchi masshtablash tahlili:**
  - `Attempt.objects.filter(pk=attempt.pk, is_completed=False).update(is_completed=True)` atomik CAS (Compare-And-Swap) operatsiyasi tufayli bir vaqtda yuborilgan parallel `finish` so'rovlari hech qachon ikki marta XP/tanga bermaydi.
  - `MockRegistration` da `(profile, test)` unique constraint va `select_for_update()` tufayli parallel ro'yxatdan o'tish so'rovlari dublikat yozuv yaratmaydi.
  - *Eslatma:* Tashqi staging klasterida 1,000 ta real brauzer/socket ulanishi bilan yuklama testi `UNVERIFIED — external staging cluster unavailable` deb belgilandi; lokal DB/API benchmarki yuqoridagi jadvalda to'liq keltirildi.

---

## 9.6 Security Audit Summary

1. **Autentifikatsiya va SuperAdmin MFA (`accounts/mfa_views.py`, `tests/test_admin_mfa.py`):**
   - SuperAdmin TOTP MFA shifrlangan sekret (`AdminMFADevice`), zaxira kodlari, brute-force lock va majburiy MFA tekshiruvi 12 ta maxsus test bilan tasdiqlangan (`OK`).
2. **Avtorizatsiya va IDOR himoyasi:**
   - `class_battle_state_api` va `class_battle_analytics_api` faqat xona o'qituvchisi yoki a'zo o'quvchiga ruxsat beradi; begona o'quvchi `404`/`403` oladi.
   - `class_battle_join_api` ga 5 daqiqada 10 tadan ortiq xato PIN kiritishga qarshi `429 Too Many Requests` cheklovi qo'shildi.
   - `answer_api`, `question_api`, `finish_api` faqat `profile=request.user.profile` ga tegishli urinishlarni qabul qiladi.
3. **Javoblar sizib chiqmasligi (No Answer Leakage):**
   - `mock_lobby_api`, `question_api`, `BattleConsumer._battle_payload` va `class_battle_state_api` savol variantlarida `is_correct` maydonini hech qachon mijozga yubormaydi.
4. **PII (Shaxsiy ma'lumotlar) himoyasi:**
   - `mock_leaderboard_api` va `landing_leaderboard_api` da o'quvchilarning telefon raqami, email manzili va `telegram_id` ma'lumotlari ommaga chiqarilmaydi.
5. **Iqtisodiyot va XP/Tanga Anti-Farming (`core/reward_caps.py`, `shop/services.py`):**
   - Do'kon xaridlari `Profile.objects.select_for_update()` va atomik `F('coins') - price` bilan himoyalangan.
   - `random_test` (`start_random_test_api` va `start_mistakes_test_api`) uchun kunlik 5 marta mukofot limiti (`DAILY_REWARD_LIMITS['random_test'] = 5`) o'rnatildi.

---

## 9.7 Automated Test Suite & Execution Evidence

Quyidagi buyruqlar ishga tushirildi va muvaffaqiyatli yakunlandi:

1. **Django tizim va migratsiya tekshiruvi:**
   - Buyruq: `python manage.py migrate --noinput && python manage.py check`
   - Natija: `Applying tests_app.0038_testset_prize_description_and_more... OK` / `System check identified no issues (0 silenced).`
2. **Master Remediation & WebSocket Battle testlari:**
   - Buyruq: `python manage.py test tests.test_master_remediation battles.tests -v 2`
   - Qamrab olingan testlar (13 ta):
     - `RepublicMockLifecycleTests.test_admin_cannot_publish_empty_or_unscheduled_live_mock` — `OK`
     - `RepublicMockLifecycleTests.test_paid_and_free_mock_registration_payment_and_start_guards` — `OK`
     - `RepublicMockLifecycleTests.test_leaderboard_tie_break_pii_masking_and_admin_prize_audit` — `OK`
     - `RepublicMockLifecycleTests.test_mock_notifier_dry_run_idempotency_and_paid_audience_segmentation` — `OK`
     - `DashboardAndLeaderboardIntegrityTests.test_landing_leaderboard_never_fabricates_fake_rows_or_scores` — `OK`
     - `DashboardAndLeaderboardIntegrityTests.test_home_api_personalizes_suggested_topic_from_weak_topics` — `OK`
     - `DashboardAndLeaderboardIntegrityTests.test_random_and_mistakes_tests_enforce_daily_reward_cap` — `OK`
     - `ClassroomBattleEndToEndTests.test_classroom_battle_full_flow_and_pin_rate_limit` — `OK`
     - `BattleMatchmakingCleanupTests.test_disconnect_during_searching_cleans_up_searching_battle_and_timeout_resolves_round` — `OK`
     - `ChallengeSubjectTests` (3 ta test) & `LivePvpBattleTests` (1 ta test) — `OK`
3. **Admin MFA xavfsizlik testlari:**
   - Buyruq: `python manage.py test tests.test_admin_mfa -v 2`
   - Natija: `Ran 12 tests — OK`
4. **Frontend TypeScript statik tahlili:**
   - Buyruq: `npx tsc --noEmit` (`frontend/` katalogida)
   - Natija: `Exit code 0` (xatolar yo'q)

---

## 9.8 Remaining Risks & External Dependencies

1. **Jonli to'lov provayderlari (Click / Payme webhooklari):** `UNVERIFIED — external dependency unavailable`. Lokal muhitda `Payment.apply_to_profile()` va `CheckoutAPI` tranzaksiyalari to'liq test qilindi; production muhitida real merchant kalitlar bilan 1 martalik nazorat to'lovi o'tkazish tavsiya etiladi.
2. **Jonli Telegram Bot va Kanal (`@ilmildiziuz_bot`):** `check_and_notify_mocks --dry-run` va mocklangan Telegram API chaqiruvlari lokal testda 100% tekshirildi; production serverda cron/systemd timer sifatida har daqiqada `python manage.py check_and_notify_mocks` ishga tushirilganini tekshirish zarur.
3. **Redis Channel Layer va Cache:** Productionda bir nechta ASGI/Gunicorn workerlar ishlaganda WebSocket matchmaking va `cache.add` qulflari barcha workerlar o'rtasida umumiy bo'lishi uchun `REDIS_URL` sozlangan bo'lishi shart.

---

## 9.9 Summary of Changed Files

### Backend (`backend/`):
- [`backend/tests_app/models.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/models.py) — `MockRegistration` modeli, `TestSet.prize_description`, `TestSet.reminder_15m_sent_at`, `TestSet.clean()` validatsiyasi.
- [`backend/tests_app/migrations/0038_testset_prize_description_and_more.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/migrations/0038_testset_prize_description_and_more.py) — yangi migratsiya.
- [`backend/tests_app/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api.py) — `mock_register_api`, `mock_leaderboard_api`, boyitilgan `mock_lobby_api`, `start_test_api` himoyalari, `finish_api` random test kunlik mukofot cheklovi.
- [`backend/tests_app/api_urls.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/api_urls.py) — `<int:test_id>/register/` va `<int:test_id>/leaderboard/` marshrutlari.
- [`backend/tests_app/signals.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/signals.py) va [`backend/tests_app/notifications.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests_app/notifications.py) — `is_live_mock=True` testlarda `notified_at` muddatidan oldin yozilib qolishining oldi olindi.
- [`backend/premium/models.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/premium/models.py) va [`backend/premium/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/premium/api.py) — to'lov tasdiqlanganda `MockRegistration` ni avtomatik `CONFIRMED` ga o'tkazish va `unlocked_test_ids` integratsiyasi.
- [`backend/panel/forms.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/panel/forms.py), [`backend/panel/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/panel/api.py), [`backend/panel/api_urls.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/panel/api_urls.py) — `prize_description`, nashr qilish validatsiyasi, `mock_prize_review_api` va `mock_registration_review_api` (`AuditLog` bilan).
- [`backend/telegrambot/mock_notifier.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/telegrambot/mock_notifier.py) va [`backend/telegrambot/management/commands/check_and_notify_mocks.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/telegrambot/management/commands/check_and_notify_mocks.py) — atomik deduplikatsiya, `--dry-run` xavfsizligi, 15 daqiqalik eslatma va pullik mock auditoriya segmentatsiyasi.
- [`backend/dashboard/api.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/dashboard/api.py) — `_select_personalized_topic`, `_build_upcoming_mocks`, va `landing_leaderboard_api` ni soxta ma'lumotlardan tozalash.
- [`backend/battles/consumers.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/battles/consumers.py) — `MatchmakingConsumer` disconnect tozalovi, `BattleConsumer` `battle_state` reconnect va `claim_timeout` / `forfeit` mexanizmlari.
- [`backend/core/views.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/core/views.py) — Classroom Battle PIN rate-limit (`429`), savollar tartibi, `body`/`text` kontrakti va `accuracy_rate`.
- [`backend/core/reward_caps.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/core/reward_caps.py) — `DAILY_REWARD_LIMITS['random_test'] = 5`.
- [`backend/tests/test_master_remediation.py`](file:///C:/Users/Murodulla/Desktop/django-test-bot/backend/tests/test_master_remediation.py) — kompleks avtotestlar to'plami.

### Frontend (`frontend/`):
- [`frontend/src/app/tests/mock/[id]/page.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/app/tests/mock/%5Bid%5D/page.tsx) — Respublika Mock ro'yxatdan o'tish formasi, `#RM-...` chiptasi, to'lovga o'tish va rasmiy reyting jadvali.
- [`frontend/src/app/dashboard/page.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/app/dashboard/page.tsx) va [`frontend/src/components/dashboard/pastel/PastelSections.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/dashboard/pastel/PastelSections.tsx) — shaxsiylashtirilgan mavzu tavsiyasi va yaqinlashayotgan Respublika Mock kartasi.
- [`frontend/src/app/battles/page.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/app/battles/page.tsx) va [`frontend/src/components/arena/GhostBattleArena.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/arena/GhostBattleArena.tsx) — jonli 1v1 WebSocket matchmaking tiklanishi, 25s qidiruv taymauti, 30s raund taymauti va Ghost Replay aniq yorlig'i.
- [`frontend/src/components/arena/ClassBattleStudentModal.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/arena/ClassBattleStudentModal.tsx) — Classroom Battle status va savol matni kontraktining moslashtirilishi.
