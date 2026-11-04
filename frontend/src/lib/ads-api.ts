import { apiFetch, apiUpload, apiFetchBlob } from './api-client';

/* Ads Manager API (/api/v1/advertiser/...). Barcha raqamlar backenddagi haqiqiy
   hodisalardan; `null` — o'lchanmaydi yoki ma'lumot yo'q (UI "N/A" ko'rsatadi). */

const BASE = '/api/v1/advertiser';

export type CenterStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type Center = {
  id: number;
  name: string;
  status: CenterStatus;
  review_note: string;
  city_or_region: string;
  phone: string;
  contact_name: string;
  contact_email: string;
  website: string;
  description: string;
  logo_url: string;
  telegram_username: string;
  telegram_chat_id: string;
  notify_new_leads: boolean;
  created_at: string | null;
  reviewed_at: string | null;
};

export type AdsUser = { id: number; username: string; first_name: string; last_name: string; email: string };

export type CampaignStatus =
  | 'draft' | 'pending_review' | 'rejected' | 'scheduled' | 'active' | 'paused' | 'ended' | 'exhausted';

export type CampaignMetrics = {
  impressions: number;
  clicks: number;
  ctr: number | null;
  leads: number;
  enrolled: number;
  conversion_rate: number | null;
  remaining_leads: number | null;
  spend: null;
  cpl: null;
};

export type Objective = 'leads' | 'course' | 'center' | 'event' | 'other';

export type Campaign = {
  id: number;
  title: string;
  status: CampaignStatus;
  review_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  review_note: string;
  is_active: boolean;
  objective: Objective;
  target_subject: string;
  target_region: string;
  starts_at: string | null;
  ends_at: string | null;
  max_leads: number | null;
  banner_url: string;
  logo: string;
  created_at: string | null;
  updated_at: string | null;
  metrics: CampaignMetrics;
  // detail
  description?: string;
  offer_badge?: string;
  cta_text?: string;
  max_score_threshold?: number;
  story_video_url?: string;
  telegram_chat_id?: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  ended_manually_at?: string | null;
};

export type PeriodMetrics = {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number | null;
  leads: number;
  enrolled: number;
  conversion_rate: number | null;
  spend: null;
  cpl: null;
};

export type SeriesPoint = { date: string; impressions: number; reach: number; clicks: number; leads: number; enrolled: number };

export type LeadStatus = 'NEW' | 'CONTACTED' | 'ENROLLED' | 'REJECTED';

export type Lead = {
  id: number;
  campaign_id: number | null;
  campaign_title: string;
  full_name: string;
  phone_number: string;
  telegram_username: string;
  pii_visible: boolean;
  status: LeadStatus;
  created_at: string;
  status_changed_at: string | null;
  weakest_topics?: string;
  predicted_dtm_score?: string;
  consent_at?: string | null;
  guardian_confirmed?: boolean;
  note?: string;
};

export type Creative = {
  id: number;
  kind: 'image' | 'video';
  url: string;
  original_name: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string | null;
  used_by: { id: number; title: string }[];
};

export type Audiences = {
  active_students_30d: number | null;
  subjects: { value: string }[];
  regions: { value: string; approx_size: number }[];
  any_value: string;
  score_threshold: { min: number; max: number; help: string };
  placements: { value: string; label: string; available: boolean }[];
  min_bucket: number;
};

export type DashboardData = {
  range: { from: string; to: string };
  center: Center;
  totals: PeriodMetrics;
  active_campaigns: number;
  status_summary: Partial<Record<CampaignStatus, number>>;
  remaining_leads: number | null;
  series: SeriesPoint[];
  recent_leads: Lead[];
  top_campaigns: Campaign[];
  tracking_since: string | null;
  billing_available: boolean;
};

export type AnalyticsData = {
  range: { from: string; to: string };
  totals: PeriodMetrics;
  series: SeriesPoint[];
  comparison: ({ id: number; title: string; status: CampaignStatus } & PeriodMetrics)[];
  tracking_since: string | null;
  definitions: Record<string, string>;
};

export type CampaignInput = Partial<{
  title: string;
  description: string;
  offer_badge: string;
  cta_text: string;
  objective: Objective;
  target_subject: string;
  target_region: string;
  max_score_threshold: number;
  starts_at: string | null;
  ends_at: string | null;
  max_leads: number | null;
  banner_creative_id: number | null;
  logo_creative_id: number | null;
  video_creative_id: number | null;
  telegram_chat_id: string;
}>;

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const json = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

