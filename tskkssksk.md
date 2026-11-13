ILMILDIZI — MASTER ENGINEERING REMEDIATION & PRODUCTION READINESS TASK
## Gemini Argon uchun yagona ijro hujjati

**Maqsad:** IlmIldizi platformasidagi aniqlangan kamchiliklarni bartaraf etish, mavjud funksiyalarni oxirigacha ishlaydigan holatga keltirish, Respublika Mock imtihonining to‘liq biznes jarayonini yakunlash va platformani production darajasida tekshirish.

**Repository:** `MDEV-2007/django-test-bot`  
**Asosiy talab:** Hech qanday funksiyani faqat UI’da ishlayotgandek ko‘rsatma. Har bir biznes jarayoni frontend → API → service → database → background job/WebSocket zanjiri bo‘yicha tekshirilsin.

---

# 0. ENG MUHIM IJRO QOIDALARI

1. Avval repository, branch, commit, working tree va mavjud hujjatlarni tekshir. Ishni boshlashdan oldin `git status`, branch va HEAD commitni qayd et.
2. `main` yoki production branchga bevosita push qilma. Alohida feature/fix branchda ishlagin.
3. Hozir ishlayotgan Learning Loop yoki boshqa sog‘lom funksiyalarni keraksiz qayta yozma. Avval test bilan xatti-harakatini mustahkamla.
4. Kodni o‘zgartirishdan oldin muammoni reproduksiya qil. Har bir bug uchun test yoz.
5. Mavjud arxitektura, naming, API contract va design systemga rioya qil. Keraksiz yangi dependency qo‘shma.
6. Hech qachon test natijasini, paymentni, user sonini, sovrinni yoki performance ko‘rsatkichini soxtalashtirma.
7. Tashqi payment provider, Telegram, Redis, WebSocket yoki production secret ishlamasa, buni yashirma. Mock testni real integratsiya deb ko‘rsatma.
8. Har bir yangi endpointda authentication, authorization, ownership, validation, rate limit va idempotency talablarini tekshir.
9. Har bir database o‘zgarishida migration yoz, migrationni toza database va mavjud database holatida tekshir.
10. Frontendda loading, empty, error, success, unauthorized, offline va retry holatlarini to‘liq ko‘rsat.
11. Barcha sahifalar responsive bo‘lsin: kamida 360px, 375px, 390px, 768px, 1024px va desktop kengliklarida tekshir.
12. Ish tugaganda testlar, o‘zgargan fayllar, migrationlar, qolgan xavflar va bajarilmagan ishlarni aniq hisobot qil.
13. Hech qachon `return` bilan asosiy funksiyani o‘chirib qo‘yib, UI’da muvaffaqiyat ko‘rsatma.
14. Foydalanuvchi ma’lumotlarini, mavjud paymentlarni, attemptlarni yoki production datani o‘chirma.
15. Task katta bo‘lsa, bosqichma-bosqich bajar. Lekin faqat reja yozib to‘xtama: imkon qadar kodni tuzat, test yoz va natijani isbotla.

## 0.1. Ishlash tartibi

Har bir modul uchun quyidagi ketma-ketlik majburiy:

- `DISCOVER`: model, serializer, view, service, URL, frontend page/component, permissions, jobs va testlarni top.
- `TRACE`: foydalanuvchi bosgan tugmadan database natijasigacha to‘liq oqimni kuzat.
- `REPRODUCE`: xatoni test yoki aniq qadamlar bilan qayta hosil qil.
- `FIX`: eng kichik xavfsiz tuzatishni kirit.
- `TEST`: unit, integration, permission, concurrency va UI testlarini bajargin.
- `VERIFY`: oldingi funksiyalar regressiyaga uchramaganini tekshir.
- `REPORT`: PASS/FAIL/PARTIAL/UNVERIFIED/MISSING statusini dalil bilan yoz.

Status ta’riflari:
- **PASS:** test real bajarildi va muvaffaqiyatli o‘tdi.
- **FAIL:** xato reproduksiya qilindi.
- **PARTIAL:** faqat oqimning bir qismi ishlaydi.
- **UNVERIFIED:** kod bor, lekin real ishlashi tekshirilmagan.
- **MISSING:** talab qilingan funksiya yo‘q.

---

# 1. AUDITDA ANIQLANGAN MUAMMOLAR VA XAVFLAR

Quyidagi topilmalar avvalgi GitHub tekshiruvida ko‘rilgan kod va audit hujjatlariga asoslangan. Gemini Argon ularni joriy HEAD branchda qayta tekshirishi shart. Kod o‘zgargan bo‘lishi mumkin; eski topilmani avtomatik ravishda hali ham mavjud deb qabul qilma.

## 1.1. P1 — Live 1v1 Battle matchmaking ishga tushmaydi

