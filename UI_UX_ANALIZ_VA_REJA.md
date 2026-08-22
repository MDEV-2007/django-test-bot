# IlmIldizi — UI/UX, Tipografika va Motion bo'yicha to'liq audit va yo'l xaritasi

Hujjat maqsadi: hozirgi dizaynning **nima uchun "xunuk" ko'rinayotganini** aniq sabablar bilan
ko'rsatish, har bir muammoga o'lchovli yechim berish va o'quvchini ekranga bog'lab turadigan
(lekin manipulyatsiya qilmaydigan) motion va gamifikatsiya tizimini loyihalash.

Hozirgi holat: Next.js 16 + Tailwind v4 + shadcn/ui, Inter (`--font-sans`) + Newsreader
(`--font-voice`), "Obsidian Slate & Emerald" palitrasi, lucide ikonkalar, recharts, sonner,
canvas-confetti, Web Audio FX.

---

## 1. Diagnoz — nega hozirgi ekran "yassi va zerikarli" ko'rinadi

### 1.1 Yagona eng katta muammo: **ierarxiya yo'q, "kartalar devori" bor**

Har bir sahifada 8–15 ta karta bor va ularning **hammasi bir xil vaznda**: bir xil fon
(`--surface-card-soft #14171d`), bir xil chegara (`rgba(255,255,255,0.07)`), bir xil radius,
bir xil ichki padding. Ko'z hech qayerga "tushmaydi" — nimaga birinchi qarash kerakligini
dizayn aytmaydi. Bu klassik "dashboard soup" muammosi.

Isbot: dashboardda hero, XP kartasi, 4 ta stat, 4 ta bo'lim, 3 ta o'yin, missiyalar, natijalar —
**15 ta bir xil quti**. Ularning orasida vizual "vazn" farqi deyarli nol.

### 1.2 Kontrast juda past — sirtlar bir-biridan ajralmaydi

| Element | Rang | Fonga nisbatan farq |
|---|---|---|
| Sahifa foni | `#0c0e12` | — |
| Karta foni | `#14171d` | ~2.5% yorug'lik farqi |
| Karta chegarasi | `rgba(255,255,255,.07)` | deyarli ko'rinmas |
| `--text-faint` | `#5a5d63` | fonga nisbatan ~3.9:1 (WCAG AA dan past) |

Natija: karta chekkasi ko'rinmaydi, soya yo'q, shuning uchun interfeys "yopishqoq bir tekis
qora rasm" bo'lib qoladi. Premium ilovalar (Linear, Vercel, Arc, Duolingo dark) fonni **qora
tomon**, kartani esa **yorug'roq** qiladi va ustiga **1px yorug' ichki chiziq** (inset highlight)
qo'yadi — shundan "shisha" effekti chiqadi.

### 1.3 Tipografika — asosiy shikoyat, va u haqiqatan ham asosli

Muammolar:

1. **Inter — 2016-yilning "default" shrifti.** Yomon emas, lekin brend ovozi yo'q; har qanday
   admin-panelga o'xshab qoladi. O'zbek lotin matnida (`o'`, `g'`, `ʼ`) apostroflar Inter'da
   juda ingichka va harflar orasidan "yiqilib" ketadi.
2. **Newsreader (serif) + Inter aralashmasi mos emas.** Newsreader — gazeta matni uchun
   optik jihatdan "yumshoq" serif; u qisqa, qalin sarlavhalarda ishonchsiz ko'rinadi.
3. **O'lchamlar juda mayda va bir xil.** Loyihada `text-xs` (12px) va `text-[11px]` juda ko'p
   ishlatilgan — `grep` bo'yicha 300+ marta. 11–12px asosiy o'lchamga aylanib qolgan.
   Odam ko'zi uchun interfeysning **asosiy matni 14–15px** bo'lishi kerak, 11px faqat
   yorliq/meta uchun.
4. **Tipografik shkala yo'q.** `text-2xl`, `text-xl`, `text-base`, `text-sm`, `text-xs`,
   `text-[11px]`, `text-[10px]` — bular Tailwind default'lari, brend shkalasi emas. Sarlavha
   bilan matn orasidagi sakrash ba'zan 1.2×, ba'zan 2×.
5. **`letter-spacing` va `line-height` sozlanmagan.** Katta sarlavhalar `tracking-tight`siz
   yoyilib turadi, mayda matn esa `leading` siqilgan.

