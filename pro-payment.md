# IlmIldizi — Complete Monetization, Payments & Partner Ecosystem

> **Document:** `payment.md`  
> **Project:** IlmIldizi  
> **Scope:** Full-stack Monetization, Subscription, Mock Marketplace, Organizer Platform, Education Center Partnership, Advertising, Referral, B2B Analytics  
> **Priority:** Critical  
> **Implementation:** Backend + Frontend + Admin Panel + Database + Payment Integrations  
> **Architecture:** Production-ready, modular, scalable  
> **Rollout:** All modules implemented upfront; activated gradually through feature flags and configuration.

---

# 0. CORE OBJECTIVE

IlmIldizi monetizatsiya tizimi faqat PRO obuna sotish bilan cheklanmasligi kerak.

Biz IlmIldizi'ni quyidagi ekotizimga aylantiramiz:

1. O'quvchilar platformadan foydalanadi, obuna sotib oladi va Mock imtihonlarda qatnashadi.
2. Tashkilotchilar o'z Respublika Mock imtihonlarini yaratadi va boshqaradi.
3. Ta'lim markazlari o'z kurslarini reklama qiladi, chegirmalar beradi va o'quvchilarni jalb qiladi.
4. Homiylar sovrinlar, grantlar va maxsus tadbirlarni moliyalashtiradi.
5. IlmIldizi platformasi barcha jarayonlarni boshqaradi, to'lovlardan daromad oladi va B2B xizmatlarini taqdim etadi.

## 0.1. Asosiy arxitektura talabi

Barcha modullar hozirdanoq ishlab chiqilishi kerak.

Quyidagi yondashuv taqiqlanadi:

- Faqat frontend demo yaratish.
- Backend integratsiyasiz ishlaydigan sahifalar.
- Mock ma'lumotlar bilan production funksiyalarini ko'rsatish.
- Payment muvaffaqiyatli bo'lmasdan premium huquq berish.
- Faqat `is_premium` orqali barcha tariflarni boshqarish.
- Tashkilotchi va admin huquqlarini oddiy frontend tekshiruvi bilan himoyalash.
- Keyinchalik kerak bo'ladigan modullarni hozirgi arxitekturadan tashqarida qoldirish.

Barcha biznes modullar uchun database, backend services, API, frontend interfeyslar, permission, audit va testlar ishlab chiqilishi kerak.

Funksiyalarni ishga tushirish esa alohida boshqariladi.

---

# 1. PRODUCT & BUSINESS MODEL

## 1.1. Student subscription plans

### FREE

**Narxi:** 0 so'm.

Imkoniyatlar:

- Platformaning bepul ta'lim funksiyalari.
- Bepul darslar va mavjud bepul materiallar.
- Bepul testlar.
- Learning Loop.
- XP va coin tizimi.
- Community.
- Mavjud bepul battle imkoniyatlari.
- Bepul Mock eventlarda qatnashish, agar event tashkilotchisi ruxsat bergan bo'lsa.
- PRO va PRO MAX tariflarini ko'rish.
- Alohida pullik Mock sotib olish.
- Ta'lim markazlari va homiylik takliflarini ko'rish.
- Profil va o'quv natijalarini kuzatish.

FREE foydalanuvchining asosiy ta'lim tajribasi sun'iy ravishda buzilmasligi kerak.

### PRO

**Tavsiya etilgan narx:** 29 900 so'm / 30 kun.

Imkoniyatlar:

- FREE imkoniyatlarining barchasi.
- PRO uchun belgilangan qo'shimcha ta'lim imkoniyatlari.
- PRO analytics.
- Qo'shimcha AI imkoniyatlari va limitlari.
- PRO badge.
- PRO uchun maxsus imkoniyatlar.
- PRO tarifiga mos qo'shimcha kontent.

Muhim:

PRO obunasi Respublika Mock imtihonlarini avtomatik ravishda bepul qilmaydi.

PRO foydalanuvchi standart Mock uchun alohida 9 000 so'm to'laydi, agar event boshqa narx yoki chegirma belgilamagan bo'lsa.

### PRO MAX

**Tavsiya etilgan narx:** 89 000 so'm / 30 kun.

Imkoniyatlar:

- FREE imkoniyatlarining barchasi.
- PRO imkoniyatlarining barchasi.
- PRO MAX uchun maxsus AI limitlari.
- Kengaytirilgan analytics.
- PRO MAX badge.
- Oyiga 8 ta standart Respublika Mock qatnashuv krediti.
- PRO MAX uchun maxsus event imtiyozlari.
- Tarifga tegishli qo'shimcha imkoniyatlar.

PRO MAX obunasi barcha pullik eventlarga cheksiz kirish degani emas.

8 ta kredit faqat eligibility sharti bajarilgan standart Mock eventlarga sarflanadi.

Maxsus sovrinli, yuqori xarajatli yoki alohida narxdagi eventlar PRO MAX paketiga kirmasligi mumkin.

Bunday eventlar admin tomonidan alohida belgilanadi.

## 1.2. Tariflarni boshqarish

Tariflar hardcode qilinmasligi kerak.

Admin panelda quyidagilarni boshqarish imkoniyati bo'lishi shart:

- Tarif nomi.
- Tarif narxi.
- Davomiyligi.
- Aktiv yoki noaktiv holati.
- Tarif imkoniyatlari.
- AI limitlari.
- Mock kreditlari.
- Chegirmalar.
- Tarifning boshlanish va tugash sanasi.
- Tarif versiyasi.
- Tarifning foydalanuvchilarga ko'rinishi.
- Promo campaign bilan bog'lanishi.

Narxlar konfiguratsiyadan olinadi.

Eski obuna yozuvlari o'z vaqtida sotib olingan tarif shartlarini saqlashi kerak. Narx o'zgarsa, oldingi xaridlar tarixini buzmaslik kerak.

---

# 2. SINGLE MOCK PURCHASE

## 2.1. Bitta Mock xaridi

**Tavsiya etilgan boshlang'ich narx:** 9 000 so'm.

Foydalanuvchi bitta Respublika Mock imtihoniga alohida qatnashuv huquqini sotib olishi mumkin.

Bu imkoniyat quyidagilarga tegishli:

- FREE.
- PRO.
- PRO MAX, agar kreditlari tugagan bo'lsa yoki event paketga kirmasa.

## 2.2. Xarid jarayoni

1. Student Mock Marketplace sahifasiga kiradi.
2. Mavjud eventlarni ko'radi.
3. Event sahifasini ochadi.
4. Imtihon ma'lumotlarini tekshiradi.
5. `Register` tugmasini bosadi.
6. Tizim uning bepul krediti, obunasi va mavjud registration holatini tekshiradi.
7. Agar bepul kredit mavjud bo'lsa, undan foydalanish taklif qilinadi.
8. Agar kredit mavjud bo'lmasa, payment checkout ochiladi.
9. To'lov provider orqali amalga oshiriladi.
10. Backend provider callback/webhook orqali to'lovni tasdiqlaydi.
11. Registration tasdiqlanadi.
12. Student imtihon qatnashchilari ro'yxatiga qo'shiladi.
13. Dashboard va notification yangilanadi.

