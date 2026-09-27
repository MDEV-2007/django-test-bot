'use client';

import React from 'react';
import { Send, Zap } from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing_banner';

export default function TelegramBannerCta() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-r from-[#0d3b2e] via-[#093226] to-[#06241b] p-8 sm:p-12 lg:p-14 text-white shadow-2xl">
        {/* Ambient lighting glows */}
        <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-0 -top-20 size-80 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Column: Heading & Description */}
          <div className="lg:col-span-8 space-y-4">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/70 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-xs">
              <Send className="size-3.5 -rotate-12 text-emerald-300" />
              <span>Qulay va Bepul Boshlanish</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Birgina{' '}
              <span className="text-[#34d399] font-black">/start</span>{' '}
              bosish orqali imtihonga tayyorgarlikni boshlang!
            </h2>

            {/* Subtitle */}
            <p className="max-w-2xl text-sm sm:text-base text-emerald-100/80 leading-relaxed font-normal pt-1">
              Hech qanday og&apos;ir dasturlarni yuklash shart emas. Telefoningizdagi sevimli Telegram orqali har kuni 20 daqiqa test yeching va{' '}
              <span className="rounded bg-[#10b981]/25 px-1.5 py-0.5 font-semibold text-[#6ee7b7]">
                orzuingizdagi natijaga erishing.
              </span>
            </p>
          </div>

          {/* Right Column: CTA Button + Badge */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full sm:w-auto min-w-[260px] items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 sm:py-5 shadow-2xl transition-all duration-200 hover:scale-[1.03] hover:bg-slate-50 active:scale-[0.98]"
            >
              <Send className="size-6 -rotate-12 text-slate-800 transition-transform group-hover:scale-110 group-hover:text-emerald-700" />
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#059669]">
                @ilmildiziuz_bot
              </span>
            </a>

            {/* Sub-badge */}
            <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#064e3b] border border-emerald-500/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 shadow-xs">
              <Zap className="size-3.5 text-amber-400 fill-amber-400" />
              <span>15,000+ o&apos;quvchiga hoziroq qo&apos;shiling</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
