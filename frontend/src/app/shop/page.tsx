'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Coins, Crown, Shield, Palette, User, Award, Sparkles,
  CheckCircle2, Loader2, PackageOpen, ArrowUpRight, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { invalidateApi } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCompact } from '@/lib/utils';

type Item = {
  id: number; slug: string; name: string; category: string; category_display: string;
  price_coins: number; rarity: string; is_consumable: boolean; is_equippable: boolean;
  owned: boolean; owned_qty: number; equipped: boolean; affordable: boolean;
  description?: string;
};

type ShopData = { coins: number; categories: Record<string, Item[]> };

/* Noyoblik darajasi — kartaning rangli "sahnasi" */
const RARITY: Record<string, { label: string; stage: string; chip: string }> = {
  common: { label: 'Oddiy', stage: 'bg-[var(--ps-blue)] text-[#080808]', chip: 'bg-black/10 text-[#080808]' },
  rare: { label: 'Noyob', stage: 'bg-[var(--ps-green)] text-white', chip: 'bg-white/20 text-white' },
  epic: { label: 'Epik', stage: 'bg-[var(--ps-purple)] text-white', chip: 'bg-white/20 text-white' },
  legendary: { label: 'Afsonaviy', stage: 'bg-[var(--ps-orange)] text-[#080808]', chip: 'bg-[#080808] text-[var(--ps-orange)]' },
};

function categoryIcon(cat: string): LucideIcon {
  const c = cat.toLowerCase();
  if (c.includes('unvon')) return Crown;
  if (c.includes('ramka') || c.includes('himoya') || c.includes('muzlatish') || c.includes('qalqon')) return Shield;
  if (c.includes('mavzu') || c.includes('tema')) return Palette;
  if (c.includes('avatar')) return User;
  if (c.includes('nishon')) return Award;
  return Sparkles;
}

