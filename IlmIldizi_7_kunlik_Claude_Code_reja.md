# IlmIldizi --- 7 kunlik texnik stabilizatsiya rejasi

**Claude Code uchun bajariladigan topshiriqlar**\
Repository: `MDEV-2007/django-test-bot`\
Branch: `fix/ilmildizi-stabilization`

## Asosiy maqsad

IlmIldizi platformasini keyingi o'sishga tayyorlash: test xavfsizligi,
XP/coin iqtisodiyoti, Study/Revision/Analytics, Feed va reklama, Teacher
va Super Admin, frontend UX hamda yakuniy regression audit.

------------------------------------------------------------------------

# Claude Code uchun qat'iy qoidalar

1.  Faqat `fix/ilmildizi-stabilization` branchida ishlagin.
2.  `main`ga merge qilma va productionga deploy qilma.
3.  `.md` fayllarni o'qima. Kod auditida `.py`, `.ts`, `.tsx`, `.js`,
    `.json`, `.yml`, `.yaml`, `.toml`, migration va test fayllaridan
    foydalan.
4.  `.env`, secret, token va parollarni ko'rsatma yoki commit qilma.
5.  Katta refactor qilma. Avval route → view → serializer → service →
    model → frontend caller → test zanjirini tushun.
6.  Ishlayotgan funksiyalarni sababsiz o'chirma. 6 ta student tab qilish
    --- funksiyalarni o'chirish emas, navigatsiyani tartiblash.
7.  XP, coin, streak, level, reyting va DTM score frontendga ishonib
    hisoblanmasin; server tekshirsin.
8.  Har bir POST uchun duplicate request, parallel request, ownership va
    permission xavfini ko'rib chiq.
9.  Test/buildni bajarmagan bo'lsang, o'tdi deb yozma.
10. Har patchdan so'ng `git diff` va `git diff --check`ni tekshir.
11. Migration yaratish mumkin, productionda qo'llash mumkin emas.
12. Noaniq katta migration, API breaking change yoki ma'lumot yo'qotish
    xavfi bo'lsa, avval variantlarni tushuntir va tasdiq so'ra.

Har kun yakunida: bajarilgan ishlar, muammolar
(Critical/High/Medium/Low), o'zgargan fayllar, real test natijalari,
qolgan ishlar va commit hashlarini yoz.

------------------------------------------------------------------------

# 1-kun --- Test tizimlari va javob kalitlari xavfsizligi

## Maqsad

Standard Test, Blitz, Stress va Sprint rejimlarida javob kalitlari
clientga oldindan chiqmasin; foydalanuvchi faqat ruxsat etilgan
savollarga javob bera olsin.

## Tekshiriladigan kod

-   `backend/sprint/views.py`, `backend/sprint/urls.py`
-   `frontend/src/hooks/useNeuralSprint.ts`
-   `frontend/src/app/sprint/page.tsx`
-   `frontend/src/types/sprint.ts`
-   `backend/growth/views.py`, `backend/growth/urls.py`
-   `frontend/src/components/growth/DopamineOnboarding.tsx`
-   `backend/tests_app/` ichidagi API, model, serializer va testlar.

## Sprint vazifalari

1.  Questions GET javobida `correct_option_id`, `is_correct` yoki
    javobni taxmin qilishga imkon beruvchi fieldlar yo'qligini tekshir.
2.  Answer endpoint authentication talab qilishini tekshir.
3.  Tanlangan option aynan shu questionga tegishli ekanini serverda
    tekshir.
4.  Question foydalanuvchiga berilgan Sprint session/attemptga tegishli
    ekanini tekshir.
5.  Boshqa user sessioni, sessionga kirmagan question yoki muddati
    tugagan session rad etilsin.
6.  Javobni server tekshirsin; to'g'ri javob faqat submissiondan keyin
    qaytsin.
7.  User + session + question bo'yicha duplicate va parallel submission
    himoyasini qo'sh.
8.  Rate limiting imkonini ko'rib chiq.

## Blitz vazifalari

1.  GET endpoint `is_correct` qaytarmasligini tekshir.
2.  Answer endpoint auth, question-choice munosabati va user ownershipni
    tekshirsin.
3.  Hozirgi cache-based one-attempt-per-day qoidasi cache tozalanganda
    yo'qoladimi --- tekshir.
4.  Agar cache yagona himoya bo'lsa, DB attempt/submission modelidan
    foydalanish yoki minimal durable model qo'shishni bahola.
