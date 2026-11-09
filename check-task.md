Claude Code uchun: IlmIldizi / django-test-bot — to‘liq texnik audit

> **Maqsad:** mavjud kodni o‘zgartirmasdan, IlmIldizi Django backend va unga ulangan frontendni chuqur audit qilish; real testlar bilan muammolarni tasdiqlash; topilmalarni dalil, xavf darajasi va tuzatish rejasi bilan hujjatlashtirish.
>
> **Asosiy qoida:** audit davomida kodni avtomatik ravishda tuzatma. Avval tekshir, isbotla, hisobot yoz. Faqat men alohida ruxsat berganimdan keyin fix bosqichiga o‘t.

---

## 0. Claude uchun asosiy ish qoidalari

Sen senior Django/Python backend engineer, application security auditor, QA automation engineer va EdTech product architect sifatida ishlaysan.

### 0.1. Token va kontekstni tejash

- Har bir bosqichni alohida bajar. Bir bosqich tugamaguncha keyingisiga o‘tma.
- Butun repositoryni qayta-qayta o‘qima. Avval `git status`, branch, commit SHA va papkalar xaritasini ol; keyin faqat tegishli fayllarni o‘qi.
- `cat` bilan katta fayllarni to‘liq chiqarish o‘rniga `grep`, `rg`, `sed -n`, test nomlari va kerakli line range'lardan foydalan.
- Bir xil faylni qayta o‘qima; topilmalarni vaqtinchalik audit daftariga yoz.
- Har bir bosqich yakunida 10–20 qatorli qisqa xulosa va keyingi bosqich uchun kerakli fayllar ro‘yxatini yoz.
- Keraksiz umumiy tushuntirishlar, uzun kod ko‘chirmalari va takroriy xulosalar bo‘lmasin.
- Test loglarini to‘liq chiqarma: muvaffaqiyatsiz testlar, traceback'ning muhim qismi va yakuniy summary yetarli.
- Testlar ko‘p bo‘lsa, tegishli testlarni guruhlab ishga tushir; natijalarni faylga saqla.
- Har bir topilma uchun aniq `file_path:line_number` ko‘rsat. Line raqamini tekshirmasdan taxmin qilma.
- Tekshirilmagan narsani “xavfsiz”, “ishlayapti” yoki “bug bor” deb e’lon qilma.
- Biror tekshiruvni bajarish imkoni bo‘lmasa, sababini va muqobil tekshiruvni qayd et.

### 0.2. Xavfsiz ishlash

- Production ma’lumotlar bazasiga, real foydalanuvchilarga, to‘lovlarga yoki real Telegram foydalanuvchilariga ta’sir qiladigan testlarni bajarma.
- Production serverga hujum, stress-test yoki destructive test yuborma.
- Faqat local/staging va test ma’lumotlaridan foydalan.
- `DELETE`, `TRUNCATE`, migration rollback, data reset yoki real reward beruvchi so‘rovlarni ruxsatsiz bajarma.
- `.env`, token, parol, API key, signing secret va shaxsiy ma’lumotlarni hisobotga chiqarma. Faqat o‘zgaruvchi nomi va xavfini yoz.
- External xizmatlarga so‘rov yuborishdan oldin konfiguratsiya test muhitiga tegishli ekanini tasdiqla.
- Test paytida mavjud o‘zgarishlarni yo‘qotma. `git status` bilan boshlang‘ich holatni qayd et; foydalanuvchining o‘zgarishlarini revert qilma.
- Audit davomida hech qanday dependency upgrade yoki formatter orqali ommaviy kod o‘zgarishi qilma.

### 0.3. Dalil standartlari

Har bir topilmani quyidagi toifalardan biriga ajrat:

- **CONFIRMED** — kod, test yoki qayta ishlab ko‘rilgan holat bilan isbotlangan.
- **LIKELY** — koddan kuchli ehtimol ko‘rinadi, lekin runtime tasdig‘i yo‘q.
- **NEEDS VERIFICATION** — qo‘shimcha muhit, konfiguratsiya yoki tashqi xizmat kerak.
- **NOT REPRODUCED** — tekshirildi, ammo muammo qayta yuzaga kelmadi.

