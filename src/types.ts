
export interface TextPart {
  text: string;
  isImportant: boolean;
}

export interface StudySection {
  title: string;
  parts: TextPart[][]; // 각 문장은 TextPart의 배열입니다.
  isImportant?: boolean;
}

export interface Keyword {
  word: string;
  meaning: string;
}

// --- New Exam-Centric Types ---

export interface ExamConcept {
  id: string;
  title: string;
  description: string;
  importance: 'A' | 'B' | 'C';
  education_level: string;
  formula?: string;
  key_terms?: string;
  appearance_logic?: {
    condition_context: string;
    reasoning_required: string;
    question_type: string;
    frequency_weight: number;
    test_frequency: number;
  };
}

export interface ExamTrap {
  title: string;
  correct_concept: string;
  common_mistake: string;
  explanation: string;
}

export interface GraphPattern {
  title: string;
  axis_explanation: string;
  interpretation_key: string;
  pattern_type: string;
}

export interface CalculationFocus {
  formula: string;
  steps: string;
  common_errors: string;
  unit_notes: string;
}

export interface ExamGuideResult {
  isValid: boolean;
  sections: StudySection[];
  keywords: Keyword[];
  examPoints: string[];
}

// Compatibility alias
export type SearchResult = ExamGuideResult;
