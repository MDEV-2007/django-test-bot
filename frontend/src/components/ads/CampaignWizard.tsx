'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Panel, inputCls, textareaCls } from '@/components/ads/ui';
import CreativePicker from '@/components/ads/CreativePicker';
import AdPreview from '@/components/ads/AdPreview';
import {
  OBJECTIVE_LABEL, adsApi, type Audiences, type Campaign, type CampaignInput, type Creative, type Objective,
} from '@/lib/ads-api';
import { cn } from '@/lib/utils';
import { useAds } from '@/components/ads/AdsShell';

const STEPS = ['Maqsad', 'Auditoriya', 'Creative', 'Joylashuv', 'Byudjet va muddat', "Ko'rib chiqish"] as const;

type Form = {
  objective: Objective;
  target_subject: string;
  target_region: string;
  max_score_threshold: number;
  title: string;
  description: string;
  offer_badge: string;
  cta_text: string;
  banner: Creative | null;
  logo: Creative | null;
  video: Creative | null;
  starts_at: string;
  ends_at: string;
  max_leads: string;
  telegram_chat_id: string;
};

const OBJECTIVE_HELP: Record<Objective, string> = {
  leads: "O'quvchilar bepul sinov darsiga ariza qoldiradi (rozilik bilan). Asosiy natija — lid.",
  course: "Muayyan kursni ko'rsatish; o'quvchi xohlasa ariza qoldiradi.",
  center: "Markaz brendini tanitish; ariza ham qabul qilinadi.",
  event: "Ochiq dars, imtihon simulyatsiyasi yoki tadbir e'loni.",
  other: "Administrator tasdiqlaydigan boshqa ta'limiy maqsad.",
};

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function creativeFromUrl(url: string | undefined, kind: 'image' | 'video', list: Creative[]): Creative | null {
  if (!url) return null;
  return list.find((c) => c.url === url && c.kind === kind) || null;
}