Har bir topilma quyidagilarni o‘z ichiga olsin:
1. ID: `SEC-001`, `BUG-001`, `ECON-001`, `QA-001` kabi.
2. Severity: P0 / P1 / P2 / P3.
3. Ishonchlilik: CONFIRMED / LIKELY / NEEDS VERIFICATION.
4. Fayl va aniq line raqami.
5. Muammo va texnik sabab.
6. Qayta yuzaga keltirish qadamlari yoki test nomi.
7. Real foydalanuvchiga ta’siri.
8. Tavsiya etilgan yechim.
9. Yechim uchun regression test.

Severity:
- **P0 — Critical:** authentication bypass, boshqa foydalanuvchining ma’lumotiga ruxsatsiz kirish, ommaviy ma’lumot sizishi, real pul/to‘lov yoki reward tizimida katta miqyosli exploit, production ma’lumotlarining yo‘qolishi.
- **P1 — High:** foydalanuvchi hisobini egallash xavfi, muhim API ownership xatosi, XP/coin/premium tizimida takrorlanadigan jiddiy exploit, asosiy learning flow buzilishi, ma’lumotlar izchilligi buzilishi.
- **P2 — Medium:** muhim bo‘lmagan funksiyalar xatosi, ayrim edge-case'larda noto‘g‘ri natija, rate limit yoki monitoring yetishmasligi, cheklangan foydalanuvchi guruhiga ta’sir.
- **P3 — Low:** UX, maintainability, kichik performance yoki hujjatlashtirish muammolari.

P0/P1 deb belgilash uchun aniq dalil talab qilinadi. Faqat taxmin asosida yuqori severity bermagin.

---

# Ish bosqichlari

## PHASE 0 — Repository holati va audit xaritasi

**Vazifa:** loyihaning ayni holatini aniqlash va audit scope'ini tuzish.

1. `pwd`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD` ni tekshir.
2. Repo ichidagi asosiy papkalar va Django apps ro‘yxatini ol.
3. Backend, frontend, testlar, migrations, Docker, CI/CD va deployment konfiguratsiyalarini aniqlab chiq.
4. `settings.py`, `urls.py`, `requirements*.txt` / `pyproject.toml`, `Dockerfile`, `docker-compose*`, CI workflow'larni joylashuvini top.
5. Quyidagi domenlar qaysi app va fayllarda ekanini xaritalashtir:
   - Authentication / JWT / Telegram login
   - User / profile / ownership
   - Tests / attempts / open-answer grading
   - Sprint
   - Learning Loop
   - XP / coins / streak / missions / rewards
   - Premium / subscription / payments
   - Revision / smart repetition
   - WebSocket / Channels
   - Admin / staff permissions
6. Mavjud test fayllari va test framework'larini ro‘yxat qil.

**Natija:** `audit/00-repository-map.md`

Unda faqat arxitektura xaritasi, audit scope'i, aniqlangan muhim entry point'lar va bajarilmagan tekshiruvlar bo‘lsin.

**Gate:** repo holati va test muhitini tushunmaguningcha test yoki migration ishga tushirma.

---

## PHASE 1 — Django test suite va test infratuzilmasi

**Maqsad:** barcha mavjud Django testlarini xavfsiz muhitda ishga tushirish va real holatini aniqlash.

### Tekshiruvlar

1. Django versiyasi, Python versiyasi va test command'ini aniqlash.
2. Test database alohida ekanini tasdiqlash. Production DB ishlatilmayotganini tekshir.
3. Redis, Celery, Channels, Telegram yoki boshqa tashqi dependency'lar uchun test/mock konfiguratsiyasini aniqlash.
4. Avval test collection yoki `manage.py check` kabi xavfsiz tekshiruvlarni bajar.
5. Barcha Django testlarini ishga tushir.
6. Testlar parallel ishlashga mos bo‘lsa, parallel natijani alohida tekshir; avval oddiy run natijasini ol.
7. Muvaffaqiyatsiz testlarni sabab bo‘yicha guruhla:
   - haqiqiy product bug;
   - test eskirgan;
   - test isolation muammosi;
   - tashqi xizmat yoki environment yetishmasligi;
   - flaky / timing muammosi.
8. Test coverage mavjud bo‘lsa, asosiy biznes modullar bo‘yicha coverage'ni ol. Coverage raqamini sifatning yagona o‘lchovi deb qabul qilma.
9. Testlarda assertion yetarlimi, faqat status code tekshirilganmi yoki biznes natija ham tekshirilganmi — bahola.

### Qo‘shimcha

- Reward, auth va learning flow testlari alohida guruhda ishlashini tekshir.
- Testlar real vaqt, timezone yoki tasodifiy qiymatlarga bog‘liq bo‘lsa, deterministikligini tekshir.
- Testlar bir-birining DB/cache holatiga ta’sir qilmasligini tekshir.

**Natija:** `audit/01-test-suite.md`

Hisobotda command, environment (secret'siz), jami testlar, passed/failed/skipped, xatolar sababi, coverage mavjud bo‘lsa modul kesimidagi natija va bloklovchi muammolar bo‘lsin.

**Gate:** test suite natijasi qayd etilmaguncha keyingi bosqichga o‘tma. Testni ishga tushirib bo‘lmasa, to‘siqni yoz va faqat statik auditni davom ettirish uchun mendan ruxsat so‘ra.

---

## PHASE 2 — Open Answer Grading: 100+ test case

**Maqsad:** ochiq javoblarni baholash algoritmi noto‘g‘ri javobni to‘g‘ri deb qabul qilmasligi va to‘g‘ri javobni keraksiz rad etmasligini tekshirish.

### 2.1. Avval algoritmni tushun

- Grading funksiyalari, normalizatsiya, tokenization, typo tolerance, fuzzy matching va synonym qoidalarini top.
- Javob qaysi holatda exact, normalized, fuzzy yoki semantic tarzda qabul qilinishini hujjatlashtir.
- O‘zbek lotin/kirill, ruscha va inglizcha javoblar qo‘llab-quvvatlanadimi — tekshir.
- Apostrof variantlari (`'`, `’`, `ʻ`, `ʼ`, `‘`), katta-kichik harf, ortiqcha bo‘sh joy, tinish belgilari va diakritiklarni tekshir.
- Qisqa javoblarda substring/fuzzy match noto‘g‘ri positive berishi mumkinligini alohida tekshir.
- Raqam, sana, formula, birlik, ism, qisqartma va bir nechta to‘g‘ri variantli savollarni alohida bahola.

