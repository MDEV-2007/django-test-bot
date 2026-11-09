# IlmIldizi — Gemini 3.8 uchun yakuniy remediation va release-readiness topshirig‘i

**Repository:** `MDEV-2007/django-test-bot`  
**Muhit:** Google Antigravity / Gemini 3.8  
**Maqsad:** Oldingi auditda aniqlangan 6 ta muammoni to‘liq, xavfsiz va regressiyasiz hal qilish; natijani testlar va dalillar bilan tasdiqlash.

## 0. Asosiy topshiriq

Bu ishni oddiy kod yozish emas, production-critical engineering remediation sifatida bajaring. Hech bir bandni tashlab ketmang, faqat hujjatda `FIXED` deb belgilamang. Har bir muammoni koddan boshlab API, database, frontend, worker, test va deploy konfiguratsiyasigacha kuzating.

**Ish tartibi:**
1. Repository, branch, HEAD SHA, working tree va mavjud o‘zgarishlarni tekshiring. Mavjud foydalanuvchi o‘zgarishlarini saqlang.
2. Har bir vazifa bo‘yicha kod va barcha chaqiruvchilarini o‘qing.
3. Root cause, ta’sir doirasi va regression risklarini aniqlang.
4. Minimal, ammo to‘liq yechimni amalga oshiring.
5. Regression, edge-case va adversarial testlar yozing.
6. Testlarni haqiqatan ishga tushiring; command va natijani qayd qiling.
7. Backend testlari, frontend lint/typecheck/build, migration check va tegishli integration testlarni bajaring.
8. API contract, backward compatibility va mavjud foydalanuvchi ma’lumotlariga ta’sirni tekshiring.
9. To‘liq diff'ni ko‘rib chiqing; aloqasiz o‘zgarishlarni kiritmang.
10. Audit hujjatlarini faqat dalil bilan yangilang.

Biror vazifa tugamasa `PARTIAL` yoki `BLOCKED` deb qoldiring. Barcha bandlarni sun’iy ravishda `PASS` qilmang.

## 1. Qat’iy xavfsizlik qoidalari

### Production chegaralari
Foydalanuvchining alohida, aniq ruxsatisiz:
- Production VPS/SSH'ga kirmang.
- Production database'da migration, restore, delete yoki destructive query bajarmang.
- Production deploy, restart, rollback yoki cron o‘rnatmang.
- Production secret, encryption key, `.env` yoki provider credential'larini almashtirmang.
- Real foydalanuvchilarning MFA, payment, XP, coin, streak, test yoki progress ma’lumotlarini o‘zgartirmang.
- Production Groq API'ga test so‘rovi yubormang.
- Backup'larni tashqi storage'ga yuklamang yoki o‘chirmang.

Repository ichidagi kod, test, hujjat va izolyatsiyalangan lokal test muhitida ishlash mumkin.

### Secret va ma’lumotlar
- Secret, token, parol, passphrase yoki private key'ni source code, fixture, commit yoki logga yozmang.
- `.env` qiymatlarini terminal output yoki report'ga chiqarmang.
- Faqat `.env.example` ichida xavfsiz placeholder ishlating.
- Production ma’lumotlarini lokal testga ko‘chirmang.
- Tashqi servis testlarini mock qiling yoki opt-in staging test sifatida ajrating.

### Git
- `git reset --hard`, `git clean -fd`, force push, commit, merge yoki push qilmang.
- Foydalanuvchining mavjud uncommitted o‘zgarishlarini saqlang.
- Branch almashtirmang yoki rebase qilmang.
- Yakunda `git status` va `git diff`ni tekshiring.

### Engineering
- Avval mavjud arxitekturani tushuning; keraksiz parallel subsystem yaratmang.
- Mavjud coding style, API contract va dependency'larni saqlang.
- Client yuborgan score, reward, permission yoki success qiymatiga ishonmang.
- Server tasdiqlamagan operatsiyani UI muvaffaqiyat deb ko‘rsatmasin.
- Fail-closed talab qilingan joyda fail-open fallback qo‘shmang.
- Exception'larni yutib yubormang; secret'siz diagnostika yozing.
- Test o'tmagan bo‘lsa, tayyor deb e’lon qilmang.

