import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileCheck2, Bot, Swords, BarChart3, Target, GraduationCap, ArrowRight,
  Check, Sprout, Send, Sparkles, Clock, BrainCircuit,
} from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import RootsBackground from '@/components/landing/RootsBackground';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/* Bosh sahifa — YAGONA ochiq (auth talab qilmaydigan) sahifa, ya'ni qidiruv tizimlari
   uchun saytning kirish nuqtasi. Shuning uchun u server komponenti: HTML to'liq tayyor
   holda yetkaziladi, matn JavaScript ishlashini kutmaydi.

   Ilgari bu yerda faqat klient tomonidagi redirect turardi (`router.replace`) — qidiruv
   roboti bo'sh sahifani ko'rardi va indekslaydigan hech narsa yo'q edi. */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';
const BOT_URL = 'https://t.me/ilmildiziuz_bot';

export const metadata: Metadata = {
  title: "IlmIldizi — Milliy sertifikat va BBA'ga onlayn tayyorgarlik",
  description:
    "Rasmiy formatdagi mock testlar, AI mentor, zaif mavzular tahlili va DTM ball bashorati. "
    + "Telegram orqali bir bosishda kiring va bugundanoq tayyorlanishni boshlang.",
  keywords: [
    'milliy sertifikat', 'BBA', 'DTM', 'mock test', 'onlayn test', 'tarix testlari',
    'abituriyent', 'test yechish', 'IlmIldizi', 'AI mentor',
  ],
  alternates: { canonical: '/' },
  // Root layout sukut bo'yicha noindex qo'yadi — ochiq sahifa uni ochiq bekor qiladi.
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: SITE_URL,
    siteName: 'IlmIldizi',
    title: "IlmIldizi — Milliy sertifikat va BBA'ga onlayn tayyorgarlik",
    description:
      'Mock testlar, AI mentor va real vaqtdagi tahlil. Bilim ildizdan boshlanadi.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IlmIldizi',
    description: "Milliy sertifikat va BBA'ga onlayn tayyorgarlik platformasi.",
  },
};

const FEATURES = [
  {
    icon: FileCheck2,
    title: 'Rasmiy formatdagi mock testlar',
    text: "Milliy sertifikat va BBA imtihonining haqiqiy tuzilishi: savol turlari, taymer va ball hisobi bir xil. Imtihon kuni hech narsa kutilmagan bo'lmaydi.",
  },
  {
    icon: BrainCircuit,
    title: 'AI Mentor — 24/7',
    text: "Tushunmagan savolingizni yozing: mentor javobni emas, YECHIM YO'LINI tushuntiradi va qaysi mavzuni takrorlash kerakligini aytadi.",
  },
  {
    icon: BarChart3,
    title: 'Zaif mavzular tahlili',
    text: "Har bir javob mavzu bo'yicha yig'iladi. Qaysi mavzuda necha foiz to'g'ri javob berayotganingiz — taxmin emas, raqam bilan ko'rinadi.",
  },
  {
    icon: Target,
    title: 'DTM ball bashorati',
    text: "Yechgan testlaringiz asosida taxminiy ballingiz hisoblanadi: qiyinlik darajasi, mavzular qamrovi va so'nggi natijalar hisobga olinadi.",
  },
  {
    icon: Swords,
    title: '1v1 Arena va mini o‘yinlar',
    text: "Tenglaringiz bilan jonli bellashuv, xronologiya va xarita o'yinlari. Takrorlash zerikarli bo'lmasa, har kuni davom etadi.",
  },
  {
    icon: GraduationCap,
    title: "O'qituvchi paneli",
    text: "O'qituvchi o'z havolasi orqali sinf yig'adi, o'quvchilarning kuchli va zaif mavzularini bitta jadvalda ko'radi.",
  },
];

const STEPS = [
  {
    n: '01',
    title: "Bir bosishda kiring",
    text: "Telegram yoki Google hisobingiz bilan — parol o'ylab topish shart emas.",
  },
  {
    n: '02',
    title: 'Fan tanlang va test yeching',
    text: "Qisqa mashqdan to'liq mock testgacha. Javoblaringiz avtomatik saqlanadi.",
  },
  {
    n: '03',
    title: 'Tahlilga qarab takrorlang',
    text: "Tizim xato qilgan mavzularingizni yig'ib boradi va aynan shularni qayta beradi.",
  },
];

