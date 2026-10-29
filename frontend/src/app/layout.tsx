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
import CosmeticTheme from "@/components/student/CosmeticTheme";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-voice", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const viewport: Viewport = {
  themeColor: '#F2F2F7',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz'),
  title: {
    default: "DTM Test Yechish Onlayn & Milliy Sertifikat Testlari 2026 — IlmIldizi",
    template: '%s · IlmIldizi',
  },
  description: "DTM (BMB) testlarini bepul onlayn yechish va Milliy sertifikat rasmiy formati bo'yicha mock imtihonlar. Tarix, Ona tili, Matematika fanlaridan Rasch modeli va 24/7 AI mentor bilan tayyorlaning.",
  keywords: [
    'DTM test', 'DTM test yechish', 'DTM testlari onlayn', 'milliy sertifikat',
    'milliy sertifikat testlari', 'BMB testlar', 'bepul mock test', 'tarix test',
    'ona tili milliy sertifikat', 'rasch modeli', 'onlayn test yechish', 'abituriyent 2026', 'IlmIldizi',
  ],
  applicationName: 'IlmIldizi',
  robots: { index: true, follow: true },
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
        <Script id="ilm-theme" strategy="beforeInteractive">
          {`(function(){try{var h=window.location.hash||'';var s=window.location.search||'';var isTg=(h.indexOf('tgWebAppData')!==-1||h.indexOf('tgWebAppPlatform')!==-1||h.indexOf('tgWebAppThemeParams')!==-1||s.indexOf('tgWebAppData')!==-1||window.TelegramWebviewProxy||window.TelegramWebview||sessionStorage.getItem('ilm_tg_env')==='1');if(isTg){document.documentElement.dataset.tg='on';sessionStorage.setItem('ilm_tg_env','1');}var saved=localStorage.getItem('ilm_theme_v3');var isDark=false;if(saved==='dark'){isDark=true;}else if(saved==='light'){isDark=false;}else if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.colorScheme){isDark=(window.Telegram.WebApp.colorScheme==='dark');}else if(h.indexOf('tgWebAppThemeParams')!==-1){try{var m=h.match(/tgWebAppThemeParams=([^&]+)/);if(m&&m[1]){var p=JSON.parse(decodeURIComponent(m[1]));if(p&&p.bg_color){var hex=p.bg_color.replace('#','');if(hex.length===6){var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);if((r*0.299+g*0.587+b*0.114)<128){isDark=true;}}}}}catch(e){}}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){isDark=true;}var theme=isDark?'dark':'light';document.documentElement.dataset.theme=theme;if(isDark){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');if(document.body){document.body.classList.add('dark');}}else{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');if(document.body){document.body.classList.remove('dark');}}}catch(e){}})();`}
        </Script>
        <ServiceWorkerRegister />
        <TelegramProvider />
        <MotionProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              <CosmeticTheme />
              {children}
              <SubscriptionGate />
            </AuthProvider>
          </TooltipProvider>
        </MotionProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
