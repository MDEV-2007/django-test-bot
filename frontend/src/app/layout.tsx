import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Toaster } from "@/components/ui/sonner";
import MotionProvider from "@/components/motion/MotionProvider";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import TelegramProvider from "@/components/TelegramProvider";
import SubscriptionGate from "@/components/SubscriptionGate";

/* Uch shriftli tizim (UI_UX_ANALIZ_VA_REJA.md, 2.1-bo'lim):
   - Plus Jakarta Sans — butun interfeys matni. Inter'ga nisbatan x-height'i baland,
     shuning uchun mayda o'lchamda ham aniq o'qiladi.
   - Bricolage Grotesque — sarlavhalar ("brend ovozi"). Ilgari serif Newsreader edi,
     u qisqa qalin sarlavhalarda bo'shashib ko'rinardi.
   - Geist Mono — raqamlar (XP, ball, taymer, ELO).
   `latin-ext` subset MAJBURIY: o'zbek lotinidagi ʻ / ʼ / ō belgilari shu subsetda. */
const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-voice", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

/* Telegram Mini App / mobil: `viewport-fit=cover` bo'lmasa `env(safe-area-inset-*)`
   qiymatlari doim 0 qaytadi va pastki tab-bar telefonning "home indicator" chizig'i
   ostida qolib ketadi. `maximumScale` cheklanmaydi — bu qulaylikni buzadi. */
export const viewport: Viewport = {
  themeColor: '#08090c',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

/* `metadataBase` bo'lmasa Next nisbiy og'zaki (canonical, og:image) manzillarni to'liq
   URL'ga aylantira olmaydi va ogohlantirish beradi.

   Sukut bo'yicha NOINDEX: saytning deyarli barcha sahifasi login ortida va robot u yerda
   faqat bo'sh qobiqni ko'radi. Ochiq sahifalar (landing) o'z `metadata` sida indekslashni
   ochiq yoqadi. */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz'),
  title: {
    default: "IlmIldizi — Milliy sertifikat va BBA'ga tayyorgarlik",
    template: '%s · IlmIldizi',
  },
  description: "Rasmiy formatdagi mock testlar, AI mentor va zaif mavzular tahlili.",
  applicationName: 'IlmIldizi',
  robots: { index: false, follow: false },
  // Havola ulashilganda (Telegram, ijtimoiy tarmoq) ko'rinadigan oldi rasm. `icon.png`
  // va `apple-icon.png` ni Next.js app/ ichidan o'zi topadi, og:image esa aniq
  // ko'rsatilishi kerak.
  openGraph: {
    type: 'website',
    siteName: 'IlmIldizi',
    locale: 'uz_UZ',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'IlmIldizi' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" suppressHydrationWarning className={`h-full antialiased ${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-full flex flex-col">
        {/* Tema birinchi bo'yoqdan oldin qo'llanadi: tema tugmasi faqat AppShell
            ichida bo'lgani uchun login/register sahifalari saqlangan tanlovni
            bilmasdi va doim qorong'i chiziladi. `beforeInteractive` — Next.js'ning
            root layout uchun tavsiya etilgan usuli (docs: app/script.md). */}
        <Script id="ilm-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('ilm_theme');document.documentElement.dataset.theme=(t==='light')?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`}
        </Script>
        <ServiceWorkerRegister />
        {/* Telegram Mini App qobig'i. Oddiy brauzerda hech narsa qilmaydi —
            SDK ham yuklanmaydi (qarang: lib/telegram.ts). */}
        <TelegramProvider />
        {/* shadcn'ning Tooltip'i o'z provayderini o'ramaydi — Radix uni yuqorida talab
            qiladi, shuning uchun bir marta shu yerda o'rnatiladi. */}
        <MotionProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              {children}
              {/* Majburiy kanal obunasi — kirgan foydalanuvchi obuna bo'lmagan
                  bo'lsagina butun ekranni yopadi (qarang: SubscriptionGate). */}
              <SubscriptionGate />
            </AuthProvider>
          </TooltipProvider>
        </MotionProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
