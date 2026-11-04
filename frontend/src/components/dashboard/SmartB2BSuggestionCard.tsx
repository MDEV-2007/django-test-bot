'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { apiFetch } from '@/lib/api-client';
import { trackAd, useAdImpression } from '@/lib/adTracking';
import { useAuthStore } from '@/lib/auth-store';
import { useTransliterate } from '@/lib/transliterate';
import { toast } from 'sonner';

export type B2BCampaignData = {
  id: number;
  center_name: string;
  logo: string;
  title: string;
  description: string;
  offer_badge: string;
  target_subject: string;
  target_region?: string;
  rating: number;
};

export type B2BDiagnosisData = {
  weakest_topic: string;
  mastery_percentage: number;
  predicted_score: string | null;
};

type ActiveCampaignResponse = {
  campaign: B2BCampaignData | null;
  diagnosis: B2BDiagnosisData | null;
  already_submitted?: boolean;
};

type SubmitLeadResponse = {
  success: boolean;
  already_submitted?: boolean;
  coins_earned: number;
  total_coins?: number;
  message: string;
};

type SubmitState = 'idle' | 'submitted' | 'already';

const REWARD_COINS = 50;

/** "+998 90 123-45-67" yoki "901234567" -> "+998901234567"; noto'g'ri bo'lsa null (backend bilan bir xil qoida). */
function normalizeUzPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length !== 12 || !digits.startsWith('998')) return null;
  return `+${digits}`;
}

/** Yozish paytida "+998 90 123 45 67" ko'rinishiga keltiradi. */
function formatUzPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits.startsWith('998')) digits = `998${digits}`;
  digits = digits.slice(0, 12);
  const rest = digits.slice(3);
  const parts = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(Boolean);
  return ['+998', ...parts].join(' ');
}

