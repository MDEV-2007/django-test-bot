/**
 * Neural Sprint & Real-time Question Engine Types
 * IlmIldizi DTM & Milliy Sertifikat Platformasi
 */

export interface QuestionOption {
  id: string | number;
  text: string;
  label?: 'A' | 'B' | 'C' | 'D' | string;
}

export interface QuestionItem {
  id: string | number;
  topicId?: string | number;
  topicTitle: string;
  body: string;
  options: QuestionOption[];
  /** Serverdan faqat javob yuborilgandan keyin keladi. Faqat oflayn zaxira savollarda oldindan bor. */
  correctOptionId?: string | number;
  /** true — serverda tekshirib bo'lmaydigan oflayn zaxira savoli (mukofot/qayd yo'q). */
  isOffline?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  /* Qasos savoli parametrlari */
  isRevenge?: boolean;
  originalQuestionId?: string | number;
  failedOptionId?: string | number;
  attemptsCount?: number;
}

export interface MistakeExplanationCache {
  id?: string | number;
  questionId: string | number;
  selectedOptionId: string | number;
  whyWrong: string;
  memoryHack: string;
  cached?: boolean;
  modelName?: string;
  createdAt?: string | Date;
  hitCount?: number;
}

export interface ExplainMistakeRequest {
  questionId: string | number;
  questionBody: string;
  selectedOptionId: string | number;
  selectedOptionText: string;
  correctOptionId: string | number;
  correctOptionText: string;
  topicTitle?: string;
}

export interface ExplainMistakeResponse {
  ok: boolean;
  data: MistakeExplanationCache;
  cached: boolean;
  latencyMs?: number;
  error?: string;
}

export interface RevengeQueueItem {
  questionId: string | number;
  scheduledIndex: number;
  originalMistakeOptionId: string | number;
  addedAtStep: number;
  isResolved: boolean;
}

export type ComboMultiplier = 1.0 | 1.5 | 2.0;

export interface ComboState {
  currentStreak: number;
  multiplier: ComboMultiplier;
  highestCombo: number;
  comboProgress: number; // 0..3 oralig'ida (keyingi ko'paytirgichgacha progress)
}

export interface LiveScorePredictor {
  /** Haqiqiy prognoz (/api/analytics/predicted-score/); null — hali yetarli ma'lumot yo'q. */
  currentScore: number | null;
  maxScore: number; // 189.0
  deltaScore: number | null; // animatsiya uchun +0.2 yoki -0.1
  predictedGrade: string; // A+, A, B+, B, C+, C
  topicMasteryPercentage: number; // masalan 45% -> 48%
  topicName: string;
}

export interface SprintSubject {
  id: number;
  name: string;
  slug: string;
  questions_count: number;
  is_available: boolean;
}

export interface SprintSessionSummary {
  totalAnswered: number;
  correctCount: number;
  mistakeCount: number;
  revengeSolvedCount: number;
  totalXpEarned: number;
  totalCoinsEarned: number;
  finalScore: number | null;
  initialScore: number | null;
  finalTopicMastery: number;
  timeSpentSeconds: number;
  highestCombo: number;
  hasUnresolvedRevenge: boolean;
}

