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
};

const EMPTY: QuestionData = {
  question_type: 'single_choice', body: '', difficulty: 'medium', points: 1, explanation: '',
  image_position: 'after_body', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }],
  pairs: [{ left_key: 'I', left_text: '', right_key: 'a', right_text: '' }],
  sub_questions: [], reference_answer: '',
  group: { instruction: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }], correct_index: 0 },
};

const SINGLE_TYPES = ['single_choice', 'image_based', 'table_based'];

export default function QuestionForm({
  testId, initial, onSaved,
}: { testId: number; initial?: QuestionData; onSaved: () => void }) {
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
        typeData.group = q.group;
      }

      const form = new FormData();
      form.append('question_type', q.question_type);
      form.append('body', q.body);
      form.append('difficulty', q.difficulty);
      form.append('points', String(q.points));
      form.append('explanation', q.explanation);
      form.append('image_position', q.image_position);
      form.append('type_data', JSON.stringify(typeData));
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
      </select>

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