### 2.2. Kamida 100 ta test case tuz

Testlarni faqat koddan ko‘chirma; real o‘quvchi xatolarini modellashtir.

Minimal taqsimot:
- 25 ta to‘g‘ri javob: exact va normalizatsiya variantlari.
- 25 ta noto‘g‘ri javob: o‘xshash, qisman yoki mazmunan boshqa javoblar.
- 15 ta typo: 1–2 harf xatosi, harf almashishi/tushib qolishi.
- 10 ta juda qisqa javob: 1–3 harf, qisqa so‘z, qisqartma.
- 10 ta raqam/sana/formula/birlik.
- 10 ta apostrof, lotin-kirill va til variantlari.
- 5 ta adversarial case: javob kalitining ichida uchraydigan boshqa so‘z, qo‘shimcha gap, tasodifiy substring, bo‘sh javob va juda uzun input.

Har bir test case quyidagi maydonlarga ega bo‘lsin:
`question_type`, `correct_answers`, `student_answer`, `expected`, `actual`, `reason`.

### 2.3. Baholash

- False Positive: noto‘g‘ri javob `correct` bo‘ldi.
- False Negative: to‘g‘ri javob `incorrect` bo‘ldi.
- Har bir xatoni reproducer bilan ko‘rsat.
- Threshold'ni o‘zgartirishni darhol taklif qilma; avval threshold nima uchun mavjudligini va test natijasiga ta’sirini tahlil qil.
- Fuzzy match qisqa javoblarda xavfli bo‘lsa, minimal uzunlik yoki token-boundary kabi yechimlarni bahola.
- O‘quvchi javobi va correct answer loglarda maxfiy yoki ortiqcha saqlanmayotganini tekshir.

**Natija:** `audit/02-open-answer-grading.md` va `audit/test-data/grading-cases.json` (yoki mavjud test uslubiga mos format).

**Gate:** 100+ case bajarilgan bo‘lsin. Agar 100 case to‘liq tuzish uchun savol ma’lumotlari yetishmasa, synthetic testlar yarat, ularni synthetic deb belgilab, real curriculum coverage deb ko‘rsatma.

---

## PHASE 3 — XP, Coins, Streak, Premium va Reward Economy

**Maqsad:** foydalanuvchi client'ni manipulyatsiya qilib, server tasdiqlamagan mukofot ololmasligini tekshirish.