export default function SmartB2BSuggestionCard() {
  const { t } = useTransliterate();
  const { user } = useAuthStore();

  // Faqat serverdagi haqiqiy kampaniya va diagnostika — soxta boshlang'ich qiymatlar yo'q.
  const [campaign, setCampaign] = useState<B2BCampaignData | null>(null);
  const [diagnosis, setDiagnosis] = useState<B2BDiagnosisData | null>(null);

  // 2-bosqichli rozilik oynasi
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);

  useEffect(() => {
    if (user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '';
      setFullName((prev) => prev || name);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    async function loadCampaign() {
      try {
        const res = await apiFetch<ActiveCampaignResponse>('/api/v1/b2b/active-campaign/');
        if (isMounted) {
          setCampaign(res?.campaign ?? null);
          setDiagnosis(res?.diagnosis ?? null);
          if (res?.already_submitted) setSubmitState('already');
        }
      } catch {
        // Reklama ixtiyoriy — xatoda karta ko'rsatilmaydi.
      }
    }
    loadCampaign();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDone = submitState !== 'idle';
  const cardRef = useRef<HTMLDivElement>(null);
  useAdImpression(cardRef, campaign?.id);

  // 1-bosqich: tugma faqat rozilik oynasini ochadi, hech narsa yuborilmaydi.
  const handleOpenConsent = () => {
    if (isDone) return;
    trackAd(campaign?.id, 'click');
    soundFX.click();
    tgHaptic('medium');
    setPhoneError(null);
    setIsConsentOpen(true);
  };

  // 2-bosqich: o'quvchi ma'lumotlarni ko'rib, o'zi tasdiqlaydi.
  const handleConfirmLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!campaign || submitting) return;

    const normalizedPhone = normalizeUzPhone(phone);
    if (!normalizedPhone) {
      setPhoneError(t("Raqamni to'liq kiriting: +998 XX XXX XX XX"));
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error(t('Ism-familiyangizni kiriting'));
      return;
    }
    if (!guardianConfirmed) {
      toast.error(t("18 yoshdan kattaligingizni yoki ota-onangiz roziligi borligini tasdiqlang"));
      return;
    }

    setSubmitting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<SubmitLeadResponse>('/api/v1/b2b/submit-lead/', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaign.id,
          full_name: fullName.trim(),
          phone_number: normalizedPhone,
          // Rozilik oynasidagi tasdiqlash — aniq rozilik. Zaif mavzu/prognoz ball
          // klientdan yuborilmaydi: server haqiqiy natijalardan oladi.
          consent: true,
          guardian_confirmed: guardianConfirmed,
        }),
      });

      if (!res?.success) {
        toast.error(t(res?.message || 'Arizani yuborishda xatolik yuz berdi'));
        return;
      }

      setIsConsentOpen(false);
      if (typeof res.total_coins === 'number') {
        const current = useAuthStore.getState().user;
        if (current) useAuthStore.getState().setUser({ ...current, coins: res.total_coins });
      }

      if (res.already_submitted) {
        setSubmitState('already');
        toast.info(t(res.message));
      } else {
        setSubmitState('submitted');
        soundFX.success();
        tgHaptic('success');
        toast.success(t(`✅ Arizangiz qabul qilindi! +${res.coins_earned} 🪙 hisobingizga qo'shildi`));
      }
    } catch (err: unknown) {
      // Xatoda muvaffaqiyat ko'rsatilmaydi: o'quvchi qayta urinishi kerak.
      toast.error(err instanceof Error ? err.message : t('Arizani yuborishda xatolik yuz berdi'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign) return null;

  return (
    <>
      <div ref={cardRef} className="relative isolate overflow-hidden rounded-[28px] bg-[#FFFCF7] p-5 text-[#080808] shadow-[0_1px_2px_rgba(40,20,60,0.05),0_18px_40px_-26px_rgba(60,30,110,0.45)] sm:p-6 dark:bg-[#1C1726] dark:text-[#F6F1EA]">
        {/* Dekor: apelsin burchak + punktir halqa */}
        <span aria-hidden className="absolute -right-10 -top-10 -z-10 size-32 rounded-full bg-[#FFB82E] opacity-90" />
        <span aria-hidden className="absolute -right-2 -top-2 -z-10 size-16 rounded-full border-2 border-dashed border-[#FFFCF7]/80" />
        <span aria-hidden className="absolute -bottom-12 -left-10 -z-10 size-32 rounded-full bg-[#7659C7] opacity-15" />

        <span className="inline-flex items-center rounded-full bg-[#080808]/6 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5E5868] dark:bg-white/10 dark:text-white/70">
          {t('Reklama')}
        </span>

        {/* AI tavsiyasi — faqat haqiqiy test natijasi bo'lsa */}
        {diagnosis && (
          <div className="mt-4 space-y-1.5 rounded-[20px] bg-[#F7F4EF] p-3.5 dark:bg-white/8">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8A5A00] dark:text-[#FFB82E]">
              <Sparkles className="size-3.5" />
              <span>{t('AI tavsiyasi: zaif mavzu')}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-[#5E5868] dark:text-white/70">
              {t('Siz')} <strong className="text-[#080808] dark:text-white">&quot;{t(diagnosis.weakest_topic)}&quot;</strong> {t('mavzusida')}{' '}
              <span className="rounded-full bg-[#F0523D] px-1.5 py-0.5 font-bold text-white">{diagnosis.mastery_percentage}%</span>{' '}
              {t("natija ko'rsatmoqdasiz.")} {t("Bu mavzuni ustoz bilan yopish uchun quyidagi o'quv markaz tavsiya etiladi.")}
            </p>
          </div>
        )}

        {/* O'quv markaz */}
        <div className="mt-4 flex items-start gap-3.5">
          <Avatar className="size-14 shrink-0 rounded-[18px] ring-2 ring-[#FFB82E] ring-offset-2 ring-offset-[#FFFCF7] dark:ring-offset-[#1C1726]">
            <AvatarImage src={campaign.logo} alt={campaign.center_name} className="object-cover" />
            <AvatarFallback className="rounded-[18px] bg-[#FFB82E] font-bold text-[#080808]">
              {campaign.center_name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1.5">
            <h3 className="line-clamp-2 text-[19px] font-bold leading-tight tracking-[-0.03em] [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">
              {campaign.center_name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#FFB82E] px-2.5 py-0.5 text-[11px] font-bold text-[#080808]">
                🎁 {t('1-dars bepul')}
              </span>
              <span className="rounded-full bg-[#4C806B] px-2.5 py-0.5 text-[11px] font-bold text-white">+{REWARD_COINS} 🪙</span>
              {campaign.target_region && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F4EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#5E5868] dark:bg-white/10 dark:text-white/70">
                  <MapPin className="size-3" />
                  {t(campaign.target_region)}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-[#5E5868] dark:text-white/70">{campaign.title}</p>

        {isDone ? (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] bg-[#4C806B] px-4 py-3 text-[13px] font-bold text-white">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>
              {submitState === 'submitted'
                ? t(`Arizangiz qabul qilindi! +${REWARD_COINS} 🪙 hisobingizga qo'shildi`)
                : t("Arizangiz allaqachon yuborilgan — markaz siz bilan bog'lanadi.")}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenConsent}
            className="group mt-4 flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-full bg-[#FFB82E] pl-4 pr-1.5 text-[13px] font-bold text-[#080808] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <PhoneCall className="size-4 shrink-0" />
              <span className="truncate">{t('Bepul darsga yozilish')}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#080808] text-[#FFB82E] transition-transform group-hover:-rotate-45">
                <ArrowRight className="size-4" />
              </span>
            </span>
          </button>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-[#080808]/8 pt-3 text-[11px] text-[#8A8494] dark:border-white/10 dark:text-white/50">
          <span className="flex items-center gap-1">
            <GraduationCap className="size-3.5 text-[#F0523D]" />
            {t('Homiy kontent')}
          </span>
          <Link href="/feed" className="flex items-center gap-0.5 font-semibold hover:text-[#080808] dark:hover:text-white">
            {t('Hamjamiyat lentasi')} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* ── 2-BOSQICHLI ROZILIK OYNASI ── */}
      <Dialog open={isConsentOpen} onOpenChange={(open) => !submitting && setIsConsentOpen(open)}>
        <DialogContent className="ps-shell ps-dialog sm:max-w-md p-6">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB82E] text-[#080808] text-xs font-bold w-fit">
              <ShieldCheck className="size-3.5" />
              <span>{t('Faqat sizning roziligingiz bilan')}</span>
            </div>
            <DialogTitle className="text-[22px] sm:text-[26px] font-bold leading-tight text-[var(--text-primary)]">
              🎓 {campaign.center_name} — {t('Bepul sinov darsiga yozilish')}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-muted)]">
              {t("Ma'lumotlaringizni tekshiring. Ular faqat tasdiqlaganingizdan keyin yuboriladi.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLead} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="b2b-full-name" className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                <User className="size-3.5 text-[var(--ps-orange)]" />
                <span>{t('Ism-familiyangiz')}</span>
              </label>
              <Input
                id="b2b-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="masalan: Azizbek Karimov"
                autoComplete="name"
                className="h-11 rounded-full border-0 bg-[var(--ps-neutral)] px-4 text-sm text-[var(--text-primary)]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="b2b-phone" className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Phone className="size-3.5 text-[var(--ps-orange)]" />
                <span>{t('Telefon raqamingiz')}</span>
              </label>
              <Input
                id="b2b-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(formatUzPhoneInput(e.target.value));
                  setPhoneError(null);
                }}
                placeholder="+998 90 123 45 67"
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? 'b2b-phone-error' : undefined}
                className="h-11 rounded-full border-0 bg-[var(--ps-neutral)] px-4 text-sm font-mono text-[var(--text-primary)]"
                required
              />
              {phoneError && (
                <p id="b2b-phone-error" className="text-[11px] font-semibold text-rose-400">
                  {phoneError}
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={guardianConfirmed}
                onChange={(e) => setGuardianConfirmed(e.target.checked)}
                className="mt-0.5 size-4 accent-amber-500"
              />
              <span>{t("Men 18 yoshdan kattaman yoki ota-onam (vasiyim) roziligi bor.")}</span>
            </label>
            <p className="rounded-[18px] bg-[var(--ps-neutral)] p-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
              {t("Tasdiqlash orqali o'quv markaz mutaxassisi siz bilan bog'lanib, bepul dars vaqtini belgilashiga rozilik bildirasiz.")}
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConsentOpen(false)}
                disabled={submitting}
                className="sm:flex-1 h-11 rounded-full border-[var(--border-strong)] bg-transparent text-[var(--text-primary)]"
              >
                {t('Bekor qilish')}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="sm:flex-[1.4] min-h-11 h-auto py-2 whitespace-normal rounded-full bg-[#080808] text-[#FFFCF7] hover:bg-black font-bold text-xs sm:text-sm dark:bg-[#FFFCF7] dark:text-[#080808]"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t('Yuborilmoqda...')}
                  </span>
                ) : (
                  t(`Tasdiqlash va +${REWARD_COINS} 🪙 olish`)
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