const PLANS = [
  {
    name: 'Bepul',
    price: '0',
    unit: "so'm",
    text: "Kundalik mashq testlari, arena, mini o'yinlar, reyting va asosiy tahlil.",
    features: ['Mashq testlari', '1v1 Arena', 'Kunlik missiyalar', 'Reyting va yutuqlar'],
    cta: 'Bepul boshlash',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Mock test',
    price: '15 000',
    unit: "so'm / test",
    text: "Rasmiy formatdagi bitta to'liq mock test — imtihon sharoitida, batafsil tahlil bilan.",
    features: ['Rasmiy imtihon formati', 'Taymer va ball hisobi', "Xatolar bo'yicha tahlil", 'Bir marta to‘lov'],
    cta: 'Mock testni ochish',
    href: '/premium',
    highlight: true,
  },
  {
    name: 'Darslar obunasi',
    price: '25 000',
    unit: "so'm / oy",
    text: "Barcha video va audio darslarga to'liq kirish. 6 va 12 oylik variantlari arzonroq.",
    features: ['Video darslar', 'Audio konspektlar', 'Barcha fanlar', '6/12 oylik chegirma'],
    cta: "Tariflarni ko'rish",
    href: '/premium',
    highlight: false,
  },
];

const FAQ = [
  {
    q: "IlmIldizi qanday imtihonlarga tayyorlaydi?",
    a: "Milliy sertifikat va BBA (Bakalavr Bosqichiga Ariza) formatidagi testlarga. Savol turlari va ball hisobi rasmiy imtihon bilan bir xil tuzilgan.",
  },
  {
    q: "Platformadan bepul foydalansa bo'ladimi?",
    a: "Ha. Mashq testlari, 1v1 arena, mini o'yinlar, kunlik missiyalar va asosiy tahlil bepul. To'lov faqat rasmiy mock testlar va video/audio darslar uchun.",
  },
  {
    q: "Telegram orqali kirish xavfsizmi?",
    a: "Ha. Telegram yuborgan ma'lumot serverda bot kaliti bilan imzo tekshiruvidan o'tadi, eski ma'lumotni qayta ishlatib bo'lmaydi. Parol umuman talab qilinmaydi.",
  },
  {
    q: "DTM ball bashorati qanchalik aniq?",
    a: "U kafolat emas, o'lchov. Hisob yechilgan savollar soni, ularning qiyinligi, mavzular qamrovi va so'nggi natijalarga asoslanadi — ma'lumot qancha ko'p bo'lsa, bashorat shuncha ishonchli.",
  },
  {
    q: "O'qituvchi sifatida sinfimni kuzata olamanmi?",
    a: "Ha. O'qituvchi paneli o'z taklif havolangizni beradi; shu havola orqali kirgan o'quvchilar sinfingizga qo'shiladi va ularning mavzular bo'yicha natijalari bitta jadvalda ko'rinadi.",
  },
];

