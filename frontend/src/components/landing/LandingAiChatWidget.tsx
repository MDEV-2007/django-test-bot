'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Sparkles, ArrowRight, User } from 'lucide-react';

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
      {/* 1. SUZUVCHI TUGMA (Bottom-Right Floating Trigger) */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Chatni yopish" : "AI Yordamchi bilan suhbatlashish"}
          className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-3 text-white shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 transition-all border border-emerald-400/30"
        >
          {isOpen ? (
            <X className="size-5" />
          ) : (
            <>
              <div className="relative flex size-6 items-center justify-center rounded-full bg-white text-emerald-700 shadow-xs">
                <Bot className="size-3.5" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-600 animate-pulse" />
              </div>
              <span className="hidden sm:inline-block text-xs font-bold tracking-tight">
                AI Yordamchi
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* 2. CHAT MODAL DARCHASI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 flex h-[480px] w-[calc(100vw-2rem)] sm:w-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Sarlavha paneli */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Bot className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900">IlmIldizi AI Yordamchi</h4>
                    <Sparkles className="size-3 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>24/7 onlayn</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Yopish"
                className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Xabarlar ro'yxati */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      AI
                    </div>
                  )}

                  <div className={`max-w-[82%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/70'
                  }`}>
                    <p>{m.text}</p>

                    {m.action && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200">
                        <a
                          href={m.action.href}
                          target={m.action.href.startsWith('http') ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                        >
                          {m.action.text} <ArrowRight className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {m.sender === 'user' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px]">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-xs bg-slate-100 p-2.5 text-xs text-slate-500">
                    <span className="inline-flex gap-1">
                      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Tezkor savollar (Quick chips) */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-2.5">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Matn kiritish maydoni */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Savolingizni yozing..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Yuborish"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 disabled:opacity-40 transition-all"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
