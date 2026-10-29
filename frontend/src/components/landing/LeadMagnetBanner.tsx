'use client';

import { FileDown, Send, CheckCircle2, BookOpen } from 'lucide-react';

const BOT_PDF_URL = 'https://t.me/ilmildiziuz_bot?start=pdf_gift';

export default function LeadMagnetBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-black/[0.07] bg-white p-6 sm:p-10 shadow-[0_6px_30px_-4px_rgba(0,0,0,0.05)]">
        {/* Soft iOS Mesh Glow */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-72 rounded-full bg-[#007AFF]/10 blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 size-72 rounded-full bg-[#34C759]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/10 px-3 py-1 text-xs font-bold text-[#007AFF]">
              <BookOpen className="size-3.5" />
              <span>Maxsus raqamli qo&apos;llanma</span>
            </div>

            <h3 className="mt-3 text-xl font-extrabold tracking-[-0.02em] text-[#1C1C1E] sm:text-2xl lg:text-3xl">
              2026-yilgi namunaviy savollar to&apos;plamini (PDF) bepul oling
            </h3>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6C6C70]">
              Milliy sertifikat va DTM formati bo&apos;yicha 50 ta tahlilli namunaviy test, to&apos;g&apos;ri yechish sirlari va AI tavsiyalarini o&apos;z ichiga olgan qo&apos;llanma.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#3A3A3C]">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="size-4 text-[#34C759]" /> 50 ta tahlilli savol
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="size-4 text-[#34C759]" /> Bepul PDF formatda
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="size-4 text-[#34C759]" /> Rasmiy imtihon andozasi
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <a
              href={BOT_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-spring inline-flex items-center gap-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] px-7 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-[0_8px_22px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]"
            >
              <FileDown className="size-4.5" />
              <span>Telegram orqali yuklab olish</span>
              <Send className="size-4 ml-0.5 text-white/80" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