Avval ko‘rilgan `frontend/src/app/battles/page.tsx` ichida `startLiveMatch()` funksiyasi:

```tsx
function startLiveMatch() {
    setMode('ghost');
    return;

    setMode('live-searching');
    // WebSocket matchmaking...
}
```

Muammo:
- Live matchmaking kodi `return` sababli bajarilmaydi.
- Foydalanuvchi Live Battle boshlashni xohlasa Ghost rejimiga yo‘naltiriladi.
- UI real raqib qidirilayotgandek taassurot berishi mumkin.
- Ghost Battle va Live Battle aniq ajratilmagan bo‘lishi mumkin.

Talab:
1. Joriy kodda muammo hali mavjudligini tekshir.
2. Live matchmaking flow’ni to‘liq tikla.
3. WebSocket connection, queue join, opponent found, match ready, countdown, answer submission, opponent disconnect, reconnect, timeout, cancel va result flow’larini tekshir.
4. Ghost rejimini alohida ishlaydigan rejim sifatida saqla.
5. Live match topilmasa foydalanuvchiga aniq holat ko‘rsat: qidirilmoqda, raqib topilmadi, qayta urinish yoki bekor qilish.
6. Ikki foydalanuvchi bitta matchga ikki marta qo‘shilmasin.
7. Bitta foydalanuvchi bir vaqtning o‘zida bir nechta matchmaking queue’da qolmasin.
8. Disconnect/reconnect paytida match holati serverdan tiklansin.
9. Natija va XP faqat serverda hisoblanib, bir marta berilsin.
10. Ghost natijasi hech qachon Live Battle sifatida ko‘rsatilmasin.

Acceptance criteria:
- Ikki alohida test user bir-birini topadi.
- Match serverda yaratiladi.
- Ikkalasi ham aynan bir match ID oladi.
- Javoblar serverda saqlanadi.
- Bir tomon uzilib qaytsa davom ettira oladi yoki aniq yakuniy status oladi.
- XP/reward duplicate berilmaydi.
- Ghost va Live flow mustaqil ishlaydi.

## 1.2. P1 — Classroom Battle to‘liq end-to-end tekshirilishi kerak

Topilgan oqimlarda xona yaratish, PIN, join, start, finish, polling va analytics mexanizmlari mavjud. Bu ularning hammasi real sharoitda xatosizligini isbotlamaydi.

Majburiy tekshiruvlar:
- Teacher faqat o‘ziga tegishli classroom battle’ni boshqarsin.
- Student faqat ruxsat etilgan xona/testga qo‘shilsin.
- 6 xonali PIN collision va brute-force himoyasi bo‘lsin.
- PIN muddati va xona statuslari to‘g‘ri ishlasin.
- Bir student bitta battle’ga faqat bir marta participant bo‘lsin.
- Start faqat xona egasi yoki ruxsatli teacher tomonidan bajarilsin.
- Start ikki marta chaqirilsa test va timer qayta boshlanmasin.
- Finish ikki marta chaqirilsa natija/reward takrorlanmasin.
- Battle davomida boshqa test yoki savolga ruxsatsiz o‘tib bo‘lmasin.
- Javob yuborish idempotent va server-side tekshirilsin.
- Timer client vaqtiga ishonmasin.
- Bir vaqtda 100–500 student javob yuborganda data loss bo‘lmasin.
- Polling yoki WebSocket orqali status yangilanishi to‘g‘ri ishlasin.
- Xona yopilganda kechikib kelgan requestlar natijani buzmasin.
- Teacher analytics faqat o‘z sinfi/xonasi bo‘yicha ma’lumot ko‘rsatsin.
- Student natijasi boshqa studentga ko‘rinmasin, faqat belgilangan leaderboard maydonlari ochiq bo‘lsin.

UI holatlari:
- room creation loading/error/success
- invalid/expired PIN
- waiting room
- battle starting
- active battle
- reconnecting
- finished
- cancelled
- permission denied
- no participants

## 1.3. P0 — Respublika Mock: to‘liq pullik imtihon lifecycle’i

Avvalgi tekshiruvda `tests_app.TestSet` ichida `is_live_mock`, `scheduled_at`, `remind_users`, `notify_all`, `notified_at`, `is_premium`, `price` kabi maydonlar ko‘rilgan. Payment modeli foydalanuvchi va TestSet bilan bog‘lanishi mumkin. Bu to‘liq Respublika Mock mahsuloti tayyor degani emas.

Maqsadli biznes oqimi:

