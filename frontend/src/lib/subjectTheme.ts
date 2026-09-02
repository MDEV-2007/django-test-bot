/* Test kartalarining fanga xos ko'rinishi.
 *
 * MUAMMO: katalogdagi hamma karta bir xil edi — tarix ham, matematika ham, ingliz tili
 * ham bitta kulrang to'rtburchak. Bitta fanda 14 ta test bo'lsa, ular bir-biridan
 * faqat sarlavha bilan farq qilardi, ya'ni ro'yxat ko'zga bir xil "devor" bo'lib
 * ko'rinardi va kerakli testni topish qiyin edi.
 *
 * YECHIM ikki qatlamli:
 *
 *   1. FAN — rang va motiv. Rang bazadagi `Subject.color` dan keladi (admin panelda
 *      o'zgartirsa, karta ham o'zgaradi), motiv esa shu fayldagi SVG naqsh: tarix uchun
 *      ustun va gumbaz, biologiya uchun barg, matematika uchun formula panjarasi va h.k.
 *
 *   2. KARTA — bir fan ichidagi variatsiya. Har bir test `id` si asosida oltita
 *      ko'rinishdan bittasini oladi (gradient burchagi, motiv o'lchami/burilishi, rang
 *      quyuqligi). `id` ishlatilgani muhim: ko'rinish har renderda o'zgarmaydi, ya'ni
 *      karta har safar bir xil bo'lib qoladi — tasodifiy tanlov bo'lsa, sahifa har
 *      yangilanganda kartalar "sakrab" turardi.
 *
 * Naqshlar `currentColor` bilan chiziladi va juda past shaffoflikda qo'yiladi: ular
 * rasm emas, TEKSTURA — sarlavhani o'qishga xalaqit bermasligi kerak.
 */

export type SubjectMeta = { slug: string; color?: string; icon_name?: string };

/* Fan motivlari. Kalit — `Subject.slug`. Yangi fan qo'shilsa, bu yerga qo'shmaguncha
   umumiy (`default`) naqsh ishlatiladi, ya'ni hech narsa buzilmaydi. */
const MOTIFS: Record<string, string> = {
  // Tarix — ustunlar va gumbaz: me'morchilik siluetlari.
  tarix: `
    <path d="M8 52V26M18 52V26M28 52V26M38 52V26" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M2 26h42M4 52h38" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M10 26a13 13 0 0 1 26 0" stroke="currentColor" stroke-width="2" fill="none"/>
    <circle cx="23" cy="8" r="3" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Ona tili — qo'shtirnoq va yozuv satrlari.
  'ona-tili': `
    <path d="M6 20c0-6 4-10 9-10v5c-3 0-4 2-4 5h4v10H6zM22 20c0-6 4-10 9-10v5c-3 0-4 2-4 5h4v10H22z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M6 40h34M6 46h26M6 52h30" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Matematika — formula panjarasi va burchak.
  matematika: `
    <path d="M6 14h16M14 6v16" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M28 12h14M28 18h14" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M6 34l10 18M16 34L6 52" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M28 44h14M35 37v14" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Biologiya — barg va tomirlar.
  biologiya: `
    <path d="M24 54C10 44 8 26 20 12c10-12 24-8 24-8s4 14-6 26C28 42 24 54 24 54z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M24 54c0-14 6-26 20-30" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M30 22l-8 4M34 32l-10 4" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Ingliz tili — globus va suhbat pufagi.
  'ingliz-tili': `
    <circle cx="20" cy="22" r="15" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M5 22h30M20 7c8 8 8 22 0 30M20 7c-8 8-8 22 0 30" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M28 40h18v12H36l-6 6v-6h-2z" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Nomi noma'lum fan uchun — neytral kitob.
  default: `
    <path d="M8 12h14a6 6 0 0 1 6 6v30a6 6 0 0 0-6-6H8z" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M48 12H34a6 6 0 0 0-6 6v30a6 6 0 0 1 6-6h14z" stroke="currentColor" stroke-width="2" fill="none"/>`,
};

// Fan bazada bo'lmasa yoki rangi belgilanmagan bo'lsa ishlatiladigan zaxira rang.
const FALLBACK_COLOR = '#6b7280';

