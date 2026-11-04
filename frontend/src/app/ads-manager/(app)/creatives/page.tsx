'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IMAGE_ACCEPT, VIDEO_ACCEPT, uploadCreative } from '@/components/ads/CreativePicker';
import { EmptyState, ErrorNote, PageTitle, Panel, SkeletonRows } from '@/components/ads/ui';
import { adsApi, fmtDate, type Creative } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CreativesPage() {
  const [items, setItems] = useState<Creative[] | null>(null);
  const [kind, setKind] = useState<'all' | 'image' | 'video'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adsApi.creatives().then((r) => setItems(r.creatives)).catch((e) => setError(e.message));
  }, []);

  const onFiles = async (files: FileList | null, k: 'image' | 'video') => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const c = await uploadCreative(f, k);
      if (c) setItems((prev) => [c, ...(prev || [])]);
    }
    setBusy(false);
    if (imageRef.current) imageRef.current.value = '';
    if (videoRef.current) videoRef.current.value = '';
  };

  const remove = async (c: Creative) => {
    try {
      await adsApi.deleteCreative(c.id);
      setItems((prev) => (prev || []).filter((x) => x.id !== c.id));
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirilmadi");
    }
  };

  const visible = (items || []).filter((c) => kind === 'all' || c.kind === kind);

  return (
    <>
      <PageTitle title="Creative" description="Kampaniyalarda qayta ishlatiladigan rasm va videolar. Rasm: JPG/PNG/WEBP, 5 MB gacha. Video: MP4/WEBM, 50 MB gacha."
        actions={<>
          <input ref={imageRef} type="file" hidden multiple accept={IMAGE_ACCEPT} onChange={(e) => onFiles(e.target.files, 'image')} />
          <input ref={videoRef} type="file" hidden accept={VIDEO_ACCEPT} onChange={(e) => onFiles(e.target.files, 'video')} />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => videoRef.current?.click()}><Upload /> Video</Button>
          <Button size="sm" disabled={busy} onClick={() => imageRef.current?.click()}><Upload /> {busy ? 'Yuklanmoqda…' : 'Rasm'}</Button>
        </>} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}
      <Panel>
        <div className="flex gap-1 border-b border-[var(--border-soft)] p-3">
          {(['all', 'image', 'video'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={cn('rounded-md px-2.5 py-1.5 text-[13px] font-medium', kind === k ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]')}>
              {k === 'all' ? 'Barchasi' : k === 'image' ? 'Rasmlar' : 'Videolar'}
            </button>
          ))}
        </div>
        {items === null ? <SkeletonRows rows={4} /> : visible.length === 0 ? (
          <EmptyState title="Creative yo'q" description="Banner yoki logo yuklang — keyin kampaniya yaratishda tanlaysiz." />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c) => (
              <figure key={c.id} className="overflow-hidden rounded-lg border border-[var(--border-card)]">
                {c.kind === 'image'
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.url} alt={c.original_name} className="aspect-[16/9] w-full bg-[var(--surface-hover)] object-cover" />
                  : <video src={c.url} controls preload="metadata" className="aspect-[16/9] w-full bg-black object-cover" />}
                <figcaption className="space-y-1 p-3">
                  <div className="truncate text-[13px] font-medium">{c.original_name || `#${c.id}`}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    {c.width && c.height ? `${c.width}×${c.height} · ` : ''}{fmtSize(c.size_bytes)} · {fmtDate(c.created_at)}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="truncate text-[12px] text-[var(--text-muted)]">
                      {c.used_by.length ? <>Ishlatilgan: {c.used_by.map((u, i) => (
                        <span key={u.id}>{i > 0 && ', '}<Link className="underline" href={`/campaigns/${u.id}`}>{u.title}</Link></span>
                      ))}</> : 'Ishlatilmagan'}
                    </span>
                    {c.used_by.length === 0 && (
                      <button aria-label="O'chirish" onClick={() => remove(c)} className="rounded p-1 text-[var(--text-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
