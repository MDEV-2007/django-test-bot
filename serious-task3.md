# IlmIldizi — Production Security & Stability Remediation

**Priority:** P0 → P1 → P2 → P3  
**Target:** Barcha ochiq audit muammolarini yopish  
**Mode:** Minimal token, maximum engineering quality

## GLOBAL RULES

1. Avval mavjud kod, testlar va konfiguratsiyani tekshir. Taxmin asosida o'zgartirma.
2. Faqat aniqlangan muammolarni tuzat. Ishlayotgan kodni keraksiz refactor qilma.
3. Har bir task: Inspect → Fix → Test → Verify.
4. Mavjud architecture va coding conventions'ni saqla.
5. Duplicate kod, ortiqcha abstraction va keraksiz dependency qo'shma.
6. Secret, token, password va production ma'lumotlarini log qilma.
7. Production serverga ruxsatsiz ulanma, `.env` qiymatlarini chiqarma yoki o'zgartirma.
8. Server access yoki tashqi API ruxsati kerak bo'lsa, aniq ko'rsatma ber va kut.
9. Testlarni imkon qadar targeted ishlat. To'liq suite'ni faqat yakuniy verification uchun bajar.
10. Har bir task yakunida qisqa natija yoz: FIXED / PARTIAL / BLOCKED.
11. Mavjud testlar muvaffaqiyatsiz bo'lsa, sababini aniqlamasdan testni o'chirma yoki zaiflashtirma.
12. Har bir o'zgarish uchun kerakli migration va regression test yoz.
13. Tasklar orasida unrelated fayllarni o'zgartirma.
14. Bir xil faylni qayta-qayta o'qima. Olingan kontekstdan foydalan.
15. Barcha tasklarni ketma-ket bajar. Bir taskdagi blocker qolgan mustaqil tasklarni to'xtatmasin.

---

# TASK 1 — P0 PAYMENT SECURITY

**Muammo:** To'lovni ruxsatsiz o'zini tasdiqlash xavfi.

**Maqsad:** Payment faqat vakolatli reviewer tomonidan tasdiqlanishi.

### Vazifalar
- Telegram callback'da reviewer identity tekshirilsin.
- Callback faqat ruxsatli payment channel'dan qabul qilinsin.
- `payment_id`, action va callback manbasi serverda tekshirilsin.
- Approve/reject atomik va idempotent bo'lsin.
- Bir payment ikkinchi marta tasdiqlanmasin.
- Oddiy user, bot yoki soxta callback orqali approval imkonsiz bo'lsin.
- Payment status o'zgarishi transaction ichida bajarilsin.

### Tests
- Unauthorized user approval.
- Fake channel callback.
- Duplicate callback.
- Concurrent approval.
- Rejected payment approval attempt.
- Valid reviewer approval.

**Acceptance:** Faqat vakolatli reviewer payment'ni bir marta tasdiqlay oladi.

---

# TASK 2 — P0 NEXT.JS RCE

**Muammo:** Next.js Remote Code Execution xavfi.

### Vazifalar
- Next.js versiyasini tekshir.
- `frontend/package.json` va lockfile versiyalari mosligini tekshir.
- Vulnerability mavjud bo'lgan dependency'larni xavfsiz versiyaga yangila.
- Production Docker build'ni tekshir.
- Build va runtime konfiguratsiyasini tekshir.
- Keraksiz development dependency'larni production image'dan chiqar.

### Tests
- `npm ci`
- `npm audit`
- `npm run build`
- Docker production build.
- Container startup va health check.

**Acceptance:** Zaif Next.js versiyasi ishlatilmasin, lockfile va Docker image yangilangan bo'lsin.

---

# TASK 3 — P1 SECRET ROTATION

**Muammo:** Oldingi Docker image ichida secret bo'lgan bo'lishi mumkin.

### Vazifalar
Quyidagilarni inventory qil:
- Django `SECRET_KEY`
- Telegram bot token
- Webhook secret
- Groq API key
- Database credentials
- JWT signing secrets (agar alohida ishlatilsa).

