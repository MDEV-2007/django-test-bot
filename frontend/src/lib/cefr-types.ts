/* CEFR imtihon ekranining ma'lumot shakli — backend'dagi tests_app/cefr_api.py bilan
   bir xil. To'g'ri javob bu yerda YO'Q: u serverda qoladi va faqat test tugagach
   natijalar sahifasida ko'rinadi. */

export type CefrSkill = 'listening' | 'reading' | 'writing';

export type CefrQuestionType =
  | 'single_choice' | 'image_based' | 'table_based'
  | 'matching' | 'grouped_item'
  | 'gap_fill' | 'tfng'
  | 'open_written' | 'writing_task';

export type WritingCorrection = { wrong: string; better: string; why: string };

export type WritingReview = {
  overall: number;
  level: string;
  task?: number;
  coherence?: number;
  lexis?: number;
  grammar?: number;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  corrections?: WritingCorrection[];
  word_count?: number;
};

export type CefrQuestion = {
  id: number;
  exam_number: number | null;
  type: CefrQuestionType;
  body: string;
  points: number;
  image: string;
  audio_url: string;
  answered: boolean;

  choices?: { id: number; text: string }[];
  selected_choice_id?: number | null;

  group_id?: number | null;
  selected_group_option_id?: number | null;

  matching_options?: { right_key: string; right_text: string }[];
  matching_rows?: { left_key: string; left_text: string; selected_right_key: string }[];

  max_words?: number | null;
  min_words?: number | null;
  text_answer?: string;
  tfng_options?: string[];
  word_count?: number;
  review?: WritingReview | null;

  sub_question_rows?: { label: string; text: string; answer: string }[];
};

export type CefrGroup = {
  id: number;
  instruction: string;
  options: { id: number; label: string; text: string }[];
};

export type CefrSection = {
  id: number;
  skill: CefrSkill;
  part_number: number;
  title: string;
  instruction: string;
  passage: string;
  audio: string | null;
  audio_play_limit: number;
  image: string;
  duration_minutes: number | null;
  groups: CefrGroup[];
  questions: CefrQuestion[];
};

/* Matn ustidagi bitta belgi. `start`/`end` — partning sof matnidagi belgi o'rni
   ({{9}} kabi bo'shliq belgilari hisobga olinmaydi). */
export type Annotation = {
  start: number;
  end: number;
  color: 'yellow' | 'green' | 'pink';
  note?: string;
};

export type AnnotationMap = Record<string, Annotation[]>;

export type CefrExam = {
  attempt_id: number;
  is_completed: boolean;
  seconds_left: number;
  test: { id: number | null; title: string; category: string; duration_minutes: number };
  sections: CefrSection[];
  loose_questions: CefrQuestion[];
  annotations: AnnotationMap;
  /* Har bir part necha marta eshitilgani (part id -> son). Cheklov serverda sanaladi. */
  audio_plays: Record<string, number>;
};

export const SKILL_LABEL: Record<CefrSkill, string> = {
  listening: 'Tinglab tushunish',
  reading: "O'qish",
  writing: 'Yozma ish',
};