## 2.3. Payment qoidalari

Frontend hech qachon o'zi to'lov muvaffaqiyatli bo'lganini belgilamasligi kerak.

Faqat backend provider tomonidan tasdiqlangan payment asosida registration faollashtiriladi.

Payment holatlari:

- `PENDING`
- `PROCESSING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`
- `EXPIRED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

Har bir payment uchun:

- Unique transaction ID.
- User ID.
- Product type.
- Product ID.
- Amount.
- Currency.
- Payment provider.
- Provider transaction ID.
- Status.
- Created time.
- Updated time.
- Paid time.
- Refund information.
- Metadata.

Payment callback idempotent bo'lishi shart.

Bitta callback bir necha marta kelsa ham, foydalanuvchiga ikki marta kredit yoki registration berilmasligi kerak.

## 2.4. Double payment himoyasi

- Har bir checkout uchun idempotency key.
- Bir event uchun duplicate registration himoyasi.
- Bir payment uchun faqat bitta successful fulfillment.
- Parallel requestlar uchun database transaction.
- Unique constraints.
- Payment reconciliation job.

---

# 3. PRO MAX — MONTHLY MOCK CREDITS

## 3.1. Kredit tizimi

PRO MAX obunasi faol bo'lgan har bir billing davrida 8 ta standart Mock krediti beriladi.

Masalan:

| Mock | Fan | Kredit |
|---|---|---:|
| 1 | Matematika | 1 |
| 2 | Matematika | 1 |
| 3 | Ingliz tili | 1 |
| 4 | Ingliz tili | 1 |
| 5 | Ona tili | 1 |
| 6 | Ona tili | 1 |
| 7 | Tarix | 1 |
| 8 | Tarix | 1 |

Bu faqat misol.

Fanlar, eventlar soni va jadval admin tomonidan talabga qarab belgilanadi.

8 ta kredit har bir fan uchun alohida emas, barcha eligible standart Mock eventlar uchun umumiy hisoblanadi.

## 3.2. Kredit qoidalari

- Har bir billing davrida 8 ta kredit.
- Har bir muvaffaqiyatli registration 1 ta kredit sarflaydi.
- Bir event uchun bir student faqat bir marta registration qilishi mumkin.
- Ishlatilmagan kreditlar keyingi billing davriga o'tmaydi.
- Obuna tugasa, yangi kredit berilmaydi.
- Faol billing davridagi kreditlar eventning registration qoidalariga muvofiq ishlatiladi.
- Maxsus eventlar uchun kredit sarflanmasligi mumkin.
- Kredit sarflash atomik transaction orqali amalga oshadi.
- Bir vaqtda bir nechta request kelganda kredit manfiy bo'lib ketmasligi kerak.

## 3.3. Credit ledger

Kreditlarni faqat `remaining_credits` integer bilan boshqarish yetarli emas.

To'liq ledger kerak.

Har bir o'zgarish alohida yoziladi:

- `GRANTED`
- `RESERVED`
- `CONSUMED`
- `RELEASED`
- `EXPIRED`
- `ADJUSTED`

Har bir yozuvda:

- User.
- Subscription.
- Billing period.
- Event.
- Credit amount.
- Action.
- Timestamp.
- Reason.
- Related transaction.

Kreditning haqiqiy qoldig'i ledger asosida tekshirilishi mumkin bo'lishi kerak.

## 3.4. Registration va kredit

Tavsiya etiladigan flow:

1. Student eventga registration qiladi.
2. Backend eligibility tekshiradi.
3. Kredit mavjud bo'lsa, transaction ichida rezerv qilinadi.
4. Registration muvaffaqiyatli yaratiladi.
5. Kredit sarflangan deb belgilanadi.
6. Registration bekor qilinsa, event qoidalariga muvofiq kredit qaytarilishi mumkin.

Agar event bekor qilinsa, qatnashuvchilarning ishlatilgan kreditlarini qaytarish siyosati admin tomonidan belgilanadi.

## 3.5. PRO MAX UI

Student dashboard:

- PRO MAX badge.
- Obuna tugash sanasi.
- 8 ta kreditdan nechtasi ishlatilgani.
- Qancha kredit qolgani.
- Kreditlar tarixi.
- Keyingi billing davri.
- Eligible Mock eventlar.
- Maxsus eventlar uchun alohida payment.

Misol:

`Mock imkoniyatlaringiz: 5 / 8 qoldi`

Bu ma'lumot backend'dan olinadi.

---

# 4. MOCK MARKETPLACE

Mock Marketplace barcha ichki va tashqi tashkilotchilarning eventlarini bir joyda ko'rsatadi.

## 4.1. Student frontend

Sahifalar:

- `/mock`
- `/mock/[slug]`
- `/mock/my-events`
- `/mock/history`
- `/mock/results`
- `/mock/leaderboard`

Marketplace imkoniyatlari:

- Barcha eventlar.
- Fan bo'yicha filter.
- Sana bo'yicha filter.
- Narx bo'yicha filter.
- Tashkilotchi bo'yicha filter.
- Bepul va pullik eventlar.
- PRO MAX uchun eligible eventlar.
- Yaqinlashayotgan eventlar.
- Ro'yxatdan o'tgan eventlar.
- Yakunlangan eventlar.

Event card:

- Event nomi.
- Fan.
- Tashkilotchi.
- Sana va vaqt.
- Qatnashchilar soni.
- Narx.
- Sovrin.
- Event status.
- Registration status.

## 4.2. Event detail

Har bir event sahifasida:

- To'liq tavsif.
- Tashkilotchi profili.
- Fan va mavzular.
- Imtihon formati.
- Savollar soni.
- Davomiyligi.
- Boshlanish vaqti.
- Registration deadline.
- Qatnashuv narxi.
- Sovrinlar.
- Qoidalar.
- Refund policy.
- Qatnashchilar.
- Registration CTA.

Frontend barcha ma'lumotlarni real backend API'dan olishi kerak.

---

# 5. ORGANIZER PLATFORM

## 5.1. Maqsad

IlmIldizi tashqi ta'lim tashkilotlari va mustaqil o'qituvchilarga o'z Mock imtihonlarini tashkil etish imkonini beradi.

Organizer turlari:

- Ta'lim markazi.
- Maktab.
- Universitet.
- Mustaqil o'qituvchi.
- Ta'lim loyihasi.
- Hamkor tashkilot.

## 5.2. Organizer registration

Organizer uchun alohida registration flow.

Ma'lumotlar:

- Tashkilot nomi.
- Tashkilot turi.
- Logo.
- Tavsif.
- Telefon.
- Email.
- Website.
- Telegram.
- Manzil.
- Mas'ul shaxs.
- Kerakli verification hujjatlari.

Statuslar:

- `DRAFT`
- `PENDING_VERIFICATION`
- `VERIFIED`
- `REJECTED`
- `SUSPENDED`
- `BLOCKED`

Organizer tasdiqlanmaguncha pullik public event yaratish huquqiga ega bo'lmasligi mumkin.

## 5.3. Organizer dashboard

Route:

`/organizer/dashboard`

Dashboard quyidagilarni ko'rsatadi:

- Jami eventlar.
- Faol eventlar.
- Jami qatnashchilar.
- Jami registration.
- Jami tushum.
- Platforma komissiyasi.
- Organizer sof daromadi.
- Kutilayotgan payout.
- Yakunlangan eventlar.
- Event analytics.

## 5.4. Event creation

Organizer event yaratishi mumkin.

Form fields:

- Event title.
- Slug.
- Description.
- Subject.
- Grade.
- Topics.
- Event image.
- Registration start.
- Registration end.
- Event start.
- Event end.
- Question count.
- Duration.
- Price.
- Currency.
- Maximum participants.
- Minimum participants.
- Prize description.
- Rules.
- Refund policy.
- Visibility.
- Registration requirements.
- Eligible subscription plans.
- Mock credit eligibility.
- Leaderboard settings.

Event visibility:

- `PUBLIC`
- `UNLISTED`
- `PRIVATE`
- `INVITE_ONLY`

Event status:

- `DRAFT`
- `PENDING_REVIEW`
- `PUBLISHED`
- `REGISTRATION_OPEN`
- `REGISTRATION_CLOSED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `SUSPENDED`