### Qoidalar
- Eski secret'larni kodga yozma.
- `.env` Git'ga tushmasin.
- Docker image layer'larida secret qolmasin.
- Secret'lar loglarda ko'rinmasin.
- Yangi secret'lar xavfsiz rotation tartibida joriy qilinsin.
- JWT rotation paytida mavjud session'larga ta'sirini hujjatlashtir.
- Telegram webhook va bot token rotation tartibini belgila.

**BLOCKER:** Production `.env` yoki server access bo'lmasa, rotation'ni bajardim deb yozma. Faqat xavfsiz rotation checklist va kerakli komandalarni tayyorla.

**Acceptance:** Barcha secret'lar yangilangan va eski qiymatlar bekor qilingan.

---

# TASK 4 — P2 BACKUP & RESTORE

**Muammo:** Backup o'sha serverda va shifrlanmagan bo'lishi mumkin.

### Vazifalar
- Mavjud `backup.sh` ni audit qil.
- PostgreSQL backup'ni off-site storage'ga yuborish imkonini yarat.
- Backup encryption qo'sh.
- Retention policy belgila.
- Backup muvaffaqiyati va xatolarini log qil.
- Backup integrity verification qo'sh.
- Restore script yoki aniq restore procedure tayyorla.

### Tests
- Test database backup.
- Off-site upload verification.
- Backup checksum.
- Alohida test database'ga restore.
- Restored database integrity check.

**Qoidalar:** Production database ustiga test restore qilma. Haqiqiy backup uchun alohida test environment ishlat.

**Acceptance:** Off-site encrypted backup va kamida bitta muvaffaqiyatli restore dalili.

---

# TASK 5 — P2 DATABASE CONNECTION MANAGEMENT

**Muammo:** ASGI worker'larda DB connection boshqaruvi yetarli tekshirilmagan.

### Vazifalar
- Hozirgi Gunicorn + Uvicorn worker configuration'ni tekshir.
- `CONN_MAX_AGE` va `CONN_HEALTH_CHECKS` sozlamalarini tekshir.
- PostgreSQL max connections bilan worker × connection hisobini solishtir.
- Real connection sonini o'lchash uchun monitoring query tayyorla.
- Zarurat bo'lsa PgBouncer variantini bahola.
- Pool qo'shishdan oldin real bottleneck mavjudligini aniqlash.

### Tests
- Concurrent API requests.
- Connection reuse.
- Worker restart.
- DB connection failure recovery.

**Acceptance:** Connection limit oshib ketmasin, keraksiz pool qo'shilmasin.

---

# TASK 6 — P3 POSTGRES PASSWORD

**Muammo:** Default PostgreSQL password `ilmildizi` bo'lishi mumkin.

### Vazifalar
- `.env.example`, Docker Compose va DB konfiguratsiyasini tekshir.
- Hardcoded default password production'da ishlatilmasin.
- Production DB password faqat environment secret orqali olinsin.
- Startup validation qo'sh: production'da insecure default password bo'lsa, startup fail qilsin.
- Loglarda password chiqarilmasin.

**BLOCKER:** Production `.env` access bo'lmasa, serverdagi haqiqiy password haqida xulosa qilma.

**Acceptance:** Production default password ishlatolmasligi kod darajasida kafolatlansin.

---

# TASK 7 — P3 ADMIN MFA

**Muammo:** Admin login'da MFA mavjud emas.

### Vazifalar
- Django admin authentication flow'ni tekshir.
- `django-otp` yoki xavfsiz TOTP yechimini tanla.
- Superuser va staff uchun MFA majburiy bo'lishi mumkinligini hisobga ol.
- Recovery code'larni xavfsiz saqla.
- Rate limiting va brute-force protection qo'sh.
- MFA yoqilmagan admin uchun xavfsiz enrollment flow yarat.
- Oddiy student login'iga salbiy ta'sir qilma.

### Tests
- Valid TOTP.
- Invalid TOTP.
- Replayed TOTP.
- Recovery code.
- Rate limiting.
- MFA enrollment.
- Existing admin login regression.

**Acceptance:** Admin MFA'siz protected admin sahifalariga kira olmasin.

---

# TASK 8 — P2 FE-003 LEARNING LOOP UI

