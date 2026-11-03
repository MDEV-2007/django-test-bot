'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check, Upload, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

type ParentCheckout = {
  student_name: string;
  plan: { name: string; price: string; duration_days: number };
  card_number: string;
  card_holder: string;
};

/* Ota-ona to'lov sahifasi. Akkauntga kirish talab qilinmaydi: havoladagi imzolangan
   token qaysi o'quvchi va tarif uchun to'lov ekanini backend'ga aytadi. Shuning uchun
   bu yerda apiFetch emas, oddiy fetch — brauzerda boshqa odamning tokeni bo'lsa ham
   so'rovga qo'shilmasin. */
export default function ParentPayPage() {
  const { token } = useParams<{ token: string }>();
  // useParams kodlangan qiymat qaytaradi — qayta kodlashdan oldin ochamiz (aks holda %253A).
  const endpoint = `/api/premium/parent-checkout/${encodeURIComponent(decodeURIComponent(token))}/`;
  const [info, setInfo] = useState<ParentCheckout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(endpoint)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "Havolani ochib bo'lmadi");
        setInfo(body);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Havolani ochib bo'lmadi"));
  }, [endpoint]);

  async function submit() {
    if (!file) {
      setError("Iltimos, to'lov cheki skrinshotini tanlang.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('screenshot', file);
      const r = await fetch(endpoint, { method: 'POST', body: form });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Xatolik yuz berdi');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCard() {
    if (!info) return;
    navigator.clipboard.writeText(info.card_number.replace(/\s+/g, '')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const price = info ? Number(info.plan.price).toLocaleString('uz-UZ').replace(/,/g, ' ') : '';

  return (
    <main className="min-h-screen bg-[var(--bg-page)] px-4 py-10">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--brand-text)]">IlmIldizi</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Farzandingiz uchun to&apos;lov</h1>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger-text)]">
            {loadError}
          </div>
        )}

        {!info && !loadError && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-label="Yuklanmoqda" />
          </div>
        )}

        {info && done && (
          <div className="space-y-3 rounded-2xl border border-[var(--brand-border)] bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-[var(--brand-text)]" />
            <h2 className="text-lg font-bold text-foreground">Chek qabul qilindi</h2>
            <p className="text-sm text-muted-foreground">
              To&apos;lov tekshirilgach, {info.student_name} uchun {info.plan.name} faollashadi. Odatda bu bir necha soat oladi.
            </p>
          </div>
        )}

        {info && !done && (
          <>
            <section className="space-y-1 rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">O&apos;quvchi</p>
              <p className="text-lg font-bold text-foreground">{info.student_name}</p>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm text-[var(--text-secondary)]">{info.plan.name}</span>
                <span className="text-xl font-bold tabular-nums text-foreground">{price} so&apos;m</span>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">1. Shu kartaga o&apos;tkazing</h2>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-input)] p-4">
                <div>
                  <p className="text-lg font-bold tabular-nums tracking-wide text-foreground">{info.card_number}</p>
                  <p className="text-sm text-muted-foreground">{info.card_holder}</p>
                </div>
                <button
                  type="button"
                  onClick={copyCard}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-4 text-sm font-semibold text-[var(--brand-text)]"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Nusxalandi' : 'Nusxalash'}
                </button>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">2. Chek skrinshotini yuklang</h2>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:bg-[var(--surface-hover)]">
                <Upload className="size-5" />
                <span>{file ? file.name : 'Rasm tanlash (JPG yoki PNG)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {error && <p className="text-sm text-[var(--danger-text)]">{error}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Chekni yuborish
              </button>
            </section>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="size-4" /> To&apos;lov administrator tomonidan qo&apos;lda tekshiriladi.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