---

# TASK 1 — SEC-NEW-001: Admin MFA secret'larini haqiqiy shifrlash

**Priority:** P1 — Security  
**Asosiy fayl:** `backend/accounts/admin_mfa.py` va unga bog‘liq model, migration, API, enrollment, recovery va testlar.

**Audit topilmasi:** `_seal_secret()` ichida `django.core.signing.dumps()` ishlatilgan. Signing shifrlash emas; TOTP secret maxfiyligini ta’minlamaydi.

## Maqsad
Admin TOTP secret'lari database'da plaintext yoki faqat imzolangan shaklda qolmasin. Ular alohida boshqariladigan key bilan authenticated encryption orqali saqlansin.

## Bajariladigan ishlar
1. MFA oqimini to‘liq trace qiling: secret yaratish, enrollment, QR/provisioning URI, saqlash, verification, recovery code, disable/reset, admin login/session, model, serializer va migration.
2. `signing.dumps()` va eski decrypt yo‘llarining barcha ishlatilishini toping.
3. AES-GCM yoki Fernet kabi authenticated encryption tanlang. Mavjud dependency'larni tekshiring; keraksiz dependency qo‘shmang.
4. Encryption key Django `SECRET_KEY`dan alohida environment/secret manager orqali olinsin. DB yoki source code'da saqlanmasin.
5. Ciphertext formatida version va key ID bo‘lsin; key rotation qo‘llab-quvvatlansin.
6. Ciphertext buzilgan, noto‘g‘ri key yoki noma’lum version bo‘lsa decrypt rad etilsin.
7. Legacy signing-based yozuvlar uchun xavfsiz, idempotent migration/transition rejasini tuzing. MFA enrollment'ni avtomatik bekor qilmang va ma’lumotni yo‘qotmang.
8. Legacy secret'ni faqat tegishli eski format va kerakli kalit mavjud bo‘lsa yangi formatga o‘tkazing. Aks holda `BLOCKED` deb belgilang; taxmin qilib tiklamang.
9. Production'da key yo‘q yoki yaroqsiz bo‘lsa fail-closed bo‘lsin. Development/test konfiguratsiyasini production'dan ajrating.
10. Key rotation'da eski key ID bilan decrypt, yangi key ID bilan encrypt, nazoratli re-encryption va rollback tartibini hujjatlashtiring.
11. `SECRET_KEY` rotatsiyasi TOTP secret'larni o‘qib bo‘lmaydigan holga keltirmasligini tekshiring.
12. Secret, provisioning URI va recovery code logga chiqmasin.
13. `.env.example` va deploy/security docs'ni placeholder bilan yangilang.

## Majburiy testlar
- Encrypt/decrypt round-trip.
- Database'dagi qiymat plaintext emasligi.
- Ciphertext tampering — decrypt rad etiladi.
- Noto‘g‘ri yoki yo‘q encryption key.
- Noma’lum format version/key ID.
- Legacy compatibility va migration.
- Eski key'dan yangi key'ga rotation.
- Migration idempotency va qisman bajarilish.
- Parallel MFA verification/enrollment.
- Recovery/reset regressiyasi.
- Secret logging qilinmasligi.

**Qabul mezoni:** TOTP secret authenticated encryption bilan saqlanadi; alohida key ishlatiladi; legacy uchun xavfsiz yo‘l bor; xato key bilan fail-closed; tegishli testlar bajarilgan. Production key rotation bajarildi deb da’vo qilmang.

---

# TASK 2 — LOOP-NEW-001: Learning Loop false offline success'ni yo‘qotish

**Priority:** P1 — Data integrity / Rewards  
**Asosiy fayl:** `frontend/src/hooks/useContinuousLoop.ts` va tegishli backend endpoint/reward kodlari.

**Audit topilmasi:** `restartCycle()` API xatosida lokal fallback orqali siklni ochishi, combo/daraxt state'ini o‘zgartirishi va success toast chiqarishi mumkin.

