'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { API_URL, apiFetch, refreshAccessToken } from '@/lib/api-client';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type ChatMessage = { sender: 'user' | 'ai'; text: string; time: string };
type Subject = { id: number; name: string; slug: string };

const SAMPLE_PROMPTS = [
  'Bu mavzudagi eng muhim sanalarni tushuntirib bering',
  "Milliy Sertifikat formatidagi savollarni qanday yechish kerak?",
  "Bu davr haqida qisqacha konspekt tuzib bering",
  'Eng ko\'p uchraydigan xatolarni tushuntiring',
];

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MentorPage() {
  const { user, access } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: `Assalomu alaykum, ${user?.first_name || user?.username || ''}! Men IlmIldizi platformasining Tarix va Milliy Sertifikat bo'yicha ixtisoslashgan AI Mentoriman. Savolingiz bormi?`, time: timeNow() },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ subjects: Subject[]; selected_subject: string | null }>('/api/tests/').then((d) => {
      setSubjects(d.subjects);
      setSubject(d.selected_subject);
    });
  }, [access]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  async function send(preset?: string) {
    const message = (preset ?? input).trim();
    if (!message || sending) return;
    setMessages((m) => [...m, { sender: 'user', text: message, time: timeNow() }, { sender: 'ai', text: '', time: timeNow() }]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      let token = useAuthStore.getState().access;
      const doFetch = (t: string | null) => fetch(`${API_URL}/api/learning/mentor/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ message, subject }),
      });

      let res = await doFetch(token);
      if (res.status === 401) { token = await refreshAccessToken(); res = await doFetch(token); }
      if (res.status === 429) {
        setMessages((m) => { const c = [...m]; c[c.length - 1].text = "Juda ko'p so'rov yubordingiz, biroz kuting."; return c; });
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
              setMessages((m) => { const c = [...m]; c[c.length - 1].text = full; return c; });
            }
          } catch { /* ignore partial JSON */ }
        }
      }
    } catch {
      setMessages((m) => { const c = [...m]; c[c.length - 1].text = 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.'; return c; });
      setError('Xatolik yuz berdi.');
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([{ sender: 'ai', text: 'Suhbat tarixi tozalandi. Yangi savolingizni berishingiz mumkin!', time: timeNow() }]);
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <Card className="border-indigo-500/25">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
                <Bot className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-voice text-xl font-bold">Tarixchi AI Mentor 24/7</h1>
                  <Badge variant="outline" className="border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success-text)]">
                    <span className="mr-1 size-1.5 animate-ping rounded-full bg-[var(--success)]" /> Online
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  O&apos;zbekiston va Jahon tarixi bo&apos;yicha savol-javob, konspekt va tahliliy ko&apos;makchi.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearChat} className="self-start sm:self-auto">
              <RefreshCw className="size-3.5" /> Tozalash
            </Button>
          </CardContent>
        </Card>

        {subjects.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {subjects.map((s) => (
              <Button
                key={s.slug}
                size="sm"
                variant="outline"
                className={cn('shrink-0 rounded-full', subject === s.slug && 'chip-active')}
                onClick={() => setSubject(s.slug)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}

        <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
          {SAMPLE_PROMPTS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              disabled={sending}
              onClick={() => send(p)}
              className="shrink-0 rounded-full font-normal text-[var(--text-secondary)] hover:border-indigo-500/40"
            >
              <Sparkles className="size-3 text-indigo-400" /> {p}
            </Button>
          ))}
        </div>

        {error && (
          <Card className="border-[var(--danger)]/30">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="max-h-[550px] min-h-[420px] space-y-4 overflow-y-auto pt-6">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex items-start gap-3', m.sender === 'user' && 'flex-row-reverse')}>
                <Avatar className={cn('size-9 shrink-0', m.sender === 'ai' && 'border border-indigo-500/30')}>
                  <AvatarFallback className={cn(
                    'text-xs',
                    m.sender === 'user' ? 'bg-primary text-[var(--on-accent)]' : 'bg-indigo-500/20 text-indigo-300',
                  )}>
                    {m.sender === 'user' ? 'Siz' : <Bot className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%]',
                  m.sender === 'user'
                    ? 'rounded-tr-sm bg-primary font-medium text-[var(--on-accent)]'
                    : 'whitespace-pre-line rounded-tl-sm border bg-[var(--surface-input)]',
                )}>
                  <p>
                    {m.text || (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Tarixiy manbalar tahlil qilinmoqda...
                      </span>
                    )}
                  </p>
                  <span className={cn(
                    'mt-1.5 block text-right font-mono text-xs',
                    m.sender === 'user' ? 'text-[var(--on-accent)]/70' : 'text-muted-foreground',
                  )}>
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 pt-6">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Savolingizni yozing..."
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={() => send()} disabled={sending || !input.trim()} className="shrink-0">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Yuborish
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