## 5.5. Question management

Organizer savollarni quyidagi usullarda kiritishi mumkin:

- Manual question creation.
- CSV import.
- XLSX import.
- Admin-approved question bank.
- Rasmli savollar.
- Bir nechta javob variantlari.
- Single choice.
- Multiple choice.
- Matnli javob.

Savollarni import qilishda validation kerak.

Savollarni studentlarga event boshlanishidan oldin ko'rsatish mumkin emas.

Answer key faqat backend'da saqlanishi kerak.

Organizer faqat o'z eventiga tegishli savollarni boshqaradi.

Boshqa tashkilotchining savollariga kirish taqiqlanadi.

## 5.6. Participant management

Organizer:

- Qatnashchilarni ko'radi.
- Registration statusni ko'radi.
- Ishtirokchilar sonini ko'radi.
- CSV eksport qiladi, faqat ruxsat etilgan maydonlar bilan.
- Event qoidalariga muvofiq qatnashchini bloklaydi.
- Natijalarni ko'radi.
- Leaderboard'ni ko'radi.

Studentlarning shaxsiy ma'lumotlarini ko'rish faqat zarur va qonuniy maqsadlar uchun ruxsat bilan amalga oshiriladi.

## 5.7. Organizer monetization

IlmIldizi pullik qatnashuvdan komissiya oladi.

Boshlang'ich biznes gipotezasi:

**Platform commission: 15%.**

Misol:

- 100 qatnashchi.
- Har biri 9 000 so'm.
- Umumiy tushum: 900 000 so'm.
- Platforma komissiyasi: 135 000 so'm.
- Organizer ulushi: 765 000 so'm.

Bu misol. Real settlement payment provider fee, soliq, refund, chargeback va shartnomaga qarab hisoblanadi.

Komissiya admin tomonidan boshqarilishi kerak.

Komissiya event yoki organizer uchun individual belgilanishi mumkin.

## 5.8. Organizer payout

Organizer uchun payout tizimi:

- Available balance.
- Pending balance.
- Paid balance.
- Platform fee.
- Refund deduction.
- Payout history.

Payout status:

- `PENDING`
- `APPROVED`
- `PROCESSING`
- `PAID`
- `FAILED`
- `REJECTED`

Payout faqat tasdiqlangan va reconciliation'dan o'tgan summalar uchun amalga oshiriladi.

Organizer bank/payment ma'lumotlari himoyalangan bo'lishi kerak.

Payout uchun admin approval va audit log talab qilinadi.

---

# 6. EDUCATION CENTER PARTNERSHIP

## 6.1. Maqsad

IlmIldizi ta'lim markazlariga o'z xizmatlarini platformadagi o'quvchilarga taklif qilish imkonini beradi.

Markazlar quyidagilarni taklif qilishi mumkin:

- Kurslar.
- Bepul sinov darslari.
- 10–20% chegirmalar.
- Bir oylik bepul kurs.
- Grantlar.
- Mock g'oliblariga sovg'alar.
- Maxsus ta'lim dasturlari.

## 6.2. Education Center profile

Har bir markaz uchun:

- Name.
- Logo.
- Description.
- Address.
- Phone.
- Telegram.
- Website.
- Social links.
- Subjects.
- Course catalog.
- Pricing.
- Discount offers.
- Verification status.
- Rating/review information.

Faqat tekshirilgan tashkilotlar Verified badge oladi.

## 6.3. Partnership offers

Offer turlari:

- `DISCOUNT`
- `FREE_TRIAL`
- `FREE_COURSE`
- `SCHOLARSHIP`
- `GIFT`
- `SPECIAL_PROMOTION`

Har bir offer:

- Title.
- Description.
- Start date.
- End date.
- Eligibility.
- Discount value.
- Promo code.
- Redemption limit.
- Maximum users.
- Terms.
- Sponsor/center.
- Status.

## 6.4. Offer redemption

Student offerni tanlaydi.

Backend eligibility tekshiradi.

Agar talablar bajarilsa:

- Promo code yaratiladi yoki beriladi.
- Redemption yozuvi yaratiladi.
- Studentga notification yuboriladi.
- Hamkor markazga faqat zarur ma'lumotlar uzatiladi.

Markaz offer natijasini dashboard'da ko'radi.

## 6.5. Referral commission

IlmIldizi orqali ta'lim markaziga kelgan o'quvchi kursga yozilsa, kelishilgan referral commission hisoblanishi mumkin.

Flow:

1. Student markaz offerini ko'radi.
2. Referral link yoki code orqali murojaat qiladi.
3. Markaz lead'ni qabul qiladi.
4. Kursga yozilganini tasdiqlaydi.
5. Komissiya hisoblanadi.
6. Admin tekshiruvidan so'ng settlement amalga oshiriladi.

Referral attribution:

- Referral code.
- Campaign ID.
- Student ID.
- Center ID.
- Click time.
- Lead submission time.
- Conversion status.
- Commission amount.

Referral commission shartlari shaffof bo'lishi kerak.

---

# 7. ADVERTISING & SPONSORSHIP

## 7.1. Advertising platform

Ta'lim markazlari IlmIldizi ichida reklama berishi mumkin.

Reklama joylari:

- Home feed.
- Mock Marketplace.
- Relevant subject pages.
- Education Center directory.
- Sponsored Mock.
- Special campaign pages.

