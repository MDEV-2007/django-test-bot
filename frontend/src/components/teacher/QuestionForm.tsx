'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { API_URL, refreshAccessToken } from '@/lib/api-client';

export type QuestionData = {
  id?: number;
  question_type: string;
  body: string;
  difficulty: string;
  points: number;
  explanation: string;
  image_position: string;
  options: { text: string; is_correct: boolean }[];
  pairs: { left_key: string; left_text: string; right_key: string; right_text: string }[];
  sub_questions: { label: string; text: string; reference_answer: string }[];
  reference_answer: string;
  group: { instruction: string; options: { label: string; text: string }[]; correct_index: number } | null;
  /* --- CEFR maydonlari. Boshqa toifadagi testlarda bo'sh qoladi. --- */
  section?: number | null;
  exam_number?: number | null;
  max_words?: number | null;
  min_words?: number | null;
  tfng_style?: string;
  accepted_answers?: string[];
  /* Mavjud javob bankini qayta ishlatish (CEFR'da bitta A-F banki bir nechta savolga
     xizmat qiladi): bank id'si va shu savolning to'g'ri harfi. */
  reuse_group_id?: number | null;
  reuse_correct_label?: string;
};

export type SectionOption = { id: number; skill_label: string; part_number: number; title: string };
export type BankOption = { id: number; instruction: string; options: { label: string; text: string }[] };

const EMPTY: QuestionData = {
  question_type: 'single_choice', body: '', difficulty: 'medium', points: 1, explanation: '',
  image_position: 'after_body', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }],
  pairs: [{ left_key: 'I', left_text: '', right_key: 'a', right_text: '' }],
  sub_questions: [], reference_answer: '',
  group: { instruction: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }], correct_index: 0 },
  section: null, exam_number: null, max_words: 1, min_words: null, tfng_style: 'tf',
  accepted_answers: [''], reuse_group_id: null, reuse_correct_label: '',
};

const TEXT_TYPES = ['gap_fill', 'tfng'];

const SINGLE_TYPES = ['single_choice', 'image_based', 'table_based'];

