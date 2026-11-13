# IlmIldizi --- Production Security & Stability Remediation

**Repository:** `MDEV-2007/django-test-bot`\
**Muhit:** Google Antigravity / Gemini Argon\
**Maqsad:** NO-GO holatini bartaraf etish va production release uchun
xavfsiz GO/NO-GO qarorini olish.

------------------------------------------------------------------------

## Gemini Argon uchun asosiy ko'rsatmalar

Ushbu hujjatdagi vazifalarni ketma-ket bajaring: **SEC-NEW-001 →
LOOP-NEW-001 → GRADE-NEW-001 → PROD-NEW-001 → PROD-DEPLOY-001**.

Har bir vazifada:

1.  Avval mavjud kod va bog'liq oqimlarni to'liq tekshiring.
2.  Muammoning sababini aniqlang; taxmin asosida kod o'zgartirmang.
3.  Faqat kerakli joylarni minimal o'zgartiring.
4.  Har bir bug uchun regression test yozing.
5.  Testlarni haqiqatda ishga tushiring. Ishga tushmagan testni PASS deb
    ko'rsatmang.
6.  `git diff`ni tekshiring; aloqasiz o'zgarishlarni kiritmang.
7.  Har bir vazifani `FIXED`, `PARTIAL` yoki `BLOCKED` deb belgilang.
8.  Yakunda o'zgargan fayllar, bajarilgan testlar, natijalar va qolgan
    risklarni yozing.

### Qat'iy xavfsizlik qoidalari

-   Production VPS/SSH, database, cron yoki deploy jarayoniga ruxsatsiz
    tegmang.
-   Production `.env` faylini o'qimang, o'zgartirmang yoki qiymatlarini
    logga chiqarmang.
-   Hech qanday secret, token, parol yoki backup passphrase'ni source
    code yoki test fixture ichiga yozmang.
-   Production database'da migration, restore, delete yoki destructive
    command bajarmang.
-   Production secret rotation yoki deploymentni foydalanuvchining
    alohida ruxsatisiz bajarmang.
-   `git reset --hard`, `git clean -fd`, force push, commit, merge yoki
    push qilmang.
-   Mavjud MFA enrollment, foydalanuvchi ma'lumotlari, reward va payment
    tarixini yo'qotmang.
-   Xatolarni yashirmang; muvaffaqiyatsiz operatsiyani muvaffaqiyat
    sifatida ko'rsatmang.
-   Faqat kod va hujjatni tekshirish bilan production'da sozlangan deb
    xulosa qilmang.

------------------------------------------------------------------------

# TASK SEC-NEW-001 --- Admin MFA Secret Encryption

**Priority:** P1\
**Maqsad:** TOTP secret'larni faqat imzolash emas, authenticated
encryption bilan himoyalash.

### Muammo

`django.core.signing.dumps()` ma'lumotni imzolaydi, ammo shifrlamaydi.
Shu sababli database nusxasiga ega bo'lgan shaxs TOTP secret'ni tiklashi
mumkin.

### Bajariladigan ishlar

1.  MFA model, enrollment, verification, recovery-code, migration va
    testlarni tekshiring.
2.  TOTP secret'larni AES-GCM yoki Fernet kabi authenticated encryption
    yordamida shifrlang.
3.  Shifrlash kalitini Django `SECRET_KEY`dan alohida environment/config
    orqali oling.
4.  Encryption key'ni DB, source code yoki loglarda saqlamang.
5.  Key rotation uchun key ID/version va eski kalit bilan vaqtincha
    decrypt qilish mexanizmini qo'shing.
6.  Eski MFA yozuvlarini xavfsiz migratsiya qiling; foydalanuvchilarning
    MFA enrollment'ini sababsiz bekor qilmang.
7.  Production'da encryption key yo'q yoki noto'g'ri bo'lsa, MFA
    operatsiyasini fail-closed qiling.
8.  `SECRET_KEY` rotatsiyasi MFA secret'larini ocholmay qolishiga olib
    kelmasligini ta'minlang.
9.  Enrollment, verification va recovery flow'larini regressiya testlari
    bilan tekshiring.
10. `.env.example` va deploy hujjatiga faqat placeholder qiymatlarni
    kiriting.

### Majburiy testlar

