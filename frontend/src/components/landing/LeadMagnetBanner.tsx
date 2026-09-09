'use client';

import { FileDown, Send, CheckCircle2, Gift } from 'lucide-react';

const BOT_PDF_URL = 'https://t.me/ilmildiziuz_bot?start=pdf_gift';

export default function LeadMagnetBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/60 p-6 sm:p-10 shadow-lg">
        {/* Orqa fon bezagi */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-72 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-900">
              <Gift className="size-3.5 text-emerald-700" />
              Bepul sovg&apos;a abituriyentlarga
            </div>

            <h3 className="font-voice mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              2026-yilgi namunaviy savollar to&apos;plamini (PDF) bepul oling
            </h3>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
              Milliy sertifikat va DTM formati bo&apos;yicha 50 ta tahlilli namunaviy test, to&apos;g&apos;ri yechish sirlari va AI tavsiyalarini o&apos;z ichiga olgan qo&apos;llanma.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600" /> 50 ta tahlilli savol
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600" /> Bepul PDF formatda
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600" /> Rasmiy imtihon andozasi
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <a
              href={BOT_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FileDown className="size-4.5" />
              <span>Telegram botdan yuklab olish</span>
              <Send className="size-4 ml-0.5 text-emerald-200" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
