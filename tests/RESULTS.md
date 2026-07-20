# Test natijalari

```
python manage.py test tests
Ran 67 tests in 19.1s
OK
```

**67 / 67 o'tdi · 0 xato · 0 muvaffaqiyatsiz**

Oxirgi yugurish: Django 6.0.5 · SQLite (test bazasi xotirada) · Python 3.14

> **Log'dagi 2 ta satr haqida.** Chiqishda `Telegram webhook received an unparsable body`
> va `TELEGRAM_WEBHOOK_SECRET is not set; rejecting webhook call` ko'rinadi. Bular **xato
> emas** — buzuq JSON va sozlanmagan token holatlarini **ataylab** tekshiradigan ikkita
> test shu log'ni chiqaradi. Ya'ni himoya ishlayotganining dalili.

---

## Umumiy jadval

| Modul | Testlar | Natija |
|---|---:|:---:|
| `test_page_details.py` — har bir sahifa alohida | 34 | ✅ |
| `test_shop.py` — do'kon, pul xavfsizligi | 10 | ✅ |
| `test_telegram_webhook.py` — bot webhook | 7 | ✅ |
| `test_streak_freeze.py` — streak muzlatish | 6 | ✅ |
| `test_revision.py` — xatolar ustida ishlash | 6 | ✅ |
| `test_pages.py` — smoke + ruxsatlar | 4 | ✅ |
| **Jami** | **67** | **✅** |

---

## 1. Sahifalar bo'yicha (`test_page_details.py` — 31 ta)

Har bir sahifa uchun: qaysi shablon render bo'lgani, kontekstda nima borligi va
foydalanuvchi ko'radigan mazmun tekshiriladi. Ya'ni 200 qaytarib, ichi bo'sh
render bo'lgan sahifa ham yiqiladi.

| Sahifa | Nima tekshirildi | Natija |
|---|---|:---:|
| **Bosh sahifa** `/` | XP/tanga/streak kontekstda, vazifalar bor | ✅ |
| | Muzlatish sotib olinsa, `freeze_count` = 1 ko'rinadi | ✅ |
| **Test markazi** `/tests/` | Nashr etilgan testlar ro'yxatda | ✅ |
| | O'rtacha ball yakunlangan urinishdan hisoblanadi (100%) | ✅ |
| **Tarix** `/tests/history/` | Yakunlangan urinishlar chiqadi | ✅ |
| | Sahifalash yoqilgan (25 tadan) | ✅ |
| **Tahlil** `/analytics/` | Test yo'qda bo'sh holat (`total_tests` = 0) | ✅ |
| | Testdan keyin 5 ta grafik ma'lumoti chiqadi, aniqlik 100% | ✅ |
| | Radar o'qlari javob berilgan mavzulardan olinadi | ✅ |
| **Xatolar ustida** `/tests/revision/` | Xato yo'qda deka bo'sh | ✅ |
| | Xato javoblar dekaga tushadi | ✅ |
| | Fan filtri dekani toraytiradi | ✅ |
| | Jarayon hisoblagichi to'g'ri (`mastered_count`) | ✅ |
| **Do'kon** `/shop/` | Mahsulotlar turkumlarga bo'lingan | ✅ |
| | Tanga yetishi/yetmasligi to'g'ri belgilanadi | ✅ |
| | Sotib olingan mahsulot "bor" deb belgilanadi | ✅ |
| **Inventar** `/shop/inventory/` | Egalik qilinganlar + xarid tarixi | ✅ |
| | Muzlatish balansi ko'rsatiladi | ✅ |
| **Reyting** `/leaderboard/` | Podium va ro'yxat render bo'ladi | ✅ |
| | XP bo'yicha to'g'ri saralanadi | ✅ |
| | Noma'lum fan → umumiy reytingga qaytadi | ✅ |
| **Profil** `/accounts/profile/` | Hub havolalari (4 ta) sahifada bor | ✅ |
| | Kiyilgan unvon ko'rsatiladi | ✅ |
| **Premium** `/premium/` | Rejalar sahifasi render bo'ladi | ✅ |
| **Darslar** `/learning/` | O'qish markazi render bo'ladi | ✅ |
| **O'yinlar** | Timeline / Xarita / Shaxs — uchalasi | ✅ |
| **Arena** `/battles/` | Render bo'ladi | ✅ |

### Test topshirish oqimi (asosiy mahsulot yo'li)

| Tekshiruv | Natija |
|---|:---:|
| Yakunlash XP va tanga beradi, ballni yozadi (3 savol → +150 XP, +15 tanga, 100%) | ✅ |
| Xato javoblar sanaladi va xatolar dekasiga tushadi | ✅ |
| Yakunlangach feedback sahifasi ochiladi | ✅ |
| **Boshqa o'quvchining urinishini ocholmaydi (404)** | ✅ |
| **Yakunlash AI tahlilini so'rov ichida kutmaydi** (faqat navbatga qo'yiladi) | ✅ |
| **Commit'dan keyin AI tahlil haqiqatan yaratiladi** (regressiya qo'riqchisi) | ✅ |
| Qayta ishga tushirilsa tahlil takrorlanmaydi (idempotent) | ✅ |

---

## 2. Do'kon va pul xavfsizligi (`test_shop.py` — 10 ta)