5.  Natijalar serverda saqlansin; frontend faqat server javobini
    ko'rsatsin.
6.  Parallel request va retry bir savol natijasini ikki marta yozmasin.

## Umumiy test arxitekturasi

Standard, Blitz, Stress va Sprint uchun quyidagi jadvalni tayyorla: -
Savollar manbasi. - Attempt/session yaratish joyi. - Javobni tekshirish
joyi. - Natija saqlanish joyi. - XP/coin berilish joyi. - Revisionga
xato savol yozilishi. - Duplicate completion himoyasi.

## Testlar

-   Anonymous → 401/403.
-   Valid user/valid session/valid option → muvaffaqiyat.
-   Boshqa savolga tegishli option → 400.
-   Boshqa user sessioni → 403/404.
-   Javob kaliti GET orqali chiqmasin.
-   Bir xil va parallel submission natijani/rewardni ikki marta
    yaratmasin.

**Kun yakuni mezoni:** Sprint va Blitz server-side answer verification,
ownership va duplicate himoyasi bo'yicha tekshirilgan; 4 ta test
rejimining data flow xaritasi tayyor.

------------------------------------------------------------------------

# 2-kun --- XP, coin, streak, level va reward iqtisodiyoti

## Maqsad

Mukofotlarni frontend qiymatlari, takroriy request yoki parallel so'rov
orqali ko'paytirib bo'lmasin.

## Tekshiriladigan modullar

-   `backend/tests_app/`
-   `backend/sprint/`
-   `backend/growth/`
-   `backend/learning_loop/`
-   `backend/shop/`
-   `backend/core/`
-   `backend/analytics/`

## Vazifalar

1.  `xp`, `coins`, `streak`, `level`, `award`, `reward`, `complete`,
    `claim`, `DTM`, `rating`, `elo`, `chest` bo'yicha reward manbalarini
    top.
2.  Har bir reward uchun trigger, shart, miqdor, user, transaction,
    duplicate himoya va audit logni hujjatlashtir.
3.  `backend/tests_app/api.py` completion flowini qayta tekshir: attempt
    atomik yakunlanadimi, XP/coin backendda qayta hisoblanadimi, repeat
    attempt reward olmaydimi, SubjectScore va RevisionItem to'g'ri
    yangilanadimi?
4.  Frontend yuborgan `xp`, `coins`, `correct_count`, `score`
    qiymatlariga ishonilmasin.
5.  Bir attempt ikki marta yakunlanganda reward qayta berilmasin.
6.  Parallel completion race condition keltirib chiqarmasin.
7.  Study completion APIni tekshir: duration, session ownership, minimum
    vaqt va duplicate completion.
8.  `backend/learning_loop/views.py` Stage 4/5 transitionlarini tekshir.
    Arena yutqazilgan yoki bajarilmagan bo'lsa ham Stage 5 reward
    berilishi biznes qoidasiga mosmi? Frontend flow va modelni
    tekshirmasdan taxmin qilma.
9.  Shop purchase: transaction, `select_for_update`, narx serverdan
    olinishi, balance, inventory, parallel purchase va bir martalik item
    qoidalarini test qil.
10. Mavjud reward ledger bo'lsa undan foydalan. Bo'lmasa, ledger
    zarurati va migration xavfini bahola; keraksiz yangi model yaratma.

## Testlar

-   Duplicate attempt completion.
-   Parallel completion.
-   Repeat attempt.
-   Invalid/negative payload.
-   Study sessionni boshqa user yakunlashga urinish.
-   Juda qisqa duration bilan reward olish.
-   Parallel shop purchase.
-   Stage transitionni qayta yuborish.

**Kun yakuni mezoni:** XP/coin manbalari xaritalangan, kritik rewardlar
serverda va idempotent, testlar natijasi qayd etilgan.

------------------------------------------------------------------------

# 3-kun --- Study, Revision, Flashcards va Analytics

## Maqsad

O'quv progressi haqiqiy test/session ma'lumotlariga tayansin; demo
qiymatlar real natija sifatida ko'rsatilmasin.

## Tekshiriladigan kod

-   `frontend/src/app/study/page.tsx`
-   Study completion API/view/service/model
-   Revision API/model
-   Flashcards API/model
-   `backend/analytics/services.py`
-   `backend/core/services.py`
-   Profile va Analytics sahifalari.

