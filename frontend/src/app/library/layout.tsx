import type { Metadata } from 'next';

// Kabinet sahifasi: kontent faqat brauzerda yuklanadi, qidiruvda bo'sh ko'rinadi.
// Havolalardan o'tishga ruxsat (follow), lekin indekslanmaydi.
export const metadata: Metadata = {
  title: "Kutubxona",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
