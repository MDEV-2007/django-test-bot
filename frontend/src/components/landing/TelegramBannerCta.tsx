'use client';

import React from 'react';
import { Send, Zap } from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing_banner';

export default function TelegramBannerCta() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[36px] border border-white/12 bg-[#1C1C1E] p-8 sm:p-12 lg:p-14 text-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        {/* Ambient iOS Mesh Glows */}
        <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-[#007AFF]/25 blur-3xl pointer-events-none" />
        <div className="absolute right-0 -top-20 size-80 rounded-full bg-[#30D158]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#64D2FF] backdrop-blur-md">
              <Send className="size-3.5 -rotate-12 text-[#64D2FF]" />
              <span>Telegram Mini App · Barcha qurilmalarda</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.12]">
              Birgina{' '}
              <span className="text-[#30D158] font-black">/start</span>{' '}
              bosish orqali imtihonga tayyorgarlikni boshlang!
            </h2>

            <p className="max-w-2xl text-sm sm:text-base text-[#AEAEB2] leading-relaxed font-normal pt-1">
              Hech qanday og&apos;ir dasturlarni yuklash shart emas. Telefoningizdagi sevimli Telegram orqali har kuni 20 daqiqa test yeching va{' '}
              <span className="rounded-md bg-[#30D158]/20 px-2 py-0.5 font-semibold text-[#30D158]">
                orzuingizdagi natijaga erishing.
              </span>
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-spring group inline-flex w-full sm:w-auto min-w-[260px] items-center justify-center gap-3 rounded-full bg-white px-7 py-4 sm:py-4.5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] hover:bg-[#F2F2F7]"
            >
              <Send className="size-5.5 -rotate-12 text-[#007AFF] transition-transform group-hover:scale-110" />
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#1C1C1E]">
                @ilmildiziuz_bot
              </span>
            </a>

            <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#2C2C2E] border border-white/10 px-4 py-1.5 text-xs font-semibold text-[#D1D1D6]">
              <Zap className="size-3.5 text-[#FFD60A] fill-[#FFD60A]" />
              <span>15,000+ o&apos;quvchiga hoziroq qo&apos;shiling</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