1. Admin Respublika Mock e’lonini yaratadi.
2. Student dashboardda imtihon kartasini ko‘radi.
3. Student imtihon tafsilotlarini ochadi.
4. Ism, familiya, telefon, hudud va zarur ma’lumotlarni kiritadi.
5. Tizim alohida registration yaratadi.
6. Student Click/Payme yoki amaldagi rasmiy provider orqali to‘laydi.
7. Provider callback/webhook imzosi tekshiriladi.
8. Payment `PAID` bo‘lgach registration `CONFIRMED` bo‘ladi.
9. Registration ID va receipt/reference ko‘rsatiladi.
10. Dashboardda countdown va qatnashish holati ko‘rinadi.
11. Telegram eslatma yuboriladi.
12. Imtihon boshlanish vaqti kelganda server ruxsat beradi.
13. Faqat tasdiqlangan qatnashchi imtihonga kira oladi.
14. Attempt serverda yaratiladi va qayta kirish siyosati ishlaydi.
15. Javoblar serverga saqlanadi.
16. Vaqt tugaganda server attemptni yakunlaydi.
17. Natija hisoblanadi va leaderboard e’lon qilinadi.
18. Sovrinlar admin tasdiqlashi va audit log bilan taqsimlanadi.
19. Refund/cancel/dispute holatlari qayd etiladi.

### 1.3.1. Registration modeli

Alohida registration entity kerak yoki mavjud model bu vazifani to‘liq bajarayotganini isbotla.

Tavsiya etiladigan maydonlar:
- unique `registration_id` (taxmin qilish qiyin bo‘lgan public identifier)
- `user`
- `test_set` / event
- `full_name` yoki first_name + last_name
- verified phone
- region/district (talab qilinsa)
- `status`: PENDING_PAYMENT, CONFIRMED, CANCELLED, REFUNDED, DISQUALIFIED
- `payment`
- `registered_at`
- `confirmed_at`
- `checked_in_at` (zarur bo‘lsa)
- consent/terms version
- audit timestamps

Qoidalar:
- Bir user bir event uchun duplicate registration yarata olmasin.
- Bir user bir event uchun bir martadan ortiq muvaffaqiyatli payment qilmasin; retry idempotent bo‘lsin.
- Ism-familiya clientdan kelgani uchun identity verified deb qabul qilinmasin.
- Registration ID boshqa userga tegishli ma’lumotni ochib bermasin.
- Registration ID bilan imtihonga kirishning o‘zi yetarli bo‘lmasin; auth va registration ownership ham tekshirilsin.

### 1.3.2. Payment xavfsizligi

- Frontend yuborgan `amount`ga ishonma; narx serverdagi event/test modelidan olinsin.
- Webhook signature/provider verification majburiy.
- Callback duplicate kelsa payment/reward/registration takrorlanmasin.
- Payment status faqat server/provider tasdig‘i bilan o‘zgarsin.
- `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` holatlari aniq bo‘lsin.
- Payment va registration yangilanishi transaction ichida bajarilsin.
- Provider timeout bo‘lsa reconciliation/status-check mexanizmi bo‘lsin.
- Admin manual confirmation bo‘lsa kim, qachon, nima sababdan tasdiqlagani audit logga yozilsin.
- Click/Payme real credential bo‘lmasa integratsiyani `UNVERIFIED` deb belgila; soxta success yaratma.

### 1.3.3. Dashboard event card

Har bir student uchun quyidagilar ko‘rinsin:
- Event title
- Subject
- Exam date/time va timezone
- Registration status
- Payment status
- Price
- Prize description
- Countdown
- Registration ID (faqat ro‘yxatdan o‘tgan userga)
- “Ro‘yxatdan o‘tish” yoki “To‘lovni davom ettirish”
- “Imtihonga kirish” — faqat server ruxsat berganda
- “Natijani ko‘rish” — faqat natija e’lon qilinganda

Statusga qarab UI:
- Registration not started
- Registration open
- Payment pending
- Payment confirmed
- Exam starts soon
- Exam live
- Exam finished
- Results pending
- Results published
- Cancelled/refunded

### 1.3.4. Scheduled notifications / cron

Avvalgi tekshiruvda `deploy/scripts/crontab.example` ichida `check_and_notify_mocks` har daqiqada chaqirilishi ko‘rilgan.

Tekshir:
- Management command repositoryda haqiqatan mavjudmi?
- Docker container ichida ishlaydimi?
- `flock` lock to‘g‘ri ishlaydimi?
- Timezone bir xilmi?
- Bir event uchun notification duplicate yuborilmaydimi?
- Faqat tegishli audience’ga yuboriladimi?
- Telegram `chat_id` yo‘q userlar xavfsiz skip qilinadimi?
- Telegram rate limit va retry/backoff bormi?
- Xato yuborilgan notification keyin qayta yuboriladimi?
- `notified_at` faqat muvaffaqiyatli yuborilgandan keyin yoziladimi?
- Bir nechta worker parallel ishlaganda duplicate bo‘lmaydimi?

