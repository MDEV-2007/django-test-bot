'use client';

import { useRef } from 'react';
import { Award, CheckCircle2, Download, Printer, X, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  testTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  date?: string;
  attemptId: string | number;
}

function getGrade(score: number): { grade: string; label: string; tone: string } {
  if (score >= 86) return { grade: 'A (A`lo)', label: 'Eng yuqori natija', tone: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' };
  if (score >= 71) return { grade: 'B+ (Juda yaxshi)', label: 'Yuqori natija', tone: 'text-blue-500 border-blue-500/30 bg-blue-500/10' };
  if (score >= 56) return { grade: 'B (Yaxshi)', label: 'Muvaffaqiyatli', tone: 'text-amber-500 border-amber-500/30 bg-amber-500/10' };
  if (score >= 46) return { grade: 'C+ (Qoniqarli)', label: 'O`tish bali', tone: 'text-orange-500 border-orange-500/30 bg-orange-500/10' };
  return { grade: 'Ishtirokchi', label: 'Sinovdan o`tildi', tone: 'text-muted-foreground border-muted' };
}

export default function CertificateModal({
  open,
  onOpenChange,
  studentName,
  testTitle,
  score,
  correctCount,
  totalQuestions,
  date,
  attemptId,
}: CertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const gradeInfo = getGrade(score);
  const certDate = date || new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const serialNo = `ILM-${new Date().getFullYear()}-${String(attemptId).padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)]">
        <DialogHeader className="p-5 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Award className="size-5 text-[var(--tone-premium-text)]" /> Elektron Natija Sertifikati
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5 rounded-xl border-[var(--border-card)] text-xs font-semibold"
            >
              <Printer className="size-3.5" /> Chop etish / PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Certificate Container with Print-specific styles */}
        <div className="p-5 sm:p-7">
          <div
            ref={certificateRef}
            id="certificate-print-area"
            className="relative overflow-hidden rounded-2xl border-4 border-double border-[var(--tone-premium)]/40 bg-gradient-to-b from-[var(--surface-input)] via-[var(--surface-card-soft)] to-[var(--surface-input)] p-6 sm:p-10 text-center shadow-2xl"
          >
            {/* Decorative Corner Ornaments */}
            <div className="pointer-events-none absolute -left-12 -top-12 size-36 rounded-full bg-[var(--tone-premium)]/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-12 -bottom-12 size-36 rounded-full bg-[var(--accent)]/10 blur-2xl" />

            {/* Header / Brand */}
            <div className="mb-4 flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--tone-premium-text)]">
                Respublika Ta&apos;lim Platformasi
              </span>
              <h2 className="font-voice mt-1 text-2xl font-black tracking-tight sm:text-3xl text-[var(--text-primary)]">
                Ilm<span className="text-[var(--accent-text)]">Ildizi</span>
              </h2>
              <div className="mt-2 h-0.5 w-20 rounded-full bg-gradient-to-r from-transparent via-[var(--tone-premium)] to-transparent" />
            </div>

            {/* Title */}
            <div className="my-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Muvaffaqiyat Sertifikati
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">Ushbu sertifikat tasdiqlaydi:</p>
            </div>

            {/* Student Name */}
            <div className="my-3 border-b border-t border-[var(--border-card)] py-3">
              <h3 className="font-voice text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                {studentName || "Platforma O'quvchisi"}
              </h3>
            </div>

            {/* Test Details */}
            <div className="my-4 space-y-1.5 text-sm text-[var(--text-secondary)]">
              <p>
                quyidagi fan va format bo&apos;yicha sinov testini muvaffaqiyatli yakunladi:
              </p>
              <p className="font-semibold text-[var(--text-primary)] text-base">
                &ldquo;{testTitle}&rdquo;
              </p>
            </div>

            {/* Score & Grade Grid */}
            <div className="my-6 grid grid-cols-3 gap-3 rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)] p-3.5 sm:gap-6 sm:p-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">To&apos;plangan Ball</p>
                <p className="font-mono text-2xl sm:text-3xl font-black text-[var(--accent-text)]">
                  {score}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">To&apos;g&apos;ri Javoblar</p>
                <p className="font-mono text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1">
                  {correctCount} / {totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Baholash Darajasi</p>
                <Badge variant="outline" className={`mt-1 font-bold text-xs ${gradeInfo.tone}`}>
                  {gradeInfo.grade}
                </Badge>
              </div>
            </div>

            {/* Footer Signatures and Verification */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-card)] pt-5 text-left text-xs text-muted-foreground">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-mono font-semibold text-[var(--text-secondary)]">ID: {serialNo}</p>
                <p>Sana: {certDate}</p>
              </div>

              {/* Gold Seal / Badge */}
              <div className="flex items-center gap-2 rounded-full border border-[var(--tone-premium)]/40 bg-[var(--tone-premium)]/10 px-3.5 py-1.5 font-semibold text-[var(--tone-premium-text)]">
                <Sparkles className="size-4" />
                <span className="text-[11px] tracking-wide">IlmIldizi Digital Verified</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