### 3.1. Reward arxitekturasi

Quyidagilarni xaritalashtir:
- XP qayerda hisoblanadi va qayerda DB'ga yoziladi?
- Coin qayerda beriladi/yechiladi?
- Streak qaysi shartlarda yangilanadi?
- Daily cap, per-action cap va cooldown bormi?
- Idempotency qanday ishlaydi?
- Premium status qayerda saqlanadi va kim o‘zgartira oladi?
- Client yuborgan `xp`, `coins`, `streak`, `is_correct`, `arena_won`, `correct_count`, `duration`, `premium` kabi qiymatlarga server ishonadimi?
- Reward transaction atomikmi? DB transaction va `select_for_update` kerak bo‘lgan joylarda ishlatilganmi?
- Bir xil event parallel kelganda ikki marta mukofot berilmaydimi?
- Cache/Redis ishlatilsa, cache yo‘qolishi yoki Redis restart bo‘lishi reward limitni chetlab o‘tishga sabab bo‘ladimi?
- Kunlik limit timezone bo‘yicha to‘g‘ri reset bo‘ladimi? `date.today()` va Django `timezone.localdate()` farqini tekshir.
- Database va cache o‘rtasida inconsistency bo‘lishi mumkinmi?

### 3.2. Exploit ssenariylari — faqat test muhitida

Har bir ssenariy uchun test yoz yoki mavjud testni tekshir:

1. Bir xil reward endpoint'ga 10–50 marta takroriy POST.
2. Bir xil request'ni parallel yuborish.
3. Request body'dagi reward qiymatlarini o‘zgartirish.
4. `is_correct=true` yoki `arena_won=true` ni client'dan yuborish.
5. Boshqa user ID yoki attempt ID yuborish.
6. Tugallanmagan lesson/sprint uchun reward so‘rash.
7. Bir kunlik cap'ni ko‘p endpoint orqali aylanib o‘tish.
8. Cache flush/restart holatida cap va idempotency.
9. Kun almashishida timezone chegarasi.
10. Negative, zero, juda katta yoki float reward qiymatlari.
11. Bir xil task'ni turli endpoint orqali mukofotlash.
12. Streak'ni soxta activity bilan oshirish.
13. Premium-only endpoint yoki reward'ni free account bilan chaqirish.
14. Subscription muddati tugagandan keyin premium access.
15. Refund/cancel holatida premium access qaytarilishi.

### 3.3. Premium va payment

- Premium status faqat server tomonidan ishonchli webhook yoki admin action orqali o‘zgartiriladimi?
- Webhook signature tekshiriladimi?
- Webhook event ID idempotentmi?
- Amount, currency, merchant/order ID, user ownership va payment status tekshiriladimi?
- Bir order uchun ikki marta premium berilmaydimi?
- Client success URL'ga qaytishi to‘lov muvaffaqiyatli bo‘lganini anglatib qolmayaptimi?
- Refund, chargeback, expired subscription va webhook retry holatlari bormi?
- Payment provider integratsiyasi mavjud bo‘lmasa, mavjud emas deb yoz; taxminiy audit natijasi yaratma.

**Natija:** `audit/03-reward-economy.md` va tegishli regression testlar ro‘yxati.

**Muhim:** real coin/pul yoki real account bilan exploit test qilma.

---

## PHASE 4 — Learning Loop: state, refresh, interruption va parallel requests

**Maqsad:** Learning Loop bosqichlari server tomonidan boshqarilishini, refresh/uzilishdan keyin state buzilmasligini va mukofot bir marta berilishini tekshirish.

### 4.1. State machine xaritasi

- Barcha stage'lar, transition'lar va ularning shartlarini top.
- Har bir stage uchun serverda saqlanadigan state'ni aniqlash.
- Client qaysi qiymatlarni yuboradi va server qaysilarini mustaqil hisoblaydi?
- Oldingi stage bajarilmasdan keyingisiga o‘tish mumkinmi?
- Stage'ni takror yuborish idempotentmi?
- Stage order va completion status server tomonidan tekshiriladimi?
- Mukofot faqat haqiqiy completion'dan keyin beriladimi?

### 4.2. Test ssenariylari