`notify_all` barcha userlarga yuborish xavfini tug‘dirishi mumkin. Audience aniq bo‘lsin: confirmed registration, paid participant yoki admin tanlagan segment. Pullik imtihon uchun to‘lov qilmaganlarga “qatnashish tasdiqlandi” mazmunidagi xabar yuborilmasin.

### 1.3.5. Exam access va test lifecycle

- Event startdan oldin kirish bloklansin (agar admin early access bermagan bo‘lsa).
- Start vaqtini client emas, server belgilasin.
- Late join siyosati aniq bo‘lsin.
- Bitta registration uchun attempt limiti belgilanadi.
- Refresh/reconnect attemptni yo‘qotmasin.
- Javoblar har bir save requestda serverda saqlansin.
- Bir savolga parallel javob kelganda deterministic natija bo‘lsin.
- Server-side deadline barcha clientlarda bir xil.
- Vaqt tugaganda server attemptni yakunlasin.
- Client clockni o‘zgartirish imtihon vaqtini uzaytirmasin.
- Savollar va to‘g‘ri javoblar clientga oldindan yuborilmasin.
- Randomization serverda va reproducible audit bilan bajarilsin.
- Admin disqualification qilsa sabab va actor qayd etilsin.

### 1.3.6. Sovrinlar va leaderboard

- Sovrin shartlari eventdan oldin ochiq ko‘rsatilishi kerak.
- G‘oliblar serverda hisoblangan natija asosida aniqlansin.
- Tie-break qoidasi oldindan belgilansin.
- Bir xil natijada adolatli tie-break qo‘llansin.
- Admin natijani o‘zgartirsa sabab, oldingi qiymat va yangi qiymat audit logga yozilsin.
- Sovrin statuslari: NOT_ELIGIBLE, PENDING_REVIEW, APPROVED, PAID/DELIVERED, DISPUTED.
- Sovrin berildi deb UI’da ko‘rsatishdan oldin admin/provider tasdig‘i bo‘lsin.
- Public leaderboard shaxsiy ma’lumotlarni oshkor qilmasin.
- Bir qatnashchi bir nechta sovrin olish qoidasi event config’da aniq bo‘lsin.

## 1.4. P1 — Dashboard tavsiyalari haqiqiy individual bo‘lishi kerak

Avval ko‘rilgan `backend/dashboard/api.py` da `suggested_topic` uchun `topic_qs.order_by('order').first()` ishlatilgan. Bu tartibdagi birinchi mavzuni tanlaydi; bu har doim individual zaiflikka asoslangan tavsiya emas.

Talab:
- Student tanlagan fan asosiy scope bo‘lsin.
- Oxirgi urinishlar, accuracy, xatolar, takrorlash muddati, mastery va mavzu progressi ishlatilsin.
- Hali o‘rganilmagan mavzu va takrorlash kerak bo‘lgan mavzu ajratilsin.
- Tavsiya sababi tushunarli bo‘lsin.
- Ma’lumot yetarli bo‘lmasa fallback aniq ko‘rsatilsin; soxta “AI personal recommendation” deyilmasin.
- Boshqa fan ma’lumotlari aralashib ketmasin.
- User fanini o‘zgartirganda barcha dashboard bloklari yangi fanga moslansin.
- API bir xil inputda barqaror va test qilinadigan natija qaytarsin.

Dashboarddagi barcha widgetlar uchun:
- real backend data
- loading skeleton
- empty state
- error + retry
- stale data handling
- responsive layout
- permission filtering
- analytics eventlar (zarur joyda)

Soxta progress, hardcoded student stats yoki demo content productionda ko‘rsatilmasin.

## 1.5. P1 — Learning Loop regressiya va individual moslashuv testi

Learning Loop hozirgi auditda ishlayotgan deb ta’riflangan, lekin buni regression testlar bilan himoya qil.

Tekshir:
- Fan tanlash va fan almashtirish.
- Mavzu tanlash.
- Student level va mastery.
- Savol tanlash algoritmi.
- Zaif mavzular prioriteti.
- Takrorlash intervali.
- To‘g‘ri/noto‘g‘ri javob ta’siri.
- XP/coin/streak.
- Session completion.
- Share-post sharti.
- Duplicate completion.
- Parallel completion.
- Offline/reconnect.
- Bir nechta tabda bir vaqtda ishlash.
- Student boshqa userning progressini ko‘ra olmasligi.

Rewardlar transaction + idempotency bilan berilsin. Bir session ikki marta complete bo‘lsa XP, coin, streak ikki marta oshmasin.

## 1.6. P1 — Test modeli va baholash ishonchliligi

Avvalgi ko‘rikda `Subject`, `Question`, `AnswerOption`, `TestSet`, `Attempt`, `AttemptAnswer`, `QuestionGroup`, `SubQuestion`, `MatchingPair`, `AcceptedAnswer` kabi entitylar va turli savol formatlari ko‘rilgan.