## Vazifalar

1.  Study sahifasidagi `PRESET_MISSIONS`, `currentStreak=17`,
    `todayDayIndex=5` kabi hardcoded qiymatlarni aniqlab, haqiqiy API
    ma'lumotidan ajrat.
2.  API xatosida soxta mission/progress yoki muvaffaqiyat
    ko'rsatilmasin.
3.  Loading, error, empty va retry state qo'sh.
4.  Study completion serverda duration, ownership va duplicate bo'yicha
    tekshirilsin.
5.  Noto'g'ri test javobidan RevisionItem yaratilishini, to'g'ri qayta
    yechilganda yangilanishini va duplicate bo'lmasligini tekshir.
6.  `/tests/mistakes` va `/tests/revision` kabi duplicate
    route/redirectlarni tekshir; muhim deep linklarni saqla.
7.  Flashcard review serverda saqlanishi, user ownership va duplicate
    review himoyasini tekshir.
8.  Spaced repetition algoritmi mavjud bo'lsa, uni saqla va test qil.
    Mavjud bo'lmasa, shoshilinch katta algoritm yozma; minimal taklif
    ber.
9.  `compute_mastery()` completed attempts/question responsesdan
    foydalanishini tasdiqla.
10. Radar ko'rsatkichlaridagi speed/logic/writing haqiqiy o'lchovmi yoki
    level/XP/ELO proxy ekanini aniqlab, proxy bo'lsa shunday label qil.
11. Profile summary va full Analytics bitta canonical data manbasidan
    foydalansin.
12. Tugallanmagan attempt masteryga ta'sir qilmasin.

## Student navigatsiyasi --- 6 ta asosiy tab

