'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Baby, Ban, EyeOff, Flag, Gavel, HeartCrack, Loader2, Lock,
  Megaphone, MessageSquareWarning, ShieldAlert, UserX, X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type LucideIcon = React.ComponentType<{ className?: string }>;

/* Backend'dagi CommunityPostReport.REASONS bilan bir xil kalitlar */
export const REPORT_REASONS: { key: string; label: string; hint: string; icon: LucideIcon; tone: string; severe?: boolean }[] = [
  { key: 'child_safety', label: 'Bolalar xavfsizligi', hint: 'Pedofiliya, bolalarni ekspluatatsiya qilish', icon: Baby, tone: 'bg-[var(--ps-coral)] text-white', severe: true },
  { key: 'adult', label: '18+ kontent', hint: 'Yalang\'ochlik, shahvoniy material', icon: EyeOff, tone: 'bg-[var(--ps-coral)] text-white', severe: true },
  { key: 'violence', label: "Zo'ravonlik / tahdid", hint: "Qon, jarohat, zo'ravonlikka chaqiriq", icon: Gavel, tone: 'bg-[var(--ps-coral)] text-white', severe: true },
  { key: 'self_harm', label: "O'z-o'ziga zarar", hint: "Suitsid yoki o'ziga zarar yetkazish", icon: HeartCrack, tone: 'bg-[var(--ps-coral)] text-white', severe: true },
  { key: 'hate', label: 'Nafrat / kamsitish', hint: 'Millat, din, jins bo\'yicha kamsitish', icon: Ban, tone: 'bg-[var(--ps-orange)] text-[#080808]' },
  { key: 'harassment', label: "Ta'qib / bezorilik", hint: "Shaxsga hujum, qo'rqitish", icon: UserX, tone: 'bg-[var(--ps-orange)] text-[#080808]' },
  { key: 'abuse', label: "Haqorat / so'kinish", hint: "Odobsiz so'zlar, haqorat", icon: MessageSquareWarning, tone: 'bg-[var(--ps-orange)] text-[#080808]' },
  { key: 'privacy', label: "Shaxsiy ma'lumot", hint: "Telefon, manzil, hujjat oshkor qilingan", icon: Lock, tone: 'bg-[var(--ps-purple)] text-white' },
  { key: 'misinformation', label: "Yolg'on ma'lumot", hint: "Noto'g'ri yoki chalg'ituvchi xabar", icon: AlertTriangle, tone: 'bg-[var(--ps-purple)] text-white' },
  { key: 'spam', label: 'Spam / reklama', hint: 'Takroriy, reklama yoki havola', icon: Megaphone, tone: 'bg-[var(--ps-blue)] text-[#080808]' },
  { key: 'cheating', label: 'Javob tarqatish', hint: "Test javoblarini ko'chirish/tarqatish", icon: ShieldAlert, tone: 'bg-[var(--ps-blue)] text-[#080808]' },
  { key: 'other', label: 'Boshqa', hint: 'Yuqoridagilarga kirmaydigan sabab', icon: Flag, tone: 'bg-[var(--ps-neutral)] text-[var(--text-primary)]' },
];

export default function ReportPostDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails('');
      setSending(false);
    }
  }, [open]);

  const selected = REPORT_REASONS.find((r) => r.key === reason);

  async function handleSubmit() {
    if (!reason || sending) return;
    setSending(true);
    try {
      await onSubmit(reason, details.trim());
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) onOpenChange(o); }}>
      <DialogContent
        showCloseButton={false}
        className="ps-shell flex max-h-[90svh] w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden rounded-[32px] border-0 bg-[var(--ps-paper)] p-0 sm:max-w-xl sm:p-0 dark:bg-[var(--ps-paper)]"
      >
        {/* Sarlavha */}
        <div className="relative shrink-0 overflow-hidden bg-[var(--ps-coral)] p-6 pb-5 text-white">
          <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-8 right-24 size-16 rounded-full bg-[var(--ps-orange)] opacity-80" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            aria-label="Yopish"
            className="absolute right-4 top-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/15 transition-colors hover:bg-black/30"
          >
            <X className="size-4" />
          </button>
          <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-white text-[var(--ps-coral)]">
            <Flag className="size-5" />
          </span>
          <DialogTitle className="ps-display relative mt-4 text-[26px] text-white sm:text-[30px]">
            Postga shikoyat
          </DialogTitle>
          <DialogDescription className="relative mt-1 text-[13px] !text-white/90">
            Nima noto&apos;g&apos;ri? Sababni tanlang — shikoyatingiz anonim, muallif kimligingizni ko&apos;rmaydi.
          </DialogDescription>
        </div>

        {/* Sabablar */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div role="radiogroup" aria-label="Shikoyat sababi" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REPORT_REASONS.map((r) => {
              const Icon = r.icon;
              const active = reason === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setReason(r.key)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[20px] p-2.5 pr-3 text-left transition-all',
                    active
                      ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                      : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5'
                  )}
                >
                  <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full', r.tone)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold leading-tight">{r.label}</span>
                    <span className={cn('mt-0.5 block text-[11.5px] leading-snug', active ? 'opacity-70' : 'text-[var(--text-muted)]')}>
                      {r.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selected?.key === 'child_safety' && (
            <p className="mt-4 rounded-[20px] bg-[var(--ps-coral)] p-4 text-[12.5px] font-semibold leading-relaxed text-white">
              Bu turdagi shikoyat bo&apos;yicha post darhol lentadan yashiriladi va moderator tomonidan ustuvor ko&apos;rib chiqiladi.
              Agar bola real xavf ostida bo&apos;lsa, zudlik bilan 102 (politsiya) raqamiga murojaat qiling.
            </p>
          )}

          {selected && (
            <div className="mt-4">
              <label htmlFor="report-details" className="text-[12.5px] font-bold text-[var(--text-secondary)]">
                Qo&apos;shimcha izoh <span className="font-medium text-[var(--text-muted)]">(ixtiyoriy)</span>
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Moderatorga nimani bilishi kerakligini yozing…"
                className="mt-2 w-full resize-none rounded-[20px] bg-[var(--ps-neutral)] p-4 text-[13.5px] text-[var(--text-primary)] outline-none ring-2 ring-transparent transition placeholder:text-[var(--text-faint)] focus:ring-[var(--ps-purple)]"
              />
              <p className="mt-1 text-right text-[11px] text-[var(--text-faint)]">{details.length}/500</p>
            </div>
          )}
        </div>

        {/* Pastki qism */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-card)] p-4 sm:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="ps-btn ps-btn-ghost !min-h-11"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || sending}
            className="ps-btn !min-h-11 bg-[var(--ps-coral)] text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
            Shikoyat yuborish
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
