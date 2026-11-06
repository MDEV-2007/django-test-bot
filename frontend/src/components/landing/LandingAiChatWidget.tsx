'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUp, Sparkles, ArrowRight } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: {
    text: string;
    href: string;
  };
}

const QUICK_PROMPTS = [
  "Platforma bepulmi?",
  "DTM ball bashorati qanday ishlaydi?",
  "Milliy sertifikatga qanday tayyorlaydi?",
  "Administrator bilan bog'lanish",
];

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=support';

function generateAiReply(userText: string): { text: string; action?: { text: string; href: string } } {
  const query = userText.toLowerCase();

  if (query.includes('bepul') || query.includes('narx') || query.includes('tarif') || query.includes('pul') || query.includes("to'lov")) {
    return {
      text: "Ha! IlmIldizi'da barcha kundalik mashq testlari, 1v1 Arena, mini o'yinlar, reyting va asosiy AI Mentor (kuniga 5 savol) mutlaqo BEPUL. Rasmiy to'liq mock testlar va cheklovsiz AI Mentor uchun hamyonbop PRO obuna mavjud.",
      action: { text: "Tariflarni ko'rish", href: "#narxlar" },
    };
  }

  if (query.includes('dtm') || query.includes('ball') || query.includes('bashorat')) {
    return {
      text: "DTM ball bashorati — siz yechgan testlarning qiyinlik darajasi, sarflangan soniyalar va xatolar tahlili asosida real imtihondagi ehtimoliy ballingizni 96% aniqlikda hisoblab boruvchi sun'iy intellekt tizimidir.",
      action: { text: "Test yechib ko'rish", href: "/register" },
    };
  }

  if (query.includes('sertifikat') || query.includes('milliy') || query.includes('bba')) {
    return {
      text: "Platformamizdagi barcha mock testlar Davlat Test Markazi va BBA 2026 talablari bo'yicha tayyorlangan: vaqt hisobi, savollar soni va ball taqsimoti rasmiy imtihon bilan aynan bir xil!",
      action: { text: "Bepul boshlash", href: "/register" },
    };
  }

  if (query.includes('admin') || query.includes('aloqa') || query.includes('yordam') || query.includes("bog'lanish") || query.includes('inson') || query.includes('operator')) {
    return {
      text: "Jonli yordam kerakmi? Bizning qo'llab-quvvatlash xizmatimiz Telegram orqali 24/7 rejimida har qanday savolingizga yordam berishga tayyor!",
      action: { text: "Telegramda yozish", href: BOT_URL },
    };
  }

  if (query.includes('salom') || query.includes('assalomu') || query.includes('qalay')) {
    return {
      text: "Assalomu alaykum! IlmIldizi ta'lim platformasiga xush kelibsiz. Sizga qanday yordam bera olaman?",
    };
  }

  return {
    text: "Savolingiz uchun rahmat! IlmIldizi platformasi orqali Milliy sertifikat va DTM imtihonlariga eng yuqori natijaga tayyorlanishingiz mumkin. O'z kuchingizni sinash uchun darhol bepul diagnostik testni topshirishingiz mumkin.",
    action: { text: "Diagnostik testni boshlash", href: "/register" },
  };
}

export default function LandingAiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: "Assalomu alaykum! Men IlmIldizi AI yordamchisiman. Platforma, testlar yoki imtihonga tayyorgarlik bo'yicha qanday savolingiz bor?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const replyData = generateAiReply(text);
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'ai',
        text: replyData.text,
        action: replyData.action,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* 1. iOS Apple Intelligence Floating Pill Trigger */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 sm:z-50">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Chatni yopish" : "AI Yordamchi bilan suhbatlashish"}
          className="flex items-center gap-2.5 rounded-full bg-[#080808] py-2 pl-2 pr-4 text-[#FFFCF7] shadow-[0_18px_40px_-16px_rgba(8,8,8,0.7)] transition-all"
        >
          {isOpen ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#FFB82E] text-[#080808]"><X className="size-4" /></span>
          ) : (
            <>
              <div className="relative flex size-8 items-center justify-center rounded-full bg-[#7659C7] text-white">
                <Sparkles className="size-4" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#4C806B] ring-2 ring-[#080808]" />
              </div>
              <span className="hidden text-[13px] font-bold tracking-tight sm:inline-block">
                AI Yordamchi
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* 2. Chat paneli — Pastel Studio */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-36 right-4 z-50 flex h-[520px] max-h-[calc(100svh-10rem)] w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-[32px] bg-[#FFFCF7] shadow-[0_30px_70px_-24px_rgba(40,20,80,0.6)] sm:bottom-24 sm:right-6 sm:w-[390px]"
          >
            {/* Sarlavha */}
            <div className="relative overflow-hidden bg-[#7659C7] px-5 pb-4 pt-5 text-white">
              <span aria-hidden className="absolute -right-8 -top-10 size-32 rounded-full bg-white/15" />
              <span aria-hidden className="absolute -bottom-8 right-24 size-14 rounded-full bg-[#FFB82E] opacity-80" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-white text-[#7659C7]">
                    <Sparkles className="size-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#4C806B] ring-2 ring-[#7659C7]" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-[family-name:var(--font-grotesk)] text-[18px] font-bold tracking-[-0.02em]">
                        <span data-no-translit>IlmIldizi</span> AI
                      </h4>
                      <span className="rounded-full bg-[#FFB82E] px-2 py-0.5 text-[10.5px] font-black uppercase text-[#080808]">Beta</span>
                    </div>
                    <p className="text-[12px] font-semibold text-white/80">AI mentor · 24/7 onlayn</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Yopish"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/15 text-white transition-colors hover:bg-black/30"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Suhbat */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#FFFCF7] p-4 text-[13.5px]">
              <div className="flex justify-center">
                <span className="rounded-full bg-[#F7F4EF] px-3 py-1 text-[11.5px] font-bold text-[#8A8494]">Bugun · AI mentor</span>
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`flex items-end gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.sender !== 'user' && (
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#7659C7] text-white">
                      <Sparkles className="size-3.5" />
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-[20px] px-4 py-2.5 leading-relaxed ${
                      m.sender === 'user'
                        ? 'rounded-br-md bg-[#080808] font-medium text-[#FFFCF7]'
                        : 'rounded-bl-md bg-[#F2EADF] text-[#080808]'
                    }`}
                  >
                    <p>{m.text}</p>
                    {m.action && (
                      <a
                        href={m.action.href}
                        target={m.action.href.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#7659C7] px-3 py-1.5 text-[12px] font-bold text-white transition-transform hover:-translate-y-0.5"
                      >
                        {m.action.text} <ArrowRight className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-end gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#7659C7] text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-[20px] rounded-bl-md bg-[#F2EADF] px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-[#7659C7]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-[#7659C7] [animation-delay:0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-[#7659C7] [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Tezkor savollar */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="shrink-0 cursor-pointer rounded-full bg-[#E6B5F2]/50 px-3 py-1.5 text-[12px] font-bold text-[#080808] transition-colors hover:bg-[#E6B5F2]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Kiritish */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 pt-1"
            >
              <div className="flex items-center gap-2 rounded-full bg-[#F7F4EF] p-1.5 pl-4 ring-2 ring-transparent transition focus-within:ring-[#7659C7]">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Savolingizni yozing…"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-[#080808] placeholder:text-[#8A8494] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Yuborish"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#080808] text-[#FFB82E] transition-all hover:-translate-y-0.5 disabled:cursor-default disabled:bg-[#CFC8D8] disabled:text-white"
                >
                  <ArrowUp className="size-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
