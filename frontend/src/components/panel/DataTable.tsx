'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge as UiBadge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export type FilterConfig = {
  param: string;
  label: string;
  options: { value: string; label: string }[];
};

export type BulkAction = { value: string; label: string };

type ListResponse<T> = {
  results: T[]; count: number; page: number; num_pages: number;
  has_next: boolean; has_previous: boolean; [k: string]: unknown;
};

/* Select'da bo'sh string qiymat ishlatib bo'lmaydi (Radix uni "tanlanmagan" deb biladi),
   shuning uchun "hammasi" varianti shu sentinel bilan belgilanadi va so'rovga qo'shilmaydi. */
const ALL = '__all__';

export default function DataTable<T extends { id: number }>({
  endpoint, columns, onRowClick, searchable = true, extraQuery = '',
  filters, bulkActions, bulkEndpoint,
}: {
  endpoint: string;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  extraQuery?: string;
  filters?: FilterConfig[];
  bulkActions?: BulkAction[];
  bulkEndpoint?: string;
}) {
  const { access } = useAuthStore();
  const [data, setData] = useState<ListResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Qidiruvni debounce qilamiz — ilgari har bosilgan harf uchun so'rov ketardi.
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!access) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), q,
      ...(extraQuery ? Object.fromEntries(new URLSearchParams(extraQuery)) : {}),
      ...Object.fromEntries(Object.entries(filterValues).filter(([, v]) => v !== '' && v !== ALL)),
    });
    apiFetch<ListResponse<T>>(`${endpoint}?${params.toString()}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, endpoint, page, q, extraQuery, filterValues, refreshKey]);

  const colCount = columns.length + (bulkActions?.length ? 1 : 0);
  const allSelected = useMemo(
    () => !!data && data.results.length > 0 && data.results.every((r) => selected.has(r.id)),
    [data, selected],
  );

  function toggleSelect(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    setSelected(allSelected ? new Set() : new Set(data.results.map((r) => r.id)));
  }

  async function runBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    setBusy(true);
    try {
      await apiFetch(bulkEndpoint || endpoint, {
        method: 'POST',
        body: JSON.stringify({ action: bulkAction, selected: Array.from(selected) }),
      });
      setSelected(new Set());
      setBulkAction('');
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {(searchable || filters?.length) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Qidirish..."
                className="pl-9"
              />
            </div>
          )}
          {filters?.map((f) => (
            <Select
              key={f.param}
              value={filterValues[f.param] || ALL}
              onValueChange={(v) => { setFilterValues((prev) => ({ ...prev, [f.param]: v })); setPage(1); }}
            >
              <SelectTrigger className="w-auto min-w-36">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{f.label}: hammasi</SelectItem>
                {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              Jami: <span className="font-medium text-foreground">{data.count}</span>
            </span>
          )}
        </div>
      )}

      {!!bulkActions?.length && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-primary/10 px-3 py-2">
          <span className="text-sm font-medium text-[var(--accent-text)]">{selected.size} ta tanlandi</span>
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger size="sm" className="w-auto min-w-40">
              <SelectValue placeholder="Amalni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {bulkActions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={runBulkAction} disabled={!bulkAction || busy}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Bajarish
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bekor qilish</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {!!bulkActions?.length && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Hammasini tanlash" />
                  </TableHead>
                )}
                {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-32" /></TableCell>
                  ))}
                </TableRow>
              ))}

              {data?.results.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && 'cursor-pointer')}
                  data-state={selected.has(row.id) ? 'selected' : undefined}
                >
                  {!!bulkActions?.length && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label="Qatorni tanlash"
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => <TableCell key={c.key}>{c.render(row)}</TableCell>)}
                </TableRow>
              ))}

              {data && data.results.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="py-12 text-center">
                    <Inbox className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {q ? `"${q}" bo'yicha hech narsa topilmadi.` : "Ma'lumot yo'q."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data && data.num_pages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {data.page}-sahifa / {data.num_pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.has_previous} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>
              Keyingi <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Mavjud 13 ta sahifa shu Badge'ni `tone` bilan chaqiradi — API o'zgarmadi, faqat ichi
   shadcn Badge'ga o'tkazildi. */
export function Badge({ text, tone = 'slate' }: { text: string; tone?: string }) {
  const map: Record<string, string> = {
    slate: 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-transparent',
    green: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
    blue: 'bg-primary/12 text-[var(--accent-text)] border-[var(--accent-border)]',
    amber: 'bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25',
    rose: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
    gray: 'bg-[var(--surface-hover)] text-[var(--text-faint)] border-transparent',
  };
  return <UiBadge variant="outline" className={map[tone] || map.slate}>{text}</UiBadge>;
}
