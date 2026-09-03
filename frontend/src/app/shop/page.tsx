'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Coins, Crown, Shield, Palette, User, Award, Sparkles,
  CheckCircle2, Loader2, PackageOpen, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { invalidateApi } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import CardMotif, { type MotifKey } from '@/components/student/CardMotif';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Item = {
  id: number; slug: string; name: string; category: string; category_display: string;
  price_coins: number; rarity: string; is_consumable: boolean; is_equippable: boolean;
  owned: boolean; owned_qty: number; equipped: boolean; affordable: boolean;
};

type ShopData = { coins: number; categories: Record<string, Item[]> };

/* Fon naqshining rangi — noyoblik darajasi bo'yicha. Yorliqdagi ranglar bilan bir
   xil oila, shunda karta bir butun bo'lib ko'rinadi. */
const RARITY_MOTIF: Record<string, string> = {
  common: 'text-[var(--text-muted)]',
  rare: 'text-sky-300',
  epic: 'text-purple-300',
  legendary: 'text-amber-300',
};

const RARITY_STYLE: Record<string, string> = {
  common: 'border-transparent bg-[var(--surface-hover)] text-[var(--text-muted)]',
  rare: 'border-sky-500/30 bg-sky-500/12 text-sky-300',
  epic: 'border-purple-500/30 bg-purple-500/12 text-purple-300',
  legendary: 'border-amber-500/30 bg-amber-500/12 text-amber-300',
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
      useAuthStore.setState({ user: await fetchMe() });
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
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="amber"
          eyebrow="Gamifikatsiya do'koni"
          eyebrowIcon={ShoppingBag}
          title="Artefaktlar & Do'kon"
          description="Testlar va arenalarda topgan tangalaringiz evaziga avatar, ramka, unvon va streak himoyasini sotib oling."
          actions={data && (
            <Card className="gap-0 border-yellow-500/25 py-3">
              <CardContent className="flex items-center gap-3 px-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-yellow-500/12 text-yellow-400">
                  <Coins className="size-5" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase text-muted-foreground">Sizdagi tangalar</p>
                  <p className="font-mono text-xl font-black tabular-nums text-yellow-400"><StatNumber value={data.coins} /></p>
                </div>
              </CardContent>
            </Card>
          )}
        />

        {!data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        )}

        {/* Hech narsaga tanga yetmasa — nima qilish kerakligi ko'rsatiladi. */}
        {nothingAffordable && (
          <Card className="border-yellow-500/25 bg-yellow-500/[0.05]">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Coins className="mt-0.5 size-4 shrink-0 text-yellow-400" />
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Tanga yetishmayapti. Tanga <strong className="text-foreground">test yechganda</strong>,{' '}
                  <strong className="text-foreground">arenada g&apos;alaba qozonganda</strong> va{' '}
                  <strong className="text-foreground">mini-o&apos;yinlarda</strong> to&apos;planadi.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm"><Link href="/tests">Test yechish</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/battles">Arena</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {categories.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const Icon = categoryIcon(cat);
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  className={cn('shrink-0 rounded-full', activeTab === cat && 'chip-active')}
                  onClick={() => setActiveTab(cat)}
                >
                  <Icon className="size-3.5" /> {cat}
                </Button>
              );
            })}
          </div>
        )}

        {/* Ustunlar soni mahsulotlar soniga moslashadi — 1-2 ta mahsulot 4 ustunli
            gridda chapga siqilib, o'ng yarmi bo'sh qolmasligi uchun. */}
        <div className={cn('grid gap-4', itemGridCols)}>
          {items.map((item, itemIdx) => {
            const loading = busy === item.slug;
            return (
              <Reveal key={item.id} index={itemIdx} className="h-full">
              {/* Naqsh mahsulot TURINI bildiradi (avatar, ramka, mavzu...). Kartalar
                  bir xil o'lchamdagi to'rtburchaklar bo'lgani uchun ro'yxatda nima
                  nima ekanini faqat matndan ajratishga to'g'ri kelardi. Rang —
                  noyoblik darajasidan (`RARITY_MOTIF`), ya'ni afsonaviy narsa ko'zga
                  darhol tashlanadi. */}
              <Card className="group relative flex h-full flex-col justify-between overflow-hidden text-center transition-colors hover:border-[var(--border-strong)]">
                <CardMotif
                  shape={(item.category as MotifKey) ?? 'shop'}
                  className={RARITY_MOTIF[item.rarity] || RARITY_MOTIF.common}
                />
                <CardContent className="relative flex flex-1 flex-col items-center gap-2 pt-6">
                  <Badge variant="outline" className={RARITY_STYLE[item.rarity] || RARITY_STYLE.common}>
                    {item.rarity}
                  </Badge>
                  <h3 className="text-sm font-semibold leading-snug">{item.name}</h3>
                  <span className="flex items-center gap-1 font-mono text-xs font-semibold text-yellow-400">
                    <Coins className="size-3" /> {item.price_coins.toLocaleString('uz-UZ')}
                  </span>

                  <div className="mt-auto w-full pt-3">
                    {item.owned && !item.is_consumable ? (
                      item.is_equippable ? (
                        item.equipped ? (
                          <Button
                            variant="outline" className="w-full border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--success-text)] hover:bg-[var(--success)]/25 hover:text-[var(--success-text)]"
                            disabled={loading}
                            onClick={() => act(item.slug, 'unequip', item.name)}
                          >
                            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Taqilgan
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" disabled={loading} onClick={() => act(item.slug, 'equip', item.name)}>
                            {loading && <Loader2 className="size-3.5 animate-spin" />} Taqish
                          </Button>
                        )
                      ) : (
                        <Badge variant="outline" className="w-full justify-center border-[var(--success)]/30 bg-[var(--success-soft)] py-2 text-[var(--success-text)]">
                          Sizda bor
                        </Badge>
                      )
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!item.affordable || loading}
                        onClick={() => act(item.slug, 'buy', item.name)}
                      >
                        {loading && <Loader2 className="size-3.5 animate-spin" />}
                        {loading ? 'Sotib olinmoqda' : !item.affordable ? 'Tanga yetarli emas' : item.is_consumable && item.owned ? 'Yana olish' : 'Sotib olish'}
                      </Button>
                    )}
                    {item.owned && item.is_consumable && (
                      <p className="mt-1.5 text-xs text-muted-foreground">Sizda: {item.owned_qty} ta</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              </Reveal>
            );
          })}
        </div>

        {data && items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <PackageOpen className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Bu bo&apos;limda hozircha mahsulot yo&apos;q.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
