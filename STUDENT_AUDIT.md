# O'quvchi sifatida to'liq sinov — topilmalar ro'yxati

Sinov: 2026-11-03, lokal muhit (`localhost:3500`), telefon kengligi 375px.
Yangi o'quvchi `sardor_walk01` sifatida noldan boshlandi: landing → ro'yxatdan o'tish →
onboarding → sprint → dashboard (Learning Loop 1-raund to'liq) → test (30 savol) →
natija → xatolar testi → mentor → battle → qolgan barcha sahifalar.

Belgilar: **P0** — ishonch yoki pulga to'g'ridan-to'g'ri zarar, darhol tuzatish kerak;
**P1** — funksiya buzilgan yoki noto'g'ri ishlaydi; **P2** — UX, matn, kontent sifati.

---

## 1. Soxta ma'lumotlar va aldovchi va'dalar (P0)

Bular eng xavflisi: o'quvchi va ota-ona platformaga ishonchini yo'qotadi, ba'zilari
huquqiy muammo tug'diradi.

- [ ] **Onboarding natijasi qattiq yozilgan.** 7 savoldan 2 tasiga to'g'ri javob bergan
      o'quvchi ham "B+ potensial, 164.5/189 ball, A daraja kafolatlanadi" ko'radi.
      `frontend/src/components/growth/DopamineOnboarding.tsx:336-383`
- [ ] **"Rasmiy Milliy Sertifikat" har qanday natijaga beriladi** (13% — "sinovdan
      o'tmadi" bo'lsa ham). Matnida "BILIM VA MALAKALARNI BAHOLASH AGENTLIGI
      STANDARTLARI ASOSIDA", "QR VERIFIED", "Direktor" imzosi — davlat hujjatiga
      o'xshatilgan. Huquqiy xavf.
      `app/tests/[attemptId]/feedback/page.tsx:1001`, `components/student/CertificateModal.tsx:230`
- [ ] **Soxta esse bahosi.** Esse yozmagan o'quvchiga "45-Topshiriq Esse 54/75 ball" va
      "🔒 21 ball yo'qotgan 3 ta xato yashirilgan — oching" pullik qulfi ko'rsatiladi.
      `components/exam/AiEssayPaywall.tsx`
- [ ] **Soxta "jonli lenta"** dashboard tepasida: Javohir, Malika, Shaxzoda, Otabek...
      hammasi qattiq yozilgan. `components/dashboard/ModernHeroDashboard.tsx:78-84`
- [ ] **Soxta "AI diagnostika"**: testi yo'q o'quvchiga "XIX asr xonliklari — 42%,
      prognoz 178.4". `backend/b2b_ads/views.py:22-24`
- [ ] **Soxta prognoz "178.4 / 189"** yangi o'quvchida (sprint sahifasi, landing).
- [ ] **Soxta aksiya taymeri** /premium da: har kirishda 08:42:15 dan qayta boshlanadi
      (ichida bug ham bor: daqiqa hech qachon kamaymaydi). "50% gacha chegirma",
      "4,300+ abituriyent faol" ham soxta. `app/premium/page.tsx:84-101, 207`
- [ ] **Soxta sonlar**: "+142 kutishda" (LiveRepublicBanner), "48 nafar o'quvchi zalda"
      (/study), landingdagi "4.9/5", "1,500+ savol" (bazada jami ~1040),
      /dtm-test "1,200+ savol", "950+".
- [ ] **Landingdagi soxta o'quvchilar** ("Shahzodbek Qodirov — TDYU Davlat Granti,
      186.4 ball" va h.k.). Haqiqiy fikrlar bo'lmasa — olib tashlash.
- [ ] **Bajarilmaydigan va'dalar**:
  - Onboarding "+100 🪙 Bonus" — tanga berilmaydi.
  - Dashboard "3 daqiqalik sinov — +50 Tanga" (onboardingdagi 7 savollik blits bilan
    takrorlanadi, raqamlari boshqa).
  - Duel taklifi "+15 Tanga va Katta Mock bepul chipta" — backend +100 tanga beradi.
  - Xatolar testi "2 daqiqada" — aslida 15 savol, 15 daqiqa.
- [ ] **`active_campaign_api` hali ham soxta "Registon O'quv Markazi" yaratadi**
      (targeted-offer'da tuzatilgan, bu yerda qolgan). `backend/b2b_ads/views.py:39-55`

## 2. Pul / mukofot teshiklari (P0)

- [ ] **Do'konda 100 tangaga barcha premium mocklar ochiladi** (`premium_test_unlock`),
      Learning Loop esa bir raundda 400 tanga beradi → pullik kontent amalda bepul.
      `backend/shop/services.py:46-63`
- [ ] **Xatolar testi orqali XP/tanga farm**: natija sahifasida to'g'ri javoblar
      ko'rinadi, "Xatolarni yanchish" har safar yangi test yaratadi → qayta topshirish
      himoyasi ishlamaydi (+400 XP, +40 tanga 1 daqiqada).
- [ ] **Sprint to'g'ri javobni oldindan yuboradi** (`correct_option_id` savol bilan
      birga keladi).

## 3. Buzilgan funksiyalar (P1)

- [x] **Sprint har bir javobni XATO deb hisoblaydi.** API `correct_option_id`
      (snake_case) qaytaradi, frontend `correctOptionId` kutadi → `undefined`.
      Natija: "❌ Nega adashdingiz: Siz aslida to'g'ri javobni tanladingiz", har savol
      "Qasos"ga aylanadi, 10 savol 11, 12... bo'lib ketadi. Onboarding o'quvchini aynan
      shu sahifaga olib boradi.
      `backend/sprint/views.py:323-329` ↔ `frontend/src/hooks/useNeuralSprint.ts:160`
- [x] **Battle sahifasidagi asosiy "Duelni Boshlash (3s)" tugmasi hech narsa qilmaydi.**
      `setInGhostArena(true)` chaqiriladi, lekin bu holat hech qayerda o'qilmaydi
      (arena `mode === 'ghost'` da chiziladi). `app/battles/page.tsx:69, 489-493`
- [x] **Learning Loop "To'xtatish" tugmasi avtostartni to'xtatmaydi** — 2-raund baribir
      boshlanadi; sarlavhada eski mavzu qoladi.
- [x] **Loop mavzusi va savollari mos emas**: mavzu "Antik davlatlar va Qadimgi Rim",
      savollar Amir Temur va jadidlar haqida; onboardingdagi zaif mavzu hisobga
      olinmaydi (`Topic.first()`).
- [x] **/tests/mistakes savol matnini xom HTML bilan ko'rsatadi** (`<p>...</p>`).
- [x] **Har sahifada hydration xatosi**: mavzu tugmasi (`isDark`) birinchi renderda
      `localStorage` dan o'qiladi → React butun daraxtni qayta quradi.
      `components/AppShell.tsx` (mavzu tugmasi)
- [x] **Ro'yxatdan o'tish**: "Kamida 6 belgi" deyilgan, server 8 talab qiladi; xato
      matni inglizcha ("This password is too short...").
- [x] **Testni "Yakunlash"** javobsiz savollar bo'lsa ham tasdiqlashsiz yakunlanadi.
- [x] ~~Ba'zi loop sprint javoblari birinchi bosishda qabul qilinmaydi~~ — bug emas:
      xato javobdan keyin AI Mentor oynasi yopilguncha variantlar ataylab o'chiriladi.
- [ ] **Ghost arena raqibi "Jonli" deb belgilanadi**, holbuki u yozib olingan/generatsiya
      qilingan replika.

## 4. Kontent sifati (P1/P2)

- [ ] **24 ta "Demo savol N"** (`seed_panel_demo`) o'quvchilarga battle'da chiqadi —
      prod bazada ham bo'lsa o'chirish kerak.
- [ ] **3111 variantdan 916 tasida harf matnga yopishgan** ("A) Jakeriya..."); aralashtirilgach
      D), B), C), A) tartibida ko'rinadi. Import paytida harflarni kesish + bir martalik tozalash.