1. Har bir stage'ni normal tartibda tugatish.
2. Har bir stage'da sahifani refresh qilish.
3. Browser/tab yopilib qayta ochilishi.
4. Tarmoq uzilishi va qayta ulanish.
5. Bir xil stage submit'ini ikki marta yuborish.
6. Bir xil request'ni parallel yuborish.
7. Stage 1 bajarilmasdan Stage 2 endpoint'ini chaqirish.
8. Oldingi stage ID'sini qayta ishlatish.
9. Boshqa user'ning loop/session ID'sini yuborish.
10. Eski yoki muddati o‘tgan session bilan davom etish.
11. Noto‘g‘ri answer, bo‘sh answer va malformed payload.
12. Client `arena_won=true`, `correct_count=...` kabi qiymatlarni soxtalashtirishi.
13. Arena yutqazilganda reward berilmasligi yoki biznes qoidasi qanday bo‘lsa, aynan shu qoida ishlashi.
14. Reward berilgandan keyin response yo‘qolib, client retry qilishi.
15. Server restart/cache loss holatida loop davom etishi.
16. Ikki qurilmadan bitta user session'ini bir vaqtda boshqarish.
17. Bir user uchun parallel ikkita loop ochish.
18. Loop tugagach eski request bilan mukofotni qayta olish.

### 4.3. Ma’lumotlar izchilligi

- DB transaction chegaralari.
- Unique constraint va idempotency key.
- Race condition.
- Redis lock yoki DB lock zarurligi.
- Client va server state farqlari.
- Recovery/resume strategiyasi.

**Natija:** `audit/04-learning-loop.md`, state transition jadvali va regression testlar.

---

## PHASE 5 — Authentication, JWT, Telegram Login va Authorization

**Maqsad:** user authentication va ruxsatlar tizimini chuqur tekshirish.

### 5.1. JWT

- Access/refresh token muddati va algoritmi.
- Signing key xavfsizligi va rotation imkoniyati.
- `iss`, `aud`, `exp`, `iat`, `nbf`, `jti` tekshirilishi.
- Refresh token rotation va reuse detection.
- Logout/revoke mexanizmi.
- Token o‘g‘irlanganda zarar chegarasi.
- Cookie ishlatilsa `HttpOnly`, `Secure`, `SameSite`, CSRF himoyasi.
- Header orqali yuborilsa token loglarga tushib qolmasligi.
- Secret yoki token URL query parameter'da ishlatilmasligi.
- Password reset / change token'lari va session invalidation.

### 5.2. Telegram login / Mini App

Agar Telegram WebApp init data ishlatilsa:
- Telegram imzosini serverda rasmiy algoritm bo‘yicha tekshirish.
- `hash` va HMAC tekshiruvi.
- `auth_date` freshness va replay protection.
- Bot token faqat serverda saqlanishi.
- Client yuborgan `user_id`, username yoki phone'ga ko‘r-ko‘rona ishonilmasligi.
- Init data bir user tomonidan boshqa user nomidan qayta ishlatilmasligi.
- Bot deep link / login flow'laridagi state va ownership.
- Telegram webhook mavjud bo‘lsa secret token yoki signature tekshiruvi.
- Bot command'lari va callback query'larda user authorization.

### 5.3. Authorization va ownership

Barcha muhim endpoint'larni inventarizatsiya qil:
- Authentication talab qilinadimi?
- Role/permission tekshiriladimi?
- Object egasi tekshiriladimi?
- User boshqa user ID, attempt ID, course ID, lesson ID, file ID yoki subscription ID yuborib ma’lumotga kira oladimi?
- Admin/staff endpoint'lar oddiy user'dan himoyalanganmi?
- `IsAuthenticated` borligi ownership tekshirildi degani emas.
- IDOR/BOLA (Broken Object Level Authorization) xavfini tekshir.

### 5.4. Rate limiting va abuse

- Login, OTP, password reset, Telegram login, test submit va reward endpoint'larida rate limit.
- Brute-force va enumeration.
- Account lockout yoki adaptive throttling.
- API pagination/filter orqali ma’lumot chiqarish chegaralari.
- Upload endpoint'larida file type/size va ownership.

**Natija:** `audit/05-auth-and-authorization.md`, endpoint permission matrix va xavfsizlik testlari.

**Eslatma:** production pentest emas. Faqat ruxsat berilgan local/staging muhitida test qil.

---

## PHASE 6 — Barcha API endpoint'lar: Authentication, ownership va validation

**Maqsad:** barcha API endpoint'larni tizimli ravishda tekshirish.

