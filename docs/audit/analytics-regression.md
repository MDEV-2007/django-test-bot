# UI-REG-001: Analytics -> Profile Redirect va Pastel Studio Redesign Regressiya Auditi

**Sana:** 2026-11-07  
**Auditor:** Antigravity / Gemini 3.8 Engineering Remediation  
**Status:** FIXED & VERIFIED  

---

## 1. Kontekst va O'zgarish Sababi

Pastel Studio redesign jarayonida (`commit 8d47a27`) platformaning student interfeysi tartibga keltirildi. Alohida `/analytics` sahifasi o'rniga, barcha akademik tahlil va ko'rsatkichlar foydalanuvchining shaxsiy kabineti — `/profile` sahifasidagi `'stats'` tabiga konsolidatsiya qilindi.

Ushbu auditning maqsadi:
1. Eski `/analytics` sahifasidagi biron bir muhim funksiya, diagramma yoki ma'lumot yo'qolib ketmaganligini tekshirish;
2. `/analytics` marshruti `/profile` ga xavfsiz va to'g'ri yo'naltirilishini (redirect) tasdiqlash;
3. Pastel Studio dizayn tizimining boshqa sahifalarga (ayniqsa `/admin`, `/panel`) nojo'ya ta'sir (CSS style leakage) ko'rsatmasligini kafolatlash;
4. Yangi interfeysda responsive dizayn, theme toggle (dark/light) va navigatsiya yaxlitligini tekshirish.

---

## 2. Eski va Yangi Funksiyalar Xaritasi (Feature Mapping)

| Eski `/analytics` funksiyasi | Yangi `/profile` joylashuvi (`tab=stats`) | API manbasi | Holati |
|---|---|---|---|
| **KPI kartalari:** Jami testlar, O'rtacha aniqlik, DTM tayyorgarlik, Mashq vaqti | Yuqori rangli plitkalar (Blue, Green, Orange, Purple) | `GET /api/analytics/` (`total_tests`, `accuracy`, `readiness_estimate`, `time_minutes`) | **SAQLANGAN** |
| **Daraja va XP:** Lvl va umumiy XP | Profil sarlavhasi va bilim daraxti progressida | `GET /api/auth/profile/` + `/api/analytics/` | **SAQLANGAN** |
| **Kuchli mavzular:** 80%+ o'zlashtirilgan mavzular ro'yxati | Diagnostika bloki — Yashil kartochka | `/api/analytics/` (`mastery.strong`) | **SAQLANGAN** |
| **Qiynalgan mavzular:** Ko'p xato qilingan mavzular | Diagnostika bloki — "Qasos" tugmasi bilan `/sprint` ga o'tish | `/api/analytics/` (`mastery.weak`) | **SAQLANGAN** |
| **Fanlar dinamikasi:** Har bir fan bo'yicha harf bahosi (A+, A, B+, B, C) va progress bar | Fanlar bo'yicha o'sish bloki | `/api/analytics/` (`mastery.subjects`) | **SAQLANGAN** |
| **To'g'rilik balansi:** To'g'ri, Xato, O'tkazilgan javoblar nisbati | Javoblar balansi diagrammasi va 3 ta statik karta | `/api/analytics/` (`accuracy_breakdown`) | **SAQLANGAN** |
| **Bilim daraxti:** Jonli KnowledgeTree (shoxlar, barglar, mevalar) | Bilim ildizi interaktiv sahnasi | `/api/auth/profile/` + `/api/analytics/` | **SAQLANGAN** |
| **Radar analitika:** 6 o'qli ko'nikmalar radari | `StudentSpiderRadar` komponenti | `/api/analytics/` (`skill_radar`) | **SAQLANGAN** |
| **Platforma nishonlari:** Olingan va qulflangan yutuqlar | Platforma nishonlari progress bloki | `/api/auth/profile/` (`badges`, `total_badges`) | **SAQLANGAN** |
| **So'nggi harakatlar:** Oxirgi test urinishlari va natijalar | 'activity' tabi va profil umumiy tarixi | `/api/auth/profile/` (`recent_attempts`) | **SAQLANGAN** |

