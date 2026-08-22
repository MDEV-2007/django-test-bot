# IlmIldizi — SaaS darajasidagi to'liq Figma UI spetsifikatsiyasi

Bu hujjat har bir sahifaning har bir elementini — layout grid, komponent, matn (copy), holat (state), spacing — alohida tasvirlaydi. Figma'da (yoki Figma AI/First Draft) to'g'ridan-to'g'ri promt sifatida ishlatish uchun tayyor. Manba: loyihaning haqiqiy kod bazasi (`frontend/src/app/globals.css`, `templates/base.html`, va barcha sahifa fayllari).

---

## 0. Dizayn tizimi — global qoidalar (har bir sahifada qo'llaniladi)

### 0.1 Rang token'lari

**Dark rejim (default):**
```
bg-page: #17181a
accent: #2fb3a3         accent-hover: #269488      accent-soft: rgba(47,179,163,.16)   accent-border: rgba(47,179,163,.35)   accent-text: #5cc4b6   on-accent: #0d1416
success: #6b9b6f        success-soft: rgba(107,155,111,.16)   success-text: #93bf96
danger: #c9645c         danger-soft: rgba(201,100,92,.14)     danger-text: #dd8781
text-primary: #e9eaeb   text-secondary: #b7b9bc   text-muted: #8d9094   text-faint: #5a5d63
border-soft: rgba(255,255,255,.05)   border-card: rgba(255,255,255,.09)   border-strong: rgba(255,255,255,.16)
surface-hover: rgba(255,255,255,.05)   surface-card-soft/medium: #202226   surface-card-strong: #1c1e21   surface-input: #25272b
```

**Light rejim:**
```
bg-page: #eef0f1
accent: #1f8a7c   accent-hover: #186f64   accent-soft: #d9f0ec   accent-text: #14655a   on-accent: #ffffff
success: #3f7a4a  success-soft: #e1eee2   success-text: #2f5c38
danger: #a8402f   danger-soft: #f6ded9    danger-text: #8a3323
text-primary: #1c1e20   text-secondary: #4a4d51   text-muted: #6b6e73   text-faint: #9a9da2
border-soft: rgba(20,20,22,.06)   border-card: rgba(20,20,22,.10)
surface-card-soft: #ffffff   surface-input: #f2f3f4
```

