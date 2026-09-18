'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  variant = 'destructive',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-4">
          {/* Tone Icon */}
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-2xl border',
              isDestructive && 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-500',
              isWarning && 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500',
              isSuccess && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500',
              !isDestructive && !isWarning && !isSuccess && 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-500'
            )}
          >
            {isDestructive && <Trash2 className="size-5" />}
            {isWarning && <AlertTriangle className="size-5" />}
            {isSuccess && <CheckCircle2 className="size-5" />}
            {!isDestructive && !isWarning && !isSuccess && <Info className="size-5" />}
          </div>

          <div className="flex-1 space-y-1">
            <DialogHeader className="p-0 pr-0">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2 sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
