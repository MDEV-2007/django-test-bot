'use client';

import { useState } from 'react';
import { FileText, Sparkles, CheckCircle2, AlertCircle, Loader2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type ParsedOption = {
  text: string;
  is_correct: boolean;
};

type ParsedQuestion = {
  body: string;
  options: ParsedOption[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
};

const SAMPLE_TEXT = `1. Amir Temur qachon va qayerda tavallud topgan?
A) 1336-yil 9-aprelda Kesh (Shahrisabz) yaqinidagi Xo'ja Ilg'or qishlog'ida
B) 1340-yil Samarqand shahrida
C) 1330-yil Buxoro shahrida
D) 1405-yil O'tror shahrida
Javob: A
Izoh: Sohibqiron Amir Temur 1336-yil 9-aprelda tavallud topgan.

2. Alisher Navoiy turkiy tilda birinchi bo'lib qaysi yirik asarni yaratgan?
A) Boburnoma
B) Xamsa
C) Zafarnoma
D) Shajarayi turk
interface BulkImportModalProps {
  testId: number;
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  onImportSuccess?: () => void;
}

export default function BulkImportModal({
  testId,
  isOpen,
  open,
  onClose,
  onOpenChange,
  onSuccess,
  onImportSuccess,
}: BulkImportModalProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const isVisible = Boolean(open ?? isOpen);
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };
  const handleSuccess = () => {
    if (onImportSuccess) onImportSuccess();
    if (onSuccess) onSuccess();
  };

  if (!isVisible) return null;

  function parseQuestions(raw: string): ParsedQuestion[] {
    if (!raw.trim()) return [];

    // Savollarni bo'laklarga ajratish (1. yoki 1) yoki ikki bo'sh satr)
    const blocks = raw.split(/\n\s*(?=(?:\d+[\.\)]\s+))/g).filter((b) => b.trim());
    const result: ParsedQuestion[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let body = '';
      const options: ParsedOption[] = [];
      let explanation = '';
      let detectedAnswerLetter: string | null = null;

      // 1. Javob va izoh satrlarini aniqlash
      for (const line of lines) {
        const ansMatch = line.match(/(?:Javob|Kalit|To['‘`]?g['‘`]?ri javob|Answer)\s*[:=-]\s*([A-Za-z])/i);
        if (ansMatch) {
          detectedAnswerLetter = ansMatch[1].toUpperCase();
          continue;
        }

        const expMatch = line.match(/(?:Izoh|Tushuntirish|Explanation)\s*[:=-]\s*(.+)/i);
        if (expMatch) {
          explanation = expMatch[1].trim();
          continue;
        }

        // Variant satri: A) matn, A. matn, +A) matn, *A) matn
        const optMatch = line.match(/^([*+]?)\s*([A-Za-z])[\)\.\]]\s*(.+)$/i);
        if (optMatch) {
          const isMarked = Boolean(optMatch[1]);
          const letter = optMatch[2].toUpperCase();
          const optText = optMatch[3].trim();

          options.push({
            text: optText,
            is_correct: isMarked || (detectedAnswerLetter !== null && letter === detectedAnswerLetter),
          });
        } else if (options.length === 0) {
          // Hali variantlar boshlanmagan — demak bu savol matni
          // Boshidagi 1. yoki 1) raqamini olib tashlaymiz
          const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
          body = body ? `${body}\n${cleanLine}` : cleanLine;
        }
      }

      // Agar variantlardan hech biri to'g'ri deb belgilanmagan bo'lsa,
      // va `detectedAnswerLetter` topilgan bo'lsa:
      if (detectedAnswerLetter && !options.some((o) => o.is_correct)) {
        const letterIdx = detectedAnswerLetter.charCodeAt(0) - 65; // A=0, B=1...
        if (letterIdx >= 0 && letterIdx < options.length) {
          options[letterIdx].is_correct = true;
        }
      }

      // Agar hali ham to'g'ri javob belgilanmagan bo'lsa va variantlar bor bo'lsa, birinchisini belgilaymiz
      if (options.length > 0 && !options.some((o) => o.is_correct)) {
        options[0].is_correct = true;
      }

      if (body && options.length >= 2) {
        result.push({
          body,
          options,
          explanation,
          difficulty: 'medium',
          points: 1,
        });
      }
    }

    return result;
  }

  const parsed = parseQuestions(text);

  async function handleImport() {
    if (parsed.length === 0) {
      toast.error("Import qilish uchun kamida bitta to'liq savol topilmadi.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ ok: boolean; count: number }>(`/api/teacher/tests/${testId}/questions/bulk/`, {
        method: 'POST',
        body: JSON.stringify({ questions: parsed }),
      });

      if (res.ok) {
        toast.success(`${res.count} ta savol muvaffaqiyatli import qilindi!`);
        setText('');
        handleSuccess();
        handleClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Importda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-card)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Matndan tezkor test import qilish</h2>
              <p className="text-xs text-muted-foreground">Word yoki Telegramdagi tayyor testlarni bir zumda bazaga qo&apos;shing</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
            <X className="size-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
          {/* Chap ustun: Matn kiritish */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Savollar matni</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[var(--accent-text)]"
                onClick={() => setText(SAMPLE_TEXT)}
              >
                <FileText className="size-3.5 mr-1" /> Namuna matnni qo&apos;yish
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="1. Savol matni...&#10;A) Variant 1&#10;B) Variant 2&#10;C) Variant 3&#10;D) Variant 4&#10;Javob: A"
              className="min-h-[320px] flex-1 font-mono text-xs leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Format: Har bir savoldan keyin <strong>A) B) C) D)</strong> variantlar va <strong>Javob: A</strong> (yoki to&apos;g&apos;ri variant oldiga <strong>*</strong>) yoziladi.
            </p>
          </div>

          {/* O'ng ustun: Aniqlangan savollar ko'rinishi */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Aniqlangan savollar ({parsed.length} ta)</label>
              {parsed.length > 0 && (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px]">
                  {parsed.length} ta savol tayyor
                </Badge>
              )}
            </div>

            <div className="max-h-[360px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3">
              {parsed.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <AlertCircle className="size-8 opacity-40 mb-2" />
                  <p className="text-xs">Chap tomonga test matnini kiriting.</p>
                  <p className="text-[11px] opacity-70">Tizim savol va variantlarni avtomatik ajratib oladi.</p>
                </div>
              ) : (
                parsed.map((q, qIdx) => (
                  <Card key={qIdx} className="border-[var(--border-card)] bg-[var(--surface-card)]">
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 font-mono text-[11px] font-bold text-emerald-600">
                          {qIdx + 1}
                        </span>
                        <p className="text-xs font-semibold leading-snug">{q.body}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] border ${
                              opt.is_correct
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-medium'
                                : 'border-transparent bg-[var(--surface-input)] text-muted-foreground'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + optIdx)})</span>
                            <span className="truncate">{opt.text}</span>
                            {opt.is_correct && <CheckCircle2 className="size-3 text-emerald-500 shrink-0 ml-auto" />}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] text-muted-foreground italic border-t pt-1 mt-1">
                          Izoh: {q.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-card)] bg-[var(--surface-input)] px-6 py-3.5">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Bekor qilish
          </Button>
          <Button onClick={handleImport} disabled={parsed.length === 0 || saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {saving ? 'Import qilinmoqda...' : `${parsed.length} ta savolni testga qo'shish`}
          </Button>
        </div>
      </div>
    </div>
  );
}
