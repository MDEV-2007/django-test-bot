'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UzbekScript = 'latin' | 'cyrillic';

interface LanguageState {
  script: UzbekScript;
  setScript: (script: UzbekScript) => void;
  toggleScript: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      script: 'latin',
      setScript: (script: UzbekScript) => set({ script }),
      toggleScript: () =>
        set((state) => ({ script: state.script === 'latin' ? 'cyrillic' : 'latin' })),
    }),
    {
      name: 'ilm_uzbek_script',
    }
  )
);

// Barcha tutuq belgisi variantlari (apostroflar)
const APOSTROPHES = ["'", '’', '‘', '`', 'ʻ', 'ʼ', 'ʹ', '′'];

// Birikmali (2 harfli) tovushlar
const COMPOUNDS: [string, string][] = [
  ['Sh', 'Ш'], ['SH', 'Ш'], ['sh', 'ш'],
  ['Ch', 'Ч'], ['CH', 'Ч'], ['ch', 'ч'],
  ['Yo', 'Ё'], ['YO', 'Ё'], ['yo', 'ё'],
  ['Yu', 'Ю'], ['YU', 'Ю'], ['yu', 'ю'],
  ['Ya', 'Я'], ['YA', 'Я'], ['ya', 'я'],
  ['Ye', 'Е'], ['YE', 'Е'], ['ye', 'е'],
];

const SINGLES: Record<string, string> = {
  A: 'А', a: 'а',
  B: 'Б', b: 'б',
  D: 'Д', d: 'д',
  F: 'Ф', f: 'ф',
  G: 'Г', g: 'г',
  H: 'Ҳ', h: 'ҳ',
  I: 'И', i: 'и',
  J: 'Ж', j: 'ж',
  K: 'К', k: 'к',
  L: 'Л', l: 'л',
  M: 'М', m: 'м',
  N: 'Н', n: 'н',
  O: 'О', o: 'о',
  P: 'П', p: 'п',
  Q: 'Қ', q: 'қ',
  R: 'Р', r: 'р',
  S: 'С', s: 'с',
  T: 'Т', t: 'т',
  U: 'У', u: 'у',
  V: 'В', v: 'в',
  X: 'Х', x: 'х',
  Y: 'Й', y: 'й',
  Z: 'З', z: 'з',
};

const VOWELS = new Set(['a', 'o', 'u', 'i', 'e', 'A', 'O', 'U', 'I', 'E', 'Ў', 'ў', 'Э', 'э', 'Е', 'е', 'И', 'и', 'О', 'о', 'У', 'у', 'Я', 'я', 'Ю', 'ю', 'Ё', 'ё']);

/**
 * Lotin alifbosidagi matnni to'liq qoidalar asosida Kirill alifbosiga o'giradi.
 */
export function latinToCyrillic(text: string): string {
  if (!text) return '';
  let result = text;

  // 1. O' va G' harflarini tutuq belgilarining barcha variantlari bilan almashtirish
  for (const ap of APOSTROPHES) {
    result = result.split('O' + ap).join('Ў');
    result = result.split('o' + ap).join('ў');
    result = result.split('G' + ap).join('Ғ');
    result = result.split('g' + ap).join('ғ');
  }

  // 2. Ikki harfli birikmalar (Sh, Ch, Yo, Yu, Ya, Ye)
  for (const [lat, cyr] of COMPOUNDS) {
    result = result.split(lat).join(cyr);
  }

  // 3. Kontekstual E / e (so'z boshida yoki unlidan keyin Э/э, undoshdan keyin Е/е)
  const chars = Array.from(result);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === 'E' || ch === 'e') {
      const prev = i > 0 ? chars[i - 1] : ' ';
      const isWordStart = !/[a-zA-Zа-яА-ЯёЁўЎғҒқҚҳҲ]/.test(prev);
      const isAfterVowel = VOWELS.has(prev);
      if (isWordStart || isAfterVowel) {
        chars[i] = ch === 'E' ? 'Э' : 'э';
      } else {
        chars[i] = ch === 'E' ? 'Е' : 'е';
      }
    }
  }

  // 4. Yagona harflar va qolgan tutuq belgilarini ъ ga o'tkazish
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (SINGLES[c]) {
      chars[i] = SINGLES[c];
    } else if (APOSTROPHES.includes(c)) {
      chars[i] = 'ъ';
    }
  }

  return chars.join('');
}

/**
 * Kirill alifbosidagi matnni Lotin alifbosiga o'giradi.
 */
export function cyrillicToLatin(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v',
    Г: 'G', г: 'g', Д: 'D', д: 'd', Е: 'E', е: 'e',
    Ё: 'Yo', ё: 'yo', Ж: 'J', ж: 'j', З: 'Z', з: 'z',
    И: 'I', и: 'i', Й: 'Y', й: 'y', К: 'K', к: 'k',
    Л: 'L', л: 'l', М: 'M', м: 'm', Н: 'N', н: 'n',
    О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r',
    С: 'S', с: 's', Т: 'T', т: 't', У: 'U', у: 'u',
    Ф: 'F', ф: 'f', Х: 'X', х: 'x', Ц: 'Ts', ц: 'ts',
    Ч: 'Ch', ч: 'ch', Ш: 'Sh', ш: 'sh', Щ: 'Sh', щ: 'sh',
    Ъ: "'", ъ: "'", Ь: '', ь: '', Э: 'E', э: 'e',
    Ю: 'Yu', ю: 'yu', Я: 'Ya', ya: 'ya',
    Ў: "O'", ў: "o'", Қ: 'Q', қ: 'q', Ғ: "G'", ғ: "g'", Ҳ: 'H', ҳ: 'h',
  };

  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    res += map[ch] || ch;
  }
  return res;
}

/**
 * Global transliteratsiya yordamchi hook'i
 */
export function useTransliterate() {
  const script = useLanguageStore((s) => s.script);
  const toggleScript = useLanguageStore((s) => s.toggleScript);
  const setScript = useLanguageStore((s) => s.setScript);

  const t = (text: string | null | undefined): string => {
    if (!text) return '';
    if (script === 'cyrillic') {
      return latinToCyrillic(text);
    }
    return text;
  };

  return { t, script, toggleScript, setScript };
}

/**
 * React komponentlari tashqarisida to'g'ridan-to'g'ri o'girish uchun yordamchi
 */
export function transliterate(text: string): string {
  if (!text) return '';
  const script = useLanguageStore.getState().script;
  if (script === 'cyrillic') {
    return latinToCyrillic(text);
  }
  return text;
}