- [ ] **Mavzudan tashqari savol**: "7-sinf DMT 8-qism: Amir Temur (XIV–XV asr)" testida
      2017-yilgi kursantlar maktabi haqidagi savol (30-savol).
- [ ] Natijadagi qiyinlik bo'yicha blok foydasiz: test savollarining hammasi "O'rtacha".
- [ ] AI tahlil o'quvchiga "sen" deydi va kirill harflari aralashadi ("yuboryapсан").
- [ ] Loop shpargalkasi va flashcard "layfxak"lari — har mavzu uchun bir xil umumiy shablon.
- [ ] "+200 Tanga" kartada, sandiqda "+400" (combo bilan ko'paytiriladi — kartada aytilmaydi).
- [x] Kartada "15 ta savol" (aslida 12); "Combo oshdi" combo o'zgarmasa ham; xatolar
      haqidagi xabar flashcardlardan keyin chiqardi.

## 5. UX va matn (P2)

- [ ] **Dashboard haddan tashqari uzun** — loop, turnir, blits taklifi, tavsiyalar,
      qurollar, streak, AI diagnostika, reklama, reyting... Asosiy harakat yo'qolib ketadi.
- [ ] **Natija sahifasida ~15 ta CTA** (sertifikat, story, duel, ulashish, PDF, arena,
      sandiq, reels, darslar, 3000 so'm, esse, haftalik pass, PRO...).
- [ ] **4 ta o'xshash "blits"**: onboarding "Dofamin Blits", /tests "7-Blits" tabi,
      "Tezkor Blits Test", /sprint. Bitta tushunchaga birlashtirish.
- [ ] **3 ta "xatolar" bo'limi**: /tests/mistakes, /tests/revision, flashcard "Xatolar Banki".
- [ ] Ichki atamalar foydalanuvchiga ko'rinadi: "Dofamin Blits", "STRAVA REJIMI",
      "Konveyer oqimi", "Layfxak".
- [ ] Fanlar ziddiyati: /sprint Ona tili, Matematika, Biologiyani "Tez kunda" deydi,
      /tests esa ularning testlarini ko'rsatadi. O'yinlarda fan tablari bor, kontent
      faqat Tarix.
- [ ] Onboarding fan / maqsad / hududni so'ramaydi — shaxsiylashtirish uchun kerak.
- [ ] "EASY/MEDIUM/HARD" inglizcha; auth sahifalarining `<title>` i "DTM Test Yechish...".
- [ ] Onboardingdan keyin darhol yana qo'llanma modali (modal ustiga modal).
- [ ] Loop 2-raundni 2 soniyada o'zi boshlaydi — juda agressiv avtoplay.
- [ ] "+2.3 DTM Ball" sandiq mukofoti sifatida — ma'nosiz raqam.
- [ ] Yon menyudagi chiqish tugmasi tasdiqlashsiz, `aria-label` siz.
- [ ] Test ekranida taymer o'ng chetga biroz kesiladi (375px).

## 6. Sahifalar: qoldirish, yashirish, birlashtirish

| Sahifa | Holati | Tavsiya |
|---|---|---|
| `/` landing | Ishlaydi, soxta isbot ko'p | Qoldirish, soxta qismlarni olib tashlash |
| `/onboarding` | Soxta natija | Fan/maqsad tanlash + haqiqiy natija; yoki 1 ta qisqa ekran |
| `/dashboard` | Ishlaydi, juda uzun | Qoldirish, 3-4 blokka qisqartirish |
| `/tests`, test, natija | Asosiy, ishlaydi | Qoldirish — platforma yuragi |
| `/tests/history` | Ishlaydi | Qoldirish (profilga havola) |
| `/tests/mistakes` + `/tests/revision` | Bir xil ish, HTML bug | **Birlashtirish** bitta "Xatolarim" ga |
| `/sprint` | Baholash buzilgan | Tuzatish yoki loop ichiga birlashtirish |
| Learning Loop (dashboard) | Endi ishlaydi | Qoldirish, mavzu/savol bog'lanishini tuzatish |
| `/battles` | Asosiy tugma o'lik | Tuzatish; bitta duel turini qoldirish |
| `/games/*` | Faqat Tarix | Qoldirish, boshqa fan tablarini yashirish |
| `/mentor` | Ishlaydi | Qoldirish |
| `/flashcards` | Ishlaydi | Qoldirish |
| `/study` | Ishlaydi, soxta son | Qoldirish, sonni olib tashlash |
| `/learning` | `/study` ga redirect | **O'chirish** (dublikat yo'l) |
| `/library` | 0 kitob | **Yashirish** kitob qo'shilguncha |
| `/reels` | 0 reel | **Yashirish** kontent qo'shilguncha |
| `/feed` | Bo'sh | Foydalanuvchilar ko'paygunicha yashirish yoki dashboardga kichik blok |
| `/leaderboard` | Ishlaydi | Qoldirish |
| `/analytics` | Ishlaydi | Qoldirish (profilga birlashtirish mumkin) |
| `/shop` | 100 tangaga premium | Premium unlock'ni olib tashlash |
| `/premium` | Soxta taymer | Qoldirish, soxta shoshilinchlikni olib tashlash |
| `/profile` | Ishlaydi | Qoldirish |
| `/milliy-sertifikat`, `/dtm-test` | SEO sahifalar | Qoldirish, sonlarni haqiqiysiga moslash |

## 7. Yaxshi ishlagan qismlar

- Ro'yxatdan o'tish, login, onboarding oqimi texnik jihatdan ishlaydi.
- Test yechish ekrani toza va tez; natija, AI tahlil (kuchsiz mavzular) mazmunli.
- Learning Loop 1-raund boshidan oxirigacha o'tdi, sandiq va mukofot server tomonda to'g'ri.
- Barcha sahifalar 375px da gorizontal toshmaydi, API xatosi yo'q.
- AI Mentor to'g'ri javob berdi.
