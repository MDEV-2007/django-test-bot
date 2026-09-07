'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import BrandLoader from '@/components/BrandLoader';
import { Button } from '@/components/ui/button';

type Option = { text: string; is_correct: boolean };
type Question = {
  id: number;
  body: string;
  question_type: string;
  options: Option[];
  explanation: string;
  points: number;
};
type TestData = {
  test: {
    id: number;
    title: string;
    category?: string;
    subject?: string | null;
    duration_minutes?: number;
  };
  questions: Question[];
};

export default function TestPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<TestData | null>(null);
  const [includeKey, setIncludeKey] = useState(true);

  useEffect(() => {
    if (!access) return;
    apiFetch<TestData>(`/api/teacher/tests/${id}/build/`)
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  const { test, questions } = data;

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-black print:bg-white print:p-0">
      {/* Chop etish boshqaruv paneli (faqat ekranda ko'rinadi, chop etilganda yashiriladi) */}
      <header className="mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-xl bg-white p-4 shadow-sm print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href={`/teacher/tests/${id}/build`} className="gap-2">
            <ArrowLeft className="size-4" /> Ortga qaytish
          </Link>
        </Button>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeKey}
              onChange={(e) => setIncludeKey(e.target.checked)}
              className="size-4 rounded accent-emerald-600"
            />
            Javoblar kalitini ham kiritish
          </label>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="size-4" /> Chop etish / PDF saqlash
          </Button>
        </div>
      </header>

      {/* A4 formatdagi test varaqasi */}
      <main className="mx-auto max-w-4xl bg-white p-8 shadow-sm print:max-w-none print:shadow-none print:p-6">
        {/* Test boshlanishi va ma'lumotlar */}
        <section aria-label="Test sarlavhasi" className="border-b-2 border-black pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight">{test.title}</h1>
              <p className="text-xs text-neutral-600 mt-0.5">
                {test.subject ? `Fan: ${test.subject} · ` : ''}
                {test.duration_minutes ? `Vaqt: ${test.duration_minutes} daqiqa · ` : ''}
                Savollar: {questions.length} ta
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500">
                IlmIldizi Test
              </span>
            </div>
          </div>

          {/* O'quvchi to'ldiradigan joy */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-medium border-t border-neutral-300 pt-3">
            <div>F.I.SH: _________________________________________</div>
            <div>Sinf / Guruh: ______________ Sana: ____________</div>
          </div>
        </section>

        {/* Savollar ro'yxati */}
        <section aria-label="Savollar ro'yxati" className="space-y-6 pt-6">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="break-inside-avoid">
              <div className="flex items-start gap-2">
                <span className="font-bold text-sm min-w-6">{idx + 1}.</span>
                <div
                  className="flex-1 text-sm font-medium leading-snug"
                  dangerouslySetInnerHTML={{ __html: q.body }}
                />
              </div>

              {/* Variantlar */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2.5 pl-8 text-xs">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-baseline gap-2">
                      <span className="font-bold">{String.fromCharCode(65 + optIdx)})</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Javoblar kaliti (O'qituvchi uchun alohida bo'lim) */}
        {includeKey && (
          <section
            aria-label="To'g'ri javoblar kaliti"
            className="mt-12 border-t-2 border-dashed border-black pt-8 print:break-before-page"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black">
              <h2 className="text-base font-bold uppercase tracking-wider">
                To&apos;g&apos;ri javoblar kaliti (O&apos;qituvchi uchun)
              </h2>
              <span className="text-xs text-neutral-500">{test.title}</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-4 text-center">
              {questions.map((q, idx) => {
                const correctOptIdx = q.options?.findIndex((o) => o.is_correct);
                const letter = correctOptIdx !== undefined && correctOptIdx >= 0 ? String.fromCharCode(65 + correctOptIdx) : '—';
                return (
                  <div key={q.id || idx} className="rounded border border-neutral-300 p-1.5 text-xs">
                    <span className="block font-bold text-neutral-600">{idx + 1}</span>
                    <span className="block font-mono font-black text-sm text-emerald-700">{letter}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
