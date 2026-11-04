'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { adsApi, type Creative } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const VIDEO_ACCEPT = 'video/mp4,video/webm';
const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

/* Klient tomonidagi tekshiruv faqat tezkor fikr uchun — haqiqiy tekshiruv serverda
   (Pillow bilan rasmni ochish, video magic bytes, hajm). */
export function precheck(file: File, kind: 'image' | 'video'): string | null {
  const okType = kind === 'image' ? IMAGE_ACCEPT.split(',') : VIDEO_ACCEPT.split(',');
  if (!okType.includes(file.type)) return kind === 'image' ? 'Faqat JPG, PNG yoki WEBP.' : 'Faqat MP4 yoki WEBM.';
  if (file.size > (kind === 'image' ? IMAGE_MAX : VIDEO_MAX)) return kind === 'image' ? 'Rasm 5 MB dan oshmasin.' : 'Video 50 MB dan oshmasin.';
  return null;
}

export async function uploadCreative(file: File, kind: 'image' | 'video'): Promise<Creative | null> {
  const err = precheck(file, kind);
  if (err) { toast.error(err); return null; }
  try {
    const { creative } = await adsApi.uploadCreative(file, kind);
    toast.success('Fayl yuklandi');
    return creative;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Yuklanmadi');
    return null;
  }
}

export default function CreativePicker({ label, kind, value, items, onItems, onChange }: {
  label: string;
  kind: 'image' | 'video';
  value: Creative | null;
  items: Creative[];
  onItems: (items: Creative[]) => void;
  onChange: (c: Creative | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const options = items.filter((c) => c.kind === kind);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const created = await uploadCreative(file, kind);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    if (created) {
      onItems([created, ...items]);
      onChange(created);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="relative">
        <button type="button" onClick={() => setOpen(true)}
          className={cn('flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border text-[12px] transition',
            value ? 'border-[var(--border-card)]' : 'border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--brand)]')}>
          {value ? (
            kind === 'image'
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={value.url} alt="" className="size-full object-cover" />
              : <video src={value.url} className="size-full object-cover" muted />
          ) : 'Tanlash yoki yuklash'}
        </button>
        {value && (
          <button type="button" aria-label="Olib tashlash" onClick={() => onChange(null)}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"><X className="size-3" /></button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {kind === 'image' ? 'JPG, PNG yoki WEBP, 5 MB gacha, kamida 200×100 px. Banner uchun 1200×628 tavsiya etiladi.' : 'MP4 yoki WEBM, 50 MB gacha.'}
            </DialogDescription>
          </DialogHeader>
          <input ref={fileRef} type="file" hidden accept={kind === 'image' ? IMAGE_ACCEPT : VIDEO_ACCEPT}
            onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload /> {busy ? 'Yuklanmoqda…' : 'Yangi fayl yuklash'}
          </Button>
          {options.length > 0 && (
            <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {options.map((c) => (
                <button key={c.id} type="button" onClick={() => { onChange(c); setOpen(false); }}
                  className={cn('overflow-hidden rounded-lg border text-left transition hover:border-[var(--brand)]',
                    value?.id === c.id ? 'border-[var(--brand)] ring-2 ring-[var(--brand-soft)]' : 'border-[var(--border-card)]')}>
                  {kind === 'image'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.url} alt="" className="aspect-[16/9] w-full object-cover" />
                    : <video src={c.url} className="aspect-[16/9] w-full object-cover" muted />}
                  <div className="truncate px-2 py-1.5 text-[11px] text-[var(--text-muted)]">{c.original_name || `#${c.id}`}</div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