Reklama foydalanuvchi ta'lim tajribasini buzmasligi kerak.

Har bir reklama aniq `Reklama` yoki `Homiylik` deb belgilanadi.

## 7.2. Advertising campaign

Campaign fields:

- Advertiser.
- Campaign title.
- Description.
- Banner/image.
- Landing page.
- Placement.
- Start date.
- End date.
- Budget.
- Pricing model.
- Target audience.
- Maximum impressions.
- Maximum clicks.
- Status.

Pricing models:

- `FIXED`
- `CPM`
- `CPC`
- `SPONSORED_EVENT`

Campaign status:

- `DRAFT`
- `PENDING_REVIEW`
- `APPROVED`
- `ACTIVE`
- `PAUSED`
- `COMPLETED`
- `REJECTED`

## 7.3. Ad analytics

- Impressions.
- Clicks.
- CTR.
- Conversions, agar tracking rozilik va qonuniy asosga ega bo'lsa.
- Spend.
- Remaining budget.

Analytics bot traffic va takroriy eventlardan himoyalangan bo'lishi kerak.

## 7.4. Sponsorship

Sponsorlar:

- Respublika Mock sovrinlarini moliyalashtirishi.
- Grant ajratishi.
- G'oliblarga bepul kurs berishi.
- Maxsus event tashkil etishi.
- Platformada brend ko'rinishini olishi mumkin.

Har bir sponsorship uchun shartnoma, budjet, deliverables va settlement qayd qilinadi.

---

# 8. STUDENT DATA PRIVACY & LEAD GENERATION

## 8.1. Strict rule

IlmIldizi o'quvchilarning shaxsiy ma'lumotlarini sotmaydi.

Quyidagilarni roziliksiz uchinchi tomonlarga sotish yoki berish mumkin emas:

- Ism.
- Telefon raqami.
- Email.
- Shaxsiy test natijalari.
- O'quvchi profili.
- Aniq ta'lim tarixi.
- Shaxsni aniqlash imkonini beradigan boshqa ma'lumotlar.

Platforma foydalanuvchi ishonchini saqlashi kerak.

## 8.2. Anonymous aggregated analytics

IlmIldizi tashkilotlarga shaxsni aniqlab bo'lmaydigan agregat statistika taklif qilishi mumkin.

Misollar:

- Qaysi fanlarga qiziqish yuqori.
- Qaysi mavzularda umumiy qiyinchilik ko'p.
- Umumiy test natijalari taqsimoti.
- Fanlar bo'yicha umumiy o'zlashtirish.
- Vaqt bo'yicha faollik.
- Agregat hududiy ko'rsatkichlar, agar kichik guruhlar orqali shaxsni aniqlash imkoni bo'lmasa.

Kichik guruhlar uchun natijalar ko'rsatilmasligi kerak.

Anonimlashtirish haqiqiy bo'lishi va qayta identifikatsiya xavfi hisobga olinishi kerak.

## 8.3. Opt-in student leads

Ta'lim markazi studentga taklif yuborishi uchun studentning aniq roziligi kerak.

Misol:

`Men ushbu ta'lim markazidan kurslar va chegirmalar haqida ma'lumot olishga roziman.`

Rozilik quyidagilar bilan saqlanadi:

- Student ID.
- Center ID.
- Consent purpose.
- Consent text version.
- Timestamp.
- Source.
- Revocation timestamp.

Student roziligini qaytarib olishi mumkin.

Rozilik bekor qilingandan keyin yangi marketing kontaktlari yuborilmaydi.

Lead'lar faqat ko'rsatilgan markaz va maqsad doirasida ishlatiladi.

---

# 9. B2B DASHBOARD

## 9.1. Center dashboard

Route:

`/partner/dashboard`

Markaz quyidagilarni ko'radi:

- Profil.
- Kurslar.
- Offers.
- Campaigns.
- Leads.
- Referral conversions.
- Analytics.
- Billing.
- Invoices.
- Team members.
- Settings.

## 9.2. B2B analytics

Markazga quyidagilar taqdim etilishi mumkin:

- Offer views.
- Offer clicks.
- Opt-in leads.
- Referral conversions.
- Campaign performance.
- General aggregated subject interest.
- General aggregated performance insights.

Studentning individual o'quv natijalari markazga avtomatik ochilmaydi.

## 9.3. B2B subscription

Kelajakda markazlar uchun alohida B2B tariflari qo'shish imkoniyati bo'lishi kerak.

Misol:

- Starter.
- Growth.
- Business.

Narxlar hozircha konfiguratsiya orqali boshqariladi.

B2B tariflari student obunalaridan alohida billing tizimida yuritilishi kerak.

---

# 10. PAYMENT PROVIDER INTEGRATION

IlmIldizi ishlatadigan mavjud payment providerlar loyihadagi real integratsiya asosida saqlanadi.

Masalan:

- Click.
- Payme.
- Boshqa tasdiqlangan providerlar.

Yangi provider qo'shish uchun umumiy payment abstraction kerak.

## 10.1. Payment service

Provider-specific kod business logic ichiga aralashtirilmasligi kerak.

Umumiy interface:

- Create payment.
- Verify payment.
- Handle callback.
- Cancel payment.
- Refund payment.
- Check payment status.
- Reconcile transactions.

Har bir provider adapter orqali ulanadi.

## 10.2. Payment security

- Callback signature verification.
- Provider transaction verification.
- Idempotency.
- Amount verification.
- Currency verification.
- User ownership verification.
- Duplicate callback protection.
- Replay attack protection.
- Secure logging.
- Secret management.
- Payment audit trail.

Webhook endpoint hech qachon faqat frontend redirect'iga ishonmasligi kerak.

## 10.3. Payment reconciliation

Scheduled background job:

1. Pending paymentlarni topadi.
2. Provider statusini tekshiradi.
3. Database holatini yangilaydi.
4. Yetishmayotgan fulfillment'ni qayta ishlaydi.
5. Duplicate fulfillment'ni oldini oladi.
6. Mismatch holatlarini admin uchun chiqaradi.

---

# 11. REFUND & CANCELLATION

Refund siyosati event, subscription va B2B xizmatlar uchun alohida bo'lishi kerak.

Refund sabablar:

- Payment duplicate.
- Event cancelled.
- Organizer eventni o'tkazmagan.
- Texnik muammo.
- Admin-approved exceptional refund.

Refund status:

- `REQUESTED`
- `UNDER_REVIEW`
- `APPROVED`
- `PROCESSING`
- `REFUNDED`
- `REJECTED`
- `FAILED`

Refund payment provider imkoniyatlariga mos ishlashi kerak.

Refund amalga oshirilganda:

- Payment ledger yangilanadi.
- Registration status qayta ko'rib chiqiladi.
- Kreditlar qaytarilishi yoki qaytarilmasligi event qoidalariga muvofiq belgilanadi.
- Student notification oladi.
- Admin audit log yoziladi.

---

# 12. DATABASE ARCHITECTURE

