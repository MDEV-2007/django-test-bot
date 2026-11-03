'use client';

import { useEffect } from 'react';
import { captureSource } from '@/lib/attribution';

/** Har sahifada bir marta: URL'dagi ?src= / utm belgisini saqlab qo'yadi. */
export default function SourceCapture() {
  useEffect(() => {
    captureSource();
  }, []);
  return null;
}
