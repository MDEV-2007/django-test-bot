'use client';

import { useEffect, useState } from 'react';
import { apiFetchBlob } from '@/lib/api-client';

type Props = {
  /** API yo'li, masalan `/api/premium/payments/12/screenshot/` */
  path: string;
  alt: string;
  className?: string;
  /** Bosilganda to'liq o'lchamda yangi oynada ochish. */
  openOnClick?: boolean;
};

/** Token URL'ga qo'yilmaydigan himoyalangan rasm: header bilan yuklab, blob URL ko'rsatadi. */
export default function AuthImage({ path, alt, className, openOnClick }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    setFailed(false);
    apiFetchBlob(path)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  if (failed) return <span className="text-xs text-muted-foreground">Rasmni yuklab bo&apos;lmadi</span>;
  if (!src) return <span className={className} aria-busy="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src} alt={alt} className={className} />;
  if (!openOnClick) return img;
  return (
    <a href={src} target="_blank" rel="noreferrer" title="To'liq o'lchamda ochish"
       className="block overflow-hidden rounded-lg border transition-colors hover:border-[var(--border-strong)]">
      {img}
    </a>
  );
}