export const adsApi = {
  me: () => apiFetch<{ user: AdsUser; center: Center | null }>(`${BASE}/me/`),
  apply: (body: Record<string, unknown>) =>
    apiFetch<{ success: true; center: Center; user: AdsUser; access?: string; refresh?: string }>(`${BASE}/apply/`, json(body)),
  profile: () => apiFetch<{ center: Center }>(`${BASE}/profile/`),
  updateProfile: (body: Partial<Center>) => apiFetch<{ center: Center }>(`${BASE}/profile/`, json(body, 'PATCH')),
  dashboard: (from?: string, to?: string) => apiFetch<DashboardData>(`${BASE}/dashboard/${qs({ from, to })}`),
  campaigns: (params: { q?: string; status?: string } = {}) =>
    apiFetch<{ campaigns: Campaign[]; summary: Partial<Record<CampaignStatus, number>>; total: number }>(`${BASE}/campaigns/${qs(params)}`),
  campaign: (id: number | string) => apiFetch<{ campaign: Campaign }>(`${BASE}/campaigns/${id}/`),
  createCampaign: (body: CampaignInput) => apiFetch<{ campaign: Campaign }>(`${BASE}/campaigns/`, json(body)),
  updateCampaign: (id: number, body: CampaignInput) =>
    apiFetch<{ campaign: Campaign; message: string }>(`${BASE}/campaigns/${id}/`, json(body, 'PATCH')),
  campaignAction: (id: number, action: 'submit' | 'pause' | 'resume' | 'end' | 'duplicate') =>
    apiFetch<{ campaign: Campaign }>(`${BASE}/campaigns/${id}/${action}/`, { method: 'POST' }),
  creatives: () =>
    apiFetch<{ creatives: Creative[]; limits: { image_max_bytes: number; video_max_bytes: number; image_formats: string[]; video_formats: string[] } }>(`${BASE}/creatives/`),
  uploadCreative: (file: File, kind: 'image' | 'video') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    return apiUpload<{ creative: Creative }>(`${BASE}/creatives/`, fd);
  },
  deleteCreative: (id: number) => apiFetch<{ success: true }>(`${BASE}/creatives/${id}/`, { method: 'DELETE' }),
  audiences: () => apiFetch<Audiences>(`${BASE}/audiences/`),
  leads: (params: { q?: string; status?: string; campaign?: string | number; from?: string; to?: string; page?: number } = {}) =>
    apiFetch<{ leads: Lead[]; total: number; page: number; page_size: number; status_counts: Record<LeadStatus, number> }>(`${BASE}/leads/${qs(params)}`),
  lead: (id: number) => apiFetch<{ lead: Lead }>(`${BASE}/leads/${id}/`),
  updateLead: (id: number, body: { status?: LeadStatus; note?: string }) =>
    apiFetch<{ lead: Lead }>(`${BASE}/leads/${id}/status/`, json(body)),
  exportLeads: (params: { status?: string; campaign?: string | number; from?: string; to?: string }) =>
    apiFetchBlob(`${BASE}/leads/export/${qs({ ...params, confirm: 1 })}`),
  analytics: (params: { from?: string; to?: string; campaign?: string | number }) =>
    apiFetch<AnalyticsData>(`${BASE}/analytics/${qs(params)}`),
  billing: () => apiFetch<{ available: boolean; reason: string; budget_model: string; budget_help: string }>(`${BASE}/billing/`),
};

// ─── Formatlash ────────────────────────────────────────────────────────────────

export const NA = 'N/A';

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return NA;
  return new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ');
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return NA;
  return `${n.toFixed(2).replace(/\.?0+$/, '')}%`;
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  if (!withTime) return date;
  return `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Qoralama',
  pending_review: "Ko'rib chiqilmoqda",
  rejected: 'Rad etilgan',
  scheduled: 'Rejalashtirilgan',
  active: 'Faol',
  paused: "To'xtatilgan",
  ended: 'Yakunlangan',
  exhausted: 'Lid limiti tugagan',
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'Yangi',
  CONTACTED: "Bog'lanildi",
  ENROLLED: "Ro'yxatdan o'tdi",
  REJECTED: 'Rad etildi',
};

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  leads: "Lid yig'ish",
  course: "Kursni targ'ib qilish",
  center: "Markazni targ'ib qilish",
  event: 'Tadbir',
  other: 'Boshqa',
};