Quyidagi modellarning nomlari loyiha texnologiyasi va mavjud naming convention'ga moslashtirilishi mumkin.

Yangi schema yozishdan oldin mavjud database to'liq audit qilinishi shart.

Mavjud ishlaydigan modellarni ko'r-ko'rona takrorlash mumkin emas.

## 12.1. Subscription

`SubscriptionPlan`

- id
- name
- slug
- description
- price
- currency
- duration_days
- is_active
- is_public
- features
- created_at
- updated_at

`Subscription`

- id
- user_id
- plan_id
- plan_snapshot
- status
- starts_at
- expires_at
- billing_period_start
- billing_period_end
- auto_renew
- created_at
- updated_at

`SubscriptionEntitlement`

- id
- subscription_id
- entitlement_key
- entitlement_value
- starts_at
- expires_at

## 12.2. Payments

`Payment`

- id
- user_id
- product_type
- product_id
- amount
- currency
- provider
- provider_transaction_id
- idempotency_key
- status
- paid_at
- created_at
- updated_at

`PaymentEvent`

- id
- payment_id
- event_type
- provider_payload
- processed_at
- processing_status

`Refund`

- id
- payment_id
- amount
- reason
- status
- provider_refund_id
- created_at
- processed_at

## 12.3. Mock credits

`MockCreditAccount`

- id
- user_id
- subscription_id
- billing_period_start
- billing_period_end
- granted_amount
- consumed_amount
- reserved_amount
- expires_at

`MockCreditLedger`

- id
- account_id
- user_id
- event_id
- registration_id
- action
- amount
- reason
- idempotency_key
- created_at

## 12.4. Mock marketplace

`MockEvent`

- id
- organizer_id
- title
- slug
- description
- subject_id
- grade
- price
- currency
- capacity
- registration_start
- registration_end
- starts_at
- ends_at
- status
- visibility
- credit_eligible
- refund_policy
- created_at
- updated_at

`MockRegistration`

- id
- event_id
- student_id
- payment_id
- credit_ledger_id
- status
- registered_at
- cancelled_at

`MockQuestion`

- id
- event_id
- question_type
- content
- options
- answer_data
- points
- order

`MockResult`

- id
- event_id
- student_id
- score
- correct_count
- incorrect_count
- duration
- rank
- completed_at

## 12.5. Organizers

`Organizer`

- id
- owner_user_id
- name
- type
- logo
- description
- contact_data
- verification_status
- created_at
- updated_at

`OrganizerMember`

- id
- organizer_id
- user_id
- role
- status

`OrganizerPayout`

- id
- organizer_id
- gross_amount
- platform_fee
- refund_amount
- net_amount
- status
- payout_reference
- created_at
- processed_at

## 12.6. Education centers

`EducationCenter`

- id
- organizer_id
- name
- slug
- logo
- description
- contact_data
- address
- verification_status
- created_at

`EducationOffer`

- id
- center_id
- title
- description
- offer_type
- discount_value
- promo_code
- start_at
- end_at
- redemption_limit
- status

`OfferRedemption`

- id
- offer_id
- student_id
- referral_code
- status
- redeemed_at

## 12.7. Referral

`Referral`

- id
- source_type
- source_id
- referrer_id
- referred_user_id
- referral_code
- status
- created_at

`ReferralConversion`

- id
- referral_id
- conversion_type
- conversion_amount
- commission_amount
- status
- confirmed_at

## 12.8. Advertising

`AdCampaign`

- id
- advertiser_id
- title
- description
- placement
- budget
- spent_amount
- pricing_model
- target_config
- starts_at
- ends_at
- status

`AdImpression`

- id
- campaign_id
- anonymous_session_id
- placement
- created_at

`AdClick`

- id
- campaign_id
- anonymous_session_id
- created_at

## 12.9. Privacy and consent

`MarketingConsent`

- id
- student_id
- organization_id
- purpose
- consent_version
- granted_at
- revoked_at
- source

## 12.10. Platform configuration

`FeatureFlag`

- id
- key
- enabled
- configuration
- updated_at

`PlatformSetting`

- id
- key
- value
- updated_at

`AuditLog`

- id
- actor_id
- action
- resource_type
- resource_id
- before_data
- after_data
- ip_address
- created_at

Barcha pul qiymatlari floating-point formatda emas, integer minor units yoki loyihadagi aniq pul precision standartida saqlanishi kerak.

Currency har bir transaction bilan birga saqlanadi.

---

# 13. BACKEND API ARCHITECTURE

API route'lar mavjud backend framework va versioning convention'ga moslashtiriladi.

Quyidagi endpointlar funksional talab hisoblanadi.

## 13.1. Subscription API

- `GET /api/v1/subscriptions/plans`
- `GET /api/v1/subscriptions/me`
- `POST /api/v1/subscriptions/checkout`
- `POST /api/v1/subscriptions/cancel`
- `GET /api/v1/subscriptions/history`

## 13.2. Payment API

- `POST /api/v1/payments/checkout`
- `GET /api/v1/payments/{id}`
- `GET /api/v1/payments/history`
- `POST /api/v1/payments/{id}/refund-request`

Provider callbacks:

- `POST /api/v1/payments/webhooks/{provider}`

Webhook endpointlar provider talablariga muvofiq himoyalanadi.

## 13.3. Mock credit API

- `GET /api/v1/mock-credits/me`
- `GET /api/v1/mock-credits/history`

Credit sarflash to'g'ridan-to'g'ri public endpoint orqali amalga oshirilmaydi. U registration service ichida transaction bilan bajariladi.

## 13.4. Marketplace API

- `GET /api/v1/mock/events`
- `GET /api/v1/mock/events/{slug}`
- `POST /api/v1/mock/events/{id}/register`
- `POST /api/v1/mock/events/{id}/cancel`
- `GET /api/v1/mock/my-events`
- `GET /api/v1/mock/history`
- `GET /api/v1/mock/results/{id}`

## 13.5. Organizer API

- `POST /api/v1/organizers`
- `GET /api/v1/organizers/me`
- `PATCH /api/v1/organizers/me`
- `GET /api/v1/organizers/dashboard`
- `GET /api/v1/organizers/events`
- `POST /api/v1/organizers/events`
- `PATCH /api/v1/organizers/events/{id}`
- `POST /api/v1/organizers/events/{id}/submit`
- `GET /api/v1/organizers/events/{id}/participants`
- `GET /api/v1/organizers/events/{id}/analytics`
- `GET /api/v1/organizers/payouts`

## 13.6. Education Center API

- `GET /api/v1/partners/centers`
- `GET /api/v1/partners/centers/{slug}`
- `POST /api/v1/partners/centers`
- `GET /api/v1/partners/dashboard`
- `POST /api/v1/partners/offers`
- `PATCH /api/v1/partners/offers/{id}`
- `GET /api/v1/partners/leads`
- `GET /api/v1/partners/analytics`

## 13.7. Consent API

