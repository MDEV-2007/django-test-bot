'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings2, Eye, BarChart3, Send, Gamepad2, Plus, Pencil, Trash2, HelpCircle,
  Share2, Printer, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import QuestionForm, { type BankOption, type QuestionData, type SectionOption } from '@/components/teacher/QuestionForm';
import SectionManager, { type TeacherSection } from '@/components/teacher/SectionManager';
import BulkImportModal from '@/components/teacher/BulkImportModal';
import ShareTestModal from '@/components/teacher/ShareTestModal';
import BrandLoader from '@/components/BrandLoader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type QuestionRow = { id: number; question_type: string; body: string };
type BuildData = {
  test: {
    id: number;
    title: string;
    category?: string;
    subject?: string | null;
    is_cefr?: boolean;
    duration_minutes?: number;
  };
  questions: QuestionRow[];
};
type SectionData = {
  sections: TeacherSection[];
  skill_options: { value: string; label: string }[];
  banks: BankOption[];
};

export default function TestBuildPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<BuildData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingFull, setEditingFull] = useState<QuestionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const load = useCallback(() => {
    apiFetch<BuildData>(`/api/teacher/tests/${id}/build/`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
    // Partlar alohida so'rovda: ular faqat CEFR testida ishlatiladi, shuning uchun
    // mavjud `build` javobining shakli o'zgarmaydi.
    apiFetch<SectionData>(`/api/teacher/tests/${id}/sections/`).then(setSectionData)
      .catch(() => { /* partlar ixtiyoriy — xatolik butun sahifani buzmasin */ });
  }, [id]);

  useEffect(() => { if (access) load(); }, [access, load]);

  async function editQuestion(qid: number) {
    const full = await apiFetch<QuestionData>(`/api/teacher/tests/${id}/questions/${qid}/`);
    setEditingFull(full);
    setEditingId(qid);
    setShowForm(true);
  }

  async function deleteQuestion(qid: number) {
    await apiFetch(`/api/teacher/tests/${id}/questions/${qid}/delete/`, { method: 'DELETE' });
    load();
  }

  async function publish() {
    try {
      await apiFetch(`/api/teacher/tests/${id}/publish/`, { method: 'POST' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  async function makeGame() {
    try {
      const res = await apiFetch<{ game_id: number }>(`/api/teacher/tests/${id}/make-game/`, { method: 'POST' });
      router.push(`/teacher/games/${res.game_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  if (!data) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  const isCefr = Boolean(data.test.is_cefr || data.test.category === 'cefr');
  const hasSections = Boolean(sectionData && sectionData.sections.length > 0);

  return (
    <TeacherShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={data.test.title}
          description={
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {data.test.subject && (
                <Badge variant="outline" className="border-[var(--accent-border)] font-semibold text-[var(--accent-text)]">
                  {data.test.subject}
                </Badge>
              )}
              <Badge variant="secondary" className="font-normal">
                {isCefr ? 'CEFR (Til formati)' : data.test.category === 'certificate' ? 'Milliy Sertifikat' : data.test.category === 'bba' ? 'BBA formati' : 'Standart fan testi'}
              </Badge>
              <span>·</span>
              <span>{data.questions.length} ta savol</span>
              {data.test.duration_minutes ? <span>· {data.test.duration_minutes} daqiqa</span> : null}
            </span>
          }
          backHref="/teacher/tests"
          actions={
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teacher/tests/${id}/info`}><Settings2 className="size-4" /> Ma&apos;lumotlar</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teacher/tests/${id}/preview`}><Eye className="size-4" /> Ko&apos;rish</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teacher/tests/${id}/results`}><BarChart3 className="size-4" /> Natijalar</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
                <Share2 className="size-4" /> Ulashish
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teacher/tests/${id}/print`}><Printer className="size-4" /> Chop etish (PDF)</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={makeGame}>
                <Gamepad2 className="size-4" /> O&apos;yin yasash
              </Button>
              <Button size="sm" onClick={publish}><Send className="size-4" /> Nashr / qoralama</Button>
            </>
          }
        />

        {error && (
          <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/[0.06]">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        {/* Faqat CEFR testlarida yoki partlari mavjud testlarda ko'rsatiladi */}
        {sectionData && (isCefr || hasSections) && (
          <SectionManager
            testId={Number(id)}
            sections={sectionData.sections}
            skillOptions={sectionData.skill_options}
            onChanged={load}
          />
        )}

        <div className="space-y-2.5">
          {data.questions.map((q, i) => (
            <Reveal key={q.id} index={i} y={6}>
              <Card className="gap-0 py-0">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-input)] font-mono text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-sm"
                    dangerouslySetInnerHTML={{ __html: q.body }}
                  />
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{q.question_type}</Badge>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => editQuestion(q.id)} aria-label="Tahrirlash">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="size-8 text-muted-foreground hover:text-[var(--danger-text)]"
                    onClick={() => deleteQuestion(q.id)}
                    aria-label="O'chirish"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}

          {data.questions.length === 0 && !showForm && (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Testda hali savol yo&apos;q. Bo&apos;sh testni nashr etib bo&apos;lmaydi.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {!showForm && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="h-14 flex-1 border-dashed"
              onClick={() => { setShowForm(true); setEditingId(null); setEditingFull(null); }}
            >
              <Plus className="size-4" /> Savol qo&apos;shish
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-1 border-dashed border-[var(--accent-border)] bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 text-[var(--accent-text)]"
              onClick={() => setShowBulkModal(true)}
            >
              <Sparkles className="size-4" /> Matndan tezkor import
            </Button>
          </div>
        )}

        {showForm && (
          <QuestionForm
            key={editingId ?? 'new'}
            testId={Number(id)}
            initial={editingFull ?? undefined}
            isCefr={isCefr}
            sections={(sectionData?.sections ?? []) as SectionOption[]}
            banks={sectionData?.banks ?? []}
            onSaved={() => { setShowForm(false); setEditingFull(null); setEditingId(null); load(); }}
          />
        )}

        <ShareTestModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          testId={Number(id)}
          testTitle={data.test.title}
          subject={data.test.subject}
          durationMinutes={data.test.duration_minutes}
          questionCount={data.questions.length}
        />

        <BulkImportModal
          open={showBulkModal}
          onOpenChange={setShowBulkModal}
          testId={Number(id)}
          onImportSuccess={load}
        />
      </div>
    </TeacherShell>
  );
}
