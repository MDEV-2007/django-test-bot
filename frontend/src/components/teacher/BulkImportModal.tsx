'use client';

import { useRef, useState } from 'react';
import {
  FileText, Sparkles, CheckCircle2, AlertCircle, Loader2, X, Plus,
  UploadCloud, Trash2, Check, FileUp, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
Javob: B`;

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
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleAiParse() {
    if (mode === 'file' && !file) {
      toast.error("Iltimos, avval Word (.docx), PDF yoki matn faylini tanlang.");
      return;
    }
    if (mode === 'text' && !text.trim()) {
      toast.error("Iltimos, test matnini kiriting.");
      return;
    }

    setParsing(true);
    try {
      let res: { ok: boolean; count: number; questions: ParsedQuestion[] };

      if (mode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await apiFetch(`/api/teacher/tests/${testId}/ai-parse/`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await apiFetch(`/api/teacher/tests/${testId}/ai-parse/`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
      }

      if (res.ok && res.questions?.length) {
        setParsed(res.questions);
        toast.success(`AI tomonidan ${res.questions.length} ta savol muvaffaqiyatli aniqlandi!`);
      } else {
        toast.error("Savollarni aniqlab bo'lmadi.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Faylni tahlil qilishda xatolik yuz berdi.");
    } finally {
      setParsing(false);
    }
  }

  function handleRemoveQuestion(idx: number) {
    setParsed((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleToggleCorrect(qIdx: number, optIdx: number) {
    setParsed((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.map((o, oi) => ({
          ...o,
          is_correct: oi === optIdx,
        }));
        return { ...q, options: newOpts };
      }),
    );
  }

  async function handleImport() {
    if (parsed.length === 0) {
      toast.error("Import qilish uchun kamida bitta to'liq savol kerak.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ ok: boolean; count: number }>(`/api/teacher/tests/${testId}/questions/bulk/`, {
        method: 'POST',
        body: JSON.stringify({ questions: parsed }),
      });

      if (res.ok) {
        toast.success(`${res.count} ta savol muvaffaqiyatli testga qo'shildi!`);
        setText('');
        setFile(null);
        setParsed([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-card)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">AI Smart Test Importer</h2>
              <p className="text-xs text-muted-foreground">Word (.docx), PDF yoki matn orqali 5 soniyada avtomatik test to&apos;plamini tuzing</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full size-9">
            <X className="size-5" />
          </Button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-card)] bg-[var(--surface-input)] px-6 py-2.5">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
              mode === 'file'
                ? 'bg-[var(--surface-card)] text-indigo-500 shadow-sm border border-[var(--border-card)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UploadCloud className="size-3.5" />
            Fayl yuklash (.docx, .pdf, .txt)
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
              mode === 'text'
                ? 'bg-[var(--surface-card)] text-indigo-500 shadow-sm border border-[var(--border-card)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="size-3.5" />
            Matn kiritish
          </button>
        </div>

        {/* Content Body */}
        <div className="grid flex-1 gap-6 overflow-y-auto p-5 sm:p-6 md:grid-cols-2">
          {/* Chap ustun: Yuklash / Kiritish */}
          <div className="flex flex-col space-y-3">
            {mode === 'file' ? (
              <div className="flex flex-col flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all min-h-[260px] flex-1',
                    file
                      ? 'border-indigo-500/50 bg-indigo-500/5'
                      : 'border-[var(--border-strong)] hover:border-indigo-500/40 hover:bg-[var(--surface-hover)]',
                  )}
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 mb-3">
                    <FileUp className="size-7" />
                  </div>
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · Boshqa fayl tanlash uchun bosing
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">Word (.docx) yoki PDF faylini shu yerga tashlang</p>
                      <p className="text-xs text-muted-foreground">yoki kompyuterdan tanlash uchun bosing</p>
                      <p className="text-[11px] text-muted-foreground/80 pt-1">Maksimal hajm: 20 MB (.docx, .pdf, .txt)</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleAiParse}
                  disabled={!file || parsing}
                  className="w-full gap-2 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/25"
                >
                  {parsing ? <Loader2 className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                  {parsing ? "AI testlarni tahlil qilmoqda..." : "✨ AI orqali tahlil qilish"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 space-y-3">
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
                  className="min-h-[260px] flex-1 font-mono text-xs leading-relaxed"
                />
                <Button
                  onClick={handleAiParse}
                  disabled={!text.trim() || parsing}
                  className="w-full gap-2 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/25"
                >
                  {parsing ? <Loader2 className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                  {parsing ? "AI testlarni tahlil qilmoqda..." : "✨ AI orqali tahlil qilish"}
                </Button>
              </div>
            )}
          </div>

          {/* O'ng ustun: Aniqlangan savollar ro'yxati (Preview) */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Tahlil natijalari ({parsed.length} ta savol)
              </label>
              {parsed.length > 0 && (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                  {parsed.length} ta savol tayyor
                </Badge>
              )}
            </div>

            <div className="max-h-[380px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--border-card)] bg-[var(--surface-input)] p-3">
              {parsing ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="size-8 text-indigo-500 animate-spin mb-3" />
                  <p className="text-xs font-bold text-foreground">AI faylni o&apos;qimoqda va savollarni ajratmoqda...</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Bu jarayon bir necha soniya vaqt oladi.</p>
                </div>
              ) : parsed.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-14 text-center text-muted-foreground">
                  <AlertCircle className="size-8 opacity-40 mb-2" />
                  <p className="text-xs font-semibold">Savollar hali tahlil qilinmagan</p>
                  <p className="text-[11px] opacity-70 mt-0.5">Faylni yuklang va &quot;AI orqali tahlil qilish&quot; tugmasini bosing.</p>
                </div>
              ) : (
                parsed.map((q, qIdx) => (
                  <Card key={qIdx} className="border-[var(--border-card)] bg-[var(--surface-card)] relative group">
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 font-mono text-[11px] font-bold text-indigo-500">
                            {qIdx + 1}
                          </span>
                          <p className="text-xs font-semibold leading-snug">{q.body}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="size-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                          title="Savolni o'chirish"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <button
                            type="button"
                            key={optIdx}
                            onClick={() => handleToggleCorrect(qIdx, optIdx)}
                            title="To'g'ri variant qilib belgilash uchun bosing"
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] border transition-all cursor-pointer',
                              opt.is_correct
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'border-transparent bg-[var(--surface-input)] text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + optIdx)})</span>
                            <span className="truncate flex-1">{opt.text}</span>
                            {opt.is_correct && <CheckCircle2 className="size-3 text-emerald-500 shrink-0 ml-auto" />}
                          </button>
                        ))}
                      </div>

                      {q.explanation && (
                        <p className="text-[10px] text-muted-foreground italic border-t border-[var(--border-card)] pt-1 mt-1">
                          <strong>Izoh:</strong> {q.explanation}
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
        <div className="flex items-center justify-between border-t border-[var(--border-card)] bg-[var(--surface-input)] px-6 py-3.5">
          <span className="text-xs text-muted-foreground">
            {parsed.length > 0 ? `${parsed.length} ta savol saqlashga tayyor` : "Savollar kiritilishi kutilmoqda"}
          </span>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={handleClose} disabled={saving || parsing}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsed.length === 0 || saving || parsing}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {saving ? 'Qo&apos;shilmoqda...' : `${parsed.length} ta savolni testga qo'shish`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
