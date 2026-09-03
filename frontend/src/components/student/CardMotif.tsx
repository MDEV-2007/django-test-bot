/* Bo'lim kartalari uchun fon naqshi.
 *
 * MUAMMO: bosh sahifadagi kartalar ("BBA & Sertifikat Testlari", "1v1 Battle Arena",
 * "Darslar", "AI Mentor", mini o'yinlar) bir xil quruq to'rtburchak edi — ularni
 * faqat kichkina ikonka va matn ajratib turardi.
 *
 * NEGA data-URI RASM EMAS, MASK: `subjectTheme.ts` dagi fan naqshlari SVG'ni
 * `background-image` qilib qo'yadi va rangni SVG ichiga yozadi. U yerda bu ishlaydi,
 * chunki fan rangi bazadan keladi va o'zgarmaydi. Bu yerda esa rang mavzuga bog'liq
 * (`--tone-*` tokenlari kunduzgi/tungi rejimda har xil, ustiga do'kondan sotib
 * olingan urg'u rangi ham ta'sir qiladi) — data-URI ichidagi rang esa CSS
 * o'zgaruvchilarini KO'RMAYDI, ya'ni kunduzgi mavzuda naqsh noto'g'ri rangda qolardi.
 *
 * Mask bilan SVG faqat SHAKL beradi, rangni esa `currentColor` — ya'ni chaqiruvchi
 * bergan matn rangi klassi — belgilaydi. Shu tufayli naqsh mavzu bilan birga
 * o'zgaradi va hech qanday rang takrorlanmaydi.
 *
 * DIQQAT: bu izohda Tailwind klassini to'liq yozib bo'lmaydi. Tailwind manba
 * fayllarini matn sifatida skanerlaydi va izoh ichidagi klassga o'xshash satrni ham
 * haqiqiy klass deb qabul qiladi — bir marta shu sababli yaroqsiz CSS yaratilib,
 * butun qurilish yiqilgan.
 *
 * Shaffoflik ataylab juda past: bu bezak emas, TEKSTURA — sarlavhani o'qishga
 * xalaqit bermasligi shart (aynan shu xato `subjectTheme.ts` da bir marta qilingan
 * va u yerda ham 0.075 gacha tushirilgan).
 */

export type MotifKey =
  | 'tests' | 'arena' | 'lessons' | 'mentor'
  | 'timeline' | 'map' | 'character'
  | 'bot' | 'quick' | 'trophy' | 'shop' | 'chart'
  // Do'kon kategoriyalari — kalitlar `ShopItem.category` qiymatlari bilan bir xil,
  // shuning uchun ular to'g'ridan-to'g'ri xaritalanadi.
  | 'avatar' | 'frame' | 'theme' | 'title' | 'badge' | 'consumable';

/* Shakllar 64x64 maydonda, oq chiziq bilan chiziladi — mask faqat alfa kanalini
   o'qiydi, shuning uchun rang bu yerda ahamiyatsiz, muhimi chiziq "bor" bo'lishi. */