### 1.4 Rang — brend rangi "ishlamayapti"

`--accent: #2fb3a3` (zumrad) — chiroyli rang, lekin:

- U **hamma joyda bir xil dozada** ishlatiladi: badge, ikonka, tugma, link, progress. Rang
  ierarxiya yaratmaydi, faqat "bezak" bo'lib qolgan.
- Ranglar palitrasi **faqat 1 ta brend rangi** ustiga qurilgan. Ikonka ranglari esa
  (amber, sky, indigo, rose, yellow, emerald) Tailwind'dan to'g'ridan-to'g'ri olingan va
  brend palitrasiga bog'lanmagan — natijada "rangli o'yinchoq" hissi.
- **Gradient, glow, noise, depth yo'q.** Dark UI da 1–2% shovqin (noise) va juda yumshoq
  radial gradient — bu "arzon" bilan "qimmat" o'rtasidagi asosiy farq.

### 1.5 Space va o'lchamlar — ritm yo'q

- `gap-3.5`, `gap-4`, `gap-5`, `gap-6`, `p-3.5`, `p-4`, `p-5`, `p-6`, `pt-6` — aralash.
  4pt tarmog'i bor, lekin **qoida yo'q**: qaysi holatda 16, qaysi holatda 20, qaysi holatda 24.
- Ikonka "plitkalari" `size-10`, `size-11`, `size-12` — uchta o'lcham bir sahifada.
- Radius: `--radius: 0.75rem` (12px) shadcn uchun, lekin `.bento-card` 24px, `rounded-2xl`,
  `rounded-3xl`, `rounded-xl` aralash ishlatiladi. **Radius tili yo'q.**

### 1.6 Motion — deyarli yo'q

Hozir bor narsa: `fadeIn` (0.25s), `scaleIn` (0.2s), `tactile-btn:active { scale(.975) }`,
`animate-pulse`, `flame-pulse`, confetti. Bu — bezak darajasidagi animatsiya.

Yo'q narsalar: sahifa o'tishlari, ro'yxat elementlarining ketma-ket (stagger) chiqishi,
raqamlarning "aylanib" o'zgarishi, progress barning "to'lishi", layout o'zgarishining
yumshoq ko'chishi, skeleton'dan kontentga "morph", gesture (swipe) javoblari.

**Motion — bu bezak emas, bu tushuntirish vositasi.** Element qayerdan kelganini va qayerga
ketganini ko'rsatmasa, foydalanuvchi har safar ekranni qaytadan "o'qiydi".

### 1.7 Emotsional dizayn — "yolg'izlik" muammosi

Hozir platforma o'quvchi bilan **faqat statistikada** gaplashadi: XP, foiz, streak.
Yo'q narsalar:

- Nomi bilan, vaqti bilan, kayfiyati bilan murojaat (faqat "Xayrli kech" bor — bu yaxshi start).
- Boshqa o'quvchilarning mavjudligi hissi (hozir faqat `online_count` raqami bor).
- Muvaffaqiyatni **nishonlash lahzasi** (confetti bor, lekin faqat 3 joyda).
- Muvaffaqiyatsizlikdan keyin **qo'llab-quvvatlash** (xato javobdan keyin faqat qizil rang).
- Uzoq muddatli **hikoya** (Bilim Ildizi metaforasi nomda bor, lekin vizual holda yo'q —
  daraxt o'smaydi, ildiz chuqurlashmaydi).

---

## 2. Yechim — Dizayn tizimi v2 ("Obsidian Deep")

### 2.1 Tipografika: 3 ta shrift, 1 ta shkala

**Tanlov (tavsiya №1 — eng xavfsiz va zamonaviy):**

| Rol | Shrift | Sabab |
|---|---|---|
| Display / sarlavha | **Bricolage Grotesque** yoki **Instrument Serif** | Xarakterli, "brend ovozi" beradi, o'zbek diakritikasi to'liq |
| UI / body | **Plus Jakarta Sans** yoki **Onest** | Inter'dan issiqroq, apostroflar aniq, `x-height` baland → mayda o'lchamda ham o'qiladi |
| Raqam / mono | **Geist Mono** yoki **JetBrains Mono** | Tabular raqamlar, ball/XP/taymer uchun |

**Tavsiya №2 (bir shriftli "silliq" variant):** butun sayt **Geist** (Vercel) + **Geist Mono**.
Kamroq xarakter, lekin nol xato bilan zamonaviy ko'rinadi.

**Mening tanlovim:** `Plus Jakarta Sans` (UI) + `Bricolage Grotesque` (display) + `Geist Mono`
(raqam). Sabab: Bricolage zamonaviy ta'lim brendlarida (Duolingo-dan keyingi to'lqin) juda
yaxshi ishlaydi, Jakarta esa mayda o'lchamda Inter'dan aniqroq.

