export interface RawArrayQ {
  title: string;
  answers: Answer[];
  multipleAnswers?: boolean;
}

export interface QCM {
  title?: string;
  questions: Question[];
}

export interface ParseOptions {
  enforceSingle?: boolean;
  requireAtLeastOneCorrect?: boolean;
}

export interface Answer {
  text: string;
  correct: boolean;
}

export interface Question {
  title: string;
  score: number;
  answers: Answer[];
  multipleAnswers: boolean;
}