/* Qidiruv tizimlari uchun tuzilmali ma'lumot: sayt nomi va savol-javoblar.
   FAQPage sxemasi Google natijalarida savollar ko'rinishida chiqishi mumkin. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'IlmIldizi',
      inLanguage: 'uz-UZ',
      description: "Milliy sertifikat va BBA'ga onlayn tayyorgarlik platformasi.",
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#org`,
      name: 'IlmIldizi',
      url: SITE_URL,
      sameAs: [BOT_URL],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD — brauzer uchun emas, robotlar uchun; React uni matn sifatida joylaydi.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <RootsBackground />
      <LandingNav />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36">
          <RevealOnScroll className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
              <Sparkles className="size-3.5" />
              Milliy sertifikat va BBA&apos;ga tayyorgarlik
            </span>

            <h1 className="font-voice mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              Bilim <span className="text-[var(--accent-text)]">ildizdan</span> boshlanadi
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Rasmiy formatdagi mock testlar, AI mentor va har bir javobdan o&apos;sadigan tahlil.
              Kuniga 15 daqiqa — natija taxminda emas, ballda ko&apos;rinadi.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/register">
                  Bepul boshlash <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                  <Send className="size-4" /> Telegram&apos;da ochish
                </a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Karta ma&apos;lumoti so&apos;ralmaydi · Telegram yoki Google bilan bir bosishda
            </p>
          </RevealOnScroll>

          {/* Qisqa ishonch qatori — raqam emas, aniq imkoniyatlar */}
          <RevealOnScroll index={1} className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: FileCheck2, label: 'Rasmiy format' },
              { icon: Clock, label: 'Imtihon taymeri' },
              { icon: Bot, label: 'AI mentor' },
              { icon: BarChart3, label: 'Mavzular tahlili' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)]/60 px-3 py-4 text-center backdrop-blur-sm"
              >
                <item.icon className="size-5 text-[var(--accent-text)]" />
                <span className="text-xs font-medium sm:text-sm">{item.label}</span>
              </div>
            ))}
          </RevealOnScroll>
        </section>

        {/* ── Imkoniyatlar ─────────────────────────────────────────────────── */}
        <section id="imkoniyatlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <RevealOnScroll className="mx-auto max-w-2xl text-center">
            <h2 className="font-voice text-3xl font-bold sm:text-4xl">Bir joyda — butun tayyorgarlik</h2>
            <p className="mt-3 text-muted-foreground">
              Test yechish, tushuntirish, takrorlash va o&apos;lchash. Har biri alohida ilova emas, bitta tizim.
            </p>
          </RevealOnScroll>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={f.title} index={i}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3 pt-6">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                      <f.icon className="size-5" />
                    </span>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                  </CardContent>
                </Card>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ── Qanday ishlaydi ──────────────────────────────────────────────── */}
        <section id="qanday" className="scroll-mt-20 border-y border-[var(--border-card)] bg-[var(--surface-card)]/40 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <RevealOnScroll className="mx-auto max-w-2xl text-center">
              <h2 className="font-voice text-3xl font-bold sm:text-4xl">Uch qadam</h2>
              <p className="mt-3 text-muted-foreground">
                Ro&apos;yxatdan o&apos;tishdan birinchi tahlilgacha — o&apos;n daqiqa.
              </p>
            </RevealOnScroll>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <RevealOnScroll key={s.n} index={i} className="relative">
                  <span className="font-mono text-4xl font-bold text-[var(--accent)]/25">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ── Narxlar ──────────────────────────────────────────────────────── */}
        <section id="narxlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <RevealOnScroll className="mx-auto max-w-2xl text-center">
            <h2 className="font-voice text-3xl font-bold sm:text-4xl">Ochiq narxlar</h2>
            <p className="mt-3 text-muted-foreground">
              Asosiy mashq bepul. To&apos;lov faqat rasmiy mock testlar va darslar uchun — obuna majburiy emas.
            </p>
          </RevealOnScroll>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <RevealOnScroll key={p.name} index={i}>
                <Card className={`h-full ${p.highlight ? 'border-[var(--accent-border)] ring-1 ring-[var(--accent)]/25' : ''}`}>
                  <CardContent className="flex h-full flex-col gap-4 pt-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{p.name}</h3>
                        {p.highlight && (
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-text)]">
                            Ommabop
                          </span>
                        )}
                      </div>
                      <p className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-mono text-3xl font-bold">{p.price}</span>
                        <span className="text-xs text-muted-foreground">{p.unit}</span>
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>

                    <ul className="space-y-2 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent-text)]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button asChild variant={p.highlight ? 'default' : 'outline'} className="mt-auto w-full">
                      <Link href={p.href}>{p.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ── Savollar ─────────────────────────────────────────────────────── */}
        <section id="savollar" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <RevealOnScroll className="text-center">
            <h2 className="font-voice text-3xl font-bold sm:text-4xl">Ko&apos;p so&apos;raladigan savollar</h2>
          </RevealOnScroll>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <RevealOnScroll key={item.q} index={i}>
                {/* `details` — JavaScriptsiz ishlaydi va robotlar matnni to'liq o'qiydi. */}
                <details className="group rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)]/60 px-4 backdrop-blur-sm">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                    {item.q}
                    <span className="text-[var(--accent-text)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ── Yakuniy chaqiriq ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <RevealOnScroll>
            <Card className="overflow-hidden border-[var(--accent-border)]">
              <CardContent className="flex flex-col items-center gap-5 px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]">
                  <Sprout className="size-6 text-[var(--on-accent)]" />
                </span>
                <h2 className="font-voice max-w-xl text-2xl font-bold sm:text-3xl">
                  Bugun bitta test — imtihon kuni bitta ball emas, ancha ko&apos;p farq
                </h2>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/register">Bepul boshlash <ArrowRight className="size-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                      <Send className="size-4" /> Telegram bot
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>
        </section>
      </main>

      <footer className="border-t border-[var(--border-card)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Sprout className="size-4 text-[var(--accent-text)]" />
            <span className="font-voice font-semibold text-foreground">IlmIldizi</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/login" className="transition-colors hover:text-foreground">Kirish</Link>
            <Link href="/register" className="transition-colors hover:text-foreground">Ro&apos;yxatdan o&apos;tish</Link>
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              Telegram bot
            </a>
          </nav>
          <p className="text-xs">© {new Date().getFullYear()} IlmIldizi</p>
        </div>
      </footer>
    </>
  );
}
