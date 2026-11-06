'use client';

import { useState } from 'react';
import { Award, Download, Printer, Share2, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { API_URL } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ShareToCommunityModal from './ShareToCommunityModal';
import CertificateCard from './CertificateCard';

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  testTitle: string;
  score: number; // 70-ballik Rasch balli yoki foiz
  correctCount: number;
  totalQuestions: number;
  date?: string;
  attemptId: string | number;
  percentage?: number;
  grade?: string;
}

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "O'QUVCHI", lastName: "PLATFORMA" };
  if (parts.length === 1) return { firstName: parts[0].toUpperCase(), lastName: "—" };

  // Agar birinchi so'z familiya shaklida bo'lsa (Zafarjonov Jamshidbek)
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  const isFamilyFirst = /(?:ov|ova|yev|yeva)$/i.test(first);

  if (isFamilyFirst) {
    return { lastName: first.toUpperCase(), firstName: last.toUpperCase() };
  }
  return { firstName: first.toUpperCase(), lastName: last.toUpperCase() };
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
  percentage,
  grade,
}: CertificateModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const { access } = useAuthStore();

  const { firstName, lastName } = parseName(studentName);

  // Ball hisoblash: 70 ballik shkala
  const scaledScore = typeof score === 'number'
    ? (score <= 70 ? score : (score / 100) * 70)
    : 49.3;
  const scaledScoreStr = scaledScore.toFixed(1);
  const scaledScoreComma = scaledScoreStr.replace('.', ',');

  // Foiz ko'rsatkichi (75.85 %)
  const pctValue = percentage !== undefined
    ? percentage
    : (totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : (score > 70 ? score : (scaledScore / 70) * 100));
  const pctStr = `${pctValue.toFixed(2)} %`;

  // Daraja (A+, A, B+, B, C+, C)
  let certGrade = grade;
  if (!certGrade) {
    if (scaledScore >= 65.0) certGrade = 'A+';
    else if (scaledScore >= 60.0) certGrade = 'A';
    else if (scaledScore >= 55.0) certGrade = 'B+';
    else if (scaledScore >= 50.0) certGrade = 'B';
    else if (scaledScore >= 46.0) certGrade = 'C+';
    else if (scaledScore >= 42.0) certGrade = 'C';
    else certGrade = '—';
  }

  // Raqamlar va kodlar
  const cleanAttemptId = String(attemptId || '13770');
  const personalCode = cleanAttemptId.slice(-5).padStart(5, '0');
  const certNumber = `DJ26 0607${cleanAttemptId.slice(-7).padStart(7, '0')}`;

  // Sanalar (Berilgan sana va 3 yillik amal qilish muddati)
  const d = date ? new Date(date) : new Date();
  const validD = isNaN(d.getTime()) ? new Date() : d;
  const day = String(validD.getDate()).padStart(2, '0');
  const month = String(validD.getMonth() + 1).padStart(2, '0');
  const year = validD.getFullYear();
  const givenDate = `${day}.${month}.${year}`;
  const expireDate = `${day}.${month}.${year + 3}`;

  // QR kod havolasi
  const qrTargetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tests/${cleanAttemptId}/feedback`
    : `https://ilmildizi.uz/tests/${cleanAttemptId}/feedback`;
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrTargetUrl)}&color=0f172a&bgcolor=fefcf6`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!attemptId) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${API_URL}/api/panel/certificate/${attemptId}/`, {
        headers: access ? { Authorization: `Bearer ${access}` } : {},
      });
      if (!res.ok) {
        throw new Error('Rasmiy PDF sertifikat yuklab olishda xatolik yuz berdi');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sertifikat_${lastName}_${firstName}_${cleanAttemptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Natija kartasi PDF shaklida yuklab olindi!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Natija kartasini PNG qilib yuklab olish. Rasmni backend chizadi
  // (tests_app/certificate_render.py) — saytdagi karta, PDF va Telegram Story bilan bir xil.
  const handleDownloadPng = async () => {
    if (!attemptId) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/panel/certificate/${attemptId}/?kind=png`, {
        headers: access ? { Authorization: `Bearer ${access}` } : {},
      });
      if (!res.ok) throw new Error("Natija kartasini yuklab olishda xatolik yuz berdi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Natija_kartasi_${lastName}_${firstName}_${cleanAttemptId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Natija kartasi rasm shaklida yuklab olindi!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="ps-shell max-h-[94vh] max-w-4xl overflow-y-auto rounded-[32px] border-0 bg-[#F2EADF] p-4 text-[#080808] shadow-2xl sm:p-6 print:border-none print:p-0">
          <DialogHeader className="no-print border-b border-amber-200/80 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  <Award className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-[#0f172a]">
                    Natija kartasi
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    IlmIldizi mashq testi natijasi — rasmiy BMB sertifikati emas
                  </p>
                </div>
              </div>

              {/* Yuklab olish tugmalari */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCommunityModalOpen(true)}
                  className="gap-1.5 rounded-xl border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold"
                >
                  <Sparkles className="size-3.5 text-amber-600" /> Hamjamiyatda ulashish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloading}
                  onClick={handleDownloadPng}
                  className="gap-1.5 rounded-xl border-amber-500 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                >
                  <Download className="size-3.5" /> {downloading ? 'Tayyorlanmoqda...' : 'Rasm (PNG) yuklab olish'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloadingPdf}
                  onClick={handleDownloadPdf}
                  className="gap-1.5 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  <Download className="size-3.5" /> {downloadingPdf ? '...' : 'PDF yuklab olish'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-1.5 rounded-xl border-slate-300 bg-white text-xs font-semibold"
                >
                  <Printer className="size-3.5" /> Chop etish
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* ═════════════════════════════════════════════════════════════
              RASMIY SARIQ-OQ SERTIFIKAT BLOKI (A4 PORTRAIT)
              ═════════════════════════════════════════════════════════════ */}
          <div className="flex justify-center py-2 sm:py-4">
            <CertificateCard
              id="certificate-print-area"
              className="max-w-[640px] print:m-0 print:w-full print:shadow-none"
              attemptId={attemptId}
              studentName={lastName !== '—' ? `${lastName} ${firstName}` : firstName}
              testTitle={testTitle || 'Tarix Milliy Sertifikat'}
              score={score}
              correctCount={correctCount}
              totalQuestions={totalQuestions}
              percentage={percentage}
              grade={grade}
              date={date}
              qrImgUrl={qrImgUrl}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ShareToCommunityModal
        open={communityModalOpen}
        onOpenChange={setCommunityModalOpen}
        attemptId={attemptId}
        testTitle={testTitle}
        score={score}
        percentage={percentage}
        grade={grade}
        studentName={studentName}
        date={date}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        postType="certificate"
      />
    </>
  );
}
