/* O'qish matnini render qilish uchun yordamchi mantiq.

   MUAMMO: matn HTML (abzatslar, qalin so'zlar), lekin uning ustida ikkita narsa qilish
   kerak — {{9}} ko'rinishidagi bo'shliqlar o'rniga kiritish maydonini qo'yish va
   o'quvchi bo'yagan joylarni sariq qilib ko'rsatish. Ikkalasi ham HTML tegning o'rtasiga
   tushishi mumkin, shuning uchun matn oldindan MAYDA BO'LAKLARGA ajratiladi va har bir
   bo'lak o'zining boshlanish o'rnini (`offset`) biladi.

   `offset` — partning SOF matnidagi belgi o'rni: teglar ham, {{9}} belgilari ham
   sanalmaydi. Shu sababli belgi (highlight) matn qayta render qilinganda ham,
   bo'shliqqa so'z yozilganda ham o'z joyida qoladi. */

import type { Annotation } from './cefr-types';

export const GAP_PATTERN = /\{\{(\d+)\}\}/g;

export type PassageNode =
  | { kind: 'text'; text: string; offset: number }
  | { kind: 'gap'; number: number }
  | { kind: 'element'; tag: string; children: PassageNode[] }
  | { kind: 'break' };

/* Xavfsizlik: matn admin/o'qituvchi kiritgan HTML. Bu yerda faqat oddiy matn teglari
   qoldiriladi — skript yoki hodisa atributlari umuman render qilinmaydi, chunki biz
   HTML'ni o'rnatmaymiz, balki daraxtni o'zimiz React elementlariga aylantiramiz. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'span', 'div',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'table', 'tbody', 'tr', 'td', 'th',
]);

/** HTML matnni render qilinadigan daraxtga aylantiradi va sof matn uzunligini qaytaradi. */
export function parsePassage(html: string): { nodes: PassageNode[]; length: number } {
  if (typeof window === 'undefined' || !html) return { nodes: [], length: 0 };

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return { nodes: [], length: 0 };

  let offset = 0;

  const walk = (node: Node): PassageNode[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? '';
      const out: PassageNode[] = [];
      let cursor = 0;

      GAP_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = GAP_PATTERN.exec(raw)) !== null) {
        const before = raw.slice(cursor, match.index);
        if (before) {
          out.push({ kind: 'text', text: before, offset });
          offset += before.length;
        }
        out.push({ kind: 'gap', number: Number(match[1]) });
        cursor = match.index + match[0].length;
      }

      const tail = raw.slice(cursor);
      if (tail) {
        out.push({ kind: 'text', text: tail, offset });
        offset += tail.length;
      }
      return out;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const tag = (node as Element).tagName.toLowerCase();
    if (tag === 'br') return [{ kind: 'break' }];
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(node.childNodes).flatMap(walk);
    }

    return [{ kind: 'element', tag, children: Array.from(node.childNodes).flatMap(walk) }];
  };

  const nodes = Array.from(root.childNodes).flatMap(walk);
  return { nodes, length: offset };
}

/* Bitta matn bo'lagini belgilar bo'yicha kesish. Natija — ketma-ket parchalar, har biri
   o'z rangi bilan (rang bo'lmasa — oddiy matn). */
export type TextSlice = { text: string; offset: number; annotation: Annotation | null };

export function sliceByAnnotations(
  text: string,
  offset: number,
  annotations: Annotation[],
): TextSlice[] {
  const end = offset + text.length;
  const overlapping = annotations
    .filter((a) => a.end > offset && a.start < end)
    .sort((a, b) => a.start - b.start);

  if (overlapping.length === 0) return [{ text, offset, annotation: null }];

  const slices: TextSlice[] = [];
  let cursor = offset;

  for (const annotation of overlapping) {
    const from = Math.max(cursor, annotation.start);
    const to = Math.min(end, annotation.end);
    if (from > cursor) {
      slices.push({ text: text.slice(cursor - offset, from - offset), offset: cursor, annotation: null });
    }
    if (to > from) {
      slices.push({ text: text.slice(from - offset, to - offset), offset: from, annotation });
    }
    cursor = Math.max(cursor, to);
  }

  if (cursor < end) {
    slices.push({ text: text.slice(cursor - offset), offset: cursor, annotation: null });
  }
  return slices;
}

/* Brauzerdagi tanlovni (selection) sof matndagi [start, end) oralig'iga aylantiradi.
   Har bir matn bo'lagi DOM'da `data-off` atributi bilan chiqadi, shuning uchun tanlov
   qayerdan boshlanganini aniqlash uchun shu atributgacha ko'tarilamiz. */
export function selectionToRange(container: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const resolve = (node: Node, offsetInNode: number): number | null => {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    const anchor = element?.closest<HTMLElement>('[data-off]');
    if (!anchor) return null;
    return Number(anchor.dataset.off) + offsetInNode;
  };

  const start = resolve(range.startContainer, range.startOffset);
  const end = resolve(range.endContainer, range.endOffset);
  if (start === null || end === null || end <= start) return null;

  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/** Yangi belgini qo'shadi; ustma-ust tushganlari bittaga birlashtiriladi. */
export function addAnnotation(list: Annotation[], next: Annotation): Annotation[] {
  const merged = { ...next };
  const rest: Annotation[] = [];

  for (const existing of list) {
    const touches = existing.end >= merged.start && existing.start <= merged.end;
    if (touches && existing.color === merged.color) {
      merged.start = Math.min(merged.start, existing.start);
      merged.end = Math.max(merged.end, existing.end);
      if (existing.note && !merged.note) merged.note = existing.note;
    } else if (touches) {
      // Boshqa rangdagi belgi — yangisi ustidan yozadi, qolgan qismi saqlanadi.
      if (existing.start < merged.start) rest.push({ ...existing, end: merged.start });
      if (existing.end > merged.end) rest.push({ ...existing, start: merged.end });
    } else {
      rest.push(existing);
    }
  }

  return [...rest, merged].sort((a, b) => a.start - b.start);
}

/** Berilgan nuqtadagi belgini olib tashlaydi (bo'yalgan joyni bosib o'chirish). */
export function removeAnnotationAt(list: Annotation[], position: number): Annotation[] {
  return list.filter((a) => position < a.start || position >= a.end);
}
