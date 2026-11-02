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
      toggleScript: () => set((state) => ({ script: state.script === 'latin' ? 'cyrillic' : 'latin' })),
    }),
    {
      name: 'ilm_uzbek_script',
    }
  )
);

// Lotin -> Kirill juftliklari (Tartib muhim: 2 harflilar avval tekshiriladi)
const LAT_TO_CYR_COMPOUNDS: [string, string][] = [
  ['Sh', 'Ш'], ['SH', 'Ш'], ['sh', 'ш'],
  ['Ch', 'Ч'], ['CH', 'Ч'], ['ch', 'ч'],
  ['Yo', 'Ё'], ['YO', 'Ё'], ['yo', 'ё'],
  ['Yu', 'Ю'], ['YU', 'Ю'], ['yu', 'ю'],
  ['Ya', 'Я'], ['YA', 'Я'], ['ya', 'я'],
  ["O'", 'Ў'], ["O‘", 'Ў'], ["O`", 'Ў'], ["O’", 'Ў'],
  ["o'", 'ў'], ["o‘", 'ў'], ["o`", 'ў'], ["o’", 'ў'],
  ["G'", 'Ғ'], ["G‘", 'Ғ'], ["G`", 'Ғ'], ["G’", 'Ғ'],
  ["g'", 'ғ'], ["g‘", 'ғ'], ["g`", 'ғ'], ["g’", 'ғ'],
];

const LAT_TO_CYR_SINGLES: Record<string, string> = {
  'A': 'А', 'a': 'а',
  'B': 'Б', 'b': 'б',
  'D': 'Д', 'd': 'д',
  'E': 'Э', 'e': 'э',
  'F': 'Ф', 'f': 'ф',
  'G': 'Г', 'g': 'г',
  'H': 'Ҳ', 'h': 'ҳ',
  'I': 'И', 'i': 'и',
  'J': 'Ж', 'j': 'ж',
  'K': 'К', 'k': 'к',
  'L': 'Л', 'l': 'л',
  'M': 'М', 'm': 'м',
  'N': 'Н', 'n': 'н',
  'O': 'О', 'o': 'о',
  'P': 'П', 'p': 'п',
  'Q': 'Қ', 'q': 'қ',
  'R': 'Р', 'r': 'р',
  'S': 'С', 's': 'с',
  'T': 'Т', 't': 'т',
  'U': 'У', 'u': 'у',
  'V': 'В', 'v': 'в',
  'X': 'Х', 'x': 'х',
  'Y': 'Й', 'y': 'й',
  'Z': 'З', 'z': 'з',
};

export function latinToCyrillic(text: string): string {
  if (!text) return '';
  let result = text;

  // 1. Murakkab harflar
  for (const [lat, cyr] of LAT_TO_CYR_COMPOUNDS) {
    result = result.split(lat).join(cyr);
  }

  // 2. Birikmali 'Ye' va so'z boshidagi 'E'
  result = result.replace(/\bYe\b/g, 'Е').replace(/\bye\b/g, 'е');

  // 3. Yagona harflar
  let finalStr = '';
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    finalStr += LAT_TO_CYR_SINGLES[ch] || ch;
  }

  return finalStr;
}

export function cyrillicToLatin(text: string): string {
  if (!text) return '';
  // Asosiy Kirill -> Lotin qoidalari
  const map: Record<string, string> = {
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g', 'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e',
    'Ё': 'Yo', 'ё': 'yo', 'Ж': 'J', 'ж': 'j', 'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l', 'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o', 'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f', 'Х': 'X', 'х': 'x', 'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch', 'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Sh', 'щ': 'sh',
    'Ъ': "'", 'ъ': "'", 'Ь': '', 'ь': '', 'Э': 'E', 'э': 'e',
    'Ю': 'Yu', 'ю': 'yu', 'Я': 'Ya', 'я': 'ya',
    'Ў': "O'", 'ў': "o'", 'Қ': 'Q', 'қ': 'q', 'Ғ': "G'", 'ғ': "g'", 'Ҳ': 'H', 'ҳ': 'h',
  };

  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    res += map[ch] || ch;
  }
  return res;
}

/** Global transliteratsiya yordamchisi: Joriy sozlamaga qarab matnni o'giradi */
export function useTransliterate() {
  const script = useLanguageStore((s) => s.script);

  const t = (text: string): string => {
    if (!text) return '';
    if (script === 'cyrillic') {
      return latinToCyrillic(text);
    }
    return text;
  };

  return { t, script };
}
