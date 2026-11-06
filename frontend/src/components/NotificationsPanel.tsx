'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell, CheckCheck, ChevronRight, Flame, MessageCircle, Swords, Trophy, Gift, X, type LucideIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

/* Bildirishnoma turi bo'yicha rangli doira (pastel palitra) */
function iconFor(n: NotificationItem): { icon: LucideIcon; tone: string } {
  const s = `${n.type} ${n.title}`.toLowerCase();
  if (s.includes('battle') || s.includes('arena') || s.includes('duel') || s.includes('jang')) return { icon: Swords, tone: 'bg-[var(--ps-coral)] text-white' };
  if (s.includes('comment') || s.includes('izoh') || s.includes('reply')) return { icon: MessageCircle, tone: 'bg-[var(--ps-blue)] text-[#080808]' };
  if (s.includes('streak') || s.includes('seriya')) return { icon: Flame, tone: 'bg-[var(--ps-orange)] text-[#080808]' };
  if (s.includes('achievement') || s.includes('badge') || s.includes('yutuq') || s.includes('level')) return { icon: Trophy, tone: 'bg-[var(--ps-green)] text-white' };
  if (s.includes('gift') || s.includes('chest') || s.includes('sovg')) return { icon: Gift, tone: 'bg-[var(--ps-purple)] text-white' };
  return { icon: Bell, tone: 'bg-[var(--ps-purple)] text-white' };
}

/**
 * Bildirishnomalar paneli — istalgan sahifada ochiladi (portal orqali body'ga chiziladi,
 * shuning uchun headerning backdrop-filter'i uni qirqib qo'ymaydi).
 */
export default function NotificationsPanel({
  open,
  onClose,
  onUnreadChange,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  /** Ro'yxat o'zgarganda (o'qildi deb belgilanganda) chaqiriladi. */
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notifications: NotificationItem[]; unread_count: number }>('/api/dashboard/notifications/');
      setItems(res.notifications || []);
      setUnread(res.unread_count || 0);
      onUnreadChange?.(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function markAll() {
    try {
      await apiFetch('/api/dashboard/notifications/', { method: 'POST', body: JSON.stringify({ action: 'mark_all_read' }) });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
      onUnreadChange?.(0);
      onChanged?.();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }

  async function markOne(id: number) {
    try {
      await apiFetch('/api/dashboard/notifications/', { method: 'POST', body: JSON.stringify({ id }) });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      const next = Math.max(0, unread - 1);
      setUnread(next);
      onUnreadChange?.(next);
      onChanged?.();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ps-shell fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-[#0B0814]/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Bildirishnomalar"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute right-3 top-[72px] w-[calc(100vw-1.5rem)] max-w-sm origin-top-right overflow-hidden rounded-[30px] bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[0_30px_60px_-24px_rgba(40,20,80,0.6)] sm:right-8 sm:w-[400px]"
          >
            {/* Sarlavha */}
            <div className="relative overflow-hidden bg-[var(--ps-purple)] px-5 pb-4 pt-5 text-white">
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
              <span aria-hidden className="absolute -bottom-8 right-20 size-14 rounded-full bg-[var(--ps-orange)] opacity-80" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[var(--ps-purple)]">
                    <Bell className="size-5" />
                  </span>
                  <div>
                    <h3 className="ps-display text-[20px] text-white">Bildirishnomalar</h3>
                    <p className="text-[12px] font-semibold text-white/80">
                      {unread > 0 ? `${unread} ta yangi` : "Hammasi o'qilgan"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Yopish"
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/15 transition-colors hover:bg-black/30"
                >
                  <X className="size-4" />
                </button>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="relative mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--ps-purple)] transition-transform hover:-translate-y-0.5"
                >
                  <CheckCheck className="size-3.5" /> Barchasini o&apos;qildi deb belgilash
                </button>
              )}
            </div>

            {/* Ro'yxat */}
            <div className="max-h-[min(400px,60svh)] space-y-2 overflow-y-auto p-3">
              {loading && items.length === 0 ? (
                <>
                  <Skeleton className="h-16 w-full rounded-[20px]" />
                  <Skeleton className="h-16 w-full rounded-[20px]" />
                </>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 rounded-[22px] bg-[var(--ps-neutral)] p-8 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[var(--text-muted)]">
                    <Bell className="size-5" />
                  </span>
                  <p className="text-[14px] font-bold">Yangi bildirishnoma yo&apos;q</p>
                  <p className="max-w-[240px] text-[12px] text-[var(--text-muted)]">
                    Hamjamiyatda post yozing, darslarni bajaring yoki bellashuvlarda qatnashing!
                  </p>
                </div>
              ) : (
                items.map((n) => {
                  const { icon: Icon, tone } = iconFor(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !n.is_read && markOne(n.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-3 rounded-[20px] p-3 text-left transition-colors',
                        n.is_read ? 'bg-[var(--ps-neutral)] opacity-75 hover:opacity-100' : 'bg-[var(--ps-neutral)] ring-2 ring-[var(--ps-lilac)]'
                      )}
                    >
                      <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full', tone)}>
                        <Icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13.5px] font-bold">{n.title}</span>
                          {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-[var(--ps-coral)]" />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-[var(--text-secondary)]">{n.message}</span>
                        {n.created_at && <span className="mt-1 block font-mono text-[10.5px] text-[var(--text-faint)]">{n.created_at}</span>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-[var(--border-card)] p-3">
              <Link
                href="/feed"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#080808] px-4 py-2.5 text-[12.5px] font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5 dark:bg-[#FFFCF7] dark:text-[#080808]"
              >
                Hamjamiyat muhokamalariga o&apos;tish <ChevronRight className="size-4 text-[var(--ps-orange)]" />
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
