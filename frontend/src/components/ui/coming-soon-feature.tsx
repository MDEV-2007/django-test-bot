'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Send, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';

interface ComingSoonFeatureProps {
  featureKey?: string;
  title?: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
}

export default function ComingSoonFeature({
  title = "Yangi Bo'lim",
  description = "Ushbu innovatsion ta'lim moduli ustida qizg'in ish olib borilmoqda. IlmIldizi 2.0 katta yangilanishida taqdim etiladi.",
  badge = 'IlmIldizi 2.0',
  children,
}: ComingSoonFeatureProps) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.is_superadmin;

  // Agar Super Admin bo'lsa va sahifaning o'z bolasi (children) uzatilgan bo'lsa,
  // tepada ogohlantirish ko'rsatib, sahifaning asl kontentini ochib berish
  if (isSuperAdmin && children) {
    return (
      <>
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              <strong>Super Admin Beta Rejimi:</strong> Bu modul oddiy o&apos;quvchilar uchun yopilgan, lekin siz test qila olasiz.
            </span>
          </div>
          <Link
            href="/panel/features"
            className="rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-800 transition-colors hover:bg-amber-500/30 dark:text-amber-200"
          >
            Boshqarish →
          </Link>
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex min-h-[85vh] flex-col items-center justify-center p-4 text-center">
        <div className="relative max-w-lg space-y-6 rounded-3xl border border-primary/20 bg-gradient-to-b from-card/80 to-card/40 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Orqa nur effekti */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary"
            >
              <Sparkles className="size-3.5 animate-pulse" />
              {badge} Relizi
            </Badge>
          </div>

          <div className="space-y-3">
            <h1 className="font-voice text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {title} — Tez Kunda! 🚀
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground">💡 Nega bu sahifa hozir yopiq?</p>
            <p className="mt-1">
              Biz platforma barqarorligi va yuqori tezligini ta&apos;minlash maqsadida yangi funksiyalarni bosqichma-bosqich sinovdan o&apos;tkazmoqdamiz.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="default" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Bosh sahifaga qaytish
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href="https://t.me/ilmildizi" target="_blank" rel="noopener noreferrer">
                <Send className="size-4 text-sky-500" />
                Telegramda yangiliklar
              </a>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