export default function CampaignWizard({ initial }: { initial?: Campaign }) {
  const router = useRouter();
  const { center } = useAds();
  const editing = !!initial;
  const [step, setStep] = useState(0);
  const [aud, setAud] = useState<Audiences | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState<Form>({
    objective: initial?.objective || 'leads',
    target_subject: initial?.target_subject || 'ALL',
    target_region: initial?.target_region || 'ALL',
    max_score_threshold: initial?.max_score_threshold ?? 100,
    title: initial?.title || '',
    description: initial?.description || '',
    offer_badge: initial?.offer_badge || '',
    cta_text: initial?.cta_text || '',
    banner: null, logo: null, video: null,
    starts_at: toLocalInput(initial?.starts_at),
    ends_at: toLocalInput(initial?.ends_at),
    max_leads: initial?.max_leads ? String(initial.max_leads) : '',
    telegram_chat_id: initial?.telegram_chat_id ?? center.telegram_chat_id ?? '',
  });

  useEffect(() => {
    adsApi.audiences().then(setAud).catch(() => setAud(null));
    adsApi.creatives().then((r) => {
      setCreatives(r.creatives);
      if (initial) {
        setForm((f) => ({
          ...f,
          banner: creativeFromUrl(initial.banner_url, 'image', r.creatives),
          logo: creativeFromUrl(initial.logo, 'image', r.creatives),
          video: creativeFromUrl(initial.story_video_url, 'video', r.creatives),
        }));
      }
    }).catch(() => {});
  }, [initial]);

  const [touched, setTouched] = useState<{ banner?: boolean; logo?: boolean; video?: boolean }>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    if (k === 'banner' || k === 'logo' || k === 'video') setTouched((t) => ({ ...t, [k]: true }));
    setForm((f) => ({ ...f, [k]: v }));
  };
  /* Creative maydoni o'zgartirilmagan bo'lsa (masalan logo markaz profilidagi tashqi URL —
     creative ro'yxatida yo'q), uni yubormaymiz: aks holda tahrirda tozalanib ketardi. */
  const initialUrl = { banner: initial?.banner_url || '', logo: initial?.logo || '', video: initial?.story_video_url || '' };
  const effectiveUrl = (k: 'banner' | 'logo' | 'video') => (touched[k] || !initial ? form[k]?.url || '' : form[k]?.url || initialUrl[k]);

  const stepErrors = useMemo(() => {
    const e: Record<number, string> = {};
    if (form.title.trim().length < 3) e[2] = "Sarlavha kamida 3 ta belgi.";
    else if (!form.description.trim()) e[2] = 'Tavsif majburiy.';
    else if (!effectiveUrl('banner') && !effectiveUrl('logo')) e[2] = 'Banner yoki logo tanlang.';
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) e[4] = "Tugash vaqti boshlanishdan keyin bo'lsin.";
    if (form.max_leads && (Number(form.max_leads) < 1 || !Number.isInteger(Number(form.max_leads)))) e[4] = "Lid limiti musbat butun son bo'lsin.";
    if (form.telegram_chat_id && !/^-?\d+$/.test(form.telegram_chat_id)) e[4] = 'Telegram chat ID faqat raqam.';
    return e;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, touched]);

  const payload = (): CampaignInput => ({
    objective: form.objective,
    target_subject: form.target_subject,
    target_region: form.target_region,
    max_score_threshold: form.max_score_threshold,
    title: form.title.trim(),
    description: form.description.trim(),
    offer_badge: form.offer_badge.trim(),
    cta_text: form.cta_text.trim(),
    ...((initial ? touched.banner : form.banner) ? { banner_creative_id: form.banner?.id ?? null } : {}),
    ...((initial ? touched.logo : form.logo) ? { logo_creative_id: form.logo?.id ?? null } : {}),
    ...((initial ? touched.video : form.video) ? { video_creative_id: form.video?.id ?? null } : {}),
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    max_leads: form.max_leads ? Number(form.max_leads) : null,
    telegram_chat_id: form.telegram_chat_id.trim(),
  });

  const save = async (submit: boolean) => {
    setError('');
    if (form.title.trim().length < 3) { setStep(2); setError(stepErrors[2] || 'Sarlavha kiriting.'); return; }
    if (submit && (stepErrors[2] || stepErrors[4])) { setStep(stepErrors[2] ? 2 : 4); setError(stepErrors[2] || stepErrors[4]); return; }
    setBusy(true);
    try {
      let campaign: Campaign;
      let message = '';
      if (editing) {
        const res = await adsApi.updateCampaign(initial!.id, payload());
        campaign = res.campaign;
        message = res.message;
      } else {
        campaign = (await adsApi.createCampaign(payload())).campaign;
      }
      if (submit && (campaign.status === 'draft' || campaign.status === 'rejected')) {
        campaign = (await adsApi.campaignAction(campaign.id, 'submit')).campaign;
        toast.success("Kampaniya moderatsiyaga yuborildi");
      } else {
        toast.success(message || 'Saqlandi');
      }
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
      setBusy(false);
    }
  };

  const approvedEdit = editing && initial!.review_status === 'approved';
  const isLast = step === STEPS.length - 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Qadamlar">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
              className={cn('flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium transition',
                step === i ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs ring-1 ring-[var(--border-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[11px]',
                i < step ? 'bg-[var(--brand)] text-[var(--on-brand)]' : step === i ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'bg-[var(--surface-hover)]')}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {label}
              {stepErrors[i] && i !== step && <span className="ml-auto size-1.5 rounded-full bg-[var(--warning)]" aria-label="To'ldirilmagan" />}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0 space-y-4">
        {error && <ErrorNote message={error} />}
        {approvedEdit && (
          <div className="rounded-lg bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[var(--warning-text)]">
            Kampaniya faol. Matn, creative yoki nishonlash o&apos;zgarsa, u qayta moderatsiyaga tushadi va tasdiqlangunga qadar ko&apos;rsatilmaydi. Muddat va lid limitini o&apos;zgartirish moderatsiyasiz.
          </div>
        )}
        <Panel className="p-5 sm:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold">Kampaniya maqsadi</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(OBJECTIVE_LABEL) as Objective[]).map((o) => (
                  <button key={o} type="button" onClick={() => set('objective', o)}
                    className={cn('rounded-lg border p-4 text-left transition',
                      form.objective === o ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border-card)] hover:border-[var(--border-strong)]')}>
                    <div className="text-[14px] font-semibold">{OBJECTIVE_LABEL[o]}</div>
                    <div className="mt-1 text-[12px] text-[var(--text-muted)]">{OBJECTIVE_HELP[o]}</div>
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">Barcha maqsadlarda o&apos;quvchi faqat aniq rozilik bilan ariza (lid) qoldiradi.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-[16px] font-semibold">Auditoriya</h2>
              <p className="text-[13px] text-[var(--text-muted)]">
                Nishonlash faqat agregat segmentlar bo&apos;yicha. Alohida o&apos;quvchini tanlab bo&apos;lmaydi; yosh, jins kabi shaxsiy belgilar ishlatilmaydi.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fan" htmlFor="sub">
                  <select id="sub" className={inputCls} value={form.target_subject} onChange={(e) => set('target_subject', e.target.value)}>
                    <option value="ALL">Barcha fanlar</option>
                    {aud?.subjects.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
                  </select>
                </Field>
                <Field label="Hudud" htmlFor="reg" hint={aud && aud.regions.length === 0 ? `Hududlar ro'yxati ${aud.min_bucket} dan ortiq faol o'quvchi bo'lganda ko'rinadi.` : undefined}>
                  <select id="reg" className={inputCls} value={form.target_region} onChange={(e) => set('target_region', e.target.value)}>
                    <option value="ALL">Barcha hududlar</option>
                    {form.target_region !== 'ALL' && !aud?.regions.some((r) => r.value === form.target_region) && (
                      <option value={form.target_region}>{form.target_region}</option>
                    )}
                    {aud?.regions.map((r) => <option key={r.value} value={r.value}>{r.value} (~{r.approx_size}+)</option>)}
                  </select>
                </Field>
              </div>
              <Field label={`Natija chegarasi: ${form.max_score_threshold}% gacha`} htmlFor="thr"
                hint={form.max_score_threshold >= 100 ? "Natijadan qat'i nazar barcha o'quvchilar." : `Oxirgi testlarda ${form.max_score_threshold}% dan past natija olganlarga ustuvor ko'rsatiladi.`}>
                <input id="thr" type="range" min={10} max={100} step={5} value={form.max_score_threshold}
                  onChange={(e) => set('max_score_threshold', Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              </Field>
              {aud?.active_students_30d != null && (
                <p className="text-[12px] text-[var(--text-muted)]">Platformada so&apos;nggi 30 kunda faol o&apos;quvchilar: ~{aud.active_students_30d}+</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <h2 className="text-[16px] font-semibold">Creative</h2>
                <Field label="Sarlavha *" htmlFor="tt" hint={`${form.title.length}/255`}>
                  <input id="tt" className={inputCls} maxLength={255} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Tarix intensiv kursi — DTMga 3 oyda tayyorgarlik" />
                </Field>
                <Field label="Tavsif *" htmlFor="dsc">
                  <textarea id="dsc" className={textareaCls} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Taklif nishoni" htmlFor="ob" hint="Masalan: 1-dars bepul">
                    <input id="ob" className={inputCls} maxLength={100} value={form.offer_badge} onChange={(e) => set('offer_badge', e.target.value)} />
                  </Field>
                  <Field label="Tugma matni (CTA)" htmlFor="cta" hint="Masalan: Bepul darsga yozilish">
                    <input id="cta" className={inputCls} maxLength={60} value={form.cta_text} onChange={(e) => set('cta_text', e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <CreativePicker label="Banner" kind="image" value={form.banner} items={creatives} onItems={setCreatives} onChange={(c) => set('banner', c)} />
                  <CreativePicker label="Logo" kind="image" value={form.logo} items={creatives} onItems={setCreatives} onChange={(c) => set('logo', c)} />
                  <CreativePicker label="Video (ixtiyoriy)" kind="video" value={form.video} items={creatives} onItems={setCreatives} onChange={(c) => set('video', c)} />
                </div>
                {creatives.length === 0 && (
                  <p className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]"><ImagePlus className="size-4" /> Fayllarni shu yerdan yoki <Link href="/creatives" className="underline">Creative</Link> bo&apos;limidan yuklang.</p>
                )}
              </div>
              <AdPreview title={form.title} description={form.description} badge={form.offer_badge} cta={form.cta_text}
                bannerUrl={effectiveUrl('banner')} logoUrl={effectiveUrl('logo')} centerName={center.name} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold">Joylashuv</h2>
              <p className="text-[13px] text-[var(--text-muted)]">Tasdiqlangan kampaniya platformadagi mavjud reklama joylarida avtomatik ko&apos;rsatiladi. Joylar alohida tanlanmaydi.</p>
              <ul className="divide-y divide-[var(--border-soft)] rounded-lg border border-[var(--border-card)]">
                {(aud?.placements || []).map((p) => (
                  <li key={p.value} className="flex items-center justify-between px-4 py-3 text-[14px]">
                    {p.label}
                    <span className="text-[12px] text-[var(--success-text)]">{p.available ? 'Faol' : 'Mavjud emas'}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-[var(--text-muted)]">Har bir o&apos;quvchiga bir vaqtda bitta eng mos kampaniya ko&apos;rsatiladi; reklama &quot;Reklama&quot; belgisi bilan chiqadi.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-[16px] font-semibold">Byudjet va muddat</h2>
              <div className="rounded-lg bg-[var(--surface-hover)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                To&apos;lov tizimi hali ulanmagan — kunlik/umumiy pul byudjeti va CPC/CPM narxlash mavjud emas, hech qanday summa yechilmaydi. Byudjet lid limiti bilan cheklanadi: limitga yetganda kampaniya avtomatik to&apos;xtaydi.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Boshlanish" htmlFor="st" hint="Bo'sh — tasdiqlangandan so'ng darhol">
                  <input id="st" type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
                </Field>
                <Field label="Tugash" htmlFor="en" hint="Bo'sh — muddatsiz">
                  <input id="en" type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
                </Field>
                <Field label="Lid limiti" htmlFor="ml" hint="Bo'sh — cheklanmagan">
                  <input id="ml" type="number" min={1} max={100000} className={inputCls} value={form.max_leads} onChange={(e) => set('max_leads', e.target.value)} />
                </Field>
                <Field label="Lidlar uchun Telegram chat ID" htmlFor="tc" hint="Yangi lid xabari shu chatga yuboriladi. Bo'sh — markaz sozlamasidagi chat.">
                  <input id="tc" className={inputCls} value={form.telegram_chat_id} onChange={(e) => set('telegram_chat_id', e.target.value)} placeholder="-1001234567890" />
                </Field>
              </div>
              {stepErrors[4] && <p className="text-[13px] text-[var(--danger-text)]">{stepErrors[4]}</p>}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <h2 className="text-[16px] font-semibold">Ko&apos;rib chiqish</h2>
                <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                  <dt className="text-[var(--text-muted)]">Maqsad</dt><dd>{OBJECTIVE_LABEL[form.objective]}</dd>
                  <dt className="text-[var(--text-muted)]">Fan</dt><dd>{form.target_subject === 'ALL' ? 'Barcha fanlar' : form.target_subject}</dd>
                  <dt className="text-[var(--text-muted)]">Hudud</dt><dd>{form.target_region === 'ALL' ? 'Barcha hududlar' : form.target_region}</dd>
                  <dt className="text-[var(--text-muted)]">Natija chegarasi</dt><dd>{form.max_score_threshold >= 100 ? "Cheklanmagan" : `${form.max_score_threshold}% gacha`}</dd>
                  <dt className="text-[var(--text-muted)]">Muddat</dt><dd>{form.starts_at ? form.starts_at.replace('T', ' ') : 'Tasdiqlangach'} — {form.ends_at ? form.ends_at.replace('T', ' ') : 'muddatsiz'}</dd>
                  <dt className="text-[var(--text-muted)]">Lid limiti</dt><dd>{form.max_leads || 'Cheklanmagan'}</dd>
                  <dt className="text-[var(--text-muted)]">Narx</dt><dd>Billing yo&apos;q — pul yechilmaydi</dd>
                </dl>
                {(stepErrors[2] || stepErrors[4]) && (
                  <ErrorNote message={`Yuborishdan oldin to'ldiring: ${[stepErrors[2], stepErrors[4]].filter(Boolean).join(' ')}`} />
                )}
                <label className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                  <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  Reklama haqqoniy; o&apos;quvchilar ma&apos;lumotlari faqat ariza maqsadida ishlatiladi. Kampaniya administrator tasdiqlagandan keyin ko&apos;rsatiladi.
                </label>
              </div>
              <AdPreview title={form.title} description={form.description} badge={form.offer_badge} cta={form.cta_text}
                bannerUrl={effectiveUrl('banner')} logoUrl={effectiveUrl('logo')} centerName={center.name} />
            </div>
          )}
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => (step === 0 ? router.back() : setStep(step - 1))}>{step === 0 ? 'Bekor qilish' : 'Orqaga'}</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>
              {editing ? 'Saqlash' : 'Qoralama sifatida saqlash'}
            </Button>
            {isLast ? (
              (!editing || initial!.status === 'draft' || initial!.status === 'rejected') && (
                <Button disabled={busy || !agree} onClick={() => save(true)}>Moderatsiyaga yuborish</Button>
              )
            ) : (
              <Button onClick={() => setStep(step + 1)}>Keyingi</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