Asosiy tablar: 1. Bosh sahifa --- `/dashboard` 2. Sinovlar --- `/tests`
(Standard, Blitz, Stress, Sprint) 3. O'rganish --- `/study` (dars, 60s
konspekt, flashcards, revision, focus) 4. Hamjamiyat --- `/feed` (Feed,
Reels, Stories, savol-javob, sponsored) 5. Arena --- `/battles` (1v1,
class battles, league/rankings) 6. Profil --- `/profile` (statistika,
achievements, inventory, activity, settings; full Analytics ichki
bo'lim)

Eski URL va muhim funksiyalarni o'chirma; ichki bo'limga joylashtir. XP
leaderboard va ELO leaderboard farqli bo'lsa, ularni chalkashtirma.

**Kun yakuni mezoni:** Study/Revision/Flashcards/Analytics data flow
aniq; 6 tab navigatsiya funksiyalarni yo'qotmasdan tartiblangan.

------------------------------------------------------------------------

# 4-kun --- Feed, reklama va advertiser tizimi

## Maqsad

Organik feed va reklama ajratilsin; impression, click, lead va
conversion faqat real trackingdan hisoblansin.

## Tekshiriladigan kod

-   `frontend/src/app/feed/page.tsx`
-   `backend/b2b_ads/`
-   Feed model/serializer/API
-   `EduCenterCampaign`
-   `StudentLeadSubmission`
-   Telegram lead flow va tracking service.

## Vazifalar

1.  Feed post turlari, visibility, owner, pagination,
    like/comment/share, report/moderationni tekshir.
2.  Sponsored post aniq "Reklama" deb belgilansin.
3.  Oldin ko'rilgan fixed `subject=Tarix&score=42` targeted offer
    qiymatlari hali mavjudmi tekshir. Haqiqiy mastery serverdagi
    canonical profildan olinsin; client qiymati mastery deb qabul
    qilinmasin.
4.  Campaign lifecycle: draft, active, paused, ended, budget exhausted.
5.  Impression faqat reklama real ko'rsatilganda yozilsin.
6.  Click faqat real click eventida yozilsin; duplicate/bot clicklar
    nazorat qilinsin.
7.  Budget decrement atomik bo'lsin; tugagan kampaniya ko'rsatilmasin.
8.  Lead duplicate prevention va Telegram flowni tekshir.
9.  Advertiser faqat o'z kampaniya va leadlarini ko'rsin.
10. Telefon va boshqa PII advertiserga faqat foydalanuvchi roziligi
    bilan uzatilsin; voyaga yetmaganlar ma'lumotiga alohida ehtiyot
    bo'l.
11. Metrikalar: impressions, reach (hisoblash mumkin bo'lsa), clicks,
    CTR, leads, CPL, real enrollment conversions, spent, remaining
    budget.
12. Backendda yo'q metrikani UIga soxta raqam qilib qo'yma.
13. Lead CRM statuslari: new, contacted, enrolled, rejected --- mavjud
    modelga mos bo'lsa.

IlmIldizi loyihasida professional Ads Manager tizimini to‘liq audit qil va mavjud arxitekturani buzmasdan rivojlantir.

Maqsad: ta'lim markazlari va boshqa advertiserlar IlmIldizi platformasida mustaqil reklama kampaniyalarini yaratishi, boshqarishi va natijalarini kuzatishi mumkin bo‘lsin.

Quyidagi modullarni tekshir va kerakli joylarini implement qil:

1. Campaign Management — kampaniya yaratish, tahrirlash, draft, active, paused, completed statuslari.
2. Creative Management — banner, rasm, video, matnli reklama, preview.
3. Audience Targeting — fan, sinf, hudud va boshqa ruxsat etilgan segmentlar.
4. Budget Management — kunlik va umumiy budjet, xarajatlar, qolgan balans.
5. Ad Placement — Feed va platformadagi mavjud reklama joylari.
6. Tracking — impressions, unique reach, clicks, CTR, leads, CPL, conversions.
7. Billing — CPC/CPM kabi modelni mavjud payment infratuzilmasiga mos ravishda loyihalash.
8. Lead CRM — new, contacted, enrolled, rejected statuslari.
9. Analytics Dashboard — grafiklar, sana bo‘yicha filter, kampaniya taqqoslash.
10. A/B Testing — kreativ variantlarini solishtirish.
11. Anti-Fraud — bot clicks, duplicate clicks va sun'iy impressionlardan himoya.
12. Role Permissions — advertiser faqat o‘z kampaniyalari va leadlarini ko‘rsin; Super Admin to‘liq nazorat qilsin.

Muhim:
- Avval mavjud backend model, API va frontendni chuqur tekshir.
- Mavjud EduCenterCampaign va StudentLeadSubmission modellarini qayta ishlatish imkonini bahola.
- Bir xil funksiyani takrorlaydigan yangi model yoki endpoint yaratma.
- Barcha statistikalar haqiqiy tracking eventlariga asoslangan bo‘lsin.
- Budjet va xarajatlar atomik hisoblanishi kerak.
- O‘quvchilarning shaxsiy ma'lumotlari, ayniqsa voyaga yetmaganlar ma'lumotlari, rozilik va permission bilan himoyalansin.
- Fake analytics yoki demo raqamlarni productionda ko‘rsatma.
- Backend testlari va frontend buildni bajar.
- Ishlayotgan funksiyalarni buzma.
- Main'ga merge va production deploy qilma.

Yakunida Ads Manager uchun bajarilgan ishlar, APIlar, database o‘zgarishlari, test natijalari va qolgan muammolarni hisobot qil.


Implementatsiya strategiyasi: Avval mavjud arxitektura va kodni audit qilib, barcha modullar bo‘yicha EXISTS / PARTIAL / MISSING / BROKEN holatlarini aniqlagin. Keyin implementatsiya rejasini tuzib, mavjud modellar va endpointlarni maksimal qayta ishlat. Har bir modulni kichik bosqichlarda implement qil va test qil. Yangi model yoki migration yaratishdan oldin mavjud model bilan yechish mumkinligini isbotla. Biror modulni to‘liq implement qilish imkoni bo‘lmasa, uni tayyor deb ko‘rsatma — aniq sabab va qolgan ishlarni hisobot qil.

## Testlar

-   Advertiser A → Advertiser B data access rad etilsin.
-   Campaign tugagan/budget exhausted bo'lsa ko'rsatilmasin.
-   Duplicate lead.
-   Duplicate/parallel click.
-   Unauthorized PII access.
-   CTR/CPL formulalari.
-   Campaign budget race condition.

**Kun yakuni mezoni:** Feed visibility va reklama lifecycle xaritasi,
tracking va advertiser permissions testlangan.

------------------------------------------------------------------------

# 5-kun --- Teacher va Super Admin panellari

## Maqsad

Role-based access frontend menyusiga emas, backend permissionga
tayansin; Teacher va Admin ish jarayoni aniq guruhlansin.

## Teacher

Mavjud bo'limlar: Dashboard, Tests, Lessons, Games, Class Battles, My
Class, Reviews.

Tavsiya etilgan guruh: 1. Dashboard. 2. Sinflar va o'quvchilar. 3.
Kontent --- tests, lessons, games. 4. Baholash va analitika --- reviews,
progress, results. 5. Jonli dars/Arena --- live class, class battles.

Tekshir: - Teacher faqat o'z sinfi va o'quvchilarini ko'radimi? - Boshqa
teacher resursini tahrirlay oladimi? - Teacher XP/coin balansini
o'zgartira oladimi? - Test create/publish permissionlari ajratilganmi? -
Review/essay baholash audit logga yoziladimi?

## Super Admin

`PanelShell` va admin route/APIlarni xaritala. 6 guruh: 1. Dashboard. 2.
Foydalanuvchilar va rollar. 3. Ta'lim kontenti. 4. Growth va marketing.
5. Moliya. 6. Tizim va xavfsizlik.

Mavjud sahifalarni o'chirma; faqat guruhla.

## Permission matrix

Mavjud rolelarni aniqlab, har bir endpoint uchun
anonymous/authenticated/owner/role/object permissionni hujjatlashtir.

Testlar: - Student → admin endpoint 403. - Teacher → boshqa teacher
resource 403. - Advertiser A → Advertiser B campaign/lead 403/404. -
Anonymous → protected API 401/403. - URL object ID almashtirish orqali
IDORga urinish. - Admin destructive action audit log.

**Kun yakuni mezoni:** Teacher/Admin nav tartiblangan; muhim APIlar
object-level permission bilan himoyalangan va testlangan.

------------------------------------------------------------------------

# 6-kun --- Frontend UX, API error handling, responsive va performance

## Maqsad

Asosiy sahifalar barqaror, tushunarli va turli ekranlarda ishlasin. UX
tuzatishlar biznes logikani buzmasin.

## Vazifalar

1.  Frontend route inventory tuz: Student, Teacher, Advertiser, Admin,
    Public/Auth.
2.  Har sahifa uchun API calls, loading/error/empty state, role va
    hardcoded data ro'yxatini tuz.
3.  API client/interceptor, token refresh, 401/403/404/429/500, timeout
    va offline holatlarini tekshir.
4.  Retry faqat xavfsiz/idempotent requestlarda bo'lsin. Reward,
    purchase, payment va answer POSTlari idempotency himoyasisiz
    avtomatik qayta yuborilmasin.
5.  Fake user count, rating, streak, mastery, leaderboard, campaign
    metrics, revenue va AI recommendationlarni top.
6.  Ularni real backend data, development demo yoki olib tashlash kerak
    bo'lgan qiymat deb ajrat.
7.  Responsive viewportlarni tekshir: 360×800, 390×844, 768×1024,
    1280×800, 1440×900.
8.  Horizontal overflow, modal clipping, sticky header/footer, mobile
    nav, text clipping, chart/table scroll va touch targetlarni tekshir.
9.  Backendda N+1 query, pagination, index, katta payload va cache
    invalidationni ko'rib chiq.
10. Frontendda unnecessary rerender, bundle, lazy loading, image
    optimization, duplicate fetch va socket cleanupni ko'rib chiq.
11. Accessibility: input label, keyboard navigation, focus, contrast,
    semantic controls, modal focus trap.
12. Faqat aniq muammo topilgan joylarni patch qil; dizayn uchun butun
    sahifani qayta yozma.

**Kun yakuni mezoni:** Kritik sahifalarda loading/error/empty state;
demo qiymatlar ajratilgan; responsive va performance muammolari
prioritetlangan.

------------------------------------------------------------------------

# 7-kun --- Regression, security review va release readiness

## Maqsad

Oldingi 6 kun ishlarini test qilish va merge/deployga tayyorlik haqida
halol xulosa berish. Bu kunda ham merge yoki deploy qilinmaydi.

## Backend testlar

Mavjud test config va commandlarni aniqlab, quyidagilarni real bajar: -
Test auth/permissions. - Sprint answer. - Blitz answer. - Standard
Attempt completion. - Reward idempotency. - Study completion. -
Revision. - Flashcard review. - Learning Loop stage transition. - Shop
purchase concurrency. - Feed visibility. - Ad impression/click/lead. -
Teacher object permissions. - Admin role permissions.

## Frontend

Lockfile va package scriptsni tekshir. So'ng mavjud scriptlarga mos
ravishda: - TypeScript typecheck. - Lint. - Production build. -
Component/unit test. - Route/import tekshiruvi.

Testni bajarib bo'lmasa, sababini yoz. Xatoni yashirma, testni o'chirma
va assertionni zaiflashtirma.

## Security checklist

-   [ ] Javob kalitlari GET orqali chiqmaydi.
-   [ ] Protected API auth bilan himoyalangan.
-   [ ] Object-level permission bor.
-   [ ] IDOR tekshirildi.
-   [ ] Input validation bor.
-   [ ] Reward server-side hisoblanadi.
-   [ ] Duplicate POST himoyalangan.
-   [ ] Parallel request/race condition tekshirildi.
-   [ ] Rate limiting kerakli joylarda mavjud.
-   [ ] Sensitive data response/logga chiqmaydi.
-   [ ] Advertiser PII consent bilan himoyalangan.
-   [ ] Admin destructive action audit logga ega.
-   [ ] Secret repositoryga yozilmagan.

## Biznes logika checklist

-   [ ] Standard Test.
-   [ ] 7-Savol Blitz.
-   [ ] Stress Mode.
-   [ ] Sprint.
-   [ ] XP/coin/level/streak.
-   [ ] Revision.
-   [ ] Study completion.
-   [ ] Flashcards.
-   [ ] Learning Loop.
-   [ ] Shop.
-   [ ] Feed.
-   [ ] Ads/lead.
-   [ ] Teacher.
-   [ ] Super Admin.
-   [ ] Analytics.

Har biriga status belgila: PASS / PARTIAL / FAIL / NOT TESTED / BLOCKED.

## Git yakuniy tekshiruv

-   `git status`
-   `git diff --check`
-   `git diff main...HEAD --stat`
-   `git diff main...HEAD`
-   Keraksiz debug log/print.
-   Tasodifiy `.env`, build output yoki generated file.
-   Migrationlar va commitlar ro'yxati.

## Yakuniy hisobot

1.  Bajarilgan ishlar.
2.  O'zgartirilgan fayllar va migrations.
3.  Critical/High/Medium/Low muammolar.
4.  Backend test natijalari.
5.  Frontend typecheck/build natijalari.
6.  Qo'lda tekshirilishi kerak bo'lgan flowlar.
7.  Qolgan ishlar.
8.  Merge tavsiyasi: READY / NOT READY.
9.  Deploy tavsiyasi: READY / NOT READY.
10. Qaror sabablari.

------------------------------------------------------------------------

# Definition of Done --- umumiy yakuniy mezonlar

"Hammasi tayyor" deyish uchun: - Javob kalitlari clientga oldindan
chiqmasligi. - Protected API va object permissions testlangan
bo'lishi. - XP/coin server-side, idempotent va parallel requestga
chidamli bo'lishi. - Test, Study, Revision va Analytics real ma'lumotdan
foydalanishi. - Shop purchase balansni buzmasligi. - Learning Loop
transitionlari biznes qoidaga mos bo'lishi. - Student navigatsiyasi 6
tab, muhim funksiyalar saqlangan bo'lishi. - Teacher/Admin
permissionlari backendda tekshirilgan bo'lishi. - Reklama metrikalari
real trackingka tayangan bo'lishi. - Backend testlar, frontend typecheck
va build real bajarilgan bo'lishi. - Qolgan muammolar ochiq qayd etilgan
bo'lishi. - Merge va deploy faqat alohida ruxsat bilan bajarilishi.

## Claude Code ish uslubi

Har kunni alohida bajargin. Bir promptda butun repositoryni qayta yozma.

Har kun boshida: 1. Branch va git statusni tekshir. 2. Shu kun uchun
tegishli source code va testlarni o'qi. 3. Audit natijasini qisqa yoz.
4. Tasklarni kichik patchlarga bo'l. 5. Har patchdan keyin test va diff
review qil. 6. Kun yakunida hisobot ber.

Agar katta arxitektura qarori kerak bo'lsa, 2--3 variantni, xavflarini
va tavsiyangni ko'rsatib, tasdiq so'ra.

**Asosiy qoida:** maqsad ko'p kod yozish emas. Maqsad --- real
foydalanuvchilar ishlatayotgan IlmIldizi funksiyalarini buzmasdan,
xavfsiz, ishonchli va o'lchanadigan mahsulotga aylantirish.