- `POST /api/v1/privacy/consents`
- `GET /api/v1/privacy/consents`
- `DELETE /api/v1/privacy/consents/{id}`

## 13.8. Advertising API

- `GET /api/v1/ads/placements/{placement}`
- `POST /api/v1/advertisers/campaigns`
- `GET /api/v1/advertisers/campaigns`
- `PATCH /api/v1/advertisers/campaigns/{id}`
- `GET /api/v1/advertisers/analytics`

## 13.9. Admin API

- `/api/v1/admin/subscriptions/*`
- `/api/v1/admin/payments/*`
- `/api/v1/admin/refunds/*`
- `/api/v1/admin/mock-events/*`
- `/api/v1/admin/organizers/*`
- `/api/v1/admin/partners/*`
- `/api/v1/admin/offers/*`
- `/api/v1/admin/advertising/*`
- `/api/v1/admin/payouts/*`
- `/api/v1/admin/feature-flags/*`
- `/api/v1/admin/audit-logs/*`

Har bir endpoint uchun authentication, authorization, validation, pagination va error format standartlari mavjud bo'lishi shart.

---

# 14. FRONTEND ARCHITECTURE

Frontend faqat API'dan kelgan real ma'lumotlarni ko'rsatadi.

Backend'da mavjud bo'lmagan natijalarni uydirma qilib ko'rsatish taqiqlanadi.

## 14.1. Student pages

Quyidagi sahifalar ishlab chiqiladi yoki mavjud sahifalarga integratsiya qilinadi:

- `/pricing`
- `/subscription`
- `/subscription/history`
- `/payment/success`
- `/payment/failed`
- `/mock`
- `/mock/[slug]`
- `/mock/my-events`
- `/mock/history`
- `/mock/results`
- `/partners`
- `/partners/[slug]`
- `/offers`
- `/offers/[id]`

Student dashboard ichida:

- Current plan.
- Subscription expiry.
- Available entitlements.
- Mock credits.
- Payment history.
- Recommended offers.
- Active registrations.

## 14.2. Pricing UI

Pricing sahifasida uchta asosiy tarif:

FREE, PRO, PRO MAX.

Har bir tarif uchun:

- Narx.
- Davomiylik.
- Imkoniyatlar.
- Taqqoslash.
- CTA.
- Active plan state.
- Checkout.

Narxlar API'dan olinadi.

Tariflar o'rtasidagi farq aniq ko'rsatiladi.

PRO obunasida Mock bepul emasligi, PRO MAX'da esa 8 ta eligible kredit borligi tushunarli yozilishi kerak.

## 14.3. Organizer pages

- `/organizer/register`
- `/organizer/dashboard`
- `/organizer/events`
- `/organizer/events/create`
- `/organizer/events/[id]`
- `/organizer/events/[id]/participants`
- `/organizer/events/[id]/questions`
- `/organizer/events/[id]/results`
- `/organizer/analytics`
- `/organizer/payouts`
- `/organizer/settings`

## 14.4. Partner pages

- `/partner/register`
- `/partner/dashboard`
- `/partner/profile`
- `/partner/courses`
- `/partner/offers`
- `/partner/leads`
- `/partner/referrals`
- `/partner/analytics`
- `/partner/billing`
- `/partner/settings`

## 14.5. Advertiser pages

- `/advertiser/dashboard`
- `/advertiser/campaigns`
- `/advertiser/campaigns/create`
- `/advertiser/analytics`
- `/advertiser/billing`

Agar organizer va advertiser bir tashkilot bo'lsa, bir xil account va organization modelidan foydalanish mumkin.

Lekin permission va business role alohida bo'lishi shart.

## 14.6. Frontend quality

- Responsive desktop, tablet va mobile.
- Loading states.
- Empty states.
- Error states.
- Success states.
- Skeleton loaders.
- Form validation.
- Confirmation dialogs.
- Accessible controls.
- Consistent design system.
- Real API integration.
- No hardcoded production data.
- No browser alert/confirm.
- Payment status uchun aniq feedback.

---

# 15. ADMIN PANEL

Admin panel barcha monetizatsiya jarayonlarini boshqarishi kerak.

## 15.1. Subscription management

- Tarif yaratish.
- Tarifni tahrirlash.
- Tarifni faollashtirish.
- Tarifni vaqtincha to'xtatish.
- Narxni o'zgartirish.
- Entitlement boshqarish.
- Obunalarni ko'rish.
- Manual adjustment — faqat ruxsatli admin.
- Subscription history.

## 15.2. Payment management

- Barcha paymentlar.
- Payment provider.
- Transaction status.
- Failed paymentlar.
- Pending paymentlar.
- Refund requests.
- Reconciliation.
- Transaction details.
- Audit history.

## 15.3. Mock management

- Eventlar.
- Tashkilotchilar.
- Event moderation.
- Event approval.
- Special event.
- Credit eligibility.
- Participant management.
- Result verification.
- Event cancellation.
- Refund policy.

## 15.4. Organizer management

- Verification.
- Approval.
- Rejection.
- Suspension.
- Commission settings.
- Payout approval.
- Organizer analytics.

## 15.5. Education center management

- Center verification.
- Offer moderation.
- Referral rules.
- Commission settings.
- Partner billing.
- Lead consent audit.

## 15.6. Advertising management

- Campaign approval.
- Campaign rejection.
- Placement management.
- Budget.
- Pricing.
- Active campaign monitoring.
- Ad performance.

## 15.7. Platform settings

Admin quyidagilarni boshqara olishi kerak:

- PRO price.
- PRO MAX price.
- Single Mock price.
- PRO MAX credit amount.
- Organizer commission.
- Referral commission.
- Advertising pricing.
- Feature flags.
- Campaign rules.
- Payment providers.
- Refund policies.

Barcha muhim admin amallari audit log bilan saqlanadi.

---

# 16. FEATURE FLAGS & ROLLOUT

Barcha modullar ishlab chiqiladi, lekin production'da birdaniga hammaga ochilmaydi.

## 16.1. Feature flags

Misol:

- `MONETIZATION_ENABLED`
- `SUBSCRIPTIONS_ENABLED`
- `PRO_PLAN_ENABLED`
- `PRO_MAX_ENABLED`
- `MOCK_MARKETPLACE_ENABLED`
- `SINGLE_MOCK_PURCHASE_ENABLED`
- `MOCK_CREDITS_ENABLED`
- `ORGANIZER_PLATFORM_ENABLED`
- `ORGANIZER_REGISTRATION_ENABLED`
- `PARTNER_PLATFORM_ENABLED`
- `EDUCATION_OFFERS_ENABLED`
- `REFERRAL_ENABLED`
- `ADVERTISING_ENABLED`
- `SPONSORSHIP_ENABLED`
- `B2B_ANALYTICS_ENABLED`
- `OPT_IN_LEADS_ENABLED`

Feature flags backend tomonidan boshqariladi.

Frontend flag holatini backend'dan oladi.

