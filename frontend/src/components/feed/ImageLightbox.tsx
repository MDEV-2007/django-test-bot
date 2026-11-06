'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Download, X } from 'lucide-react';

/* Post rasmini kattalashtirib ko'rish — "Pastel Studio" uslubidagi ramka */
export default function ImageLightbox({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Post rasmi"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="ps-shell fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center p-4 sm:p-8"
        >
          {/* Fon: qorong'i parda + pastel nur */}
          <div aria-hidden className="absolute inset-0 bg-[#0B0814]/80 backdrop-blur-xl" />
          <div aria-hidden className="absolute -left-24 top-1/4 size-[420px] rounded-full bg-[#BFA6F0] opacity-25 blur-[120px]" />
          <div aria-hidden className="absolute -right-24 bottom-1/4 size-[380px] rounded-full bg-[#8BC5E8] opacity-25 blur-[120px]" />

          {/* Yopish */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="absolute right-4 top-4 z-10 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#FFFCF7] text-[#080808] shadow-lg transition-transform hover:rotate-90 sm:right-6 sm:top-6"
          >
            <X className="size-5" />
          </button>

          <motion.figure
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative flex max-h-full max-w-5xl cursor-default flex-col items-center"
          >
            {/* Kremli ramka */}
            <div className="relative rounded-[32px] bg-[#FFFCF7] p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] sm:p-2.5">
              <span aria-hidden className="absolute -left-3 -top-3 size-10 rounded-full bg-[#FFB82E]" />
              <span aria-hidden className="absolute -bottom-3 -right-3 size-8 rounded-full bg-[#7659C7]" />
              <img
                src={src}
                alt="Post rasmi"
                className="relative block h-[min(calc(100svh-200px),720px)] w-auto max-w-[min(88vw,1100px)] rounded-[24px] bg-[#F2EADF] object-contain [image-rendering:auto]"
              />
            </div>

            {/* Asboblar paneli */}
            <figcaption className="mt-5 flex items-center gap-2 rounded-full bg-[#FFFCF7] p-1.5 shadow-lg">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-[#080808] transition-colors hover:bg-[#F2EADF]"
              >
                <ArrowUpRight className="size-4" />
                Yangi oynada
              </a>
              <a
                href={src}
                download
                className="inline-flex items-center gap-2 rounded-full bg-[#080808] px-4 py-2 text-[13px] font-bold text-[#FFFCF7] transition-transform hover:-translate-y-0.5"
              >
                <Download className="size-4 text-[#FFB82E]" />
                Yuklab olish
              </a>
            </figcaption>
            <p className="mt-3 text-[11.5px] font-semibold text-white/50">Yopish uchun Esc yoki bo&apos;sh joyga bosing</p>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
