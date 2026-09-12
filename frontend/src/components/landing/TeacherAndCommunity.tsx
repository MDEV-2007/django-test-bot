'use client';

import Link from 'next/link';
import { Users, GraduationCap, CheckCircle2, ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';

export default function TeacherAndCommunity() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-12 shadow-sm">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          
          {/* Chap ustun: Repetitorlar va Maktablar uchun */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-bold text-sky-800">
              <GraduationCap className="size-3.5" />
              O&apos;qituvchilar va O&apos;quv markazlari uchun
            </span>

            <h2 className="font-voice mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Butun sinf natijalarini bitta monitoring ekranida ko&apos;ring
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Repetitor va ustozlar bitta maxsus taklif havolasi orqali o&apos;z o&apos;quvchilarini guruhga jamlay oladi. Har bir o&apos;quvchining qaysi mavzuda oqsayotgani, qancha test yechgani va o&apos;sish sur&apos;ati avtomatik shakllanadi.
            </p>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Har bir o&apos;quvchi bo&apos;yicha zaif mavzular tahlili</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Guruh bo&apos;yicha umumiy reyting va kunlik test hisobotlari</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Vaqtni tejang: tekshirish va xatolarni hisoblash avtomatlashgan</span>
              </li>
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/register"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 px-6 text-xs sm:text-sm transition-all"
              >
                O&apos;qituvchi sifatida ulanish <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* O'ng ustun: Sinf monitoringi vizual kartasi */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Tarix 11-sinf guruhi</span>
                    <span className="text-[11px] text-slate-400">28 ta o&apos;quvchi biriktirilgan</span>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                  Faol guruh
                </span>
              </div>

              {/* O'quvchilar ro'yxati namunasi */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                      MR
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">Madina Rahimova</span>
                      <span className="text-[10px] text-emerald-700 font-medium">92 ball · Daraja: A+</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    42 ta test
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                      SK
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">Sardor Karimov</span>
                      <span className="text-[10px] text-amber-700 font-medium">74 ball · Xonliklar zaif</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    38 ta test
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                      AZ
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">Aziz Zokirov</span>
                      <span className="text-[10px] text-emerald-700 font-medium">86 ball · Daraja: A</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    45 ta test
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                <span>Avtomatik yangilanish: Har 10 daqiqada</span>
                <span className="font-bold text-emerald-700">Barcha hisobotlar faol</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