```ts
// layout.tsx
import { Plus_Jakarta_Sans, Bricolage_Grotesque, Geist_Mono } from 'next/font/google';

const sans    = Plus_Jakarta_Sans({ subsets: ['latin','latin-ext'], variable: '--font-sans',    display: 'swap' });
const display = Bricolage_Grotesque({ subsets: ['latin','latin-ext'], variable: '--font-display', display: 'swap' });
const mono    = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
```

> `latin-ext` subset **majburiy** — o'zbek lotinidagi `ʻ`, `ʼ`, `ō` belgilari shu yerda.

**Tipografik shkala (Major Third, 1.25):**

```css
--text-2xs:  0.6875rem; /* 11px — faqat yorliq, meta, timestamp */
--text-xs:   0.75rem;   /* 12px — badge, tooltip */
--text-sm:   0.875rem;  /* 14px — ikkilamchi matn */
--text-base: 0.9375rem; /* 15px — ASOSIY UI matni (hozir 12-13px!) */
--text-lg:   1.125rem;  /* 18px — karta sarlavhasi */
--text-xl:   1.5rem;    /* 24px — bo'lim sarlavhasi */
--text-2xl:  2rem;      /* 32px — sahifa sarlavhasi */
--text-3xl:  2.75rem;   /* 44px — hero */
```

**Qoidalar:**
- Sarlavhalar: `letter-spacing: -0.02em`, `line-height: 1.15`.
- Body: `line-height: 1.55`, o'qish bloklari uchun `1.65` (allaqachon bor).
- **11px matn hech qachon asosiy ma'lumot tashimasin.** Hozir stat kartalarda yorliq 11px —
  bu chegaraviy holat, 12px ga chiqarish kerak.
- Raqamlar doim `font-variant-numeric: tabular-nums` (bor) + mono shrift.

### 2.2 Rang va chuqurlik (depth)

Asosiy o'zgarish: **fonni qoraytiring, sirtlarni yoritinq, ichki yorug' chiziq qo'shing.**

```css
--bg-page:            #08090c;  /* hozir #0c0e12 — qoraytiramiz */
--surface-1:          #101319;  /* asosiy karta */
--surface-2:          #161a22;  /* ko'tarilgan karta / popover */
--surface-3:          #1d222c;  /* input, hover */
--border-card:        rgba(255,255,255,0.09);
--border-highlight:   rgba(255,255,255,0.06); /* karta ustidagi 1px inset yorug'lik */

--shadow-card:  0 1px 2px rgba(0,0,0,.4), 0 8px 24px -8px rgba(0,0,0,.5);
--shadow-float: 0 2px 4px rgba(0,0,0,.4), 0 16px 48px -12px rgba(0,0,0,.6);
--glow-accent:  0 0 0 1px var(--accent-border), 0 8px 32px -8px rgba(47,179,163,.35);
```

Karta uslubi:

```css
.surface {
  background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border-card);
  box-shadow: var(--shadow-card), inset 0 1px 0 var(--border-highlight);
}
```

Bu bitta o'zgarish "yassi" hissini **darhol** yo'q qiladi.

**Ranglar ierarxiyasi qoidasi (juda muhim):**
- Zumrad (`--accent`) **faqat** asosiy harakat va o'sish uchun. Bir ekranda **1 ta** birlamchi
  zumrad tugma.
- Amber — faqat streak/premium.
- Rose — faqat xato va yo'qotish.
- Sky/Indigo — faqat kontent turlari (dars, AI).
- Qolgan hamma narsa **kulrang**. Rangli element kam bo'lsa — u kuchli bo'ladi.

**Noise qatlami** (arzon, ammo juda samarali):