---

## 3. Navigatsiya va Redirect Xavfsizligi

1. **Yo'naltirish (Redirect):**
   - [`frontend/src/app/analytics/page.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/app/analytics/page.tsx) to'g'ridan-to'g'ri `redirect('/profile')` chaqiradi.
   - `/profile` sahifasida `activeTab` sukut bo'yicha `'stats'` qilib belgilangan, shuning uchun `/analytics` ga kirgan har qanday foydalanuvchi bir zumda to'liq analitika paneliga tushadi.
   - Deep-linking qo'llab-quvvatlandi: `?tab=stats`, `?tab=posts`, `?tab=inventory`, `?tab=activity` parametrlarini avtomatik o'qib, mos tabni ochadi.

2. **Sidebar va Mobil Tab Bar:**
   - [`Sidebar.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/Sidebar.tsx): `matchPrefixes: ['/profile', '/analytics', '/shop']` orqali `/analytics` yoki `/profile` marshrutida turganda "Profil" bo'limini faol (active) deb belgilaydi.
   - [`MobileTabBar.tsx`](file:///C:/Users/Murodulla/Desktop/django-test-bot/frontend/src/components/MobileTabBar.tsx): `['/profile', '/shop', '/premium', '/analytics'].some((p) => pathname.startsWith(p))` orqali mobil pastki menyuda mos ikonkani faol holatga keltiradi.
   - O'lik havolalar (`href="#"`) yo'q; har bir tugma tegishli yo'nalishga ega.

---

## 4. `pastel-theme.css` Izolyatsiyasi va Style Leakage Tekshiruvi

- **CSS Selektorlari:**
  Barcha pastel studio qoidalari faqat `.theme-pastel`, `.ps-shell` va `html body:has(.theme-pastel)` orqali chegaralangan.
- **Global Ta'sir:**
  Global `body`, `html` yoki `div` teglari uchun unqualified selector'lar mavjud emas.
- **Admin va Super Admin Himoyasi:**
  `/admin/` (Django Admin) va `/panel/` (Next.js Super Admin paneli) toza Tailwind va qorong'i slate/emerald mavzuda mustaqil ishlaydi, pastel gradientlari yoki shriftlari u yerga sizib kirmaydi.
- **Dark/Light Mavzu:**
  Mavzu o'zgarganda CSS o'zgaruvchilari (`--ps-ink`, `--ps-paper`, `--ps-bg`, `--surface-card`) to'g'ri invert bo'ladi. Matn kontrasti WCAG AA talablariga javob beradi.

---

## 5. Yangi Imkoniyatlar va Yaxshilanishlar

1. **Qasos Rejimi (Revenge Sprint):**
   Qiynalgan mavzular ro'yxatidagi har bir element to'g'ridan-to'g'ri `/sprint` sahifasiga ulanib, talabaga o'z zaif nuqtalarini darhol qayta mashq qilish imkonini beradi.
2. **Haqiqiy Ma'lumotlar Integratsiyasi:**
   Oldingi auditda aniqlangan sun'iy/statik 78%, 85% radar ko'rsatkichlari to'liq olib tashlangan bo'lib, qiymatlar faqat backend `/api/analytics/` API'sidan dinamik olinadi. Agar foydalanuvchida hali testlar bo'lmasa, soxta raqamlar emas, tushunarli Empty State ko'rsatiladi.

---

## 6. Xulosa

Analytics sahifasining profilga integratsiya qilinishi akademik funksiyalarning hech birini yo'qotmagan. Foydalanuvchi tajribasi (UX) birlashtirilgan, navigatsiya izchil, va dizayn regressiyasi mavjud emas.
