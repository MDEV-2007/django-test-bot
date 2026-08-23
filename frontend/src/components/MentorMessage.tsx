'use client';

import { Fragment } from 'react';

/**
 * Mentor javobini o'qishga qulay ko'rinishda chizadi.
 *
 * Model javobni yengil markdown bilan qaytaradi: qalin ajratmalar, `-` yoki `1.` bilan
 * boshlangan ro'yxatlar, bo'sh qator bilan ajratilgan xatboshilar. Ilgari bularning
 * hammasi bitta <p> ichida xom holda chiqar edi — `**Amir Temur**` shundoq yulduzchalari
 * bilan ko'rinardi.
 *
 * Ataylab to'liq markdown ishlovchisi emas: chatga faqat shu uch shakl keladi, kutubxona
 * qo'shish esa bundle'ni oshiradi va HTML kiritilishiga yo'l ochadi. Bu yerda hech qachon
 * HTML yaratilmaydi — hamma narsa React tugunlari, ya'ni model matni bilan sahifaga
 * skript kirita olmaydi.
 */

const BOLD = /\*\*(.+?)\*\*/g;

function withBold(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(<strong key={`${keyPrefix}-b${at}`} className="font-semibold">{match[1]}</strong>);
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      // Bo'sh qator — joriy blokni yopadi.
      if (blocks.length && blocks[blocks.length - 1].kind === 'p') blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1]);
      else blocks.push({ kind: 'ul', items: [bullet[1]] });
    } else if (numbered) {
      if (last?.kind === 'ol') last.items.push(numbered[1]);
      else blocks.push({ kind: 'ol', items: [numbered[1]] });
    } else if (last?.kind === 'p') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'p', lines: [line] });
    }
  }
  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length : b.items.length));
}

export function MentorMessage({ text }: { text: string }) {
  const blocks = toBlocks(text);
  if (!blocks.length) return null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="ml-1 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span>{withBold(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={i} className="ml-1 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-px shrink-0 font-mono text-xs text-indigo-400">{j + 1}.</span>
                  <span>{withBold(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && ' '}
                {withBold(line, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