1. Django URL patterns va router'larni yig‘.
2. Har bir endpoint uchun HTTP method, view/viewset, serializer, permission, authentication va model access'ni aniqlash.
3. Endpoint'larni quyidagi guruhlarga ajrat:
   - Public
   - Authenticated user
   - Object owner
   - Teacher/parent/student role
   - Staff/admin
   - Internal webhook/service
4. Har bir private endpoint uchun:
   - anonymous request;
   - boshqa user token'i bilan request;
   - object ID almashtirish;
   - noto‘g‘ri data type;
   - missing field;
   - extra field;
   - juda katta input;
   - pagination/filter abuse;
   - mass assignment;
   - privilege escalation holatlarini tekshir.
5. Serializer `read_only_fields`, `write_only_fields`, `validate_*`, `perform_create`, `get_queryset` va `get_object` qoidalarini ko‘r.
6. User-controlled field orqali `user`, `owner`, `role`, `is_staff`, `is_premium`, `balance`, `xp`, `coins` kabi maydonlarni o‘zgartirish mumkin emasligini tekshir.
7. API response'da password hash, token, private phone/email, answer key yoki boshqa user ma’lumoti chiqmasligini tekshir.
8. Error response stack trace yoki sensitive details oshkor qilmasligini tekshir.

**Natija:** `audit/06-api-permissions.md` — endpoint matrix va topilmalar.

Endpoint soni katta bo‘lsa, avval to‘liq inventory yarat, so‘ng yuqori xavfli endpoint'lardan boshlagin. “Barcha endpoint tekshirildi” degan xulosani faqat matrix'dagi har bir endpoint uchun tekshiruv statusi bo‘lsa yoz.

---

## PHASE 7 — Frontend ↔ Backend real user flow integratsiyasi

**Maqsad:** frontenddagi UI ishlashi emas, balki real API bilan to‘liq user journey to‘g‘ri ishlashini tekshirish.

### 7.1. Muhim user journey'lar

Kamida quyidagilarni tekshir:
1. Yangi user ro‘yxatdan o‘tishi / Telegram orqali kirishi.
2. Login, logout, refresh token.
3. Profil va account ma’lumotlari.
4. Kurs/fan/lesson ro‘yxatini ko‘rish.
5. Testni boshlash, javob yuborish, natijani ko‘rish.
6. Open-answer grading.
7. Sprint boshlash va yakunlash.
8. Learning Loop boshlash, davom ettirish va yakunlash.
9. XP, coin, streak va mission progress.
10. Revision / smart repetition.
11. Premium paywall va subscription holati.
12. Parent/student/teacher role'lari mavjud bo‘lsa, ular orasidagi ruxsatlar.
13. Offline yoki network failure'dan keyin retry.
14. Empty state, loading state va error state.

### 7.2. Har bir flow uchun

- Frontend qaysi endpoint'ni chaqiradi?
- Request payload backend serializer kutgan formatga mosmi?
- Response shape frontend kutgan formatga mosmi?
- Token refresh va 401 retry to‘g‘ri ishlaydimi?
- 403, 404, 409, 429 va 500 holatlari to‘g‘ri ko‘rsatiladimi?
- Loading state va double-submit himoyasi bormi?
- Refresh/reconnect'dan keyin state serverdan qayta tiklanadimi?
- Frontend server tasdiqlamagan XP/coin yoki natijani UI'da ko‘rsatib yubormaydimi?
- Client-side validation backend validation o‘rnini bosib qolmaganmi?

### 7.3. Test usuli

- Mavjud browser/E2E test infratuzilmasidan foydalan.
- Agar browser test infratuzilmasi yo‘q bo‘lsa, API integration test va qo‘lda bajariladigan reproducible checklist tuz.
- Real production user account'dan foydalanma.
- Har bir flow uchun test user va synthetic data ishlat.
- Screenshot faqat UI xatosini isbotlashga kerak bo‘lsa ol; keraksiz screenshot to‘plama.

**Natija:** `audit/07-frontend-backend-flows.md`, journey checklist va bloklovchi integratsiya xatolari.

---

## PHASE 8 — PostgreSQL, Redis, Docker va Production konfiguratsiyasi

**Maqsad:** production deploy konfiguratsiyasining xavfsizligi, ishonchliligi va tiklanish imkoniyatini tekshirish.

### 8.1. Django production settings