-   Encrypt/decrypt round-trip.
-   Ciphertext o'zgartirilganda decrypt rad etilishi.
-   Noto'g'ri yoki yo'q encryption key.
-   Legacy record compatibility/migration.
-   Eski kalitdan yangi kalitga rotation.
-   Parallel verification va replay holatlari.
-   MFA recovery flow.

### Qabul mezonlari

-   Database'da TOTP secret ochiq yoki signing-only ko'rinishda
    qolmaydi.
-   Secret'lar faqat alohida encryption key bilan decrypt qilinadi.
-   Legacy foydalanuvchilar uchun aniq va xavfsiz migration yo'li
    mavjud.
-   Testlar haqiqatda o'tgan.

**Cheklov:** Production key'larni almashtirmang va real foydalanuvchilar
MFA'sini o'chirmang.

------------------------------------------------------------------------

# TASK LOOP-NEW-001 --- Learning Loop False Offline Success

**Priority:** P2\
**Fayl:** `frontend/src/hooks/useContinuousLoop.ts` va bog'liq
API/UI/test fayllari.

### Muammo

`restartCycle()` API xatosidan keyin lokal fallback orqali siklni
ochishi mumkin. Server siklni yaratmagan bo'lsa ham UI muvaffaqiyat
ko'rsatishi ehtimoli bor.

### Bajariladigan ishlar

1.  `restartCycle`, API service, cycle state, backend endpoint va reward
    flow'ni birgalikda trace qiling.
2.  Production'da faqat server tasdiqlagan response siklni oldinga
    siljitishi va mukofot berishiga ruxsat bering.
3.  Network error, timeout, HTTP 5xx va noto'g'ri response lokal
    muvaffaqiyatga olib kelmasin.
4.  HTTP 409 va 429 holatlarini to'g'ri ko'rsating; mavjud biznes
    mantiqini saqlang.
5.  Offline/demo fallback bo'lsa, uni faqat aniq development/demo flag
    bilan ajrating.
6.  Demo/offline rejim production'da avtomatik yoqilmasin.
7.  Duplicate request va duplicate reward'ni idempotency bilan
    himoyalang.
8.  Xatoda aniq retry/error UI ko'rsating; sikl ochildi yoki mukofot
    berildi deb yolg'on xabar bermang.
9.  Backend va frontend state mosligini tekshiring.

### Majburiy testlar

-   HTTP 200 --- server tasdiqlagan muvaffaqiyat.
-   HTTP 409 va 429.
-   HTTP 500/503.
-   Network failure va timeout.
-   Malformed/empty response.
-   Takroriy request va parallel request.
-   Production'da offline fallback o'chirilganligi.
-   Demo rejimda fallback faqat explicit flag bilan ishlashi.

### Qabul mezonlari

-   Production sikl va reward faqat server tasdig'i bilan o'zgaradi.
-   Server xatosi soxta success yoki reward bermaydi.
-   Lint, typecheck va tegishli frontend testlar o'tadi.

------------------------------------------------------------------------

# TASK GRADE-NEW-001 --- Groq Prompt Injection Hardening

**Priority:** P2\
**Fayllar:** - `backend/tests_app/services/grading.py` -
`backend/growth/ai_grader.py` -
`backend/tests/test_open_answer_grading_cases.py`

### Maqsad

O'quvchi javobini ishonchsiz input sifatida ko'rib, prompt injection va
soxta grading natijalaridan himoyalash.

### Bajariladigan ishlar

1.  Grading flow, promptlar, Groq client, parser, retry va natija
    saqlash qismlarini trace qiling.
2.  Student answer hech qachon system/developer instruction sifatida
    qabul qilinmasin.
3.  System instruction, grading rubric va student content'ni aniq
    ajrating.
4.  Model output'ni qat'iy schema/type/range validation'dan o'tkazing.
5.  Model qaytargan `is_correct`, score yoki boshqa qiymat bevosita XP,
    coin, certificate yoki premium access bermasin.
6.  Mukofotlar backend'dagi mustaqil tekshiruv va biznes qoidalariga
    bog'liq bo'lsin.
7.  Uzbek, Russian va English tillarida adversarial testlar qo'shing.
8.  Juda uzun input, malformed Unicode, HTML/XML tag, fake JSON va
    role-play hujumlarini tekshiring.
9.  Model javobi noto'g'ri yoki schema'dan tashqarida bo'lsa, xavfsiz
    fallback/error qaytaring.