**Gamifikatsiya "tint" ranglari** (statistika kartalari uchun, har birining yumshoq-fon + to'yingan-matn jufti bor):
- 🔥 Streak — olov-to'q sariq (masalan fon `orange-500/10`, matn `orange-400`)
- 🪙 Tanga — amber/oltin (fon `amber-500/10`, matn `amber-400`)
- 🏆 Level — zumrad-yashil (fon `emerald-500/10`, matn `emerald-400`)
- ⚡ ELO — ko'k (fon `blue-500/10`, matn `blue-400`)

### 0.2 Tipografiya

- Asosiy: **Inter**, vazn 400 (matn) / 500 (label) / 600 (subtitle) / 700 (h2/tugma) / 800 (h1).
- Aksent (`font-voice`): **Georgia/serif** — FAQAT shaxsiy salomlashuv sarlavhalarida ("Salom, Aziz!"), landing va splash sarlavhalarda.
- O'lcham shkalasi: 11px (badge/caption) / 12–13px (kichik matn) / 14px (asosiy body) / 16–18px (subtitle) / 20–24px (h2) / 28–36px (h1).

### 0.3 Komponent kutubxonasi (Figma component set sifatida yarating)

| Komponent | Tavsif |
|---|---|
| **Glass Card** | `surface-card-soft` fon, 1px `border-card` chegara, radius 20–32px (ko'pincha 28px), ichki padding 16–24px. Butun saytning asosiy konteyner birligi. |
| **Icon Tile** | 40×40 yoki 60×60 kvadrat, radius 12–16px, `accent-soft` fon, ichida 20–24px chiziqli ikonka (Lucide). |
| **Stat Tile** | Icon Tile (kichikroq, 32px, tint-rangda) + ustida label (11px, muted) + tagida katta raqam (18–20px, bold). Grid'da 2–4 ustunda takrorlanadi. |
| **Badge/Chip** | `rounded-full`, padding 4×10px, 11px font-weight 600, semantik fon+matn jufti (yashil=faol, qizil=xato/bloklangan, amber=kutilmoqda/qoralama, ko'k=neytral). |
| **Progress Bar** | Balandligi 8–10px, `rounded-full`, fon `surface-hover`, to'ldirilgan qism `accent` yoki gradient, ustida label+% matn. |
| **Button/Primary** | To'liq `accent` fon, `on-accent` matn, radius 12–16px, padding 12×20px, font-weight 600. Hover: `accent-hover`. Disabled: 50% opacity. |
| **Button/Secondary** | `surface-hover` fon + `border-card` chegara, `text-primary` matn. |
| **Button/Outline** | Shaffof fon, `accent-border` chegara, `accent-text` matn. |
| **Button/Danger** | `danger-soft` fon, `danger-text` matn. |
| **Input/Select/Textarea** | `surface-input` fon, `border-card` chegara, radius 10–12px, padding 10×12px, focus holatida `accent` chegara. |
| **Avatar** | Doira, 32/40/56/96px o'lchamlarda, `border-card` ingichka halqa, default — dicebear "adventurer" SVG. |
| **Table Row** | `border-soft` pastki chiziq, hover — `surface-hover` fon, checkbox (bulk-select uchun) chap tomonda. |
| **Empty State** | Markazlashgan, katta emoji/ikonka (32–48px) + `text-faint` matn + ba'zan CTA tugma. |
| **Toast/Notice** | Yashil (`success-soft`) muvaffaqiyat yoki qizil (`danger-soft`) xato uchun, karta tepasida to'liq kenglikda. |

### 0.4 Navigatsiya strukturasi (barcha sahifalarda takrorlanadi)

**Desktop (≥1024px):** Chap tomonda 240–260px kenglikdagi vertikal sidebar. Yuqoridan pastga: logo, asosiy havolalar ro'yxati (har biri ikonka+matn, faol holat `accent-soft` fon bilan), pastda "Profile Bottom Widget" — avatar+ism+"Lvl N · N XP"+chiqish ikonkasi, `border-card` chiziq bilan ajratilgan.

**Mobil (<768px):** Sidebar yashiriladi, ekranning eng pastida sobit (fixed) gorizontal tab-bar — 5 ta ikonka (Dashboard/Testlar/O'qish/Arena/Profil), faol tab `accent-text` rangda.

**Uch xil sidebar to'plami** (rolga qarab butunlay boshqa ro'yxat):
1. **O'quvchi**: Dashboard, Testlar, O'qish, Arena, AI Mentor, Do'kon, Premium, Analitika, Reyting, Profil.
2. **O'qituvchi**: Dashboard, Testlarim, Darslarim, O'yinlarim (alohida "teacher" rang-urg'usi bilan, masalan sidebar tepasida "O'QITUVCHI PANELI" label).
3. **Super Admin**: Dashboard, Foydalanuvchilar, O'qituvchilar, Fanlar, Do'kon, Testlar, Darslar, O'yinlar, Natijalar, To'lovlar, Xabar yuborish, Audit, Sozlamalar — qizil/kontrast urg'u bilan ajratilgan admin-rejimi ko'rsatkichi.

---

## 1. AUTH VA KIRISH OQIMI

### 1.1 Login
**Maqsad:** Mavjud foydalanuvchi tizimga kirishi.
**Layout:** To'liq ekran markazida bitta Glass Card, max-width 384px (24rem), vertikal markazlashgan.
**Komponentlar (yuqoridan pastga):**
1. H1 "IlmIldizi'ga kirish" (20px, semibold).
2. Xato bo'lsa — qizil Notice banner ("Foydalanuvchi nomi yoki parol xato!").
3. **Google Sign-In tugmasi** — Google'ning o'z widget uslubi (oq fon, "G" logo, "Google hisobingiz bilan kiring" matni), to'liq kenglik.
4. Agar Telegram Mini App ichida ochilgan bo'lsa — **Telegram tugmasi** (Telegram-ko'k fon `#2AABEE`, oq matn "Telegram orqali kirish").
5. Ajratuvchi chiziq — "yoki" matni markazida, ikki tomonida ingichka gorizontal chiziq.
6. Input/Username (label "Foydalanuvchi nomi").
7. Input/Password (label "Parol", type=password).
8. Button/Primary to'liq kenglik "Hisobga kirish" (yoki loading holatida "Kirilmoqda...").
9. Pastda markazda kichik matn-havola "Ro'yxatdan o'tish" (`accent-text`).
**Holatlar:** default / loading (tugma disabled+matn o'zgaradi) / xato (qizil banner).

### 1.2 Register
**Layout:** Xuddi Login bilan bir xil karta-markaz shakli, biroz balandroq (ko'proq maydon).
**Komponentlar:**
1. H1 "Ro'yxatdan o'tish".
2. Agar `?ref=` parametri bo'lsa — amber/accent-soft banner: "🎁 Do'stingiz sizni taklif qildi — ro'yxatdan o'tsangiz ikkalangiz ham bonus tanga olasiz!"
3. Google/Telegram ijtimoiy tugmalar (Login bilan bir xil) + "yoki" ajratuvchi.
4. Input/Ism, Input/Familiya, Input/Foydalanuvchi nomi, Input/Parol (4 ta forma maydoni, vertikal stack, har biri label bilan).
5. Button/Primary "Ro'yxatdan o'tish" (loading: "Yaratilmoqda...").
6. Pastda "Hisobim bor" havolasi.

### 1.3 Onboarding
**Layout:** To'liq ekran, 2 qadamli slayder (progress dots yuqorida markazda).
**Komponentlar:** Katta illyustrativ ikonka/emoji, sarlavha (serif shrift), qisqa tavsif matni, pastda "Keyingisi"/"Boshlash" tugmasi + "O'tkazib yuborish" matn-havolasi yuqori o'ng burchakda.

### 1.4 404 — Topilmadi
**Layout:** Markaziy, vertikal, max-width 600px.
**Komponentlar:**
1. Ulkan "404" raqami (110–150px, accent rangda, `bg-clip-text` gradient effekti).
2. Uning ustiga qoplangan kichik dumaloq nishon (yashil fon, 🌱 ikonka, 12° burilgan) — "ildiz otmagan yo'l" metaforasi.
3. H2 "Bu yo'l hali ildiz otmagan".
4. Tavsif matni (muted, max-width 400px, markazlashgan).
5. 4 ustunli mini-grid: Asosiy/Testlar/Darslar/Reyting — har biri kichik glass-card + ikonka + label, bosilganda tegishli sahifaga.
6. Pastda Button/Primary "Bosh sahifaga".

### 1.5 500 — Server xatosi
**Layout:** Kichikroq markaziy karta (max-width 480px), to'liq mustaqil dizayn (asosiy sayt sidebar'isiz — chunki bu xatolik butun ilova ishlamay qolganda ham ko'rinishi kerak).
**Komponentlar:** Ogohlantirish ikonkasi (⚠️, qizil-yumshoq doira fonda), "500" (gradient accent matn, 52px), H2 "Serverda kutilmagan xatolik", tavsif, 2 ta tugma yonma-yon (Primary "Bosh sahifaga" + Secondary "Qayta urinish"), pastda kichik "Telegram orqali xabar bering" matni.

### 1.6 Offline — Internet yo'q
**Layout:** To'liq mustaqil (hech qanday tashqi resurs, font, CSS framework'ga bog'liq emas — chunki internet yo'q holatda ishlashi kerak), markaziy, max-width 416px.
**Komponentlar:** Pulsatsiyalanuvchi (animatsiya) dumaloq ikonka (wifi-off, qizil-yumshoq fon), H1 "Internet aloqasi yo'q", tavsif, "Tekshiring" ro'yxati (Wi-Fi/aviarejim/signal — 3 punkt, chap-tekislangan quti ichida), to'liq-kenglik "Qayta urinish" tugmasi, pastida status matni ("Aloqa kutilmoqda..." → onlayn bo'lganda avtomatik yashil "Aloqa tiklandi").

---

## 2. O'QUVCHI — DASHBOARD VA GAMIFIKATSIYA

### 2.1 Dashboard (Bosh sahifa) — eng murakkab ekran
**Layout:** 2-ustunli asosiy grid (chap 66% + o'ng 34%) desktop'da, mobil'da bitta ustun (stack).

**A-blok — Greeting header (to'liq kenglik):**
- Chapda: kichik "DASHBOARD" label (uppercase, 11px) + agar Premium bo'lsa 👑 badge yonida; H1 serif-shrift "Salom, {Ism}!" (28px); tagida muted tavsif "Bugun ham bilim ildizingiz o'sishda davom etsin."
- O'ngda: Avatar (40px) + ism-familiya (14px semibold) + "Lvl N · N XP" (12px muted).

**B-blok — "Bilim ildizi" widget + stat grid (2 ustun, chap kattaroq):**
- Chap katta karta: 60px o'simlik-SVG ikonka + "Bilim ildizi — Lvl N" sarlavha + "N / N XP keyingi barg uchun" + progress bar.
- O'ng 2×2 mini-grid: Streak (🔥, "N kun"), Tangalar (🪙, N), Level (🏆, "Lvl N"), ELO (⚡, N) — har biri alohida tint-rang fon.

**C-blok:** Agar streak-muzlatish mavjud bo'lsa — kichik ❄️ eslatma matni ("N ta streak muzlatish mavjud").

**D-blok — Tezkor kirish (to'liq kenglik, 4 ustunli grid):** Testlar / Arena / Darslar / AI Mentor — har biri kvadratsimon glass-card, markazda icon-tile + label, hover'da ko'tarilish effekti.

**E-blok — "Davom ettirish" (to'liq kenglik, katta karta):** Chapda fan nomi (uppercase, muted) + tavsiya etilgan mavzu sarlavhasi + qisqa tavsif; o'ngda "Darsni boshlash →" Primary tugma.

**F-blok — Mini o'yinlar (to'liq kenglik, 3 ustunli grid):** Timeline / Xarita / Shaxsni top — har biri ikonka + sarlavha + 1-qatorli tavsif.

**G-blok — O'ng sidebar (yoki mobil'da eng pastda):**
- **"Bugungi yo'l" karta:** sarlavha + "Bugun" label; vertikal timeline chiziq (chapda ingichka vertikal line), har missiya — dumaloq nuqta (bajarilgan=to'liq yashil, bajarilmagan=accent-border bo'sh doira) + missiya nomi (bajarilganda chizib-o'chirilgan/line-through) + tavsif + "⚡ +N XP  🪙 +N" mukofot qatori. Bo'sh holat: "Bugun barcha vazifalar bajarildi!".
- **"Oxirgi imtihonlar" karta:** har qator — test nomi (chapda) + ball badge (o'ngda, rang ballga qarab: ≥80% yashil / ≥50% sariq / <50% qizil). Bo'sh holat: 📄 ikonka + "Siz hali imtihon topshirmagansiz" + "Test topshirish" havola.

### 2.2 Profil
**Layout:** Bitta ustun, max-width 672px, vertikal kartalar to'plami.
**Komponentlar (tepadan pastga):**
1. Avatar (56px) + Ism (H1, 24px).
2. 3 ustunli stat-grid: Level / XP / Tanga.
3. "Referal havola" karta: to'liq havola matni (monospace, accent-text, break-all), tagida "N ta taklif · N tanga" statistikasi.
4. "Nishonlar" bo'limi (agar bor bo'lsa) — chip'lar qatori, har biri rarity rangida, hover'da tooltip (tavsif).
5. "So'nggi testlar" ro'yxati — qator: nomi + ball%.
6. "So'nggi janglar" ro'yxati — qator: "vs {raqib}" + natija (yashil "G'alaba"/qizil "Mag'lubiyat").

### 2.3 Reyting (Leaderboard)
**Layout:** Bitta ustun, max-width to'liq.
**Komponentlar:**
1. H1 "Reyting".
2. Fan filtri chip qatori: "Umumiy" + har fan nomi (faol chip — accent fon).
3. **Top-3 podium** — 3 ustunli grid, har biri: raqam badge (#1/#2/#3), 48px avatar, ism, "N XP".
4. Qolganlar ro'yxati (4-o'rindan) — har qator: raqam+kichik avatar (28px)+ism (chapda), XP (o'ngda, bold).

### 2.4 Analitika (Analytics) — ma'lumot-og'ir dashboard
**Layout:** Bitta ustun, max-width 672px, ko'p bo'limli vertikal stack.
**Komponentlar (tartib bo'yicha):**
1. H1 "Analitika".
2. 4 ustunli stat-grid #1: Level / XP / Tanga / Streak.
3. 4 ustunli stat-grid #2: Aniqlik% / Testlar soni / O'rtacha% / Vaqt(daq).
4. **"Javoblar taqsimoti"** — gorizontal 3-segmentli progress bar (yashil=to'g'ri, qizil=xato, kul rang=o'tkazib yuborilgan), tagida 3 ta legend matni raqamlar bilan.
5. **"Kunlik faollik (14 kun)"** — bar-chart, 14 ta ingichka ustun, balandligi shu kunda yechilgan test soniga proporsional, ostida sana label'lari (kichik, 9px).
6. **"Haftalik jarayon (8 hafta)"** — xuddi shunday bar-chart, 8 ustun, hover/tooltip'da "N test · o'rtacha N% · jami N XP".
7. **"Fanlar bo'yicha javoblar"** — har fan uchun rang-nuqta + nomi + foiz (o'ngda).
8. **"Fanlar bo'yicha egallash"** — har fan uchun label+% + progress bar (fan-rangida to'ldirilgan).
9. **"Mavzular bo'yicha egallash"** — xuddi shunday, lekin mavzu darajasida, accent-rang bar bilan.
10. 2 ustunli grid: "👍 Kuchli mavzular" (yashil chip'lar) / "⚠️ Kuchsiz mavzular" (qizil chip'lar).
11. **"Oxirgi testlar"** jadval-uslubidagi ro'yxat — har qatorda test nomi+sana+to'g'ri/xato/o'tkazib-yuborilgan soni (chapda), ball (o'ngda, bold).

---

## 3. O'QUVCHI — TESTLAR VA O'QISH

### 3.1 Test Markazi
**Komponentlar (tepadan):**
1. Sarlavha qatori: H1 "Test Markazi" (chapda) + "Tasodifiy test" Primary tugma (o'ngda).
2. Fan chip qatori (Tarix/Ona tili/Matematika/Biologiya kabi, faol=accent fon).
3. Kategoriya filtri tugma-qatori: Barchasi/Milliy Sertifikat/Tarix/BBA (faol=accent, bold) + o'ng chetda qidiruv Input ("Qidirish...").
4. Statistika matni: "Jami urinishlar: N · O'rtacha: N%".
5. Test kartalar grid'i (2–3 ustun): har karta — uppercase kategoriya+davomiylik label (muted, 11px), sarlavha (semibold), tavsif (2-qator, line-clamp), "N ta savol" (faint), pastda tugma — agar premium va kirish yo'q bo'lsa qizil "Premium kerak" matni, aks holda "Boshlash" Secondary tugma.

### 3.2 Test yechish ekrani
**Layout:** Bitta ustun, max-width 672px.
**Komponentlar:**
1. Yuqori qator: "Savol N / N" (chapda) + qiyinlik-daraja badge (o'ngda, uppercase kichik) + taymer (mm:ss, agar cheklangan bo'lsa).
2. To'liq-kenglik progress bar.
3. **Savol karta** (glass-card, katta padding):
   - Savol matni (18–20px, semibold, HTML-rich bo'lishi mumkin).
   - Rasm (agar bor — max-height 256px, radius, object-contain).
   - Audio pleer (agar bor — 🔊 ikonka + native audio controls, karta ichida).
   - **Savol turiga qarab dinamik komponent:**
     - *Bitta to'g'ri javob / rasmli / jadvalli:* variant tugmalari vertikal ro'yxat, bosilganda tanlangan holat.
     - *Moslashtirish:* chap ustun (raqamlangan matnlar) + o'ng ustun (harflangan dropdown/tugmalar) — juftlash interfeysi.
     - *Guruhlangan:* ko'rsatma matni + variant ro'yxati (radio-uslubida).
     - *Yozma:* qism-savollar ro'yxati, har biri o'z textarea'si bilan.
4. Pastki navigatsiya: "Oldingi" Secondary (chapda, disabled agar birinchi) + "Keyingi" Primary yoki oxirgi savolda yashil "Imtihonni yakunlash" tugmasi (o'ngda).

### 3.3 Natija va AI Tahlil (Feedback)
**Layout:** Bitta ustun, max-width 672px, ko'p bo'limli.
**Komponentlar (tartibda):**
1. Yuqori o'ng: "🎯 Xatolar ustida ishlash" (qizil-yumshoq, agar 100% bo'lmasa) + "🏅 Testlar ro'yxati" (neytral) tugmalari.
2. **Ball karta:** markazda katta % raqam (36px, accent), tagida "N to'g'ri · N xato · N javobsiz", agar bor bo'lsa "👑 Prognoz sertifikat darajasi: X Daraja".
3. **AI xulosa karta:** umumiy tahlil matni + pastida kursiv-iqtibos qutida motivatsion matn (`"..."`).
4. 2 ustunli grid: "👍 Kuchli mavzular" / "⚠️ Kuchsiz mavzular" chip'lar.
5. **"Aynan qayerda xato qildingiz"** — har xato uchun karta: mavzu badge (uppercase, accent) + savol matni (bold) + 2-ustunli mini-grid (qizil quti "Sizning javobingiz" / yashil quti "To'g'ri javob") + izoh matni + pastda kursiv "eslab qolish" maslahat qutisi.
6. **"Tavsiya etilgan amallar"** — belgi-ro'yxat (›), har qator alohida tavsiya.
7. **"Bosqichma-bosqich yo'l xaritasi"** — raqamlangan qadamlar ro'yxati, har biri nomi+davomiylik badge (o'ngda).
8. **"Savollar tahlili"** — har savol uchun kichik karta (rang: yashil=to'g'ri/neytral=o'tkazib yuborilgan/qizil=xato), savol matni + "Sizning javobingiz" + "To'g'ri javob" (agar xato) + izoh.

### 3.4 Test tarixi
**Komponentlar:** H1 + ro'yxat (har qator link-karta: test nomi (chapda, bold) + ball% (o'ngda, accent-bold); pastki qatorda sana+to'g'ri/xato/o'tkazib-yuborilgan soni, muted) + pastda sahifalash (← Oldingi / N-M / Keyingi →).

### 3.5 Xatolar ustida ishlash (Revision)
**Komponentlar:** H1 + "N ta faol · N o'zlashtirilgan" statistika matni + fan-filtr chip qatori + bitta-bitta savol karta (mavzu+xato-soni label, savol matni, rasm agar bor, variant tugmalari — javob berilgach RANGLANADI: to'g'ri=yashil chegara+fon, tanlangan-lekin-xato=qizil, qolganlar=xira/faint) + natija banner (izoh bilan) + "Keyingisi" tugma. Yozma-turdagi savollar uchun faqat "Tushundim" tugmasi (variant yo'q).

---

## 4. O'QUVCHI — GAMIFIKATSIYA VA IJTIMOIY

### 4.1 Battle Arena
**Holat 1 — Boshlanish ekrani:** 5 ustunli stat-grid (ELO/Janglar/G'alaba/Durang/Mag'lubiyat) + fan-filtr chip qatori + 2 ta yonma-yon katta tugma ("AI bilan jang" Primary / "Jonli o'yinchi bilan" Secondary).
**Holat 2 — Qidiruv:** markazlashgan karta, "Raqib qidirilmoqda..." + loading indikatori.
**Holat 3 — Jang ekrani:** yuqorida "Raund N/N · vs {raqib}" + hisob "N — N"; savol karta + variant tugmalar (yoki "Raqibning javobi kutilmoqda..." holati).
**Holat 4 — Natija:** markazlashgan karta, natija matni (XP/tanga bilan), "Yopish" tugma.

### 4.2 Mini o'yin — Timeline
**Komponentlar:** H1 + tavsif matni + fan-filtr chip'lari + voqealar kartochkalari (vertikal ro'yxat, har birida ↑↓ tartib-o'zgartirish tugmalari) + "Tekshirish" tugma + natija banner (to'g'ri bo'lsa yashil+XP/tanga, xato bo'lsa qizil+to'g'ri tartib ko'rsatiladi) + "Yana o'ynash".

### 4.3 Mini o'yin — Xarita challenge
**Komponentlar:** H1 + fan-filtr + challenge sarlavha/tavsif + xarita rasmi (agar bor) + 2 ustunli variant-tugmalar grid + natija banner.

### 4.4 Mini o'yin — Shaxsni top
**Komponentlar:** H1 + fan-filtr + 3 ta raqamlangan maslahat (clue) qatori (karta ichida) + matn-input+"Tekshirish" tugma qatori + natija banner + "Keyingisi".

### 4.5 O'qish markazi (Learning)
**Layout:** 2-ustunli (chap sidebar 224px + o'ng asosiy kontent).
**Komponentlar:** Yuqorida fan-filtr chip qatori + (agar premium yo'q) amber ogohlantirish banner "🔒 To'liq video/audio darslarga kirish uchun Premium kerak". Chap sidebar: mavzular ro'yxati, har biri ostida darslar tugma-ro'yxati. O'ng blok: dars sarlavhasi + bookmark yulduzcha tugma (★/☆), dars matni (rich-HTML karta), video kartalar (sarlavha+davomiylik+"Videoni ochish" havola), qulflangan video-soni ogohlantirishi, audio pleer kartalari, flashcard'lar 2-ustunli grid (old-tomon bold, orqa-tomon muted).

### 4.6 AI Mentor (chat)
**Komponentlar:** H1 "AI Mentor" + fan-filtr chip qatori + xato banner (agar bor) + chat oynasi (scroll qiluvchi glass-card, xabar pufakchalari: foydalanuvchi=o'ngda accent-fon, AI=chapda neytral-fon, "..." — yozayotgan holat) + pastda Input+"Yuborish" tugma qatori (Enter bilan ham yuboriladi).

---

## 5. O'QUVCHI — DO'KON VA PREMIUM

### 5.1 Coin Do'kon
**Komponentlar:** Sarlavha qatori (H1 + tanga-balans matni o'ngda) + kategoriya bo'yicha bo'limlar (Sarflanadigan/Unvon/Ramka/Mavzu/Avatar/Nishon — har biri H2 + grid): har item-karta — rarity badge (uppercase, rang: Oddiy=kulrang/Noyob=ko'k/Epik=binafsha/Afsonaviy=oltin), nomi, narxi (🪙 bilan), pastda holat-bog'liq tugma: **egasi bo'lmasa** → "Sotib olish"/"Yetarli emas" (rangi affordable'ga qarab); **egasi bo'lsa va equippable** → "Faollashtirish" yoki "✓ Faol"; **egasi bo'lsa va equippable emas** → "Sizda bor" matni; **sarflanadigan** → "Sizda: N ta" + "Yana olish" tugma.

### 5.2 Inventar
**Komponentlar:** H1 + "N tanga · N ta Streak Muzlatish" statistika + egalik buyumlar grid'i (har biri: nomi, "Kiyilgan"/miqdor holati, agar equippable — "Faollashtirish"/"Yechish" tugma) + "Xarid tarixi" ro'yxati (nomi + "-N 🪙") + "Streak muzlatish tarixi" ro'yxati (sana + "N kunlik streak saqlandi").

### 5.3 Premium
**Komponentlar:** H1 (chapda) + "To'lovlarim" havola (o'ngda) + 2 ustunli holat-karta grid ("Video/Audio darslar" va "Mock test tizimi" — har biri ikonka-doira (yashil ✓/kulrang 🔒) + "Faol — N gacha"/"Qulflangan" matni) + reja kartalar (uppercase tur-badge, nomi, tavsif, narx+davomiylik, xususiyat-ro'yxat ✓ belgilar bilan, pastda "✓ Faol" (disabled yashil) yoki "Sotib olish" Primary tugma).

### 5.4 Checkout (to'lov)
**Komponentlar:** Reja nomi+narxi, "Karta raqami"/"Karta egasi" ko'rsatuvchi info-karta (monospace raqam), fayl-yuklash input (screenshot), "To'lov skrinshotini yuborish" Primary tugma.

### 5.5 To'lov holati
**Komponentlar:** Orqaga-havola + H1 + katta status-karta 3 holatdan biri: **Tasdiqlandi** (yashil ✓ doira + "Tasdiqlandi!" + tavsif), **Rad etildi** (qizil ✕ doira + admin izohi), **Kutilmoqda** (pulsatsiyalanuvchi amber ⏳ doira + "Ko'rib chiqilmoqda") — tagida reja/summa/sana ma'lumot-jadvali. Real-time: holat o'zgarganda avtomatik yangilanadi (polling).

### 5.6 To'lovlarim
**Komponentlar:** H1 + ro'yxat (har qator link-karta: skrinshot thumbnail (48px) + reja nomi+summa+sana (chapda) + holat-badge (o'ngda, rang holatga qarab)).

---

## 6. O'QITUVCHI PANELI

### 6.1 Teacher Dashboard
**Komponentlar:** Statistika kartalar (testlar/darslar/o'yinlar soni) + tezkor havolalar.

### 6.2 Testlarim / Yangi test / Ma'lumotni tahrirlash
**Ro'yxat:** jadval — sarlavha, holat-badge (Nashr/Qoralama), "Yangi test" tugma.
**Yaratish/Tahrirlash forma:** Sarlavha input, Tavsif textarea, Fan select, Kategoriya select, Davomiylik(daqiqa) input, pastda "Saqlash" tugma.

### 6.3 Savol qurish (Build) — eng murakkab teacher ekrani
**Layout:** Yuqorida sarlavha+harakat-tugmalar qatori (Ma'lumotlar/Ko'rib chiqish/Natijalar/Nashr-qoralama/O'yin yasash). Pastda mavjud savollar ro'yxati (raqamlangan, tahrirlash/o'chirish ikonkalari bilan) + "Savol qo'shish" formasi (ochilib-yopiluvchi):
- Savol turi select (6 variant).
- Savol matni textarea.
- Qiyinlik select + Ball input (yonma-yon).
- **Izoh (explanation) textarea** — "Javob izohi (ixtiyoriy)".
- Rasm-yuklash (image_based/table_based uchun).
- **Turga qarab dinamik blok:**
  - Oddiy: variant-qator ro'yxati (matn input + "to'g'ri javob" radio/checkbox har birida, +/- tugmalar bilan qator qo'shish/o'chirish).
  - Moslashtirish: chap-matn/o'ng-matn juft-qatorlar ro'yxati.
  - Guruhlangan: ko'rsatma input + variant-ro'yxat + to'g'ri-variant belgisi.
  - Yozma: qism-savol qatorlari (label+matn+etalon-javob).
- "Saqlash" tugma.

### 6.4 Ko'rib chiqish (Preview)
**Komponentlar:** Savollar ro'yxati (o'quvchi-ko'rinishida), har savol raqamlangan doira + matn; turga qarab: oddiy — variant ro'yxati (to'g'risi yashil-belgi bilan), moslashtirish — 2-ustunli juftlik ko'rsatuvi, guruhlangan — variant-ro'yxat (to'g'risi yashil+✓), yozma — qism-savollar yoki "Yozma javob maydoni" bo'sh-quti placeholder.

### 6.5 Natijalar / Baholash
**Natijalar:** urinishlar jadvali (o'quvchi, ball, sana).
**Baholash:** yozma-javob kartalari — savol matni (qisqartirilgan) + qism-javoblar (label+matn) yoki oddiy matn-javob + "To'g'ri"/"Noto'g'ri" 2-tugma tanlov (radio-uslubida) + "Saqlash".

### 6.6 Darslarim / O'yinlarim
**Ro'yxat + forma** — Lessons/Games boshqaruvi bilan bir xil pattern (sarlavha, tavsif/matn, "Yangi" tugma, tahrirlash forma).

---

## 7. SUPER ADMIN PANELI

**Umumiy pattern (deyarli har bir bo'limda takrorlanadi):**
- Sarlavha qatori: H1 (chapda) + "Yangi X" Primary tugma (o'ngda, ba'zi bo'limlarda).
- Filtr qatori: Qidiruv input + 1–3 ta dropdown-select filtr (masalan Rol/Holat/Telegram).
- Bulk-action toolbar (checkbox tanlanganda paydo bo'ladi): "N ta tanlandi" matn + amal-select + "Bajarish" tugma, accent-border bilan ajratilgan qator.
- Jadval: checkbox-ustun (bulk uchun) + ma'lumot-ustunlar + badge'lar (holat/rol/rarity) + qator bosilganda detail-sahifaga o'tish.
- Sahifalash pastda.

### 7.1 Admin Dashboard
Umumiy tizim statistika kartalari (foydalanuvchilar/testlar/to'lovlar/daromad soni).

### 7.2 Foydalanuvchilar / Foydalanuvchi detali
**Ro'yxat:** filtr (Rol/Holat/Telegram) + bulk (Bloklash/Blokdan chiqarish) + jadval (ism, username, rol-badge, holat-badge, sana).
**Detail:** Ism+username sarlavha + "Tahrirlash" tugma (ochiladi: username/ism/familiya/email input'lari + rol-select + "Saqlash"/"O'chirish"); 4-ustunli stat-grid (Level/XP/Tanga/ELO); harakat-tugmalar qatori (Bloklash, Parolni tiklash, Premium berish, "Bu foydalanuvchi sifatida kirish"); "Ko'rsatkichlarni o'zgartirish" mini-forma (XP/Tanga/ELO input+Saqlash); "So'nggi urinishlar" ro'yxati; "To'lovlar tarixi" ro'yxati.

### 7.3 O'qituvchilar
Jadval + inline "Yangi o'qituvchi" forma (username/ism/parol + "Yaratish").

### 7.4 Fanlar / Fan detali
Jadval (nomi/slug/testlar soni) + inline yaratish forma + detail-sahifa (nomi/slug/ikonka/rang/tartib input'lari + Saqlash/O'chirish).

### 7.5 Do'kon boshqaruvi
Filtr (Kategoriya/Holat) + bulk (O'chirish) + jadval (nomi, kategoriya-badge, narx, rarity-badge, egalar-soni, holat) + "Yangi mahsulot" to'liq forma-sahifa.

### 7.6 Testlar boshqaruvi
Filtr (Fan/Holat) + bulk (Nashr/Qoralama/Arxiv) + jadval (sarlavha, fan, savol-soni, muallif, holat-badge, urinish-soni) + detail-sahifa (savollar preview-ro'yxati + Nashr/Nusxalash/Tahrirlash tugmalari) + edit-sahifa (sarlavha/tavsif/fan/kategoriya/davomiylik/premium-checkbox/nashr-checkbox/arxiv-checkbox + Saqlash/O'chirish).

### 7.7 Darslar / O'yinlar boshqaruvi
Bulk (Nashr/O'chirish yoki O'chirish) + jadval + create/edit forma-sahifalar (shop bilan bir xil pattern).

### 7.8 Natijalar (Attempts)
Filtr (Yakunlangan holati) + "CSV yuklash" tugma + jadval (o'quvchi, test, ball, to'g'ri-soni, sana) + detail-sahifa (savol-javob breakdown, har biri to'g'ri/xato rangida).

### 7.9 To'lovlar boshqaruvi
Filtr (Holat: kutilmoqda/tasdiqlandi/rad etildi/skrinshot kutilmoqda) + "Qo'lda premium berish" ochiluvchi mini-forma (username input + Berish/Bekor qilish tugmalari) + jadval (foydalanuvchi, reja, summa, holat-badge, sana, inline Tasdiqlash/Rad etish tugmalari) + detail-sahifa (skrinshot katta ko'rinishda + admin izoh + Tasdiqlash/Rad etish).

### 7.10 Sozlamalar
Tizim sozlamalari forma (masalan "Texnik xizmat rejimi" checkbox va h.k.) + Saqlash.

### 7.11 Audit jurnali
Filtr (Amal: Yaratildi/O'zgartirildi/O'chirildi) + jadval (kim, amal-badge, model, obyekt, vaqt) — faqat o'qish uchun (interaktiv emas).

### 7.12 Xabar yuborish (Broadcast)
Forma: Sarlavha input + Xabar textarea + Auditoriya-select (Barchasi/O'quvchilar/O'qituvchilar/Premium — har birida qavs ichida son) + rasm-yuklash + "Telegram orqali ham yuborish" checkbox + "Yuborish" tugma; pastda "Tarix" ro'yxati (thumbnail+sarlavha+qabul-qiluvchi-soni+sana+"O'chirish" tugma, tasdiqlash-dialogi bilan).

---

## 8. Figma AI uchun bitta-yaxlit copy-paste promt

> IlmIldizi — tarix, Milliy Sertifikat va BBA imtihonlariga tayyorgarlik ko'radigan o'quvchilar uchun gamifikatsiya qilingan ta'lim platformasi. SaaS darajasidagi to'liq UI-kit va 50+ ekran yarat, uchta rol uchun: O'quvchi, O'qituvchi, Super Admin.
>
> **Vizual uslub:** Dark-mode asosiy (fon #17181a), teal-firuza accent (#2fb3a3), Inter shrift (h1'larda ba'zan Georgia-serif aksent). "Shisha karta" (glass-card) uslubi — yarim-shaffof qorong'u fon, ingichka border, katta border-radius (20–32px). Semantik ranglar: yashil (#6b9b6f) = muvaffaqiyat/to'g'ri, qizil-terracotta (#c9645c) = xato/xavf, amber = kutilmoqda. Gamifikatsiya tint-ranglari: olov-sariq (streak), oltin (coin), zumrad (level), ko'k (ELO).
>
> **Navigatsiya:** Desktop — chap vertikal sidebar (ikonka+matn ro'yxati, pastda profil-vidjet: avatar+ism+level+XP). Mobil — pastki fixed tab-bar (5 ikon). Uch xil rol uchun uch xil sidebar-ro'yxati.
>
> **O'quvchi ekranlari:** gamifikatsiyalashgan dashboard (streak/XP/tanga/ELO stat-kartalar, kunlik missiya timeline, tezkor-kirish grid), test-yechish oqimi (6 xil savol turi: bitta-to'g'ri, rasmli, jadvalli, moslashtirish, guruhlangan, yozma), AI-tahlil natija sahifasi (kuchli/kuchsiz mavzular, batafsil xato-tahlili, yo'l-xaritasi), 3 ta mini-o'yin (timeline tartiblash, xarita, shaxs-topish), AI Mentor chat, coin-do'kon (rarity-darajali buyumlar: oddiy/noyob/epik/afsonaviy), premium-checkout (skrinshot-orqali to'lov), reyting-podium, ko'p-grafikli analitika dashboard.
>
> **O'qituvchi ekranlari:** test-builder wizard (6 xil savol-turi uchun to'liq boshqacha dinamik forma), savol-preview (o'quvchi ko'rinishida), yozma-javoblarni qo'lda baholash.
>
> **Admin ekranlari:** filtr+qidiruv+bulk-action (checkbox+ommaviy amal) bilan jihozlangan ma'lumotlar-jadvallari (foydalanuvchilar/testlar/to'lovlar/audit-log), foydalanuvchi-detail (impersonate/parol-tiklash/premium-berish tugmalari bilan), broadcast-xabar yuborish formasi.
>
> Har bir ekranni desktop (1440px) va mobil (390px) versiyasida chiz. Barcha matnlar o'zbek tilida (lotin yozuvi).

---

## QOSHIMCHA VERSIYA — "IlmIldizi Pro" Master Design Brief (Obsidian Slate & Emerald Luxury Theme)

> Quyidagi bolim foydalanuvchi tomonidan berilgan alohida, tolaligicha mustaqil dizayn-brief. Bu **hujjat/referens** sifatida saqlanmoqda — joriy ishlab turgan kod bazasiga (real backend, real ma'lumotlar) tadbiq etilmagan. Kelajakda yangi Figma dizayn iteratsiyasi yoki rebrand kerak bolganda shu yerdan foydalanish mumkin.
>
> **Diqqat:** Bu brief'dagi ayrim raqamlar (94.8% DTB ehtimoli, ELO 1450, referral link namunasi, narxlar 49000/199000/349000 so'm va h.k.) **namunaviy/fabricated** — joriy real API'dagi haqiqiy qiymatlar bilan mos emas (masalan real Premium narxlari 25,000/15,000 so'm). Amalga oshirishda albatta real backend qiymatlari bilan almashtirilishi shart.

Sen — jahon darajasidagi Senior EdTech UI/UX Dizayneri va Full-stack React/TypeScript Arxitektorisan. Sening vazifang O'zbekistondagi abituriyentlar va tarix fani ixlosmandlari uchun mo'ljallangan "IlmIldizi Pro" (BBA & Milliy Sertifikat) innovatsion ta'lim platformasini noldan to'liq, professional va mukammal darajada yaratishdir.

Ushbu platforma Duolingo (gamifikatsiya), Linear (bento-grid va obsidian estetika), Quizlet (flashcardlar va xotira kartalari) va zamonaviy e-sport platformalari (1v1 Duel Arena)ning eng ilg'or tajribalarini birlashtiradi.

### 1. Vizual dizayn tizimi va arxitektura (Design System & Tokens)

**Ranglar Palitrasi (Obsidian Slate & Emerald Luxury Theme)**
- Asosiy fon (Canvas Background): `#0C0E12` (chuqur obsidian slate)
- Sirtlar va Kartalar foni (Bento Surface): `#14171d` va `#181c24`, chegara `rgba(255,255,255,0.07)`
- Ichki konteynerlar (Elevated Layer): `#1a1e26` va `#202530`
- Birlamchi Aksent (Primary Emerald/Teal): `#2FB3A3`, hover `#269488`, yorug' matn `#5cc4b6`, aura `rgba(47,179,163,0.12)`
- Gamifikatsiya/Oltinrang: `#D99A38`, `#F59E0B`, olov `#FB923C`
- Muvaffaqiyat: `#52A86B`, yorug' holat `#7AD192`
- Xatolik/Ogohlantirish: `#F43F5E`, `#FB7185`
- Tipografiya: sarlavha `#F0F1F3`, ikkinchi darajali `#A3A7AE`/`#8D9094`, monospace JetBrains/Geist Mono uslubida

**Geometriya va Taktil effektlar**
- Bento card burchak: `rounded-3xl` (24px) yoki `rounded-2xl` (16px); ichki element = tashqi radius - padding
- Tactile feedback: `active:scale-[0.98] transition-transform duration-100`
- Akustik Audio Feedback (Web Audio API, `utils/soundFX.ts`, tashqi fayl kerak emas):
  - Chertish: 600Hz yumshoq sinusoidal
  - Togri javob: 523->659->784Hz (Do-Mi-Sol)
  - Xato: 220->180Hz
  - Fanfara (level-up/win): yuqori tantanali arpejio
  - Yuqori paneldan yoqish/ochirish toggle

### 2. Asosiy struktura va global navigatsiya

**Chap yon panel (Desktop Sidebar, 256px / `w-64 fixed`)**
- Brending: zumrad kvadrat logotip (Sprout ikonasi) + "IlmIldizi" + "PRO" yorliq + "Milliy Sertifikat & BBA"
- Menyu: Boshqaruv (`LayoutDashboard`), Test Markazi (`FileCheck2`), O'quv Markazi (`BookOpen`), 1v1 Duel Arena (`Swords`), AI Mentor 24/7 (`Bot`), Do'kon & Sovg'a (`ShoppingBag`), Premium PRO (`Crown`, oltin yorliq), Analitika (`BarChart3`), Liderlar Ligasi (`Trophy`), Mening Profilim (`User`)
- Pastki vidjet: avatar (Crown bilan), ism, daraja, XP, LogOut

**Yuqori panel (Sticky TopHeaderBar)**
- Chap: Streak Pill (`🔥 14 kun`, pulsatsiya), Tanga Balansi (`🪙 450`), Muzlatish Qalqoni (`❄️ 2`)
- O'ng: Command Palette (`⌘K`), Audio FX toggle (`Volume2`/`VolumeX`), Dark/Light toggle

**Mobil quyi tab bar** (`md:hidden`): Boshqaruv, Testlar, 1v1 Arena, O'quv, Profil

### 3. Sahifa-boyicha toliq spetsifikatsiya

1. **Dashboard** — Hero Command Card (bugungi maqsad + natija prognozi + "Darsni Boshlash" tugma), Bilim Ildizi Daraja Indikatori (skill-tree progress), 4 ta metrika (Streak/Tanga/DTB prognoz/Arena unvon), Kunlik Missiyalar (3 ta, progress+mukofot+claim), Tezkor Harakatlar (1v1/Xatolar/Xronologik/AI Mentor)
2. **Test Markazi** — filtr tablar (Barchasi/Milliy Sertifikat/BBA/O'zbekiston tarixi/Jahon tarixi/Xatolar banki), test kartalari (format nishoni, savollar soni, vaqt, qiyinlik, reyting), "Xatolar Banki" banner
3. **Faol Test Yechish** — yuqori holat (nom, savol raqami, taymer, progress, yakunlash), savol konteyner (matn+rasm, 4 variant, klaviatura 1-4/A-D), quyi navigatsiya (oldingi/bookmark/keyingi, savollar palitrasi rang-kodli)
4. **Test Yakuni & Tahlil** — natijalar xulosasi (ball, vaqt, mukofot, sertifikat ekvivalenti), har savol tahlili (togri/xato, ilmiy izoh, maslahat), harakat tugmalari
5. **O'quv Markazi** — chap ustun (modullar royxati), ong ustun (konspekt, audio pleyer, 3D flip flashcardlar chertish ovozi bilan)
6. **Xatolar Ustida Ishlash (Spaced Repetition)** — faol/togrilangan hisoblagich, savol karta (necha marta adashilgan, togri bolsa konfetti+mnemonika)
7. **1v1 Duel Battle Arena** — lobby (ELO, matchmaking skanerlash, dostni chorlash), jang rejimi (5 tezkor savol, 10 soniya, ikki tomonlama avatar+ball), galaba/maglubiyat ekrani (fanfara, ELO/XP/tanga)
8. **Xronologik O'yin** — kartalar ketma-ketligi (yuqoriga/pastga surish), tekshirish tugmasi, togri bolsa yashil+mukofot
9. **Akademik Analitika & Prognoz** — DTB kirish ehtimoli vitrinasi, 4 asosiy korsatkich, 14 kunlik faollik bar-chart, mavzular boyicha ozlashtirish (%+letter grade)
10. **Liderlar Ligasi** — Top 3 podium (oltin/kumush/bronza), umumiy royxat, foydalanuvchi oz orni ajratilgan
11. **Artefaktlar va Do'kon** — tanga balansi, tablar (avatar hoshiyalari/streak qalqonlari/maxsus mavzular), sotib olish+konfetti+ovoz
12. **24/7 Tarixchi AI Mentor** — tezkor savol tugmalari, jonli chat (yozish pulsatsiyasi "Tarixiy manbalar tahlil qilinmoqda..."), tozalash tugmasi
13. **Pro va Premium Tariflar** — hero banner, 3 tarif karta (1/6/12 oylik), tolov modal (Click/Payme/Uzum), oddiy vs PRO taqqoslash jadvali
14. **Profil va Sozlamalar** — bento profil karta, referral dasturi (havola+ulashish+mukofot), yutuqlar grid, songgi testlar/duellar tarixi

### 4. Texnik talablar

- Framework: React 18+ (Vite) + TypeScript
- Styling: Tailwind CSS (bitta toza tizim, bento kartalar, silliq gradientlar)
- Icons: `lucide-react`
- Animatsiya/Konfetti: `canvas-confetti`, taktil klasslar, silliq CSS otishlar
- Audio Engine: `utils/soundFX.ts` — brauzer Web Audio API osillyatorlari, tashqi audio faylga bogliq emas
- Holat boshqaruvi: toliq reaktiv, sahifalar orasida ravon navigatsiya

---

*Manba: `frontend/src/app/globals.css`, `templates/base.html` va loyihaning barcha sahifa fayllaridan olingan haqiqiy tarkib (2026-08-21).*