## Maqsad
Production'da cycle state va reward faqat backend tasdiqlagan natijaga asoslangan bo‘lsin. Offline/demo fallback production'da hech qachon ishlamasin.

## Bajariladigan ishlar
1. Frontend hook'dan backend endpoint'igacha to‘liq flow'ni trace qiling: restart, eligibility, cycle, combo, XP/coin, streak, tree/progress, idempotency, cache va UI notification.
2. `restartCycle()` va boshqa fallback'larni qidirib, server tasdig‘isiz state o‘zgartiradigan barcha yo‘llarni aniqlang.
3. Production'da faqat valid schema'li server success response cycle transition'ni tasdiqlasin.
4. Network error, timeout, 5xx, malformed/empty response, JSON parse va unknown error'da cycle/reward/combo/progress muvaffaqiyatli deb o‘zgarmasin.
5. 409 va 429 alohida, aniq business response sifatida ishlansin; retry ko‘rsatmasi xavfsiz qo‘llansin.
6. Offline/demo fallback zarur bo‘lsa, faqat explicit development/demo flag bilan ishlasin. Production build'da default false bo‘lsin va production'da yoqilmasligini test qiling.
7. Client yuborgan `success`, `cycle_completed`, `reward_granted`, `arena_won`, `combo` qiymatlarini backend ishonchli dalil deb qabul qilmasin.
8. Backend reward/cycle transition transaction va zarur lock/constraint bilan himoyalansin.
9. Duplicate request, parallel request, retry va response yo‘qolgan holatda duplicate reward/cycle bo‘lmasin. Mavjud idempotency mexanizmini tekshiring.
10. Backend response contract'ini tekshiring; frontend faqat valid schema va success status'dan keyin state yangilasin.
11. Xatoda aniq retry/error UI bo‘lsin. Tasdiqlanmagan operatsiyaga success toast, animation yoki reward ko‘rsatilmasin.
12. Optimistic update bo‘lsa, rollback va server confirmation qoidasi aniq bo‘lsin.
13. Offline navbat mavjud bo‘lsa, server tasdiqlamaguncha completion/reward deb hisoblanmasin.

## Majburiy testlar
- HTTP 200 valid response — bir marta yangilanish.
- HTTP 200 malformed response — success bo‘lmasligi.
- HTTP 409 va 429.
- HTTP 500/503.
- Network failure va timeout.
- JSON parse failure.
- Duplicate click/request va parallel request.
- Backend transaction rollback.
- Retry'dan keyin duplicate reward bo‘lmasligi.
- Production'da offline fallback o‘chiqligi.
- Demo fallback faqat explicit flag bilan ishlashi.
- Error holatida success toast/animation chiqmasligi.
- Client soxta reward/cycle success yuborganda backend rad etishi.

**Qabul mezoni:** Production cycle/reward faqat server tasdig‘i bilan o‘zgaradi; xato soxta success bermaydi; duplicate reward himoyalangan; backend/frontend test, lint va typecheck o'tadi.

---

# TASK 3 — PROD-NEW-001: Backup encryption, integrity va restore xavfsizligi

**Priority:** P1 — Data protection  
**Fayllar:** `deploy/scripts/backup.sh`, `deploy/scripts/restore.sh`, `deploy/scripts/crontab.example` va tegishli config/docs.

**Audit topilmasi:** Backup encryption optional; passphrase bo‘lmasa backup ochiq qolishi mumkin. Restore checksum bo‘lmasa warning bilan davom etishi mumkin.

## Maqsad
Production backup shifrlanmasdan yaratilmasin yoki off-site'ga yuborilmasin. Integrity tekshiruvisiz restore davom etmasin.