**Muammo:** `feat/emerald-studio-redesign` branch'da Learning Loop kartasi yo'q.

### Vazifalar
- `main` va redesign branch'ni solishtir.
- Learning Loop komponentining oxirgi ishlaydigan versiyasini top.
- Redesign UI architecture'ga moslashtir.
- Kartani kerakli dashboard joyiga qaytar.
- API contract va backend bilan mosligini tekshir.
- Loading, empty, error va success state'larni qo'sh.
- Responsive dizaynni saqla.

**Qoidalar:** Faqat komponentni ko'chirish bilan cheklanma. Eski va yangi UI farqlarini tekshir. Ishlayotgan funksiyalarni yo'qotma.

### Tests
- Component rendering.
- API integration.
- Mobile responsive.
- Navigation.
- Empty/error states.

**Acceptance:** Learning Loop redesign branch'da to'liq ishlasin.

---

# TASK 9 — P2 GRADE-009 GROQ PROMPT INJECTION

**Muammo:** Prompt-injection himoyasi real Groq API bilan tekshirilmagan.

### Vazifalar
- AI prompt construction'ni audit qil.
- User input va system instruction'ni ajrat.
- Untrusted content'ni ishonchli instruction sifatida bajarmaslikni ta'minla.
- AI output'ni serverda validate qil.
- JSON schema va expected response format'ni tekshir.
- AI orqali XP, coins, payment yoki admin permissions o'zgartirilmasin.
- Prompt injection natijasida ichki prompt va secret oshkor bo'lmasin.

### Attack tests
- Direct prompt injection.
- Indirect prompt injection.
- System prompt extraction.
- Role override.
- JSON manipulation.
- Tool instruction injection.
- Uzbek, English va Russian injection.
- Malicious content inside educational questions.

### Groq test
- Faqat ruxsat mavjud bo'lsa real API test bajar.
- API key'ni hech qachon log qilma.
- Testlar uchun alohida input va natijalar ishlat.
- Groq API ishlamasa, MOCK testni REAL GROQ test deb ko'rsatma.

**Acceptance:** Attack testlar o'tsin, AI javobi server validation'dan o'tmasdan hech qanday muhim biznes amalini bajarmasin.

---

# TASK 10 — LOOP-003 DATABASE UNIQUE CONSTRAINT

**Muammo:** Lock bor, ammo DB unique constraint yo'q.

### Vazifalar
- `DailyLearningLoop` modelini tekshir.
- Unikal kombinatsiyani aniqlash: user + date + cycle number (haqiqiy model fieldlariga moslashtir).
- Existing duplicate record'larni aniqlash uchun migration oldi tekshiruv yoz.
- Duplicate ma'lumotlarni avtomatik o'chirma.
- Xavfsiz data migration tayyorla.
- DB unique constraint qo'sh.
- Parallel creation uchun transaction va retry logic qo'sh.

### Tests
- Parallel loop creation.
- Duplicate creation.
- Existing record recovery.
- PostgreSQL concurrency.

**Acceptance:** Bir xil user va cycle uchun DB darajasida duplicate loop yaratilmasin.

---

# TASK 11 — JWT REVOKE EDGE CASE

**Muammo:** Bir xil sekundda yaratilgan tokenlar uchun revoke vaqtida qisqa oyna bo'lishi mumkin.

### Vazifalar
- Token revocation implementation'ni tekshir.
- `iat`, `jti` va revoke timestamp logic'ni tahlil qil.
- Bir sekundlik precision muammosini bartaraf et.
- Redis mavjud bo'lmaganda ham revocation ishlasin.
- Logout va password reset flow'larini tekshir.

### Tests
- Same-second token creation.
- Revoke immediately after issue.
- Password reset.
- Logout.
- Multiple active tokens.

**Acceptance:** Revoke qilingan token keyingi request'da qabul qilinmasin.

---

# TASK 12 — REWARDCLAIM CLEANUP

**Muammo:** `RewardClaim` jadvali cheksiz o'sishi mumkin.

