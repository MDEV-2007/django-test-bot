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
          className="flex items-center gap-2.5 rounded-full bg-[#1C1C1E]/92 backdrop-blur-xl px-4 py-3 text-white shadow-[0_14px_34px_-6px_rgba(0,0,0,0.3)] border border-white/15 transition-all"
        >
          {isOpen ? (
            <X className="size-5 text-white/80" />
          ) : (
            <>
              <div className="relative flex size-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#007AFF] via-[#5856D6] to-[#AF52DE] text-white shadow-xs">
                <Sparkles className="size-3.5" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#34C759] ring-2 ring-[#1C1C1E]" />
              </div>
              <span className="hidden sm:inline-block text-[13px] font-semibold tracking-tight">
                AI Yordamchi
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* 2. iOS iMessage / Apple Intelligence Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 flex h-[500px] w-[calc(100vw-2rem)] sm:w-[380px] flex-col overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/95 backdrop-blur-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.22)]"
          >
            {/* iOS Navigation Bar Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#F2F2F7]/80 px-4 py-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[11px] bg-gradient-to-tr from-[#007AFF] via-[#5856D6] to-[#AF52DE] text-white shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">IlmIldizi AI</h4>
                    <span className="rounded-full bg-[#007AFF]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#007AFF] uppercase">
                      Beta
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#34C759] font-medium">
                    <span className="size-1.5 rounded-full bg-[#34C759]" />
                    <span>iMessage AI • 24/7 onlayn</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Yopish"
                className="flex size-7 items-center justify-center rounded-full bg-[#E5E5EA] text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* iMessage Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[13px] bg-white">
              <div className="text-center text-[11px] font-medium text-[#8E8E93] pb-1">
                Bugun • AI Mentor
              </div>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-[20px] px-3.5 py-2.5 leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#007AFF] text-white rounded-br-[6px] font-medium shadow-xs'
                        : 'bg-[#F2F2F7] text-[#1C1C1E] rounded-bl-[6px]'
                    }`}
                  >
                    <p>{m.text}</p>

                    {m.action && (
                      <div className="mt-2 pt-2 border-t border-black/[0.06]">
                        <a
                          href={m.action.href}
                          target={m.action.href.startsWith('http') ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#007AFF] hover:underline text-[12px]"
                        >
                          {m.action.text} <ArrowRight className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2">
                  <div className="rounded-[20px] rounded-bl-[6px] bg-[#F2F2F7] px-3.5 py-2.5">
                    <span className="inline-flex gap-1 items-center">
                      <span className="size-1.5 rounded-full bg-[#8E8E93] animate-bounce" />
                      <span className="size-1.5 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:0.2s]" />
                      <span className="size-1.5 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="border-t border-black/[0.05] bg-[#F2F2F7]/60 px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 rounded-full border border-black/[0.06] bg-white px-3 py-1 text-[11px] font-medium text-[#1C1C1E] hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors shadow-2xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* iMessage Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-black/[0.06] bg-white p-2.5"
            >
              <div className="relative flex flex-1 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="iMessage..."
                  className="w-full rounded-full border border-black/[0.1] bg-[#F2F2F7]/70 pl-3.5 pr-9 py-2 text-[13px] text-[#1C1C1E] placeholder:text-[#8E8E93] focus:border-[#007AFF] focus:bg-white focus:outline-hidden transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Yuborish"
                  className="absolute right-1.5 flex size-6 items-center justify-center rounded-full bg-[#007AFF] text-white disabled:bg-[#C7C7CC] transition-all"
                >
                  <ArrowUp className="size-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