## Bajariladigan ishlar
1. Pipeline'ni to‘liq tekshiring: DB dump, media, archive, compression, encryption, checksum, local storage, off-site, retention, restore, verification, cron/monitoring.
2. Production mode'da encryption majburiy bo‘lsin. Key/passphrase yo‘q yoki yaroqsiz bo‘lsa non-zero exit bilan to‘xtasin.
3. Authenticated encryption ishlating. Kalit backup bilan bir joyda saqlanmasin.
4. Passphrase command-line argument, process list yoki shell history'da oshkor bo‘lmasin.
5. Backup va temporary fayllar hamda credential'lar uchun restrictive permissions qo‘llang.
6. Checksum manifest yarating; algoritm va qaysi fayl bosqichiga tegishli ekanini hujjatlashtiring.
7. Checksum yo‘q, noto‘g‘ri yoki mos kelmasa restore fail-closed bo‘lsin.
8. Restore oldidan archive format, encryption, checksum, expected contents va path traversal'ni tekshiring.
9. Absolute path, `../`, symlink abuse va kutilmagan fayllar orqali tashqariga yozishni bloklang.
10. Parallel backup/restore lock bilan cheklansin; stale lock uchun xavfsiz recovery bo‘lsin.
11. Local va off-site retention siyosatini belgilang; faqat siyosatga muvofiq o‘chiring.
12. Off-site upload xatosi backup success deb ko‘rsatilmasin; local-only va off-site status alohida bo‘lsin.
13. Xatolar secret'siz loglansin va non-zero exit qaytsin.
14. Restore'ni production DB'ga tegmasdan izolyatsiyalangan test DB/container'da sinang.
15. Restore'dan keyin schema, zarur table'lar va muhim invariant'larni tekshiring.
16. `crontab.example` xavfsiz namuna bo‘lsin; cron o‘rnatildi deb da’vo qilmang.
17. Key rotation, recovery va key yo‘qolishi oqibatlarini operator docs'da yozing.

## Majburiy testlar
- Encryption bilan backup yaratish.
- Key yo‘q bo‘lganda fail-closed.
- Noto‘g‘ri passphrase.
- Ciphertext tampering.
- Checksum yo‘q yoki mos emas.
- Buzilgan archive.
- Archive path traversal payload.
- Off-site upload failure.
- Disk space/permission failure.
- Parallel job lock.
- Retention.
- Izolyatsiyalangan DB'ga restore.
- Restore'dan keyingi schema/invariant tekshiruvi.
- Xatoda non-zero exit va success xabari chiqmasligi.

**Qabul mezoni:** Production encryption majburiy; checksum'siz restore yo‘q; extraction xavfsiz; off-site xatosi yashirilmaydi; isolated restore test o'tadi. Production cron/upload/restore bajardim deb yozmang.

---

# TASK 4 — GRADE-NEW-001: Groq grading, prompt injection va score integrity

**Priority:** P1/P2 — AI safety / Learning integrity  
**Fayllar:** `backend/tests_app/services/grading.py`, `backend/growth/ai_grader.py`, `backend/tests/test_open_answer_grading_cases.py` va bog‘liq API/reward kodlari.

**Audit topilmasi:** Injection himoyasi va strict parsing yaxshilangan, ammo quyidagi mantiq `is_correct=false` bo‘lsa ham yuqori score orqali javobni to‘g‘ri belgilashi mumkin:

```python
is_corr = bool((strict_flag and score_pct >= 50) or score_pct >= 75)
```

## Maqsad
Student javobi untrusted input bo‘lsin. AI output qat’iy tekshirilsin. AI modeli o‘zi XP, coin, certificate, premium access yoki yakuniy akademik natijani bevosita belgilamasin.

