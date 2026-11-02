'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';

interface UseExamAntiCheatOptions {
  attemptId: number | string;
  userId?: number | string;
  username?: string;
  maxViolations?: number; // Sukut bo'yicha 3 marta
  onDisqualified?: () => void;
  enabled?: boolean;
}

export function useExamAntiCheat({
  attemptId,
  userId,
  username,
  maxViolations = 3,
  onDisqualified,
  enabled = true,
}: UseExamAntiCheatOptions) {
  const [tabSwitchesCount, setTabSwitchesCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);
  const lastViolationTime = useRef(0);

  const handleViolation = useCallback(
    async (reason: string) => {
      if (!enabled || isDisqualified) return;

      const now = Date.now();
      // 1.5 soniya ichidagi takroriy triggerlarni filtrlash (debounce)
      if (now - lastViolationTime.current < 1500) return;
      lastViolationTime.current = now;

      setTabSwitchesCount((prev) => {
        const nextCount = prev + 1;

        soundFX.incorrect?.();
        tgHaptic('error');

        if (nextCount >= maxViolations) {
          setIsDisqualified(true);
          setShowWarningModal(true);
          setWarningMessage(
            `Diqqat! Siz imtihon oynasidan ${nextCount} marta chiqdingiz. Qoidalarga ko'ra natijangiz bekor qilindi va sovrinli reytingdan chetlatildingiz.`
          );

          // Backendga chetlatish signalini yuborish
          apiFetch(`/api/tests/attempts/${attemptId}/flag-cheat/`, {
            method: 'POST',
            body: JSON.stringify({
              tab_switches: nextCount,
              reason: 'TAB_SWITCH_LIMIT_EXCEEDED',
            }),
          }).catch(() => {});

          if (onDisqualified) onDisqualified();
        } else {
          setShowWarningModal(true);
          setWarningMessage(
            `Ogohlantirish (${nextCount}/${maxViolations})! Imtihon paytida boshqa ilovalarga yoki brauzer oynasiga o'tish taqiqlanadi. Yana ${
              maxViolations - nextCount
            } marta takrorlansa, natijangiz bekor qilinadi!`
          );
        }

        return nextCount;
      });
    },
    [enabled, isDisqualified, maxViolations, attemptId, onDisqualified]
  );

  useEffect(() => {
    if (!enabled || isDisqualified) return;

    // 1. Tab switch (visibility change)
    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Oynadan chiqish aniqlandi");
      }
    };

    // 2. Window blur (boshqa oynaga fokus o'tganda)
    const onWindowBlur = () => {
      handleViolation("Boshqa oynaga o'tish aniqlandi");
    };

    // 3. Nusxalash va kesishni to'sish
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Imtihon paytida savollarni nusxalash taqiqlanadi!");
    };

    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Imtihon paytida matnni kesish taqiqlanadi!");
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Imtihon paytida o'ng tugma menyusi o'chirilgan!");
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [enabled, isDisqualified, handleViolation]);

  return {
    tabSwitchesCount,
    showWarningModal,
    setShowWarningModal,
    warningMessage,
    isDisqualified,
    watermarkText: `${username || 'USER'}_ID:${userId || '0'}`,
  };
}