/* Bir fan ichidagi oltita ko'rinish. `angle` — gradient yo'nalishi, `scale`/`rotate` —
   motivning o'lchami va burilishi, `tint` — rangning quyuqligi (0-1 oralig'ida
   ko'paytuvchi). Oltita variant 14 ta testni bir-biridan ajratishga yetadi va shu
   bilan birga ro'yxat "rang-barang" bo'lib ketmaydi. */
const VARIANTS = [
  { angle: 135, scale: 1.0, rotate: 0, tint: 1.0, x: 68, y: -12 },
  { angle: 200, scale: 1.25, rotate: -12, tint: 0.75, x: 74, y: 4 },
  { angle: 90, scale: 0.9, rotate: 8, tint: 1.15, x: 62, y: -20 },
  { angle: 160, scale: 1.35, rotate: 16, tint: 0.85, x: 78, y: -6 },
  { angle: 235, scale: 1.05, rotate: -6, tint: 1.25, x: 66, y: 8 },
  { angle: 115, scale: 1.15, rotate: 22, tint: 0.9, x: 72, y: -16 },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return [107, 114, 128];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Fan rangini shaffoflik bilan `rgba()` ga aylantiradi. */
function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Motivni `background-image` uchun data-URI qilib beradi. */
function motifDataUri(slug: string, color: string, alpha: number, rotate: number) {
  const motif = MOTIFS[slug] ?? MOTIFS.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 60" width="56" height="60">
    <g color="${color}" opacity="${alpha}" transform="rotate(${rotate} 28 30)"
       stroke-linecap="round" stroke-linejoin="round">${motif}</g>
  </svg>`;
  // `encodeURIComponent` — SVG ichidagi `#` va `<` belgilari CSS'da url() ni buzmasin.
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}")`;
}

export type CardArtwork = {
  /** Kartaning `style` atributiga beriladigan qiymatlar. */
  style: React.CSSProperties;
  /** Chekka (border) rangi — fan rangining susaytirilgan varianti. */
  borderColor: string;
};

/**
 * Bitta test kartasining ko'rinishini hisoblaydi.
 *
 * @param subject  Fan ma'lumoti (slug + bazadagi rang). `null` bo'lsa neytral ko'rinish.
 * @param seed     Barqaror son — test `id` si. Shu tufayli karta har renderda bir xil.
 */
export function cardArtwork(subject: SubjectMeta | null | undefined, seed: number): CardArtwork {
  const slug = subject?.slug ?? 'default';
  const color = subject?.color || FALLBACK_COLOR;
  // Manfiy id bo'lishi kutilmaydi, lekin `%` manfiy son uchun manfiy qaytaradi —
  // Math.abs bo'lmasa massivdan tashqariga chiqib, undefined bo'lardi.
  const variant = VARIANTS[Math.abs(Math.trunc(seed)) % VARIANTS.length];

  /* Shaffoflik ATAYLAB past. Birinchi urinishda motiv 0.14 shaffoflikda va 150px
     o'lchamda edi — telefonda karta eni ~340px bo'lgani uchun naqsh sarlavha va
     tavsif ustidan o'tib, matnni o'qishni qiyinlashtirardi. Naqsh — bezak emas,
     fon teksturasi: sezilishi kerak, lekin matn bilan raqobatlashmasligi shart. */
  const glow = rgba(color, 0.14 * variant.tint);
  const glowSoft = rgba(color, 0.04 * variant.tint);
  const motif = motifDataUri(slug, color, 0.075 * variant.tint, variant.rotate);
  const size = Math.round(112 * variant.scale);

  return {
    borderColor: rgba(color, 0.28),
    style: {
      // Ikki qatlam: yuqorida motiv, ostida fan rangidagi yumshoq gradient.
      backgroundImage: `${motif}, linear-gradient(${variant.angle}deg, ${glow} 0%, ${glowSoft} 45%, transparent 78%)`,
      backgroundRepeat: 'no-repeat, no-repeat',
      backgroundPosition: `${variant.x}% ${variant.y}%, center`,
      backgroundSize: `${size}px auto, cover`,
      borderColor: rgba(color, 0.28),
    },
  };
}

/** Fanlar ro'yxatidan `slug -> fan` jadvalini quradi (kartalar shu orqali rang oladi). */
export function subjectIndex(subjects: SubjectMeta[] | undefined) {
  const index: Record<string, SubjectMeta> = {};
  for (const subject of subjects ?? []) index[subject.slug] = subject;
  return index;
}