## Bajariladigan ishlar
1. To‘liq flow'ni trace qiling: student answer, sanitization, prompt construction, Groq request, parsing, score normalization, persistence, attempt completion, reward, analytics/feedback.
2. `is_correct` va score o‘rtasidagi qoidani aniq, izchil va testlangan business contract'ga aylantiring. Model flag'i va score zid bo‘lsa, zid qiymatlar avtomatik to‘g‘ri deb qabul qilinmasin.
3. Student answer system/developer instruction sifatida talqin qilinmasin.
4. System prompt, grading rubric, trusted metadata va untrusted student content qat’iy ajratilsin. Pattern filter yagona himoya bo‘lmasin.
5. “Ignore previous instructions”, fake role/JSON, prompt disclosure, tool/API call yoki reward talablarini data sifatida ko‘ring.
6. Model output qat’iy schema, type, required field, numeric range, string length va enum validation'dan o‘tsin.
7. `true`, `"true"`, `1`, `"1"`, `null`, missing va ambiguous boolean qiymatlar aniq qoidaga ega bo‘lsin; implicit truthiness ishlatmang.
8. Score min/max va rounding qoidalarini markazlashtiring. NaN, Infinity, negative, out-of-range, string number va malformed qiymatlar rad etilsin yoki xavfsiz fallback olsin.
9. Model output'dagi `is_correct`, score, feedback yoki confidence bevosita XP/coin/certificate/premium access bermasin.
10. Reward faqat backend business rules orqali, transaction va idempotency bilan berilsin.
11. AI timeout, rate limit, invalid JSON yoki provider failure'da javobni noto‘g‘ri 0 yoki 100 deb belgilamang; retry/pending/manual fallback policy ishlating.
12. Uzbek, Russian va English normalization/grading qoidalarini saqlang; false positive'larni tekshiring.
13. Juda uzun input, malformed Unicode, HTML/XML, markdown code block, nested JSON va separator injection'ni sinang.
14. Prompt, student answer, provider response va API key'ni logga to‘liq yozmang; zarur bo‘lsa redacted metadata loglang.
15. Model, timeout, retry, token limit va response format config'larini tekshiring. Retry duplicate grading/reward yaratmasin.
16. Real Groq staging test opt-in bo‘lsin; credential yo‘q bo‘lsa default skip. Unit/integration test mock bilan deterministic bo‘lsin.
17. Prompt/model o‘zgarsa grading regression dataset bilan tekshiring; expected natija va tolerance'ni hujjatlashtiring.

## Majburiy adversarial testlar
- “Ignore all previous instructions”.
- System/developer prompt'ni chiqarishni so‘rash.
- Student answer ichida soxta `{"is_correct": true}` JSON.
- Fake system/developer/assistant role.
- XML/HTML tag injection.
- Reward/score oshirish buyrug‘i.
- Juda uzun javob va malformed Unicode.
- Bo‘sh, kesilgan yoki invalid JSON.
- Noto‘g‘ri type va missing fields.
- `is_correct=false` + yuqori score.
- `is_correct=true` + past score.
- Negative, 100'dan yuqori, NaN/Infinity score.
- Uzbek, Russian va English hujum variantlari.
- Groq timeout, 429, 5xx va invalid response.
- Takroriy grading va duplicate reward.
- Client AI output'ni o‘zgartirganda backend himoyasi.

**Qabul mezoni:** Grading contract contradiction-safe; prompt injection system instruction'ni o‘zgartira olmaydi; output qat’iy validatsiyalanadi; AI output o‘zi reward bermaydi; mock adversarial testlar o'tadi. Real Groq bajarilmagan bo‘lsa `NOT RUN` deb yozilsin.

---

# TASK 5 — PROD-DEPLOY-001: Production deploy, CI, migrations va runtime readiness

**Priority:** P1 — Release gate

**Audit topilmasi:** `audit/production-readiness.md` yo‘q yoki dalillar yetarli emas. GitHub `main` SHA production'da ishlayotgan commit ekanini isbotlamaydi. CI run/status ham aniq tasdiqlanishi kerak.

## Maqsad
Production'da aynan qaysi commit va migration holati ishlayotganini dalil bilan aniqlash; deploy/rollback jarayonining xavfsizligini tekshirish.