export default function QuestionForm({
  testId, initial, onSaved, sections = [], banks = [],
}: {
  testId: number;
  initial?: QuestionData;
  onSaved: () => void;
  /* CEFR testida savolni partga bog'lash uchun; oddiy testda bo'sh bo'ladi va
     tegishli maydonlar umuman ko'rinmaydi. */
  sections?: SectionOption[];
  banks?: BankOption[];
}) {
  const [q, setQ] = useState<QuestionData>(initial || EMPTY);
  const [correctIndex, setCorrectIndex] = useState(
    initial ? initial.options.findIndex((o) => o.is_correct) : 0,
  );
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const typeData: Record<string, unknown> = {};
      if (SINGLE_TYPES.includes(q.question_type)) {
        typeData.options = q.options;
        typeData.correct_index = correctIndex;
      } else if (q.question_type === 'matching') {
        typeData.pairs = q.pairs;
      } else if (q.question_type === 'open_written') {
        typeData.sub_questions = q.sub_questions;
        typeData.reference_answer = q.reference_answer;
      } else if (q.question_type === 'grouped_item') {
        // Mavjud bank tanlangan bo'lsa, yangisi yaratilmaydi — savol o'shanga ulanadi.
        typeData.group = q.reuse_group_id
          ? { group_id: q.reuse_group_id, correct_label: q.reuse_correct_label }
          : q.group;
      } else if (TEXT_TYPES.includes(q.question_type)) {
        typeData.accepted_answers = (q.accepted_answers ?? []).filter((a) => a.trim());
      }

      const form = new FormData();
      form.append('question_type', q.question_type);
      form.append('body', q.body);
      form.append('difficulty', q.difficulty);
      form.append('points', String(q.points));
      form.append('explanation', q.explanation);
      form.append('image_position', q.image_position);
      form.append('type_data', JSON.stringify(typeData));
      // CEFR maydonlari — faqat to'ldirilganda yuboriladi, aks holda server ularni
      // bo'sh deb qabul qiladi va eski savol formasi o'zgarishsiz ishlaydi.
      if (q.section) form.append('section', String(q.section));
      if (q.exam_number) form.append('exam_number', String(q.exam_number));
      if (q.question_type === 'gap_fill' && q.max_words) form.append('max_words', String(q.max_words));
      if (q.question_type === 'tfng') form.append('tfng_style', q.tfng_style || 'tf');
      if (q.question_type === 'writing_task') {
        if (q.min_words) form.append('min_words', String(q.min_words));
        if (q.max_words) form.append('max_words', String(q.max_words));
      }
      if (image) form.append('image', image);

      let access = useAuthStore.getState().access;
      const path = q.id
        ? `/api/teacher/tests/${testId}/questions/${q.id}/`
        : `/api/teacher/tests/${testId}/questions/add/`;
      const method = q.id ? 'PUT' : 'POST';
      const doFetch = (token: string | null) => fetch(`${API_URL}${path}`, {
        method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
      });
      let res = await doFetch(access);
      if (res.status === 401) { access = await refreshAccessToken(); res = await doFetch(access); }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.errors ? JSON.stringify(body.errors) : 'Xatolik');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-5">
      {error && <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-text)] whitespace-pre-wrap">{error}</p>}

      <select value={q.question_type} onChange={(e) => setQ({ ...q, question_type: e.target.value })}
        className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]">
        <option value="single_choice">Oddiy test</option>
        <option value="image_based">Rasmli savol</option>
        <option value="table_based">Jadvalli savol</option>
        <option value="matching">Moslashtirish</option>
        <option value="grouped_item">Guruhlangan savol</option>
        <option value="open_written">Yozma savol</option>
        <option value="gap_fill">Bo&apos;shliqni to&apos;ldirish (CEFR)</option>
        <option value="tfng">TRUE / FALSE / NOT GIVEN (CEFR)</option>
        <option value="writing_task">Writing topshirig&apos;i (CEFR)</option>
      </select>

      {/* CEFR: savolni partga bog'lash va varaqadagi raqamini berish. Matn ichidagi
          {{N}} bo'shlig'i aynan shu raqam orqali savolga ulanadi. */}
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <select
            value={q.section ?? ''}
            onChange={(e) => setQ({ ...q, section: e.target.value ? Number(e.target.value) : null })}
            className="min-w-48 flex-1 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">Part tanlanmagan</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.skill_label} — Part {sec.part_number}{sec.title ? ` (${sec.title})` : ''}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={q.exam_number ?? ''}
            onChange={(e) => setQ({ ...q, exam_number: e.target.value ? Number(e.target.value) : null })}
            placeholder="Savol raqami"
            className="w-36 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
      )}

      <textarea value={q.body} onChange={(e) => setQ({ ...q, body: e.target.value })} rows={3} placeholder="Savol matni"
        className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]" />

      <div className="flex gap-3">
        <select value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })}
          className="flex-1 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]">
          <option value="easy">Oson</option>
          <option value="medium">O&apos;rta</option>
          <option value="hard">Qiyin</option>
        </select>
        <input type="number" value={q.points} onChange={(e) => setQ({ ...q, points: Number(e.target.value) })}
          className="w-24 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]" />
      </div>

      <textarea value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} rows={2}
        placeholder="Javob izohi (ixtiyoriy, natija sahifasida ko'rsatiladi)"
        className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]" />

      {(q.question_type === 'image_based' || q.question_type === 'table_based') && (
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)}
          className="w-full text-sm text-[var(--text-primary)]" />
      )}

      {/* Bo'shliqli savol: bir nechta maqbul javob yozish mumkin. */}
      {q.question_type === 'gap_fill' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            To&apos;g&apos;ri javoblar (har biri alohida qator — bittasi to&apos;g&apos;ri kelsa yetarli)
          </p>
          {(q.accepted_answers ?? []).map((answer, i) => (
            <input
              key={i}
              value={answer}
              onChange={(e) => {
                const next = [...(q.accepted_answers ?? [])];
                next[i] = e.target.value;
                setQ({ ...q, accepted_answers: next });
              }}
              placeholder={i === 0 ? 'masalan: forest' : 'yana bir maqbul variant'}
              className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setQ({ ...q, accepted_answers: [...(q.accepted_answers ?? []), ''] })}
              className="text-xs font-semibold text-[var(--accent-text)]"
            >
              + Yana variant
            </button>
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              So&apos;z chegarasi
              <input
                type="number"
                min={1}
                value={q.max_words ?? 1}
                onChange={(e) => setQ({ ...q, max_words: Number(e.target.value) })}
                className="w-20 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-1 text-sm text-[var(--text-primary)]"
              />
            </label>
          </div>
        </div>
      )}

      {q.question_type === 'tfng' && (
        <div className="space-y-2">
          <select
            value={q.tfng_style || 'tf'}
            onChange={(e) => setQ({ ...q, tfng_style: e.target.value })}
            className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="tf">TRUE / FALSE / NOT GIVEN</option>
            <option value="yn">YES / NO / NOT GIVEN</option>
          </select>
          <select
            value={(q.accepted_answers ?? [''])[0] || ''}
            onChange={(e) => setQ({ ...q, accepted_answers: [e.target.value] })}
            className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">To&apos;g&apos;ri javobni tanlang</option>
            {(q.tfng_style === 'yn' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN']).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {q.question_type === 'writing_task' && (
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            Kamida
            <input
              type="number" min={0} value={q.min_words ?? ''}
              onChange={(e) => setQ({ ...q, min_words: e.target.value ? Number(e.target.value) : null })}
              className="w-24 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
            so&apos;z
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            Ko&apos;pi bilan
            <input
              type="number" min={0} value={q.max_words ?? ''}
              onChange={(e) => setQ({ ...q, max_words: e.target.value ? Number(e.target.value) : null })}
              className="w-24 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
            so&apos;z
          </label>
        </div>
      )}

      {/* Guruhlangan savol: mavjud bankni qayta ishlatish yoki yangisini yaratish. */}
      {q.question_type === 'grouped_item' && banks.length > 0 && (
        <div className="space-y-2 rounded-lg border border-[var(--border-card)] p-3">
          <select
            value={q.reuse_group_id ?? ''}
            onChange={(e) => setQ({ ...q, reuse_group_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">Yangi javob banki yaratish</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                Mavjud bank #{bank.id} — {bank.instruction.slice(0, 60)}
              </option>
            ))}
          </select>
          {q.reuse_group_id && (
            <select
              value={q.reuse_correct_label || ''}
              onChange={(e) => setQ({ ...q, reuse_correct_label: e.target.value })}
              className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">To&apos;g&apos;ri variantni tanlang</option>
              {(banks.find((b) => b.id === q.reuse_group_id)?.options ?? []).map((o) => (
                <option key={o.label} value={o.label}>{o.label}) {o.text.slice(0, 60)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {SINGLE_TYPES.includes(q.question_type) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Variantlar</p>
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
              <input value={o.text} onChange={(e) => {
                const opts = [...q.options]; opts[i] = { ...opts[i], text: e.target.value }; setQ({ ...q, options: opts });
              }} className="flex-1 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </div>
          ))}
          <button onClick={() => setQ({ ...q, options: [...q.options, { text: '', is_correct: false }] })}
            className="text-xs text-[var(--accent-text)]">+ Variant qo&apos;shish</button>
        </div>
      )}

      {q.question_type === 'matching' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Juftliklar</p>
          {q.pairs.map((p, i) => (
            <div key={i} className="grid grid-cols-4 gap-1">
              <input value={p.left_key} onChange={(e) => { const ps = [...q.pairs]; ps[i] = { ...ps[i], left_key: e.target.value }; setQ({ ...q, pairs: ps }); }}
                placeholder="I" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={p.left_text} onChange={(e) => { const ps = [...q.pairs]; ps[i] = { ...ps[i], left_text: e.target.value }; setQ({ ...q, pairs: ps }); }}
                placeholder="Chap matn" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={p.right_key} onChange={(e) => { const ps = [...q.pairs]; ps[i] = { ...ps[i], right_key: e.target.value }; setQ({ ...q, pairs: ps }); }}
                placeholder="a" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={p.right_text} onChange={(e) => { const ps = [...q.pairs]; ps[i] = { ...ps[i], right_text: e.target.value }; setQ({ ...q, pairs: ps }); }}
                placeholder="O'ng matn" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
            </div>
          ))}
          <button onClick={() => setQ({ ...q, pairs: [...q.pairs, { left_key: '', left_text: '', right_key: '', right_text: '' }] })}
            className="text-xs text-[var(--accent-text)]">+ Juftlik qo&apos;shish</button>
        </div>
      )}

      {q.question_type === 'open_written' && (
        <div className="space-y-2">
          <textarea value={q.reference_answer} onChange={(e) => setQ({ ...q, reference_answer: e.target.value })}
            placeholder="Namunaviy javob (qism-savol bo'lmasa)" rows={2}
            className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Qism-savollar (ixtiyoriy)</p>
          {q.sub_questions.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-1">
              <input value={s.label} onChange={(e) => { const ss = [...q.sub_questions]; ss[i] = { ...ss[i], label: e.target.value }; setQ({ ...q, sub_questions: ss }); }}
                placeholder="a" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={s.text} onChange={(e) => { const ss = [...q.sub_questions]; ss[i] = { ...ss[i], text: e.target.value }; setQ({ ...q, sub_questions: ss }); }}
                placeholder="Matn" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={s.reference_answer} onChange={(e) => { const ss = [...q.sub_questions]; ss[i] = { ...ss[i], reference_answer: e.target.value }; setQ({ ...q, sub_questions: ss }); }}
                placeholder="Javob" className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
            </div>
          ))}
          <button onClick={() => setQ({ ...q, sub_questions: [...q.sub_questions, { label: '', text: '', reference_answer: '' }] })}
            className="text-xs text-[var(--accent-text)]">+ Qism qo&apos;shish</button>
        </div>
      )}

      {q.question_type === 'grouped_item' && q.group && (
        <div className="space-y-2">
          <input value={q.group.instruction} onChange={(e) => setQ({ ...q, group: { ...q.group!, instruction: e.target.value } })}
            placeholder="Ko'rsatma" className="w-full rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-sm" />
          {q.group.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="group-correct" checked={q.group!.correct_index === i}
                onChange={() => setQ({ ...q, group: { ...q.group!, correct_index: i } })} />
              <input value={o.label} onChange={(e) => { const opts = [...q.group!.options]; opts[i] = { ...opts[i], label: e.target.value }; setQ({ ...q, group: { ...q.group!, options: opts } }); }}
                placeholder="A" className="w-14 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
              <input value={o.text} onChange={(e) => { const opts = [...q.group!.options]; opts[i] = { ...opts[i], text: e.target.value }; setQ({ ...q, group: { ...q.group!, options: opts } }); }}
                placeholder="Matn" className="flex-1 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] px-2 py-2 text-xs" />
            </div>
          ))}
          <button onClick={() => setQ({ ...q, group: { ...q.group!, options: [...q.group!.options, { label: '', text: '' }] } })}
            className="text-xs text-[var(--accent-text)]">+ Variant qo&apos;shish</button>
        </div>
      )}

      <button onClick={submit} disabled={saving}
        className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-[var(--on-accent)] disabled:opacity-60">
        {saving ? 'Saqlanmoqda...' : 'Savolni saqlash'}
      </button>
    </div>
  );
}
