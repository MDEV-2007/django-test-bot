import type { Metadata } from 'next';

// Shaxsiy to'lov havolasi: qidiruvga chiqmasligi va havolalari kuzatilmasligi kerak.
export const metadata: Metadata = {
  title: "Farzandingiz uchun to'lov",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
