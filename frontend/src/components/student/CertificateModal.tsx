'use client';

import { useState } from 'react';
import { Award, Download, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
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

const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

function formatUzDate(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getDate()}-${MONTHS_UZ[now.getMonth()]}, ${now.getFullYear()}-yil`;
  }
  return `${d.getDate()}-${MONTHS_UZ[d.getMonth()]}, ${d.getFullYear()}-yil`;
}

function getGrade(score: number, correctCount?: number, totalQuestions?: number): { grade: string; label: string; tone: string; printTone: string; isPassed: boolean } {
  // 45 talik Milliy Sertifikat imtihoni uchun rasmiy mezon
  if (totalQuestions === 45 && typeof correctCount === 'number') {
    if (correctCount >= 34) return { grade: "A+ (A'lo)", label: "Eng yuqori natija — Oltin Sertifikat", tone: 'text-amber-400 border-amber-500/40 bg-amber-500/10', printTone: 'text-amber-700 border-amber-700 bg-amber-50', isPassed: true };
    if (correctCount >= 28) return { grade: "A (A'lo)", label: 'Yuqori a\'lo natija', tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', printTone: 'text-emerald-700 border-emerald-700 bg-emerald-50', isPassed: true };
    if (correctCount >= 24) return { grade: 'B+ (Juda yaxshi)', label: 'Muvaffaqiyatli natija', tone: 'text-sky-400 border-sky-500/40 bg-sky-500/10', printTone: 'text-sky-700 border-sky-700 bg-sky-50', isPassed: true };
    if (correctCount >= 21) return { grade: 'B (Yaxshi)', label: 'Ijobiy natija', tone: 'text-teal-400 border-teal-500/40 bg-teal-500/10', printTone: 'text-teal-700 border-teal-700 bg-teal-50', isPassed: true };
    if (correctCount >= 18) return { grade: 'C+ (Qoniqarli)', label: "O'tish bali", tone: 'text-orange-400 border-orange-500/40 bg-orange-500/10', printTone: 'text-orange-700 border-orange-700 bg-orange-50', isPassed: true };
    return { grade: "Sinovdan o'tmadi", label: "Sertifikat berilmaydi (yetarli emas)", tone: 'text-rose-400 border-rose-500/40 bg-rose-500/10', printTone: 'text-rose-700 border-rose-700 bg-rose-50', isPassed: false };
  }

  // Umumiy testlar uchun foiz bo'yicha
  if (score >= 75.5) return { grade: "A+ (A'lo)", label: 'Eng yuqori natija', tone: 'text-amber-400 border-amber-500/40 bg-amber-500/10', printTone: 'text-amber-700 border-amber-700 bg-amber-50', isPassed: true };
  if (score >= 62.0) return { grade: "A (A'lo)", label: 'Yuqori natija', tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', printTone: 'text-emerald-700 border-emerald-700 bg-emerald-50', isPassed: true };
  if (score >= 53.0) return { grade: 'B+ (Juda yaxshi)', label: 'Muvaffaqiyatli', tone: 'text-sky-400 border-sky-500/40 bg-sky-500/10', printTone: 'text-sky-700 border-sky-700 bg-sky-50', isPassed: true };
  if (score >= 46.5) return { grade: 'B (Yaxshi)', label: 'Ijobiy natija', tone: 'text-teal-400 border-teal-500/40 bg-teal-500/10', printTone: 'text-teal-700 border-teal-700 bg-teal-50', isPassed: true };
  if (score >= 40.0) return { grade: 'C+ (Qoniqarli)', label: "O'tish bali", tone: 'text-orange-400 border-orange-500/40 bg-orange-500/10', printTone: 'text-orange-700 border-orange-700 bg-orange-50', isPassed: true };
  return { grade: "Sinovdan o'tmadi", label: "Sertifikat berilmaydi", tone: 'text-rose-400 border-rose-500/40 bg-rose-500/10', printTone: 'text-rose-700 border-rose-700 bg-rose-50', isPassed: false };
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
  const [downloading, setDownloading] = useState(false);
  const gradeInfo = getGrade(score, correctCount, totalQuestions);
  const certDate = formatUzDate(date);
  const serialNo = `ILM-${new Date().getFullYear()}-${String(attemptId).padStart(6, '0')}`;
  const displayName = studentName.trim() || "Platforma O'quvchisi";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 1600;
      const height = 1130;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // 1. Fon gradienti (chuqur hashamatli qora-to'q ko'k)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a0e17');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#0a0e17');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Hashamatli tilla hoshiyalar
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#d97706';
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(44, 44, width - 88, height - 88);

      // Burchak naqshlari
      const drawCorner = (x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 35);
        ctx.lineTo(0, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8, 8, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.restore();
      };
      drawCorner(55, 55, 0);
      drawCorner(width - 55, 55, 90);
      drawCorner(width - 55, height - 55, 180);
      drawCorner(55, height - 55, 270);

      // 3. Respublika va Platforma sarlavhasi
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px "Inter", sans-serif';
      ctx.fillText("O'ZBEKISTON RESPUBLIKASI TA'LIM VA TEST PLATFORMASI", width / 2, 115);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px "Inter", sans-serif';
      ctx.fillText('Ilm', width / 2 - 40, 175);
      ctx.fillStyle = '#2fb3a3';
      ctx.fillText('Ildizi', width / 2 + 45, 175);

      // Ajratuvchi oltin chiziq
      const lineGrad = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
      lineGrad.addColorStop(0, 'transparent');
      lineGrad.addColorStop(0.5, '#f59e0b');
      lineGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 200, 195);
      ctx.lineTo(width / 2 + 200, 195);
      ctx.stroke();

      // Muvaffaqiyat Sertifikati
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.fillText('MUVAFFAQIYAT SERTIFIKATI', width / 2, 245);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px "Inter", sans-serif';
      ctx.fillText('Ushbu sertifikat tasdiqlaydi:', width / 2, 275);

      // O'quvchi ismi
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 46px "Georgia", serif';
      ctx.fillText(displayName, width / 2, 350);

      // Ajratuvchi chiziqlar
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 350, 375);
      ctx.lineTo(width / 2 + 350, 375);
      ctx.stroke();

      // Test nomi va matn
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px "Inter", sans-serif';
      ctx.fillText("quyidagi fan va format bo'yicha sinov testini muvaffaqiyatli yakunladi:", width / 2, 420);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px "Inter", sans-serif';
      ctx.fillText(`“${testTitle}”`, width / 2, 465);

      // 4. Natijalar bloki (3 ta karta)
      const boxY = 525;
      const boxHeight = 160;
      const boxWidth = 380;
      const gap = 30;
      const startX = width / 2 - (boxWidth * 3 + gap * 2) / 2;

      // Karta 1: To'plangan Ball
      const drawStatCard = (x: number, label: string, val: string, sub: string, valColor: string) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(x, boxY, boxWidth, boxHeight, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px "Inter", sans-serif';
        ctx.fillText(label, x + boxWidth / 2, boxY + 45);

        ctx.fillStyle = valColor;
        ctx.font = '900 42px "Courier New", monospace';
        ctx.fillText(val, x + boxWidth / 2, boxY + 105);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px "Inter", sans-serif';
        ctx.fillText(sub, x + boxWidth / 2, boxY + 138);
      };

      drawStatCard(startX, "TO'PLANGAN BALL", `${score}%`, 'Umumiy natija', '#34d399');
      drawStatCard(startX + boxWidth + gap, "TO'G'RI JAVOBLAR", `${correctCount} / ${totalQuestions}`, 'Jami savollardan', '#ffffff');
      drawStatCard(startX + (boxWidth + gap) * 2, 'BAHOLASH DARAJASI', gradeInfo.grade, gradeInfo.label, '#fbbf24');

      // 5. Pastki qism: Serial ID, Sana, Muhr va Tasdiq
      const footerY = 820;

      // Chap tomon: ID va sana
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(`ID: ${serialNo}`, 120, footerY);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px "Inter", sans-serif';
      ctx.fillText(`Berilgan sana: ${certDate}`, 120, footerY + 30);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Inter", sans-serif';
      ctx.fillText("Ushbu hujjat elektron shaklda IlmIldizi tizimi orqali tasdiqlangan.", 120, footerY + 58);

      // O'ng tomon: Digital Verified muhri
      ctx.textAlign = 'center';
      const sealX = width - 260;
      const sealY = footerY + 20;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.beginPath();
      ctx.arc(sealX, sealY, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText('★ ILMILDIZI ★', sealX, sealY - 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px "Inter", sans-serif';
      ctx.fillText('DIGITAL', sealX, sealY);
      ctx.fillText('VERIFIED', sealX, sealY + 20);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText('RASMIY MUHR', sealX, sealY + 40);

      // Faylni yuklab olish
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Blob yaratilmadi');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitized = displayName.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
        a.download = `Sertifikat_${sanitized || 'IlmIldizi'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Sertifikat rasm (.png) formatida yuklab olindi!');
      }, 'image/png');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-4xl sm:!max-w-4xl w-[95vw] overflow-hidden p-0 sm:rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] shadow-2xl max-h-[95vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-card)] no-print">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
            <Award className="size-5 text-[var(--tone-premium-text)]" /> Elektron Natija Sertifikati
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={downloading}
              onClick={handleDownloadPng}
              className="gap-1.5 rounded-xl border-[var(--accent-border)] bg-[var(--accent)]/10 text-[var(--accent-text)] hover:bg-[var(--accent)]/20 text-xs font-semibold"
            >
              <Download className="size-3.5" /> {downloading ? 'Tayyorlanmoqda...' : 'Rasm yuklab olish (PNG)'}
            </Button>
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

        {/* Sertifikat Karkasi */}
        <div className="p-3 sm:p-6 md:p-8">
          <div
            id="certificate-print-area"
            className="relative overflow-hidden rounded-2xl border-4 border-double border-amber-500/40 bg-gradient-to-b from-[#0b0e14] via-[#101520] to-[#0b0e14] p-6 sm:p-10 md:p-12 text-center shadow-2xl print:p-8 print:border-amber-600 print:bg-white print:text-slate-900"
          >
            {/* Fon nur effektlari */}
            <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-amber-500/10 blur-3xl no-print" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 size-48 rounded-full bg-[var(--accent)]/10 blur-3xl no-print" />

            {/* Sarlavha / Brend */}
            <div className="mb-4 flex flex-col items-center">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-amber-400 print:text-amber-700">
                O&apos;zbekiston Respublikasi Ta&apos;lim Platformasi
              </span>
              <h2 className="font-voice mt-2 text-2xl sm:text-4xl font-black tracking-tight text-white print:text-slate-900">
                Ilm<span className="text-[var(--accent-text)] print:text-emerald-700">Ildizi</span>
              </h2>
              <div className="mt-2.5 h-0.5 w-28 rounded-full bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            </div>

            {/* Sertifikat Toifasi */}
            <div className="my-3">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground print:text-slate-600">
                Muvaffaqiyat Sertifikati
              </span>
              <p className="text-xs text-muted-foreground print:text-slate-500 mt-1">Ushbu sertifikat tasdiqlaydi:</p>
            </div>

            {/* O'quvchi Ismi */}
            <div className="my-4 border-b border-t border-amber-500/20 py-4 print:border-slate-300">
              <h3 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-wide text-white print:text-slate-900">
                {displayName}
              </h3>
            </div>

            {/* Test Ma'lumotlari */}
            <div className="my-4 space-y-1.5 text-sm text-[var(--text-secondary)] print:text-slate-700">
              <p className="text-xs sm:text-sm">
                quyidagi fan va format bo&apos;yicha sinov testini muvaffaqiyatli yakunladi:
              </p>
              <p className="font-bold text-[var(--accent-text)] print:text-slate-900 text-base sm:text-xl">
                &ldquo;{testTitle}&rdquo;
              </p>
            </div>

            {/* Natijalar Matritsasi — To'liq keng va ajratilgan qatorlar (Ustma-ust tushmaydi) */}
            <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-amber-500/25 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm shadow-inner print:border-slate-300 print:bg-slate-50">
              {/* Ball */}
              <div className="flex flex-col items-center justify-center p-2 border-b sm:border-b-0 sm:border-r border-amber-500/20 print:border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">
                  To&apos;plangan Ball
                </span>
                <span className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 print:text-emerald-700 mt-1.5">
                  {score}%
                </span>
              </div>

              {/* To'g'ri Javoblar */}
              <div className="flex flex-col items-center justify-center p-2 border-b sm:border-b-0 sm:border-r border-amber-500/20 print:border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">
                  To&apos;g&apos;ri Javoblar
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white print:text-slate-900 mt-1.5">
                  {correctCount} / {totalQuestions}
                </span>
              </div>

              {/* Baholash Darajasi */}
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">
                  Baholash Darajasi
                </span>
                <Badge
                  variant="outline"
                  className={`mt-2 font-extrabold text-xs sm:text-sm px-3 py-1 ${gradeInfo.tone} print:${gradeInfo.printTone}`}
                >
                  {gradeInfo.grade}
                </Badge>
                <span className="text-[11px] text-muted-foreground print:text-slate-500 mt-1">
                  {gradeInfo.label}
                </span>
              </div>
            </div>

            {/* Pastki Qism: ID, Sana va Muhr */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-500/20 pt-5 text-left text-xs text-muted-foreground print:border-slate-300 print:text-slate-600">
              <div className="space-y-1 text-center sm:text-left">
                <p className="font-mono font-bold text-amber-400 print:text-amber-800 text-sm">
                  ID: {serialNo}
                </p>
                <p className="font-medium text-slate-300 print:text-slate-700">
                  Sana: {certDate}
                </p>
                <p className="text-[11px] text-slate-500 print:text-slate-400">
                  Elektron tarzda tasdiqlangan rasmiy natija hujjati
                </p>
              </div>

              {/* Rasmiy Muhr nishoni */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-semibold text-amber-300 print:border-amber-700 print:text-amber-800 print:bg-amber-50 shadow-sm">
                <ShieldCheck className="size-5 text-amber-400 print:text-amber-700" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-wider leading-none text-amber-400/80 print:text-amber-800">
                    IlmIldizi Platformasi
                  </p>
                  <p className="text-xs font-black tracking-wide leading-tight">Digital Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chop etish uchun CSS qoidalari */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .no-print {
              display: none !important;
            }
            #certificate-print-area,
            #certificate-print-area * {
              visibility: visible !important;
            }
            #certificate-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 24px !important;
              border: 3px double #d97706 !important;
              border-radius: 16px !important;
              background: #ffffff !important;
              color: #0f172a !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