### Vazifalar
- Model va reward logic'ni tekshir.
- Retention policy belgila.
- Eski claim'larni tozalovchi Django management command yarat.
- Command dry-run rejimini qo'llasin.
- Batch delete ishlatsin.
- Muhim audit yozuvlarini o'chirmasin.
- Cron yoki scheduled job uchun deploy ko'rsatmasi tayyorla.

### Tests
- Dry-run.
- Retention cutoff.
- Batch deletion.
- Recent records preserved.
- Idempotency.

**Acceptance:** Eski yozuvlar xavfsiz tozalansin, mukofotlarni qayta olish imkoniyati paydo bo'lmasin.

---

# TASK 13 — DEPENDENCY SECURITY

### Daphne
- Production dependency graph'ni tekshir.
- Daphne production image'ga kiradimi aniqlab ber.
- Faqat development uchun kerak bo'lsa, dependency separation'ni to'g'rila.

### npm source-map-js
- Dependency tree va advisory'ni tekshir.
- Qaysi paket orqali kelayotganini aniqlagin.
- Mos xavfsiz versiyani tanla.
- Keraksiz dependency update qilma.

### Tests
- `pip-audit`
- `npm audit`
- `npm ci`
- Production build.

**Acceptance:** Qolgan vulnerability'lar hujjatlashtirilgan va xavfsiz tarzda bartaraf etilgan.

---

# TASK 14 — POSTGRESQL CONCURRENCY VERIFICATION

**Muammo:** PostgreSQL concurrency testlari yozilgan, ammo bajarilgani tasdiqlanmagan.

### Vazifalar
- `tests/test_concurrency_postgres.py` ni tekshir.
- Haqiqiy PostgreSQL test database ishlat.
- SQLite fallback bilan natijani almashtirma.
- Parallel reward, payment, sprint va loop operatsiyalarini sinovdan o'tkaz.
- Race condition va duplicate transaction'larni tekshir.
- Failed testlarni tuzat.

### Acceptance
- PostgreSQL concurrency testlari muvaffaqiyatli o'tsin.
- Natijalar va bajarilgan test soni qayd etilsin.
- Testlar ishlamasa, sabab BLOCKED deb yozilsin.

---

# TASK 15 — FINAL VERIFICATION

Barcha tasklardan so'ng:

1. Django tests.
2. PostgreSQL concurrency tests.
3. Frontend typecheck.
4. Frontend production build.
5. Dependency security scan.
6. Django system checks.
7. Migration consistency check.
8. Docker production build.
9. Git diff review.
10. Secret leakage scan.

### Git qoidalari
- User'ning mavjud o'zgarishlarini o'chirma.
- `git reset --hard` ishlatma.
- `git clean -fd` ishlatma.
- User ruxsatisiz commit, push yoki merge qilma.
- Migrationlarni tekshirmasdan squash qilma.

---

# FINAL REPORT

Oxirida `audit/remediation-status.md` faylini yarat yoki yangila.

Har bir task uchun:

| Task | Status | Files | Tests | Remaining risk |
|---|---|---|---|---|
| P0 Payment | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| P0 RCE | FIXED/PARTIAL/BLOCKED | ... | ... | ... |
| Secret rotation | ... | ... | ... | ... |
| Backup | ... | ... | ... | ... |
| DB connections | ... | ... | ... | ... |
| PostgreSQL password | ... | ... | ... | ... |
| Admin MFA | ... | ... | ... | ... |
| Learning Loop UI | ... | ... | ... | ... |
| Groq injection | ... | ... | ... | ... |
| LOOP-003 | ... | ... | ... | ... |
| JWT revoke | ... | ... | ... | ... |
| RewardClaim cleanup | ... | ... | ... | ... |
| Dependencies | ... | ... | ... | ... |
| PostgreSQL concurrency | ... | ... | ... | ... |

## EXECUTION INSTRUCTION

Ishni TASK 1 dan boshla. Tasklarni tartib bilan bajar.

Keraksiz tushuntirish, uzoq tahlil, qayta yozilgan kod va har taskdan keyin katta hisobot bermagin.

Faqat muhim blocker yoki qaror kerak bo'lgan joyda to'xta.

**Asosiy maqsad: IlmIldizi production kodini xavfsiz, barqaror va tekshirilgan holatga keltirish.**