Talab:
- Barcha question type uchun model → serializer → frontend renderer → answer validator → scoring chain tekshirilsin.
- Single choice, multiple choice, image, table, matching, grouped, subquestion, open answer, gap fill va TRUE/FALSE/NOT GIVEN test qilinsin.
- Savol formati noma’lum bo‘lsa server silent fallback qilmasin.
- To‘g‘ri javob client payloadga yuborilmasin.
- Open answer normalization aniq bo‘lsin: whitespace, case, punctuation, accepted variants.
- Matching savolda duplicate pair va missing pair validatsiyasi bo‘lsin.
- Grouped question scoring qoidasi aniq bo‘lsin.
- Savol o‘zgarganda eski attempt natijasiga ta’sir qilmasin; version/snapshot yondashuvini tekshir.
- Random order serverda saqlansin.
- Har bir attemptda savol snapshot yoki versiya nazorati bo‘lsin.
- Negative marking bo‘lsa aniq qoida va test bo‘lsin.
- `standard`, `rasch_cefr`, `attestation_100` scoring rejimlari alohida matematik testlardan o‘tsin.
- Chegara qiymatlari, bo‘sh javob, invalid answer, timeout, partial score test qilinsin.
- Rasch/CEFR natijasi ilmiy validatsiyasiz “rasmiy CEFR sertifikati” deb ko‘rsatilmasin.
- Essay yozilmagan bo‘lsa soxta AI score chiqarilmasin.
- AI scoring timeout/failure bo‘lsa pending/error status ko‘rsatilsin.
- AI scoring natijasida model/version, prompt version, timestamp va confidence zarur bo‘lsa log qilinsin.
- Savol kontenti fan, mavzu, qiyinlik, til va syllabus bilan mos bo‘lsin.

Oldingi auditda qayd etilgan kontent muammolarini qayta tekshir:
- A/B/C variantlari matnga yopishib qolishi.
- Mavzuga aloqasiz savollar.
- Noto‘g‘ri difficulty label.
- Essay yozilmagan holatda AI bahosi.
- Test natijasi va sertifikat natijasi orasidagi ishonchlilik.

Kontentni avtomatik ravishda taxmin bilan o‘zgartirma. Noto‘g‘ri savollarni admin review queue’ga chiqar.

## 1.7. P1 — Community Feed

Tekshir:
- Post create/edit/delete.
- Ownership va admin moderation.
- Like/unlike.
- Comment create/delete.
- Duplicate reaction.
- Pagination/cursor.
- Media upload va file validation.
- Xavfli file type, size, content type.
- Rate limit va spam.
- Block/report.
- Hidden/deleted content.
- User privacy.
- Feed ranking va query performance.
- Story expiry (mavjud bo‘lsa).
- Test-result share CTA.
- Post orqali XP olish shartlari.
- Parallel like/comment.
- XSS/HTML injection va URL validation.

Bitta user bitta postga faqat bitta active reactionga ega bo‘lsin. Reaksiya soni database state bilan mos bo‘lsin. Client yuborgan countga ishonma.

Bo‘sh feed, media yo‘q, network error va moderation holatlari to‘g‘ri ko‘rsatilsin.

## 1.8. P2 — Bo‘sh yoki takroriy sahifalar

Oldingi auditda quyidagilar qayd etilgan; joriy holatini qayta tekshir:
- `/library` — kitob/kontent yo‘qligi.
- `/reels` — kontent yo‘qligi.
- `/feed` — empty state.
- `/games/*` — ayrim fanlar uchun kontent yetishmasligi.
- `/tests/mistakes` va `/tests/revision` — funksiyalar takrorlanishi.
- Dashboard juda uzun.
- Natija sahifasida CTA haddan tashqari ko‘p.
- Ayrim joylarda hardcoded/soxta statistika yoki va’dalar.

Talab:
- Ishlamaydigan sahifani “tayyor” deb ko‘rsatma.
- Kontent yo‘q bo‘lsa yaxshi empty state va keyingi harakat ko‘rsat.
- Duplicate page’larni product intent bo‘yicha birlashtirish yoki aniq farqlash.
- Dashboardda eng muhim 1–3 keyingi harakat ustuvor bo‘lsin.
- CTA’lar kontekstga mos va son jihatdan me’yorida bo‘lsin.
- Barcha linklar haqiqiy route’ga olib borsin.
- 404/unauthorized/forbidden/loading/error holatlari tekshirilsin.

---

# 2. SECURITY VA DATA INTEGRITY

Barcha backend modullarida quyidagilarni audit qil:

## Authentication
- JWT access/refresh lifecycle.
- Logout/revoke.
- Token rotation.
- Expired token.
- Concurrent refresh.
- Redis ishlamasa revoke security bypass bo‘lmasin.
- Telegram Mini App initData signature verification.
- Auth bypass va privilege escalation.

## Authorization
- Student faqat o‘z ma’lumotlarini ko‘rsin.
- Teacher faqat o‘z classroom va studentlariga ruxsat doirasida kira olsin.
- Admin endpointlar oddiy userga ochilmasin.
- Object-level permission har bir ID asosidagi endpointda tekshirilsin.
- IDOR testlari bo‘lsin.

## Data integrity
- XP/coin/payment/attempt/registration/reward transaction bilan saqlansin.
- Unique constraintlar qo‘llansin.
- Idempotency key yoki unique business constraint bo‘lsin.
- Parallel requestlarda double-spend/double-reward bo‘lmasin.
- Database constraint application validationni to‘ldirsin.
- Soft delete va audit log siyosati aniq bo‘lsin.

## API security
- Input validation.
- Pagination max limit.
- Rate limit.
- File upload validation.
- SQL injection/ORM misuse.
- XSS.
- CSRF (session ishlatiladigan joylarda).
- CORS/CSRF trusted origins.
- Secrets repositoryga tushmaganini tekshir.
- Error response ichida stack trace/secrets chiqmasin.

---

# 3. SERVER, SCALABILITY VA HIGH-TRAFFIC READINESS

Avvalgi konfiguratsiya ko‘rigida Docker, PostgreSQL 16, Redis 7, Gunicorn/Uvicorn, 4 worker, 16 thread va PostgreSQL max connections 200 kabi sozlamalar ko‘rilgan. Joriy deployment configni qayta o‘qi; bu raqamlarni avtomatik optimal deb qabul qilma.

## 3.1. Infrastructure audit
- VPS CPU/RAM/disk/IOPS va network.
- Docker resource limits.
- Gunicorn worker class, workers, threads, timeout, graceful timeout.
- ASGI/WebSocket routing.
- PostgreSQL pool/connection usage.
- Redis memory, eviction, persistence va availability.
- Celery/background worker (agar ishlatilsa).
- Cron jobs.
- Static/media storage.
- CDN/cache.
- Nginx reverse proxy.
- TLS.
- Health/readiness endpoints.
- Log rotation.
- Monitoring/alerting.
- Backup va restore.
- Deployment rollback.

## 3.2. Load test rejasi

Real load testni faqat staging yoki alohida test muhitida bajar. Productionga ruxsatsiz stress bermagin.

Bosqichlar:
- 25 concurrent users
- 50 concurrent users
- 100 concurrent users
- 250 concurrent users
- 500 concurrent users
- 1,000 concurrent users
- 2,000+ virtual users — faqat infratuzilma va test muhitiga qarab

Scenario:
1. Login/auth.
2. Student dashboard.
3. Learning Loop.
4. Test list/detail.
5. Attempt start.
6. Simultaneous answer submission.
7. Attempt finish.
8. Community feed.
9. Classroom battle join/answer.
10. Live battle WebSocket.
11. Mock registration/payment status.
12. Mock exam start burst.

O‘lchovlar:
- throughput/RPS
- p50/p95/p99 latency
- error rate
- 4xx/5xx
- CPU/RAM
- DB connections
- slow queries
- lock waits/deadlocks
- Redis latency/memory
- WebSocket disconnects
- queue backlog
- lost/duplicate answers
- duplicate payments/rewards

SLO taklifini real test natijasidan keyin belgila. Testdan o‘tmagan load raqamini marketing yoki hisobotda ishlatma.

## 3.3. Database
- N+1 query audit.
- Indexlar va query plans.
- Pagination.
- Transaction scope.
- Long-running transaction.
- Connection exhaustion.
- Deadlock/retry.
- Migration lock.
- Backup restore test.
- PII retention.
- Large table growth.

---

# 4. STUDENT DASHBOARD — PAGE-BY-PAGE ACCEPTANCE

Repositorydagi barcha student route’larni avtomatik topib route inventory tuz. Har bir route uchun quyidagilarni tekshir:

1. Page ochiladimi?
2. To‘g‘ri API chaqiriladimi?
3. Loading ko‘rinadimi?
4. Empty state bormi?
5. Error va retry bormi?
6. Auth talab qilinadimi?
7. Role permission to‘g‘rimi?
8. Ma’lumot real backenddan keladimi?
9. Barcha button/link ishlaydimi?
10. Refreshdan keyin state saqlanadimi?
11. Mobil responsive?
12. Keyboard/accessibility?
13. Dark/light theme?
14. Console error yo‘qmi?
15. API xatosi bo‘lsa UI buzilmaydimi?

Har bir route uchun quyidagi formatda report yoz:

