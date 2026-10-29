'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, RefreshCw, Loader2, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { API_URL, apiFetch, refreshAccessToken } from '@/lib/api-client';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
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
    <ModernAppLayout user={user}>
      {/* iOS 18 iMessage / Apple Intelligence Chat Container fitted above MobileTabBar */}
      <div className="flex flex-col h-[calc(var(--tg-viewport,100dvh)-9.75rem)] md:h-[calc(100dvh-6.5rem)] max-w-4xl mx-auto gap-3">
        {/* Top Header Card (iOS 18 Apple Intelligence Pill Header) */}
        <div className="ios-card shrink-0 rounded-[24px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#007AFF] to-[#5856D6] text-white font-black shadow-[0_6px_16px_rgba(0,122,255,0.28)]">
              <Bot className="size-5" />
              <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34C759] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[#34C759]" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-[-0.02em] truncate">
                  AI Mentor 24/7
                </h1>
                <Badge className="bg-[#34C759]/12 border border-[#34C759]/25 text-[#248A3D] dark:text-[#30D158] text-[10px] font-bold py-0 px-2 rounded-full">
                  ONLINE
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {subject ? `${subjects.find((s) => s.slug === subject)?.name || subject} fani bo'yicha repetitor` : "DTM & Milliy Sertifikat bo'yicha aqlli repetitor"}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={clearChat}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer h-8.5 px-3 shrink-0"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Tozalash</span>
          </Button>
        </div>

        {/* Subjects Selector Pills */}
        {subjects.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none px-0.5">
            {subjects.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSubject(s.slug)}
                className={cn(
                  'ios-spring flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer',
                  subject === s.slug
                    ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.28)]'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="shrink-0 rounded-[20px] border border-[#FF3B30]/25 bg-[#FF3B30]/10 p-3 text-xs font-semibold text-[#FF3B30]">
            {error}
          </div>
        )}

        {/* Unified iOS 18 iMessage Card */}
        <div className="ios-card flex-1 min-h-0 flex flex-col rounded-[28px] overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4">
            {messages.length <= 1 && (
              <div className="space-y-2 pb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Tezkor savollar:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={sending}
                      onClick={() => send(p)}
                      className="ios-spring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[18px] border border-[#007AFF]/20 bg-[#007AFF]/[0.07] hover:bg-[#007AFF]/[0.12] text-xs text-foreground font-medium transition cursor-pointer text-left"
                    >
                      <Sparkles className="size-3.5 text-[#007AFF] shrink-0" />
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex items-end gap-2.5', m.sender === 'user' && 'flex-row-reverse')}
              >
                <Avatar
                  className={cn(
                    'size-7 sm:size-8 shrink-0 border border-border',
                    m.sender === 'ai' ? 'bg-[#007AFF]/10' : 'bg-[#007AFF]'
                  )}
                >
                  <AvatarFallback
                    className={cn(
                      'text-[11px] font-bold',
                      m.sender === 'user'
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#007AFF]/12 text-[#007AFF]'
                    )}
                  >
                    {m.sender === 'user' ? 'Siz' : <Bot className="size-4" />}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-[22px] px-4 py-3 text-xs sm:text-sm leading-relaxed',
                    m.sender === 'user'
                      ? 'rounded-br-[6px] bg-[#007AFF] text-white font-medium shadow-[0_4px_14px_rgba(0,122,255,0.22)]'
                      : 'rounded-bl-[6px] border border-border bg-muted/55 text-foreground'
                  )}
                >
                  {m.sender === 'user' ? (
                    <p className="whitespace-pre-line">{m.text}</p>
                  ) : m.text ? (
                    <MentorMessage text={m.text} />
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin text-[#007AFF]" />
                      <span>Javob shakllanmoqda...</span>
                    </span>
                  )}
                  <span
                    className={cn(
                      'mt-1.5 block text-right font-mono text-[10px]',
                      m.sender === 'user' ? 'text-white/75' : 'text-muted-foreground'
                    )}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* iOS 18 iMessage Pill Input Bar */}
          <div className="shrink-0 border-t border-border bg-card/90 backdrop-blur-xl p-2.5 sm:p-3">
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
                className="flex-1 rounded-full h-11 px-4 text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="ios-spring flex size-11 shrink-0 items-center justify-center rounded-full bg-[#007AFF] hover:opacity-95 disabled:opacity-35 text-white shadow-[0_4px_14px_rgba(0,122,255,0.32)] transition cursor-pointer"
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
      </div>
    </ModernAppLayout>
  );
}