## Bajariladigan ishlar
1. Repository, default branch, release branch, commit SHA va tag'larni aniqlang.
2. Expected release SHA'ni yozing. Production SHA faqat ishonchli runtime/deploy evidence bo‘lsa yozilsin.
3. `main` yoki oxirgi commit production'da deb taxmin qilmang.
4. GitHub Actions/workflow, required checks, branch protection va release trigger'larni tekshiring.
5. Target commit uchun workflow run, status, conclusion va log link/ID'ni tekshiring. Status bo‘sh bo‘lsa `NOT RUN` yoki `BLOCKED`.
6. Backend/frontend dependency, Dockerfile, Compose, runtime image va build artifact mosligini tekshiring.
7. Django migration graph, missing dependency, conflicting migration, `makemigrations --check`, `showmigrations`, migration order, data migration safety va rollback ta’sirini tekshiring.
8. Migration check'larni faqat local/isolated test DB'da bajaring. Production DB'ga ulanib migration qilmang.
9. Deploy order: pre-deploy backup → immutable artifact/image → deploy → migrate → health checks → worker/scheduler checks → traffic enable.
10. Partial failure va rollback strategiyasini tekshiring. DB migration rollback xavfsiz bo‘lmasa forward-fix/restore strategy yozing.
11. Backend, frontend, worker, scheduler va database versiyalari mosligini tekshiring.
12. Health check faqat HTTP 200 emas; zarur dependency, DB, cache va worker readiness'ni xavfsiz tekshirishini baholang.
13. Required environment variable mavjudligini qiymatni chiqarmasdan tekshirish yo‘lini yozing.
14. HTTPS/proxy, allowed hosts, CORS/CSRF, cookie flags, debug mode va production settings'ni ko‘rib chiqing.
15. Deploy script idempotent va fail-fast bo‘lsin; xatoni yashirib success ko‘rsatmasin.
16. `audit/production-readiness.md` yarating/yangilang. Har xulosa fayl, commit yoki workflow daliliga bog‘lansin.
17. Production'dan olinishi kerak bo‘lgan dalillarni operator checklist qiling; ruxsatsiz o‘zingiz olmang.

## Statuslar
- `PASS` — tekshiruv bajarilgan va dalil bilan tasdiqlangan.
- `FAIL` — tekshiruv bajarilgan va muammo topilgan.
- `BLOCKED` — production access/operator dalili kerak.
- `NOT RUN` — tekshiruv bajarilmagan.