| Route | API | Auth | Main action | Empty/error | Mobile | E2E | Status |
|---|---|---|---|---|---|---|---|

Faqat HTTP 200 yoki page render bo‘lishini PASS deb hisoblama. Asosiy user journey muvaffaqiyatli yakunlanishi kerak.

---

# 5. TEST STRATEGY — MAJBURIY TESTLAR

## 5.1. Backend
- Model unit tests.
- Serializer validation.
- Service tests.
- API integration.
- Permission/IDOR.
- Payment webhook.
- Transaction rollback.
- Idempotency.
- Concurrency.
- Scheduled jobs.
- Telegram notification.
- Scoring algorithms.

## 5.2. Frontend
- Component tests.
- API error/loading tests.
- Form validation.
- Role-based UI.
- Responsive tests.
- Playwright E2E.
- Console error check.
- Accessibility smoke tests.

## 5.3. E2E user journeys

### Journey A — Yangi student
Register → verify/auth → onboarding → fan tanlash → dashboard → Learning Loop → test → result → XP → dashboard update.

### Journey B — Learning Loop
Fan tanlash → mavzu → savollar → javob → feedback → session complete → reward → takrorlash tavsiyasi.

### Journey C — Community
Post yaratish → feedda ko‘rish → like → comment → report → moderation → reward abuse test.

### Journey D — Live Battle
Student A queue → Student B queue → match → countdown → answer → opponent disconnect/reconnect → finish → result → reward.

### Journey E — Classroom Battle
Teacher create → PIN → Student A/B join → teacher start → answers → finish → analytics → permission checks.

### Journey F — Respublika Mock
Admin event create → dashboard event → registration → payment → webhook → confirmed → reminder → exam open → attempt → answers → finish → results → leaderboard → prize approval/delivery.

### Journey G — Payment failure
Registration → provider pending → failed/cancelled → retry → duplicate callback → reconciliation → correct final state.

### Journey H — Load
Ko‘p student bir vaqtda dashboard, exam start va answer submission qiladi; duplicate/lost data bo‘lmasligi isbotlanadi.

---

# 6. FRONTEND UX / DESIGN SIFATI

Maqsad — mavjud IlmIldizi visual identity va design systemni saqlab, professional, izchil va qulay UX yaratish.

Tekshir:
- Typography hierarchy.
- Spacing consistency.
- Card density.
- Button states.
- Form labels/errors.
- Modal/dialog behavior.
- Navigation.
- Mobile bottom navigation.
- Sticky elements.
- Long dashboard scroll.
- Empty state illustrations.
- Loading skeleton.
- Toast/feedback.
- Dark/light theme contrast.
- Reduced motion.
- Keyboard focus.
- Screen reader labels.

Dizaynni butunlay o‘zgartirish shart emas. UX muammosini isbotla, keyin minimal izchil tuzatish kirit. Random gradient, keraksiz animation, haddan tashqari glassmorphism yoki bir xil AI-generated cardlardan qoch.

---

# 7. IMPLEMENTATION PRIORITY

Quyidagi tartibda bajar:

## P0 — Pul, xavfsizlik va data integrity
1. Payment/webhook security.
2. Respublika Mock registration/payment/access lifecycle.
3. Duplicate payment, duplicate attempt, duplicate reward himoyasi.
4. Exam answer persistence va deadline.
5. Prize/result audit trail.
6. Auth/permission/IDOR.

## P1 — Core product functionality
1. Live 1v1 Battle `startLiveMatch()` muammosi.
2. Classroom Battle end-to-end.
3. Test scoring correctness.
4. Dashboard personalization.
5. Learning Loop regression.
6. Community integrity/moderation.

## P2 — Reliability va product quality
1. Student route inventory va page-by-page fixes.
2. Empty/duplicate pages.
3. Dashboard UX.
4. Mobile responsiveness.
5. Monitoring/backup/recovery.
6. Performance optimization.

## P3 — Scale validation
1. Staging load test.
2. WebSocket concurrency.
3. Mock exam start burst.
4. Database/Redis saturation tests.
5. Recovery/rollback drills.

---

# 8. DEFINITION OF DONE

Ish faqat quyidagi shartlar bajarilganda tugallangan hisoblanadi:

