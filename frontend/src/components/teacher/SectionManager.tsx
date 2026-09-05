'use client';

/* CEFR partlarini (matn/audio bloklarini) o'qituvchi panelidan boshqarish.

   Part — imtihonning bitta bo'limi: umumiy ko'rsatma, o'qish matni yoki audio va o'sha
   blokka tegishli savollar. Ilgari buni faqat Django admin orqali yaratish mumkin edi,
   ya'ni o'qituvchi CEFR testini o'zi tuza olmasdi.

   Fayl yuklash bo'lgani uchun so'rovlar `apiFetch` emas, FormData bilan ketadi —
   `apiFetch` har doim JSON sarlavhasini qo'yadi. */

import { useState } from 'react';
import { ChevronDown, Loader2, Music, Plus, Trash2 } from 'lucide-react';
import { API_URL, refreshAccessToken } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TeacherSection = {
  id: number;
  skill: string;
  skill_label: string;
  part_number: number;
  title: string;
  instruction: string;
  passage: string;
  audio: string | null;
  audio_play_limit: number;
  image: string;
  duration_minutes: number | null;
  order: number;
  question_count: number;
};

const FIELD =
  'w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]';

async function sendForm(path: string, method: string, form: FormData) {
  let access = useAuthStore.getState().access;
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

  let res = await doFetch(access);
  if (res.status === 401) { access = await refreshAccessToken(); res = await doFetch(access); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Saqlab bo\'lmadi.');
  }
  return res.json();
}

export default function SectionManager({
  testId, sections, skillOptions, onChanged,
}: {
  testId: number;
  sections: TeacherSection[];
  skillOptions: { value: string; label: string }[];
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<number | 'new' | null>(null);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">CEFR partlari</h2>
        <span className="text-xs text-muted-foreground">
          {sections.length === 0 ? 'Oddiy test — part shart emas' : `${sections.length} ta part`}
        </span>
      </div>

      {sections.map((section) => (
        <Card key={section.id} className="gap-0 py-0">
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setOpenId(openId === section.id ? null : section.id)}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <Badge variant="secondary" className="shrink-0">
                {section.skill_label} · Part {section.part_number}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">
                {section.title || section.instruction || 'Sarlavhasiz'}
              </span>
              {section.audio && <Music className="size-4 shrink-0 text-muted-foreground" />}
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {section.question_count} savol
              </span>
              <ChevronDown className={cn('size-4 shrink-0 transition', openId === section.id && 'rotate-180')} />
            </button>

            {openId === section.id && (
              <div className="border-t border-[var(--border-card)] p-3.5">
                <SectionForm
                  testId={testId}
                  section={section}
                  skillOptions={skillOptions}
                  onSaved={() => { setOpenId(null); onChanged(); }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {openId === 'new' ? (
        <Card><CardContent className="p-3.5">
          <SectionForm
            testId={testId}
            skillOptions={skillOptions}
            onSaved={() => { setOpenId(null); onChanged(); }}
          />
        </CardContent></Card>
      ) : (
        <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpenId('new')}>
          <Plus className="size-4" /> Part qo&apos;shish
        </Button>
      )}
    </div>
  );
}

function SectionForm({
  testId, section, skillOptions, onSaved,
}: {
  testId: number;
  section?: TeacherSection;
  skillOptions: { value: string; label: string }[];
  onSaved: () => void;
}) {
  const [skill, setSkill] = useState(section?.skill ?? 'reading');
  const [partNumber, setPartNumber] = useState(section?.part_number ?? 1);
  const [title, setTitle] = useState(section?.title ?? '');
  const [instruction, setInstruction] = useState(section?.instruction ?? '');
  const [passage, setPassage] = useState(section?.passage ?? '');
  const [playLimit, setPlayLimit] = useState(section?.audio_play_limit ?? 2);
  const [duration, setDuration] = useState(section?.duration_minutes ?? '');
  const [audio, setAudio] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('skill', skill);
      form.append('part_number', String(partNumber));
      form.append('title', title);
      form.append('instruction', instruction);
      form.append('passage', passage);
      form.append('audio_play_limit', String(playLimit));
      if (duration !== '') form.append('duration_minutes', String(duration));
      if (audio) form.append('audio', audio);
      if (image) form.append('image', image);

      const path = section
        ? `/api/teacher/tests/${testId}/sections/${section.id}/`
        : `/api/teacher/tests/${testId}/sections/`;
      await sendForm(path, section ? 'PUT' : 'POST', form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!section) return;
    setSaving(true);
    try {
      await sendForm(`/api/teacher/tests/${testId}/sections/${section.id}/`, 'DELETE', new FormData());
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-text)]">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <select value={skill} onChange={(e) => setSkill(e.target.value)} className={cn(FIELD, 'min-w-40 flex-1')}>
          {skillOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          type="number" min={1} value={partNumber}
          onChange={(e) => setPartNumber(Number(e.target.value))}
          placeholder="Part raqami" className={cn(FIELD, 'w-32')}
        />
        <input
          type="number" min={1} value={duration}
          onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Vaqt (daq.)" className={cn(FIELD, 'w-36')}
        />
      </div>

      <input
        value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Matn sarlavhasi (masalan: INJURED BIRD)" className={FIELD}
      />
      <textarea
        value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2}
        placeholder="Ko'rsatma (masalan: Read the text. Fill in each gap with ONE word.)" className={FIELD}
      />
      <textarea
        value={passage} onChange={(e) => setPassage(e.target.value)} rows={8}
        placeholder="O'qish matni. Bo'shliqni {{9}} ko'rinishida yozing — 9 savolning imtihon raqami."
        className={cn(FIELD, 'font-mono text-xs')}
      />
      <p className="text-xs text-muted-foreground">
        Matn ichidagi <code className="font-mono">{'{{9}}'}</code> o&apos;rniga o&apos;quvchi kichik kiritish
        maydonini ko&apos;radi. Raqam — savolning imtihon raqami.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">
          Audio{section?.audio ? ' (yuklangan)' : ''}
          <input
            type="file" accept="audio/*"
            onChange={(e) => setAudio(e.target.files?.[0] || null)}
            className="block text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Necha marta eshittiriladi
          <input
            type="number" min={0} value={playLimit}
            onChange={(e) => setPlayLimit(Number(e.target.value))}
            className={cn(FIELD, 'w-20')}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Rasm (xarita){section?.image ? ' (yuklangan)' : ''}
          <input
            type="file" accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="block text-sm text-[var(--text-primary)]"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        0 — cheksiz tinglash (mashq rejimi). Hisob serverda yuritiladi.
      </p>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null} Saqlash
        </Button>
        {section && (
          <Button variant="ghost" onClick={remove} disabled={saving} className="text-muted-foreground">
            <Trash2 className="size-4" /> Partni o&apos;chirish
          </Button>
        )}
      </div>
      {section && (
        <p className="text-xs text-muted-foreground">
          Partni o&apos;chirsangiz savollari o&apos;chmaydi — ular testda part&apos;siz savol bo&apos;lib qoladi.
        </p>
      )}
    </div>
  );
}