- `DEBUG=False`.
- `SECRET_KEY` env'dan olinishi va kuchli bo‘lishi.
- `ALLOWED_HOSTS` aniq.
- HTTPS redirect, secure cookies, HSTS, trusted proxy header'lari.
- CORS va CSRF trusted origins.
- Security middleware tartibi.
- Error reporting/logging va sensitive data masking.
- Static/media storage permission.
- Upload size/type limit.
- Admin URL va admin MFA/extra protection imkoniyati.
- Password validators.
- `TIME_ZONE`, `USE_TZ` va reward date boundary.
- Production'da development fallback ishlamayotgani.

### 8.2. PostgreSQL

- Connection pooling va connection limits.
- Transaction isolation va atomic reward updates.
- Unique constraints, foreign keys, indexes.
- N+1 query va katta query'lar.
- Migration tartibi va rollback strategiyasi.
- Backup schedule, retention, encryption va restore sinovi.
- User data delete/export talablari mavjud bo‘lsa, bajarilishi.
- DB credential least privilege.
- Public network exposure va TLS.

### 8.3. Redis / Celery / Channels

- Redis password/TLS/network exposure.
- Production'da in-memory fallback yo‘qligi.
- Cache va durable state aralashtirilmaganmi?
- Reward cap yoki session state faqat volatile cache'da qolib ketmaganmi?
- Celery retry va task idempotency.
- Channels group permission va user isolation.
- WebSocket authentication, authorization va reconnect.
- Redis restart/failover holatida tizim qanday ishlashi.

### 8.4. Docker / CI/CD

- Container root bo‘lmagan user bilan ishlaydimi?
- Image ichida secret yo‘qmi?
- `.dockerignore` va `.gitignore`.
- Dependency pinning va known vulnerable dependency scan.
- Healthcheck va readiness/liveness.
- `collectstatic`, migrations va startup order.
- Container restart policy va graceful shutdown.
- CI'da testlar majburiymi?
- Deployment oldidan migration/test/security check bormi?
- Loglar stdout/stderr orqali to‘g‘ri yig‘iladimi?

### 8.5. Observability va recovery

- Error monitoring.
- Structured logs va request ID.
- Audit log zarur biznes amallari uchun.
- Alerting: API 5xx, DB, Redis, Celery queue, payment webhook.
- Backup'dan restore amalda tekshirilganmi?
- Incident paytida rollback/recovery hujjati bormi?

**Natija:** `audit/08-production-readiness.md` — konfiguratsiya checklist, risklar va production deploy'dan oldingi shartlar.

---

## PHASE 9 — Yakuniy risk tahlili va P0/P1/P2/P3 hisobot

Barcha oldingi bosqichlardagi topilmalarni birlashtir.

### 9.1. Executive summary

- Audit qamrovi.
- Qaysi bosqichlar bajarildi va qaysilari bajarilmadi.
- Test suite natijasi.
- Confirmed P0/P1/P2/P3 soni.
- Production'ga chiqarishga to‘sqinlik qiladigan muammolar.
- Eng muhim 5 ta risk.
- Audit cheklovlari.

### 9.2. Topilmalar jadvali

| ID | Severity | Ishonchlilik | Modul | Muammo | Fayl:line | Foydalanuvchiga ta’sir | Tavsiya |
|---|---|---|---|---|---|---|---|

### 9.3. Fix priority

- **Immediate / P0:** release yoki production ishini to‘xtatadigan muammolar.
- **Before release / P1:** production'dan oldin tuzatilishi shart.
- **Next sprint / P2:** yaqin sprintda tuzatish.
- **Backlog / P3:** UX, refactor va past xavfli yaxshilashlar.

Har bir fix uchun:
- o‘zgartiriladigan fayllar;
- ehtimoliy migration;
- regression test;
- backward compatibility;
- deploy va rollback xavfi.

### 9.4. Release decision

Faqat quyidagi variantlardan birini tanla va dalil keltir:
- `NO-GO` — tasdiqlangan P0 yoki release'ni bloklovchi P1 bor.
- `CONDITIONAL GO` — P0 yo‘q, lekin muhim shartlar bajarilishi kerak.
- `GO` — tekshirilgan scope doirasida release blocker topilmadi.

`GO` degani tizim mutlaqo xavfsiz degani emas. Production pentest, real monitoring va backup restore sinovi bajarilmagan bo‘lsa, cheklov sifatida yoz.

