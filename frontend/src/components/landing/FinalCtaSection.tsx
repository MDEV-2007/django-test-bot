'use client';

import Link from 'next/link';
import { Send, ArrowRight, Bot, Sparkles } from 'lucide-react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';
const CHANNEL_URL = 'https://t.me/ilmildiziuz';

export default function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative isolate overflow-hidden rounded-3xl bg-[#0b1120] p-8 sm:p-14 text-white shadow-2xl border border-slate-800">
        {/* Glowing aura blobs */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Chap ustun: Asosiy chaqiriq */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300">
              <Sparkles className="size-3.5" />
              Kelajagingiz uchun to&apos;g&apos;ri qadam
            </span>

            <h2 className="font-voice mt-4 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.1]">
              Imtihon kuni hech narsaga afsuslanmang
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Bugun birinchi testni yeching — AI qaysi mavzudan boshlashni ko&apos;rsatadi. Kuniga 15 daqiqa mashq bilan imtihon natijangizni maksimal darajaga olib chiqing.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
              <Link
                href="/register"
                className="lp-btn-primary inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-13 px-8 text-base shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Bepul ro&apos;yxatdan o&apos;tish <ArrowRight className="size-4" />
              </Link>

              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold h-13 px-6 text-sm transition-all"
              >
                <Bot className="size-4 text-emerald-400" />
                AI Mentorni sinash
              </a>
            </div>
          </div>

          {/* O'ng ustun: Telegram kanal shisha qutisi */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2.5 text-white font-voice text-lg font-bold">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Send className="size-4" />
                </span>
                Muddatlar va e&apos;lonlar Telegram kanalida
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Rasmiy e&apos;lonlar, DTM o&apos;tish ballari, Milliy sertifikat yangiliklari va haftalik turnir natijalari — chiqqan kuniyoq.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <a
                  href={CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Telegram kanalga qo&apos;shilish <ArrowRight className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