const SHAPES: Record<MotifKey, string> = {
  // Test — hujjat va belgilangan katakcha.
  tests: `
    <path d="M14 6h24l12 12v40H14z"/>
    <path d="M38 6v12h12"/>
    <path d="M22 34l6 6 12-12"/>`,
  // Arena — kesishgan qilichlar.
  arena: `
    <path d="M10 10l30 34M54 10L24 44"/>
    <path d="M40 44l8 8M24 44l-8 8"/>
    <path d="M44 48l6 6M14 48l-6 6"/>`,
  // Darslar — ochiq kitob va tovush to'lqinlari.
  lessons: `
    <path d="M8 14h18a6 6 0 0 1 6 6v32a6 6 0 0 0-6-6H8z"/>
    <path d="M56 14H38a6 6 0 0 0-6 6v32a6 6 0 0 1 6-6h18z"/>
    <path d="M44 26v8M50 22v16"/>`,
  // AI Mentor — suhbat pufagi va tugunlar (neyron tarmoq ishorasi).
  mentor: `
    <path d="M10 14h44v30H30L18 56V44H10z"/>
    <circle cx="24" cy="29" r="3"/>
    <circle cx="38" cy="22" r="3"/>
    <circle cx="42" cy="36" r="3"/>
    <path d="M27 27l8-4M27 31l12 4"/>`,
  // Xronologiya — vaqt o'qi va belgilar.
  timeline: `
    <path d="M6 32h52"/>
    <circle cx="16" cy="32" r="5"/>
    <circle cx="32" cy="32" r="5"/>
    <circle cx="48" cy="32" r="5"/>
    <path d="M16 27V14M32 37v13M48 27V14"/>`,
  // Xarita — joylashuv belgisi va relyef chiziqlari.
  map: `
    <path d="M32 8a14 14 0 0 1 14 14c0 11-14 26-14 26S18 33 18 22A14 14 0 0 1 32 8z"/>
    <circle cx="32" cy="22" r="5"/>
    <path d="M8 52c8-4 14 2 22-2M34 54c8-4 14 2 22-2"/>`,
  // Shaxs — siluet va savol belgisi.
  character: `
    <circle cx="26" cy="20" r="10"/>
    <path d="M8 56c0-10 8-16 18-16s18 6 18 16"/>
    <path d="M46 14a6 6 0 1 1 6 6c-2 1-3 3-3 5"/>
    <circle cx="49" cy="32" r="1.5"/>`,
  // AI raqib — robot boshi (mentordan farqli: bu suhbat emas, o'yin sherigi).
  bot: `
    <rect x="14" y="20" width="36" height="28" rx="8"/>
    <circle cx="25" cy="33" r="3"/>
    <circle cx="39" cy="33" r="3"/>
    <path d="M32 20v-8M28 8h8"/>
    <path d="M14 32H8M50 32h6"/>`,
  // Tezkor test — chaqmoq: qisqa, bir o'tirishda tugaydigan format.
  quick: `
    <path d="M36 6L16 36h12l-4 22 22-32H34z"/>
    <path d="M8 18h8M6 30h6M10 44h6"/>`,
  // Reyting — kubok.
  trophy: `
    <path d="M20 10h24v14a12 12 0 0 1-24 0z"/>
    <path d="M20 14h-8v4a8 8 0 0 0 8 8M44 14h8v4a8 8 0 0 1-8 8"/>
    <path d="M32 36v10M22 54h20l-2-8H24z"/>`,
  // Do'kon — xarid xaltasi.
  shop: `
    <path d="M12 20h40l-4 34H16z"/>
    <path d="M24 20v-4a8 8 0 0 1 16 0v4"/>
    <path d="M24 30v4M40 30v4"/>`,
  // Tahlil — o'sish ustunlari va chiziq.
  chart: `
    <path d="M8 56V32M22 56V20M36 56V38M50 56V12"/>
    <path d="M6 8l14 14 12-10 16 12"/>`,

  // ── Do'kon kategoriyalari ────────────────────────────────────────────────
  // Avatar — bosh va yelka silueti.
  avatar: `
    <circle cx="32" cy="22" r="11"/>
    <path d="M12 56c0-11 9-18 20-18s20 7 20 18"/>`,
  // Ramka — avatar atrofidagi halqa va burchak belgilari.
  frame: `
    <circle cx="32" cy="32" r="20"/>
    <path d="M8 18V8h10M46 8h10v10M56 46v10H46M18 56H8V46"/>`,
  // Mavzu — ranglar palitrasi.
  theme: `
    <path d="M32 8a24 24 0 1 0 0 48c4 0 6-3 6-6 0-4-4-5-4-9s3-6 7-6h5a10 10 0 0 0 10-10C56 15 45 8 32 8z"/>
    <circle cx="21" cy="24" r="3"/>
    <circle cx="32" cy="19" r="3"/>
    <circle cx="21" cy="38" r="3"/>`,
  // Unvon — lenta bilan bezatilgan yozuv.
  title: `
    <path d="M10 14h44v24H10z"/>
    <path d="M18 24h28M18 30h18"/>
    <path d="M22 38v16l10-6 10 6V38"/>`,
  // Nishon — yulduz va tasma.
  badge: `
    <path d="M32 8l7 14 15 2-11 11 3 15-14-7-14 7 3-15L10 24l15-2z"/>
    <path d="M22 44v12l10-5 10 5V44"/>`,
  // Sarflanadigan — muzlatish (streak himoyasi) belgisi.
  consumable: `
    <path d="M32 6v52M12 18l40 28M52 18L12 46"/>
    <path d="M32 16l-6 6M32 16l6 6M32 48l-6-6M32 48l6-6"/>`,
};

function maskUri(key: MotifKey) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"
       stroke-linejoin="round">${SHAPES[key]}</g>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}")`;
}

/**
 * Karta ichiga qo'yiladigan fon naqshi.
 *
 * Karta `relative` va `overflow-hidden` bo'lishi kerak — naqsh chetdan chiqib
 * ketmasligi uchun. Rang kartadagi mavjud matn rangidan (`currentColor`) olinadi.
 */
export default function CardMotif({ shape, className = '' }: { shape: MotifKey; className?: string }) {
  const mask = maskUri(shape);
  return (
    <span
      aria-hidden
      /* Rang klassi AYNAN shu elementga beriladi, kartaga emas: kartaga berilsa
         sarlavha va tavsif matni ham o'sha rangni meros qilib olardi. */
      className={`pointer-events-none absolute -right-3 -top-4 size-32 opacity-[0.09] transition-opacity duration-300 group-hover:opacity-[0.16] ${className}`}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}
