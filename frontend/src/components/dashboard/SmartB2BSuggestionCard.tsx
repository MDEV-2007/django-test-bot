'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
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

  // 1-bosqich: tugma faqat rozilik oynasini ochadi, hech narsa yuborilmaydi.
  const handleOpenConsent = () => {
    if (isDone) return;
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

    setSubmitting(true);
    tgHaptic('medium');

    try {
      const res = await apiFetch<SubmitLeadResponse>('/api/v1/b2b/submit-lead/', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaign.id,
          full_name: fullName.trim(),
          phone_number: normalizedPhone,
          weakest_topics: diagnosis?.weakest_topic ?? '',
          predicted_dtm_score: diagnosis?.predicted_score ?? '',
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
      <div className="relative overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] via-zinc-950 to-zinc-950 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        {/* AI tavsiyasi — faqat haqiqiy test natijasi bo'lsa */}
        {diagnosis && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 mb-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Sparkles className="size-4" />
              <span>{t('AI tavsiyasi: zaif mavzu')}</span>
            </div>
            <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
              {t('Siz')} <strong className="text-white">&quot;{t(diagnosis.weakest_topic)}&quot;</strong> {t('mavzusida')}{' '}
              <span className="font-mono text-rose-400 font-bold">{diagnosis.mastery_percentage}%</span> {t("natija ko'rsatmoqdasiz.")}{' '}
              {t("Bu mavzuni ustoz bilan yopish uchun quyidagi o'quv markaz tavsiya etiladi.")}
            </p>
          </div>
        )}

        {/* O'quv markaz */}
        <div className="flex items-start gap-3.5 mb-4">
          <Avatar className="size-12 rounded-2xl border border-white/10 shrink-0">
            <AvatarImage src={campaign.logo} alt={campaign.center_name} className="object-cover" />
            <AvatarFallback className="font-bold bg-amber-500/20 text-amber-300">
              {campaign.center_name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1">
            <h3 className="text-sm sm:text-base font-black text-white truncate">{campaign.center_name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500 text-black font-black text-[10px] px-2 py-0.5">
                🎁 {t('1-dars BEPUL')}
              </Badge>
              {campaign.target_region && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                  <MapPin className="size-3 text-amber-400" />
                  {t(campaign.target_region)}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 font-medium line-clamp-2">{campaign.title}</p>
          </div>
        </div>

        {isDone ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-600/15 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>
              {submitState === 'submitted'
                ? t(`✅ Arizangiz qabul qilindi! +${REWARD_COINS} 🪙 hisobingizga qo'shildi`)
                : t("Arizangiz allaqachon yuborilgan — markaz siz bilan bog'lanadi.")}
            </span>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleOpenConsent}
            className="w-full h-12 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-orange-500/20"
          >
            <span className="flex items-center gap-2">
              <PhoneCall className="size-4" />
              {t(`📞 Bepul Darsga Yozilish (+${REWARD_COINS} 🪙)`)}
            </span>
          </Button>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1">
            <GraduationCap className="size-3.5 text-amber-400" />
            {t('IlmIldizi Rasmiy Hamkori')}
          </span>
          <Link href="/feed" className="hover:text-zinc-300 flex items-center gap-0.5 font-medium">
            {t('Hamjamiyat lentasi')} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* ── 2-BOSQICHLI ROZILIK OYNASI ── */}
      <Dialog open={isConsentOpen} onOpenChange={(open) => !submitting && setIsConsentOpen(open)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold w-fit">
              <ShieldCheck className="size-3.5" />
              <span>{t('Faqat sizning roziligingiz bilan')}</span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-white leading-snug">
              🎓 {campaign.center_name} — {t('Bepul sinov darsiga yozilish')}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-300">
              {t("Ma'lumotlaringizni tekshiring. Ular faqat tasdiqlaganingizdan keyin yuboriladi.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLead} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="b2b-full-name" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <User className="size-3.5 text-amber-400" />
                <span>{t('Ism-familiyangiz')}</span>
              </label>
              <Input
                id="b2b-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="masalan: Azizbek Karimov"
                autoComplete="name"
                className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="b2b-phone" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Phone className="size-3.5 text-amber-400" />
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
                className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white text-sm font-mono"
                required
              />
              {phoneError && (
                <p id="b2b-phone-error" className="text-[11px] font-semibold text-rose-400">
                  {phoneError}
                </p>
              )}
            </div>

            <p className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
              {t("Tasdiqlash orqali o'quv markaz mutaxassisi siz bilan bog'lanib, bepul dars vaqtini belgilashiga rozilik bildirasiz.")}
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConsentOpen(false)}
                disabled={submitting}
                className="sm:flex-1 h-11 rounded-xl border-white/10 text-zinc-300"
              >
                {t('Bekor qilish')}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="sm:flex-[1.4] min-h-11 h-auto py-2 whitespace-normal rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t('Yuborilmoqda...')}
                  </span>
                ) : (
                  t(`✅ Tasdiqlash va +${REWARD_COINS} 🪙 Olish`)
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
