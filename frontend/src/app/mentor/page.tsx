'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, RefreshCw, Loader2, Zap, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { API_URL, apiFetch, refreshAccessToken } from '@/lib/api-client';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MentorMessage } from '@/components/MentorMessage';
import { cn } from '@/lib/utils';

type ChatMessage = { sender: 'user' | 'ai'; text: string; time: string };
type Subject = { id: number; name: string; slug: string };

const SAMPLE_PROMPTS = [
  'Bu mavzudagi eng muhim qoidalarni qisqacha tushuntiring',
  'Milliy Sertifikat va DTM testlarida eng ko\'p tushadigan savollar',
  'Mavzu bo\'yicha 3 ta amaliy namunaviy savol bering',
  'Formula va atamalarni eslab qolish uchun mnemonika usuli',
];

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MentorPage() {
  const { user, access } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Assalomu alaykum, ${user?.first_name || user?.username || ''}! Men sizning shaxsiy **AI O'quv Mentoriman**. Qaysi mavzuni tushunishda qiynalayapsiz yoki qanday test yechimini ko'rib chiqamiz?`,
      time: timeNow(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ subjects: Subject[]; selected_subject: string | null }>('/api/tests/')
      .then((d) => {
        setSubjects(d.subjects);
        setSubject(d.selected_subject);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik yuz berdi'));
  }, [access]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(preset?: string) {
    const message = (preset ?? input).trim();
    if (!message || sending) return;
    setMessages((m) => [
      ...m,
      { sender: 'user', text: message, time: timeNow() },
      { sender: 'ai', text: '', time: timeNow() },
    ]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      let token = useAuthStore.getState().access;
      const doFetch = (t: string | null) =>
        fetch(`${API_URL}/api/learning/mentor/stream/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ message, subject }),
        });

      let res = await doFetch(token);
      if (res.status === 401) {
        token = await refreshAccessToken();
        res = await doFetch(token);
      }
      if (res.status === 429) {
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1].text = "Juda ko'p so'rov yubordingiz, biroz kuting.";
          return c;
        });
        return;
      }
      if (!res.ok || !res.body) throw new Error('stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const data = part.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) {
              full += parsed.delta;
              setMessages((m) => {
                const c = [...m];
                c[c.length - 1].text = full;
                return c;
              });
            }
          } catch {
            /* ignore partial JSON */
          }
        }
      }
    } catch {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1].text = "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
        return c;
      });
      setError('Xatolik yuz berdi.');
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        sender: 'ai',
        text: 'Suhbat tarixi tozalandi. Yangi savolingizni berishingiz mumkin!',
        time: timeNow(),
      },
    ]);
  }

  return (
    <ModernAppLayout user={user} theme="light">
      {/* Centered Cognitive Ease Container (max-w-3xl) */}
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        {/* Mentor Header Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-2 ring-purple-500/20">
              <Bot className="size-6" />
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  AI Mentor 24/7
                </h1>
                <Badge className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold">
                  FOCUS MODE
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                DTM &amp; Milliy Sertifikat bo&apos;yicha ixtisoslashgan aqlli repetitor
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Tozalash</span>
          </Button>
        </div>

        {/* Subjects Selector Pills */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {subjects.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSubject(s.slug)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs',
                  subject === s.slug
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sample Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {SAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={sending}
              onClick={() => send(p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50/80 hover:bg-purple-100 hover:border-purple-300 text-xs text-purple-900 font-medium transition shrink-0 cursor-pointer shadow-2xs"
            >
              <Sparkles className="size-3 text-purple-600 shrink-0" />
              <span className="truncate max-w-[280px]">{p}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Chat Messages Stream Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm min-h-[460px] space-y-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex items-start gap-3', m.sender === 'user' && 'flex-row-reverse')}
            >
              <Avatar
                className={cn(
                  'size-9 shrink-0 ring-2',
                  m.sender === 'ai'
                    ? 'border border-purple-300 ring-purple-100'
                    : 'border border-blue-300 ring-blue-100'
                )}
              >
                <AvatarFallback
                  className={cn(
                    'text-xs font-black',
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-100 text-purple-700'
                  )}
                >
                  {m.sender === 'user' ? 'Siz' : <Bot className="size-4" />}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 sm:px-5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-sm',
                  m.sender === 'user'
                    ? 'rounded-tr-sm bg-blue-600 text-white font-medium shadow-sm'
                    : 'rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-800'
                )}
              >
                {m.sender === 'user' ? (
                  <p className="whitespace-pre-line">{m.text}</p>
                ) : m.text ? (
                  <MentorMessage text={m.text} />
                ) : (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="size-3.5 animate-spin text-purple-600" />
                    <span>Javob shakllanmoqda...</span>
                  </span>
                )}
                <span
                  className={cn(
                    'mt-2 block text-right font-mono text-[10px]',
                    m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  )}
                >
                  {m.time}
                </span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Sticky Input Bar at Bottom with Clean Frosted Glass */}
        <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-200/90 bg-white/95 p-2 sm:p-2.5 backdrop-blur-xl shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Savolingizni yozing yoki formulani so'rang..."
              disabled={sending}
              className="flex-1 bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm h-11"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] transition cursor-pointer"
              aria-label="Yuborish"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-5 stroke-[2.5]" />
              )}
            </button>
          </form>
        </div>
      </div>
    </ModernAppLayout>
  );
}