```css
body::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  opacity: .025;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

### 2.3 Space va o'lcham tili

```
Spacing:  4 · 8 · 12 · 16 · 24 · 32 · 48 · 64   (oraliq qiymatlar taqiqlanadi)
Radius:   sm 8 · md 12 · lg 16 · xl 20 · 2xl 28 · full
Icon tile: 40px (kichik) · 48px (asosiy) · 64px (hero)  — uchtadan ortiq emas
Karta padding: 20px (compact) · 24px (asosiy) · 32px (hero)
```

**Qoidalar:**
- Karta ichidagi bo'limlar orasi — 16px; kartalar orasi — 16px; bo'limlar orasi — 32px;
  sahifa bloklari orasi — 48px. Hozir hammasi 20–24px atrofida → ritm yo'q.
- Ikonka plitkasi radiusi = karta radiusi − 8px (optik ichma-ichlik qoidasi).

### 2.4 Ierarxiya — "3 qatlam" qoidasi

Har bir sahifada aniq **3 daraja** bo'lsin:

| Daraja | Nima | Vizual belgisi |
|---|---|---|
| **Primary** | Sahifaning yagona asosiy harakati (hero, "Testni boshlash") | Kattaroq, gradient fon, glow, 32px padding |
| **Secondary** | Yordamchi ma'lumot (stat, missiya, ro'yxat) | Oddiy `.surface`, 24px padding |
| **Tertiary** | Meta, yorliq, filtr | Fon yo'q, faqat matn/chegara |

Hozir hamma narsa Secondary. Dashboardda hero'ni Primary'ga ko'tarish kerak: kattaroq
sarlavha (32px), zumrad gradient glow, kattaroq tugma (48px balandlik).

---

## 3. Motion tizimi

### 3.1 Kutubxona tanlovi

| Vazifa | Kutubxona | Nega aynan shu |
|---|---|---|
| **Asosiy animatsiya** | **`motion`** (eski nomi `framer-motion`, v12) | `layout` animatsiyasi, `AnimatePresence`, spring fizikasi, `useReducedMotion` — boshqa hech biri bu darajada emas. ~34kb gz, tree-shakeable |
| Ro'yxat o'zgarishi (arzon) | `@formkit/auto-animate` | 2kb, bitta hook: ro'yxatga element qo'shilsa/o'chsa avtomatik animatsiya |
| Raqamlar | `@number-flow/react` | XP, tanga, ball raqamlari "aylanib" o'zgaradi — gamifikatsiya uchun juda kuchli |
| Mobil drawer | `vaul` | iOS-uslubidagi tortiladigan panel; shadcn'ning rasmiy Drawer'i shunda qurilgan |
| Command palette | `cmdk` | Hozirgi qo'lda yozilgan `CommandPalette` o'rniga (shadcn `Command`) |
| Konfetti | `canvas-confetti` (bor) | Yetarli |
| Grafiklar | `recharts` (bor) | Yetarli; animatsiya `isAnimationActive` bilan sozlanadi |
| Ikonkalar | `lucide-react` (bor) | Yetarli |
| Scroll reveal | `motion` ning `whileInView` | Alohida kutubxona shart emas |
| **Kerak EMAS** | GSAP, Lenis, Lottie, three.js | Bular landing uchun; ilova ichida ortiqcha vazn va batareya |

O'rnatish:

```bash
npm i motion @number-flow/react @formkit/auto-animate vaul cmdk
```

### 3.2 Motion tokenlari (bitta joyda, hamma joyda bir xil)

```ts
export const dur = { instant: .12, fast: .18, base: .24, slow: .36, page: .5 };
export const ease = {
  out:    [0.16, 1, 0.3, 1],      // asosiy — "expo out", tabiiy sekinlashish
  inOut:  [0.65, 0, 0.35, 1],
  spring: { type: 'spring', stiffness: 320, damping: 30, mass: .8 },
  bouncy: { type: 'spring', stiffness: 400, damping: 18 },  // faqat mukofot lahzalari
};
```

**Qoidalar:**
- 100ms dan qisqa — sezilmaydi; 400ms dan uzun — sekin tuyuladi. Interfeys uchun **180–280ms**.
- Kirish (enter) — tez va `ease-out`; chiqish (exit) — undan **30% qisqa**.
- Bir vaqtda **faqat 1 ta** e'tibor tortuvchi animatsiya.
- `prefers-reduced-motion` — majburiy: `useReducedMotion()` bilan barcha transform'ni o'chirish.

### 3.3 Aniq mikro-interaksiyalar (komponent bo'yicha)

**Tugma**
- hover: `y: -1px`, soya kuchayadi (150ms)
- active: `scale(.97)` (100ms) — bor
- loading: matn o'rniga spinner, kenglik **o'zgarmaydi** (layout sakrashi bo'lmasin)
- asosiy tugmada: hover'da yorug'lik chizig'i chapdan o'ngga o'tadi (`::after` gradient sweep)

**Karta**
- hover: `y: -2px`, chegara `--border-strong`, soya `--shadow-float` (200ms)
- bosilganda: `scale(.99)`
- ro'yxatda paydo bo'lishi: stagger 40ms, `opacity 0→1`, `y 12→0`

**Sahifa o'tishi**
- Eski sahifa: `opacity 1→0`, `y 0→-8`, 160ms
- Yangi sahifa: `opacity 0→1`, `y 12→0`, 240ms, 60ms kechikish
- Next.js'da `template.tsx` + `motion.div` orqali

**Skeleton → kontent**
- Skeleton **o'sha o'lchamda** bo'lsin (hozir shunday), almashish `crossfade` 200ms
- Skeleton "shimmer" gradienti (hozir statik pulse)

**Progress / XP**
- `Progress` qiymati o'zgarganda spring bilan to'lsin (240ms), oxirida qisqa glow
- XP qo'shilganda: raqam `NumberFlow` bilan aylanadi + `+150 XP` yozuvi yuqoriga uchib yo'qoladi

**Test javobi**
- To'g'ri: variant yashil bo'ladi + `scale(1.02)` spring + qisqa ovoz + halqa (ripple)
- Xato: `x: [-4, 4, -3, 3, 0]` 300ms "shake" + qizil, **lekin darhol** to'g'ri javob yashil bilan
  ko'rsatiladi (jazolash emas — o'rgatish)

**Streak / Combo**
- 3× combo'da: badge `bouncy` spring bilan chiqadi, olov ikonkasi pulsatsiya (bor)
- Streak yo'qolish xavfi bo'lsa: kunning oxirida yumshoq eslatma (agressiv emas)

**Modal / Dialog**
- Fon: `opacity 0→1` 200ms + `backdrop-filter: blur(0→8px)`
- Panel: `scale .96→1`, `y 8→0`, spring
- Yopilish: 140ms, faqat opacity — tez

**Ro'yxat qayta tartiblanishi (timeline o'yini)**
- `motion` ning `layout` prop'i — element o'z joyiga **fizik** ko'chadi. Hozir darhol
  "sakraydi". Bu eng sezilarli yaxshilanishlardan biri bo'ladi.

### 3.4 Nishonlash lahzalari (celebration moments)

Bular **kam va kutilmagan** bo'lishi kerak — har safar bo'lsa qiymatini yo'qotadi:

| Voqea | Reaksiya |
|---|---|
| Birinchi test yakunlandi | To'liq ekran konfetti + badge "Birinchi Qadam" karta bo'lib uchib keladi |
| Daraja oshdi | Ekran chekkasidan zumrad to'lqin + XP halqasi 100% ga to'lib "portlaydi" + yangi daraja raqami flip |
| 7/14/30 kunlik streak | Olov animatsiyasi kattalashadi, badge chiqadi |
| Arena g'alabasi | Raqib avatarining "yiqilishi" + ELO raqami o'sishi (NumberFlow) |
| Barcha kunlik missiyalar | Missiya kartalari ketma-ket "belgilanadi" (stagger 80ms), keyin karta yig'iladi |
| Xato ustida ishlash tugadi | "Bu mavzu endi sizniki" — yashil to'lqin, jazoli emas |

---

## 4. "Yolg'iz emasman" — ijtimoiy va emotsional qatlam

Bu sizning asosiy so'rovingiz edi. Texnik yechimlar:

### 4.1 Mavjudlik (presence)
- Hozirgi `online_count` ni **jonli** qiling: "**23 nafar** abituriyent hozir test yechyapti" +
  kichik avatarlar to'plami (max 5 ta + `+18`). Ma'lumot bor (`online_count`), faqat vizual yo'q.
- Test yechayotganda pastda nozik chiziq: "Bu testni bugun 14 kishi yechdi, o'rtacha ball 62%".
  Bu **raqobat emas, hamrohlik** hissi.

### 4.2 Taqqoslash — faqat foydali yo'nalishda
- "Siz bu mavzuda o'rtachadan **12% yuqorisiz**" — o'sish uchun.
- Hech qachon "siz 340-o'rindasiz" deb boshlamang — pastdagi o'quvchini yo'qotadi.
  Liderlar ligasida **o'z guruhingiz** (yaqin 10 kishi) ko'rsatilsin.

### 4.3 Mentor ovozi
- AI Mentor **reaktiv** emas, **proaktiv** bo'lsin: dashboardda kuniga 1 marta shaxsiy jumla —
  "Kecha Amir Temur mavzusida 3 ta xato qildingiz. 5 daqiqalik takrorlash tayyor."
- Bu allaqachon `weak_review` ma'lumotida bor — faqat **ovoz** (til) yetishmayapti.

### 4.4 Progress hikoyasi — "Bilim Ildizi" metaforasini ko'rinadigan qiling
Nomingiz "IlmIldizi" — lekin ildiz hech qayerda ko'rinmaydi. Taklif:

- Profilda **SVG daraxt**: har daraja — yangi shox, har fan — alohida ildiz, streak — barglar rangi.
- Har hafta "o'sish" animatsiyasi (5 soniya) — o'quvchi o'z mehnatini **ko'radi**.
- Bu — eng kuchli retention mexanizmi (Duolingo'dagi "tree" xuddi shu).

### 4.5 Yo'qotishdan qo'rqish — ehtiyotkorlik bilan
- Streak muzlatish (bor) — yaxshi.
- "Streak xavf ostida" eslatmasi **kuniga 1 marta**, kechqurun, yumshoq til bilan.
- Hech qachon qizil, hech qachon "yo'qotasiz!" deb qo'rqitmaslik.

---

## 5. Bosqichma-bosqich amalga oshirish rejasi

### 1-bosqich — Poydevor (2–3 soat, effekt: 60%)
1. Shriftlarni almashtirish (`layout.tsx` + `globals.css`) — `Plus Jakarta Sans` + `Bricolage Grotesque` + `Geist Mono`
2. Tipografik shkalani `@theme` ga kiritish, `text-xs` ni `text-sm` ga ko'tarish (global qidiruv-almashtirish)
3. Yangi rang qatlamlari: `--bg-page` qoraytirish, `--surface-1/2/3`, soyalar, inset highlight
4. `Card` komponentiga `.surface` uslubini berish (bitta fayl — butun sayt o'zgaradi)
5. Noise qatlami

### 2-bosqich — Ierarxiya (2–3 soat)
6. Har sahifada 1 ta Primary blok belgilash (hero kattalashadi, gradient + glow)
7. Space tilini qo'llash: 16/24/32/48 ritmi
8. Radius va ikonka o'lchamlarini 3 taga qisqartirish
9. Rang qoidasi: bir ekranda 1 ta zumrad tugma

### 3-bosqich — Motion (3–4 soat)
10. `motion` o'rnatish, `lib/motion.ts` ga tokenlar
11. `template.tsx` — sahifa o'tishlari
12. Kartalar uchun `MotionCard` (hover, stagger)
13. `NumberFlow` — XP, tanga, ball, ELO
14. Test javobi: shake / ripple / spring
15. `layout` animatsiyasi — timeline o'yini, ro'yxatlar

### 4-bosqich — Emotsiya (3–5 soat)
16. Presence (onlayn avatarlar, "bugun N kishi yechdi")
17. Mentor proaktiv jumlasi (kuniga 1 ta)
18. Nishonlash lahzalari (daraja, streak, birinchi test)
19. Bilim Ildizi daraxti (SVG, profil sahifasi)

---

## 6. Nazorat ro'yxati (har bir sahifa uchun)

- [ ] Ekranga 1 soniya qaraganda **qayerga bosish kerakligi** ravshanmi?
- [ ] Bir ekranda nechta zumrad element bor? (1 tadan ko'p bo'lmasin)
- [ ] Eng mayda matn 12px dan kichikmi? (bo'lmasin)
- [ ] Karta chekkasi ko'rinadimi? Soyasi bormi?
- [ ] Bo'sh (empty) holatda **nima qilish kerakligi** aytilganmi?
- [ ] Yuklanish holati kontent bilan **bir xil o'lchamdami**?
- [ ] Har bir muvaffaqiyatning **ko'rinadigan javobi** bormi?
- [ ] `prefers-reduced-motion` da hammasi ishlaydimi?
- [ ] Mobil 360px kenglikda buzilmaydimi?

---

## 7. Ilhom uchun etalonlar

| Mahsulot | Nimani o'rganish kerak |
|---|---|
| **Linear** | Dark UI da chuqurlik, klaviatura oqimi, motion tokenlari |
| **Duolingo** | Gamifikatsiya, nishonlash, streak psixologiyasi, xatoni jazolamaslik |
| **Arc / Raycast** | Command palette, mikro-motion, "yengil" his |
| **Vercel / Geist** | Tipografika, kulrang shkala, minimal rang |
| **Superhuman** | Tezlik hissi, tugallanish lahzalari |
| **Brilliant.org** | Ta'limda vizual tushuntirish va progress |

---

## 8. Xulosa — eng muhim 5 ta o'zgarish

1. **Shrift**: Inter → Plus Jakarta Sans + Bricolage Grotesque (+ `latin-ext`!)
2. **Asosiy matn o'lchami**: 11–12px → 15px
3. **Chuqurlik**: fon qoraytirish + karta gradienti + soya + inset yorug'lik + noise
4. **Ierarxiya**: har sahifada bitta aniq Primary blok, qolgani kulrang
5. **Motion**: `motion` kutubxonasi + `NumberFlow` + nishonlash lahzalari

Shu 5 tasi bajarilsa, boshqa hech narsa o'zgarmasa ham — interfeys **butunlay boshqacha**
ko'rinadi.

---

## 9. Bajarilgan ishlar (implementatsiya jurnali)

**1-bosqich — Poydevor** ✅
- Shriftlar: Plus Jakarta Sans (UI) + Bricolage Grotesque (sarlavha) + Geist Mono (raqam), `latin-ext` bilan
- Tipografik shkala Tailwind `@theme` da qayta ta'riflandi (asosiy matn 12px → 15px)
- Chuqurlik: fon `#08090c`, sirtlar `#101319/#161a22/#1d222c`, soya tokenlari, karta gradienti + inset yorug'lik, 2.5% noise