## Hisobot maydonlari
Repository/branch; expected release SHA; production deployed SHA (dalil bilan yoki BLOCKED); GitHub Actions run ID/link va conclusion; required checks; migration graph/consistency; backup/rollback; backend/frontend/worker versiyalari; health check; required env var presence (secret'siz); operator amallari; yakuniy GO/NO-GO.

**Cheklov:** SSH/VPS, production DB, `.env`, deploy, restart, migration, rollback yoki cron'ga tegmang. GitHub commit production'da ishlayapti deb da’vo qilmang.

---

# TASK 6 — UI-REG-001: Analytics → Profile redirect va Pastel Studio redesign regressiya auditi

**Priority:** P2 — Product integrity / UX regression

**Audit topilmasi:** `/analytics` sahifasi `/profile` ga redirect qilmoqda. Profile ichida oldingi analytics funksiyalarining barchasi saqlanganligi isbotlanmagan. Pastel Studio redesign ko‘plab muhim sahifalarni o‘zgartirgan.

## Maqsad
Yangi UI dizaynni buzmasdan analytics funksiyalari, navigation, API integratsiya, responsive holat va accessibility saqlanganini tekshirish.

## Bajariladigan ishlar
1. Git history orqali redesign'dan oldingi analytics sahifasi va eski feature'larni aniqlang.
2. `/analytics` redirect qayerda va nima sababdan qo‘shilganini tekshiring.
3. Eski analytics inventarini tuzing: KPI/stat cards, kunlik/haftalik/oylik progress, fokus daqiqalari, study time, streak, test natijalari, accuracy, fan/mavzu natijalari, chart, activity history, filter/date range, loading/empty/error state va boshqa mavjud feature'lar.
4. Har bir feature yangi `/profile` ichida saqlanganmi, to‘g‘ri API'dan ma’lumot olyaptimi va oldingi semantikani saqlaganmi — tekshiring.
5. Yo‘qolgan feature bo‘lsa, yangi design system'ga mos tiklang. Eski va yangi UI'ni ko‘r-ko‘rona birlashtirmang.
6. `/analytics` deep link, refresh, browser back/forward va auth holatlarini tekshiring.
7. Sidebar, mobile tab bar, command palette, notification panel va ichki link'larda analytics navigation'ni tekshiring.
8. Pastel redesign sahifalarini smoke/regression test qiling:
   - dashboard;
   - profile;
   - analytics;
   - feed;
   - battles/arena;
   - tests catalog;
   - test attempt/exam;
   - test feedback/results;
   - study;
   - flashcards;
   - leaderboard;
   - reels;
   - premium;
   - payments;
   - shop;
   - login/register/onboarding.
9. Har sahifada API data, loading, empty, error, auth guard, permission va navigation'ni tekshiring.
10. Desktop/tablet/mobile'da overflow, clipped content, horizontal scroll, modal va fixed navigation'ni tekshiring.
11. Light/dark theme, contrast, focus, keyboard navigation, semantic labels va basic accessibility'ni tekshiring.
12. Button/link haqiqiy action bajarsin. Dead button, `href="#"`, placeholder, mock data yoki hardcoded production content qoldirmang.
13. UI redesign API contract yoki backend business logic'ni tasodifan o‘zgartirmaganini tekshiring.
14. `pastel-theme.css` global selector'lari style leakage bermayotganini tekshiring.
15. Performance: katta client component, ortiqcha re-render, layout shift, image optimization va bundle regression'ni tekshiring.
16. Mavjud visual design'ni o‘zboshimchalik bilan qayta yaratmang; faqat aniqlangan regression'larni tuzating.

## Majburiy testlar
- Eski analytics feature → yangi profile feature mapping.
- Analytics API success/empty/error/loading.
- `/analytics` redirect/deep link.
- Auth state.
- Desktop/mobile navigation.
- Responsive viewport smoke test.
- Light/dark theme.
- Keyboard/focus accessibility.
- Critical page render va console error.
- Button/link action.
- Mock/hardcoded data aniqlash.
- Mavjud va yangi regression testlar.

**Qabul mezoni:** Analytics'dan muhim feature yo‘qolmagan; redirect izchil; Pastel Studio'da critical regression yo‘q; API va backend business logic saqlangan; responsive/theme/navigation testlari o'tgan.

---

# 7. Yakuniy integratsion verification

6 vazifa tugagach, ularni birgalikda tekshiring.

## Kod va testlar
- Backend unit/integration testlar.
- Tegishli PostgreSQL testlari — faqat izolyatsiyalangan test DB'da.
- Frontend lint.
- TypeScript typecheck.
- Frontend production build.
- API contract/serializer testlari.
- Migration consistency.
- Security/adversarial tests.
- Critical UI smoke/regression tests.
- Backup/restore isolated test.

Har bir command va haqiqiy natijani qayd qiling. Test environment yetishmasa `NOT RUN` va sababini yozing.

## Security review checklist
- [ ] Plaintext yoki signing-only MFA secret qolmagan.
- [ ] Encryption key `SECRET_KEY`dan alohida.
- [ ] Production encryption fail-closed.
- [ ] Learning Loop success faqat server tasdig‘i bilan.
- [ ] Client-side reward authority yo‘q.
- [ ] Duplicate reward/cycle himoyalangan.
- [ ] AI output qat’iy validate qilinadi.
- [ ] Student prompt injection system instruction'ni o‘zgartira olmaydi.
- [ ] Backup encryption majburiy.
- [ ] Checksum'siz restore yo‘q.
- [ ] Archive extraction xavfsiz.
- [ ] Secret/PII logga chiqmaydi.
- [ ] Production debug va xavfli config yo‘q.
- [ ] Migration/deploy xatolari yashirilmaydi.

## Git review
- `git status --short`
- `git diff --check`
- To‘liq `git diff`
- O‘zgargan fayllar ro‘yxati
- Keraksiz dependency/generated file'lar
- Secret, `.env`, backup, DB dump yoki test artifact commitga kirmagan
- Avvaldan mavjud user o‘zgarishlari saqlangan

Hech qanday commit yoki push qilmang.

## Audit hujjatlari
Quyidagilarni yarating yoki yangilang:
1. `audit/remediation-status.md`
2. `audit/production-readiness.md`
3. Zarur bo‘lsa `audit/analytics-regression.md`

Har vazifa uchun root cause, o‘zgargan fayllar, yechim, test command'lari/natijasi, qolgan risk, production operator action va status bo‘lsin. Eski noto‘g‘ri `FIXED` da’volarini real holatga moslang. Hujjat koddan ustun emas.

---

# 8. Yakuniy GO / NO-GO qoidasi

`GO` faqat quyidagilarning barchasi dalil bilan bajarilganda:
1. MFA secret'lari authenticated encryption bilan himoyalangan.
2. Legacy MFA migration va key management yo‘li xavfsiz.
3. Learning Loop production'da faqat server tasdig‘i bilan cycle/reward beradi.
4. Duplicate cycle/reward himoyasi testlangan.
5. Groq grading input/output va reward flow xavfsiz.
6. Backup encryption majburiy va integrity tekshiriladi.
7. Restore izolyatsiyalangan muhitda sinovdan o‘tgan.
8. Analytics funksiyalarining hech biri yo‘qolmagan.
9. Pastel Studio redesign critical regression'siz.
10. Migration va CI holati dalil bilan tekshirilgan.
11. Production deployed SHA dalil bilan tasdiqlangan yoki qarorda aniq `BLOCKED` deb qayd etilgan.
12. Bajarilmagan test `PASS` deb yozilmagan.

Production SHA, cron, off-site backup yoki real secret rotation uchun operator ruxsati kerak bo‘lsa, koddagi ishlar tugagan bo‘lsa ham production readiness `BLOCKED` bo‘lib qoladi.

**Kod tuzatildi degani production tayyor degani emas.**

---

# 9. Gemini 3.8 uchun yakuniy hisobot formati

## A. Umumiy natija
- Branch:
- HEAD commit:
- Working tree:
- Yakuniy qaror: `GO / NO-GO / BLOCKED`

## B. 6 vazifa holati

| ID | Status | O‘zgargan fayllar | Test natijasi | Qolgan risk |
|---|---|---|---|---|
| SEC-NEW-001 | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| LOOP-NEW-001 | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| PROD-NEW-001 | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| GRADE-NEW-001 | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| PROD-DEPLOY-001 | PASS/FAIL/BLOCKED | ... | ... | ... |
| UI-REG-001 | FIXED/PARTIAL/BLOCKED | ... | ... | ... |

## C. Testlar
Har bir command va haqiqiy natija:
- PASS:
- FAIL:
- NOT RUN:
- Sabab:

## D. Security va data integrity
Har mezon uchun dalil keltiring. Faqat “secure” deb yozmang.

## E. Production operator checklist
Production'da qo‘lda bajariladigan ishlarni alohida yozing. Bajarilgan deb ko‘rsatmang.

## F. Qolgan muammolar
Severity (`P0/P1/P2/P3`), ta’sir, fayl/joy va keyingi harakat.

## G. Yakuniy qaror
`GO` faqat 8-bo‘lim shartlari bajarilganda. Aks holda `NO-GO` yoki `BLOCKED` va aniq sabab.

---

# Oxirgi talab

**Hech narsani tashlab ketmang.** 6 vazifaning har birini alohida yakunlang, keyin ularni birgalikda regression test qiling. Eski kodni shunchaki o‘chirish, testni o‘chirib muammoni yashirish, exception'ni yutish, hardcoded success, fake test yoki auditda asossiz `FIXED` yozish mumkin emas.

Birinchi navbatda repository holatini va mavjud o‘zgarishlarni tekshiring. Keyin yuqoridagi tartibda ishlang. Haqiqiy blocker bo‘lmasa, xavfsiz bajarish mumkin bo‘lgan ishlarni oxirigacha bajaring. Blocker bo‘lsa, uni yashirmang va qolgan mustaqil vazifalarni davom ettiring.
