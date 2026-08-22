export type QuestionData = {
  attempt_id: number;
  q_idx: number;
  total_questions: number;
  has_prev: boolean;
  has_next: boolean;
  prev_idx: number;
  next_idx: number;
  seconds_left?: number;
  question: {
    id: number;
    body: string;
    type: 'single_choice' | 'image_based' | 'table_based' | 'matching' | 'grouped_item' | 'open_written';
    difficulty: string;
    image: string;
    image_position: string;
    audio_url: string;
  };
  choices?: { id: number; text: string }[];
  selected_choice_id?: number | null;
  matching_options?: { right_key: string; right_text: string }[];
  matching_rows?: { left_key: string; left_text: string; selected_right_key: string }[];
  group_instruction?: string;
  group_options?: { id: number; label: string; text: string }[];
  selected_group_option_id?: number | null;
  sub_question_rows?: { label: string; text: string; answer: string }[];
  text_answer?: string;
};
