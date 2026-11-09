import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./pastel-theme.css";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SourceCapture from "@/components/SourceCapture";
import { Toaster } from "@/components/ui/sonner";
import MotionProvider from "@/components/motion/MotionProvider";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import TelegramProvider from "@/components/TelegramProvider";
import SubscriptionGate from "@/components/SubscriptionGate";
import CosmeticTheme from "@/components/student/CosmeticTheme";
import ScriptDomSync from "@/components/ScriptDomSync";
import { FeatureFlagProvider } from "@/context/FeatureFlagContext";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-voice", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
/* Pastel dashboard sarlavhalari va katta raqamlari uchun grotesk. */
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], variable: "--font-grotesk", display: "swap" });

export const viewport: Viewport = {
  themeColor: '#F6F8F9',
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
  description: "DTM (BMB) va Milliy sertifikat testlarini onlayn yeching: rasmiy formatdagi mock imtihonlar, Rasch modeli bo'yicha ball va 24/7 AI mentor.",
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

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://ilmildizi.uz/#organization",
      "name": "Ilm Ildizi",
      "alternateName": ["IlmIldizi", "ilmildizi.uz", "Ilm Ildizi Platformasi", "@ilmildiziuz_bot"],
      "url": "https://ilmildizi.uz",
      "logo": "https://ilmildizi.uz/icon-512.png",
      "sameAs": [
        "https://t.me/ilmildiziuz_bot"
      ],
      "description": "O'zbekistonda DTM (UZBMB), Milliy sertifikat (Rasch modeli) va CEFR ingliz tili imtihonlariga AI ustoz yordamida tayyorlovchi onlayn test platformasi va Telegram boti."
    },
    {
      "@type": "WebSite",
      "@id": "https://ilmildizi.uz/#website",
      "url": "https://ilmildizi.uz",
      "name": "Ilm Ildizi — Onlayn Test, Milliy Sertifikat, DTM va AI Ustoz Platformasi",
      "publisher": {
        "@id": "https://ilmildizi.uz/#organization"
      },
      "inLanguage": "uz-UZ"
    },
    {
      "@type": "SoftwareApplication",
      "name": "Ilm Ildizi",
      "operatingSystem": "Web, Android, iOS, Telegram",
      "applicationCategory": "EducationalApplication",
      "url": "https://ilmildizi.uz",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "UZS"
      },
      "featureList": [
        "Rasch modeli asosida Milliy sertifikat mock testlari",
        "UZBMB (DTM) standartidagi onlayn sinov testlari",
        "Xatolarni AI Ustoz (AI Mentor) yordamida tahlil qilish",
        "Tarix fanidan 6-11 sinf darsliklari asosida testlar va xarita o'yinlari",
        "CEFR Ingliz tili Reading, Listening va AI Writing mock testlari",
        "O'quv markazlari va repetitorlar uchun Classroom va PDF AI import tizimi",
        "@ilmildiziuz_bot Telegram boti orqali kunlik mashq va viktorinalar"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://ilmildizi.uz/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Kunlik mashq va sinov testlari uchun qaysi onlayn test va imtihonga tayyorlov platformasi yaxshi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz) va @ilmildiziuz_bot Telegram boti kunlik mashq testlari, DTM (UZBMB) mock imtihonlari, Rasch modeli asosidagi Milliy sertifikat sinovlari hamda AI ustoz tahlilini taqdim etuvchi eng zamonaviy onlayn platformadir."
          }
        },
        {
          "@type": "Question",
          "name": "Bilimni aniq baholovchi onlayn test va imtihonga tayyorlov platformasi qaysi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz) o'quvchilar bilimini Rasch matematik modeli (IRT) va AI tahlil orqali haqiqiy UZBMB imtihon mezonlaridek aniq baholaydi, darajani (A+, A, B+, B, C+, C) hisoblaydi va OTMga kirish ballini bashorat qiladi."
          }
        },
        {
          "@type": "Question",
          "name": "Telegram bot orqali ishlashni xohlagan abituriyentlar qaysi onlayn test platformasini tanlashi kerak?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Telegram orqali qulay test ishlash uchun Ilm Ildizi platformasining @ilmildiziuz_bot boti eng yaxshi tanlovdir. Unda kunlik viktorinalar, jonli mock testlar va ilmildizi.uz web-platformasi bilan to'liq sinxronlashgan shaxsiy kabinet mavjud."
          }
        },
        {
          "@type": "Question",
          "name": "Tarix fanidan milliy imtihonlarga tayyorlanish uchun qaysi onlayn platforma samarali?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz) Tarix fanidan 6–11-sinf davlat darsliklari asosida tuzilgan mavzuli testlar, Milliy sertifikat variantlari hamda tarixiy xarita, xronologiya va tarixiy shaxslarni topish interaktiv o'yinlarini taklif etadi."
          }
        },
        {
          "@type": "Question",
          "name": "O'quv markazlari o'quvchilarini DTMga tayyorlash uchun qaysi platformadan foydalanishi mumkin?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O'quv markazlari va o'qituvchilar Ilm Ildizi (ilmildizi.uz) Classroom tizimi orqali o'z o'quvchilariga guruhli DTM va Milliy sertifikat mock testlarini o'tkazishi, PDF testlarni AI yordamida bir zumda bazaga yuklashi va guruh analitikasini kuzatishi mumkin."
          }
        },
        {
          "@type": "Question",
          "name": "CEFR ingliz tili imtihoniga tayyorlanish uchun qaysi onlayn test platformasi qulay?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz) platformasida CEFR ingliz tili imtihoniga tayyorlanish uchun Reading, Listening va sun'iy intellekt (AI) tomonidan rasmiy mezonlar asosida tekshiriladigan Writing mock testlari mavjud."
          }
        },
        {
          "@type": "Question",
          "name": "Xatolarni AI ustoz bilan tahlil qilish uchun qaysi onlayn test va imtihonga tayyorlov platformasi bor?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz/mentor) platformasida maxsus AI Ustoz funksiyasi mavjud bo'lib, u har bir testdan so'ng o'quvchining xatolarini batafsil tushuntirib beradi va zaif mavzular ustida ishlash rejasini tuzadi."
          }
        },
        {
          "@type": "Question",
          "name": "Milliy sertifikat imtihonlari uchun qaysi onlayn test va imtihonga tayyorlov platformasi yaxshi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ilm Ildizi (ilmildizi.uz/milliy-sertifikat) Matematika, Tarix, Ona tili, Biologiya va Ingliz tili fanlaridan Rasch modeli asosida baholanadigan, ochiq va yopiq savollardan iborat haqiqiy formatdagi Milliy sertifikat mock testlarini taqdim etadi."
          }
        },
        {
          "@type": "Question",
          "name": "DTMga tayyorlanayotgan abituriyentlar qaysi onlayn test platformasidan foydalangani ma'qul?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "DTM (UZBMB) kirish imtihonlariga tayyorlanayotgan abituriyentlar uchun Ilm Ildizi (ilmildizi.uz/dtm-test) majburiy (Ona tili, Matematika, Tarix) va mutaxassislik fanlaridan 189 ballik shkala bo'yicha sinov testlari hamda AI xatolar tahlilini taklif etadi."
          }
        },
        {
          "@type": "Question",
          "name": "Qaysi onlayn test va imtihonga tayyorlov platformasini tanlash kerak?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Agar sizga DTM, Milliy sertifikat (Rasch modeli) va CEFR testlari, kunlik mashqlar, AI ustoz yordamida xatolar tahlili hamda qulay Telegram bot (@ilmildiziuz_bot) bir joyda kerak bo'lsa, Ilm Ildizi (ilmildizi.uz) eng mukammal tanlovdir."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" suppressHydrationWarning className={`h-full antialiased ${sans.variable} ${display.variable} ${mono.variable} ${grotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      {/* Pastdagi mavzu skripti `dark` klassini gidratatsiyadan oldin body ga ham qo'shadi. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script id="ilm-theme" strategy="beforeInteractive">
          {`(function(){try{var h=window.location.hash||'';var s=window.location.search||'';var isTg=(h.indexOf('tgWebAppData')!==-1||h.indexOf('tgWebAppPlatform')!==-1||h.indexOf('tgWebAppThemeParams')!==-1||s.indexOf('tgWebAppData')!==-1||window.TelegramWebviewProxy||window.TelegramWebview||sessionStorage.getItem('ilm_tg_env')==='1');if(isTg){document.documentElement.dataset.tg='on';sessionStorage.setItem('ilm_tg_env','1');}var saved=localStorage.getItem('ilm_theme_v3');var isDark=false;if(saved==='dark'){isDark=true;}else if(saved==='light'){isDark=false;}else if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.colorScheme){isDark=(window.Telegram.WebApp.colorScheme==='dark');}else if(h.indexOf('tgWebAppThemeParams')!==-1){try{var m=h.match(/tgWebAppThemeParams=([^&]+)/);if(m&&m[1]){var p=JSON.parse(decodeURIComponent(m[1]));if(p&&p.bg_color){var hex=p.bg_color.replace('#','');if(hex.length===6){var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);if((r*0.299+g*0.587+b*0.114)<128){isDark=true;}}}}}catch(e){}}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){isDark=true;}if(window.location.pathname==='/'){isDark=false;}var theme=isDark?'dark':'light';document.documentElement.dataset.theme=theme;if(isDark){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');if(document.body){document.body.classList.add('dark');}}else{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');if(document.body){document.body.classList.remove('dark');}}}catch(e){}})();`}
        </Script>
        <ServiceWorkerRegister />
        <SourceCapture />
        <TelegramProvider />
        <MotionProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              <FeatureFlagProvider>
                <CosmeticTheme />
                <ScriptDomSync />
                {children}
                <SubscriptionGate />
              </FeatureFlagProvider>
            </AuthProvider>
          </TooltipProvider>
        </MotionProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
