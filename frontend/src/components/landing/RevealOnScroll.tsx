'use client';

import React from 'react';

/**
 * RevealOnScroll wrapper.
 * Kontent dastlabki renderdayoq 100% ko'rinib turishi shart (opacity: 0 bo'lmasligi kerak),
 * aks holda JS yuklanguncha sahifa bo'sh (oq) ko'rinib qotib qoladi.
 */
export default function RevealOnScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  y?: number;
}) {
  return (
    <div className={`transition-opacity duration-300 ${className || ''}`}>
      {children}
    </div>
  );
}