**Natija:** `audit/09-final-report.md`

---

# Yakuniy audit papkasi

Quyidagi fayllarni yarat:

```text
audit/
├── 00-repository-map.md
├── 01-test-suite.md
├── 02-open-answer-grading.md
├── 03-reward-economy.md
├── 04-learning-loop.md
├── 05-auth-and-authorization.md
├── 06-api-permissions.md
├── 07-frontend-backend-flows.md
├── 08-production-readiness.md
├── 09-final-report.md
└── test-data/
    └── grading-cases.json
```

- `audit/` papkasi mavjud bo‘lsa, mavjud fayllarni o‘chirib yuborma; yangi audit natijasini alohida timestamp yoki versiya bilan saqla.
- Secret, token, password yoki production PII audit fayllariga yozilmasin.
- Har bir fayl faqat o‘sha bosqichning natijasini saqlasin.
- Yakuniy hisobotda boshqa audit fayllariga relative link ber.

---

# Claude bilan ishlash protokoli

**Barcha 9 bosqichni bitta uzun prompt javobida bajarishga urinma.** Kontekst va tokenni tejash uchun quyidagi ketma-ketlikda ishlagin.

### Birinchi sessiya

Ushbu hujjatni o‘qib, faqat `PHASE 0` ni bajar. `audit/00-repository-map.md` yarat. Keyin:
- aniqlangan repository/branch/commit;
- audit scope;
- test environment xavfsizligi;
- topilgan asosiy app va fayllar;
- keyingi bosqichga to‘siqlarni qisqa yoz.

Boshqa bosqichga o‘tma.

### Keyingi sessiyalar

Har yangi sessiyada:
1. Ushbu MD faylni va tegishli audit natijalarini o‘qi.
2. `git status` ni tekshir.
3. Faqat navbatdagi PHASE'ni bajar.
4. Natijani tegishli audit fayliga yoz.
5. Qisqa summary va keyingi PHASE nomini ayt.
6. Kodni o‘zgartirma.

### Davom ettirish buyruqlari

Men quyidagi buyruqlardan birini yuboraman:

- `AUDIT NEXT` — navbatdagi bitta bosqichni bajar.
- `AUDIT STATUS` — bajarilgan/bajarilmagan bosqichlar va blocker'larni ko‘rsat.
- `AUDIT DEEP <modul>` — faqat ko‘rsatilgan modulni chuqurroq tekshir.
- `AUDIT REPORT` — mavjud dalillar asosida yakuniy hisobotni yangila; bajarilmagan tekshiruvlarni bajarildi deb ko‘rsatma.
- `FIX PLAN` — topilmalarni tuzatish rejasiga aylantir, lekin kodni o‘zgartirma.
- `FIX P0` yoki `FIX P1` — faqat men aniq ruxsat bergan severity bo‘yicha tuzatishni boshlash. Har bir fix oldidan va keyin test yoz/ishga tushir, diff'ni ko‘rsat.

Agar sessiya konteksti yo‘qolsa, `audit/` ichidagi mavjud natijalarni o‘qib davom et. Bajarilgan bosqichlarni qaytadan bajarishdan oldin yangi commit yoki kod o‘zgarishi bo‘lgan-bo‘lmaganini tekshir.

---

# Eng muhim yakuniy talab

Maqsad ko‘p muammo topish emas — **haqiqiy muammolarni dalil bilan topish**.

- Faqat mavjud kodga qarab taxminni confirmed bug deb yozma.
- Test o'tgani barcha xavfsizlik muammolari yo‘q degani emas.
- Test yo‘qligi bug bor degani emas.
- Frontend'da tugma ishlashi backend biznes qoidasi to‘g‘ri degani emas.
- `IsAuthenticated` borligi ownership xavfsiz degani emas.
- Client yuborgan natija serverda qayta tekshirilmasa, unga ishonma.
- Reward va payment kabi muhim operatsiyalarda idempotency, transaction va ownership'ni alohida tekshir.
- Har bir tavsiya aniq fayl, sabab va regression test bilan bog‘langan bo‘lsin.

**Boshlash:** hozir faqat `PHASE 0 — Repository holati va audit xaritasi` ni bajar. Kodga tegma. Natijani `audit/00-repository-map.md` ga yoz va mendan `AUDIT NEXT` buyrug‘ini kut.
"""