export default function ShopPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<ShopData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const load = () => apiFetch<ShopData>('/api/shop/').then((d) => {
    setData(d);
    /* Birinchi ko'rinadigan bo'lim — foydalanuvchi HALI SOTIB OLA OLADIGAN yoki
       allaqachon egasi bo'lgan narsa bor kategoriya. Aks holda eng arzon kategoriya
       birinchi ko'rsatiladi (odatda katalog tartibidagi eng qimmat "consumable" emas) —
       aks holda yangi foydalanuvchi ikkita "Tanga yetarli emas" tugmasidan boshqa
       hech narsa ko'rmaydi. */
    const cats = Object.keys(d.categories);
    const affordableCat = cats.find((cat) => d.categories[cat].some((i) => i.affordable || i.owned));
    const cheapestCat = [...cats].sort((a, b) => {
      const minA = Math.min(...d.categories[a].map((i) => i.price_coins));
      const minB = Math.min(...d.categories[b].map((i) => i.price_coins));
      return minA - minB;
    })[0];
    setActiveTab((prev) => prev ?? affordableCat ?? cheapestCat ?? cats[0] ?? null);
  }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(slug: string, action: 'buy' | 'equip' | 'unequip', name: string) {
    setBusy(slug);
    try {
      const res = await apiFetch<{ ok: boolean; error?: string }>(`/api/shop/${action}/${slug}/`, { method: 'POST' });
      if (!res.ok) {
        toast.error(res.error || 'Xatolik');
      } else {
        toast.success(action === 'buy' ? `${name} sotib olindi` : action === 'equip' ? `${name} taqildi` : `${name} yechildi`);
      }
      await load();
      /* Tanga balansi, avatar va ramka butun qobiqda (sidebar, tab-bar) ko'rinadi —
         sotib olish yoki taqishdan keyin ular darhol yangilanishi kerak, aks holda
         o'zgarish faqat sahifa qayta yuklanganda sezilardi. */
      if (res && 'profile' in res && res.profile) {
        useAuthStore.getState().setUser(res.profile as any);
      } else {
        const me = await fetchMe();
        useAuthStore.getState().setUser(me);
      }
      invalidateApi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  const categories = data ? Object.keys(data.categories) : [];
  const items = activeTab && data ? data.categories[activeTab] || [] : [];
  const nothingAffordable = data && items.length > 0 && !items.some((i) => i.affordable || i.owned);
  const itemGridCols =
    items.length === 1 ? 'max-w-xs'
    : items.length === 2 ? 'sm:grid-cols-2 max-w-2xl'
    : items.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3'
    : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 p-4 pb-28 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* 1. Hero + balans */}
          <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-orange)] opacity-20" />
              <span aria-hidden className="ps-dots pointer-events-none absolute bottom-5 right-6 hidden h-16 w-28 opacity-30 xl:block" />
              <span className="ps-chip relative">
                <ShoppingBag className="size-3.5 text-[var(--ps-orange)]" /> Gamifikatsiya do&apos;koni
              </span>
              <h1 className="ps-display relative mt-5 text-[42px] sm:text-[56px]">
                Artefaktlar{' '}
                <span className="whitespace-nowrap">
                  <span className="text-[var(--ps-orange)]">do&apos;koni</span>
                  <span className="text-[var(--ps-coral)]">.</span>
                </span>
              </h1>
              <p className="relative mt-4 max-w-lg text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Testlar va arenalarda topgan tangalaringiz evaziga avatar, ramka, unvon va streak himoyasini sotib oling.
              </p>
              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link href="/shop/inventory" className="ps-btn ps-btn-ink">
                  <PackageOpen className="size-4 text-[var(--ps-orange)]" />
                  Mening buyumlarim
                  <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                </Link>
              </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-orange)] opacity-90" />
              <span aria-hidden className="absolute -bottom-10 -left-8 size-28 rounded-full bg-[var(--ps-purple)] opacity-70" />
              <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                <Coins className="size-6" />
              </span>
              <div className="relative mt-8">
                <p className="ps-eyebrow opacity-60">Sizdagi tangalar</p>
                <p className="ps-num mt-2 text-[52px] leading-none sm:text-[60px]">
                  {data ? <span title={data.coins.toLocaleString('uz-UZ')}>{formatCompact(data.coins)}</span> : '—'}
                </p>
              </div>
            </div>
          </section>

          {!data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-[28px]" />)}
            </div>
          )}

          {/* 2. Tanga yetmasa — yo'l-yo'riq */}
          {nothingAffordable && (
            <section className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] bg-[var(--ps-orange)] p-5 text-[#080808] sm:flex-row sm:items-center sm:justify-between">
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/25" />
              <div className="relative flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
                  <Coins className="size-5" />
                </span>
                <p className="text-[13.5px] font-semibold leading-relaxed">
                  Tanga yetishmayapti. Tanga <strong>test yechganda</strong>, <strong>arenada g&apos;alaba qozonganda</strong> va{' '}
                  <strong>mini-o&apos;yinlarda</strong> to&apos;planadi.
                </p>
              </div>
              <div className="relative flex shrink-0 gap-2">
                <Link href="/tests" className="ps-btn ps-btn-ink !min-h-10 !px-4 !text-[13px]">Test yechish</Link>
                <Link href="/battles" className="ps-btn ps-btn-light !min-h-10 !px-4 !text-[13px]">Arena</Link>
              </div>
            </section>
          )}

          {/* 3. Kategoriyalar */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const Icon = categoryIcon(cat);
                const active = activeTab === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTab(cat)}
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-bold transition-all',
                      active
                        ? 'bg-[#080808] text-[#FFFCF7] shadow-[0_10px_22px_-12px_rgba(8,8,8,0.7)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                        : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:text-[var(--text-primary)]'
                    )}
                  >
                    <span className={cn('inline-flex size-7 items-center justify-center rounded-full', active ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-neutral)] text-[var(--ps-orange)]')}>
                      <Icon className="size-3.5" />
                    </span>
                    {cat}
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] tabular-nums', active ? 'bg-white/15 dark:bg-black/10' : 'bg-[var(--ps-neutral)]')}>
                      {data?.categories[cat]?.length ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 4. Mahsulotlar */}
          <div className={cn('grid gap-4', itemGridCols)}>
            {items.map((item, itemIdx) => {
              const loading = busy === item.slug;
              const isPremiumUnlock = item.slug === 'premium_test_unlock';
              const r = RARITY[item.rarity] || RARITY.common;
              const Icon = isPremiumUnlock ? Crown : categoryIcon(activeTab || item.category_display || item.category);
              return (
                <Reveal key={item.id} index={itemIdx} className="h-full">
                  <div className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-[var(--ps-paper)] shadow-[var(--ds-panel-shadow)] transition-transform duration-300 hover:-translate-y-1">
                    {/* Sahna */}
                    <div className={cn('relative flex h-36 items-center justify-center overflow-hidden', r.stage)}>
                      <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
                      <span aria-hidden className="absolute -bottom-10 -left-6 size-24 rounded-full bg-black/10" />
                      <span aria-hidden className="ps-dots absolute inset-0 opacity-20" />
                      <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', r.chip)}>
                        {r.label}
                      </span>
                      {isPremiumUnlock && (
                        <span className="absolute right-3 top-3 rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-[var(--ps-orange)]">Bir martalik</span>
                      )}
                      {item.owned && !isPremiumUnlock && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-[#FFFCF7]">
                          <CheckCircle2 className="size-3" /> Sizda bor
                        </span>
                      )}
                      <span className="relative inline-flex size-[72px] items-center justify-center rounded-full border-4 border-white/60 bg-black/15 shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                        <Icon className="size-8" />
                      </span>
                    </div>

                    {/* Matn */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-[16.5px] font-bold leading-snug text-[var(--text-primary)]">{item.name}</h3>
                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--text-muted)]">{item.description}</p>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="ps-num inline-flex items-center gap-1.5 text-[24px] leading-none text-[var(--text-primary)]">
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                            <Coins className="size-3.5" />
                          </span>
                          {item.price_coins.toLocaleString('uz-UZ')}
                        </span>
                        {item.owned && item.is_consumable && (
                          <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11.5px] font-bold">Sizda: {item.owned_qty} ta</span>
                        )}
                      </div>

                      <div className="mt-auto pt-4">
                        {item.owned && !item.is_consumable ? (
                          item.is_equippable ? (
                            item.equipped ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => act(item.slug, 'unequip', item.name)}
                                className="ps-btn !min-h-11 w-full bg-[var(--ps-green)] text-white"
                              >
                                {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                Taqilgan
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => act(item.slug, 'equip', item.name)}
                                className="ps-btn ps-btn-ghost !min-h-11 w-full"
                              >
                                {loading && <Loader2 className="size-4 animate-spin" />} Taqish
                              </button>
                            )
                          ) : (
                            <div className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--ps-green)] text-[13px] font-bold text-white">
                              <CheckCircle2 className="size-4" />
                              {isPremiumUnlock ? 'Ochilgan (sizda bor)' : 'Sizda bor'}
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={!item.affordable || loading}
                            onClick={() => act(item.slug, 'buy', item.name)}
                            className={cn(
                              'ps-btn !min-h-11 w-full',
                              item.affordable ? 'ps-btn-ink' : 'cursor-not-allowed bg-[var(--ps-neutral)] text-[var(--text-muted)] !opacity-100'
                            )}
                          >
                            {loading && <Loader2 className="size-4 animate-spin" />}
                            {loading ? 'Sotib olinmoqda' : !item.affordable ? 'Tanga yetarli emas' : isPremiumUnlock ? '100 tangaga ochish' : item.is_consumable && item.owned ? 'Yana olish' : 'Sotib olish'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {data && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-paper)] p-10 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-muted)]">
                <PackageOpen className="size-6" />
              </span>
              <p className="text-[13.5px] text-[var(--text-muted)]">Bu bo&apos;limda hozircha mahsulot yo&apos;q.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
