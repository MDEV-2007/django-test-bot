'use client';

import Link from 'next/link';
import { Send, ArrowRight, Sprout, CheckCircle2 } from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export default function FinalEditorialCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-8 sm:p-14 text-center shadow-lg">
        {/* Soft background ambient glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-80 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-80 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-xs mb-6">
            <Sprout className="size-6 text-emerald-600" />
          </span>

          <h2 className="font-voice text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Imtihonda har bir ball — hisoblangan.{' '}
            <span className="text-emerald-600">
              Bugunoq boshlang.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Kechiktirish — bu imtihonda o&apos;z o&apos;rningizni boshqaga berish degani. Hoziroq 10 ta savolli tezkor diagnostikani yeching va zaif mavzuingizni aniqlang.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-13 px-8 text-base shadow-[0_8px_24px_rgba(5,150,105,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Bepul boshlash <ArrowRight className="size-4" />
            </Link>

            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold h-13 px-6 text-base shadow-xs transition-all"
            >
              <Send className="size-4 text-sky-600" /> Telegram bot
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Karta kiritish talab etilmaydi
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Telegram orqali 5 soniyada
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