| Tekshiruv | Natija |
|---|:---:|
| Sotib olishda tanga yechiladi va mahsulot beriladi | ✅ |
| Xarid o'zgarmas ledgerga yoziladi | ✅ |
| **Bir xil kosmetikani ikki marta sotib bo'lmaydi** (va qayta pul yechilmaydi) | ✅ |
| Tanga yetmasa bloklanadi, balans o'zgarmaydi | ✅ |
| Daraja qulfi ishlaydi | ✅ |
| Sarflanadigan mahsulot to'planadi (bloklanmaydi) | ✅ |
| Bir kategoriyada faqat bitta narsa faol bo'ladi | ✅ |
| O'zida yo'q narsani kiyib bo'lmaydi | ✅ |
| **Ochiq redirect: tashqi `Referer` kuzatilmaydi** | ✅ |
| Ichki `Referer` normal ishlaydi | ✅ |

---

## 3. Telegram webhook (`test_telegram_webhook.py` — 7 ta)

| Tekshiruv | Kutilgan | Natija |
|---|---|:---:|
| `GET` so'rov | 405 | ✅ |
| Maxfiy tokensiz | 403 | ✅ |
| Noto'g'ri token | 403 | ✅ |
| To'g'ri token | 200 + fonga uzatiladi | ✅ |
| Buzuq JSON | 200 (Telegram cheksiz qayta urinmasin) | ✅ |
| **Token sozlanmagan bo'lsa** | 403 (endpoint umuman ishlamaydi) | ✅ |
| `/start` yangi Telegram foydalanuvchisiga profil yaratadi | profil bor | ✅ |

---

## 4. Streak muzlatish (`test_streak_freeze.py` — 6 ta)

| Holat | Kutilgan | Natija |
|---|---|:---:|
| Kecha faol edi | streak +1 | ✅ |
| Bugun allaqachon faol | ikki marta sanalmaydi | ✅ |
| 1 kun o'tkazib yuborildi, 1 muzlatish bor | streak saqlanadi, muzlatish sarflanadi, log yoziladi | ✅ |
| 1 kun o'tkazib yuborildi, muzlatish yo'q | streak 1 ga tushadi | ✅ |
| **2 kun tushdi, atigi 1 muzlatish** | reset — **muzlatish behuda sarflanmaydi** | ✅ |
| 2 kun tushdi, 2 muzlatish bor | streak saqlanadi, ikkalasi sarflanadi | ✅ |

---

## 5. Xatolar ustida ishlash (`test_revision.py` — 6 ta)

| Tekshiruv | Natija |
|---|:---:|
| Xato javoblar dekaga qo'shiladi | ✅ |
| To'g'ri javoblar dekaga tushmaydi | ✅ |
| To'g'ri qayta javob → o'zlashtirilgan, dekadan chiqadi | ✅ |
| Xato qayta javob → dekada qoladi | ✅ |
| **To'g'ri javob mijozga sizib chiqmaydi** (deka `is_correct` yubormaydi) | ✅ |
| **Boshqa foydalanuvchining itemini baholab bo'lmaydi** (404) | ✅ |

---

## 6. Smoke va ruxsatlar (`test_pages.py` — 4 ta)

| Tekshiruv | Qamrov | Natija |
|---|---|:---:|
| Barcha o'quvchi sahifalari render bo'ladi | 12 sahifa | ✅ |
| Anonim foydalanuvchi login'ga yo'naltiriladi | 12 sahifa | ✅ |
| Super admin barcha panel sahifalarini ochadi | 11 sahifa | ✅ |
| **O'quvchi panelga kira olmaydi** | `/panel/` | ✅ |

---

## Test yozish jarayonida topilgan narsalar

Testlar yozilayotganda ikkita test yiqildi — ikkalasi ham tekshirib chiqildi:

1. **Analytics bo'sh holat** — testlar orasida LocMem kesh oqib o'tgan (tranzaksiya
   qaytarilganda qator ID'lari qayta ishlatiladi, kesh esa saqlanib qoladi).
   *Mahsulot bugi emas* — productionda profil ID'lari takrorlanmaydi.
   Yechim: `setUp` da `cache.clear()`.

2. **Reyting saralashi** — testdagi tekshiruv noto'g'ri edi: podium ataylab
   qayta tartiblanadi (2-o'rin chapda, **1-o'rin o'rtada**, 3-o'rin o'ngda),
   ya'ni g'olib `podium[1]`. *Mahsulot to'g'ri ishlagan.*

Bundan oldingi tekshiruvlarda topilgan va tuzatilgan **haqiqiy buglar**:

| Bug | Joy | Holat |
|---|---|:---:|
| **Fon vazifasi commit'dan oldin ishga tushardi** — SQLite'da `table is locked`, Postgres'da esa **AI tahlil jimgina yaratilmasdi**. `transaction.on_commit()` bilan tuzatildi | `tests_app/views.py` | 🔧 tuzatildi |
| Ochiq redirect (`HTTP_REFERER`ga ko'r-ko'rona ishonish) | `shop/views.py` | 🔧 tuzatildi |
| N+1 so'rov (`select_related` yo'q) | `/tests/history/` | 🔧 tuzatildi |
| O'rtacha ball Python'da hisoblanardi (barcha qatorlar yuklanardi) | `/tests/` | 🔧 tuzatildi |
| Mobil gorizontal overflow (2 ta) | `/learning/` | 🔧 tuzatildi |

---

## Qayta ishga tushirish

```bash
python manage.py test tests           # hammasi
python manage.py test tests -v 2      # har bir test nomi bilan
python manage.py test tests.test_shop # bitta modul
```