10. Real Groq staging testlarini opt-in qiling; credentials bo'lmasa
    default skip bo'lsin.
11. API key va maxfiy promptlarni logga yozmang.

### Majburiy adversarial testlar

-   "Ignore previous instructions".
-   System prompt yoki API key'ni chiqarishni so'rash.
-   `{"is_correct": true}` kabi soxta JSON.
-   System/developer role'iga taqlid qilish.
-   XML/HTML tag injection.
-   Juda uzun javob va malformed Unicode.
-   Score chegarasidan tashqaridagi qiymatlar.
-   Bo'sh, kesilgan yoki noto'g'ri JSON.
-   Uzbek, rus va ingliz tilidagi variantlar.

### Qabul mezonlari

-   Mock testlar o'tadi.
-   Adversarial testlar o'tadi.
-   Real Groq testi faqat alohida yoqilganda bajariladi.
-   Faqat mock test o'tgan bo'lsa, real Groq xavfsizligi tasdiqlandi deb
    yozilmaydi.

**Cheklov:** Production Groq API'ga ruxsatsiz so'rov yubormang.

------------------------------------------------------------------------

# TASK PROD-NEW-001 --- Encrypted Off-site Backup & Cron

**Priority:** P1\
**Fayllar:** - `deploy/scripts/backup.sh` -
`deploy/scripts/restore.sh` - `deploy/scripts/crontab.example` -
tegishli backup/deploy hujjatlari.

### Maqsad

Production backup'larni majburiy shifrlash, off-site saqlash va
avtomatik schedule qilishga tayyorlash.

### Bajariladigan ishlar

1.  Backup/restore script va mavjud konfiguratsiyani tekshiring.
2.  Production backup encryption key/passphrase bo'lmasa backup jarayoni
    fail bo'lsin.
3.  Backup off-site manzilga yuborilishidan oldin shifrlansin.
4.  Transferdan keyin va restore'dan oldin SHA-256 tekshirilsin.
5.  Local va remote retention qoidalari ishlashini ta'minlang.
6.  Parallel backup job'larni lock bilan cheklang.
7.  Backup fayllari va credentials uchun restrictive permissions
    ishlating.
8.  Xatolar loglansin va script non-zero exit code qaytarsin.
9.  Restore avval archive'ni tekshirsin va decrypt qilsin; production
    DB'ga tegishdan oldin izolyatsiyalangan test DB'da sinovdan o'tsin.
10. Cron o'rnatish, monitoring, retention va restore bo'yicha operator
    hujjatini yozing.
11. Backup fayllarini Git'ga kiritmang.

### Majburiy testlar

-   Shifrlangan backup yaratish.
-   Noto'g'ri passphrase.
-   Buzilgan archive/checksum.
-   Off-site upload xatosi.
-   Retention.
-   Parallel job lock.
-   Izolyatsiyalangan test DB'ga restore.
-   Encryption konfiguratsiyasi yo'q bo'lganda fail-closed.

### Qabul mezonlari

-   Production backup encryption majburiy.
-   Restore tekshiruvsiz production data'ga tegmaydi.
-   Off-site va cron bo'yicha aniq operator ko'rsatmasi bor.
-   Kod testlari va production'da bajarilishi kerak bo'lgan qo'lda
    bajariladigan qadamlar alohida ko'rsatiladi.

**Qat'iy cheklov:** VPS/SSH'ga kirmang, real cron o'rnatmang, backup
yuklamang, production restore bajarmang va real secret'larni
o'zgartirmang.

------------------------------------------------------------------------

# TASK PROD-DEPLOY-001 --- Production Deploy & Migration Readiness

**Priority:** P1\
**Maqsad:** Production qaysi commit'da ishlayotganini va
migration/deploy holatini dalillar bilan aniqlash.

### Tekshiriladigan qismlar

-   GitHub `main` va release commit.
-   CI workflow va required checks.
-   Docker Compose/Dockerfile.
-   Deploy script va hujjatlar.
-   Django settings va migration fayllari.
-   Health check va worker jarayonlari.

### Bajariladigan ishlar

1.  Kutilayotgan release commit SHA'ni aniqlang.
2.  Production deploy qaysi commit'da ishlayotganini qanday tekshirish
    mumkinligini belgilang.