**2-bosqich — Ierarxiya** ✅
- Tugma/Input/Select/Tabs balandligi 32px → 40px (`lg` 48px)
- Karta radiusi 20px (ichma-ich 14px), ikonka plitkalari 40/48/64
- PageHero va dashboard hero — Primary daraja (32px padding, ikki qatlamli glow)
- Sahifa ritmi 32px (`space-y-8`)

**3-bosqich — Motion** ✅
- `motion` (+`framer-motion`), `@number-flow/react`
- `lib/motion.ts` tokenlari, `Reveal` (stagger), `StatNumber` (NumberFlow)
- `app/template.tsx` sahifa o'tishi — faqat `opacity` (fixed sidebar buzilmasligi uchun)
- Karta hover lift, progress to'lishi, variant stagger + tanlov spring, xato javobda shake
- `prefers-reduced-motion` global va komponent darajasida

**4-bosqich — Emotsiya** ✅
- Presence: `online_peers` + `solved_today` (dashboard API), `PresenceRow` komponenti
- Mentor ovozi: `lib/mentorVoice.ts` — 7 ta qoida, hammasi real ma'lumotdan
- Nishonlash lahzalari: `Celebration` — daraja oshishi, streak bosqichi (7/14/30/100), birinchi test; har biri bir marta
- Bilim Ildizi daraxti: `KnowledgeTree` — shoxlar = daraja, bo'y = XP, barglar = streak, mevalar = yutuqlar

**5-bosqich — Sayqal** ✅
- Per-test ijtimoiy dalil: "So'nggi 7 kunda N kishi yechdi · o'rtacha X%" (bitta guruhlangan so'rov; `questions.count()` N+1 ham annotate bilan yo'q qilindi)
- Liderlar ligasida "Sizning guruhingiz": `my_rank` + yaqin ±5 kishi, o'z qatori ajratilgan, "N XP — X dan oldinga o'tish uchun"
- Semantik rang tizimi (`--tone-growth/streak/danger/lesson/ai`) va "bir ekranda bitta zumrad tugma" qoidasi (11 ta chip yumshoq holatga o'tkazildi)
- Skeleton shimmer (1.6s yorug'lik to'lqini, faqat `background-position` animatsiyasi)
- Nishonlash: arena g'alabasida konfetti + ELO raqamining aylanib o'zgarishi (±delta bilan), kunlik missiyalar to'liq bajarilganda karta yashil holatga o'tadi va ro'yxat ketma-ket belgilanadi

### Keyingi qadamlar (hali qilinmagan)
- Analitika sahifasining grafiklarini ma'lumotga boy hisob bilan ko'rish (demo hisobda test tarixi yo'q)
