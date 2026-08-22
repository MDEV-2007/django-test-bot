'use client';

import { useState } from 'react';

export default function DesignSystemPage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="mx-auto max-w-6xl flex-1 space-y-12 bg-[var(--bg-page)] p-6">
      <header className="border-b border-[var(--border-card)] pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">IlmIldizi Design System</h1>
        <p className="mt-2 text-[var(--text-muted)]">Tailwind CSS + React komponentlari — dizayn tokenlarining yagona havolasi.</p>
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Colors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="h-16 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)]" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Primary Navy</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-2xl bg-[var(--accent)]" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-2xl bg-[#10b981]" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Success Emerald</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-2xl bg-[#ef4444]" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Danger Rose</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Typography</h2>
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--text-faint)]">Heading 1</span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Bu yirik sarlavha</h1>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--text-faint)]">Heading 2</span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Bu o&apos;rta sarlavha</h2>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--text-faint)]">Body Text</span>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                IlmIldizi — tarix, milliy sertifikat va BBA imtihonlariga tayyorlanish uchun premium platforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Tugmalar (Buttons)</h3>
          <div className="flex flex-col gap-3">
            <button className="w-full rounded-2xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] transition">
              Asosiy tugma (Primary)
            </button>
            <button className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)] px-6 py-3 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover-strong)]">
              Yordamchi tugma (Secondary)
            </button>
            <button className="w-full rounded-2xl border border-[var(--accent-border)] bg-transparent px-6 py-3 font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-soft)]">
              Hoshiyali tugma (Outline)
            </button>
            <button className="w-full rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-6 py-3 font-semibold text-[var(--danger-text)] transition">
              Xavfli tugma (Danger)
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Nishonlar va Progress (Badges)</h3>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)]">Yangi</span>
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)]">Top 3</span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300">Premium</span>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">Streak 🔥</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-[var(--text-subtitle)]">
                  <span>Tajriba (XP)</span><span>72%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: '72%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-[var(--text-subtitle)]">
                  <span>Vazifa bajarilishi</span><span>2/3</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: '66%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Kiritish maydonlari (Inputs)</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">Ism-familiyangiz</label>
              <input
                type="text"
                placeholder="Azizbek Ergashev..."
                className="w-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none transition focus:border-[var(--accent)]"
              />
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Kategoriya tanlang</label>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] px-4 py-3 text-[var(--text-primary)] outline-none"
              >
                <span>Milliy Sertifikat</span>
                <span className="text-[var(--text-muted)]">▾</span>
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-solid)] shadow-2xl">
                  <a className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">Tarix</a>
                  <a className="block bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-text)] hover:bg-[var(--accent-soft)]">Milliy Sertifikat</a>
                  <a className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">BBA Imtihoni</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Muloqot oynalari (Dialogs)</h3>
          <p className="text-sm text-[var(--text-muted)]">Yutuqlar yoki tushuntirishlarni ko&apos;rsatish uchun modal.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 font-bold text-slate-950 transition hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            Yutuq ochildi! (Trigger Modal)
          </button>

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-card-strong)] p-4 backdrop-blur-sm">
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-[32px] border border-[var(--accent-border)] bg-[var(--surface-card-soft)] p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                  🏆
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">Yangi Yutuq!</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-500">Noyob Yutuq</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">&quot;Tarixiy Strateg&quot; nishonini muvaffaqiyatli qo&apos;lga kiritdingiz!</p>
                <div className="mt-4 flex justify-around rounded-2xl bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-secondary)]">
                  <span>⚡ +250 XP</span>
                  <span>🪙 +50 Tanga</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="mt-6 w-full rounded-2xl bg-[var(--surface-invert)] py-3 font-bold text-[var(--text-on-invert)] transition"
                >
                  Ajoyib!
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-6 space-y-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Kutish animatsiyalari (Skeleton Loading)</h3>
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--surface-hover)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-[var(--surface-hover-strong)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--surface-hover)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded bg-[var(--surface-hover-strong)]" />
              <div className="h-3.5 w-5/6 rounded bg-[var(--surface-hover-strong)]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
