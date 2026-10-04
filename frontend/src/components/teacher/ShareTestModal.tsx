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
  const [copiedTgLink, setCopiedTgLink] = useState(false);
  const [copiedWebLink, setCopiedWebLink] = useState(false);
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

  const tgBotUrl = `https://t.me/ilmildiziuz_bot?start=mock_${actualId}`;
  const webUrl = `${origin || 'https://ilmildizi.uz'}/tests/mock/${actualId}`;

  const shareText = `📚 Katta Mock Imtihon: ${actualTitle}\n` +
    (actualSubject ? `📌 Fan: ${actualSubject}\n` : '') +
    (actualDuration ? `⏳ Davomiyligi: ${actualDuration} daqiqa\n` : '') +
    `🎯 Format: Milliy Sertifikat (A+ dan C+ gacha)\n\n` +
    `Barcha abituriyentlar bir vaqtda topshirmoqda. Siz ham bilimingizni sinab ko'ring!\n\n` +
    `📱 Telegram orqali topshirish:\n${tgBotUrl}\n\n` +
    `🌐 Veb-sayt orqali topshirish:\n${webUrl}`;

  async function copyTgLink() {
    await navigator.clipboard.writeText(tgBotUrl);
    setCopiedTgLink(true);
    toast.success('Telegram bot havolasi nusxalandi');
    setTimeout(() => setCopiedTgLink(false), 2000);
  }

  async function copyWebLink() {
    await navigator.clipboard.writeText(webUrl);
    setCopiedWebLink(true);
    toast.success('Veb-sayt havolasi nusxalandi');
    setTimeout(() => setCopiedWebLink(false), 2000);
  }

  async function copyPost() {
    await navigator.clipboard.writeText(shareText);
    setCopiedPost(true);
    toast.success('Telegram e\'lon matni nusxalandi');
    setTimeout(() => setCopiedPost(false), 2000);
  }

  function shareToTelegram() {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(tgBotUrl)}&text=${encodeURIComponent(shareText)}`;
    if (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { openTelegramLink: (url: string) => void } } })?.Telegram?.WebApp?.openTelegramLink) {
      (window as unknown as { Telegram: { WebApp: { openTelegramLink: (url: string) => void } } }).Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
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
              <h2 className="text-base font-bold text-foreground">Imtihonni ulashish</h2>
              <p className="text-xs text-muted-foreground">Telegram bot yoki sayt havolasini do&apos;stlaringizga yuboring</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
            <X className="size-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* To'g'ridan-to'g'ri Telegram tugmasi */}
          <Button onClick={shareToTelegram} className="w-full bg-[#229ED9] hover:bg-[#1e8cc1] text-white font-semibold gap-2 h-11 rounded-xl shadow-md">
            <Send className="size-4" /> Telegram orqali ulashish
          </Button>

          {/* Telegram Bot havolasi */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-sky-500">📱</span> Telegram Bot havolasi (Mini App ochadi)
              </label>
              <span className="text-[10px] text-muted-foreground">Tavsiya etiladi</span>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={tgBotUrl} className="font-mono text-xs bg-[var(--surface-input)]" />
              <Button variant="outline" size="sm" onClick={copyTgLink} className="shrink-0 gap-1.5 text-xs font-medium px-3">
                {copiedTgLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedTgLink ? 'Nusxalandi' : 'Nusxalash'}
              </Button>
            </div>
          </div>

          {/* Veb-sayt havolasi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="text-emerald-500">🌐</span> Veb-sayt havolasi (Brauzer uchun)
            </label>
            <div className="flex items-center gap-2">
              <Input readOnly value={webUrl} className="font-mono text-xs bg-[var(--surface-input)]" />
              <Button variant="outline" size="sm" onClick={copyWebLink} className="shrink-0 gap-1.5 text-xs font-medium px-3">
                {copiedWebLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedWebLink ? 'Nusxalandi' : 'Nusxalash'}
              </Button>
            </div>
          </div>

          {/* Tayyor Telegram post matni */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Tayyor Telegram xabari</label>
              <Button variant="ghost" size="sm" onClick={copyPost} className="h-6 text-xs text-sky-500 gap-1">
                {copiedPost ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copiedPost ? 'Nusxalandi' : 'Postni nusxalash'}
              </Button>
            </div>
            <Textarea readOnly value={shareText} rows={5} className="font-mono text-xs leading-relaxed bg-[var(--surface-input)] resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border-card)] bg-[var(--surface-input)]/50 px-6 py-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}
