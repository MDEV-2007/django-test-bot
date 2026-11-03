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
      toast.success('Rasmiy PDF sertifikat muvaffaqiyatli yuklab olindi!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Sariq-oq rasmiy sertifikatni yuqori aniqlikda (A4 Portrait) Canvas orqali PNG yuklab olish
  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 1240;
      const height = 1754; // A4 150 DPI
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // 1. Fon (Qaymoqrang / sariq-oq iliq qog'oz)
      ctx.fillStyle = '#fefcf6';
      ctx.fillRect(0, 0, width, height);

      // 2. Hashamatli tilla hoshiyalar
      const goldMain = '#c59b27';
      const goldLight = '#e2c275';

      // Tashqi hoshiya
      ctx.lineWidth = 4;
      ctx.strokeStyle = goldMain;
      ctx.strokeRect(35, 35, width - 70, height - 70);

      // Ichki hoshiya
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = goldLight;
      ctx.strokeRect(45, 45, width - 90, height - 90);

      // 3. Burchakdagi sharqona girih naqshlari
      const drawGirihCorner = (cx: number, cy: number, size: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.8;
        // 8 qirrali yulduz naqshi
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 4);
          ctx.strokeRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      };
      drawGirihCorner(90, height - 90, 70);
      drawGirihCorner(width - 90, 90, 70);

      // 4. Yuqori Gerb / Logo
      const logoY = 130;
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/icon-192.png';
      await new Promise((res) => {
        logoImg.onload = res;
        logoImg.onerror = res;
      });

      // Gerb doirasi va hoshiyasi
      ctx.beginPath();
      ctx.arc(width / 2, logoY, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = goldMain;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, logoY, 43, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = goldLight;
      ctx.stroke();

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, logoY, 40, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, width / 2 - 40, logoY - 40, 80, 80);
        ctx.restore();
      }

      // Sarlavha. Davlat organi (BMB) nomi, "respublika markazi", imzo va muhr ataylab
      // yo'q: bu platformaning mashq natijasi — davlat hujjatiga o'xshatish noqonuniy.
      ctx.textAlign = 'center';
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 22px "Times New Roman", serif';
      ctx.fillText("ILMILDIZI · ONLAYN MASHQ PLATFORMASI", width / 2, 226);
      ctx.fillStyle = '#1c3c87';
      ctx.font = 'bold 18px "Arial", sans-serif';
      ctx.fillText("RASMIY HUJJAT EMAS · BMB FORMATIDAGI MASHQ TESTI", width / 2, 256);

      // Asosiy Sarlavha
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px "Times New Roman", serif';
      ctx.fillText("MASHQ TESTI", width / 2, 330);
      ctx.fillText("NATIJA KARTASI", width / 2, 372);

      // 5. Ma'lumotlar jadvali qatorlari
      const startY = 460;
      const rowGap = 48;
      const leftX = 130;
      const rightX = 480;
      const lineEndX = width - 130;

      const drawDataRow = (y: number, label: string, val: string, isBlueLabel = true, rightAlign = false) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = isBlueLabel ? '#1c3c87' : '#0f172a';
        ctx.font = 'bold 20px "Arial", sans-serif';
        ctx.fillText(label, leftX, y);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px "Arial", sans-serif';
        if (rightAlign) {
          ctx.textAlign = 'right';
          ctx.fillText(val, lineEndX, y);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(val, rightX, y);
        }
      };

      const drawDivider = (y: number) => {
        ctx.strokeStyle = '#e2c275';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(lineEndX, y);
        ctx.stroke();
      };

      // Qatorlar 1: Talabgor
      drawDataRow(startY, 'Natija raqami:', certNumber);
      drawDataRow(startY + rowGap, 'Talabgorning shaxsiy kodi:', personalCode);
      drawDataRow(startY + rowGap * 2, 'Familiyasi:', lastName);
      drawDataRow(startY + rowGap * 3, 'Ismi:', firstName);
      drawDivider(startY + rowGap * 3.7);

      // Qatorlar 2: Fan va Ball
      const sec2Y = startY + rowGap * 4.6;
      drawDataRow(sec2Y, "Umumta'lim fani:", testTitle || 'Tarix Milliy Sertifikat');
      drawDataRow(sec2Y + rowGap, "Umumiy to'plagan bali:", scaledScoreStr);
      drawDataRow(sec2Y + rowGap * 2, "Umumiy ballga nisbatan foiz ko'rsatkichi:", pctStr, true, true);
      drawDataRow(sec2Y + rowGap * 3, 'Taxminiy daraja:', certGrade);
      drawDivider(sec2Y + rowGap * 3.7);

      // Qatorlar 3: Sinov natijasi
      const sec3Y = sec2Y + rowGap * 4.6;
      drawDataRow(sec3Y, 'Test sinovi natijasi:', scaledScoreComma, true, true);
      drawDivider(sec3Y + rowGap * 0.8);

      // Qatorlar 4: Muddatlar
      const sec4Y = sec3Y + rowGap * 1.7;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 20px "Arial", sans-serif';
      ctx.fillText('Berilgan sanasi:', leftX, sec4Y);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(givenDate, leftX + 165, sec4Y);

      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Amal qilish muddati:', width / 2 + 50, sec4Y);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(expireDate, width / 2 + 265, sec4Y);

      // O'rta oltin gul/barg bezak chizig'i
      const ornamentY = sec4Y + 65;
      ctx.strokeStyle = goldMain;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX, ornamentY);
      ctx.lineTo(width / 2 - 40, ornamentY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width / 2 + 40, ornamentY);
      ctx.lineTo(lineEndX, ornamentY);
      ctx.stroke();

      ctx.fillStyle = goldMain;
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText('❖ ✦ ❖', width / 2, ornamentY + 8);

      // 6. Pastki QR Kod va Imzo
      const footerY = height - 200;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px "Times New Roman", serif';

      // Markazda: QR Kod
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        const qrSize = 130;
        ctx.drawImage(qrImg, width / 2 - qrSize / 2, footerY, qrSize, qrSize);

        // QR hoshiyasi
        ctx.strokeStyle = goldMain;
        ctx.lineWidth = 2;
        ctx.strokeRect(width / 2 - qrSize / 2 - 4, footerY - 4, qrSize + 8, qrSize + 8);

        finishDownload();
      };
      qrImg.onerror = () => {
        // Fallback agar internet yo'q bo'lsa
        ctx.strokeStyle = '#0f172a';
        ctx.strokeRect(width / 2 - 60, footerY, 120, 120);
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText("NATIJANI KO'RISH", width / 2, footerY + 65);
        finishDownload();
      };
      qrImg.src = qrImgUrl;

      function finishDownload() {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `Milliy_Sertifikat_${lastName}_${firstName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Sariq-oq rasmiy sertifikat rasm shaklida yuklab olindi!");
        setDownloading(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      setDownloading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto border border-amber-300 bg-[#fefcf6] text-[#0f172a] shadow-2xl p-4 sm:p-6 print:border-none print:p-0">
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
          <div className="py-2 sm:py-4 flex justify-center">
            <div
              id="certificate-print-area"
              className="relative w-full max-w-[680px] bg-[#fefcf6] border-[4px] border-[#c59b27] p-2 sm:p-3.5 shadow-2xl rounded-sm print:m-0 print:w-full print:border-none print:shadow-none"
            >
              {/* Ichki nozik tilla hoshiya */}
              <div className="relative border-[1.5px] border-[#d4af37] p-5 sm:p-8 bg-[#fdfbf7] flex flex-col items-center">
                
                {/* Chap-pastki sharqona girih naqshi */}
                <div className="pointer-events-none absolute bottom-3 left-3 size-24 sm:size-28 opacity-75">
                  <svg viewBox="0 0 100 100" className="size-full stroke-[#d4af37] fill-none stroke-[1.5]">
                    <rect x="20" y="20" width="60" height="60" />
                    <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
                    <circle cx="50" cy="50" r="16" />
                    <circle cx="50" cy="50" r="30" strokeDasharray="3 3" />
                  </svg>
                </div>

                {/* O'ng-yuqori sharqona girih naqshi */}
                <div className="pointer-events-none absolute top-3 right-3 size-24 sm:size-28 opacity-75">
                  <svg viewBox="0 0 100 100" className="size-full stroke-[#d4af37] fill-none stroke-[1.5]">
                    <rect x="20" y="20" width="60" height="60" />
                    <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
                    <circle cx="50" cy="50" r="16" />
                  </svg>
                </div>

                {/* Orqa fon: Nozik IlmIldizi Watermark */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-192.png" alt="" className="size-72 sm:size-88 object-contain grayscale" />
                </div>

                {/* 1. Gerb / Logo: Rasmiy IlmIldizi Medallion */}
                <div className="relative flex flex-col items-center text-center mb-3 z-10">
                  <div className="size-18 sm:size-22 rounded-full border-2 border-[#c59b27] bg-white flex items-center justify-center p-2 mb-2 shadow-md ring-4 ring-[#e5c158]/35">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icon-192.png"
                      alt="IlmIldizi"
                      className="size-full object-contain rounded-full"
                    />
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-[#065f46] uppercase tracking-wider font-serif">
                    ILMILDIZI · ONLAYN MASHQ PLATFORMASI
                  </p>
                  <p className="text-[10px] sm:text-xs font-extrabold text-[#1c3c87] uppercase tracking-wide mt-0.5">
                    Rasmiy hujjat emas · BMB formatidagi mashq testi
                  </p>
                </div>

                {/* 2. Asosiy Sarlavha */}
                <div className="text-center my-3 sm:my-4">
                  <h2 className="font-serif text-lg sm:text-2xl font-black text-[#0f172a] uppercase tracking-wide leading-tight">
                    MASHQ TESTI
                  </h2>
                  <h2 className="font-serif text-lg sm:text-2xl font-black text-[#0f172a] uppercase tracking-wide leading-tight">
                    NATIJA KARTASI
                  </h2>
                </div>

                {/* 3. Ma'lumotlar bloki (Qatorma-qator va tillarang chiziqlar) */}
                <div className="w-full mt-3 space-y-4 text-xs sm:text-sm">
                  {/* Blok 1 */}
                  <div className="space-y-1.5 pb-2 border-b border-[#e5c158]/90">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Natija raqami:</span>
                      <span className="font-mono font-bold text-[#0f172a] text-right">{certNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Talabgorning shaxsiy kodi:</span>
                      <span className="font-mono font-bold text-[#0f172a] text-right">{personalCode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Familiyasi:</span>
                      <span className="font-bold text-[#0f172a] tracking-wide text-right">{lastName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Ismi:</span>
                      <span className="font-bold text-[#0f172a] tracking-wide text-right">{firstName}</span>
                    </div>
                  </div>

                  {/* Blok 2 */}
                  <div className="space-y-1.5 pb-2 border-b border-[#e5c158]/90">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Umumta&apos;lim fani:</span>
                      <span className="font-bold text-[#0f172a] text-right">{testTitle || "Tarix Milliy Sertifikat"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Umumiy to&apos;plagan bali:</span>
                      <span className="font-mono font-black text-[#0f172a] text-base text-right">{scaledScoreStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Umumiy ballga nisbatan foiz ko&apos;rsatkichi:</span>
                      <span className="font-mono font-bold text-[#0f172a] text-right">{pctStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c3c87]">Taxminiy daraja:</span>
                      <span className="font-mono font-black text-amber-700 text-base sm:text-lg text-right">{certGrade}</span>
                    </div>
                  </div>

                  {/* Blok 3: Test sinovi natijasi */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5c158]/90">
                    <span className="font-bold text-[#1c3c87]">Test sinovi natijasi:</span>
                    <span className="font-mono font-black text-[#0f172a] text-base text-right">{scaledScoreComma}</span>
                  </div>

                  {/* Blok 4: Sanalar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1e3a8a]">Berilgan sanasi:</span>
                      <span className="font-mono text-xs text-[#0f172a]">{givenDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1e3a8a]">Amal qilish muddati:</span>
                      <span className="font-mono text-xs text-[#0f172a]">{expireDate}</span>
                    </div>
                  </div>
                </div>

                {/* Markaziy oltin bezak ajratgich */}
                <div className="w-full flex items-center justify-center gap-3 my-5 sm:my-6">
                  <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#c59b27] to-[#c59b27]" />
                  <span className="text-[#c59b27] text-base font-serif">❖ ✦ ❖</span>
                  <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#c59b27] to-[#c59b27]" />
                </div>

                {/* 4. Pastki qism: natija sahifasiga QR havola (imzo/muhr yo'q) */}
                <div className="w-full flex items-center justify-center mt-1 pt-1">
                  <div className="shrink-0 flex flex-col items-center justify-center p-1.5 border-2 border-[#c59b27] rounded-md bg-white shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImgUrl}
                      alt="Natija sahifasiga QR havola"
                      className="size-20 sm:size-24 object-contain"
                    />
                    <span className="text-[8px] font-mono font-bold text-[#1e3a8a] mt-0.5 tracking-tight">
                      NATIJANI KO&apos;RISH
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareToCommunityModal
        open={communityModalOpen}
        onOpenChange={setCommunityModalOpen}
        attemptId={attemptId}
        testTitle={testTitle}
        score={score}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        postType="certificate"
      />
    </>
  );
}
