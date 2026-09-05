'use client';

/* O'qish matni: bo'shliqlar matn ichida, belgilash (highlight) sichqoncha bilan.

   Matn `parsePassage` orqali bo'laklarga ajratiladi (src/lib/passage.ts), bu yerda esa
   o'sha bo'laklar React elementlariga aylanadi. HTML hech qachon to'g'ridan-to'g'ri
   o'rnatilmaydi — teglar oq ro'yxat bo'yicha qayta quriladi. */

import { createElement, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Highlighter, StickyNote, Trash2 } from 'lucide-react';
import type { Annotation } from '@/lib/cefr-types';
import {
  addAnnotation, parsePassage, removeAnnotationAt, selectionToRange, sliceByAnnotations,
  type PassageNode,
} from '@/lib/passage';
import { cn } from '@/lib/utils';

const COLOR_CLASS: Record<Annotation['color'], string> = {
  yellow: 'bg-amber-300/35 decoration-amber-400',
  green: 'bg-emerald-300/30 decoration-emerald-400',
  pink: 'bg-pink-300/30 decoration-pink-400',
};

const COLOR_SWATCH: Record<Annotation['color'], string> = {
  yellow: 'bg-amber-300',
  green: 'bg-emerald-300',
  pink: 'bg-pink-300',
};

type Props = {
  html: string;
  annotations: Annotation[];
  onAnnotationsChange: (next: Annotation[]) => void;
  renderGap: (number: number) => React.ReactNode;
};

export default function PassageView({ html, annotations, onAnnotationsChange, renderGap }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<
    { x: number; y: number; below: boolean; start: number; end: number } | null
  >(null);

  const { nodes } = useMemo(() => parsePassage(html), [html]);

  /* Tanlov tugagach kichik menyu chiqadi: rang tanlash yoki qayd qo'shish. Menyu
     tanlovning yuqorisida, matn maydoniga nisbatan joylashadi. */
  const handleSelection = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const range = selectionToRange(container);
    if (!range) { setMenu(null); return; }

    const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
    const box = container.getBoundingClientRect();
    if (!rect) return;

    /* Menyu odatda tanlovning ustida turadi. Tanlov matnning eng yuqori qatorida
       bo'lsa, ustida joy qolmaydi va menyu o'sha qatorni to'sib qo'yardi — bunday
       holatda u pastga o'tadi. */
    const top = rect.top - box.top;
    const below = top < 48;
    setMenu({
      x: rect.left - box.left + rect.width / 2,
      y: below ? rect.bottom - box.top + 8 : top - 46,
      below,
      ...range,
    });
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function applyColor(color: Annotation['color']) {
    if (!menu) return;
    onAnnotationsChange(addAnnotation(annotations, { start: menu.start, end: menu.end, color }));
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  }

  function applyNote() {
    if (!menu) return;
    const note = window.prompt('Qayd (o\'zingiz uchun eslatma):')?.trim();
    if (note === undefined) { setMenu(null); return; }
    onAnnotationsChange(addAnnotation(annotations, {
      start: menu.start, end: menu.end, color: 'green', note: note || undefined,
    }));
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  }

  function clearAt(position: number) {
    onAnnotationsChange(removeAnnotationAt(annotations, position));
  }

  const render = (list: PassageNode[], keyPrefix = ''): React.ReactNode =>
    list.map((node, index) => {
      const key = `${keyPrefix}${index}`;

      if (node.kind === 'break') return <br key={key} />;

      if (node.kind === 'gap') {
        return <Fragment key={key}>{renderGap(node.number)}</Fragment>;
      }

      if (node.kind === 'element') {
        // Teg nomi oq ro'yxatdan keladi (src/lib/passage.ts), shuning uchun uni shu
        // yerda element sifatida yaratish xavfsiz.
        return createElement(node.tag, { key }, render(node.children, `${key}-`));
      }

      return (
        <Fragment key={key}>
          {sliceByAnnotations(node.text, node.offset, annotations).map((slice, sliceIndex) => (
            <span
              key={`${key}-${sliceIndex}`}
              data-off={slice.offset}
              title={slice.annotation?.note}
              onDoubleClick={slice.annotation ? () => clearAt(slice.offset) : undefined}
              className={cn(
                slice.annotation && 'rounded-[3px] px-[1px]',
                slice.annotation && COLOR_CLASS[slice.annotation.color],
                slice.annotation?.note && 'underline decoration-dotted decoration-2 underline-offset-4',
                slice.annotation && 'cursor-pointer',
              )}
            >
              {slice.text}
            </span>
          ))}
        </Fragment>
      );
    });

  return (
    <div ref={wrapperRef} className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        className="cefr-passage space-y-4 text-[length:var(--reading-size,1.0625rem)] leading-[1.85] text-foreground/90 selection:bg-amber-300/40"
      >
        {render(nodes)}
      </div>

      {menu && (
        <div
          style={{ left: menu.x, top: Math.max(menu.y, 0) }}
          className="absolute z-30 -translate-x-1/2 rounded-full border border-border/70 bg-background/95 px-1.5 py-1 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-1">
            {(['yellow', 'green', 'pink'] as const).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => applyColor(color)}
                aria-label={`${color} rangda belgilash`}
                className={cn('h-6 w-6 rounded-full ring-1 ring-black/10 transition hover:scale-110', COLOR_SWATCH[color])}
              />
            ))}
            <span className="mx-0.5 h-5 w-px bg-border" />
            <button
              type="button"
              onClick={applyNote}
              className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <StickyNote className="h-3.5 w-3.5" /> Qayd
            </button>
          </div>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Highlighter className="h-3.5 w-3.5" />
          <span>{annotations.length} ta belgi — o&apos;chirish uchun ustiga ikki marta bosing</span>
          <button
            type="button"
            onClick={() => onAnnotationsChange([])}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Hammasini tozalash
          </button>
        </div>
      )}
    </div>
  );
}