Frontend'da tugmani yashirish xavfsizlik chorasi hisoblanmaydi. Backend ham tegishli flag va permission'ni tekshirishi kerak.

## 16.2. Rollout Phase 1 — Core monetization

Faollashtiriladi:

- FREE.
- PRO.
- PRO MAX.
- Payment.
- Subscription.
- Single Mock.
- 8 ta Mock credit.
- Payment history.
- Admin payment management.

## 16.3. Rollout Phase 2 — Partnerships

Faollashtiriladi:

- Education Center directory.
- Verified center profiles.
- Offers.
- Discounts.
- Free course offers.
- Referral.
- Sponsored Mock.

## 16.4. Rollout Phase 3 — Organizer Platform

Faollashtiriladi:

- Organizer registration.
- Verification.
- Event creation.
- Question management.
- Registration.
- Participant management.
- Results.
- Commission.
- Payout.

## 16.5. Rollout Phase 4 — Advertising & B2B

Faollashtiriladi:

- Advertising campaigns.
- Sponsor dashboard.
- B2B analytics.
- Opt-in leads.
- Partner billing.
- Aggregated analytics.

Har bir phase oldidan test va admin approval talab qilinadi.

---

# 17. SECURITY & PERMISSIONS

Role-based access control va organization-level access control joriy qilinadi.

Tavsiya etilgan rollar:

- `STUDENT`
- `ORGANIZER_OWNER`
- `ORGANIZER_ADMIN`
- `ORGANIZER_EDITOR`
- `PARTNER_OWNER`
- `PARTNER_MANAGER`
- `ADVERTISER`
- `SUPPORT`
- `FINANCE_ADMIN`
- `MODERATOR`
- `SUPER_ADMIN`

Asosiy qoidalar:

1. Student boshqa student paymentlarini ko'ra olmaydi.
2. Organizer faqat o'z organization ma'lumotlariga kira oladi.
3. Organizer boshqa event savollarini ko'ra olmaydi.
4. Partner boshqa markaz lead'larini ko'ra olmaydi.
5. Advertiser faqat o'z campaignlarini boshqaradi.
6. Support moliyaviy amallarni ruxsatsiz bajara olmaydi.
7. Payout faqat vakolatli admin tomonidan tasdiqlanadi.
8. Admin amallari audit qilinadi.
9. API permission tekshiruvlari server-side bajariladi.
10. Sensitive data loglarga yozilmaydi.

Qo'shimcha:

- Rate limiting.
- Input validation.
- CSRF himoyasi, tegishli auth usuliga qarab.
- Secure cookies.
- SQL injection protection.
- XSS protection.
- Webhook signature validation.
- Secrets environment variables yoki secret manager'da.
- Sensitive data encryption.
- Access token rotation/revocation.
- File upload validation.
- Organization ownership verification.

---

# 18. NOTIFICATIONS

Notification tizimi quyidagi holatlarni qo'llab-quvvatlashi kerak:

## Student

- Payment successful.
- Payment failed.
- Subscription activated.
- Subscription expiring.
- Subscription expired.
- Mock registration confirmed.
- Mock starting soon.
- Mock result published.
- Credit used.
- Credit remaining.
- Refund status.
- New education offer.
- Referral status.

## Organizer

- Verification status.
- Event approved.
- Event rejected.
- Registration received.
- Event reminder.
- Event completed.
- Payout status.

## Partner

- Offer approved.
- Lead received.
- Referral conversion.
- Campaign approved.
- Campaign completed.
- Billing status.

Telegram notification mavjud bot infratuzilmasi orqali yuborilishi mumkin.

Notification yuborish business transaction'ni bloklamasligi kerak.

Failed notificationlar qayta yuborilishi mumkin bo'lishi kerak.

---

# 19. BACKGROUND JOBS

Quyidagi background jobs kerak:

- Subscription expiration checker.
- Subscription renewal processor, agar auto-renew mavjud bo'lsa.
- Mock credit grant.
- Mock credit expiration.
- Payment reconciliation.
- Payment expiration.
- Refund processor.
- Organizer settlement.
- Payout processing.
- Referral conversion verification.
- Advertising budget monitor.
- Campaign expiration.
- Event reminders.
- Event lifecycle processor.
- Analytics aggregation.
- Notification retry.
- Orphaned registration/payment cleanup.

Har bir job idempotent va monitoring qilinadigan bo'lishi kerak.

---

# 20. ANALYTICS & BUSINESS METRICS

Platforma quyidagi ko'rsatkichlarni hisoblaydi.

## Subscription

- Active subscriptions.
- New subscriptions.
- Renewal rate.
- Churn rate.
- FREE to PRO conversion.
- PRO to PRO MAX conversion.
- Subscription revenue.

## Mock

- Total events.
- Paid registrations.
- Free registrations.
- Average participants.
- Revenue per event.
- Credit usage.
- Credit expiration.
- Refund rate.

## Organizer

- Active organizers.
- Verified organizers.
- Events per organizer.
- Organizer gross revenue.
- Platform commission.
- Payout volume.

## Education Center

- Active centers.
- Offers published.
- Offer views.
- Redemptions.
- Leads.
- Referral conversions.

## Advertising

- Active campaigns.
- Ad revenue.
- Impressions.
- Clicks.
- CTR.
- Budget utilization.

## Finance

- Gross revenue.
- Net revenue.
- Payment fees.
- Refunds.
- Platform commission.
- Partner payouts.
- Subscription revenue.
- Mock revenue.
- Advertising revenue.

Gross revenue va net revenue bir-biridan aniq ajratilishi shart.

---

# 21. TESTING REQUIREMENTS

Production release oldidan quyidagilar test qilinishi kerak.

## 21.1. Subscription tests

- FREE user.
- PRO purchase.
- PRO MAX purchase.
- Expiration.
- Renewal.
- Upgrade.
- Downgrade.
- Cancellation.
- Duplicate payment callback.
- Failed payment.

## 21.2. Mock credit tests

- 8 credits grant.
- 1 credit consumption.
- 8 credits exhausted.
- 9th event purchase.
- Expired credits.
- Subscription expiration.
- Concurrent registration.
- Duplicate registration.
- Event cancellation.
- Refund and credit restoration.
- Special event exclusion.

## 21.3. Payment tests

- Successful payment.
- Failed payment.
- Cancelled payment.
- Duplicate webhook.
- Invalid signature.
- Wrong amount.
- Wrong currency.
- Provider timeout.
- Reconciliation.
- Refund.
- Partial refund.

## 21.4. Organizer tests

- Registration.
- Verification.
- Event creation.
- Event approval.
- Question upload.
- Participant registration.
- Payment settlement.
- Results.
- Commission.
- Payout.
- Unauthorized access.

## 21.5. Partner tests

- Center registration.
- Offer creation.
- Offer approval.
- Redemption.
- Consent.
- Lead access.
- Referral conversion.
- Commission.

## 21.6. Advertising tests

