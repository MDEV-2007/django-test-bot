'use client';

import { useState, useEffect } from 'react';
import { Send, Copy, Check, X, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ShareTestModalProps {
  test?: { id: number; title: string; subject?: string | null; duration_minutes?: number };
  testId?: number;
  testTitle?: string;
  subject?: string | null;
  durationMinutes?: number;
  questionCount?: number;
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export default function ShareTestModal({
  test,
  testId,
  testTitle,
  subject,
  durationMinutes,
  isOpen,
  open,
  onClose,
  onOpenChange,
}: ShareTestModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);
  const [origin, setOrigin] = useState('');

  const isVisible = Boolean(open ?? isOpen);
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isVisible) return null;

  const actualId = test?.id ?? testId ?? 0;
  const actualTitle = test?.title ?? testTitle ?? 'Sinov Testi';
  const actualSubject = test?.subject ?? subject;
  const actualDuration = test?.duration_minutes ?? durationMinutes;

  const testUrl = `${origin}/tests/${actualId}`;
  const shareText = `📚 Test: ${actualTitle}\n` +
    (actualSubject ? `📌 Fan: ${actualSubject}\n` : '') +
    (actualDuration ? `⏳ Davomiyligi: ${actualDuration} daqiqa\n` : '') +
    `\n👇 Testni yechish uchun bosing:\n${testUrl}`;

  async function copyLink() {
    await navigator.clipboard.writeText(testUrl);
    setCopiedLink(true);
    toast.success('Test havolasi nusxalandi');
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function copyPost() {
    await navigator.clipboard.writeText(shareText);
    setCopiedPost(true);
    toast.success('Telegram post matni nusxalandi');
    setTimeout(() => setCopiedPost(false), 2000);
  }

  function shareToTelegram() {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(testUrl)}&text=${encodeURIComponent(`📚 Test: ${actualTitle}\nO'z bilimingizni sinab ko'ring!`)}`;
    window.open(tgUrl, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-card)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Share2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Testni ulashish</h2>
              <p className="text-xs text-muted-foreground">O&apos;quvchilaringiz yoki Telegram guruhga yuboring</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
            <X className="size-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* To'g'ridan-to'g'ri Telegram tugmasi */}
          <Button onClick={shareToTelegram} className="w-full bg-[#229ED9] hover:bg-[#1e8cc1] text-white gap-2 h-11">
            <Send className="size-4" /> Telegram guruhga yuborish
          </Button>

          {/* Havola nusxalash */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">To&apos;g&apos;ri havola</label>
            <div className="flex items-center gap-2">
              <Input readOnly value={testUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Nusxalash">
                {copiedLink ? <Check className="size-4 text-[var(--success-text)]" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Tayyor Telegram post matni */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Tayyor Telegram xabari</label>
              <Button variant="ghost" size="sm" onClick={copyPost} className="h-6 text-xs text-[var(--accent-text)] gap-1">
                {copiedPost ? <Check className="size-3 text-[var(--success-text)]" /> : <Copy className="size-3" />}
                {copiedPost ? 'Nusxalandi' : 'Matnni nusxalash'}
              </Button>
            </div>
            <Textarea readOnly value={shareText} rows={5} className="font-mono text-xs leading-relaxed" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border-card)] bg-[var(--surface-input)] px-6 py-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}