3.  Production SHA GitHub `main` bilan bir xil deb taxmin qilmang.
4.  `makemigrations --check`, `showmigrations` va migration dependency
    graph'ni tekshiring.
5.  Deploy tartibini tekshiring: backup → deploy → migrate → health
    check.
6.  Migration/deploy xatosi muvaffaqiyat sifatida ko'rsatilmasin.
7.  Rollback tartibi va backup mavjudligini tekshiring.
8.  Backend, frontend, worker va database versiyalari mosligini
    tekshiring.
9.  Required environment variable'lar borligini qiymatlarini
    chiqarmasdan tekshirish usulini yozing.
10. CI trigger va test job'lari haqiqatan bajarilishini tekshiring.
11. `audit/production-readiness.md` faylini yarating yoki yangilang.

### Hisobot formati

Har bir tekshiruv quyidagilardan biri bilan belgilanadi:

-   `PASS` --- dalil bilan tasdiqlangan.
-   `FAIL` --- muammo aniqlandi.
-   `BLOCKED` --- production yoki tashqi ruxsat kerak.
-   `NOT RUN` --- tekshiruv bajarilmadi.

Hisobotda quyidagilar bo'lsin:

-   Expected release SHA.
-   Production'da ishlayotgan SHA --- faqat dalil bo'lsa.
-   Migration holati.
-   CI natijasi va run link/ID.
-   Backup/rollback holati.
-   Health check natijalari.
-   Operator qo'lda bajarishi kerak bo'lgan qadamlar.
-   Yakuniy GO/NO-GO.

### Qat'iy cheklov

-   SSH/VPS'ga kirmang.
-   Production migration, deploy, restart yoki rollback qilmang.
-   `.env`ni o'zgartirmang.
-   GitHub `main` commitini production commit deb ko'rsatmang.
-   Dalil bo'lmasa `BLOCKED` deb belgilang.

------------------------------------------------------------------------

# Yakuniy verification

Barcha vazifalar tugagach:

1.  Har bir vazifa uchun test natijalarini jamlang.
2.  Backend testlari, frontend lint/typecheck va tegishli CI
    natijalarini ko'rsating.
3.  Migration consistency tekshiruvini bajaring.
4.  `git diff` va o'zgargan fayllarni ko'rib chiqing.
5.  Secret yoki backup fayllari tasodifan commitga qo'shilmaganini
    tekshiring.
6.  `audit/remediation-status.md` faylini yangilang.
7.  `audit/production-readiness.md` faylida production dalillarini
    ajrating.
8.  Kodda tuzatilgan, lekin production'da hali bajarilmagan ishlarni
    `BLOCKED` deb belgilang.

## Yakuniy hisobot jadvali

  -----------------------------------------------------------------------------
  Task              Status                  Tests             Production action
  ----------------- ----------------------- ----------------- -----------------
  SEC-NEW-001       FIXED/PARTIAL/BLOCKED   Natija            Kerak bo'lsa
                                                              alohida ruxsat

  LOOP-NEW-001      FIXED/PARTIAL/BLOCKED   Natija            Deploy talab
                                                              qilinadi

  GRADE-NEW-001     FIXED/PARTIAL/BLOCKED   Mock/real alohida Staging/real Groq
                                                              ruxsati

  PROD-NEW-001      FIXED/PARTIAL/BLOCKED   Natija            Cron/off-site
                                                              operator bajaradi

  PROD-DEPLOY-001   PASS/FAIL/BLOCKED       Natija            Production dalili
                                                              kerak
  -----------------------------------------------------------------------------

## GO mezonlari

`GO` faqat quyidagi shartlarning barchasi bajarilganda tavsiya qilinadi:

-   P1 security muammolari tuzatilgan va testlangan.
-   Learning Loop server xatosida soxta success bermaydi.
-   Groq grading output'i qat'iy tekshiriladi; real test holati ochiq
    ko'rsatiladi.
-   Backup encryption, off-site va restore jarayoni dalil bilan
    tasdiqlangan.
-   Production commit va migration holati tasdiqlangan.
-   Hech qanday muhim test yoki production tekshiruvi yashirilmagan.

Agar production dalili yoki ruxsat yetishmasa, yakuniy qaror `NO-GO`
yoki `BLOCKED` bo'lib qoladi. Kod o'zgarganining o'zi production release
uchun yetarli dalil emas.