- [ ] Barcha student route’lar inventory qilingan.
- [ ] Har bir route’ning main action’i E2E tekshirilgan.
- [ ] Live Battle haqiqiy matchmaking bilan ishlaydi.
- [ ] Ghost va Live rejimlari alohida.
- [ ] Classroom Battle teacher/student permissions to‘g‘ri.
- [ ] Test question type’larining barchasi tekshirilgan.
- [ ] Scoring algoritmlari matematik testlardan o‘tgan.
- [ ] Learning Loop regressiyaga uchramagan.
- [ ] Dashboard individual real data ko‘rsatadi.
- [ ] Community duplicate reaction/rewarddan himoyalangan.
- [ ] Respublika Mock registration lifecycle to‘liq.
- [ ] Payment provider callback xavfsiz va idempotent.
- [ ] Faqat paid/confirmed qatnashchi examga kira oladi (event qoidalariga muvofiq).
- [ ] Countdown va start server time bilan boshqariladi.
- [ ] Attempt va answer yo‘qolmaydi.
- [ ] Result va leaderboard serverda hisoblanadi.
- [ ] Sovrinlar audit trail bilan boshqariladi.
- [ ] Telegram notification duplicate yubormaydi.
- [ ] Critical/P0 security issue qolmagan.
- [ ] Migrationlar toza va mavjud DBda sinovdan o‘tgan.
- [ ] Backend test suite o‘tgan.
- [ ] Frontend typecheck/lint/build o‘tgan.
- [ ] E2E testlar o‘tgan.
- [ ] Load test natijalari real raqamlar bilan qayd etilgan.
- [ ] Backup restore tekshirilgan.
- [ ] Production secretlar log/repositoryga chiqmagan.
- [ ] Barcha o‘zgarishlar alohida branch/commitlarda.
- [ ] Yakuniy reportda bajarilmagan ishlar ochiq ko‘rsatilgan.

Agar biror tashqi provider credential, real Telegram bot yoki staging server bo‘lmasa, tegishli qismni PASS demagin. `UNVERIFIED — external dependency unavailable` deb qayd et.

---

# 9. GEMINI ARGON YAKUNIY HISOBOT FORMATI

Ish yakunida `AUDIT_FINAL_REPORT.md` yarat.

## 9.1. Executive summary
- Umumiy holat.
- P0/P1/P2/P3 issue soni.
- Oldin va keyin statuslar.
- Production readiness: GO / CONDITIONAL GO / NO-GO.

## 9.2. Issue register
| ID | Severity | Module | Root cause | Fix | Test evidence | Status |
|---|---|---|---|---|---|---|

## 9.3. Page inventory
Har bir route va status.

## 9.4. Republic Mock
Registration → payment → confirmation → notification → exam → result → prize oqimining har bir bosqichi va dalili.

## 9.5. Load test
Virtual users, duration, RPS, p95/p99, errors, CPU/RAM/DB/Redis va test muhiti.

## 9.6. Security
Permission, IDOR, webhook, auth, secrets, rate limit, file upload va audit log.

## 9.7. Test evidence
Bajarilgan aniq commandlar, test soni, passed/failed/skipped va failure sabablari.

## 9.8. Remaining risks
Tuzatilmagan yoki tashqi bog‘liqlik sabab UNVERIFIED qolgan har bir band.

## 9.9. Changed files
Fayl nomi, nima o‘zgargani, migration va sabab.

---

# 10. GEMINI ARGON UCHUN SO‘NGGI TOPSHIRIQ

Sen bu ishda faqat maslahat beruvchi emassan. Sen senior full-stack engineer, backend architect, QA engineer, security reviewer va SRE kabi ishlashing kerak.

**Birinchi navbatda repositoryning hozirgi holatini o‘rgan.** Oldingi auditdagi topilmalarni qayta tekshir, eskirganlarini yop, yangi muammolarni top.

Keyin:
1. P0 muammolarni tuzat.
2. P1 muammolarni tuzat.
3. P2 muammolarni tuzat.
4. P3 load/reliability tekshiruvlarini bajar.
5. Har bir tuzatishga test yoz.
6. Barcha testlarni qayta bajar.
7. `AUDIT_FINAL_REPORT.md` yarat.

**Muhim:** Biror funksiyani olib tashlash, vaqtincha o‘chirish, hardcode qilish, testni skip qilish yoki UI’da soxta success ko‘rsatish orqali muammoni “hal qilma”.

**Muhim:** Ishlayotgan Learning Loop, mavjud foydalanuvchilar ma’lumotlari, paymentlar va production integratsiyalarini buzma.

**Muhim:** Agar talabni to‘liq bajarish uchun product qarori kerak bo‘lsa, taxmin qilib biznes qoidani o‘zgartirma. Savolni `BLOCKED — PRODUCT DECISION REQUIRED` deb hisobotga yoz va boshqa mustaqil vazifalarni davom ettir.

**Yakuniy maqsad:** IlmIldizi har bir student uchun ishonchli individual ta’lim platformasi, o‘qituvchi uchun ishlaydigan classroom/battle muhiti, hamjamiyat uchun xavfsiz ijtimoiy maydon va Respublika miqyosidagi pullik/sovrinli imtihonlarni adolatli o‘tkaza oladigan production-ready EdTech tizimi bo‘lishi kerak.

