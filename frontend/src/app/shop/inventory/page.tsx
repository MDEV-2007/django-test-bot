'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Snowflake, Backpack, Loader2, History, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetchMe } from '@/lib/api-client';
import { invalidateApi } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type InventoryData = {
  coins: number; freeze_count: number;
  items: { id: number; slug: string; name: string; category: string; quantity: number; equipped: boolean; is_equippable: boolean }[];
  history: { item_name: string; coins_spent: number; quantity: number; created_at: string }[];
  freeze_logs: { created_at: string; streak_saved: number }[];
};

export default function InventoryPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<InventoryData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => apiFetch<InventoryData>('/api/shop/inventory/').then(setData)
    .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleEquip(slug: string, equipped: boolean, name: string) {
    setBusy(slug);
    try {
      await apiFetch(`/api/shop/${equipped ? 'unequip' : 'equip'}/${slug}/`, { method: 'POST' });
      toast.success(equipped ? `${name} yechildi` : `${name} taqildi`);
      await load();
      // Taqilgan bezak qobiqdagi avatarga ham ta'sir qiladi — profilni yangilaymiz.
      useAuthStore.setState({ user: await fetchMe() });
      invalidateApi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          eyebrow="Sizning kolleksiyangiz"
          eyebrowIcon={Backpack}
          title="Inventar"
          description="Sotib olingan artefaktlar, streak muzlatishlar va xarid tarixi."
          actions={
            <Button asChild variant="outline">
              <Link href="/shop"><ShoppingBag className="size-4" /> Do&apos;konga</Link>
            </Button>
          }
        />

        {!data && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3.5">
              <Card className="gap-0 py-4">
                <CardContent className="flex items-center gap-3 px-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-yellow-500/12 text-yellow-400">
                    <Coins className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tangalar</p>
                    <p className="font-mono text-lg font-bold tabular-nums text-yellow-400">{data.coins.toLocaleString('uz-UZ')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="gap-0 py-4">
                <CardContent className="flex items-center gap-3 px-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-300">
                    <Snowflake className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Streak muzlatish</p>
                    <p className="font-mono text-lg font-bold tabular-nums text-sky-300">{data.freeze_count} ta</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <section className="space-y-3">
              <h2 className="section-title">Sizdagi artefaktlar</h2>
              {data.items.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Backpack className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Hali hech narsa sotib olinmagan.</p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/shop">Do&apos;konni ochish</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.items.map((i) => (
                    <Card key={i.id} className="gap-0 py-4">
                      <CardContent className="space-y-2 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{i.name}</p>
                          {i.equipped && (
                            <Badge variant="outline" className="border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success-text)]">
                              Taqilgan
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {i.quantity > 1 ? `${i.quantity} ta` : i.equipped ? 'Hozir ishlatilmoqda' : 'Egalik qilinadi'}
                        </p>
                        {i.is_equippable && (
                          <Button
                            size="sm"
                            variant={i.equipped ? 'outline' : 'default'}
                            className="w-full"
                            disabled={busy === i.slug}
                            onClick={() => toggleEquip(i.slug, i.equipped, i.name)}
                          >
                            {busy === i.slug && <Loader2 className="size-3.5 animate-spin" />}
                            {i.equipped ? 'Yechish' : 'Taqish'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><History className="size-4" /> Xarid tarixi</CardTitle>
              </CardHeader>
              <CardContent>
                {data.history.length === 0 && <p className="py-4 text-sm text-muted-foreground">Hali xarid qilinmagan.</p>}
                {data.history.map((h, i) => (
                  <div key={i}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{h.item_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-sm text-[var(--danger-text)]">
                        −{h.coins_spent} <Coins className="size-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {data.freeze_logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Snowflake className="size-4 text-sky-300" /> Streak muzlatish tarixi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.freeze_logs.map((f, i) => (
                    <div key={i}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">{new Date(f.created_at).toLocaleDateString('uz-UZ')}</span>
                        <span className="font-mono text-[var(--text-secondary)]">{f.streak_saved} kunlik streak saqlandi</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
