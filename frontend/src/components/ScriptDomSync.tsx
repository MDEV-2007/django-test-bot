'use client';

import { useEffect } from 'react';
import { latinToCyrillic, useLanguageStore } from '@/lib/transliterate';

/**
 * Global Lotin → Kirill o'girish.
 *
 * Ilgari faqat `t()` bilan o'ralgan matnlar alifboni almashtirardi, qolgan joylar
 * lotinchada qolib ketardi. Bu komponent butun sahifadagi matn tugunlarini (va
 * `placeholder` larni) kuzatib, Kirill rejimida avtomatik o'giradi, Lotin rejimiga
 * qaytganda esa asl matnni tiklaydi.
 *
 * O'girilmaydi:
 *  - `data-no-translit` (yoki `translate="no"`) belgilangan element va uning ichi —
 *    masalan, "IlmIldizi" logotip nomi;
 *  - script/style/code/pre/textarea/input, contenteditable;
 *  - @username, havolalar, e-pochtalar, qisqartmalar (XP, ELO, PRO, DTM, CEFR...).
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG', 'MATH']);
const PROTECTED = /(@[\w.]+|https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.]+|\bIlm\s?Ildizi\b|\b[A-Z]{2,6}\b)/g;

function convert(text: string): string {
  if (!/[A-Za-z]/.test(text)) return text;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(PROTECTED)) {
    const i = m.index ?? 0;
    out += latinToCyrillic(text.slice(last, i)) + m[0];
    last = i + m[0].length;
  }
  return out + latinToCyrillic(text.slice(last));
}

function isExcluded(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true;
    if (e.hasAttribute('data-no-translit') || e.getAttribute('translate') === 'no') return true;
    if ((e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

type Rec = { orig: string; out: string };
const textRecs = new WeakMap<Text, Rec>();
const placeholderRecs = new WeakMap<Element, Rec>();
const touchedText = new Set<Text>();
const touchedPh = new Set<Element>();
let applying = false;

function translitText(node: Text) {
  if (isExcluded(node.parentElement)) return;
  const current = node.nodeValue ?? '';
  const rec = textRecs.get(node);
  if (rec && current === rec.out) return; // o'zimiz qo'ygan qiymat
  const out = convert(current);
  if (out === current) {
    textRecs.delete(node);
    return;
  }
  textRecs.set(node, { orig: current, out });
  touchedText.add(node);
  node.nodeValue = out;
}

function translitPlaceholder(el: Element) {
  if (isExcluded(el.parentElement)) return;
  const current = el.getAttribute('placeholder') ?? '';
  const rec = placeholderRecs.get(el);
  if (rec && current === rec.out) return;
  const out = convert(current);
  if (out === current) return;
  placeholderRecs.set(el, { orig: current, out });
  touchedPh.add(el);
  el.setAttribute('placeholder', out);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translitText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (isExcluded(el)) return;
  if (el.hasAttribute('placeholder')) translitPlaceholder(el);
  el.querySelectorAll('[placeholder]').forEach(translitPlaceholder);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) nodes.push(n as Text);
  nodes.forEach(translitText);
}

function restoreAll() {
  touchedText.forEach((node) => {
    const rec = textRecs.get(node);
    // Faqat biz o'zgartirgan holatda qolgan bo'lsa tiklanadi (React yangilagan bo'lsa — tegilmaydi)
    if (rec && node.nodeValue === rec.out) node.nodeValue = rec.orig;
    textRecs.delete(node);
  });
  touchedText.clear();
  touchedPh.forEach((el) => {
    const rec = placeholderRecs.get(el);
    if (rec && el.getAttribute('placeholder') === rec.out) el.setAttribute('placeholder', rec.orig);
    placeholderRecs.delete(el);
  });
  touchedPh.clear();
}

export default function ScriptDomSync() {
  const script = useLanguageStore((s) => s.script);

  useEffect(() => {
    document.documentElement.lang = script === 'cyrillic' ? 'uz-Cyrl' : 'uz';
    if (script !== 'cyrillic') {
      restoreAll();
      return;
    }

    const run = (fn: () => void) => {
      applying = true;
      try { fn(); } finally { applying = false; }
    };

    run(() => walk(document.body));

    const observer = new MutationObserver((mutations) => {
      if (applying) return;
      run(() => {
        for (const m of mutations) {
          if (m.type === 'characterData') translitText(m.target as Text);
          else if (m.type === 'attributes') translitPlaceholder(m.target as Element);
          else m.addedNodes.forEach(walk);
        }
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder'],
    });

    return () => observer.disconnect();
  }, [script]);

  return null;
}