- Campaign creation.
- Approval.
- Budget limits.
- Start/end dates.
- Impressions.
- Click tracking.
- Duplicate event protection.
- Campaign expiration.

## 21.7. Security tests

- Cross-user access.
- Cross-organization access.
- Role escalation.
- IDOR.
- Invalid webhook.
- Sensitive data exposure.
- Unauthorized refund.
- Unauthorized payout.
- Consent revocation.

## 21.8. Frontend tests

Har bir sahifa uchun:

- Loading.
- Empty.
- Success.
- Error.
- Responsive.
- Permission state.
- API failure.
- Form validation.
- Navigation.
- Payment redirect.
- Real data rendering.

---

# 22. DEFINITION OF DONE

Har bir modul quyidagi shartlar bajarilgandagina complete deb hisoblanadi:

- Database migration mavjud.
- Backend model va business logic mavjud.
- API mavjud.
- Permission tekshirilgan.
- Frontend sahifasi mavjud.
- Admin boshqaruvi mavjud.
- Error handling mavjud.
- Loading va empty state mavjud.
- Audit log zarur joylarda mavjud.
- Unit testlar mavjud.
- Integration testlar mavjud.
- E2E testlar muhim flow'lar uchun mavjud.
- Documentation yangilangan.
- Production configuration mavjud.
- Monitoring mavjud.
- Feature flag ishlaydi.

Faqat UI tayyor bo'lishi modul tayyor degani emas.

Faqat API tayyor bo'lishi ham modul tayyor degani emas.

End-to-end flow ishlashi kerak.

---

# 23. IMPLEMENTATION RULES FOR AI CODING AGENT

Ushbu hujjatni bajaruvchi coding agent quyidagi qoidalarga qat'iy amal qilishi kerak.

## 23.1. Before implementation

1. Butun repository'ni o'rgan.
2. Backend arxitekturasini aniqlagin.
3. Frontend arxitekturasini aniqlagin.
4. Database schema'ni o'rgan.
5. Authentication va authorization tizimini tekshir.
6. Mavjud payment integratsiyalarini top.
7. Mavjud Mock va event tizimini tekshir.
8. Mavjud admin panelni o'rgan.
9. Mavjud kod bilan yangi talablarni taqqosla.
10. Duplicate model va endpoint yaratma.

Avval `IMPLEMENTATION_PLAN.md` yarat.

Unda:

- Existing architecture.
- Existing reusable modules.
- Required changes.
- New models.
- New API.
- Frontend routes.
- Admin pages.
- Security requirements.
- Dependencies.
- Migration plan.
- Testing plan.

## 23.2. Implementation

- Mavjud ishlaydigan funksiyalarni buzma.
- Katta refactor'larni sababsiz qilma.
- Business logic'ni frontend ichiga joylashtirma.
- Payment provider kodini business logic'dan ajrat.
- Transaction va idempotency ishlat.
- Permission tekshiruvlarini har bir endpointda bajar.
- Database constraint'lardan foydalan.
- API contract'larni hujjatlashtir.
- Frontend'da barcha loading/error/empty state'larni yarat.
- Har bir modulni end-to-end integratsiya qil.
- Mavjud naming convention'ni saqla.

## 23.3. Migration safety

- Production database'ni tekshirmasdan migration bajarilmasin.
- Destructive migration'lar alohida ko'rib chiqilsin.
- Existing data yo'qolmasin.
- Migration rollback imkoniyati baholansin.
- Eski payment va subscription tarixlari saqlansin.
- Yangi entitlement tizimi eski premium foydalanuvchilarning huquqlarini buzmasin.

## 23.4. No fake completion

Quyidagilarni hech qachon tayyor deb belgilama:

- API ishlamasa.
- Database saqlamasa.
- Payment provider ulanmagan bo'lsa.
- Webhook tekshirilmagan bo'lsa.
- Admin boshqaruvi ishlamasa.
- Frontend mock data ishlatsa.
- Permission tekshirilmagan bo'lsa.
- Testlar bajarilmagan bo'lsa.

Har bir bajarilgan ish uchun real test natijasini ko'rsat.

Agar tashqi payment provider credentials mavjud bo'lmasa, adapter va test muhiti tayyorlanadi, lekin real payment integratsiyasi ishlayapti deb da'vo qilinmaydi.

---

# 24. FINAL DELIVERY REPORT

Implementation yakunida agent quyidagi hisobotni tayyorlashi shart:

1. Repository audit natijasi.
2. Existing architecture.
3. Yangi database modellari.
4. Yangi migrationlar.
5. Backend endpointlar.
6. Frontend sahifalar.
7. Admin panel imkoniyatlari.
8. Payment integratsiyasi.
9. Subscription flow.
10. Mock credit flow.
11. Organizer flow.
12. Partner flow.
13. Advertising flow.
14. B2B analytics.
15. Security.
16. Automated tests.
17. Manual verification.
18. Feature flags.
19. Environment variables.
20. Deployment instructions.
21. Known limitations.
22. Production readiness status.

Har bir modul statusi:

- `COMPLETE`
- `PARTIALLY_COMPLETE`
- `BLOCKED`
- `NOT_IMPLEMENTED`

Dalilsiz `COMPLETE` yozish taqiqlanadi.

---

# 25. FINAL PRODUCT VISION

IlmIldizi kelajakda quyidagi yagona platformaga aylanadi:

**STUDENT ECOSYSTEM**
- FREE
- PRO
- PRO MAX
- Mock Marketplace
- Learning
- Community
- AI
- Leaderboard

**ORGANIZER ECOSYSTEM**
- Event creation
- Mock management
- Participants
- Results
- Analytics
- Revenue
- Payouts

**EDUCATION CENTER ECOSYSTEM**
- Courses
- Offers
- Discounts
- Free trials
- Student leads with consent
- Referral
- Analytics

**ADVERTISING ECOSYSTEM**
- Campaigns
- Sponsored Mock
- Sponsors
- Ad placements
- Performance analytics

**PLATFORM ECOSYSTEM**
- Payments
- Subscription engine
- Entitlements
- Credit ledger
- Commission engine
- Refunds
- Payouts
- Privacy
- Admin
- Analytics

## Final architectural principle

Barcha ushbu tizimlar bir-biridan ajralgan, lekin yagona IlmIldizi platformasi ichida integratsiyalashgan modullar bo'lishi kerak.

Biz hozir ularning barchasini to'liq ishlab chiqamiz.

Keyin esa:

- Birinchi navbatda monetizatsiya.
- Keyin hamkorlik.
- Keyin organizer marketplace.
- Oxirida advertising va B2B.

bosqichma-bosqich ishga tushiriladi.

**Maqsad: IlmIldizi faqat o'quvchilar foydalanadigan ta'lim platformasi emas, balki o'quvchilar, ta'lim markazlari, tashkilotchilar va homiylarni birlashtiradigan to'liq EdTech ekotizimi bo'lishi.**